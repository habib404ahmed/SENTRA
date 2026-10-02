"""
SENTRA Threat Detection & Alert Engine Service

Coordinates feature extraction, multi-model inference, decision policy evaluation,
structured evidence generation, alert deduplication, and persistence.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.database import SessionLocal
from app.models.traffic_flow import TrafficFlowModel
from app.models.flow_feature import FlowFeatureModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.detection_job import DetectionJobModel
from app.models.server import MonitoredServerModel
from app.features.flow_features import extract_flow_features
from app.features.schemas import SCHEMA_VERSION, FEATURE_DEFINITIONS
from app.detection.model_loader import resolve_active_models, ActiveModelPair
from app.detection.policy import DetectionPolicyEngine, DetectionDecision, POLICY_VERSION
from app.detection.evidence import generate_threat_evidence
from app.detection.deduplication import AlertDeduplicator
from app.detection.stream import broadcaster

logger = logging.getLogger(__name__)


class DetectionService:
    """
    Core orchestrator for real-time and batch threat detection.
    """

    def __init__(self, policy_engine: Optional[DetectionPolicyEngine] = None):
        self.policy_engine = policy_engine or DetectionPolicyEngine()

    def process_flow(
        self,
        db: Session,
        flow: TrafficFlowModel,
        models: ActiveModelPair,
        server: Optional[MonitoredServerModel] = None,
        cached_features: Optional[Dict[str, Any]] = None,
    ) -> Tuple[DetectionDecision, Optional[AlertModel], bool]:
        """
        Executes end-to-end detection on a single directional flow.
        Returns: (decision, alert_instance, is_new_alert)
        """
        # 1. Obtain Feature Vector
        feature_dict = cached_features
        if not feature_dict:
            # Query flow_features table
            ff = db.execute(
                select(FlowFeatureModel).where(FlowFeatureModel.flow_id == flow.id)
            ).scalar_one_or_none()
            if ff and isinstance(ff.feature_values, dict):
                feature_dict = ff.feature_values
            else:
                # Dynamically extract flow features from flow record
                f_data = {
                    "packet_count": flow.packet_count,
                    "byte_count": flow.byte_count,
                    "duration": flow.duration,
                    "source_port": flow.source_port,
                    "destination_port": flow.destination_port,
                    "protocol": flow.protocol,
                    "tcp_syn_count": flow.tcp_syn_count,
                    "tcp_ack_count": flow.tcp_ack_count,
                    "tcp_fin_count": flow.tcp_fin_count,
                    "tcp_rst_count": flow.tcp_rst_count,
                    "average_interarrival_time": flow.average_interarrival_time,
                }
                feature_dict = extract_flow_features(f_data)

        # 2. Run Model Inferences
        pred_class = None
        class_score = None
        class_probs = None
        iso_score = None
        is_anomaly = False
        classifier_ver = None
        anomaly_ver = None

        # Supervised Classification
        if models.has_classifier:
            try:
                if hasattr(models.classifier, "predict_single"):
                    clf_res = models.classifier.predict_single(feature_dict)
                else:
                    import pandas as pd
                    import numpy as np
                    feats = getattr(models.classifier, "feature_names_", list(feature_dict.keys()))
                    row = {col: float(feature_dict.get(col, 0.0) or 0.0) for col in feats}
                    df = pd.DataFrame([row])
                    preds, probs = models.classifier.predict(df)
                    classes = getattr(models.classifier, "classes_", [str(preds[0])])
                    prob_row = probs[0]
                    max_idx = int(np.argmax(prob_row))
                    clf_res = {
                        "predicted_class": str(preds[0]),
                        "confidence": float(prob_row[max_idx]),
                        "class_probabilities": {cls: float(prob_row[i]) for i, cls in enumerate(classes)}
                    }
                pred_class = clf_res.get("predicted_class")
                class_score = clf_res.get("confidence")
                class_probs = clf_res.get("class_probabilities")
                classifier_ver = models.classifier_meta.version if models.classifier_meta else "unknown"
            except Exception as e:
                logger.error(f"Classifier inference error on flow #{flow.id}: {e}")

        # Unsupervised Anomaly Detection
        if models.has_anomaly_detector:
            try:
                if hasattr(models.anomaly_detector, "predict_single"):
                    ad_res = models.anomaly_detector.predict_single(feature_dict)
                else:
                    import pandas as pd
                    feats = getattr(models.anomaly_detector, "feature_names_", list(feature_dict.keys()))
                    row = {col: float(feature_dict.get(col, 0.0) or 0.0) for col in feats}
                    df = pd.DataFrame([row])
                    is_anom, scores = models.anomaly_detector.predict(df)
                    ad_res = {
                        "is_anomaly": bool(is_anom[0]),
                        "anomaly_score": float(scores[0])
                    }
                iso_score = ad_res.get("anomaly_score")
                is_anomaly = bool(ad_res.get("is_anomaly", False))
                anomaly_ver = models.anomaly_detector_meta.version if models.anomaly_detector_meta else "unknown"
            except Exception as e:
                logger.error(f"Anomaly detector inference error on flow #{flow.id}: {e}")

        # 3. Decision Policy Evaluation
        flow_facts = {
            "source_ip": flow.source_ip,
            "destination_ip": flow.destination_ip,
            "source_port": flow.source_port,
            "destination_port": flow.destination_port,
            "protocol": flow.protocol,
            "duration": flow.duration,
            "packet_count": flow.packet_count,
            "byte_count": flow.byte_count,
            "packets_per_second": flow.packets_per_second,
            "bytes_per_second": flow.bytes_per_second,
            "average_packet_size": flow.average_packet_size,
            "tcp_syn_count": flow.tcp_syn_count,
            "tcp_ack_count": flow.tcp_ack_count,
            "tcp_fin_count": flow.tcp_fin_count,
            "tcp_rst_count": flow.tcp_rst_count,
        }

        server_ctx = None
        if server:
            server_ctx = {
                "server_id": server.id,
                "server_name": server.name,
                "server_role": getattr(server, "role", "standard") or "standard",
            }

        decision = self.policy_engine.evaluate(
            predicted_class=pred_class,
            class_score=class_score,
            class_probabilities=class_probs,
            anomaly_score=iso_score,
            is_anomaly_flag=is_anomaly,
            flow_facts=flow_facts,
            server_context=server_ctx,
        )

        # 4. Alert Generation & Deduplication
        if not decision.should_alert:
            return decision, None, False

        # Build evidence
        decision_summary = {
            "threat_class": decision.threat_class,
            "outcome": decision.outcome,
            "severity": decision.severity,
            "model_score": decision.model_score,
            "anomaly_score": decision.anomaly_score,
            "is_anomaly": decision.is_anomaly,
            "reason_code": decision.reason_code,
            "summary": decision.summary,
            "class_probabilities": class_probs,
            "classifier_version": classifier_ver,
            "anomaly_version": anomaly_ver,
            "feature_schema_version": SCHEMA_VERSION,
            "policy_version": POLICY_VERSION,
        }

        evidence = generate_threat_evidence(
            flow_dict=flow_facts,
            decision_summary=decision_summary,
            feature_values=feature_dict,
            server_info=server_ctx,
        )

        # Deduplication lookup
        dedup_key = AlertDeduplicator.generate_dedup_key(
            server_id=flow.server_id,
            source_ip=flow.source_ip,
            destination_ip=flow.destination_ip,
            protocol=flow.protocol,
            threat_class=decision.threat_class,
        )

        existing_alert = AlertDeduplicator.find_or_deduplicate(db, dedup_key=dedup_key, window_hours=24)
        if existing_alert:
            AlertDeduplicator.record_occurrence(
                alert=existing_alert,
                latest_evidence=evidence,
                latest_score=decision.model_score,
            )
            db.commit()
            db.refresh(existing_alert)
            return decision, existing_alert, False

        # Create brand-new alert
        new_alert = AlertModel(
            flow_id=flow.id,
            server_id=flow.server_id,
            import_id=flow.import_id,
            model_id=models.classifier_meta.id if models.classifier_meta else (models.anomaly_meta.id if models.anomaly_meta else None),
            threat=decision.threat_class,
            threat_class=decision.threat_class,
            detection_type=decision.detection_type,
            detection_decision=decision.outcome,
            severity=decision.severity,
            model_score=decision.model_score,
            anomaly_score=decision.anomaly_score,
            source_ip=flow.source_ip,
            destination_ip=flow.destination_ip,
            source_port=flow.source_port,
            destination_port=flow.destination_port,
            protocol=flow.protocol,
            evidence=evidence,
            model_version=classifier_ver or anomaly_ver,
            feature_schema_version=SCHEMA_VERSION,
            detection_policy_version=POLICY_VERSION,
            dedup_key=dedup_key,
            occurrence_count=1,
            status="new",
            details=decision.summary,
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        # Add initial status history log
        history_log = AlertStatusHistoryModel(
            alert_id=new_alert.id,
            previous_status="none",
            new_status="new",
            changed_by="SENTRA AI Detection Engine",
            note=f"Alert triggered by {decision.reason_code} ({decision.summary})",
        )
        db.add(history_log)
        db.commit()

        # Broadcast live notification via SSE
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    broadcaster.broadcast_alert("new_alert", {
                        "id": new_alert.id,
                        "threat_class": new_alert.threat_class,
                        "severity": new_alert.severity,
                        "source_ip": new_alert.source_ip,
                        "destination_ip": new_alert.destination_ip,
                        "status": new_alert.status,
                        "model_score": new_alert.model_score,
                        "created_at": new_alert.created_at.isoformat() if new_alert.created_at else None,
                    })
                )
        except Exception:
            pass

        return decision, new_alert, True


def run_batch_detection_job_sync(job_id: int):
    """
    Background worker function executing batch threat detection for a registered DetectionJobModel.
    Runs inside a dedicated database session.
    """
    db = SessionLocal()
    try:
        job = db.execute(
            select(DetectionJobModel).where(DetectionJobModel.id == job_id)
        ).scalar_one_or_none()

        if not job:
            logger.error(f"Detection job #{job_id} not found.")
            return

        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # 1. Resolve Models
        config = job.configuration or {}
        classifier_id = config.get("classifier_model_id") or job.classifier_model_id
        anomaly_id = config.get("anomaly_model_id") or job.anomaly_model_id

        models = resolve_active_models(db, classifier_id=classifier_id, anomaly_id=anomaly_id)
        if not models.is_available:
            job.status = "failed"
            job.error_message = "No compatible trained ML models found in registry. Train a model in Phase 5 first."
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            return

        # 2. Query target flows
        query = select(TrafficFlowModel)
        if job.import_id:
            query = query.where(TrafficFlowModel.import_id == job.import_id)

        flows = db.execute(query).scalars().all()
        job.total_flows = len(flows)
        db.commit()

        service = DetectionService()
        alerts_created = 0
        analyzed = 0

        # Cache servers
        servers_map = {s.id: s for s in db.execute(select(MonitoredServerModel)).scalars().all()}

        for flow in flows:
            server = servers_map.get(flow.server_id) if flow.server_id else None
            decision, alert, is_new = service.process_flow(db, flow, models, server=server)
            analyzed += 1
            if is_new:
                alerts_created += 1

            if analyzed % 25 == 0:
                job.analyzed_flows = analyzed
                job.alerts_generated = alerts_created
                db.commit()

        job.status = "completed"
        job.analyzed_flows = analyzed
        job.alerts_generated = alerts_created
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(
            f"Detection job #{job.id} completed successfully. "
            f"Analyzed {analyzed} flows, generated {alerts_created} new alerts."
        )

    except Exception as e:
        logger.exception(f"Fatal error in detection job #{job_id}: {e}")
        db.rollback()
        try:
            job = db.execute(
                select(DetectionJobModel).where(DetectionJobModel.id == job_id)
            ).scalar_one_or_none()
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

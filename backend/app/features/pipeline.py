"""
End-to-End Feature Extraction Pipeline orchestrator for SENTRA.
Coordinates cleaning, statistical calculation, retrospective behavioral aggregation,
DNS/TLS metadata extraction, schema validation, persistence, and dataset generation.
"""

from datetime import datetime, timezone
import logging
from typing import Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.feature_job import FeatureJobModel
from app.models.flow_feature import FlowFeatureModel
from app.models.feature_dataset import FeatureDatasetModel

from app.features.schemas import SCHEMA_VERSION, FEATURE_DEFINITIONS
from app.features.cleaning import FlowDataCleaner, DataQualityReport
from app.features.flow_features import extract_flow_features
from app.features.behavioral_features import BehavioralFeatureExtractor
from app.features.dns_features import extract_dns_features
from app.features.tls_features import extract_tls_features
from app.features.validation import FeatureValidator
from app.features.dataset_export import DatasetExporter

logger = logging.getLogger("sentra.features.pipeline")


class FeatureExtractionPipeline:
    """
    Executes feature extraction for a given import job in background or synchronous mode.
    """

    def __init__(self, window_seconds: float = 300.0):
        self.cleaner = FlowDataCleaner(drop_duplicates=True)
        self.behavioral_extractor = BehavioralFeatureExtractor(window_seconds=window_seconds)
        self.validator = FeatureValidator(schema_version=SCHEMA_VERSION)
        self.exporter = DatasetExporter()

    def run(self, db: Session, job_id: int, import_id: int) -> FeatureJobModel:
        job = db.query(FeatureJobModel).filter(FeatureJobModel.id == job_id).first()
        if not job:
            raise ValueError(f"Feature job {job_id} not found")

        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        try:
            # 1. Fetch raw flows for import
            flows = db.query(TrafficFlowModel).filter(TrafficFlowModel.import_id == import_id).all()
            if not flows:
                job.status = "failed"
                job.error_message = f"No traffic flows found for import {import_id}"
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
                return job

            # Convert to list of dicts with flow ID preserved
            raw_data = []
            for f in flows:
                raw_data.append({
                    "flow_id": f.id,
                    "import_id": f.import_id,
                    "server_id": f.server_id,
                    "source_ip": f.source_ip,
                    "destination_ip": f.destination_ip,
                    "source_port": f.source_port,
                    "destination_port": f.destination_port,
                    "protocol": f.protocol,
                    "start_time": f.start_time,
                    "end_time": f.end_time,
                    "duration": f.duration,
                    "packet_count": f.packet_count,
                    "byte_count": f.byte_count,
                    "average_packet_size": f.average_packet_size,
                    "packets_per_second": f.packets_per_second,
                    "bytes_per_second": f.bytes_per_second,
                    "average_interarrival_time": f.average_interarrival_time,
                    "tcp_syn_count": f.tcp_syn_count,
                    "tcp_ack_count": f.tcp_ack_count,
                    "tcp_fin_count": f.tcp_fin_count,
                    "tcp_rst_count": f.tcp_rst_count,
                })

            # 2. Clean and validate flow records
            cleaned_df, quality_report = self.cleaner.clean(raw_data)

            if cleaned_df.empty:
                job.status = "failed"
                job.error_message = "All flow records were rejected during data validation"
                job.input_flows = len(raw_data)
                job.invalid_flows = len(raw_data)
                job.quality_report = quality_report.model_dump()
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
                return job

            # 3. Behavioral Features (retrospective sliding window)
            behavioral_records = self.behavioral_extractor.extract(cleaned_df)

            # 4. Assemble complete feature vector for each row
            combined_features = []
            for i, (_, row) in enumerate(cleaned_df.iterrows()):
                flow_dict = extract_flow_features(row)
                dns_dict = extract_dns_features(row)
                tls_dict = extract_tls_features(row)
                behav_dict = behavioral_records[i]

                # Full vector
                record = {
                    "flow_id": int(row["flow_id"]),
                    "import_id": int(row["import_id"]),
                    "server_id": row["server_id"],
                    "source_ip": row["source_ip"],
                    "destination_ip": row["destination_ip"],
                    "source_port": row["source_port"],
                    "destination_port": row["destination_port"],
                    "protocol": row["protocol"],
                    "start_time": str(row["start_time"]) if row["start_time"] is not None else None,
                    **flow_dict,
                    **behav_dict,
                    **dns_dict,
                    **tls_dict
                }
                combined_features.append(record)

            # 5. Schema Validation
            valid_recs, invalid_recs, validation_errors = self.validator.validate_batch(combined_features)
            if validation_errors:
                quality_report.remediation_actions.append(
                    f"Validated {len(valid_recs)} records against schema v{SCHEMA_VERSION} ({len(invalid_recs)} failed schema checks)."
                )

            # 6. Idempotent Database Persistence
            # Remove any previous flow_features for this job
            db.query(FlowFeatureModel).filter(FlowFeatureModel.job_id == job.id).delete()
            db.query(FeatureDatasetModel).filter(FeatureDatasetModel.job_id == job.id).delete()

            feature_models = []
            for item in valid_recs:
                # Store the model features in JSONB
                feature_vals = {k: v for k, v in item.items() if k not in self.exporter.AUDIT_IDENTIFIER_COLS}
                feature_models.append(
                    FlowFeatureModel(
                        job_id=job.id,
                        flow_id=item["flow_id"],
                        schema_version=SCHEMA_VERSION,
                        feature_values=feature_vals
                    )
                )

            # Bulk insert flow features in batches
            batch_size = 500
            for b in range(0, len(feature_models), batch_size):
                db.bulk_save_objects(feature_models[b:b + batch_size])
            db.flush()

            # 7. Generate Dataset Artifacts (CSV + Parquet)
            # Unlabeled ML-ready CSV
            ml_csv_meta = self.exporter.export(
                valid_recs,
                job_id=job.id,
                import_id=import_id,
                format_type="csv",
                dataset_type="unlabeled_ml_ready"
            )
            # Full Analyzed CSV
            full_csv_meta = self.exporter.export(
                valid_recs,
                job_id=job.id,
                import_id=import_id,
                format_type="csv",
                dataset_type="full_analyzed"
            )
            # Unlabeled ML-ready Parquet
            ml_parquet_meta = self.exporter.export(
                valid_recs,
                job_id=job.id,
                import_id=import_id,
                format_type="parquet",
                dataset_type="unlabeled_ml_ready"
            )

            # Save dataset tracking models
            for meta in [ml_csv_meta, full_csv_meta, ml_parquet_meta]:
                db.add(FeatureDatasetModel(
                    job_id=job.id,
                    name=meta["name"],
                    format=meta["format"],
                    dataset_type=meta["dataset_type"],
                    file_path=meta["file_path"],
                    file_size=meta["file_size"],
                    row_count=meta["row_count"],
                    column_count=meta["column_count"],
                    sha256_hash=meta["sha256_hash"]
                ))

            # 8. Complete Job Status
            job.status = "completed"
            job.input_flows = len(raw_data)
            job.valid_flows = len(valid_recs)
            job.invalid_flows = len(raw_data) - len(valid_recs)
            job.generated_features = len(FEATURE_DEFINITIONS)
            job.quality_report = quality_report.model_dump()
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(job)

            logger.info(f"Feature job {job_id} successfully completed. {len(valid_recs)} flows extracted.")
            return job

        except Exception as e:
            logger.error(f"Error executing feature pipeline for job {job_id}: {e}", exc_info=True)
            db.rollback()
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            return job

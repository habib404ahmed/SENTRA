import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func

from app.database import get_db
from app.models.detection_job import DetectionJobModel
from app.models.pcap_import import PcapImportModel
from app.models.ml_dataset import MLDatasetModel
from app.models.ml_model import MLModelModel
from app.models.traffic_flow import TrafficFlowModel
from app.schemas.detection import (
    DetectionRunRequest,
    DetectionJobResponse,
    DetectionJobListResponse,
    DetectionResultItem,
    DetectionHealthResponse,
)
from app.detection.model_loader import resolve_active_models
from app.detection.policy import POLICY_VERSION, DetectionPolicyEngine
from app.detection.service import DetectionService, run_batch_detection_job_sync

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/detection", tags=["Threat Detection & Inference"])


@router.post("/run", response_model=DetectionJobResponse, status_code=status.HTTP_202_ACCEPTED, summary="Launch threat detection job on network traffic")
def run_detection(
    payload: DetectionRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Initiates asynchronous multi-model threat detection on an ingested PCAP import or dataset.
    """
    if not payload.import_id and not payload.dataset_id and not payload.flow_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify at least one of: import_id, dataset_id, or flow_ids.",
        )

    # Validate import exists if specified
    if payload.import_id:
        pcap = db.execute(
            select(PcapImportModel).where(PcapImportModel.id == payload.import_id)
        ).scalar_one_or_none()
        if not pcap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PCAP Import #{payload.import_id} not found.",
            )

    # Validate active models
    models = resolve_active_models(
        db,
        classifier_id=payload.classifier_model_id,
        anomaly_id=payload.anomaly_model_id,
    )
    if not models.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No evaluated ML models available for detection. Train and evaluate models in Phase 5 first.",
        )

    # Count flows
    total_flows = 0
    if payload.import_id:
        total_flows = db.scalar(
            select(func.count(TrafficFlowModel.id)).where(TrafficFlowModel.import_id == payload.import_id)
        ) or 0
    elif payload.flow_ids:
        total_flows = len(payload.flow_ids)

    # Create DetectionJobModel record
    job = DetectionJobModel(
        import_id=payload.import_id,
        dataset_id=payload.dataset_id,
        classifier_model_id=models.classifier_meta.id if models.classifier_meta else None,
        anomaly_model_id=models.anomaly_meta.id if models.anomaly_meta else None,
        status="queued",
        policy_version=POLICY_VERSION,
        total_flows=total_flows,
        analyzed_flows=0,
        alerts_generated=0,
        configuration={
            "confidence_threshold": payload.confidence_threshold,
            "anomaly_threshold": payload.anomaly_threshold,
            "classifier_version": models.classifier_meta.version if models.classifier_meta else None,
            "anomaly_version": models.anomaly_meta.version if models.anomaly_meta else None,
        },
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatch non-blocking background task
    background_tasks.add_task(run_batch_detection_job_sync, job.id)

    return job


@router.get("/jobs", response_model=DetectionJobListResponse, summary="List threat detection jobs")
def list_detection_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = select(DetectionJobModel).order_by(desc(DetectionJobModel.id))
    total = db.scalar(select(func.count(DetectionJobModel.id))) or 0
    
    offset = (page - 1) * page_size
    items = db.execute(query.offset(offset).limit(page_size)).scalars().all()

    return DetectionJobListResponse(
        total=total,
        items=items,
    )


@router.get("/jobs/{job_id}", response_model=DetectionJobResponse, summary="Get detection job status")
def get_detection_job(job_id: int, db: Session = Depends(get_db)):
    job = db.execute(
        select(DetectionJobModel).where(DetectionJobModel.id == job_id)
    ).scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection job #{job_id} not found.",
        )
    return job


@router.get("/results", response_model=List[DetectionResultItem], summary="Inspect recent detection verdicts across flows")
def get_recent_detection_results(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Evaluates recent flows using the active models and returns empirical verdicts.
    """
    flows = db.execute(
        select(TrafficFlowModel).order_by(desc(TrafficFlowModel.id)).limit(limit)
    ).scalars().all()

    models = resolve_active_models(db)
    if not models.is_available:
        return []

    service = DetectionService()
    results = []

    for f in flows:
        decision, alert, _ = service.process_flow(db, f, models)
        results.append(DetectionResultItem(
            flow_id=f.id,
            source_ip=f.source_ip,
            destination_ip=f.destination_ip,
            source_port=f.source_port,
            destination_port=f.destination_port,
            protocol=f.protocol,
            predicted_class=decision.threat_class if decision.outcome != "normal" else "Normal",
            model_score=decision.model_score,
            anomaly_score=decision.anomaly_score,
            outcome=decision.outcome,
            severity=decision.severity,
            should_alert=decision.should_alert,
            summary=decision.summary,
        ))

    return results


@router.get("/health", response_model=DetectionHealthResponse, summary="Check detection subsystem and model readiness")
def get_detection_health(db: Session = Depends(get_db)):
    models = resolve_active_models(db)

    clf_info = None
    if models.has_classifier and models.classifier_meta:
        clf_info = {
            "id": models.classifier_meta.id,
            "name": models.classifier_meta.name,
            "version": models.classifier_meta.version,
            "algorithm": models.classifier_meta.algorithm,
            "feature_count": len(models.classifier_meta.feature_names or []),
            "status": models.classifier_meta.status,
        }

    ad_info = None
    if models.has_anomaly_detector and models.anomaly_meta:
        ad_info = {
            "id": models.anomaly_meta.id,
            "name": models.anomaly_meta.name,
            "version": models.anomaly_meta.version,
            "algorithm": models.anomaly_meta.algorithm,
            "status": models.anomaly_meta.status,
        }

    return DetectionHealthResponse(
        status="healthy" if models.is_available else "degraded",
        subsystem="SENTRA Phase 6 Threat Detection & Alert Engine",
        policy_version=POLICY_VERSION,
        active_classifier=clf_info,
        active_anomaly_detector=ad_info,
        inference_ready=models.is_available,
    )

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db, SessionLocal
from app.models.pcap_import import PcapImportModel
from app.models.feature_job import FeatureJobModel
from app.models.flow_feature import FlowFeatureModel
from app.schemas.feature import (
    FeatureExtractionRequest,
    FeatureJobResponse,
    FeatureJobListResponse,
    FlowFeatureRecord,
    FlowFeatureListResponse,
)
from app.features.schemas import get_feature_schema, FeatureSchemaMetadata
from app.features.pipeline import FeatureExtractionPipeline

logger = logging.getLogger("sentra.api.features")
router = APIRouter(prefix="/api/features", tags=["Feature Extraction"])


def _run_pipeline_background(job_id: int, import_id: int, window_seconds: float):
    db: Session = SessionLocal()
    try:
        pipeline = FeatureExtractionPipeline(window_seconds=window_seconds)
        pipeline.run(db, job_id=job_id, import_id=import_id)
    except Exception as e:
        logger.error(f"Background feature extraction failed for job {job_id}: {e}", exc_info=True)
    finally:
        db.close()


@router.post("/extract", response_model=FeatureJobResponse, status_code=status.HTTP_202_ACCEPTED)
def start_feature_extraction(
    request: FeatureExtractionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Initiate feature extraction for a selected PCAP import.
    Queues a background task to clean, extract directional flow features,
    calculate retrospective behavioral metrics, and generate CSV/Parquet datasets.
    """
    # 1. Validate import exists and has completed packet ingestion
    pcap_import = db.query(PcapImportModel).filter(PcapImportModel.id == request.import_id).first()
    if not pcap_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PCAP import with ID {request.import_id} not found."
        )

    if pcap_import.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot extract features: Import {request.import_id} has status '{pcap_import.status}'. Ingestion must be 'completed'."
        )

    if pcap_import.total_flows == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Import {request.import_id} contains 0 flows. Cannot extract features."
        )

    # 2. Create FeatureJobModel in queued state
    job = FeatureJobModel(
        import_id=request.import_id,
        server_id=pcap_import.server_id,
        status="queued",
        schema_version="v1.0.0",
        input_flows=pcap_import.total_flows,
        valid_flows=0,
        invalid_flows=0,
        generated_features=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 3. Dispatch to background runner
    background_tasks.add_task(
        _run_pipeline_background,
        job_id=job.id,
        import_id=request.import_id,
        window_seconds=request.window_seconds
    )

    return job


@router.get("/jobs", response_model=FeatureJobListResponse)
def list_feature_jobs(
    import_id: Optional[int] = Query(None, description="Filter jobs by PCAP import ID"),
    status: Optional[str] = Query(None, description="Filter by status (queued, processing, completed, failed)"),
    db: Session = Depends(get_db)
):
    """List all feature extraction jobs and their execution states."""
    query = db.query(FeatureJobModel)
    if import_id is not None:
        query = query.filter(FeatureJobModel.import_id == import_id)
    if status is not None:
        query = query.filter(FeatureJobModel.status == status.lower())

    jobs = query.order_by(desc(FeatureJobModel.created_at)).all()
    return FeatureJobListResponse(total=len(jobs), items=jobs)


@router.get("/jobs/{job_id}", response_model=FeatureJobResponse)
def get_feature_job(job_id: int, db: Session = Depends(get_db)):
    """Retrieve detailed state, progress, and audit-grade quality report for a specific job."""
    job = db.query(FeatureJobModel).filter(FeatureJobModel.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature extraction job {job_id} not found."
        )
    return job


@router.get("/schema", response_model=FeatureSchemaMetadata)
def get_schema_metadata():
    """Return active versioned feature schema definition and calculation methods."""
    return get_feature_schema()


@router.get("", response_model=FlowFeatureListResponse)
def list_flow_features(
    job_id: Optional[int] = Query(None, description="Filter by feature job ID"),
    flow_id: Optional[int] = Query(None, description="Filter by flow ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve extracted feature records with pagination and filtering."""
    query = db.query(FlowFeatureModel)
    if job_id is not None:
        query = query.filter(FlowFeatureModel.job_id == job_id)
    if flow_id is not None:
        query = query.filter(FlowFeatureModel.flow_id == flow_id)

    total = query.count()
    items = query.order_by(FlowFeatureModel.id.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return FlowFeatureListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )


@router.get("/{feature_id}", response_model=FlowFeatureRecord)
def get_flow_feature(feature_id: int, db: Session = Depends(get_db)):
    """Inspect a single flow feature vector."""
    record = db.query(FlowFeatureModel).filter(FlowFeatureModel.id == feature_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flow feature record {feature_id} not found."
        )
    return record

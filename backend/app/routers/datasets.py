import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.config import settings
from app.models.feature_dataset import FeatureDatasetModel
from app.schemas.feature import FeatureDatasetResponse, FeatureDatasetListResponse

router = APIRouter(prefix="/api/datasets", tags=["Dataset Generation"])


@router.get("", response_model=FeatureDatasetListResponse)
def list_datasets(
    job_id: Optional[int] = Query(None, description="Filter datasets by feature extraction job ID"),
    format: Optional[str] = Query(None, description="Filter by file format (csv, parquet)"),
    dataset_type: Optional[str] = Query(None, description="Filter by dataset type (unlabeled_ml_ready, full_analyzed)"),
    db: Session = Depends(get_db)
):
    """List all generated dataset artifacts and their export metadata."""
    query = db.query(FeatureDatasetModel)
    if job_id is not None:
        query = query.filter(FeatureDatasetModel.job_id == job_id)
    if format is not None:
        query = query.filter(FeatureDatasetModel.format == format.lower())
    if dataset_type is not None:
        query = query.filter(FeatureDatasetModel.dataset_type == dataset_type)

    datasets = query.order_by(desc(FeatureDatasetModel.created_at)).all()
    return FeatureDatasetListResponse(total=len(datasets), items=datasets)


@router.get("/{dataset_id}", response_model=FeatureDatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Retrieve metadata for a specific dataset export."""
    dataset = db.query(FeatureDatasetModel).filter(FeatureDatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found."
        )
    return dataset


@router.get("/{dataset_id}/download")
def download_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """
    Download a generated CSV or Parquet dataset file.
    Enforces path safety checks to prevent unauthorized directory traversal.
    """
    dataset = db.query(FeatureDatasetModel).filter(FeatureDatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found."
        )

    file_path = os.path.abspath(dataset.file_path)
    allowed_dir = os.path.abspath(settings.DATASET_DIR)

    # Path traversal security guard
    if not file_path.startswith(allowed_dir):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: file resides outside authorized dataset directory."
        )

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset file missing from local storage."
        )

    media_type = "text/csv" if dataset.format == "csv" else "application/octet-stream"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=dataset.name
    )

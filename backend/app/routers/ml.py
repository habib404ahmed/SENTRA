import os
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db, SessionLocal
from app.config import settings
from app.features.schemas import SCHEMA_VERSION

from app.models.ml_dataset import MLDatasetModel
from app.models.ml_training_job import MLTrainingJobModel
from app.models.ml_model import MLModelModel
from app.models.ml_evaluation import MLEvaluationModel

from app.schemas.ml import (
    MLDatasetRegisterRequest,
    MLDatasetResponse,
    MLDatasetListResponse,
    MLTrainingJobCreateRequest,
    MLTrainingJobResponse,
    MLTrainingJobListResponse,
    MLModelResponse,
    MLModelListResponse,
    MLEvaluationResponse,
    MLPredictRequest,
    MLPredictResponse
)

from app.ml.dataset_loader import DatasetLoader, generate_benchmark_dataset
from app.ml.classifier import SentraThreatClassifier
from app.ml.anomaly_detector import SentraAnomalyDetector
from app.ml.model_registry import ModelArtifactManager
from app.ml.prediction import ModelPredictor

logger = logging.getLogger("sentra.api.ml")
router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])
artifact_manager = ModelArtifactManager()


def _execute_training_job_background(job_id: int):
    """
    Background worker executing model training, evaluation, and artifact persistence.
    """
    db: Session = SessionLocal()
    try:
        job = db.query(MLTrainingJobModel).filter(MLTrainingJobModel.id == job_id).first()
        if not job:
            return

        job.status = "training"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        dataset = db.query(MLDatasetModel).filter(MLDatasetModel.id == job.dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset {job.dataset_id} not found")

        # 1. Load and validate dataset
        X, y, meta = DatasetLoader.load(dataset.file_path, label_col=dataset.label_column)

        # 2. Train and Evaluate based on Model Type
        version = f"v1.0.{job_id}"
        hp = job.hyperparameters

        if job.model_type == "classifier":
            classifier = SentraThreatClassifier(
                n_estimators=hp.get("n_estimators", 100),
                max_depth=hp.get("max_depth", 15),
                min_samples_split=hp.get("min_samples_split", 2),
                class_weight=hp.get("class_weight", "balanced"),
                random_state=hp.get("random_state", 42)
            )
            eval_result, test_count = classifier.train_and_evaluate(X, y)
            artifact_path = artifact_manager.save_artifact(classifier, "classifier", version=version)

            # Register ML Model
            ml_model = MLModelModel(
                name=f"Random Forest Classifier ({version})",
                model_type="classifier",
                algorithm="RandomForestClassifier",
                version=version,
                feature_schema_version=SCHEMA_VERSION,
                dataset_id=dataset.id,
                training_job_id=job.id,
                hyperparameters=hp,
                feature_names=classifier.feature_names_,
                classes=classifier.classes_,
                artifact_path=artifact_path,
                status="evaluated"
            )
            db.add(ml_model)
            db.flush()

            # Record Evaluation
            eval_record = MLEvaluationModel(
                model_id=ml_model.id,
                dataset_id=dataset.id,
                split_method="stratified_train_test_split",
                test_size=0.2,
                test_records=test_count,
                metrics=eval_result["metrics"],
                confusion_matrix=eval_result["confusion_matrix"],
                per_class_metrics=eval_result["per_class_metrics"],
                feature_importances=eval_result.get("feature_importances"),
                report_summary=eval_result["report_summary"]
            )
            db.add(eval_record)

        elif job.model_type == "anomaly_detector":
            anomaly_det = SentraAnomalyDetector(
                n_estimators=hp.get("n_estimators", 100),
                contamination=hp.get("contamination", 0.05),
                max_samples=hp.get("max_samples", "auto"),
                random_state=hp.get("random_state", 42)
            )
            eval_result, test_count = anomaly_det.train_and_evaluate(X, y=y)
            artifact_path = artifact_manager.save_artifact(anomaly_det, "anomaly_detector", version=version)

            ml_model = MLModelModel(
                name=f"Isolation Forest Anomaly Detector ({version})",
                model_type="anomaly_detector",
                algorithm="IsolationForest",
                version=version,
                feature_schema_version=SCHEMA_VERSION,
                dataset_id=dataset.id,
                training_job_id=job.id,
                hyperparameters=hp,
                feature_names=anomaly_det.feature_names_,
                classes=anomaly_det.classes_,
                artifact_path=artifact_path,
                status="evaluated"
            )
            db.add(ml_model)
            db.flush()

            eval_record = MLEvaluationModel(
                model_id=ml_model.id,
                dataset_id=dataset.id,
                split_method="train_test_split",
                test_size=0.2,
                test_records=test_count,
                metrics=eval_result["metrics"],
                confusion_matrix=eval_result.get("confusion_matrix"),
                per_class_metrics=None,
                feature_importances=None,
                report_summary=eval_result["report_summary"]
            )
            db.add(eval_record)

        else:
            raise ValueError(f"Unsupported model type: {job.model_type}")

        # Complete job
        job.status = "completed"
        job.output_model_id = ml_model.id
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"ML training job {job.id} completed successfully. Registered model {ml_model.id}.")

    except Exception as e:
        logger.error(f"Error in ML training job {job_id}: {e}", exc_info=True)
        db.rollback()
        job = db.query(MLTrainingJobModel).filter(MLTrainingJobModel.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


# --- Dataset Registry Endpoints ---

@router.post("/datasets", response_model=MLDatasetResponse, status_code=status.HTTP_201_CREATED)
def register_dataset(req: MLDatasetRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers an authorized training dataset or synthesizes a standardized SENTRA benchmark dataset.
    """
    if req.generate_benchmark:
        default_file = os.path.join(settings.DATASET_DIR, f"sentra_benchmark_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv")
        file_path = generate_benchmark_dataset(default_file, n_samples=1200)
    else:
        if not req.file_path or not os.path.exists(req.file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Specified file path does not exist on server: {req.file_path}"
            )
        file_path = req.file_path

    # Verify and inspect dataset
    try:
        X, y, meta = DatasetLoader.load(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse and validate dataset: {str(e)}"
        )

    ds = MLDatasetModel(
        name=req.name,
        source=req.source,
        version="1.0",
        file_path=file_path,
        format="parquet" if file_path.endswith(".parquet") else "csv",
        feature_schema_version=SCHEMA_VERSION,
        label_column=meta["label_column"],
        record_count=meta["record_count"],
        class_count=len(meta["classes"]),
        classes=meta["classes"],
        validation_status="valid",
        description=req.description or "SENTRA Multi-Class Network Traffic Flow Benchmark"
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


@router.get("/datasets", response_model=MLDatasetListResponse)
def list_datasets(db: Session = Depends(get_db)):
    """List all registered ML datasets."""
    datasets = db.query(MLDatasetModel).order_by(desc(MLDatasetModel.created_at)).all()
    return MLDatasetListResponse(total=len(datasets), items=datasets)


@router.get("/datasets/{dataset_id}", response_model=MLDatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Get single registered dataset details."""
    dataset = db.query(MLDatasetModel).filter(MLDatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return dataset


# --- Training Job Endpoints ---

@router.post("/training-jobs", response_model=MLTrainingJobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_training_job(
    req: MLTrainingJobCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submits a background job to train Random Forest or Isolation Forest models.
    """
    dataset = db.query(MLDatasetModel).filter(MLDatasetModel.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {req.dataset_id} not found."
        )

    algo = req.algorithm or ("RandomForestClassifier" if req.model_type == "classifier" else "IsolationForest")

    hyperparameters = {
        "n_estimators": req.n_estimators,
        "random_state": req.random_state
    }
    if req.model_type == "classifier":
        hyperparameters["max_depth"] = req.max_depth
        hyperparameters["min_samples_split"] = req.min_samples_split
        hyperparameters["class_weight"] = req.class_weight
    else:
        hyperparameters["contamination"] = req.contamination
        hyperparameters["max_samples"] = "auto"

    job = MLTrainingJobModel(
        dataset_id=dataset.id,
        model_type=req.model_type,
        algorithm=algo,
        hyperparameters=hyperparameters,
        status="queued"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(_execute_training_job_background, job_id=job.id)
    return job


@router.get("/training-jobs", response_model=MLTrainingJobListResponse)
def list_training_jobs(db: Session = Depends(get_db)):
    """List all ML training jobs."""
    jobs = db.query(MLTrainingJobModel).order_by(desc(MLTrainingJobModel.created_at)).all()
    return MLTrainingJobListResponse(total=len(jobs), items=jobs)


@router.get("/training-jobs/{job_id}", response_model=MLTrainingJobResponse)
def get_training_job(job_id: int, db: Session = Depends(get_db)):
    """Get training job status, progress, and error details."""
    job = db.query(MLTrainingJobModel).filter(MLTrainingJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training job not found")
    return job


# --- Model Registry Endpoints ---

@router.get("/models", response_model=MLModelListResponse)
def list_models(
    model_type: Optional[str] = Query(None, description="Filter by classifier or anomaly_detector"),
    db: Session = Depends(get_db)
):
    """List registered models."""
    query = db.query(MLModelModel)
    if model_type:
        query = query.filter(MLModelModel.model_type == model_type)
    models = query.order_by(desc(MLModelModel.created_at)).all()
    return MLModelListResponse(total=len(models), items=models)


@router.get("/models/{model_id}", response_model=MLModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db)):
    """Get single model metadata."""
    model = db.query(MLModelModel).filter(MLModelModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return model


@router.get("/models/{model_id}/evaluation", response_model=MLEvaluationResponse)
def get_model_evaluation(model_id: int, db: Session = Depends(get_db)):
    """Retrieve factual evaluation report, metrics, and confusion matrix for a model."""
    eval_record = db.query(MLEvaluationModel).filter(MLEvaluationModel.model_id == model_id).first()
    if not eval_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No evaluation found for this model")
    return eval_record


@router.get("/feature-importance/{model_id}")
def get_feature_importance(model_id: int, db: Session = Depends(get_db)):
    """Retrieve ranked feature importances for a trained Random Forest model."""
    eval_record = db.query(MLEvaluationModel).filter(MLEvaluationModel.model_id == model_id).first()
    if not eval_record or not eval_record.feature_importances:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature importance data not available for this model."
        )
    return {
        "model_id": model_id,
        "feature_importances": eval_record.feature_importances
    }


# --- Prediction / Inference Endpoint ---

@router.post("/predict/{model_id}", response_model=MLPredictResponse)
def predict_flow(model_id: int, req: MLPredictRequest, db: Session = Depends(get_db)):
    """
    Executes inference against a registered Random Forest classifier or Isolation Forest anomaly detector.
    """
    model_record = db.query(MLModelModel).filter(MLModelModel.id == model_id).first()
    if not model_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    try:
        model_instance = artifact_manager.load_artifact(model_record.artifact_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load model artifact: {str(e)}"
        )

    try:
        result = ModelPredictor.predict(
            model_instance=model_instance,
            model_type=model_record.model_type,
            features=req.features,
            model_version=model_record.version
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inference error: {str(e)}"
        )


@router.get("/health")
def ml_health_check(db: Session = Depends(get_db)):
    """Health check for ML engine and model registry."""
    model_count = db.query(MLModelModel).count()
    dataset_count = db.query(MLDatasetModel).count()
    active_jobs = db.query(MLTrainingJobModel).filter(MLTrainingJobModel.status == "training").count()

    return {
        "status": "healthy",
        "subsystem": "SENTRA AI/ML Threat Detection Engine",
        "feature_schema_version": SCHEMA_VERSION,
        "registered_models": model_count,
        "registered_datasets": dataset_count,
        "active_training_jobs": active_jobs,
        "artifact_storage": settings.MODEL_DIR
    }

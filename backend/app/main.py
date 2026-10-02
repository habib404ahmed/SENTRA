from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import get_db, SessionLocal
from app.routers import (
    servers_router,
    alerts_router,
    ingestion_router,
    flows_router,
    features_router,
    datasets_router,
    ml_router,
    detection_router,
)
from contextlib import asynccontextmanager
from app.models.feature_job import FeatureJobModel
from app.models.pcap_import import PcapImportModel
from app.models.ml_training_job import MLTrainingJobModel
from app.models.detection_job import DetectionJobModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Fail gracefully if server was terminated during active processing."""
    db: Session = SessionLocal()
    try:
        # Recover interrupted imports
        interrupted_imports = db.query(PcapImportModel).filter(PcapImportModel.status == "processing").all()
        for imp in interrupted_imports:
            imp.status = "failed"
            imp.error_message = "Processing interrupted by application restart."
        
        # Recover interrupted feature jobs
        interrupted_jobs = db.query(FeatureJobModel).filter(FeatureJobModel.status == "processing").all()
        for job in interrupted_jobs:
            job.status = "failed"
            job.error_message = "Feature extraction interrupted by application restart."

        # Recover interrupted ML training jobs
        interrupted_ml_jobs = db.query(MLTrainingJobModel).filter(MLTrainingJobModel.status == "training").all()
        for ml_job in interrupted_ml_jobs:
            ml_job.status = "failed"
            ml_job.error_message = "ML training job interrupted by application restart."

        # Recover interrupted detection jobs
        interrupted_det_jobs = db.query(DetectionJobModel).filter(DetectionJobModel.status == "processing").all()
        for det_job in interrupted_det_jobs:
            det_job.status = "failed"
            det_job.error_message = "Detection job interrupted by application restart."
        
        if interrupted_imports or interrupted_jobs or interrupted_ml_jobs or interrupted_det_jobs:
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(
    title="SENTRA Threat Defense API",
    description="Backend REST API for SENTRA real-time AI network threat detection, asset monitoring, unidirectional PCAP traffic ingestion, ML feature extraction, and AI/ML model training.",
    version="0.5.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# Configure CORS - restricted to configured origins (e.g. React frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(servers_router)
app.include_router(alerts_router)
app.include_router(ingestion_router)
app.include_router(flows_router)
app.include_router(features_router)
app.include_router(datasets_router)
app.include_router(ml_router)
app.include_router(detection_router)


@app.get("/", tags=["System"])
def root():
    return {
        "service": "SENTRA Threat Defense API",
        "phase": "Phase 6 (Threat Detection, Alert Engine, and Dashboard Integration)",
        "version": "0.6.0",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """
    Standard API liveness check.
    """
    return {
        "status": "ok"
    }


@app.get("/api/health/db", tags=["Health"])
def database_health_check(db: Session = Depends(get_db)):
    """
    Database connection verification check.
    Executes a lightweight query against PostgreSQL to ensure the session is active.
    """
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "engine": "PostgreSQL"
        }
    except Exception as exc:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(exc)
        }, status.HTTP_503_SERVICE_UNAVAILABLE

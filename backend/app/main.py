from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import get_db
from app.routers import servers_router, alerts_router, ingestion_router, flows_router

app = FastAPI(
    title="SENTRA Threat Defense API",
    description="Backend REST API for SENTRA real-time AI network threat detection, asset monitoring, and unidirectional PCAP traffic ingestion.",
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
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


@app.get("/", tags=["System"])
def root():
    return {
        "service": "SENTRA Threat Defense API",
        "phase": "Phase 3 (Network Traffic Ingestion & Directional Flow Processing)",
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

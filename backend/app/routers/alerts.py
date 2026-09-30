from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.alert import AlertModel
from app.schemas.alert import AlertResponse

router = APIRouter(prefix="/api/alerts", tags=["Threat Alerts (Scaffold)"])


@router.get("", response_model=List[AlertResponse], summary="List threat alerts")
def list_alerts(db: Session = Depends(get_db)):
    """
    Scaffold endpoint for threat alerts (Phase 3+).
    """
    stmt = select(AlertModel).order_by(AlertModel.id.desc())
    alerts = db.execute(stmt).scalars().all()
    return alerts

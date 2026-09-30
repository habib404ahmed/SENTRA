from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AlertBase(BaseModel):
    threat: str
    severity: str = "medium"
    source_ip: str
    destination_ip: str
    destination_port: Optional[int] = None
    protocol: str = "TCP"
    model_score: Optional[float] = None
    status: str = "active"
    details: Optional[str] = None
    server_id: Optional[int] = None


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

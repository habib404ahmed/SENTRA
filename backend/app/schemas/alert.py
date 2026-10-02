from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: new, acknowledged, investigating, resolved, false_positive")
    note: Optional[str] = Field(None, description="Operational reason or forensic note")
    operator: Optional[str] = Field("operator", description="Operator identity or demo role")


class AlertStatusHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: int
    previous_status: str
    new_status: str
    changed_by: str
    note: Optional[str] = None
    created_at: datetime


class AlertBase(BaseModel):
    threat: str
    threat_class: str
    detection_type: str = "classification"
    detection_decision: str = "suspicious"
    severity: str = "medium"
    source_ip: str
    destination_ip: str
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: str = "TCP"
    model_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    status: str = "new"
    details: Optional[str] = None
    server_id: Optional[int] = None
    flow_id: Optional[int] = None
    import_id: Optional[int] = None
    model_id: Optional[int] = None
    model_version: Optional[str] = None
    feature_schema_version: str = "v1.0.0"
    detection_policy_version: str = "v1.0.0"
    dedup_key: Optional[str] = None
    occurrence_count: int = 1


class AlertCreate(AlertBase):
    evidence: Dict[str, Any] = Field(default_factory=dict)


class AlertResponse(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evidence: Dict[str, Any] = Field(default_factory=dict)
    first_seen_at: datetime
    last_seen_at: datetime
    created_at: datetime
    updated_at: datetime
    history: List[AlertStatusHistoryItem] = Field(default_factory=list)


class AlertListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AlertResponse]


class AlertSummaryResponse(BaseModel):
    total_alerts: int
    active_alerts: int
    critical_alerts: int
    resolved_alerts: int
    by_severity: Dict[str, int]
    by_threat_class: Dict[str, int]
    by_status: Dict[str, int]
    top_source_ips: List[Dict[str, Any]]
    top_targeted_servers: List[Dict[str, Any]]
    recent_trend: List[Dict[str, Any]]

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DetectionRunRequest(BaseModel):
    import_id: Optional[int] = Field(None, description="PCAP Import ID to analyze")
    dataset_id: Optional[int] = Field(None, description="Feature Dataset ID to analyze")
    flow_ids: Optional[List[int]] = Field(None, description="Specific flow IDs to analyze")
    classifier_model_id: Optional[int] = Field(None, description="Specific classifier model ID to use")
    anomaly_model_id: Optional[int] = Field(None, description="Specific anomaly model ID to use")
    confidence_threshold: Optional[float] = Field(0.55, ge=0.1, le=1.0, description="Minimum classifier vote share")
    anomaly_threshold: Optional[float] = Field(-0.02, description="Isolation forest boundary")


class DetectionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    import_id: Optional[int] = None
    dataset_id: Optional[int] = None
    classifier_model_id: Optional[int] = None
    anomaly_model_id: Optional[int] = None
    status: str
    policy_version: str
    total_flows: int
    analyzed_flows: int
    alerts_generated: int
    configuration: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DetectionJobListResponse(BaseModel):
    total: int
    items: List[DetectionJobResponse]


class DetectionResultItem(BaseModel):
    flow_id: int
    source_ip: str
    destination_ip: str
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: str
    predicted_class: Optional[str] = None
    model_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    outcome: str
    severity: str
    should_alert: bool
    summary: str


class DetectionHealthResponse(BaseModel):
    status: str
    subsystem: str
    policy_version: str
    active_classifier: Optional[Dict[str, Any]] = None
    active_anomaly_detector: Optional[Dict[str, Any]] = None
    inference_ready: bool

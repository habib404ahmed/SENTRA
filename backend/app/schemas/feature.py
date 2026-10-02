from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class FeatureExtractionRequest(BaseModel):
    import_id: int = Field(..., description="ID of the PCAP import to extract features from")
    window_seconds: float = Field(default=300.0, ge=1.0, le=86400.0, description="Retrospective sliding window in seconds for behavioral feature aggregation")


class FeatureJobResponse(BaseModel):
    id: int
    import_id: Optional[int] = None
    server_id: Optional[int] = None
    status: str
    schema_version: str
    input_flows: int
    valid_flows: int
    invalid_flows: int
    generated_features: int
    quality_report: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FeatureJobListResponse(BaseModel):
    total: int
    items: List[FeatureJobResponse]


class FlowFeatureRecord(BaseModel):
    id: int
    job_id: int
    flow_id: int
    schema_version: str
    feature_values: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FlowFeatureListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[FlowFeatureRecord]


class FeatureDatasetResponse(BaseModel):
    id: int
    job_id: int
    name: str
    format: str
    dataset_type: str
    file_size: int
    row_count: int
    column_count: int
    sha256_hash: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeatureDatasetListResponse(BaseModel):
    total: int
    items: List[FeatureDatasetResponse]

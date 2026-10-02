from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PcapImportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    server_id: Optional[int] = None
    original_filename: str
    stored_filename: str
    file_size: int
    status: str
    total_packets: int
    total_flows: int
    error_message: Optional[str] = None
    uploaded_at: datetime
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    server_name: Optional[str] = None


class PcapImportListResponse(BaseModel):
    items: List[PcapImportResponse]
    total: int
    skip: int
    limit: int

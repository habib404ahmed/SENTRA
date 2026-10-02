from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TrafficFlowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    import_id: int
    server_id: Optional[int] = None
    
    # 5-tuple directional flow identification
    source_ip: str
    destination_ip: str
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: str

    # Temporal & volume metadata
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: float
    packet_count: int
    byte_count: int
    average_packet_size: float
    packets_per_second: float
    bytes_per_second: float
    average_interarrival_time: float

    # TCP control flags
    tcp_syn_count: int
    tcp_ack_count: int
    tcp_fin_count: int
    tcp_rst_count: int

    # Associated asset metadata
    server_name: Optional[str] = None


class TrafficFlowListResponse(BaseModel):
    items: List[TrafficFlowResponse]
    total: int
    skip: int
    limit: int

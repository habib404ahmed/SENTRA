from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.traffic_flow import TrafficFlowModel
from app.schemas.traffic_flow import TrafficFlowResponse, TrafficFlowListResponse

router = APIRouter(prefix="/api/flows", tags=["Directional Flows"])


@router.get("", response_model=TrafficFlowListResponse, summary="Explore directional traffic flows with filters")
def list_flows(
    import_id: Optional[int] = Query(None, description="Filter by PCAP import ID"),
    server_id: Optional[int] = Query(None, description="Filter by monitored server ID"),
    source_ip: Optional[str] = Query(None, description="Filter by source IP address"),
    destination_ip: Optional[str] = Query(None, description="Filter by destination IP address"),
    source_port: Optional[int] = Query(None, description="Filter by source transport port"),
    destination_port: Optional[int] = Query(None, description="Filter by destination transport port"),
    protocol: Optional[str] = Query(None, description="Filter by protocol: TCP, UDP, ICMP, etc."),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    db: Session = Depends(get_db)
):
    """
    Search and filter aggregated directional flows across all PCAP ingestions.
    Strictly forward-only (reverse direction is an independent flow).
    """
    query = select(TrafficFlowModel)
    count_query = select(func.count(TrafficFlowModel.id))

    if import_id is not None:
        query = query.where(TrafficFlowModel.import_id == import_id)
        count_query = count_query.where(TrafficFlowModel.import_id == import_id)
    if server_id is not None:
        query = query.where(TrafficFlowModel.server_id == server_id)
        count_query = count_query.where(TrafficFlowModel.server_id == server_id)
    if source_ip:
        query = query.where(TrafficFlowModel.source_ip == source_ip.strip())
        count_query = count_query.where(TrafficFlowModel.source_ip == source_ip.strip())
    if destination_ip:
        query = query.where(TrafficFlowModel.destination_ip == destination_ip.strip())
        count_query = count_query.where(TrafficFlowModel.destination_ip == destination_ip.strip())
    if source_port is not None:
        query = query.where(TrafficFlowModel.source_port == source_port)
        count_query = count_query.where(TrafficFlowModel.source_port == source_port)
    if destination_port is not None:
        query = query.where(TrafficFlowModel.destination_port == destination_port)
        count_query = count_query.where(TrafficFlowModel.destination_port == destination_port)
    if protocol:
        query = query.where(TrafficFlowModel.protocol == protocol.strip().upper())
        count_query = count_query.where(TrafficFlowModel.protocol == protocol.strip().upper())

    total = db.execute(count_query).scalar() or 0
    flows = db.execute(query.order_by(TrafficFlowModel.packet_count.desc(), TrafficFlowModel.id.desc()).offset(skip).limit(limit)).scalars().all()

    items: List[TrafficFlowResponse] = []
    for f in flows:
        item = TrafficFlowResponse.model_validate(f)
        if f.server:
            item.server_name = f.server.name
        items.append(item)

    return TrafficFlowListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{flow_id}", response_model=TrafficFlowResponse, summary="Get directional flow metadata by ID")
def get_flow(flow_id: int, db: Session = Depends(get_db)):
    """
    Retrieve comprehensive directional flow metadata and TCP flag counters.
    """
    flow = db.get(TrafficFlowModel, flow_id)
    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Traffic flow with ID {flow_id} was not found."
        )

    item = TrafficFlowResponse.model_validate(flow)
    if flow.server:
        item.server_name = flow.server.name
    return item

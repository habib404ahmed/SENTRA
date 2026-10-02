import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.config import settings
from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.server import MonitoredServerModel
from app.schemas.pcap_import import PcapImportResponse, PcapImportListResponse
from app.schemas.traffic_flow import TrafficFlowResponse, TrafficFlowListResponse
from app.services.pcap_service import (
    validate_pcap_header,
    process_pcap_file,
    PcapValidationError,
    VALID_CAPTURE_MAGICS,
)

router = APIRouter(prefix="/api/ingestion", tags=["Traffic Ingestion & PCAP"])

ALLOWED_EXTENSIONS = {".pcap", ".pcapng", ".cap"}


@router.post("/pcap", response_model=PcapImportResponse, status_code=status.HTTP_202_ACCEPTED, summary="Upload authorized PCAP/PCAPNG capture for ingestion")
async def upload_pcap(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PCAP or PCAPNG capture file"),
    server_id: Optional[int] = Form(None, description="Optional monitored server asset ID association"),
    db: Session = Depends(get_db)
):
    """
    Upload an authorized PCAP/PCAPNG capture file for streaming packet parsing
    and directional flow aggregation.
    """
    # 1. Validate file extension
    original_filename = file.filename or "unknown.pcap"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Only .pcap, .pcapng, and .cap capture files are accepted."
        )

    # 2. Validate server_id if supplied
    server_name = None
    if server_id is not None:
        server = db.get(MonitoredServerModel, server_id)
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Monitored server with ID {server_id} was not found."
            )
        server_name = server.name

    # 3. Generate safe unique filename
    safe_stored_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.UPLOAD_DIR, safe_stored_filename)

    # 4. Stream upload to disk with size check
    total_bytes = 0
    chunk_size = 1024 * 1024  # 1MB chunks

    try:
        with open(stored_path, "wb") as out_file:
            while chunk := await file.read(chunk_size):
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    # Clean up partial file
                    out_file.close()
                    if os.path.exists(stored_path):
                        os.remove(stored_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB."
                    )
                out_file.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write uploaded file to storage: {str(exc)}"
        )

    # 5. Validate file contents / magic bytes
    try:
        validate_pcap_header(stored_path)
    except PcapValidationError as val_err:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    # 6. Register PcapImport record in database
    import_record = PcapImportModel(
        server_id=server_id,
        original_filename=original_filename,
        stored_filename=safe_stored_filename,
        file_size=total_bytes,
        status="queued",
        total_packets=0,
        total_flows=0,
    )
    db.add(import_record)
    db.commit()
    db.refresh(import_record)

    # 7. Dispatch background streaming parser
    background_tasks.add_task(process_pcap_file, import_record.id)

    response = PcapImportResponse.model_validate(import_record)
    response.server_name = server_name
    return response


@router.get("", response_model=PcapImportListResponse, summary="List all PCAP capture imports")
def list_pcap_imports(
    server_id: Optional[int] = Query(None, description="Filter by monitored server ID"),
    status: Optional[str] = Query(None, description="Filter by import status: queued, processing, completed, failed"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=200, description="Page size limit"),
    db: Session = Depends(get_db)
):
    """
    Retrieve import history with pagination and status filters.
    """
    query = select(PcapImportModel)
    count_query = select(func.count(PcapImportModel.id))

    if server_id is not None:
        query = query.where(PcapImportModel.server_id == server_id)
        count_query = count_query.where(PcapImportModel.server_id == server_id)

    if status:
        query = query.where(PcapImportModel.status == status)
        count_query = count_query.where(PcapImportModel.status == status)

    total = db.execute(count_query).scalar() or 0
    imports = db.execute(query.order_by(PcapImportModel.uploaded_at.desc()).offset(skip).limit(limit)).scalars().all()

    items: List[PcapImportResponse] = []
    for imp in imports:
        res = PcapImportResponse.model_validate(imp)
        if imp.server:
            res.server_name = imp.server.name
        items.append(res)

    return PcapImportListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{import_id}", response_model=PcapImportResponse, summary="Get PCAP import details")
def get_pcap_import(import_id: int, db: Session = Depends(get_db)):
    """
    Get detailed processing status and metadata for a specific PCAP import.
    """
    imp = db.get(PcapImportModel, import_id)
    if not imp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PCAP import with ID {import_id} was not found."
        )

    res = PcapImportResponse.model_validate(imp)
    if imp.server:
        res.server_name = imp.server.name
    return res


@router.get("/{import_id}/flows", response_model=TrafficFlowListResponse, summary="Get directional flows for an import")
def get_import_flows(
    import_id: int,
    protocol: Optional[str] = Query(None, description="Filter by transport protocol (e.g. TCP, UDP, ICMP)"),
    source_ip: Optional[str] = Query(None, description="Filter by source IP"),
    destination_ip: Optional[str] = Query(None, description="Filter by destination IP"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieve directional flows extracted from a specific PCAP import.
    """
    imp = db.get(PcapImportModel, import_id)
    if not imp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PCAP import with ID {import_id} was not found."
        )

    query = select(TrafficFlowModel).where(TrafficFlowModel.import_id == import_id)
    count_query = select(func.count(TrafficFlowModel.id)).where(TrafficFlowModel.import_id == import_id)

    if protocol:
        query = query.where(TrafficFlowModel.protocol == protocol.upper())
        count_query = count_query.where(TrafficFlowModel.protocol == protocol.upper())
    if source_ip:
        query = query.where(TrafficFlowModel.source_ip == source_ip)
        count_query = count_query.where(TrafficFlowModel.source_ip == source_ip)
    if destination_ip:
        query = query.where(TrafficFlowModel.destination_ip == destination_ip)
        count_query = count_query.where(TrafficFlowModel.destination_ip == destination_ip)

    total = db.execute(count_query).scalar() or 0
    flows = db.execute(query.order_by(TrafficFlowModel.packet_count.desc()).offset(skip).limit(limit)).scalars().all()

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

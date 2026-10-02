import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, and_

from app.database import get_db
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.server import MonitoredServerModel
from app.schemas.alert import (
    AlertResponse,
    AlertListResponse,
    AlertStatusUpdate,
    AlertSummaryResponse,
)
from app.detection.lifecycle import AlertLifecycleManager
from app.detection.stream import broadcaster, alert_event_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["Threat Alerts Engine"])


@router.get("", response_model=AlertListResponse, summary="List threat alerts with filters and pagination")
def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high, critical"),
    threat_class: Optional[str] = Query(None, description="Filter by threat class: DDoS, Reconnaissance, etc."),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: new, acknowledged, investigating, resolved, false_positive"),
    server_id: Optional[int] = Query(None, description="Filter by monitored server ID"),
    source_ip: Optional[str] = Query(None, description="Filter by source IP"),
    destination_ip: Optional[str] = Query(None, description="Filter by destination IP"),
    import_id: Optional[int] = Query(None, description="Filter by PCAP import ID"),
    search: Optional[str] = Query(None, description="Text search across threat, IP, details"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    query = select(AlertModel)

    conditions = []
    if severity:
        conditions.append(AlertModel.severity == severity.lower())
    if threat_class:
        conditions.append(AlertModel.threat_class == threat_class)
    if status_filter:
        conditions.append(AlertModel.status == status_filter.lower())
    if server_id is not None:
        conditions.append(AlertModel.server_id == server_id)
    if source_ip:
        conditions.append(AlertModel.source_ip == source_ip)
    if destination_ip:
        conditions.append(AlertModel.destination_ip == destination_ip)
    if import_id is not None:
        conditions.append(AlertModel.import_id == import_id)
    if search:
        s = f"%{search}%"
        conditions.append(
            (AlertModel.threat_class.ilike(s))
            | (AlertModel.source_ip.ilike(s))
            | (AlertModel.destination_ip.ilike(s))
            | (AlertModel.details.ilike(s))
        )

    if conditions:
        query = query.where(and_(*conditions))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    offset = (page - 1) * page_size
    stmt = query.order_by(AlertModel.id.desc()).offset(offset).limit(page_size)
    items = db.execute(stmt).scalars().all()

    return AlertListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/summary", response_model=AlertSummaryResponse, summary="Get aggregated alert metrics and forensic summaries")
def get_alerts_summary(db: Session = Depends(get_db)):
    """
    Returns empirical alert statistics, severity breakdown, threat taxonomy distribution,
    and recent activity timeline based strictly on persisted database records.
    """
    total = db.scalar(select(func.count(AlertModel.id))) or 0
    active = db.scalar(select(func.count(AlertModel.id)).where(AlertModel.status.in_(["new", "acknowledged", "investigating"]))) or 0
    critical = db.scalar(select(func.count(AlertModel.id)).where(and_(AlertModel.status.in_(["new", "acknowledged", "investigating"]), AlertModel.severity == "critical"))) or 0
    resolved = db.scalar(select(func.count(AlertModel.id)).where(AlertModel.status == "resolved")) or 0

    # Severity distribution
    sev_rows = db.execute(
        select(AlertModel.severity, func.count(AlertModel.id)).group_by(AlertModel.severity)
    ).all()
    by_severity = {r[0]: r[1] for r in sev_rows}

    # Threat class distribution
    threat_rows = db.execute(
        select(AlertModel.threat_class, func.count(AlertModel.id)).group_by(AlertModel.threat_class)
    ).all()
    by_threat_class = {r[0]: r[1] for r in threat_rows}

    # Status distribution
    status_rows = db.execute(
        select(AlertModel.status, func.count(AlertModel.id)).group_by(AlertModel.status)
    ).all()
    by_status = {r[0]: r[1] for r in status_rows}

    # Top observed source IPs (Attacker sources / anomalous senders)
    ip_rows = db.execute(
        select(AlertModel.source_ip, func.count(AlertModel.id), func.max(AlertModel.severity))
        .group_by(AlertModel.source_ip)
        .order_by(func.count(AlertModel.id).desc())
        .limit(5)
    ).all()
    top_source_ips = [
        {"ip": r[0], "count": r[1], "max_severity": r[2]}
        for r in ip_rows
    ]

    # Top targeted servers
    server_rows = db.execute(
        select(AlertModel.server_id, func.count(AlertModel.id))
        .where(AlertModel.server_id.isnot(None))
        .group_by(AlertModel.server_id)
        .order_by(func.count(AlertModel.id).desc())
        .limit(5)
    ).all()
    
    server_names = {}
    if server_rows:
        s_ids = [r[0] for r in server_rows]
        servers = db.execute(select(MonitoredServerModel).where(MonitoredServerModel.id.in_(s_ids))).scalars().all()
        server_names = {s.id: s.name for s in servers}

    top_servers = [
        {"server_id": r[0], "server_name": server_names.get(r[0], f"Server #{r[0]}"), "count": r[1]}
        for r in server_rows
    ]

    # Recent activity timeline (by day for last 7 days)
    timeline_rows = db.execute(
        select(
            func.date_trunc('day', AlertModel.created_at).label("day"),
            func.count(AlertModel.id)
        )
        .group_by("day")
        .order_by("day")
        .limit(14)
    ).all()
    recent_trend = [
        {"date": r[0].strftime("%Y-%m-%d") if r[0] else "N/A", "count": r[1]}
        for r in timeline_rows
    ]

    return AlertSummaryResponse(
        total_alerts=total,
        active_alerts=active,
        critical_alerts=critical,
        resolved_alerts=resolved,
        by_severity=by_severity,
        by_threat_class=by_threat_class,
        by_status=by_status,
        top_source_ips=top_source_ips,
        top_targeted_servers=top_servers,
        recent_trend=recent_trend,
    )


@router.get("/stream", summary="Server-Sent Events real-time alert stream")
async def stream_alerts():
    """
    Establishes an SSE event stream broadcasting new threat detections and status transitions.
    """
    queue = broadcaster.subscribe()
    return StreamingResponse(
        alert_event_generator(queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{alert_id}", response_model=AlertResponse, summary="Get detailed threat alert with evidence and audit history")
def get_alert_detail(alert_id: int, db: Session = Depends(get_db)):
    alert = db.execute(
        select(AlertModel).where(AlertModel.id == alert_id)
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Threat alert #{alert_id} not found.",
        )
    return alert


@router.patch("/{alert_id}/status", response_model=AlertResponse, summary="Transition alert status through validated state machine")
def update_alert_status(
    alert_id: int,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Updates alert status with strict lifecycle validation and records history.
    """
    alert = db.execute(
        select(AlertModel).where(AlertModel.id == alert_id)
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Threat alert #{alert_id} not found.",
        )

    updated_alert = AlertLifecycleManager.transition_status(
        db=db,
        alert=alert,
        target_status=payload.status,
        operator=payload.operator or "operator",
        note=payload.note,
    )

    # Broadcast status change via SSE
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(
                broadcaster.broadcast_alert("status_change", {
                    "alert_id": updated_alert.id,
                    "new_status": updated_alert.status,
                    "changed_by": payload.operator or "operator",
                    "note": payload.note,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            )
    except Exception:
        pass

    return updated_alert

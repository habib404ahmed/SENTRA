from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.server import MonitoredServerModel
from app.schemas.server import ServerCreate, ServerUpdate, ServerResponse

router = APIRouter(prefix="/api/servers", tags=["Monitored Servers"])


@router.get("", response_model=List[ServerResponse], summary="List all monitored servers")
def list_servers(db: Session = Depends(get_db)):
    """
    Retrieve all registered monitored servers ordered by creation time descending.
    """
    stmt = select(MonitoredServerModel).order_by(MonitoredServerModel.id.desc())
    servers = db.execute(stmt).scalars().all()
    return servers


@router.get("/{server_id}", response_model=ServerResponse, summary="Get server details by ID")
def get_server(server_id: int, db: Session = Depends(get_db)):
    """
    Retrieve details of a single monitored server by its primary key ID.
    """
    server = db.get(MonitoredServerModel, server_id)
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitored server with ID {server_id} was not found."
        )
    return server


@router.post("", response_model=ServerResponse, status_code=status.HTTP_201_CREATED, summary="Register a monitored server")
def create_server(payload: ServerCreate, db: Session = Depends(get_db)):
    """
    Register a new monitored server with passive flow tap configuration.
    """
    # Check for duplicate IP or Hostname if desired, or proceed with insertion
    new_server = MonitoredServerModel(
        name=payload.name,
        hostname=payload.hostname,
        ip_address=payload.ip_address,
        server_type=payload.server_type,
        environment=payload.environment,
        traffic_source=payload.traffic_source,
        status=payload.status,
        description=payload.description or "",
    )
    db.add(new_server)
    db.commit()
    db.refresh(new_server)
    return new_server


@router.put("/{server_id}", response_model=ServerResponse, summary="Update a monitored server")
def update_server(server_id: int, payload: ServerUpdate, db: Session = Depends(get_db)):
    """
    Update configuration or monitoring status of an existing monitored server.
    """
    server = db.get(MonitoredServerModel, server_id)
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitored server with ID {server_id} was not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(server, field, value)

    db.commit()
    db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a monitored server")
def delete_server(server_id: int, db: Session = Depends(get_db)):
    """
    Deregister and remove a monitored server from SENTRA telemetry capture.
    """
    server = db.get(MonitoredServerModel, server_id)
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitored server with ID {server_id} was not found."
        )

    db.delete(server)
    db.commit()
    return None

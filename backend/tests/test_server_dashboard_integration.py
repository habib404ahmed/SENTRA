"""
SENTRA Monitored Servers Dashboard Integration Test Suite.

Validates:
1. Health and database connectivity endpoints (/api/health and /api/health/db).
2. Complete Server CRUD lifecycle through FastAPI and PostgreSQL persistence.
3. Empty state resilience and clean deregistration.
4. Database error handling returning 503 Service Unavailable with actionable diagnostics.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from app.main import app
from app.database import SessionLocal, get_db
from app.models.server import MonitoredServerModel

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_health_and_db_connectivity():
    """Verify backend health and database health checks return 200 with appropriate payloads."""
    # 1. API Liveness
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data.get("service") == "sentra-api"

    # 2. Database Connectivity
    res_db = client.get("/api/health/db")
    assert res_db.status_code == 200
    db_json = res_db.json()
    assert db_json["status"] == "ok"
    assert db_json["database"] == "connected"
    assert db_json["engine"] == "PostgreSQL"


def test_server_crud_lifecycle_in_postgresql(db_session: Session):
    """
    Test complete monitored server lifecycle:
    Fetch -> Create -> Verify DB -> Retrieve -> Update -> Delete -> Verify Empty / Clean state
    """
    test_ip = "192.168.99.201"
    # Ensure cleanup before test
    db_session.query(MonitoredServerModel).filter_by(ip_address=test_ip).delete()
    db_session.commit()

    # Step 1: List servers before test
    res = client.get("/api/servers")
    assert res.status_code == 200
    initial_servers = res.json()
    assert isinstance(initial_servers, list)

    # Step 2: Create a new monitored server
    create_payload = {
        "name": "SENTRA-Integ-Server",
        "hostname": "integ-host-01.internal",
        "ip_address": test_ip,
        "server_type": "Database Server",
        "environment": "production",
        "traffic_source": "Optical Diode Tap",
        "status": "active",
        "description": "Integration test server for dashboard connectivity."
    }
    create_res = client.post("/api/servers", json=create_payload)
    assert create_res.status_code == 201
    server_data = create_res.json()
    server_id = server_data["id"]
    assert server_data["name"] == create_payload["name"]
    assert server_data["ip_address"] == test_ip

    # Step 3: Verify persistence in PostgreSQL directly
    persisted = db_session.get(MonitoredServerModel, server_id)
    assert persisted is not None
    assert persisted.name == create_payload["name"]
    assert persisted.hostname == create_payload["hostname"]

    # Step 4: Retrieve server by ID via API
    get_res = client.get(f"/api/servers/{server_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == server_id

    # Step 5: Update server configuration
    update_payload = {
        "name": "SENTRA-Integ-Server-Updated",
        "status": "paused",
        "description": "Updated description during test."
    }
    update_res = client.put(f"/api/servers/{server_id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "SENTRA-Integ-Server-Updated"
    assert update_res.json()["status"] == "paused"

    # Verify update in DB
    db_session.refresh(persisted)
    assert persisted.name == "SENTRA-Integ-Server-Updated"
    assert persisted.status == "paused"

    # Step 6: Delete server
    del_res = client.delete(f"/api/servers/{server_id}")
    assert del_res.status_code == 204

    # Step 7: Verify clean state / deleted in DB
    db_session.expire_all()
    del_check = db_session.get(MonitoredServerModel, server_id)
    assert del_check is None

    # Verify 404 from API
    get_del_res = client.get(f"/api/servers/{server_id}")
    assert get_del_res.status_code == 404


def test_database_outage_diagnostic_handling():
    """Verify that when database connection fails during execution, the API returns clean 503 instead of 500."""
    from unittest.mock import MagicMock
    mock_session = MagicMock()
    mock_session.execute.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused to PostgreSQL on port 5432"))

    def get_mock_db():
        yield mock_session

    app.dependency_overrides[get_db] = get_mock_db
    try:
        # Health DB check
        res = client.get("/api/health/db")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "error"
        assert data["database"] == "disconnected"
        assert "Database connection failure" in data["detail"]

        # Servers list check
        res_list = client.get("/api/servers")
        assert res_list.status_code == 503
        data_list = res_list.json()
        assert "PostgreSQL database" in data_list["detail"] or "query failure" in data_list["detail"]
    finally:
        app.dependency_overrides.clear()


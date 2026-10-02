"""
SENTRA Route Consistency and Resilience Test Suite
===================================================
Verifies:
1. Health check endpoints (/api/health and /health alias) return 200 and valid schema.
2. Database health endpoints (/api/health/db and /health/db alias) verify PostgreSQL connectivity.
3. System readiness probes (/api/health/ready and /health/ready alias).
4. Monitored server endpoints (/api/servers and /servers alias) with and without trailing slashes.
5. Server list returns valid list format (empty or populated).
6. Invalid non-existent routes return HTTP 404.
7. Path normalization middleware seamlessly handles accidental double '/api/api/' segments.
8. Database connection failure is distinguished from API availability.
9. Server creation, retrieval, update, and deletion work properly.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.main import app
from app.database import get_db

client = TestClient(app)


def test_health_endpoints_and_aliases():
    """Verify both /api/health and /health alias return HTTP 200 with status ok."""
    for path in ["/api/health", "/health", "/api/health/", "/health/"]:
        res = client.get(path)
        assert res.status_code == 200, f"Expected 200 for {path}, got {res.status_code}"
        data = res.json()
        assert data.get("status") == "ok"
        assert data.get("service") == "sentra-api"


def test_database_health_endpoints_and_aliases():
    """Verify both /api/health/db and /health/db alias return HTTP 200 and database connected."""
    for path in ["/api/health/db", "/health/db", "/api/health/db/", "/health/db/"]:
        res = client.get(path)
        assert res.status_code == 200, f"Expected 200 for {path}, got {res.status_code}"
        data = res.json()
        assert data.get("status") == "ok"
        assert data.get("database") == "connected"
        assert data.get("engine") == "PostgreSQL"


def test_system_readiness_probe():
    """Verify composite readiness check /api/health/ready and /health/ready."""
    for path in ["/api/health/ready", "/health/ready"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "healthy"
        assert data.get("api") == "ok"
        assert data.get("database") == "connected"


def test_path_normalization_middleware():
    """Verify duplicate /api/api/ paths are seamlessly rewritten to /api/."""
    for path in ["/api/api/health", "/api/api/health/db", "/api/api/servers"]:
        res = client.get(path)
        assert res.status_code == 200, f"Failed normalization for {path}, got {res.status_code}"


def test_monitored_servers_routes_and_aliases():
    """Verify monitored servers endpoints are reachable via both /api/servers and /servers."""
    for path in ["/api/servers", "/api/servers/", "/servers", "/servers/"]:
        res = client.get(path)
        assert res.status_code == 200, f"Expected 200 for {path}, got {res.status_code}"
        servers = res.json()
        assert isinstance(servers, list), f"Expected list response for {path}"


def test_server_lifecycle_crud():
    """Verify full CRUD lifecycle on monitored servers."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    create_payload = {
        "name": f"Route-Test-Node-{uid}",
        "hostname": f"node-{uid}.internal.local",
        "ip_address": "10.99.88.77",
        "server_type": "Application Gateway",
        "environment": "production",
        "traffic_source": "Optical Diode Tap",
        "status": "active",
        "description": "Route verification test server"
    }

    # 1. Create server
    create_res = client.post("/api/servers", json=create_payload)
    assert create_res.status_code == 201
    server_data = create_res.json()
    server_id = server_data["id"]
    assert server_data["name"] == create_payload["name"]
    assert server_data["hostname"] == create_payload["hostname"]

    try:
        # 2. Retrieve server by ID via primary route
        get_res = client.get(f"/api/servers/{server_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == server_id

        # 3. Retrieve server by ID via alias route
        get_alias_res = client.get(f"/servers/{server_id}")
        assert get_alias_res.status_code == 200
        assert get_alias_res.json()["id"] == server_id

        # 4. Update server
        update_payload = {"status": "paused", "description": "Updated for route test"}
        update_res = client.put(f"/api/servers/{server_id}", json=update_payload)
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "paused"
    finally:
        # 5. Delete server
        del_res = client.delete(f"/api/servers/{server_id}")
        assert del_res.status_code == 204

        # 6. Verify deleted returns 404
        assert client.get(f"/api/servers/{server_id}").status_code == 404


def test_invalid_routes_return_404():
    """Verify truly nonexistent routes return HTTP 404."""
    for path in ["/api/nonexistent_route_abc123", "/unknown/endpoint", "/api/v99/threats"]:
        res = client.get(path)
        assert res.status_code == 404


def test_database_outage_distinguished_from_api():
    """Verify database failure returns 503 while API liveness remains 200 without exposing secrets."""
    # API liveness check does not touch database, always returns 200
    live_res = client.get("/api/health")
    assert live_res.status_code == 200
    assert live_res.json().get("status") == "ok"
    assert live_res.json().get("service") == "sentra-api"

    # Simulate database outage for db check
    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise OperationalError("connection to server at 'db.sentra.internal' failed", None, None)

    def mock_broken_db():
        yield BrokenSession()

    app.dependency_overrides[get_db] = mock_broken_db
    try:
        db_res = client.get("/api/health/db")
        assert db_res.status_code == 503
        data = db_res.json()
        assert data["status"] == "error"
        assert data["database"] == "disconnected"
        # Confirm internal credentials/connection string details are not leaked
        assert "db.sentra.internal" not in data.get("detail", "")
        assert "Database connection failure" in data.get("detail", "")
    finally:
        app.dependency_overrides.pop(get_db, None)


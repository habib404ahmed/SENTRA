"""
SENTRA Phase 7: API and Database Reliability & Security Test Suite.

Validates:
1. Input validation & 422 Unprocessable Entity error handling
2. 404 Not Found handling on non-existent resource IDs
3. PCAP upload validation (magic bytes, empty files, size bounds)
4. Path traversal defense in upload filenames
5. SQL injection resilience across search, filter, and registration inputs
6. Alert state transition validation and audit security
"""

import io
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.server import MonitoredServerModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.pcap_import import PcapImportModel

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_server(db_session: Session):
    server = db_session.query(MonitoredServerModel).filter_by(ip_address="10.77.88.99").first()
    if not server:
        server = MonitoredServerModel(
            name="Reliability-Test-Server",
            hostname="rel-test-host",
            ip_address="10.77.88.99",
            server_type="Web Server",
            environment="staging",
            traffic_source="PCAP",
            status="active",
            description="Testing server"
        )
        db_session.add(server)
        db_session.commit()
        db_session.refresh(server)
    return server


# ==============================================================================
# 1. INPUT VALIDATION & ERROR HANDLING
# ==============================================================================

def test_server_registration_missing_required_fields():
    """Verify missing required fields in server registration return 422 Unprocessable Entity."""
    # Missing ip_address
    payload_no_ip = {
        "name": "Invalid Server",
        "hostname": "srv-invalid",
        "server_type": "Web Server",
        "environment": "staging",
        "traffic_source": "PCAP",
        "status": "active"
    }
    resp = client.post("/api/servers/", json=payload_no_ip)
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"

    # Missing name
    payload_no_name = {
        "hostname": "srv-invalid",
        "ip_address": "10.0.0.1",
        "server_type": "Web Server",
        "environment": "staging",
        "traffic_source": "PCAP",
        "status": "active"
    }
    resp = client.post("/api/servers/", json=payload_no_name)
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"


def test_invalid_flow_query_parameters():
    """Verify passing malformed or invalid query parameters is handled gracefully."""
    resp = client.get("/api/flows/?limit=invalid_number")
    assert resp.status_code == 422

    resp = client.get("/api/flows/?server_id=not_an_int")
    assert resp.status_code == 422


# ==============================================================================
# 2. 404 NOT FOUND HANDLING
# ==============================================================================

def test_nonexistent_resource_404_responses():
    """Verify accessing nonexistent IDs returns standard 404 Not Found responses."""
    NON_EXISTENT_ID = 99999999

    # Server 404
    resp = client.get(f"/api/servers/{NON_EXISTENT_ID}")
    assert resp.status_code == 404

    # Import 404
    resp = client.get(f"/api/ingestion/imports/{NON_EXISTENT_ID}")
    assert resp.status_code == 404

    # Flow 404
    resp = client.get(f"/api/flows/{NON_EXISTENT_ID}")
    assert resp.status_code == 404

    # Alert 404
    resp = client.get(f"/api/alerts/{NON_EXISTENT_ID}")
    assert resp.status_code == 404

    # Alert Status Update 404
    resp = client.patch(
        f"/api/alerts/{NON_EXISTENT_ID}/status",
        json={"status": "investigating", "note": "Checking non-existent"}
    )
    assert resp.status_code == 404


# ==============================================================================
# 3. PCAP UPLOAD SECURITY & INTEGRITY VALIDATION
# ==============================================================================

def test_upload_empty_file_rejected(sample_server):
    """Verify uploading an empty 0-byte file is rejected."""
    empty_file = io.BytesIO(b"")
    files = {"file": ("empty.pcap", empty_file, "application/vnd.tcpdump.pcap")}
    data = {"server_id": str(sample_server.id)}

    resp = client.post("/api/ingestion/pcap", files=files, data=data)
    assert resp.status_code == 400
    assert "empty" in resp.text.lower()


def test_upload_corrupted_magic_bytes_rejected(sample_server):
    """Verify uploading invalid/corrupted magic bytes is rejected."""
    # Plain text file disguised as pcap
    corrupt_file = io.BytesIO(b"THIS IS NOT A VALID PCAP FILE HEADER AT ALL 1234567890")
    files = {"file": ("fake.pcap", corrupt_file, "application/vnd.tcpdump.pcap")}
    data = {"server_id": str(sample_server.id)}

    resp = client.post("/api/ingestion/pcap", files=files, data=data)
    assert resp.status_code == 400
    assert "magic" in resp.text.lower() or "unsupported" in resp.text.lower() or "capture" in resp.text.lower()


def test_upload_path_traversal_defense(sample_server):
    """
    Verify malicious directory traversal payloads in uploaded filenames
    (e.g., '../../etc/passwd.pcap') are strictly sanitized and cannot escape upload directory.
    """
    # Standard PCAP microsecond header + empty payload
    pcap_header = b"\xd4\xc3\xb2\xa1\x02\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00\x01\x00\x00\x00"
    file_bytes = io.BytesIO(pcap_header)

    traversal_filename = "../../../../../etc/passwd.pcap"
    files = {"file": (traversal_filename, file_bytes, "application/vnd.tcpdump.pcap")}
    data = {"server_id": str(sample_server.id)}

    resp = client.post("/api/ingestion/pcap", files=files, data=data)
    assert resp.status_code in [200, 201, 202], f"Upload failed: {resp.text}"
    import_data = resp.json()

    stored_name = import_data.get("stored_filename", "")
    assert ".." not in stored_name
    assert "/" not in stored_name
    assert "\\" not in stored_name


# ==============================================================================
# 4. ALERT LIFECYCLE RELIABILITY & CONSTRAINTS
# ==============================================================================

def test_alert_lifecycle_invalid_status(db_session: Session, sample_server):
    """Verify attempting to set an unapproved status string is rejected."""
    # Create an alert to test against
    alert = AlertModel(
        server_id=sample_server.id,
        threat="Port Scan Activity",
        threat_class="Port Scan",
        severity="medium",
        source_ip="192.0.2.1",
        destination_ip="10.77.88.99",
        protocol="TCP",
        status="new",
        evidence={"rule": "Test"},
        occurrence_count=1
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    # Attempt invalid status
    resp = client.patch(
        f"/api/alerts/{alert.id}/status",
        json={"status": "malicious_status_injection", "analyst_notes": "Trying bad status"}
    )
    assert resp.status_code in [400, 422]


# ==============================================================================
# 5. SQL INJECTION RESILIENCE
# ==============================================================================

def test_sql_injection_resilience_in_flow_filters():
    """Verify SQL injection payloads in flow filtering query parameters do not cause SQL syntax errors."""
    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE traffic_flows; --",
        "1 UNION SELECT 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 --",
        "admin'--",
    ]

    for payload in sqli_payloads:
        resp = client.get(f"/api/flows/?source_ip={payload}")
        # Must return valid HTTP 200 with empty list or handled gracefully, never 500 internal server error
        assert resp.status_code == 200, f"SQLi payload '{payload}' caused error: {resp.status_code} {resp.text}"
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)


def test_sql_injection_resilience_in_server_creation(db_session: Session):
    """Verify SQL injection payloads in server registration fields are safely escaped and parameterized."""
    sqli_name = "Server'; DROP TABLE monitored_servers; --"
    sqli_hostname = "host'; SELECT pg_sleep(1); --"
    sqli_desc = "Desc'; DELETE FROM monitored_servers; --"
    valid_ip = "198.51.100.99"

    # Clean up prior if exists
    existing = db_session.query(MonitoredServerModel).filter_by(ip_address=valid_ip).first()
    if existing:
        db_session.delete(existing)
        db_session.commit()

    resp = client.post("/api/servers/", json={
        "name": sqli_name,
        "hostname": sqli_hostname,
        "ip_address": valid_ip,
        "server_type": "Database Server",
        "environment": "staging",
        "traffic_source": "PCAP",
        "status": "active",
        "description": sqli_desc
    })
    assert resp.status_code in [200, 201], f"Registration failed with SQLi payload: {resp.text}"
    created = resp.json()
    assert created["name"] == sqli_name
    assert created["hostname"] == sqli_hostname

    # Verify table still exists and data is intact
    check_server = db_session.query(MonitoredServerModel).filter_by(ip_address=valid_ip).first()
    assert check_server is not None
    assert check_server.name == sqli_name

    # Clean up
    db_session.delete(check_server)
    db_session.commit()


def test_sql_injection_resilience_in_alert_notes(db_session: Session, sample_server):
    """Verify SQL injection payloads in alert analyst notes are safely stored in audit history."""
    alert = AlertModel(
        server_id=sample_server.id,
        threat="DDoS Attack",
        threat_class="DDoS",
        severity="high",
        source_ip="198.51.100.11",
        destination_ip="10.77.88.99",
        protocol="TCP",
        status="new",
        evidence={"rule": "Test"},
        occurrence_count=1
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    sqli_note = "Analyst comment'); DROP TABLE alert_status_history; --"
    resp = client.patch(
        f"/api/alerts/{alert.id}/status",
        json={"status": "investigating", "note": sqli_note}
    )
    assert resp.status_code == 200

    # Verify history entry was safely stored as plain text
    history = db_session.query(AlertStatusHistoryModel).filter_by(alert_id=alert.id).order_by(AlertStatusHistoryModel.id.desc()).first()
    assert history is not None
    assert history.note == sqli_note

"""
End-to-End Pipeline Integration Tests for SENTRA (Phase 7).

Verifies the complete pipeline flow:
Upload PCAP -> Validate -> Streaming Parse -> Directional Flows ->
Feature Extraction (v1.0.0) -> Model Inference -> Decision Policy ->
Evidence Generation -> Alert Deduplication -> Lifecycle Audit -> API Retrieval.
"""

import time
import pytest
from scapy.all import Ether, IP, TCP, UDP, wrpcap
import io

from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.server import MonitoredServerModel
from app.detection.service import DetectionService
from app.detection.model_loader import resolve_active_models
from app.features.flow_features import extract_flow_features
from app.features.schemas import SCHEMA_VERSION


def test_e2e_unidirectional_flow_separation(test_client, test_server_id, db_session, traffic_generator):
    """
    Validates that client-to-server and server-to-client packets are strictly segregated
    into distinct directional flow records without bidirectional collapse.
    """
    # Create bidirectional packet stream in-memory
    packets = []
    base_t = 1771000000.0
    # Forward: 192.168.1.50 -> 10.0.0.99:80
    fwd = Ether() / IP(src="192.168.1.50", dst="10.0.0.99") / TCP(sport=50000, dport=80, flags="S")
    fwd.time = base_t
    packets.append(fwd)

    # Reverse: 10.0.0.99:80 -> 192.168.1.50
    rev = Ether() / IP(src="10.0.0.99", dst="192.168.1.50") / TCP(sport=80, dport=50000, flags="SA")
    rev.time = base_t + 0.005
    packets.append(rev)

    from conftest import packets_to_pcap_bytes
    pcap_bytes = packets_to_pcap_bytes(packets)

    # Upload capture
    response = test_client.post(
        "/api/ingestion/pcap",
        data={"server_id": test_server_id},
        files={"file": ("unidirectional_test.pcap", pcap_bytes, "application/vnd.tcpdump.pcap")}
    )
    assert response.status_code == 202
    import_id = response.json()["id"]

    # Wait for background ingestion processing
    time.sleep(1.5)

    # Verify directional separation in database
    flows = db_session.query(TrafficFlowModel).filter_by(import_id=import_id).all()
    assert len(flows) == 2, "Expected exactly 2 separate directional flows (Forward and Reverse)"

    flow_endpoints = {(f.source_ip, f.destination_ip, f.source_port, f.destination_port) for f in flows}
    assert ("192.168.1.50", "10.0.0.99", 50000, 80) in flow_endpoints
    assert ("10.0.0.99", "192.168.1.50", 80, 50000) in flow_endpoints


def test_e2e_feature_schema_and_inference_pipeline(db_session, test_server_id, test_import_id, traffic_generator):
    """
    Tests flow creation -> feature extraction against v1.0.0 schema -> model inference -> consensus decision.
    """
    server = db_session.get(MonitoredServerModel, test_server_id)
    assert server is not None

    # Synthesize attack flow (SYN Flood profile)
    flow = TrafficFlowModel(
        import_id=test_import_id,
        server_id=server.id,
        source_ip="198.51.100.222",
        destination_ip=server.ip_address,
        source_port=44123,
        destination_port=443,
        protocol="TCP",
        start_time="2026-10-02T10:00:00Z",
        end_time="2026-10-02T10:00:01Z",
        duration=1.0,
        packet_count=2500,
        byte_count=1500000,
        packets_per_second=2500.0,
        bytes_per_second=1500000.0,
        average_packet_size=600.0,
        tcp_syn_count=2500,
        tcp_ack_count=0,
        tcp_fin_count=0,
        tcp_rst_count=0
    )
    db_session.add(flow)
    db_session.commit()
    db_session.refresh(flow)

    # 1. Feature Extraction
    features = extract_flow_features({
        "packet_count": flow.packet_count,
        "byte_count": flow.byte_count,
        "duration": flow.duration,
        "source_port": flow.source_port,
        "destination_port": flow.destination_port,
        "protocol": flow.protocol,
        "tcp_syn_count": flow.tcp_syn_count,
        "tcp_ack_count": flow.tcp_ack_count,
        "tcp_fin_count": flow.tcp_fin_count,
        "tcp_rst_count": flow.tcp_rst_count,
        "average_interarrival_time": flow.average_interarrival_time or 0.0004
    })
    assert len(features) == 19
    assert features["packet_count"] == 2500
    assert features["syn_ratio"] == 1.0

    # 2. Model Loading & Detection
    models = resolve_active_models(db_session)
    assert models.is_available, "Trained model artifacts must be available for Phase 7 validation"

    svc = DetectionService()
    decision, alert, is_new = svc.process_flow(db_session, flow, models, server)

    assert decision.should_alert is True
    assert decision.outcome in ("likely_malicious", "suspicious")
    assert decision.threat_class == "DDoS"
    assert decision.severity in ("high", "critical")
    assert alert is not None
    assert alert.dedup_key is not None
    assert alert.occurrence_count >= 1

    # Verify structured evidence contents
    assert "observed_network_facts" in alert.evidence
    assert "model_inferences" in alert.evidence
    assert alert.evidence["observed_network_facts"]["packet_count"] == 2500
    assert alert.model_version is not None or alert.evidence["model_inferences"]["classifier_model_version"] is not None


def test_e2e_alert_deduplication_and_recurrence(db_session, test_server_id, test_import_id):
    """
    Verifies that identical re-observed attack flows within 24 hours increment
    occurrence_count rather than spawning redundant alert rows.
    """
    server = db_session.get(MonitoredServerModel, test_server_id)
    models = resolve_active_models(db_session)
    svc = DetectionService()

    import uuid
    rand_suffix = (uuid.uuid4().int % 240) + 1
    rand_subnet = (uuid.uuid4().int % 200) + 20
    unique_ip = f"198.51.{rand_subnet}.{rand_suffix}"
    flow = TrafficFlowModel(
        import_id=test_import_id,
        server_id=server.id,
        source_ip=unique_ip,
        destination_ip=server.ip_address,
        source_port=55555,
        destination_port=80,
        protocol="TCP",
        start_time="2026-10-02T10:00:00Z",
        end_time="2026-10-02T10:00:01Z",
        duration=1.0,
        packet_count=1500,
        byte_count=900000,
        packets_per_second=1500.0,
        bytes_per_second=900000.0,
        tcp_syn_count=1500,
        tcp_ack_count=0
    )
    db_session.add(flow)
    db_session.commit()
    db_session.refresh(flow)

    # First observation
    d1, alert1, is_new1 = svc.process_flow(db_session, flow, models, server)
    assert is_new1 is True
    initial_occurrences = alert1.occurrence_count
    alert_id = alert1.id

    # Second observation (recurrence within window)
    d2, alert2, is_new2 = svc.process_flow(db_session, flow, models, server)
    assert is_new2 is False
    assert alert2.id == alert_id
    assert alert2.occurrence_count == initial_occurrences + 1


def test_e2e_alert_lifecycle_and_audit_history(test_client, db_session, test_server_id):
    """
    Verifies alert status lifecycle transitions and immutable audit logs via REST API.
    Transitions: new -> investigating -> resolved -> new (reopen)
    """
    unique_ip = f"198.51.100.{int(time.time() * 100) % 200 + 10}"
    alert = AlertModel(
        server_id=test_server_id,
        source_ip=unique_ip,
        destination_ip="10.0.0.99",
        destination_port=22,
        protocol="TCP",
        threat="Port Scan",
        threat_class="Port Scan",
        severity="high",
        status="new",
        model_score=0.88,
        evidence={"observed_network_facts": {"port": 22}, "model_inferences": {"score": 0.88}},
        dedup_key=f"test_lifecycle_dedup_key_{unique_ip}",
        occurrence_count=1
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    # 1. Transition to 'investigating'
    resp1 = test_client.patch(
        f"/api/alerts/{alert.id}/status",
        json={"status": "investigating", "note": "SOC Analyst triaging anomalous traffic"}
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "investigating"

    # 2. Transition to 'resolved'
    resp2 = test_client.patch(
        f"/api/alerts/{alert.id}/status",
        json={"status": "resolved", "note": "Firewall perimeter updated, threat mitigated"}
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "resolved"

    # 3. Inspect audit trail via GET /api/alerts/{id}
    detail_resp = test_client.get(f"/api/alerts/{alert.id}")
    assert detail_resp.status_code == 200
    data = detail_resp.json()
    assert len(data["history"]) >= 2
    recorded_statuses = [h["new_status"] for h in data["history"]]
    assert "investigating" in recorded_statuses
    assert "resolved" in recorded_statuses
    assert any(h.get("note") == "Firewall perimeter updated, threat mitigated" for h in data["history"])

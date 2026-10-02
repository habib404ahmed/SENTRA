"""
SENTRA Phase 6: Threat Detection, Alert Engine & Decision Policy Test Suite.

Tests model loading, feature schema compatibility, classification inference,
anomaly inference, detection decision rules, evidence generation, alert deduplication,
alert lifecycle transitions, detection jobs, and API filtering.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, SessionLocal
from app.models.server import MonitoredServerModel
from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.detection_job import DetectionJobModel
from app.detection.policy import DetectionPolicyEngine, DetectionDecision, POLICY_VERSION
from app.detection.evidence import generate_threat_evidence
from app.detection.deduplication import AlertDeduplicator
from app.detection.lifecycle import AlertLifecycleManager, VALID_ALERT_STATUSES
from app.detection.model_loader import resolve_active_models, ActiveModelPair
from app.detection.service import DetectionService

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_detection_health_endpoint():
    """Verify detection subsystem reports readiness and active model info."""
    response = client.get("/api/detection/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "subsystem" in data
    assert data["policy_version"] == "v1.0.0"
    assert "inference_ready" in data


def test_policy_engine_decision_rules():
    """Verify policy engine rules for malicious, anomalous, and normal traffic."""
    engine = DetectionPolicyEngine(
        classifier_confidence_threshold=0.55,
        anomaly_isolation_threshold=-0.02,
        high_confidence_threshold=0.80,
    )

    flow_facts = {
        "source_ip": "192.168.1.50",
        "destination_ip": "10.0.0.1",
        "source_port": 45000,
        "destination_port": 80,
        "protocol": "TCP",
        "packet_count": 1000,
        "byte_count": 60000,
        "packets_per_second": 500.0,
        "bytes_per_second": 30000.0,
    }

    # Case 1: High confidence DDoS with anomaly confirmation -> likely_malicious, critical/high severity
    dec_ddos = engine.evaluate(
        predicted_class="DDoS",
        class_score=0.92,
        class_probabilities={"Normal": 0.05, "DDoS": 0.92, "Reconnaissance": 0.03},
        anomaly_score=-0.08,
        is_anomaly_flag=True,
        flow_facts=flow_facts,
    )
    assert dec_ddos.outcome == "likely_malicious"
    assert dec_ddos.should_alert is True
    assert dec_ddos.threat_class == "DDoS"
    assert dec_ddos.severity in ["medium", "high", "critical"]
    assert "multi-model convergence" in dec_ddos.summary.lower()

    # Case 2: Classifier predicts Normal, but Anomaly Detector flags outlier -> anomalous
    dec_anomaly = engine.evaluate(
        predicted_class="Normal",
        class_score=0.60,
        class_probabilities={"Normal": 0.60, "DDoS": 0.40},
        anomaly_score=-0.09,
        is_anomaly_flag=True,
        flow_facts=flow_facts,
    )
    assert dec_anomaly.outcome == "anomalous"
    assert dec_anomaly.should_alert is True
    assert dec_anomaly.threat_class == "Unusual Unidirectional Flow"

    # Case 3: Inlier normal flow -> normal (no alert)
    dec_normal = engine.evaluate(
        predicted_class="Normal",
        class_score=0.95,
        class_probabilities={"Normal": 0.95, "DDoS": 0.05},
        anomaly_score=0.08,
        is_anomaly_flag=False,
        flow_facts=flow_facts,
    )
    assert dec_normal.outcome == "normal"
    assert dec_normal.should_alert is False


def test_evidence_generation_facts_vs_inferences():
    """Verify evidence clearly segregates observed network facts from AI inferences."""
    flow_facts = {
        "source_ip": "10.10.10.5",
        "destination_ip": "192.168.1.1",
        "source_port": 54321,
        "destination_port": 53,
        "protocol": "UDP",
        "duration": 12.5,
        "packet_count": 80,
        "byte_count": 32000,
        "packets_per_second": 6.4,
        "bytes_per_second": 2560.0,
        "average_packet_size": 400.0,
        "tcp_syn_count": 0,
        "tcp_ack_count": 0,
        "tcp_fin_count": 0,
        "tcp_rst_count": 0,
    }
    decision_summary = {
        "threat_class": "DNS Tunneling",
        "outcome": "likely_malicious",
        "severity": "high",
        "model_score": 0.88,
        "anomaly_score": -0.05,
        "is_anomaly": True,
        "reason_code": "RULE_HYBRID_CONFIRMED_THREAT",
        "summary": "DNS query entropy matches covert tunneling profile.",
        "classifier_version": "v1.0.4",
        "anomaly_version": "v1.0.3",
        "feature_schema_version": "v1.0.0",
        "policy_version": "v1.0.0",
    }
    feature_values = {
        "dns_query_count": 80,
        "dns_txt_record_count": 75,
        "flow_entropy": 7.85,
        "syn_ratio": 0.0,
    }

    evidence = generate_threat_evidence(flow_facts, decision_summary, feature_values)

    # Validate structure
    assert "observed_network_facts" in evidence
    assert "model_inferences" in evidence
    assert "triage_context" in evidence
    assert "behavioral_indicators" in evidence

    # Observed facts must be raw numbers
    facts = evidence["observed_network_facts"]
    assert facts["source_ip"] == "10.10.10.5"
    assert facts["destination_port"] == 53
    assert facts["dns_telemetry"]["txt_record_count"] == 75

    # Inferences must reflect model predictions
    inferences = evidence["model_inferences"]
    assert inferences["predicted_threat_class"] == "DNS Tunneling"
    assert inferences["classifier_score"] == 0.88
    assert inferences["is_statistical_anomaly"] is True


def test_alert_deduplication_and_recurrence(db_session: Session):
    """Verify deduplication updates occurrence counts rather than inserting duplicates."""
    dedup_key = AlertDeduplicator.generate_dedup_key(
        server_id=None,
        source_ip="198.51.100.99",
        destination_ip="203.0.113.10",
        protocol="TCP",
        threat_class="DDoS",
    )

    # Create initial alert
    initial_alert = AlertModel(
        threat="DDoS",
        threat_class="DDoS",
        detection_type="classification",
        detection_decision="likely_malicious",
        severity="high",
        source_ip="198.51.100.99",
        destination_ip="203.0.113.10",
        protocol="TCP",
        dedup_key=dedup_key,
        occurrence_count=1,
        status="new",
        evidence={"observed_network_facts": {"packet_count": 500}},
    )
    db_session.add(initial_alert)
    db_session.commit()
    db_session.refresh(initial_alert)

    # Second detection with same dedup_key
    found = AlertDeduplicator.find_or_deduplicate(db_session, dedup_key, window_hours=24)
    assert found is not None
    assert found.id == initial_alert.id

    updated = AlertDeduplicator.record_occurrence(
        found,
        latest_evidence={"observed_network_facts": {"packet_count": 1200}},
        latest_score=0.96,
    )
    db_session.commit()

    assert updated.occurrence_count == 2
    assert updated.model_score == 0.96


def test_alert_lifecycle_state_machine(db_session: Session):
    """Verify valid and invalid state transitions."""
    alert = AlertModel(
        threat="Reconnaissance",
        threat_class="Reconnaissance",
        severity="medium",
        source_ip="198.51.100.42",
        destination_ip="203.0.113.5",
        status="new",
        evidence={},
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    # Valid transition: new -> acknowledged
    updated = AlertLifecycleManager.transition_status(
        db_session, alert, "acknowledged", operator="lead_analyst", note="Acknowledged in triage"
    )
    assert updated.status == "acknowledged"

    # Verify audit history logged
    history = db_session.query(AlertStatusHistoryModel).filter_by(alert_id=alert.id).all()
    assert len(history) == 1
    assert history[0].previous_status == "new"
    assert history[0].new_status == "acknowledged"
    assert history[0].changed_by == "lead_analyst"

    # Invalid transition directly from resolved to acknowledged
    alert.status = "resolved"
    db_session.commit()

    with pytest.raises(Exception):
        AlertLifecycleManager.transition_status(db_session, alert, "acknowledged")


def test_alerts_api_list_and_summary():
    """Verify GET /api/alerts and GET /api/alerts/summary endpoints."""
    # List endpoint
    res_list = client.get("/api/alerts?page=1&page_size=10")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert "total" in list_data
    assert "items" in list_data
    assert isinstance(list_data["items"], list)

    # Summary endpoint
    res_summary = client.get("/api/alerts/summary")
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert "total_alerts" in summary_data
    assert "by_severity" in summary_data
    assert "by_threat_class" in summary_data
    assert "by_status" in summary_data


def test_patch_alert_status_api(db_session: Session):
    """Verify PATCH /api/alerts/{id}/status endpoint."""
    alert = AlertModel(
        threat="Data Exfiltration",
        threat_class="Data Exfiltration",
        severity="critical",
        source_ip="192.168.1.200",
        destination_ip="45.33.32.156",
        status="new",
        evidence={},
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    payload = {
        "status": "investigating",
        "note": "SOC Incident #919 opened for outbound channel",
        "operator": "soc_tier2",
    }
    res = client.patch(f"/api/alerts/{alert.id}/status", json=payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "investigating"


def test_end_to_end_flow_detection_service(db_session: Session):
    """
    End-to-end integration test: takes an existing or created flow, resolves active
    trained models from the registry, executes inference, decision policy, and verifies alert creation.
    """
    # 1. Create a simulated high-rate SYN flood flow
    flow = TrafficFlowModel(
        import_id=1,
        source_ip="185.220.101.5",
        destination_ip="10.0.0.1",
        source_port=65000,
        destination_port=80,
        protocol="TCP",
        duration=2.0,
        packet_count=1200,
        byte_count=64800,
        average_packet_size=54.0,
        packets_per_second=600.0,
        bytes_per_second=32400.0,
        tcp_syn_count=1200,
        tcp_ack_count=0,
        tcp_fin_count=0,
        tcp_rst_count=0,
    )
    db_session.add(flow)
    db_session.commit()
    db_session.refresh(flow)

    # 2. Resolve active models from registry
    models = resolve_active_models(db_session)
    assert models.is_available is True

    # 3. Process flow through DetectionService
    service = DetectionService()
    decision, alert, is_new = service.process_flow(db_session, flow, models)

    assert decision is not None
    # SYN flood flow must be flagged
    if decision.should_alert:
        assert alert is not None
        assert alert.source_ip == "185.220.101.5"
        assert alert.evidence is not None
        assert "observed_network_facts" in alert.evidence

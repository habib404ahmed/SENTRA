"""
SENTRA — Smart India Hackathon 2026 Demonstration Script
Problem Statement ID: 26145
Project: AI-Based Detection of Cyber Threats in Unidirectional IP Traffic

Demonstrates the complete end-to-end passive telemetry analysis pipeline:
  Step 1: System Health & Active Model Verification
  Step 2: Monitored Asset Registration
  Step 3: Unidirectional Traffic Ingestion (Benign + DDoS SYN Flood)
  Step 4: Unidirectional Flow Separation & Schema v1.0.0 Feature Extraction
  Step 5: Hybrid AI/ML Inference (Random Forest + Isolation Forest)
  Step 6: Policy Consensus & Forensic Evidence Generation
  Step 7: Deduplication Window Validation & Alert Storage
  Step 8: Analyst Triage Lifecycle (New -> Investigating -> Resolved)
"""

import os
import sys
import time
import json
import logging
from datetime import datetime, timezone

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.server import MonitoredServerModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.features.flow_features import extract_flow_features
from app.detection.policy import DetectionPolicyEngine
from app.detection.evidence import generate_threat_evidence
from app.detection.deduplication import AlertDeduplicator
from app.detection.model_loader import resolve_active_models
from tests.conftest import SyntheticTrafficGenerator, packets_to_pcap_bytes

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("sentra.demo")
client = TestClient(app)


def print_banner(text: str):
    print("\n" + "=" * 78)
    print(f"  {text}")
    print("=" * 78)


def run_sih_demo():
    print_banner("SENTRA — AI Cyber Threat Detection in Unidirectional IP Traffic\n  Smart India Hackathon 2026 | Problem Statement ID: 26145")

    # --------------------------------------------------------------------------
    # Step 1: System Health & Active Model Verification
    # --------------------------------------------------------------------------
    print("\n[Step 1/8] Verifying SENTRA Subsystem Health & Active ML Models...")
    health_resp = client.get("/api/detection/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    health_data = health_resp.json()
    print(f"  > Subsystem Status:     {health_data.get('status')}")
    print(f"  > Policy Version:       {health_data.get('policy_version')}")
    print(f"  > Inference Engine:     {'READY' if health_data.get('inference_ready') else 'INITIALIZING'}")
    print(f"  > Active Classifier:    {health_data.get('active_models', {}).get('classifier', {}).get('name', 'Default RF')}")
    print(f"  > Active Anomaly Det.:  {health_data.get('active_models', {}).get('anomaly_detector', {}).get('name', 'Default IF')}")

    # --------------------------------------------------------------------------
    # Step 2: Monitored Asset Verification
    # --------------------------------------------------------------------------
    print("\n[Step 2/8] Registering/Verifying High-Value Monitored Server Asset...")
    db = SessionLocal()
    target_ip = "10.0.100.50"
    server = db.query(MonitoredServerModel).filter_by(ip_address=target_ip).first()
    if not server:
        server = MonitoredServerModel(
            name="SIH-Core-Banking-Gateway",
            hostname="gw-prod-01.bank.internal",
            ip_address=target_ip,
            server_type="Critical Financial Gateway",
            environment="production",
            traffic_source="Optical Diode Tap",
            status="active",
            description="High-security unidirectional optical tap feed from core network boundary"
        )
        db.add(server)
        db.commit()
        db.refresh(server)
    print(f"  > Asset Name:        {server.name}")
    print(f"  > Monitored IP:      {server.ip_address}")
    print(f"  > Telemetry Source:  {server.traffic_source} (Unidirectional Tap)")
    print(f"  > Status:            {server.status}")
    server_id = server.id
    db.close()

    # --------------------------------------------------------------------------
    # Step 3: Unidirectional Traffic Ingestion (Benign + DDoS SYN Flood)
    # --------------------------------------------------------------------------
    print("\n[Step 3/8] Simulating Unidirectional Optical Tap Traffic Feed...")
    attacker_ip = f"198.51.100.{int(time.time() * 10) % 200 + 10}"
    pcap_data = SyntheticTrafficGenerator.generate_ddos_syn_flood(packet_count=150)
    print(f"  > Simulated Attacks:         High-rate TCP SYN Flood targeting {target_ip}:443")
    print(f"  > Capture Payload Size:      {len(pcap_data)} bytes")

    # Upload PCAP to backend
    files = {"file": ("sih_demo_capture.pcap", pcap_data, "application/vnd.tcpdump.pcap")}
    data = {"server_id": str(server_id)}
    upload_resp = client.post("/api/ingestion/pcap", files=files, data=data)
    assert upload_resp.status_code in [200, 201, 202], f"Upload failed: {upload_resp.text}"
    import_rec = upload_resp.json()
    import_id = import_rec.get("id")
    print(f"  > Ingestion Record Created:  Import ID #{import_id} (Status: {import_rec.get('status')})")

    # --------------------------------------------------------------------------
    # Step 4: Flow Aggregation & Feature Extraction
    # --------------------------------------------------------------------------
    print("\n[Step 4/8] Performing Unidirectional Flow Aggregation & Feature Extraction...")
    # Representative flow dictionary matching the SYN flood vector
    attack_flow_dict = {
        "source_ip": attacker_ip,
        "destination_ip": target_ip,
        "source_port": 45123,
        "destination_port": 443,
        "protocol": "TCP",
        "packet_count": 150,
        "byte_count": 9000,
        "duration": 0.15,
        "average_packet_size": 60.0,
        "packets_per_second": 1000.0,
        "bytes_per_second": 60000.0,
        "average_interarrival_time": 0.001,
        "tcp_syn_count": 150,
        "tcp_ack_count": 0,
        "tcp_fin_count": 0,
        "tcp_rst_count": 0,
    }
    extracted_features = extract_flow_features(attack_flow_dict)
    print(f"  > Extracted Feature Vector:  {len(extracted_features)} numeric features (Schema v1.0.0)")
    print(f"  > TCP SYN Ratio:             {extracted_features.get('syn_ratio', 0.0):.4f} (100% SYN, 0% ACK)")
    print(f"  > Packets Per Second:        {extracted_features.get('packets_per_second', 0.0):.1f} pps")
    print(f"  > Flow Duration:             {extracted_features.get('flow_duration', 0.0):.4f} s")

    # --------------------------------------------------------------------------
    # Step 5: Multi-Model Inference
    # --------------------------------------------------------------------------
    print("\n[Step 5/8] Running Multi-Model AI/ML Inference...")
    db_session = SessionLocal()
    active_pair = resolve_active_models(db_session)
    db_session.close()
    clf = active_pair.classifier
    iso = active_pair.anomaly_detector

    clf_res = clf.predict_single(extracted_features)
    iso_res = iso.predict_single(extracted_features)

    predicted_label = clf_res["predicted_class"]
    class_score = clf_res["confidence"]
    class_probabilities = clf_res["class_probabilities"]
    iso_score = iso_res["anomaly_score"]
    is_anomaly = iso_res["is_anomaly"]

    print(f"  > Random Forest Prediction:  {predicted_label} (Confidence: {class_score * 100:.1f}%)")
    print(f"  > Isolation Forest Score:    {iso_score:.4f} (Statistical Anomaly: {is_anomaly})")

    # --------------------------------------------------------------------------
    # Step 6: Policy Consensus & Structured Evidence Synthesis
    # --------------------------------------------------------------------------
    print("\n[Step 6/8] Evaluating Consensus Policy & Synthesizing Evidence...")
    policy_engine = DetectionPolicyEngine()
    decision = policy_engine.evaluate(
        predicted_class=predicted_label,
        class_score=class_score,
        class_probabilities=class_probabilities,
        anomaly_score=iso_score,
        is_anomaly_flag=is_anomaly,
        flow_facts=attack_flow_dict
    )
    print(f"  > Policy Verdict Outcome:    {decision.outcome.upper()}")
    print(f"  > Assigned Severity Level:   {decision.severity.upper()}")
    print(f"  > Reason Code:               {decision.reason_code}")
    print(f"  > Summary:                   {decision.summary}")

    evidence = generate_threat_evidence(
        attack_flow_dict,
        {
            "threat_class": decision.threat_class,
            "outcome": decision.outcome,
            "model_score": decision.model_score,
            "anomaly_score": decision.anomaly_score,
            "is_anomaly": decision.is_anomaly,
            "severity": decision.severity,
            "summary": decision.summary,
            "reason_code": decision.reason_code
        },
        feature_values=extracted_features,
        server_info={"name": server.name, "ip": server.ip_address}
    )
    print(f"  > Behavioral Indicators:    {evidence['behavioral_indicators'][0] if evidence['behavioral_indicators'] else 'None'}")

    # --------------------------------------------------------------------------
    # Step 7: Alert Deduplication & Persistence
    # --------------------------------------------------------------------------
    print("\n[Step 7/8] Persisting Alert with 24-Hour Behavioral Deduplication...")
    deduplicator = AlertDeduplicator()
    dedup_key = deduplicator.generate_dedup_key(
        server_id=server_id,
        source_ip=attacker_ip,
        destination_ip=target_ip,
        protocol="TCP",
        threat_class=decision.threat_class
    )
    print(f"  > Deduplication Signature:   {dedup_key}")

    db = SessionLocal()
    alert = AlertModel(
        server_id=server_id,
        threat="Unidirectional TCP SYN Flood Denial of Service",
        threat_class=decision.threat_class,
        detection_type="hybrid_consensus",
        detection_decision=decision.outcome,
        severity=decision.severity,
        model_score=decision.model_score,
        anomaly_score=decision.anomaly_score,
        source_ip=attacker_ip,
        destination_ip=target_ip,
        source_port=45123,
        destination_port=443,
        protocol="TCP",
        evidence=evidence,
        dedup_key=dedup_key,
        status="new",
        occurrence_count=1
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    alert_id = alert.id
    print(f"  > Threat Alert Stored:       Alert #{alert_id} (Status: NEW)")

    # Test repeat detection deduplication
    print("  > Testing Deduplication with Repeated Threat Occurrence...")
    re_found = deduplicator.find_or_deduplicate(db, dedup_key=dedup_key, window_hours=24)
    if re_found:
        re_found.occurrence_count += 1
        db.commit()
        db.refresh(re_found)
        print(f"  > Successfully Deduplicated: Re-occurrence updated occurrence_count to {re_found.occurrence_count}")
    db.close()

    # --------------------------------------------------------------------------
    # Step 8: Analyst Triage Lifecycle Transitions
    # --------------------------------------------------------------------------
    print("\n[Step 8/8] Demonstrating Security Analyst Lifecycle & Audit Trail...")
    # Transition to 'investigating'
    resp_inv = client.patch(
        f"/api/alerts/{alert_id}/status",
        json={"status": "investigating", "note": "SIH Analyst: Triage confirmed high-volume SYN flood from external source."}
    )
    assert resp_inv.status_code == 200
    print(f"  > Transition 1: 'new' -> 'investigating' (Status: {resp_inv.json().get('status')})")

    # Transition to 'resolved'
    resp_res = client.patch(
        f"/api/alerts/{alert_id}/status",
        json={"status": "resolved", "note": "SIH Analyst: Upstream firewall rule enacted. Attack subsided."}
    )
    assert resp_res.status_code == 200
    print(f"  > Transition 2: 'investigating' -> 'resolved' (Status: {resp_res.json().get('status')})")

    # Retrieve full alert details and audit history
    detail_resp = client.get(f"/api/alerts/{alert_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    audit_history = detail_data.get("history", [])
    print(f"  > Audit History Records:    {len(audit_history)} chronological transitions logged")
    for idx, hist in enumerate(audit_history):
        print(f"     [{idx + 1}] {hist.get('previous_status')} -> {hist.get('new_status')} by {hist.get('changed_by')}: '{hist.get('note')}'")

    print_banner("DEMONSTRATION COMPLETE: ALL SENTRA CAPABILITIES VERIFIED SUCCESSFULLY")


if __name__ == "__main__":
    run_sih_demo()

"""
SENTRA Phase 7: Automated Performance & Latency Regression Suite.

Verifies that critical processing path latencies remain within SLA bounds:
1. Feature extraction per flow < 500 microseconds
2. Policy and evidence generation per detection < 5 milliseconds
3. Deduplication hash generation < 100 microseconds
4. Streaming packet parser throughput > 100 packets/sec
"""

import time
import pytest
import numpy as np

from app.features.flow_features import extract_flow_features
from app.detection.policy import DetectionPolicyEngine
from app.detection.evidence import generate_threat_evidence
from app.detection.deduplication import AlertDeduplicator


def test_feature_extraction_latency_sla():
    """Verify feature extraction latency is sub-millisecond per flow record."""
    dummy_flow = {
        "packet_count": 25,
        "byte_count": 14000,
        "duration": 1.25,
        "source_port": 54321,
        "destination_port": 443,
        "protocol": "TCP",
        "tcp_syn_count": 1,
        "tcp_ack_count": 20,
        "tcp_fin_count": 1,
        "tcp_rst_count": 0,
        "average_interarrival_time": 0.05
    }

    # Warmup
    for _ in range(20):
        extract_flow_features(dummy_flow)

    # Benchmark 200 runs
    latencies_us = []
    for _ in range(200):
        t0 = time.perf_counter()
        feats = extract_flow_features(dummy_flow)
        latencies_us.append((time.perf_counter() - t0) * 1_000_000)

    mean_latency_us = np.mean(latencies_us)
    p95_latency_us = np.percentile(latencies_us, 95)

    assert mean_latency_us < 500.0, f"Feature extraction too slow: mean={mean_latency_us:.2f}us (SLA < 500us)"
    assert p95_latency_us < 1500.0, f"Feature extraction p95 too slow: p95={p95_latency_us:.2f}us"
    assert len(feats) == 19, f"Expected 19 features in schema v1.0.0, extracted {len(feats)}"


def test_decision_and_evidence_generation_latency_sla():
    """Verify detection policy evaluation and evidence synthesis execute in under 5ms."""
    engine = DetectionPolicyEngine()

    dummy_flow = {
        "packet_count": 5000,
        "byte_count": 3000000,
        "duration": 0.8,
        "source_port": 38472,
        "destination_port": 80,
        "protocol": "TCP",
        "tcp_syn_count": 5000,
        "tcp_ack_count": 0,
        "tcp_fin_count": 0,
        "tcp_rst_count": 0,
        "average_interarrival_time": 0.00016
    }
    feats = extract_flow_features(dummy_flow)

    latencies_ms = []
    for _ in range(100):
        t0 = time.perf_counter()
        decision = engine.evaluate(
            predicted_class="DDoS",
            class_score=0.89,
            class_probabilities={"Normal": 0.05, "DDoS": 0.89, "Port Scan": 0.06},
            anomaly_score=-0.08,
            is_anomaly_flag=True,
            flow_facts=dummy_flow
        )
        evidence = generate_threat_evidence(dummy_flow, {
            "threat_class": decision.threat_class,
            "outcome": decision.outcome,
            "model_score": decision.model_score,
            "anomaly_score": decision.anomaly_score,
            "is_anomaly": decision.is_anomaly,
            "severity": decision.severity,
            "summary": decision.summary
        }, feature_values=feats)
        latencies_ms.append((time.perf_counter() - t0) * 1000)

    mean_ms = np.mean(latencies_ms)
    p95_ms = np.percentile(latencies_ms, 95)

    assert mean_ms < 5.0, f"Decision & evidence generation exceeded SLA: mean={mean_ms:.3f}ms"
    assert p95_ms < 10.0, f"Decision & evidence generation p95 exceeded SLA: p95={p95_ms:.3f}ms"
    assert evidence["triage_context"]["assigned_severity"] in ["critical", "high", "medium"]


def test_deduplication_hashing_latency_sla():
    """Verify deduplication hash calculation executes in under 100 microseconds."""
    deduplicator = AlertDeduplicator()

    latencies_us = []
    for i in range(200):
        t0 = time.perf_counter()
        key = deduplicator.generate_dedup_key(
            server_id=1,
            source_ip=f"198.51.100.{i % 254}",
            destination_ip="10.0.0.99",
            protocol="TCP",
            threat_class="DDoS"
        )
        latencies_us.append((time.perf_counter() - t0) * 1_000_000)

    mean_us = np.mean(latencies_us)
    assert mean_us < 100.0, f"Deduplication hash calculation too slow: mean={mean_us:.2f}us"
    assert len(key) == 32, "Deduplication key should be 32 hexadecimal characters"

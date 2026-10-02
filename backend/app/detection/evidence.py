"""
SENTRA Structured Evidence Generation Module

Constructs evidence records distinguishing observed network facts from
model-derived interpretations for security analysts and forensics.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone


def generate_threat_evidence(
    flow_dict: Dict[str, Any],
    decision_summary: Dict[str, Any],
    feature_values: Optional[Dict[str, Any]] = None,
    server_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Constructs a comprehensive, structured evidence dictionary for an alert.
    """
    features = feature_values or {}

    # 1. Observed Traffic Facts (Deterministic Network Telemetry)
    observed_facts = {
        "source_ip": flow_dict.get("source_ip"),
        "destination_ip": flow_dict.get("destination_ip"),
        "source_port": flow_dict.get("source_port"),
        "destination_port": flow_dict.get("destination_port"),
        "protocol": flow_dict.get("protocol", "TCP"),
        "duration_seconds": round(float(flow_dict.get("duration", 0.0) or 0.0), 4),
        "packet_count": int(flow_dict.get("packet_count", 0) or 0),
        "byte_count": int(flow_dict.get("byte_count", 0) or 0),
        "packets_per_second": round(float(flow_dict.get("packets_per_second", 0.0) or 0.0), 2),
        "bytes_per_second": round(float(flow_dict.get("bytes_per_second", 0.0) or 0.0), 2),
        "average_packet_size": round(float(flow_dict.get("average_packet_size", 0.0) or 0.0), 2),
        "tcp_flags": {
            "syn_count": int(flow_dict.get("tcp_syn_count", 0) or 0),
            "ack_count": int(flow_dict.get("tcp_ack_count", 0) or 0),
            "fin_count": int(flow_dict.get("tcp_fin_count", 0) or 0),
            "rst_count": int(flow_dict.get("tcp_rst_count", 0) or 0),
            "syn_ratio": round(float(features.get("syn_ratio", 0.0) or 0.0), 4),
        },
    }

    # Extract DNS / Application facts if present
    if "dns_query_count" in features:
        observed_facts["dns_telemetry"] = {
            "query_count": int(features.get("dns_query_count", 0)),
            "txt_record_count": int(features.get("dns_txt_record_count", 0)),
            "flow_entropy": round(float(features.get("flow_entropy", 0.0) or 0.0), 4),
        }

    # 2. Model-Derived Inferences (Machine Learning Outputs)
    model_inferences = {
        "predicted_threat_class": decision_summary.get("threat_class"),
        "decision_outcome": decision_summary.get("outcome"),
        "classifier_score": (
            round(float(decision_summary["model_score"]), 4)
            if decision_summary.get("model_score") is not None
            else None
        ),
        "classifier_vote_share_pct": (
            f"{float(decision_summary['model_score']) * 100:.1f}%"
            if decision_summary.get("model_score") is not None
            else None
        ),
        "class_probabilities": decision_summary.get("class_probabilities"),
        "isolation_score": (
            round(float(decision_summary["anomaly_score"]), 4)
            if decision_summary.get("anomaly_score") is not None
            else None
        ),
        "is_statistical_anomaly": bool(decision_summary.get("is_anomaly", False)),
        "classifier_model_version": decision_summary.get("classifier_version"),
        "anomaly_model_version": decision_summary.get("anomaly_version"),
        "feature_schema_version": decision_summary.get("feature_schema_version", "v1.0.0"),
    }

    # 3. Detection Decision Context
    triage_context = {
        "reason_code": decision_summary.get("reason_code"),
        "decision_summary": decision_summary.get("summary"),
        "assigned_severity": decision_summary.get("severity"),
        "policy_version": decision_summary.get("policy_version", "v1.0.0"),
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
        "monitored_server": server_info,
    }

    # 4. Key Behavioral Deviations (forensic indicators)
    indicators = []
    if observed_facts["tcp_flags"]["syn_ratio"] > 0.8 and observed_facts["packet_count"] > 20:
        indicators.append("Abnormally elevated TCP SYN ratio with negligible ACK responses (characteristic of SYN flood).")
    if observed_facts["packets_per_second"] > 1000:
        indicators.append(f"High-velocity packet burst ({observed_facts['packets_per_second']} pps) exceeding normal forward threshold.")
    if features.get("dns_txt_record_count", 0) > 10:
        indicators.append(f"Elevated DNS TXT record volume ({features.get('dns_txt_record_count')} records) consistent with covert tunneling.")
    if features.get("flow_entropy", 0) > 7.0:
        indicators.append("Elevated Shannon flow entropy indicates packed, encrypted, or steganographic payload.")

    return {
        "observed_network_facts": observed_facts,
        "model_inferences": model_inferences,
        "triage_context": triage_context,
        "behavioral_indicators": indicators,
    }

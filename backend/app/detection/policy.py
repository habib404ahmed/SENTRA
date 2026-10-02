"""
SENTRA Threat Detection Decision Policy & Severity Rules (v1.0.0)

Implements the multi-criteria decision logic combining supervised Random Forest
classification, unsupervised Isolation Forest anomaly detection, flow volume rates,
and asset context.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass

POLICY_VERSION = "v1.0.0"


@dataclass
class DetectionDecision:
    outcome: str                     # likely_malicious, suspicious, anomalous, inconclusive, normal
    should_alert: bool               # True if alert should be raised
    threat_class: str                # e.g., DDoS, Reconnaissance, DNS Tunneling, Data Exfiltration, Unusual Flow, Normal
    detection_type: str              # classification, anomaly, hybrid_rule
    severity: str                    # low, medium, high, critical
    reason_code: str                 # Documented rule identifier
    summary: str                     # Human-readable explanation of decision
    model_score: Optional[float]     # Uncalibrated supervised score (vote share)
    anomaly_score: Optional[float]   # Raw isolation forest score
    is_anomaly: bool                 # Out-of-distribution flag


class DetectionPolicyEngine:
    """
    Evaluates raw ML predictions and network flow facts against defined security policies.
    """

    def __init__(
        self,
        classifier_confidence_threshold: float = 0.55,
        anomaly_isolation_threshold: float = -0.02,
        high_confidence_threshold: float = 0.80,
    ):
        self.classifier_confidence_threshold = classifier_confidence_threshold
        self.anomaly_isolation_threshold = anomaly_isolation_threshold
        self.high_confidence_threshold = high_confidence_threshold

    def evaluate(
        self,
        predicted_class: Optional[str],
        class_score: Optional[float],
        class_probabilities: Optional[Dict[str, float]],
        anomaly_score: Optional[float],
        is_anomaly_flag: Optional[bool],
        flow_facts: Dict[str, Any],
        server_context: Optional[Dict[str, Any]] = None,
    ) -> DetectionDecision:
        """
        Executes policy evaluation on a single directional flow.
        """
        score = class_score if class_score is not None else 0.0
        iso_score = anomaly_score if anomaly_score is not None else 0.0
        is_isolated = is_anomaly_flag or (iso_score < self.anomaly_isolation_threshold)

        pps = flow_facts.get("packets_per_second", 0.0) or 0.0
        bps = flow_facts.get("bytes_per_second", 0.0) or 0.0
        packet_count = flow_facts.get("packet_count", 0) or 0
        byte_count = flow_facts.get("byte_count", 0) or 0
        protocol = str(flow_facts.get("protocol", "TCP")).upper()

        server_role = server_context.get("server_role", "standard") if server_context else "standard"
        is_critical_server = server_role in ["domain_controller", "database", "core_gateway", "production"]

        # Rule 1: Classifier identified a known threat category
        if predicted_class and predicted_class != "Normal":
            # Multi-model confirmation: Both classifier and isolation forest agree
            if score >= self.high_confidence_threshold and is_isolated:
                outcome = "likely_malicious"
                det_type = "hybrid_rule"
                reason_code = "RULE_HYBRID_CONFIRMED_THREAT"
                summary = (
                    f"Strong multi-model convergence: Supervised model predicted '{predicted_class}' "
                    f"with high vote share ({score:.1%}) and unsupervised model confirmed anomalous flow isolation."
                )
            elif score >= self.classifier_confidence_threshold:
                outcome = "suspicious" if not is_isolated else "likely_malicious"
                det_type = "classification"
                reason_code = "RULE_CLASSIFIER_SIGNATURE_MATCH"
                summary = (
                    f"Supervised threat pattern match: Flow profile corresponds to '{predicted_class}' "
                    f"signature with ensemble vote share of {score:.1%}."
                )
            else:
                outcome = "inconclusive"
                det_type = "classification"
                reason_code = "RULE_LOW_CONFIDENCE_CLASSIFIER"
                summary = (
                    f"Inconclusive prediction: Supervised model indicated '{predicted_class}', "
                    f"but vote share ({score:.1%}) fell below active operational threshold."
                )

            severity = self._compute_severity(
                threat_class=predicted_class,
                outcome=outcome,
                score=score,
                pps=pps,
                bps=bps,
                is_critical_server=is_critical_server,
            )

            should_alert = outcome in ["likely_malicious", "suspicious"]
            return DetectionDecision(
                outcome=outcome,
                should_alert=should_alert,
                threat_class=predicted_class,
                detection_type=det_type,
                severity=severity,
                reason_code=reason_code,
                summary=summary,
                model_score=score,
                anomaly_score=iso_score,
                is_anomaly=is_isolated,
            )

        # Rule 2: Classifier predicts Normal, but Anomaly Detector flags out-of-distribution
        if is_isolated and iso_score < self.anomaly_isolation_threshold:
            outcome = "anomalous"
            det_type = "anomaly"
            reason_code = "RULE_UNSUPERVISED_ANOMALY_OUTLIER"
            threat_name = "Unusual Unidirectional Flow"
            summary = (
                f"Statistical outlier detected: Flow exhibited significant structural dissimilarity "
                f"from baseline traffic profiles (Isolation score: {iso_score:.4f}). "
                f"No specific known signature matched."
            )

            # Severity for pure anomaly depends on traffic volume
            if pps > 1000 or bps > 1_000_000:
                severity = "high"
            elif pps > 200 or bps > 100_000:
                severity = "medium"
            else:
                severity = "low"

            return DetectionDecision(
                outcome=outcome,
                should_alert=True,
                threat_class=threat_name,
                detection_type=det_type,
                severity=severity,
                reason_code=reason_code,
                summary=summary,
                model_score=score,
                anomaly_score=iso_score,
                is_anomaly=True,
            )

        # Rule 3: Flow conforms to benign baseline traffic
        return DetectionDecision(
            outcome="normal",
            should_alert=False,
            threat_class="Normal",
            detection_type="baseline",
            severity="low",
            reason_code="RULE_BASELINE_NORMAL",
            summary="Flow characteristics match established benign operational baseline.",
            model_score=score,
            anomaly_score=iso_score,
            is_anomaly=False,
        )

    def _compute_severity(
        self,
        threat_class: str,
        outcome: str,
        score: float,
        pps: float,
        bps: float,
        is_critical_server: bool,
    ) -> str:
        """
        Determines alert severity triage level from threat type, traffic velocity, and server role.
        """
        t = threat_class.lower()

        # Volumetric DDoS
        if "ddos" in t or "flood" in t:
            if pps > 5000 or bps > 5_000_000:
                return "critical"
            if pps > 1000 or bps > 500_000:
                return "high"
            return "medium"

        # Data Exfiltration
        if "exfiltration" in t or "exfil" in t:
            if is_critical_server or bps > 1_000_000:
                return "critical"
            if bps > 100_000 or score >= 0.85:
                return "high"
            return "medium"

        # DNS Tunneling (Covert Channel)
        if "dns" in t or "tunnel" in t:
            if is_critical_server:
                return "critical"
            if score >= 0.85:
                return "high"
            return "medium"

        # Reconnaissance / Port Scan
        if "recon" in t or "scan" in t:
            if is_critical_server:
                return "high"
            return "medium"

        # Botnet / C2
        if "botnet" in t or "c2" in t:
            if is_critical_server or score >= 0.85:
                return "critical"
            return "high"

        # Default fallback by outcome
        if outcome == "likely_malicious":
            return "high"
        if outcome == "suspicious":
            return "medium"
        return "low"

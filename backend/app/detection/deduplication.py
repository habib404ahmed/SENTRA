"""
SENTRA Alert Deduplication Engine

Prevents alert flooding by aggregating repeated occurrences of identical
threat behaviors across temporal detection windows.
"""

import hashlib
from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.alert import AlertModel


class AlertDeduplicator:
    """
    Manages generation of deduplication signatures and correlates repeat detections.
    """

    @staticmethod
    def generate_dedup_key(
        server_id: Optional[int],
        source_ip: str,
        destination_ip: str,
        protocol: str,
        threat_class: str,
    ) -> str:
        """
        Generates a 32-character SHA256 hex digest representing the unique behavioral vector.
        Strictly requires identical endpoints, protocol, server asset, and threat category.
        Unrelated attacks from the same IP will have distinct threat categories and distinct keys.
        """
        raw_key = f"{server_id or 0}:{source_ip}:{destination_ip}:{protocol.upper()}:{threat_class.upper()}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:32]

    @staticmethod
    def find_or_deduplicate(
        db: Session,
        dedup_key: str,
        window_hours: int = 24,
    ) -> Optional[AlertModel]:
        """
        Looks for an active alert (status in ['new', 'acknowledged', 'investigating'])
        with the matching deduplication key within the specified temporal window.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)

        query = (
            select(AlertModel)
            .where(
                and_(
                    AlertModel.dedup_key == dedup_key,
                    AlertModel.status.in_(["new", "acknowledged", "investigating"]),
                    AlertModel.last_seen_at >= cutoff,
                )
            )
            .order_by(AlertModel.id.desc())
        )
        return db.execute(query).scalars().first()

    @staticmethod
    def record_occurrence(
        alert: AlertModel,
        latest_evidence: dict,
        latest_score: Optional[float] = None,
    ) -> AlertModel:
        """
        Updates an existing alert record with new occurrence metadata.
        """
        alert.occurrence_count += 1
        alert.last_seen_at = datetime.now(timezone.utc)
        if latest_score is not None:
            # Update to highest observed score
            if alert.model_score is None or latest_score > alert.model_score:
                alert.model_score = latest_score

        # Append recurrence note into evidence
        if isinstance(alert.evidence, dict):
            ev = dict(alert.evidence)
            occurrences = ev.setdefault("recurrence_history", [])
            if len(occurrences) < 20:  # Keep up to 20 recent recurrence timestamps
                occurrences.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "packet_count": latest_evidence.get("observed_network_facts", {}).get("packet_count"),
                    "byte_count": latest_evidence.get("observed_network_facts", {}).get("byte_count"),
                })
            alert.evidence = ev

        return alert

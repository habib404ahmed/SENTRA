"""
SENTRA Alert Lifecycle & State Transition Manager

Enforces valid status transitions and persists an audit trail of operator actions.
"""

from typing import Optional, Set, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.alert import AlertModel, AlertStatusHistoryModel

VALID_ALERT_STATUSES: Set[str] = {
    "new",
    "acknowledged",
    "investigating",
    "resolved",
    "false_positive",
}

# Directed graph of permitted state transitions
ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
    "new": {"acknowledged", "investigating", "resolved", "false_positive"},
    "acknowledged": {"investigating", "resolved", "false_positive", "new"},
    "investigating": {"resolved", "false_positive", "acknowledged", "new"},
    "resolved": {"investigating", "new"},  # Reopening
    "false_positive": {"investigating", "new"},  # Reopening
}


class AlertLifecycleManager:
    """
    Validates state transitions and records audit trail entries.
    """

    @staticmethod
    def transition_status(
        db: Session,
        alert: AlertModel,
        target_status: str,
        operator: Optional[str] = "operator",
        note: Optional[str] = None,
    ) -> AlertModel:
        """
        Executes a validated status transition on an alert and appends history.
        """
        current_status = alert.status.lower()
        new_status = target_status.lower()

        if new_status not in VALID_ALERT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid alert status '{target_status}'. Must be one of: {sorted(list(VALID_ALERT_STATUSES))}",
            )

        if current_status == new_status:
            return alert  # No-op

        allowed = ALLOWED_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{current_status}' to '{new_status}'. Allowed: {sorted(list(allowed))}",
            )

        # Record audit history
        history_entry = AlertStatusHistoryModel(
            alert_id=alert.id,
            previous_status=current_status,
            new_status=new_status,
            changed_by=operator or "operator",
            note=note,
        )
        db.add(history_entry)

        # Update alert
        alert.status = new_status
        db.commit()
        db.refresh(alert)
        return alert

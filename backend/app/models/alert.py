from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, func
from app.database import Base


class AlertModel(Base):
    """
    Scaffolded model for Phase 3/4 threat alerts.
    Structured for future relationship: monitored_servers -> alerts -> threat_events.
    """
    __tablename__ = "threat_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    server_id = Column(Integer, ForeignKey("monitored_servers.id", ondelete="CASCADE"), nullable=True, index=True)
    threat = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False, default="medium")
    source_ip = Column(String(64), nullable=False)
    destination_ip = Column(String(64), nullable=False)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=False, default="TCP")
    model_score = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="active")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

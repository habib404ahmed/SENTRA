from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class DetectionJobModel(Base):
    """
    Tracks execution lifecycle and metrics for batch threat detection runs on network traffic.
    """
    __tablename__ = "detection_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Associated input source
    import_id = Column(Integer, ForeignKey("pcap_imports.id", ondelete="SET NULL"), nullable=True, index=True)
    dataset_id = Column(Integer, ForeignKey("ml_datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    classifier_model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="SET NULL"), nullable=True)
    anomaly_model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="SET NULL"), nullable=True)
    
    # Execution state
    status = Column(String(50), nullable=False, default="queued", index=True)  # queued, processing, completed, failed
    policy_version = Column(String(20), nullable=False, default="v1.0.0")
    
    # Flow processing counters
    total_flows = Column(Integer, nullable=False, default=0)
    analyzed_flows = Column(Integer, nullable=False, default=0)
    alerts_generated = Column(Integer, nullable=False, default=0)
    
    # Detailed configuration and error messages
    configuration = Column(JSONB, nullable=False, default=dict)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    pcap_import = relationship("PcapImportModel", backref="detection_jobs", lazy="joined")
    dataset = relationship("MLDatasetModel", backref="detection_jobs", lazy="joined")
    classifier_model = relationship("MLModelModel", foreign_keys=[classifier_model_id], lazy="joined")
    anomaly_model = relationship("MLModelModel", foreign_keys=[anomaly_model_id], lazy="joined")

    def __repr__(self):
        return f"<DetectionJob(id={self.id}, status={self.status}, flows={self.analyzed_flows}/{self.total_flows}, alerts={self.alerts_generated})>"

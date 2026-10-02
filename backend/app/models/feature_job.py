from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class FeatureJobModel(Base):
    __tablename__ = "feature_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    import_id = Column(Integer, ForeignKey("pcap_imports.id", ondelete="CASCADE"), nullable=True, index=True)
    server_id = Column(Integer, ForeignKey("monitored_servers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # State tracking: queued, processing, completed, failed
    status = Column(String(20), nullable=False, default="queued", index=True)
    schema_version = Column(String(20), nullable=False, default="v1.0.0", index=True)
    
    # Processing metrics
    input_flows = Column(Integer, nullable=False, default=0)
    valid_flows = Column(Integer, nullable=False, default=0)
    invalid_flows = Column(Integer, nullable=False, default=0)
    generated_features = Column(Integer, nullable=False, default=0)
    
    # Quality Report audit trail (JSONB)
    quality_report = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    pcap_import = relationship("PcapImportModel", backref="feature_jobs")
    server = relationship("MonitoredServerModel", backref="feature_jobs", lazy="joined")
    features = relationship("FlowFeatureModel", back_populates="job", cascade="all, delete-orphan")
    datasets = relationship("FeatureDatasetModel", back_populates="job", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FeatureJob(id={self.id}, import_id={self.import_id}, status='{self.status}')>"

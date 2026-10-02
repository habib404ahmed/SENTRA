from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class FlowFeatureModel(Base):
    __tablename__ = "flow_features"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("feature_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    flow_id = Column(Integer, ForeignKey("traffic_flows.id", ondelete="CASCADE"), nullable=False, index=True)
    
    schema_version = Column(String(20), nullable=False, default="v1.0.0", index=True)
    
    # Cleaned, extracted feature values (numeric, normalized, categorized)
    feature_values = Column(JSONB, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    job = relationship("FeatureJobModel", back_populates="features")
    flow = relationship("TrafficFlowModel", backref="features", lazy="joined")

    __table_args__ = (
        Index("ix_flow_features_job_flow", "job_id", "flow_id", unique=True),
    )

    def __repr__(self):
        return f"<FlowFeature(id={self.id}, job_id={self.job_id}, flow_id={self.flow_id})>"

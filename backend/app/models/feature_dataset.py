from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class FeatureDatasetModel(Base):
    __tablename__ = "feature_datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("feature_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    format = Column(String(20), nullable=False)  # csv, parquet
    dataset_type = Column(String(50), nullable=False, default="unlabeled_ml_ready")  # unlabeled_ml_ready, full_analyzed
    
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    row_count = Column(Integer, nullable=False, default=0)
    column_count = Column(Integer, nullable=False, default=0)
    sha256_hash = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    job = relationship("FeatureJobModel", back_populates="datasets")

    def __repr__(self):
        return f"<FeatureDataset(id={self.id}, name='{self.name}', format='{self.format}', rows={self.row_count})>"

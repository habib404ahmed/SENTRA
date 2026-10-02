from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class MLTrainingJobModel(Base):
    __tablename__ = "ml_training_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("ml_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    model_type = Column(String(50), nullable=False)  # "classifier", "anomaly_detector"
    algorithm = Column(String(50), nullable=False)   # "RandomForestClassifier", "IsolationForest"
    hyperparameters = Column(JSONB, nullable=False, default=dict)
    status = Column(String(20), nullable=False, default="queued", index=True)  # queued, training, completed, failed
    output_model_id = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    dataset = relationship("MLDatasetModel", back_populates="training_jobs")

    def __repr__(self):
        return f"<MLTrainingJob(id={self.id}, model_type='{self.model_type}', status='{self.status}')>"

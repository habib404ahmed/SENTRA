from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class MLModelModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    model_type = Column(String(50), nullable=False, index=True)  # classifier, anomaly_detector
    algorithm = Column(String(50), nullable=False)               # RandomForestClassifier, IsolationForest
    version = Column(String(20), nullable=False, default="v1.0.0", index=True)
    feature_schema_version = Column(String(20), nullable=False, default="v1.0.0", index=True)
    dataset_id = Column(Integer, ForeignKey("ml_datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    training_job_id = Column(Integer, ForeignKey("ml_training_jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    
    hyperparameters = Column(JSONB, nullable=False, default=dict)
    feature_names = Column(JSONB, nullable=False, default=list)  # Ordered feature names list
    classes = Column(JSONB, nullable=True)                      # Label classes list
    
    artifact_path = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default="trained", index=True)  # trained, evaluated, archived, failed

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    dataset = relationship("MLDatasetModel", back_populates="models")
    training_job = relationship("MLTrainingJobModel", foreign_keys=[training_job_id])
    evaluations = relationship("MLEvaluationModel", back_populates="model", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MLModel(id={self.id}, name='{self.name}', type='{self.model_type}', version='{self.version}')>"

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class MLEvaluationModel(Base):
    __tablename__ = "ml_evaluations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("ml_datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    
    split_method = Column(String(50), nullable=False, default="stratified_train_test_split")
    test_size = Column(Float, nullable=False, default=0.2)
    test_records = Column(Integer, nullable=False, default=0)
    
    # Factual machine-readable evaluation results
    metrics = Column(JSONB, nullable=False, default=dict)           # accuracy, macro_f1, macro_precision, macro_recall, etc.
    confusion_matrix = Column(JSONB, nullable=True)                 # { "labels": [...], "matrix": [[...]] }
    per_class_metrics = Column(JSONB, nullable=True)                # { "Normal": { "precision": ..., "recall": ... } }
    feature_importances = Column(JSONB, nullable=True)              # [ { "feature": ..., "importance": ... } ]
    
    report_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    model = relationship("MLModelModel", back_populates="evaluations")
    dataset = relationship("MLDatasetModel", foreign_keys=[dataset_id])

    def __repr__(self):
        return f"<MLEvaluation(id={self.id}, model_id={self.model_id}, accuracy={self.metrics.get('accuracy')})>"

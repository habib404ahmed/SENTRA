from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class MLDatasetModel(Base):
    __tablename__ = "ml_datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    source = Column(String(255), nullable=False)
    version = Column(String(50), nullable=False, default="1.0")
    file_path = Column(String(500), nullable=False)
    format = Column(String(20), nullable=False, default="csv")
    feature_schema_version = Column(String(20), nullable=False, default="v1.0.0", index=True)
    label_column = Column(String(100), nullable=False, default="label")
    record_count = Column(Integer, nullable=False, default=0)
    class_count = Column(Integer, nullable=False, default=0)
    classes = Column(JSONB, nullable=False, default=list)  # list of unique class strings
    validation_status = Column(String(20), nullable=False, default="valid", index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    training_jobs = relationship("MLTrainingJobModel", back_populates="dataset", cascade="all, delete-orphan")
    models = relationship("MLModelModel", back_populates="dataset")

    def __repr__(self):
        return f"<MLDataset(id={self.id}, name='{self.name}', records={self.record_count}, classes={self.class_count})>"

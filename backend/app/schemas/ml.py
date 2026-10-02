from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class MLDatasetRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Descriptive dataset name")
    source: str = Field(..., max_length=255, description="Provenance / organization / benchmark source")
    file_path: Optional[str] = Field(None, description="Path to CSV or Parquet file on local system")
    generate_benchmark: Optional[bool] = Field(False, description="If true, generates a standard SENTRA benchmark dataset")
    description: Optional[str] = None


class MLDatasetResponse(BaseModel):
    id: int
    name: str
    source: str
    version: str
    file_path: str
    format: str
    feature_schema_version: str
    label_column: str
    record_count: int
    class_count: int
    classes: List[str]
    validation_status: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MLDatasetListResponse(BaseModel):
    total: int
    items: List[MLDatasetResponse]


class MLTrainingJobCreateRequest(BaseModel):
    dataset_id: int = Field(..., description="ID of registered dataset to train on")
    model_type: str = Field(..., pattern="^(classifier|anomaly_detector)$", description="'classifier' or 'anomaly_detector'")
    algorithm: Optional[str] = Field(None, description="'RandomForestClassifier' or 'IsolationForest'")
    n_estimators: int = Field(default=100, ge=10, le=500, description="Number of decision trees")
    max_depth: Optional[int] = Field(default=15, ge=1, le=50, description="Max tree depth (for classifier)")
    min_samples_split: int = Field(default=2, ge=2, le=20, description="Min samples to split an internal node")
    contamination: float = Field(default=0.05, ge=0.001, le=0.5, description="Expected anomaly proportion (for anomaly detector)")
    class_weight: Optional[str] = Field(default="balanced", description="Class weighting strategy ('balanced' or null)")
    random_state: int = Field(default=42, description="Reproducible random seed")


class MLTrainingJobResponse(BaseModel):
    id: int
    dataset_id: int
    model_type: str
    algorithm: str
    hyperparameters: Dict[str, Any]
    status: str
    output_model_id: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MLTrainingJobListResponse(BaseModel):
    total: int
    items: List[MLTrainingJobResponse]


class MLModelResponse(BaseModel):
    id: int
    name: str
    model_type: str
    algorithm: str
    version: str
    feature_schema_version: str
    dataset_id: Optional[int] = None
    hyperparameters: Dict[str, Any]
    feature_names: List[str]
    classes: Optional[List[str]] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MLModelListResponse(BaseModel):
    total: int
    items: List[MLModelResponse]


class MLEvaluationResponse(BaseModel):
    id: int
    model_id: int
    dataset_id: Optional[int] = None
    split_method: str
    test_size: float
    test_records: int
    metrics: Dict[str, Any]
    confusion_matrix: Optional[Dict[str, Any]] = None
    per_class_metrics: Optional[Dict[str, Any]] = None
    feature_importances: Optional[List[Dict[str, Any]]] = None
    report_summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MLPredictRequest(BaseModel):
    features: Dict[str, Any] = Field(..., description="Flow feature dictionary aligned with SENTRA v1.0.0 schema")


class MLPredictResponse(BaseModel):
    model_type: str
    predicted_class: Optional[str] = None
    confidence: Optional[float] = None
    class_probabilities: Optional[Dict[str, float]] = None
    is_anomaly: Optional[bool] = None
    anomaly_score: Optional[float] = None
    threshold: Optional[float] = None
    interpretation: Optional[str] = None
    model_version: str
    feature_schema_version: str

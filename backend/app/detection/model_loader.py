import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.ml_model import MLModelModel
from app.ml.model_registry import ModelArtifactManager
from app.ml.classifier import SentraThreatClassifier
from app.ml.anomaly_detector import SentraAnomalyDetector

logger = logging.getLogger(__name__)

# In-memory cache for loaded model estimators: model_id -> (model_record, loaded_instance)
_LOADED_MODELS_CACHE = {}
_artifact_manager = ModelArtifactManager()


class ActiveModelPair:
    """
    Holds loaded, verified instances of the classifier and anomaly detector.
    """
    def __init__(
        self,
        classifier: Optional[SentraThreatClassifier],
        classifier_meta: Optional[MLModelModel],
        anomaly_detector: Optional[SentraAnomalyDetector],
        anomaly_meta: Optional[MLModelModel],
    ):
        self.classifier = classifier
        self.classifier_meta = classifier_meta
        self.anomaly_detector = anomaly_detector
        self.anomaly_meta = anomaly_meta

    @property
    def has_classifier(self) -> bool:
        return self.classifier is not None

    @property
    def has_anomaly_detector(self) -> bool:
        return self.anomaly_detector is not None

    @property
    def anomaly_detector_meta(self) -> Optional[MLModelModel]:
        return self.anomaly_meta

    @property
    def is_available(self) -> bool:
        return self.has_classifier or self.has_anomaly_detector


def get_loaded_model(db: Session, model_id: int):
    """
    Loads a model artifact from disk by ID, caching the estimator instance in memory.
    The ORM record is always retrieved within the caller's active db session.
    """
    model_record = db.get(MLModelModel, model_id)
    if not model_record:
        logger.warning(f"Model ID {model_id} not found in database registry.")
        return None, None

    if model_id in _LOADED_MODELS_CACHE:
        return model_record, _LOADED_MODELS_CACHE[model_id]

    try:
        loaded_instance = _artifact_manager.load_artifact(model_record.artifact_path)
        if loaded_instance:
            _LOADED_MODELS_CACHE[model_id] = loaded_instance
        return model_record, loaded_instance
    except Exception as e:
        logger.error(f"Failed to load model #{model_id} from {model_record.artifact_path}: {e}")
        return model_record, None


def resolve_active_models(
    db: Session,
    classifier_id: Optional[int] = None,
    anomaly_id: Optional[int] = None,
) -> ActiveModelPair:
    """
    Resolves and loads the active classifier and anomaly detector.
    If specific IDs are not provided, picks the latest evaluated models.
    """
    # 1. Resolve Classifier
    classifier_inst = None
    classifier_meta = None

    if classifier_id:
        classifier_meta, classifier_inst = get_loaded_model(db, classifier_id)
    else:
        # Pick latest evaluated classifier
        query = (
            select(MLModelModel)
            .where(
                MLModelModel.model_type == "classifier",
                MLModelModel.status == "evaluated",
            )
            .order_by(MLModelModel.id.desc())
        )
        record = db.execute(query).scalars().first()
        if record:
            classifier_meta, classifier_inst = get_loaded_model(db, record.id)

    # 2. Resolve Anomaly Detector
    anomaly_inst = None
    anomaly_meta = None

    if anomaly_id:
        anomaly_meta, anomaly_inst = get_loaded_model(db, anomaly_id)
    else:
        # Pick latest evaluated anomaly detector
        query = (
            select(MLModelModel)
            .where(
                MLModelModel.model_type == "anomaly_detector",
                MLModelModel.status == "evaluated",
            )
            .order_by(MLModelModel.id.desc())
        )
        record = db.execute(query).scalars().first()
        if record:
            anomaly_meta, anomaly_inst = get_loaded_model(db, record.id)

    return ActiveModelPair(
        classifier=classifier_inst,
        classifier_meta=classifier_meta,
        anomaly_detector=anomaly_inst,
        anomaly_meta=anomaly_meta,
    )

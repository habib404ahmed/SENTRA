"""
Prediction and Inference Service for SENTRA ML Models.
Safely formats incoming flow telemetry, handles missing dimensions, and runs inference.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np

from app.features.schemas import SCHEMA_VERSION, FEATURE_DEFINITIONS
from app.ml.classifier import SentraThreatClassifier
from app.ml.anomaly_detector import SentraAnomalyDetector


class ModelPredictor:
    """
    Executes inference against serialized SentraThreatClassifier or SentraAnomalyDetector models.
    """

    MODEL_FEATURES = [f.name for f in FEATURE_DEFINITIONS if f.is_model_feature]

    @classmethod
    def predict(
        cls,
        model_instance: Any,
        model_type: str,
        features: Dict[str, Any],
        model_version: str = "v1.0.0"
    ) -> Dict[str, Any]:
        """
        Executes prediction for a single flow feature vector.
        """
        if not features or not isinstance(features, dict):
            raise ValueError("Input features dictionary cannot be empty.")

        # Build 1-row DataFrame aligned with SCHEMA_VERSION
        row_dict = {}
        for feat_name in cls.MODEL_FEATURES:
            val = features.get(feat_name, 0.0)
            try:
                f_val = float(val) if val is not None else 0.0
                if np.isnan(f_val) or np.isinf(f_val):
                    f_val = 0.0
            except (ValueError, TypeError):
                f_val = 0.0
            row_dict[feat_name] = f_val

        df = pd.DataFrame([row_dict], columns=cls.MODEL_FEATURES)

        if model_type == "classifier":
            if not isinstance(model_instance, SentraThreatClassifier):
                raise TypeError("Model artifact does not match classifier interface.")

            preds, probs = model_instance.predict(df)
            predicted_class = str(preds[0])

            # Class probability distribution
            class_probs = {}
            for idx, c in enumerate(model_instance.classes_):
                class_probs[c] = round(float(probs[0][idx]), 4)

            confidence = round(float(np.max(probs[0])), 4)

            return {
                "model_type": "classifier",
                "predicted_class": predicted_class,
                "confidence": confidence,
                "class_probabilities": class_probs,
                "model_version": model_version,
                "feature_schema_version": SCHEMA_VERSION
            }

        elif model_type == "anomaly_detector":
            if not isinstance(model_instance, SentraAnomalyDetector):
                raise TypeError("Model artifact does not match anomaly detector interface.")

            is_anomaly, scores = model_instance.predict(df)
            raw_score = round(float(scores[0]), 4)

            return {
                "model_type": "anomaly_detector",
                "is_anomaly": bool(is_anomaly[0]),
                "anomaly_score": raw_score,
                "threshold": 0.0,
                "interpretation": "Statistical outlier in unidirectional flow telemetry" if is_anomaly[0] else "Conforms to baseline traffic distribution",
                "model_version": model_version,
                "feature_schema_version": SCHEMA_VERSION
            }

        else:
            raise ValueError(f"Unsupported model type: {model_type}")

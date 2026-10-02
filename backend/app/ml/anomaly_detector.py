"""
Isolation Forest Anomaly Detection Implementation for SENTRA.
Detects statistical deviations in unidirectional flow telemetry without supervised threat signatures.
"""

from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

from app.ml.preprocessing import MLPreprocessor
from app.ml.evaluation import evaluate_anomaly_detector


class SentraAnomalyDetector:
    """
    Isolation Forest unsupervised anomaly detector for identifying zero-day flow anomalies.
    """

    def __init__(
        self,
        n_estimators: int = 100,
        contamination: float = 0.05,
        max_samples: str = "auto",
        random_state: int = 42
    ):
        self.hyperparameters = {
            "n_estimators": n_estimators,
            "contamination": contamination,
            "max_samples": max_samples,
            "random_state": random_state
        }
        self.estimator = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_samples=max_samples,
            random_state=random_state,
            n_jobs=-1
        )
        self.preprocessor = MLPreprocessor()
        self.feature_names_: List[str] = MLPreprocessor.FEATURE_NAMES
        self.classes_: List[str] = ["Normal", "Anomaly"]
        self.threshold_: float = 0.0

    def train_and_evaluate(
        self,
        X: pd.DataFrame,
        y: Optional[pd.Series] = None,
        test_size: float = 0.2
    ) -> Tuple[Dict[str, Any], int]:
        """
        Trains Isolation Forest and evaluates on test partition.
        If ground-truth labels y are present (where 'Normal' is benign and others are anomalous),
        evaluates factual anomaly detection recall, precision, and ROC-AUC.
        """
        if y is not None:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=self.hyperparameters["random_state"]
            )
            # Binary ground-truth: 0 for Normal, 1 for Any Threat
            y_test_binary = (y_test.values != "Normal").astype(int)
        else:
            X_train, X_test = train_test_split(
                X, test_size=test_size, random_state=self.hyperparameters["random_state"]
            )
            y_test_binary = None

        # Fit preprocessor strictly on X_train
        X_train_scaled = self.preprocessor.fit_transform(X_train)
        X_test_scaled = self.preprocessor.transform(X_test)

        # Fit Isolation Forest
        self.estimator.fit(X_train_scaled)

        # Decision function: negative values are outliers, positive are inliers
        # Offset determines threshold (typically 0.0 in decision_function)
        test_scores = self.estimator.decision_function(X_test_scaled)
        test_raw_preds = self.estimator.predict(X_test_scaled)  # -1 = anomaly, 1 = normal
        test_pred_binary = (test_raw_preds == -1).astype(int)

        if y_test_binary is not None:
            eval_result = evaluate_anomaly_detector(y_test_binary, test_pred_binary, test_scores)
        else:
            # Unlabeled evaluation: report score distribution and predicted anomaly count
            anomaly_cnt = int(np.sum(test_pred_binary))
            eval_result = {
                "metrics": {
                    "total_evaluated": len(X_test),
                    "anomalies_detected": anomaly_cnt,
                    "anomaly_rate": round(float(anomaly_cnt) / len(X_test), 4),
                    "score_distribution": {
                        "min": round(float(np.min(test_scores)), 4),
                        "median": round(float(np.median(test_scores)), 4),
                        "max": round(float(np.max(test_scores)), 4),
                    }
                },
                "confusion_matrix": None,
                "report_summary": f"Unlabeled Isolation Forest Evaluation: {anomaly_cnt} anomalies detected in {len(X_test)} flows."
            }

        return eval_result, len(X_test)

    def predict(self, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Inference on new flows.
        Returns: (is_anomaly_bool_array, anomaly_scores_array)
        """
        X_scaled = self.preprocessor.transform(X)
        scores = self.estimator.decision_function(X_scaled)
        preds = self.estimator.predict(X_scaled)
        is_anomaly = (preds == -1)
        return is_anomaly, scores

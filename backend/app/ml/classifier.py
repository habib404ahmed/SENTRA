"""
Random Forest Classifier Implementation for SENTRA Threat Detection.
Provides training, feature importance extraction, serialization, and batch inference.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.ml.preprocessing import MLPreprocessor
from app.ml.evaluation import evaluate_classifier


class SentraThreatClassifier:
    """
    Random Forest multi-class threat classification model.
    """

    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: Optional[int] = 15,
        min_samples_split: int = 2,
        class_weight: Optional[str] = "balanced",
        random_state: int = 42
    ):
        self.hyperparameters = {
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "min_samples_split": min_samples_split,
            "class_weight": class_weight,
            "random_state": random_state
        }
        self.estimator = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            class_weight=class_weight,
            random_state=random_state,
            n_jobs=-1
        )
        self.preprocessor = MLPreprocessor()
        self.classes_: List[str] = []
        self.feature_names_: List[str] = MLPreprocessor.FEATURE_NAMES
        self.feature_importances_: List[Dict[str, Any]] = []

    def train_and_evaluate(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2
    ) -> Tuple[Dict[str, Any], int]:
        """
        Trains model on train partition and evaluates on isolated test partition.
        Prevents data leakage by fitting preprocessor only on X_train.
        """
        # Unique classes
        self.classes_ = sorted(list(y.unique()))
        if len(self.classes_) < 2:
            raise ValueError("Training requires at least 2 distinct classes.")

        # Leakage-free train-test split (stratified by class)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.hyperparameters["random_state"], stratify=y
        )

        # Fit preprocessor strictly on X_train
        X_train_scaled = self.preprocessor.fit_transform(X_train)
        X_test_scaled = self.preprocessor.transform(X_test)

        # Fit Random Forest on training data
        self.estimator.fit(X_train_scaled, y_train.values)

        # Extract MDI Feature Importances
        raw_importances = self.estimator.feature_importances_
        sorted_indices = np.argsort(raw_importances)[::-1]
        self.feature_importances_ = [
            {
                "feature": self.feature_names_[i],
                "importance": round(float(raw_importances[i]), 6)
            }
            for i in sorted_indices
        ]

        # Evaluate strictly on isolated X_test
        y_pred = self.estimator.predict(X_test_scaled)
        eval_result = evaluate_classifier(y_test.values, y_pred, self.classes_)
        eval_result["feature_importances"] = self.feature_importances_

        return eval_result, len(X_test)

    def predict(self, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Inference on new flows. Returns (predicted_classes, probability_matrix).
        """
        X_scaled = self.preprocessor.transform(X)
        preds = self.estimator.predict(X_scaled)
        probs = self.estimator.predict_proba(X_scaled)
        return preds, probs

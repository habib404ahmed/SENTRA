"""
SENTRA Controlled Detection Evaluator (Phase 7).

Evaluates active models and detection policy rules against labeled benchmark datasets.
Computes factual metrics, performs false-positive / false-negative forensic analysis,
and tests threshold sensitivity without synthetic inflation.
"""

import os
import tempfile
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from app.ml.dataset_loader import generate_benchmark_dataset, DatasetLoader
from app.ml.classifier import SentraThreatClassifier
from app.ml.anomaly_detector import SentraAnomalyDetector
from app.ml.evaluation import evaluate_classifier, evaluate_anomaly_detector
from app.detection.policy import DetectionPolicyEngine, POLICY_VERSION
from app.features.schemas import FEATURE_DEFINITIONS, SCHEMA_VERSION

logger = logging.getLogger(__name__)


class ControlledDetectionEvaluator:
    """
    Executes controlled, reproducible evaluation of threat classifiers and
    anomaly detectors on standardized, leakage-free benchmark datasets.
    """

    def __init__(
        self,
        classifier: Optional[SentraThreatClassifier] = None,
        anomaly_detector: Optional[SentraAnomalyDetector] = None,
        policy_engine: Optional[DetectionPolicyEngine] = None,
        random_state: int = 42
    ):
        self.classifier = classifier
        self.anomaly_detector = anomaly_detector
        self.policy_engine = policy_engine or DetectionPolicyEngine()
        self.random_state = random_state

    def load_or_generate_evaluation_dataset(
        self,
        sample_count: int = 1000
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Generates or loads a labeled benchmark evaluation dataset with known ground truth.
        """
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            generate_benchmark_dataset(tmp_path, n_samples=sample_count)
            X, y, _ = DatasetLoader.load(tmp_path)
            return X, y
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def run_full_evaluation(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.25
    ) -> Dict[str, Any]:
        """
        Runs comprehensive evaluation including classifier metrics, anomaly detection metrics,
        false positive/negative analysis, and threshold sensitivity curves.
        """
        # 1. Leakage-free train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )

        classes = sorted(list(y.unique()))
        
        # 2. Train or use existing models
        if self.classifier is None:
            self.classifier = SentraThreatClassifier(random_state=self.random_state)
            self.classifier.train_and_evaluate(X_train, y_train, test_size=0.1)
        
        if self.anomaly_detector is None:
            self.anomaly_detector = SentraAnomalyDetector(random_state=self.random_state)
            self.anomaly_detector.train_and_evaluate(X_train, y_train, test_size=0.1)

        # 3. Supervised Classification Evaluation on X_test
        y_test_pred, y_test_probs = self.classifier.predict(X_test)
        clf_metrics = evaluate_classifier(y_test.values, y_test_pred, classes)

        # 4. Anomaly Detector Evaluation on X_test
        # Binary: 0 for Normal, 1 for Anomaly
        y_test_binary = (y_test.values != "Normal").astype(int)
        is_anom, anomaly_scores = self.anomaly_detector.predict(X_test)
        anom_pred_binary = is_anom.astype(int)
        anom_metrics = evaluate_anomaly_detector(y_test_binary, anom_pred_binary, anomaly_scores)

        # 5. False Positive & False Negative Analysis
        fp_fn_analysis = self._analyze_errors(
            X_test, y_test.values, y_test_pred, y_test_probs, is_anom, anomaly_scores, classes
        )

        # 6. Threshold Sensitivity Analysis
        threshold_curve = self._evaluate_threshold_sensitivity(
            y_test.values, y_test_probs, classes
        )

        return {
            "evaluation_metadata": {
                "dataset_name": "SENTRA-Benchmark-Unidirectional-v1",
                "schema_version": SCHEMA_VERSION,
                "policy_version": POLICY_VERSION,
                "total_samples": len(X),
                "train_samples": len(X_train),
                "test_samples": len(X_test),
                "random_state": self.random_state,
                "classes": classes,
                "class_distribution": y_test.value_counts().to_dict()
            },
            "classifier_evaluation": clf_metrics,
            "anomaly_detector_evaluation": anom_metrics,
            "error_analysis": fp_fn_analysis,
            "threshold_sensitivity": threshold_curve
        }

    def _analyze_errors(
        self,
        X_test: pd.DataFrame,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_probs: np.ndarray,
        is_anom: np.ndarray,
        anomaly_scores: np.ndarray,
        classes: List[str]
    ) -> Dict[str, Any]:
        """
        Identifies and forensic extracts false positives and false negatives.
        """
        false_positives = []
        false_negatives = []

        for idx in range(len(y_true)):
            actual = y_true[idx]
            pred = y_pred[idx]
            prob = float(np.max(y_probs[idx]))
            iso_score = float(anomaly_scores[idx])

            # False Positive: Actual is Normal, but predicted as Attack
            if actual == "Normal" and pred != "Normal":
                if len(false_positives) < 5:  # Sample up to 5
                    false_positives.append({
                        "sample_index": idx,
                        "ground_truth": actual,
                        "predicted_threat": pred,
                        "confidence": round(prob, 4),
                        "anomaly_score": round(iso_score, 4),
                        "key_features": {
                            "packet_count": float(X_test.iloc[idx].get("packet_count", 0)),
                            "byte_count": float(X_test.iloc[idx].get("byte_count", 0)),
                            "duration": float(X_test.iloc[idx].get("duration", 0)),
                            "packets_per_second": float(X_test.iloc[idx].get("packets_per_second", 0)),
                            "syn_ratio": float(X_test.iloc[idx].get("syn_ratio", 0)),
                        },
                        "triage_implication": "Benign flow misclassified as attack; causes analyst triage overhead."
                    })

            # False Negative: Actual is Attack, but predicted as Normal
            elif actual != "Normal" and pred == "Normal":
                if len(false_negatives) < 5:  # Sample up to 5
                    false_negatives.append({
                        "sample_index": idx,
                        "ground_truth": actual,
                        "predicted_threat": pred,
                        "confidence": round(prob, 4),
                        "anomaly_score": round(iso_score, 4),
                        "key_features": {
                            "packet_count": float(X_test.iloc[idx].get("packet_count", 0)),
                            "byte_count": float(X_test.iloc[idx].get("byte_count", 0)),
                            "duration": float(X_test.iloc[idx].get("duration", 0)),
                            "packets_per_second": float(X_test.iloc[idx].get("packets_per_second", 0)),
                            "syn_ratio": float(X_test.iloc[idx].get("syn_ratio", 0)),
                        },
                        "triage_implication": "Malicious traffic evaded supervised model; reliance on anomaly detector."
                    })

        total_fp = int(np.sum((y_true == "Normal") & (y_pred != "Normal")))
        total_fn = int(np.sum((y_true != "Normal") & (y_pred == "Normal")))
        total_normal = int(np.sum(y_true == "Normal"))
        total_attack = int(np.sum(y_true != "Normal"))

        return {
            "summary": {
                "total_test_flows": len(y_true),
                "total_normal_flows": total_normal,
                "total_attack_flows": total_attack,
                "false_positive_count": total_fp,
                "false_positive_rate": round(float(total_fp) / max(1, total_normal), 4),
                "false_negative_count": total_fn,
                "false_negative_rate": round(float(total_fn) / max(1, total_attack), 4),
            },
            "false_positive_examples": false_positives,
            "false_negative_examples": false_negatives
        }

    def _evaluate_threshold_sensitivity(
        self,
        y_true: np.ndarray,
        y_probs: np.ndarray,
        classes: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Calculates precision, recall, and false positive rate across a range of confidence thresholds.
        """
        thresholds = [0.40, 0.50, 0.55, 0.65, 0.75, 0.85]
        results = []

        normal_idx = classes.index("Normal") if "Normal" in classes else -1

        for thresh in thresholds:
            # Apply threshold: if max prob < thresh, predict Inconclusive / Normal
            filtered_preds = []
            for prob_row in y_probs:
                max_idx = int(np.argmax(prob_row))
                if prob_row[max_idx] >= thresh:
                    filtered_preds.append(classes[max_idx])
                else:
                    filtered_preds.append("Normal")  # Conservative fallback

            filtered_preds = np.array(filtered_preds)

            # Attack vs Normal metrics
            actual_attack = (y_true != "Normal")
            pred_attack = (filtered_preds != "Normal")

            tp = np.sum(actual_attack & pred_attack)
            fp = np.sum((~actual_attack) & pred_attack)
            fn = np.sum(actual_attack & (~pred_attack))
            tn = np.sum((~actual_attack) & (~pred_attack))

            precision = float(tp / max(1, (tp + fp)))
            recall = float(tp / max(1, (tp + fn)))
            f1 = float(2 * (precision * recall) / max(1e-6, (precision + recall)))
            fpr = float(fp / max(1, (fp + tn)))

            results.append({
                "confidence_threshold": thresh,
                "attack_precision": round(precision, 4),
                "attack_recall": round(recall, 4),
                "attack_f1": round(f1, 4),
                "false_positive_rate": round(fpr, 4),
                "flagged_attacks_count": int(np.sum(pred_attack))
            })

        return results

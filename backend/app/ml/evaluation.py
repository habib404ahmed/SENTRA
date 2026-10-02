"""
Evaluation and Metrics Generation for SENTRA Threat Classifiers and Anomaly Detectors.
Calculates strict, un-hallucinated metrics (Precision, Recall, F1, Confusion Matrix, FPR).
"""

from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    roc_auc_score
)


def evaluate_classifier(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    classes: List[str]
) -> Dict[str, Any]:
    """
    Evaluates supervised multi-class threat classification without hallucinated metrics.
    """
    acc = float(accuracy_score(y_true, y_pred))

    # Macro & weighted averages
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    # Per-class metrics
    per_class_p, per_class_r, per_class_f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=classes, zero_division=0
    )

    per_class_dict = {}
    for idx, cls_name in enumerate(classes):
        per_class_dict[cls_name] = {
            "precision": round(float(per_class_p[idx]), 4),
            "recall": round(float(per_class_r[idx]), 4),
            "f1_score": round(float(per_class_f1[idx]), 4),
            "support": int(support[idx])
        }

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=classes)

    # False Positive Rate (FPR) on Normal class:
    # A False Positive occurs when actual is Normal, but prediction is Malicious
    normal_fpr = 0.0
    if "Normal" in classes:
        normal_idx = classes.index("Normal")
        actual_normal_mask = (y_true == "Normal")
        total_normal = int(np.sum(actual_normal_mask))
        if total_normal > 0:
            false_positives = int(np.sum((y_true == "Normal") & (y_pred != "Normal")))
            normal_fpr = round(float(false_positives) / float(total_normal), 4)

    metrics = {
        "accuracy": round(acc, 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_precision": round(float(weighted_p), 4),
        "weighted_recall": round(float(weighted_r), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "normal_false_positive_rate": normal_fpr
    }

    report_summary = (
        f"Supervised Threat Classification Evaluation:\n"
        f"- Test Accuracy: {metrics['accuracy'] * 100:.2f}%\n"
        f"- Macro F1-Score: {metrics['macro_f1']:.4f}\n"
        f"- Macro Precision: {metrics['macro_precision']:.4f} | Recall: {metrics['macro_recall']:.4f}\n"
        f"- Normal Class False Positive Rate: {normal_fpr * 100:.2f}%\n"
        f"- Evaluated across {len(classes)} threat classes: {', '.join(classes)}"
    )

    return {
        "metrics": metrics,
        "per_class_metrics": per_class_dict,
        "confusion_matrix": {
            "labels": classes,
            "matrix": cm.tolist()
        },
        "report_summary": report_summary
    }


def evaluate_anomaly_detector(
    y_true_binary: np.ndarray,  # 0 for Normal, 1 for Anomaly
    y_pred_binary: np.ndarray,  # 0 for Normal, 1 for Anomaly
    scores: np.ndarray          # Decision function / anomaly scores
) -> Dict[str, Any]:
    """
    Evaluates unsupervised/semi-supervised Isolation Forest anomaly detection.
    """
    acc = float(accuracy_score(y_true_binary, y_pred_binary))
    p, r, f1, _ = precision_recall_fscore_support(y_true_binary, y_pred_binary, average="binary", zero_division=0)

    # False Positive Rate: Actual 0 (Normal) classified as 1 (Anomaly)
    actual_normal = np.sum(y_true_binary == 0)
    fp = np.sum((y_true_binary == 0) & (y_pred_binary == 1))
    fpr = float(fp / max(1, actual_normal))

    # ROC-AUC if both classes present
    roc_auc = None
    if len(np.unique(y_true_binary)) > 1:
        try:
            # Note: lower scores in IsolationForest indicate anomalies, so invert for ROC-AUC
            roc_auc = round(float(roc_auc_score(y_true_binary, -scores)), 4)
        except Exception:
            roc_auc = None

    score_percentiles = {
        "min": round(float(np.min(scores)), 4),
        "p25": round(float(np.percentile(scores, 25)), 4),
        "median": round(float(np.median(scores)), 4),
        "p75": round(float(np.percentile(scores, 75)), 4),
        "max": round(float(np.max(scores)), 4),
    }

    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(float(p), 4),
        "recall": round(float(r), 4),
        "f1_score": round(float(f1), 4),
        "false_positive_rate": round(fpr, 4),
        "roc_auc": roc_auc,
        "score_distribution": score_percentiles
    }

    report_summary = (
        f"Isolation Forest Anomaly Detection Evaluation:\n"
        f"- Anomaly F1-Score: {metrics['f1_score']:.4f}\n"
        f"- Precision: {metrics['precision']:.4f} | Recall: {metrics['recall']:.4f}\n"
        f"- False Positive Rate: {fpr * 100:.2f}%\n"
        f"- ROC-AUC: {roc_auc if roc_auc is not None else 'N/A'}\n"
        f"- Score Distribution Median: {score_percentiles['median']}"
    )

    cm = confusion_matrix(y_true_binary, y_pred_binary, labels=[0, 1])

    return {
        "metrics": metrics,
        "confusion_matrix": {
            "labels": ["Normal", "Anomaly"],
            "matrix": cm.tolist()
        },
        "report_summary": report_summary
    }

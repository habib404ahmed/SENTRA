"""
SENTRA Evaluation Report Generator (Phase 7).

Generates machine-readable JSON and human-readable Markdown evaluation reports
with tables, confusion matrix formatting, error analysis, and methodology notes.
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, Any


def save_evaluation_report(
    eval_data: Dict[str, Any],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """
    Saves JSON and Markdown reports to the specified directory.
    Returns a dict with paths to the created files.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    json_path = os.path.join(output_dir, "detection_evaluation_report.json")
    md_path = os.path.join(output_dir, "detection_evaluation_report.md")

    # 1. Save JSON report
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(eval_data, f, indent=2)

    # 2. Generate Markdown report
    md_content = generate_markdown_report(eval_data)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return {
        "json_report": os.path.abspath(json_path),
        "markdown_report": os.path.abspath(md_path)
    }


def generate_markdown_report(data: Dict[str, Any]) -> str:
    """
    Renders structured evaluation data into professional Markdown.
    """
    meta = data.get("evaluation_metadata", {})
    clf = data.get("classifier_evaluation", {})
    clf_metrics = clf.get("metrics", {})
    per_class = clf.get("per_class_metrics", {})
    cm = clf.get("confusion_matrix", {})
    anom = data.get("anomaly_detector_evaluation", {})
    anom_metrics = anom.get("metrics", {})
    errs = data.get("error_analysis", {})
    err_summary = errs.get("summary", {})
    curves = data.get("threshold_sensitivity", [])

    lines = [
        "# SENTRA — Controlled Detection Evaluation Report",
        "",
        "> **Smart India Hackathon 2026 — Problem Statement 26145**  ",
        f"> **Evaluation Timestamp:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
        f"> **Dataset:** `{meta.get('dataset_name')}` ({meta.get('total_samples', 0)} total samples)  ",
        f"> **Feature Schema:** `{meta.get('schema_version')}` | **Policy Version:** `{meta.get('policy_version')}`  ",
        "",
        "---",
        "",
        "## 1. Executive Summary & Headline Metrics",
        "",
        "| Evaluation Metric | Random Forest Classifier | Isolation Forest Anomaly Detector |",
        "|---|---|---|",
        f"| **Overall Accuracy** | `{clf_metrics.get('accuracy', 0.0) * 100:.2f}%` | `{anom_metrics.get('accuracy', 0.0) * 100:.2f}%` |",
        f"| **Macro F1-Score** | `{clf_metrics.get('macro_f1', 0.0):.4f}` | `{anom_metrics.get('f1_score', 0.0):.4f}` (binary) |",
        f"| **Macro Precision** | `{clf_metrics.get('macro_precision', 0.0):.4f}` | `{anom_metrics.get('precision', 0.0):.4f}` |",
        f"| **Macro Recall** | `{clf_metrics.get('macro_recall', 0.0):.4f}` | `{anom_metrics.get('recall', 0.0):.4f}` |",
        f"| **Normal False Positive Rate** | `{clf_metrics.get('normal_false_positive_rate', 0.0) * 100:.2f}%` | `{anom_metrics.get('false_positive_rate', 0.0) * 100:.2f}%` |",
        f"| **ROC-AUC** | N/A (Multi-class) | `{anom_metrics.get('roc_auc', 'N/A')}` |",
        "",
        "---",
        "",
        "## 2. Supervised Threat Classifier Breakdown",
        "",
        "### Per-Class Performance on Test Partition",
        "| Threat Class | Precision | Recall | F1-Score | Test Support |",
        "|---|---|---|---|---|"
    ]

    for cls_name, pcm in per_class.items():
        lines.append(
            f"| **{cls_name}** | {pcm.get('precision', 0.0):.4f} | {pcm.get('recall', 0.0):.4f} | "
            f"{pcm.get('f1_score', 0.0):.4f} | {pcm.get('support', 0)} |"
        )

    lines.extend([
        "",
        "### Confusion Matrix",
        ""
    ])

    # Render confusion matrix table
    labels = cm.get("labels", [])
    matrix = cm.get("matrix", [])
    if labels and matrix:
        header = "| Actual \\ Predicted | " + " | ".join(labels) + " |"
        separator = "|---|" + "|".join(["---" for _ in labels]) + "|"
        lines.append(header)
        lines.append(separator)
        for i, row in enumerate(matrix):
            row_str = " | ".join(str(val) for val in row)
            lines.append(f"| **{labels[i]}** | {row_str} |")

    lines.extend([
        "",
        "---",
        "",
        "## 3. False-Positive and False-Negative Forensic Analysis",
        "",
        f"- **Total Holdout Test Flows:** {err_summary.get('total_test_flows', 0)}",
        f"- **Benign (Normal) Flows:** {err_summary.get('total_normal_flows', 0)}",
        f"- **Malicious Attack Flows:** {err_summary.get('total_attack_flows', 0)}",
        f"- **False Positive Count:** {err_summary.get('false_positive_count', 0)} (Rate: `{err_summary.get('false_positive_rate', 0.0) * 100:.2f}%`)",
        f"- **False Negative Count:** {err_summary.get('false_negative_count', 0)} (Rate: `{err_summary.get('false_negative_rate', 0.0) * 100:.2f}%`)",
        "",
        "### Sample False-Positive Case Review"
    ])

    fp_samples = errs.get("false_positive_examples", [])
    if fp_samples:
        for idx, fp in enumerate(fp_samples[:3], 1):
            kf = fp.get("key_features", {})
            lines.append(
                f"**Case FP-{idx}:** Ground Truth: `{fp.get('ground_truth')}` $\\to$ Predicted: `{fp.get('predicted_threat')}` "
                f"(Confidence: `{fp.get('confidence')}`, Anomaly Score: `{fp.get('anomaly_score')}`)\n"
                f"- Telemetry: Packets: `{kf.get('packet_count')}`, PPS: `{kf.get('packets_per_second')}`, SYN Ratio: `{kf.get('syn_ratio')}`\n"
                f"- Triage Impact: {fp.get('triage_implication')}\n"
            )
    else:
        lines.append("No false positive errors detected on holdout test partition.")

    lines.extend([
        "### Sample False-Negative Case Review"
    ])

    fn_samples = errs.get("false_negative_examples", [])
    if fn_samples:
        for idx, fn in enumerate(fn_samples[:3], 1):
            kf = fn.get("key_features", {})
            lines.append(
                f"**Case FN-{idx}:** Ground Truth: `{fn.get('ground_truth')}` $\\to$ Predicted: `{fn.get('predicted_threat')}` "
                f"(Confidence: `{fn.get('confidence')}`, Anomaly Score: `{fn.get('anomaly_score')}`)\n"
                f"- Telemetry: Packets: `{kf.get('packet_count')}`, PPS: `{kf.get('packets_per_second')}`, SYN Ratio: `{kf.get('syn_ratio')}`\n"
                f"- Triage Impact: {fn.get('triage_implication')}\n"
            )
    else:
        lines.append("No false negative errors detected on holdout test partition.")

    lines.extend([
        "",
        "---",
        "",
        "## 4. Confidence Threshold Sensitivity",
        "",
        "The impact of adjusting the supervised decision policy threshold ($\tau$):",
        "",
        "| Confidence Threshold | Precision (Attacks) | Recall (Attacks) | F1-Score | False Positive Rate | Flagged Attacks |",
        "|---|---|---|---|---|---|"
    ])

    for crv in curves:
        lines.append(
            f"| `{crv.get('confidence_threshold'):.2f}` | {crv.get('attack_precision'):.4f} | "
            f"{crv.get('attack_recall'):.4f} | {crv.get('attack_f1'):.4f} | "
            f"{crv.get('false_positive_rate') * 100:.2f}% | {crv.get('flagged_attacks_count')} |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 5. Scientific & Forensic Integrity Notes",
        "",
        "1. **No Data Leakage:** Preprocessing scalers (StandardScaler) are fitted exclusively on `X_train` and applied strictly out-of-sample on `X_test`.",
        "2. **Uncalibrated Model Scores:** Random Forest vote shares are reported as pattern similarity scores rather than true posterior probabilities.",
        "3. **Zero-Day Bounds:** The supervised model is bounded by its training taxonomy; novel attacks without signature overlap are surfaced via the unsupervised Isolation Forest.",
        "4. **Unidirectional Diode Constraints:** All features are extracted solely from forward packets without assuming return ACKs or round-trip handshakes."
    ])

    return "\n".join(lines)

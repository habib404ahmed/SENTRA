"""
SENTRA Controlled Detection Evaluation Runner (Phase 7).

Usage:
    python scripts/run_evaluation.py [--samples N] [--output-dir DIR]
"""

import os
import sys
import argparse

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.evaluation.evaluator import ControlledDetectionEvaluator
from app.evaluation.report_generator import save_evaluation_report


def main():
    parser = argparse.ArgumentParser(description="Run controlled detection evaluation on benchmark dataset.")
    parser.add_argument("--samples", type=int, default=1200, help="Number of benchmark samples to evaluate.")
    parser.add_argument("--output-dir", type=str, default="reports", help="Directory to save JSON and Markdown reports.")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed.")
    args = parser.parse_args()

    print("================================================================================")
    print("  SENTRA — Controlled Detection Evaluation & Forensics Runner (SIH-26145)        ")
    print("================================================================================")
    print(f"Generating benchmark dataset with {args.samples} samples (Seed: {args.seed})...")

    evaluator = ControlledDetectionEvaluator(random_state=args.seed)
    X, y = evaluator.load_or_generate_evaluation_dataset(sample_count=args.samples)
    print(f"Dataset generated: {len(X)} rows x {len(X.columns)} features. Classes: {list(y.unique())}")

    print("Running multi-model training and holdout evaluation...")
    results = evaluator.run_full_evaluation(X, y, test_size=0.25)

    clf_metrics = results["classifier_evaluation"]["metrics"]
    anom_metrics = results["anomaly_detector_evaluation"]["metrics"]
    err_summary = results["error_analysis"]["summary"]

    print("\n--- Evaluation Summary ---")
    print(f"  Random Forest Accuracy:       {clf_metrics['accuracy'] * 100:.2f}%")
    print(f"  Random Forest Macro F1:       {clf_metrics['macro_f1']:.4f}")
    print(f"  Normal False Positive Rate:   {clf_metrics['normal_false_positive_rate'] * 100:.2f}%")
    print(f"  Isolation Forest Anomaly F1:  {anom_metrics['f1_score']:.4f}")
    print(f"  Isolation Forest ROC-AUC:     {anom_metrics.get('roc_auc', 'N/A')}")
    print(f"  False Positives on Test Set:  {err_summary['false_positive_count']} / {err_summary['total_normal_flows']}")
    print(f"  False Negatives on Test Set:  {err_summary['false_negative_count']} / {err_summary['total_attack_flows']}")

    target_dir = os.path.join(backend_dir, args.output_dir)
    saved = save_evaluation_report(results, output_dir=target_dir)

    print(f"\nMachine-readable report saved: {saved['json_report']}")
    print(f"Markdown forensic report saved:  {saved['markdown_report']}")
    print("================================================================================")


if __name__ == "__main__":
    main()

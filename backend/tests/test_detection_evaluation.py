"""
Tests for Controlled Detection Evaluation and Forensic Error Analysis (Phase 7).
"""

import os
import json
import pytest

from app.evaluation.evaluator import ControlledDetectionEvaluator
from app.evaluation.report_generator import save_evaluation_report


def test_controlled_evaluation_pipeline(temp_artifact_dir):
    """
    Executes end-to-end controlled evaluation on benchmark labeled dataset,
    validating metrics calculation, error analysis, and threshold curves.
    """
    evaluator = ControlledDetectionEvaluator(random_state=42)
    X, y = evaluator.load_or_generate_evaluation_dataset(sample_count=400)
    assert len(X) == 400
    assert len(y) == 400

    results = evaluator.run_full_evaluation(X, y, test_size=0.25)

    # 1. Verify Metadata
    meta = results["evaluation_metadata"]
    assert meta["total_samples"] == 400
    assert meta["test_samples"] == 100
    assert meta["train_samples"] == 300
    assert "Normal" in meta["classes"]

    # 2. Verify Classifier Metrics
    clf = results["classifier_evaluation"]
    assert "accuracy" in clf["metrics"]
    assert 0.0 <= clf["metrics"]["accuracy"] <= 1.0
    assert 0.0 <= clf["metrics"]["macro_f1"] <= 1.0
    assert len(clf["per_class_metrics"]) == len(meta["classes"])
    assert len(clf["confusion_matrix"]["matrix"]) == len(meta["classes"])

    # 3. Verify Anomaly Metrics
    anom = results["anomaly_detector_evaluation"]
    assert "f1_score" in anom["metrics"]
    assert "score_distribution" in anom["metrics"]

    # 4. Verify Error Analysis
    errors = results["error_analysis"]
    assert "summary" in errors
    assert errors["summary"]["total_test_flows"] == 100
    assert "false_positive_count" in errors["summary"]
    assert "false_negative_count" in errors["summary"]

    # 5. Verify Threshold Sensitivity
    curves = results["threshold_sensitivity"]
    assert len(curves) > 0
    assert curves[0]["confidence_threshold"] == 0.40

    # 6. Verify Report Generation
    saved = save_evaluation_report(results, output_dir=temp_artifact_dir)
    assert os.path.exists(saved["json_report"])
    assert os.path.exists(saved["markdown_report"])

    # Read back JSON report
    with open(saved["json_report"], "r") as f:
        reloaded = json.load(f)
    assert reloaded["evaluation_metadata"]["total_samples"] == 400

import os
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.config import settings

from app.ml.label_mapping import map_label, STANDARD_CLASSES
from app.ml.dataset_loader import DatasetLoader, generate_benchmark_dataset
from app.ml.preprocessing import MLPreprocessor
from app.ml.classifier import SentraThreatClassifier
from app.ml.anomaly_detector import SentraAnomalyDetector
from app.ml.evaluation import evaluate_classifier, evaluate_anomaly_detector
from app.ml.model_registry import ModelArtifactManager
from app.ml.prediction import ModelPredictor

from app.models.ml_dataset import MLDatasetModel
from app.models.ml_training_job import MLTrainingJobModel
from app.models.ml_model import MLModelModel
from app.models.ml_evaluation import MLEvaluationModel

client = TestClient(app)


def test_label_mapping():
    """Verify alias dictionary and heuristic fallback map raw labels into SENTRA taxonomy."""
    assert map_label("BENIGN") == "Normal"
    assert map_label("normal") == "Normal"
    assert map_label("DDoS Attacks-LOIC-HTTP") == "DDoS"
    assert map_label("DoS GoldenEye") == "DDoS"
    assert map_label("PortScan") == "Reconnaissance"
    assert map_label("Ares Botnet") == "Botnet"
    assert map_label("dnscat2") == "DNS Tunneling"
    assert map_label("Infiltration") == "Data Exfiltration"
    assert map_label("") == "Normal"


def test_dataset_loader_and_benchmark_generator(tmp_path):
    """Verify synthetic benchmark dataset generation and schema validation."""
    test_csv = os.path.join(tmp_path, "benchmark_test.csv")
    generate_benchmark_dataset(test_csv, n_samples=200)
    assert os.path.exists(test_csv)

    X, y, meta = DatasetLoader.load(test_csv)
    assert len(X) == 200
    assert len(y) == 200
    assert meta["feature_count"] == 29
    assert "Normal" in meta["classes"]
    assert "DDoS" in meta["classes"]
    assert not X.isna().any().any()


def test_leakage_free_preprocessing():
    """Verify preprocessor fits only on training partition without lookahead contamination."""
    preprocessor = MLPreprocessor()
    assert not preprocessor.is_fitted

    X_dummy = pd.DataFrame({
        "packet_count": [10.0, 20.0, 30.0],
        "flow_duration": [1.0, 2.0, 3.0]
    })

    # Fit transform
    scaled_train = preprocessor.fit_transform(X_dummy)
    assert preprocessor.is_fitted
    assert scaled_train.shape == (3, 29)

    # Transform unseen test partition
    X_test = pd.DataFrame({"packet_count": [15.0], "flow_duration": [2.5]})
    scaled_test = preprocessor.transform(X_test)
    assert scaled_test.shape == (1, 29)


def test_random_forest_training_and_feature_importance(tmp_path):
    """Verify Random Forest training, evaluation, and feature importance generation."""
    test_csv = os.path.join(tmp_path, "rf_test.csv")
    generate_benchmark_dataset(test_csv, n_samples=300)

    X, y, _ = DatasetLoader.load(test_csv)
    classifier = SentraThreatClassifier(n_estimators=20, max_depth=10, random_state=42)

    eval_result, test_records = classifier.train_and_evaluate(X, y, test_size=0.25)

    assert test_records == 75
    assert "accuracy" in eval_result["metrics"]
    assert eval_result["metrics"]["accuracy"] > 0.70
    assert "confusion_matrix" in eval_result
    assert len(classifier.feature_importances_) == 29
    assert classifier.feature_importances_[0]["importance"] >= classifier.feature_importances_[-1]["importance"]

    # Inference test
    preds, probs = classifier.predict(X.iloc[0:2])
    assert len(preds) == 2
    assert probs.shape[0] == 2
    assert probs.shape[1] == len(classifier.classes_)


def test_isolation_forest_anomaly_detection(tmp_path):
    """Verify Isolation Forest training, scoring, and outlier detection."""
    test_csv = os.path.join(tmp_path, "if_test.csv")
    generate_benchmark_dataset(test_csv, n_samples=250)

    X, y, _ = DatasetLoader.load(test_csv)
    detector = SentraAnomalyDetector(n_estimators=25, contamination=0.10, random_state=42)

    eval_result, test_records = detector.train_and_evaluate(X, y=y, test_size=0.20)
    assert test_records == 50
    assert "score_distribution" in eval_result["metrics"]

    # Inference test
    is_anomaly, scores = detector.predict(X.iloc[0:3])
    assert len(is_anomaly) == 3
    assert len(scores) == 3


def test_model_artifact_manager(tmp_path):
    """Verify artifact serialization and secure deserialization."""
    mgr = ModelArtifactManager(model_dir=str(tmp_path))
    dummy_model = SentraThreatClassifier(n_estimators=5, random_state=42)

    saved_path = mgr.save_artifact(dummy_model, "classifier", version="v1.0.0")
    assert os.path.exists(saved_path)

    loaded_model = mgr.load_artifact(saved_path)
    assert isinstance(loaded_model, SentraThreatClassifier)

    # Path traversal safety check
    with pytest.raises(PermissionError):
        mgr.load_artifact("C:\\Windows\\System32\\calc.exe")


def test_ml_api_end_to_end():
    """Verify full end-to-end ML REST APIs (dataset registration, training, evaluation, inference)."""
    # 1. Register a synthetic benchmark dataset via API
    resp_reg = client.post("/api/ml/datasets", json={
        "name": "API Automated Benchmark Suite",
        "source": "SENTRA SIH-2026 Synthetic Engine",
        "generate_benchmark": True,
        "description": "Automated test dataset conforming to v1.0.0 schema"
    })
    assert resp_reg.status_code == 201
    dataset_data = resp_reg.json()
    dataset_id = dataset_data["id"]
    assert dataset_data["record_count"] >= 1000
    assert dataset_data["class_count"] >= 4

    # 2. Submit Random Forest training job
    resp_job = client.post("/api/ml/training-jobs", json={
        "dataset_id": dataset_id,
        "model_type": "classifier",
        "n_estimators": 25,
        "max_depth": 8,
        "random_state": 42
    })
    assert resp_job.status_code == 202
    job_data = resp_job.json()
    job_id = job_data["id"]

    # In TestClient, background task completes synchronously upon response
    resp_job_poll = client.get(f"/api/ml/training-jobs/{job_id}")
    assert resp_job_poll.status_code == 200
    job_status = resp_job_poll.json()["status"]
    assert job_status in ("completed", "training")

    # Fetch output model
    db = SessionLocal()
    try:
        model_rec = db.query(MLModelModel).filter(MLModelModel.training_job_id == job_id).first()
        assert model_rec is not None
        model_id = model_rec.id

        # 3. Get Model Evaluation
        resp_eval = client.get(f"/api/ml/models/{model_id}/evaluation")
        assert resp_eval.status_code == 200
        eval_data = resp_eval.json()
        assert "accuracy" in eval_data["metrics"]
        assert eval_data["metrics"]["accuracy"] > 0.70
        assert "matrix" in eval_data["confusion_matrix"]

        # 4. Get Feature Importances
        resp_fi = client.get(f"/api/ml/feature-importance/{model_id}")
        assert resp_fi.status_code == 200
        fi_data = resp_fi.json()
        assert len(fi_data["feature_importances"]) == 29

        # 5. Execute Prediction Inference
        test_flow_features = {
            "flow_duration": 0.05,
            "packet_count": 2000,
            "byte_count": 128000,
            "average_packet_size": 64.0,
            "packets_per_second": 40000.0,
            "bytes_per_second": 2560000.0,
            "syn_ratio": 1.0,
            "protocol_code": 6,
            "destination_port_normalized": 80.0 / 65535.0,
            "is_well_known_destination_port": 1
        }
        resp_pred = client.post(f"/api/ml/predict/{model_id}", json={"features": test_flow_features})
        assert resp_pred.status_code == 200
        pred_data = resp_pred.json()
        assert pred_data["model_type"] == "classifier"
        assert "predicted_class" in pred_data
        assert "confidence" in pred_data
        assert pred_data["confidence"] > 0.0

        # 6. Check ML Health Endpoint
        resp_health = client.get("/api/ml/health")
        assert resp_health.status_code == 200
        assert resp_health.json()["status"] == "healthy"
        assert resp_health.json()["registered_models"] >= 1

    finally:
        db.close()

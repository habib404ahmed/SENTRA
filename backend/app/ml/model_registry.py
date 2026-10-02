"""
Model Registry and Artifact Storage Manager for SENTRA.
Safely saves, versions, and loads trained machine learning artifacts (.joblib).
"""

import os
import uuid
from typing import Any, Tuple, Optional
import joblib

from app.config import settings
from app.features.schemas import SCHEMA_VERSION


class ModelArtifactManager:
    """
    Manages filesystem serialization and verification of ML model artifacts.
    """

    def __init__(self, model_dir: str = settings.MODEL_DIR):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)

    def save_artifact(
        self,
        model_instance: Any,
        model_type: str,
        version: str = "v1.0.0"
    ) -> str:
        """
        Saves a trained model instance to disk with metadata and returns safe file path.
        """
        artifact_id = uuid.uuid4().hex[:12]
        filename = f"sentra_{model_type}_{version}_{artifact_id}.joblib"
        file_path = os.path.join(self.model_dir, filename)

        payload = {
            "model_instance": model_instance,
            "model_type": model_type,
            "version": version,
            "feature_schema_version": SCHEMA_VERSION
        }

        joblib.dump(payload, file_path, compress=3)
        return file_path

    def load_artifact(self, file_path: str) -> Any:
        """
        Safely loads a model artifact and verifies directory containment and structure.
        """
        abs_path = os.path.abspath(file_path)
        allowed_dir = os.path.abspath(self.model_dir)

        if not abs_path.startswith(allowed_dir):
            raise PermissionError("Access denied: artifact path resides outside authorized model directory.")

        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Model artifact not found at {abs_path}")

        payload = joblib.load(abs_path)
        if not isinstance(payload, dict) or "model_instance" not in payload:
            raise ValueError("Corrupt or invalid model artifact structure.")

        return payload["model_instance"]

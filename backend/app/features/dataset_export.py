"""
Dataset Generation and Export module for SENTRA.
Produces structured, reproducible CSV and Parquet artifacts.
Strictly separates audit identifiers (IPs, MACs, Flow IDs) from pure ML-ready numerical feature matrices
to prevent target leakage and model bias.
"""

import os
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
import pandas as pd
from app.config import settings
from app.features.schemas import SCHEMA_VERSION, FEATURE_DEFINITIONS


class DatasetExporter:
    """
    Exports extracted feature dictionaries into auditable and ML-ready datasets.
    """

    MODEL_FEATURE_NAMES = [f.name for f in FEATURE_DEFINITIONS if f.is_model_feature]

    AUDIT_IDENTIFIER_COLS = [
        "flow_id",
        "import_id",
        "server_id",
        "source_ip",
        "destination_ip",
        "source_port",
        "destination_port",
        "protocol",
        "start_time"
    ]

    def __init__(self, output_dir: str = settings.DATASET_DIR):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def export(
        self,
        features_list: List[Dict[str, Any]],
        job_id: int,
        import_id: int,
        format_type: str = "csv",
        dataset_type: str = "unlabeled_ml_ready"
    ) -> Dict[str, Any]:
        """
        Exports a list of flow feature records to disk in CSV or Parquet format.
        Returns a dictionary of dataset metadata.
        """
        if not features_list:
            raise ValueError("Cannot export empty feature records")

        df = pd.DataFrame(features_list)

        if dataset_type == "unlabeled_ml_ready":
            # Select ONLY model feature columns to prevent IP / Identifier leakage
            available_cols = [c for c in self.MODEL_FEATURE_NAMES if c in df.columns]
            export_df = df[available_cols].copy()
        else:
            # Full analyzed: Keep identifiers plus features
            export_df = df.copy()

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        file_basename = f"sentra_{dataset_type}_job_{job_id}_imp_{import_id}_{timestamp_str}"

        if format_type.lower() == "parquet":
            filename = f"{file_basename}.parquet"
            file_path = os.path.join(self.output_dir, filename)
            export_df.to_parquet(file_path, index=False, engine="pyarrow")
        else:
            filename = f"{file_basename}.csv"
            file_path = os.path.join(self.output_dir, filename)
            export_df.to_csv(file_path, index=False)

        # File stats and SHA-256 hash
        file_size = os.path.getsize(file_path)
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        file_hash = sha256.hexdigest()

        return {
            "name": filename,
            "format": format_type.lower(),
            "dataset_type": dataset_type,
            "file_path": file_path,
            "file_size": file_size,
            "row_count": len(export_df),
            "column_count": len(export_df.columns),
            "sha256_hash": file_hash,
            "feature_columns": list(export_df.columns),
            "schema_version": SCHEMA_VERSION
        }

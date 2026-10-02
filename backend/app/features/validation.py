"""
Validation module for extracted features against SENTRA v1.0.0 Feature Schema.
Ensures mathematical bounds, type safety, and zero NaN/Inf contamination before persistence.
"""

from typing import List, Dict, Any, Tuple
import math
import numpy as np
from app.features.schemas import FEATURE_DEFINITIONS, SCHEMA_VERSION


class FeatureValidator:
    """
    Validates that a feature dictionary complies with the versioned feature schema.
    """

    def __init__(self, schema_version: str = SCHEMA_VERSION):
        self.schema_version = schema_version
        self.definitions = {f.name: f for f in FEATURE_DEFINITIONS}

    def validate_record(self, record: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []

        for name, defn in self.definitions.items():
            if name not in record:
                errors.append(f"Missing required feature: {name}")
                continue

            val = record[name]

            # Null / None checks
            if val is None:
                errors.append(f"Feature {name} has unexpected None value")
                continue

            # Check NaN and Inf
            if isinstance(val, (float, np.floating)):
                if math.isnan(val) or math.isinf(val):
                    errors.append(f"Feature {name} contains NaN or Inf: {val}")

            # Specific range checks
            if name in ("syn_ratio", "ack_ratio", "rst_ratio", "source_port_normalized", "destination_port_normalized", "src_fan_out_ratio", "encrypted_flow_byte_ratio"):
                if not (0.0 <= float(val) <= 1.0001):
                    errors.append(f"Ratio {name} out of bounds [0, 1]: {val}")

            if name in ("packet_count", "byte_count", "src_unique_dst_count", "src_unique_dst_port_count", "dst_unique_src_count"):
                if int(val) < 0:
                    errors.append(f"Count {name} cannot be negative: {val}")

            if name == "flow_duration" and float(val) < 0.0:
                errors.append(f"Duration cannot be negative: {val}")

        return (len(errors) == 0, errors)

    def validate_batch(self, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        valid = []
        invalid = []
        all_errors = []

        for rec in records:
            is_valid, errs = self.validate_record(rec)
            if is_valid:
                valid.append(rec)
            else:
                invalid.append(rec)
                all_errors.extend(errs)

        return valid, invalid, all_errors

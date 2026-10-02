"""
Dataset Loading, Schema Verification, and Benchmark Generation for SENTRA ML.
Ensures feature alignment with SENTRA v1.0.0 Schema and provides realistic
multi-class network threat benchmark datasets.
"""

import os
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd

from app.features.schemas import FEATURE_DEFINITIONS, SCHEMA_VERSION
from app.ml.label_mapping import map_label, STANDARD_CLASSES


class DatasetLoader:
    """
    Loads, validates, and cleans labeled network-flow datasets for ML training.
    """

    EXPECTED_FEATURES = [f.name for f in FEATURE_DEFINITIONS if f.is_model_feature]

    @classmethod
    def load(
        cls,
        file_path: str,
        label_col: str = "label"
    ) -> Tuple[pd.DataFrame, pd.Series, Dict[str, Any]]:
        """
        Loads dataset from CSV or Parquet, validates required features, maps labels,
        and returns (features_df, labels_series, metadata_dict).
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset file not found: {file_path}")

        if file_path.endswith(".parquet"):
            df = pd.read_parquet(file_path)
        else:
            df = pd.read_csv(file_path)

        if df.empty:
            raise ValueError("Dataset is empty")

        # 1. Label column handling
        if label_col not in df.columns:
            # Check common alternatives
            possible_labels = ["Label", "threat_class", "attack_cat", "class", "target"]
            found = False
            for pl in possible_labels:
                if pl in df.columns:
                    label_col = pl
                    found = True
                    break
            if not found:
                raise ValueError(f"Label column '{label_col}' not found in dataset columns: {list(df.columns)}")

        raw_labels = df[label_col].astype(str)
        mapped_labels = raw_labels.apply(map_label)

        # 2. Feature Schema Alignment
        missing_features = [f for f in cls.EXPECTED_FEATURES if f not in df.columns]
        if missing_features:
            # Impute missing schema features with 0.0 to maintain alignment
            for mf in missing_features:
                df[mf] = 0.0

        # Select strictly ordered model features
        X = df[cls.EXPECTED_FEATURES].copy()

        # Sanitize numeric values (replace inf and nan with safe values)
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0.0)

        # Class distribution
        class_dist = mapped_labels.value_counts().to_dict()

        metadata = {
            "record_count": len(df),
            "feature_count": len(cls.EXPECTED_FEATURES),
            "feature_names": cls.EXPECTED_FEATURES,
            "label_column": label_col,
            "classes": sorted(list(class_dist.keys())),
            "class_distribution": class_dist,
            "schema_version": SCHEMA_VERSION,
            "missing_features_imputed": missing_features
        }

        return X, mapped_labels, metadata


def generate_benchmark_dataset(output_path: str, n_samples: int = 1200) -> str:
    """
    Generates a realistic synthetic multi-class flow dataset conforming to SENTRA v1.0.0
    for training and benchmarking Random Forest and Isolation Forest models.
    Classes: Normal (60%), DDoS (15%), Reconnaissance (10%), DNS Tunneling (8%), Data Exfiltration (7%).
    """
    np.random.seed(42)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    records = []

    # 1. Normal Traffic (~60%)
    n_normal = int(n_samples * 0.60)
    for _ in range(n_normal):
        proto = np.random.choice([6, 17, 1], p=[0.75, 0.20, 0.05])
        dur = max(0.001, np.random.exponential(1.5))
        pkts = int(max(1, np.random.poisson(12)))
        bytes_cnt = int(pkts * np.random.normal(500, 150))
        bytes_cnt = max(pkts * 40, bytes_cnt)
        records.append({
            "flow_duration": round(dur, 4),
            "packet_count": pkts,
            "byte_count": bytes_cnt,
            "average_packet_size": round(bytes_cnt / max(1, pkts), 2),
            "packets_per_second": round(pkts / dur, 2),
            "bytes_per_second": round(bytes_cnt / dur, 2),
            "average_interarrival_time": round(dur / max(1, pkts), 4),
            "source_port_normalized": round(np.random.uniform(0.5, 0.99), 4),
            "destination_port_normalized": round(np.random.choice([80, 443, 8080, 53]) / 65535.0, 4),
            "is_ephemeral_source_port": 1,
            "is_well_known_destination_port": 1 if np.random.rand() > 0.1 else 0,
            "protocol_code": proto,
            "tcp_syn_count": 1 if proto == 6 else 0,
            "tcp_ack_count": max(1, pkts - 2) if proto == 6 else 0,
            "tcp_fin_count": 1 if proto == 6 else 0,
            "tcp_rst_count": 0,
            "syn_ratio": round(1.0 / pkts, 4) if proto == 6 else 0.0,
            "rst_ratio": 0.0,
            "ack_ratio": round(max(0.0, (pkts - 2) / pkts), 4) if proto == 6 else 0.0,
            "src_unique_dst_count": int(np.random.choice([1, 2, 3])),
            "src_unique_dst_port_count": int(np.random.choice([1, 2])),
            "dst_unique_src_count": int(np.random.choice([1, 2, 5])),
            "src_fan_out_ratio": round(np.random.uniform(0.1, 0.4), 4),
            "repeated_connection_count": int(np.random.poisson(2)),
            "avg_connection_interval": round(np.random.uniform(2.0, 15.0), 2),
            "is_dns_service": 1 if proto == 17 else 0,
            "dns_query_len_estimate": round(np.random.uniform(20, 60), 2) if proto == 17 else 0.0,
            "is_tls_service": 1 if proto == 6 else 0,
            "encrypted_flow_byte_ratio": round(np.random.uniform(0.3, 0.8), 4) if proto == 6 else 0.0,
            "label": "Normal"
        })

    # 2. DDoS Traffic (~15%) - High packet rates, high SYN ratio or high PPS
    n_ddos = int(n_samples * 0.15)
    for _ in range(n_ddos):
        dur = max(0.001, np.random.uniform(0.01, 0.5))
        pkts = int(np.random.uniform(500, 5000))
        bytes_cnt = pkts * 64
        records.append({
            "flow_duration": round(dur, 4),
            "packet_count": pkts,
            "byte_count": bytes_cnt,
            "average_packet_size": 64.0,
            "packets_per_second": round(pkts / dur, 2),
            "bytes_per_second": round(bytes_cnt / dur, 2),
            "average_interarrival_time": round(dur / max(1, pkts), 6),
            "source_port_normalized": round(np.random.uniform(0.1, 0.99), 4),
            "destination_port_normalized": round(80 / 65535.0, 4),
            "is_ephemeral_source_port": 1,
            "is_well_known_destination_port": 1,
            "protocol_code": 6,
            "tcp_syn_count": pkts,
            "tcp_ack_count": 0,
            "tcp_fin_count": 0,
            "tcp_rst_count": 0,
            "syn_ratio": 1.0,
            "rst_ratio": 0.0,
            "ack_ratio": 0.0,
            "src_unique_dst_count": 1,
            "src_unique_dst_port_count": 1,
            "dst_unique_src_count": int(np.random.uniform(50, 500)),
            "src_fan_out_ratio": 0.05,
            "repeated_connection_count": int(np.random.uniform(10, 50)),
            "avg_connection_interval": 0.001,
            "is_dns_service": 0,
            "dns_query_len_estimate": 0.0,
            "is_tls_service": 0,
            "encrypted_flow_byte_ratio": 0.0,
            "label": "DDoS"
        })

    # 3. Reconnaissance (Port Scanning) (~10%) - High destination port count, 1-2 packets per flow
    n_recon = int(n_samples * 0.10)
    for _ in range(n_recon):
        dur = 0.001
        pkts = 1
        bytes_cnt = 44
        records.append({
            "flow_duration": dur,
            "packet_count": pkts,
            "byte_count": bytes_cnt,
            "average_packet_size": 44.0,
            "packets_per_second": 1000.0,
            "bytes_per_second": 44000.0,
            "average_interarrival_time": 0.0,
            "source_port_normalized": round(np.random.uniform(0.7, 0.99), 4),
            "destination_port_normalized": round(np.random.uniform(0.01, 0.99), 4),
            "is_ephemeral_source_port": 1,
            "is_well_known_destination_port": 0,
            "protocol_code": 6,
            "tcp_syn_count": 1,
            "tcp_ack_count": 0,
            "tcp_fin_count": 0,
            "tcp_rst_count": 0,
            "syn_ratio": 1.0,
            "rst_ratio": 0.0,
            "ack_ratio": 0.0,
            "src_unique_dst_count": int(np.random.uniform(10, 50)),
            "src_unique_dst_port_count": int(np.random.uniform(25, 200)),
            "dst_unique_src_count": 1,
            "src_fan_out_ratio": 0.95,
            "repeated_connection_count": 0,
            "avg_connection_interval": 0.02,
            "is_dns_service": 0,
            "dns_query_len_estimate": 0.0,
            "is_tls_service": 0,
            "encrypted_flow_byte_ratio": 0.0,
            "label": "Reconnaissance"
        })

    # 4. DNS Tunneling (~8%) - High DNS query length, UDP port 53, high entropy
    n_dns = int(n_samples * 0.08)
    for _ in range(n_dns):
        dur = max(0.01, np.random.uniform(0.1, 2.0))
        pkts = int(np.random.uniform(20, 80))
        bytes_cnt = pkts * int(np.random.uniform(300, 600))
        records.append({
            "flow_duration": round(dur, 4),
            "packet_count": pkts,
            "byte_count": bytes_cnt,
            "average_packet_size": round(bytes_cnt / pkts, 2),
            "packets_per_second": round(pkts / dur, 2),
            "bytes_per_second": round(bytes_cnt / dur, 2),
            "average_interarrival_time": round(dur / pkts, 4),
            "source_port_normalized": round(np.random.uniform(0.7, 0.99), 4),
            "destination_port_normalized": round(53 / 65535.0, 4),
            "is_ephemeral_source_port": 1,
            "is_well_known_destination_port": 1,
            "protocol_code": 17,
            "tcp_syn_count": 0,
            "tcp_ack_count": 0,
            "tcp_fin_count": 0,
            "tcp_rst_count": 0,
            "syn_ratio": 0.0,
            "rst_ratio": 0.0,
            "ack_ratio": 0.0,
            "src_unique_dst_count": 1,
            "src_unique_dst_port_count": 1,
            "dst_unique_src_count": 1,
            "src_fan_out_ratio": 0.1,
            "repeated_connection_count": int(np.random.uniform(5, 20)),
            "avg_connection_interval": round(np.random.uniform(0.5, 2.0), 2),
            "is_dns_service": 1,
            "dns_query_len_estimate": round(np.random.uniform(180, 450), 2),
            "is_tls_service": 0,
            "encrypted_flow_byte_ratio": 0.0,
            "label": "DNS Tunneling"
        })

    # 5. Data Exfiltration (~7%) - High byte volume, long duration, unidirectional heavy bytes
    n_exfil = n_samples - len(records)
    for _ in range(n_exfil):
        dur = max(1.0, np.random.uniform(10.0, 120.0))
        pkts = int(np.random.uniform(500, 3000))
        bytes_cnt = pkts * 1460  # full MTU payloads
        records.append({
            "flow_duration": round(dur, 4),
            "packet_count": pkts,
            "byte_count": bytes_cnt,
            "average_packet_size": 1460.0,
            "packets_per_second": round(pkts / dur, 2),
            "bytes_per_second": round(bytes_cnt / dur, 2),
            "average_interarrival_time": round(dur / pkts, 4),
            "source_port_normalized": round(np.random.uniform(0.7, 0.99), 4),
            "destination_port_normalized": round(443 / 65535.0, 4),
            "is_ephemeral_source_port": 1,
            "is_well_known_destination_port": 1,
            "protocol_code": 6,
            "tcp_syn_count": 1,
            "tcp_ack_count": pkts - 1,
            "tcp_fin_count": 1,
            "tcp_rst_count": 0,
            "syn_ratio": round(1.0 / pkts, 4),
            "rst_ratio": 0.0,
            "ack_ratio": round((pkts - 1) / pkts, 4),
            "src_unique_dst_count": 1,
            "src_unique_dst_port_count": 1,
            "dst_unique_src_count": 1,
            "src_fan_out_ratio": 0.05,
            "repeated_connection_count": 1,
            "avg_connection_interval": 30.0,
            "is_dns_service": 0,
            "dns_query_len_estimate": 0.0,
            "is_tls_service": 1,
            "encrypted_flow_byte_ratio": round(1460.0 / 1500.0, 4),
            "label": "Data Exfiltration"
        })

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    return output_path

"""
TLS and Encrypted Traffic Metadata Feature Extraction for SENTRA.
Analyzes transport-layer port patterns and packet size efficiency metrics without decrypting payloads.
"""

from typing import Dict, Any
import pandas as pd


def extract_tls_features(row: pd.Series) -> Dict[str, Any]:
    """
    Extracts observable TLS characteristics.
    Pay attention: Metadata alone does not imply malware or malicious intent.
    """
    src_port = int(row.get("source_port", 0) or 0)
    dst_port = int(row.get("destination_port", 0) or 0)
    avg_pkt_size = float(row.get("average_packet_size", 0.0) or 0.0)

    # Standard TLS / HTTPS ports (443, 8443)
    is_tls = 1 if (dst_port in (443, 8443) or src_port in (443, 8443)) else 0

    # Byte density / encapsulation efficiency relative to typical Ethernet MTU (1500)
    if is_tls:
        byte_ratio = round(min(1.0, avg_pkt_size / 1500.0), 4)
    else:
        byte_ratio = 0.0

    return {
        "is_tls_service": is_tls,
        "encrypted_flow_byte_ratio": byte_ratio
    }

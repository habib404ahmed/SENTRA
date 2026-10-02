"""
DNS-specific Feature Extraction for SENTRA.
Calculates transport-level DNS indicators and entropy/length heuristics when observable.
Does not decrypt or infer DNS from encrypted arbitrary traffic.
"""

import math
from typing import Dict, Any
import pandas as pd


def calculate_shannon_entropy(text: str) -> float:
    """Calculates Shannon entropy in bits for a given text string."""
    if not text:
        return 0.0
    prob_map = {}
    for c in text:
        prob_map[c] = prob_map.get(c, 0) + 1
    total = len(text)
    entropy = 0.0
    for count in prob_map.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def extract_dns_features(row: pd.Series) -> Dict[str, Any]:
    """
    Extracts DNS transport metadata without requiring payload decryption.
    """
    src_port = int(row.get("source_port", 0) or 0)
    dst_port = int(row.get("destination_port", 0) or 0)
    avg_pkt_size = float(row.get("average_packet_size", 0.0) or 0.0)

    # Standard DNS (port 53) and DNS-over-TLS (port 853)
    is_dns = 1 if (dst_port in (53, 853) or src_port in (53, 853)) else 0

    # Payload estimate: wire size minus estimated L3/L4 headers (~42 bytes for IPv4 + UDP)
    if is_dns and avg_pkt_size > 42.0:
        query_len_est = round(avg_pkt_size - 42.0, 2)
    else:
        query_len_est = 0.0

    return {
        "is_dns_service": is_dns,
        "dns_query_len_estimate": query_len_est
    }

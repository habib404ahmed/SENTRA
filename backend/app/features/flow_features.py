"""
Flow-level Feature Extraction for SENTRA.
Computes statistical, structural, and transport-layer characteristics for unidirectional flows.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd


def extract_flow_features(row: pd.Series) -> Dict[str, Any]:
    """
    Extracts isolated flow-level metadata features for a single flow row.
    Guarantees no division by zero and preserves mathematical stability for zero-duration flows.
    """
    packet_count = max(0, int(row.get("packet_count", 0)))
    byte_count = max(0, int(row.get("byte_count", 0)))
    duration = max(0.0, float(row.get("duration", 0.0)))

    # Zero-duration safe rate calculations
    if duration > 0.0:
        pps = float(packet_count) / duration
        bps = float(byte_count) / duration
    else:
        # For single packet flows or instantaneous bursts, duration is 0.0
        # Rates equal the total packet and byte count observed in that instant
        pps = float(packet_count)
        bps = float(byte_count)

    # Average packet size
    avg_pkt_size = float(byte_count) / max(1, packet_count)

    # Ports
    src_port = int(row.get("source_port", 0) or 0)
    dst_port = int(row.get("destination_port", 0) or 0)
    src_port_norm = float(src_port) / 65535.0
    dst_port_norm = float(dst_port) / 65535.0
    is_ephemeral_src = 1 if src_port >= 49152 else 0
    is_well_known_dst = 1 if 0 <= dst_port <= 1023 else 0

    # Protocol mapping
    proto_str = str(row.get("protocol", "OTHER")).upper()
    proto_map = {"ICMP": 1, "TCP": 6, "UDP": 17, "GRE": 47, "ESP": 50, "AH": 51}
    protocol_code = proto_map.get(proto_str, 0)

    # TCP Flags & Ratios
    syn_cnt = max(0, int(row.get("tcp_syn_count", 0) or 0))
    ack_cnt = max(0, int(row.get("tcp_ack_count", 0) or 0))
    fin_cnt = max(0, int(row.get("tcp_fin_count", 0) or 0))
    rst_cnt = max(0, int(row.get("tcp_rst_count", 0) or 0))

    denom = max(1, packet_count)
    syn_ratio = float(syn_cnt) / denom
    ack_ratio = float(ack_cnt) / denom
    rst_ratio = float(rst_cnt) / denom

    avg_iat = max(0.0, float(row.get("average_interarrival_time", 0.0) or 0.0))

    return {
        "flow_duration": round(duration, 6),
        "packet_count": packet_count,
        "byte_count": byte_count,
        "average_packet_size": round(avg_pkt_size, 4),
        "packets_per_second": round(pps, 4),
        "bytes_per_second": round(bps, 4),
        "average_interarrival_time": round(avg_iat, 6),
        "source_port_normalized": round(src_port_norm, 6),
        "destination_port_normalized": round(dst_port_norm, 6),
        "is_ephemeral_source_port": is_ephemeral_src,
        "is_well_known_destination_port": is_well_known_dst,
        "protocol_code": protocol_code,
        "tcp_syn_count": syn_cnt,
        "tcp_ack_count": ack_cnt,
        "tcp_fin_count": fin_cnt,
        "tcp_rst_count": rst_cnt,
        "syn_ratio": round(syn_ratio, 4),
        "rst_ratio": round(rst_ratio, 4),
        "ack_ratio": round(ack_ratio, 4),
    }

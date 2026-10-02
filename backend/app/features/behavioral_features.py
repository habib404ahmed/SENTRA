"""
Behavioral and Aggregated Network Features for SENTRA.
Calculates fan-out, fan-in, connection frequencies, and repeated connection metrics
using strictly retrospective time-windows [t - W, t] to mathematically prevent future-data leakage.
"""

from typing import List, Dict, Any
from collections import defaultdict, deque
import pandas as pd
import numpy as np


class BehavioralFeatureExtractor:
    """
    Computes time-windowed behavioral features across flows.
    Guarantees no lookahead bias: each flow at time t only incorporates
    observations from previous or simultaneous flows within the window.
    """

    def __init__(self, window_seconds: float = 300.0):
        self.window_seconds = window_seconds

    def extract(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Calculates retrospective behavioral metrics for each row in the DataFrame.
        Assumes df is sorted chronologically by start_time.
        """
        if df.empty:
            return []

        # Ensure start_time exists and is converted to epoch seconds for window math
        if "start_time" in df.columns and pd.api.types.is_datetime64_any_dtype(df["start_time"]):
            timestamps = df["start_time"].apply(lambda x: x.timestamp() if pd.notnull(x) else 0.0).values
        else:
            # Fallback to monotonic sequence if timestamps missing
            timestamps = np.arange(len(df), dtype=float)

        src_ips = df["source_ip"].astype(str).values
        dst_ips = df["destination_ip"].astype(str).values
        dst_ports = df["destination_port"].fillna(0).astype(int).values

        n = len(df)
        results: List[Dict[str, Any]] = []

        # Sliding window queues for historical tracking
        # window_flows: deque of (timestamp, src_ip, dst_ip, dst_port)
        window_flows = deque()
        src_dst_history = defaultdict(lambda: deque())  # src -> deque of (timestamp, dst_ip)
        src_port_history = defaultdict(lambda: deque())  # src -> deque of (timestamp, dst_port)
        dst_src_history = defaultdict(lambda: deque())  # dst -> deque of (timestamp, src_ip)
        src_time_history = defaultdict(lambda: deque())  # src -> deque of timestamps
        tuple_history = defaultdict(lambda: deque())  # (src, dst, dst_port) -> deque of timestamps

        for i in range(n):
            t = timestamps[i]
            s_ip = src_ips[i]
            d_ip = dst_ips[i]
            d_port = dst_ports[i]
            cutoff = t - self.window_seconds

            # Evict entries older than cutoff from active historical structures
            while src_dst_history[s_ip] and src_dst_history[s_ip][0][0] < cutoff:
                src_dst_history[s_ip].popleft()

            while src_port_history[s_ip] and src_port_history[s_ip][0][0] < cutoff:
                src_port_history[s_ip].popleft()

            while dst_src_history[d_ip] and dst_src_history[d_ip][0][0] < cutoff:
                dst_src_history[d_ip].popleft()

            while src_time_history[s_ip] and src_time_history[s_ip][0] < cutoff:
                src_time_history[s_ip].popleft()

            tuple_key = (s_ip, d_ip, d_port)
            while tuple_history[tuple_key] and tuple_history[tuple_key][0] < cutoff:
                tuple_history[tuple_key].popleft()

            # Record current observation in historical state
            src_dst_history[s_ip].append((t, d_ip))
            src_port_history[s_ip].append((t, d_port))
            dst_src_history[d_ip].append((t, s_ip))
            src_time_history[s_ip].append(t)
            tuple_history[tuple_key].append(t)

            # Compute window metrics up to and including current flow
            unique_dsts = len(set(item[1] for item in src_dst_history[s_ip]))
            unique_dst_ports = len(set(item[1] for item in src_port_history[s_ip]))
            unique_srcs_for_dst = len(set(item[1] for item in dst_src_history[d_ip]))
            total_src_flows = len(src_dst_history[s_ip])
            repeated_connections = len(tuple_history[tuple_key]) - 1  # prior matching connections

            fan_out_ratio = float(unique_dsts) / max(1, total_src_flows)

            # Average connection interval for this source
            s_times = list(src_time_history[s_ip])
            if len(s_times) > 1:
                intervals = np.diff(s_times)
                avg_interval = float(np.mean(intervals))
            else:
                avg_interval = 0.0

            results.append({
                "src_unique_dst_count": unique_dsts,
                "src_unique_dst_port_count": unique_dst_ports,
                "dst_unique_src_count": unique_srcs_for_dst,
                "src_fan_out_ratio": round(fan_out_ratio, 4),
                "repeated_connection_count": max(0, repeated_connections),
                "avg_connection_interval": round(max(0.0, avg_interval), 4)
            })

        return results

"""
Data Cleaning and Validation module for SENTRA Network Flow records.
Ensures mathematical stability, identifies corrupt records without dropping genuine attack patterns,
and produces a detailed audit-grade Data Quality Report.
"""

from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field


class DataQualityReport(BaseModel):
    total_input_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    duplicate_records: int = 0
    records_excluded: int = 0
    missing_value_counts: Dict[str, int] = Field(default_factory=dict)
    invalid_value_counts: Dict[str, int] = Field(default_factory=dict)
    exclusion_reasons: Dict[str, int] = Field(default_factory=dict)
    remediation_actions: List[str] = Field(default_factory=list)


class FlowDataCleaner:
    """
    Cleans raw traffic flow records into validated dataframes ready for feature extraction.
    Distinguishes network anomalies (e.g. single-packet port scans) from true data corruption.
    """

    SUPPORTED_PROTOCOLS = {"TCP", "UDP", "ICMP", "IGMP", "GRE", "ESP", "AH", "OTHER"}

    def __init__(self, drop_duplicates: bool = True):
        self.drop_duplicates = drop_duplicates

    def clean(self, raw_flows: List[Dict[str, Any]]) -> Tuple[pd.DataFrame, DataQualityReport]:
        report = DataQualityReport()
        report.total_input_records = len(raw_flows)

        if not raw_flows:
            return pd.DataFrame(), report

        df = pd.DataFrame(raw_flows)

        # 1. Check Missing Values per field
        for col in df.columns:
            missing_count = int(df[col].isna().sum())
            if missing_count > 0:
                report.missing_value_counts[col] = missing_count

        # 2. Check for Duplicate Records
        # Identical 5-tuple and identical timestamp indicates duplicate ingestion
        dup_mask = df.duplicated(
            subset=["source_ip", "source_port", "destination_ip", "destination_port", "protocol", "start_time"],
            keep="first"
        )
        report.duplicate_records = int(dup_mask.sum())
        if self.drop_duplicates and report.duplicate_records > 0:
            df = df[~dup_mask].copy()
            report.exclusion_reasons["duplicate_ingestion"] = report.duplicate_records
            report.records_excluded += report.duplicate_records
            report.remediation_actions.append(f"Deduplicated {report.duplicate_records} identical flow records.")

        valid_rows = []
        for idx, row in df.iterrows():
            row_dict = row.to_dict()
            is_valid = True
            rejection_reason = None

            # Check Mandatory IP Address Strings
            raw_src = row_dict.get("source_ip")
            raw_dst = row_dict.get("destination_ip")
            if pd.isna(raw_src) or pd.isna(raw_dst):
                is_valid = False
                rejection_reason = "missing_ip_endpoints"
            else:
                src_ip = str(raw_src).strip()
                dst_ip = str(raw_dst).strip()
                if not src_ip or not dst_ip or src_ip.lower() in ("none", "nan") or dst_ip.lower() in ("none", "nan"):
                    is_valid = False
                    rejection_reason = "missing_ip_endpoints"

            # Check Packet & Byte Counts (must be non-negative integers)
            try:
                pkt_cnt = int(row_dict.get("packet_count", 0))
                byte_cnt = int(row_dict.get("byte_count", 0))
                if pkt_cnt <= 0 or byte_cnt <= 0:
                    is_valid = False
                    rejection_reason = "zero_or_negative_packet_or_byte_count"
            except (ValueError, TypeError):
                is_valid = False
                rejection_reason = "corrupted_packet_or_byte_count"

            # Check Duration (negative duration is a corruption error)
            try:
                duration = float(row_dict.get("duration", 0.0))
                if np.isnan(duration) or np.isneginf(duration):
                    row_dict["duration"] = 0.0
                    report.invalid_value_counts["nan_or_neginf_duration"] = report.invalid_value_counts.get("nan_or_neginf_duration", 0) + 1
                elif duration < 0:
                    # Negative duration: clamp to 0.0 if tiny clock skew, or flag
                    if duration < -1.0:
                        is_valid = False
                        rejection_reason = "excessive_negative_duration"
                    else:
                        row_dict["duration"] = 0.0
                        report.invalid_value_counts["negative_clock_skew_duration"] = report.invalid_value_counts.get("negative_clock_skew_duration", 0) + 1
            except (ValueError, TypeError):
                row_dict["duration"] = 0.0

            # Protocol normalization
            proto = str(row_dict.get("protocol", "OTHER")).upper().strip()
            if proto not in self.SUPPORTED_PROTOCOLS:
                proto = "OTHER"
            row_dict["protocol"] = proto

            # Safe Ports
            for port_field in ["source_port", "destination_port"]:
                val = row_dict.get(port_field)
                if val is None or pd.isna(val):
                    row_dict[port_field] = 0
                else:
                    try:
                        p = int(val)
                        row_dict[port_field] = max(0, min(65535, p))
                    except (ValueError, TypeError):
                        row_dict[port_field] = 0

            # Safe TCP Flags
            for flag_field in ["tcp_syn_count", "tcp_ack_count", "tcp_fin_count", "tcp_rst_count"]:
                val = row_dict.get(flag_field)
                if val is None or pd.isna(val):
                    row_dict[flag_field] = 0
                else:
                    try:
                        row_dict[flag_field] = max(0, int(val))
                    except (ValueError, TypeError):
                        row_dict[flag_field] = 0

            # Sanitize Rates and Floating Points (prevent Inf/NaN)
            for float_field in ["packets_per_second", "bytes_per_second", "average_packet_size", "average_interarrival_time"]:
                val = row_dict.get(float_field)
                try:
                    f_val = float(val) if val is not None and not pd.isna(val) else 0.0
                    if np.isinf(f_val) or np.isnan(f_val):
                        # Calculate safe fallback
                        dur = max(0.0001, row_dict["duration"])
                        if float_field == "packets_per_second":
                            f_val = row_dict["packet_count"] / dur
                        elif float_field == "bytes_per_second":
                            f_val = row_dict["byte_count"] / dur
                        elif float_field == "average_packet_size":
                            f_val = row_dict["byte_count"] / max(1, row_dict["packet_count"])
                        else:
                            f_val = 0.0
                    row_dict[float_field] = max(0.0, float(f_val))
                except (ValueError, TypeError):
                    row_dict[float_field] = 0.0

            if is_valid:
                valid_rows.append(row_dict)
            else:
                report.records_excluded += 1
                report.exclusion_reasons[rejection_reason] = report.exclusion_reasons.get(rejection_reason, 0) + 1

        report.valid_records = len(valid_rows)
        report.invalid_records = report.records_excluded

        cleaned_df = pd.DataFrame(valid_rows)
        if not cleaned_df.empty and "start_time" in cleaned_df.columns:
            # Sort chronologically by start_time to support leak-free retrospective windowing
            cleaned_df["start_time"] = pd.to_datetime(cleaned_df["start_time"])
            cleaned_df = cleaned_df.sort_values(by="start_time").reset_index(drop=True)

        return cleaned_df, report

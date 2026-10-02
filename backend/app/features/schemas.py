"""
Versioned Feature Schema definitions for SENTRA network traffic threat analysis.
Schema Version: v1.0.0
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

SCHEMA_VERSION = "v1.0.0"


class FeatureDefinition(BaseModel):
    name: str
    data_type: str  # float, int, str, bool
    description: str
    source_field: str
    calculation_method: str
    missing_value_behavior: str
    feature_scope: str  # "flow", "behavioral", "dns", "tls"
    is_model_feature: bool = True  # True if suitable for ML; False if audit/identifier


class FeatureSchemaMetadata(BaseModel):
    version: str = SCHEMA_VERSION
    description: str
    total_features: int
    model_feature_count: int
    features: List[FeatureDefinition]


# Master Registry of v1.0.0 Features
FEATURE_DEFINITIONS: List[FeatureDefinition] = [
    # --- Flow-Level Features ---
    FeatureDefinition(
        name="flow_duration",
        data_type="float",
        description="Total duration of unidirectional flow in seconds",
        source_field="duration",
        calculation_method="max(0.0, end_time - start_time)",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="packet_count",
        data_type="int",
        description="Total number of packets observed in this unidirectional flow",
        source_field="packet_count",
        calculation_method="count of directional packets",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="byte_count",
        data_type="int",
        description="Total bytes observed across all packets in the flow",
        source_field="byte_count",
        calculation_method="sum of wire packet lengths",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="average_packet_size",
        data_type="float",
        description="Average size in bytes per packet in the flow",
        source_field="average_packet_size",
        calculation_method="byte_count / max(1, packet_count)",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="packets_per_second",
        data_type="float",
        description="Transmission rate in packets per second",
        source_field="packets_per_second",
        calculation_method="packet_count / duration if duration > 0 else packet_count",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="bytes_per_second",
        data_type="float",
        description="Bandwidth utilization rate in bytes per second",
        source_field="bytes_per_second",
        calculation_method="byte_count / duration if duration > 0 else byte_count",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="average_interarrival_time",
        data_type="float",
        description="Mean inter-arrival time (IAT) between successive packets in seconds",
        source_field="average_interarrival_time",
        calculation_method="mean(delta_t) across packets in flow",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="source_port_normalized",
        data_type="float",
        description="Normalized source port number in range [0, 1]",
        source_field="source_port",
        calculation_method="source_port / 65535.0 (0.0 if ICMP/no port)",
        missing_value_behavior="impute 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="destination_port_normalized",
        data_type="float",
        description="Normalized destination port number in range [0, 1]",
        source_field="destination_port",
        calculation_method="destination_port / 65535.0 (0.0 if ICMP/no port)",
        missing_value_behavior="impute 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="is_ephemeral_source_port",
        data_type="int",
        description="Binary flag if source port falls in IANA dynamic range (49152-65535)",
        source_field="source_port",
        calculation_method="1 if source_port >= 49152 else 0",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="is_well_known_destination_port",
        data_type="int",
        description="Binary flag if destination port is a system service port (0-1023)",
        source_field="destination_port",
        calculation_method="1 if 0 <= destination_port <= 1023 else 0",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="protocol_code",
        data_type="int",
        description="IANA protocol numeric identifier (TCP=6, UDP=17, ICMP=1, Other=0)",
        source_field="protocol",
        calculation_method="mapped mapping of uppercase protocol string",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="tcp_syn_count",
        data_type="int",
        description="Total SYN control flags observed in flow",
        source_field="tcp_syn_count",
        calculation_method="sum of SYN flags (0 for non-TCP)",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="tcp_ack_count",
        data_type="int",
        description="Total ACK control flags observed in flow",
        source_field="tcp_ack_count",
        calculation_method="sum of ACK flags (0 for non-TCP)",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="tcp_fin_count",
        data_type="int",
        description="Total FIN control flags observed in flow",
        source_field="tcp_fin_count",
        calculation_method="sum of FIN flags (0 for non-TCP)",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="tcp_rst_count",
        data_type="int",
        description="Total RST control flags observed in flow",
        source_field="tcp_rst_count",
        calculation_method="sum of RST flags (0 for non-TCP)",
        missing_value_behavior="default to 0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="syn_ratio",
        data_type="float",
        description="Proportion of flow packets bearing SYN control flag",
        source_field="tcp_syn_count",
        calculation_method="tcp_syn_count / max(1, packet_count)",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="rst_ratio",
        data_type="float",
        description="Proportion of flow packets bearing RST control flag",
        source_field="tcp_rst_count",
        calculation_method="tcp_rst_count / max(1, packet_count)",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),
    FeatureDefinition(
        name="ack_ratio",
        data_type="float",
        description="Proportion of flow packets bearing ACK control flag",
        source_field="tcp_ack_count",
        calculation_method="tcp_ack_count / max(1, packet_count)",
        missing_value_behavior="default to 0.0",
        feature_scope="flow"
    ),

    # --- Behavioral Retrospective Window Features ---
    FeatureDefinition(
        name="src_unique_dst_count",
        data_type="int",
        description="Number of distinct destination IPs contacted by this source IP up to time t",
        source_field="source_ip, destination_ip, start_time",
        calculation_method="count(distinct destination_ip) in retrospective window [t-W, t]",
        missing_value_behavior="default to 1",
        feature_scope="behavioral"
    ),
    FeatureDefinition(
        name="src_unique_dst_port_count",
        data_type="int",
        description="Number of distinct destination ports targeted by this source IP up to time t",
        source_field="source_ip, destination_port, start_time",
        calculation_method="count(distinct destination_port) in retrospective window [t-W, t]",
        missing_value_behavior="default to 1",
        feature_scope="behavioral"
    ),
    FeatureDefinition(
        name="dst_unique_src_count",
        data_type="int",
        description="Number of distinct source IPs contacting this destination IP up to time t",
        source_field="destination_ip, source_ip, start_time",
        calculation_method="count(distinct source_ip) in retrospective window [t-W, t]",
        missing_value_behavior="default to 1",
        feature_scope="behavioral"
    ),
    FeatureDefinition(
        name="src_fan_out_ratio",
        data_type="float",
        description="Ratio of unique destinations to total connections for this source up to time t",
        source_field="source_ip, destination_ip",
        calculation_method="src_unique_dst_count / max(1, total_src_flows)",
        missing_value_behavior="default to 1.0",
        feature_scope="behavioral"
    ),
    FeatureDefinition(
        name="repeated_connection_count",
        data_type="int",
        description="Prior connection count from same source to same destination port",
        source_field="source_ip, destination_ip, destination_port",
        calculation_method="count of prior matching 3-tuples up to time t",
        missing_value_behavior="default to 0",
        feature_scope="behavioral"
    ),
    FeatureDefinition(
        name="avg_connection_interval",
        data_type="float",
        description="Average elapsed seconds between successive connections from this source IP",
        source_field="source_ip, start_time",
        calculation_method="mean(delta_t between flows from source)",
        missing_value_behavior="default to 0.0",
        feature_scope="behavioral"
    ),

    # --- DNS-Specific Features ---
    FeatureDefinition(
        name="is_dns_service",
        data_type="int",
        description="Binary flag if flow targets standard DNS ports (53 or 853)",
        source_field="destination_port, source_port",
        calculation_method="1 if 53 in (src_port, dst_port) or 853 in (src_port, dst_port) else 0",
        missing_value_behavior="default to 0",
        feature_scope="dns"
    ),
    FeatureDefinition(
        name="dns_query_len_estimate",
        data_type="float",
        description="Estimated DNS query payload length based on transport packet size",
        source_field="average_packet_size, is_dns_service",
        calculation_method="max(0.0, average_packet_size - 42.0) if is_dns_service else 0.0",
        missing_value_behavior="default to 0.0",
        feature_scope="dns"
    ),

    # --- TLS / Encrypted Traffic Metadata Features ---
    FeatureDefinition(
        name="is_tls_service",
        data_type="int",
        description="Binary flag if flow targets standard TLS/HTTPS ports (443, 8443)",
        source_field="destination_port, source_port",
        calculation_method="1 if 443 in (src_port, dst_port) or 8443 in (src_port, dst_port) else 0",
        missing_value_behavior="default to 0",
        feature_scope="tls"
    ),
    FeatureDefinition(
        name="encrypted_flow_byte_ratio",
        data_type="float",
        description="Byte efficiency ratio per packet for encrypted channels",
        source_field="average_packet_size, is_tls_service",
        calculation_method="average_packet_size / 1500.0 if is_tls_service else 0.0",
        missing_value_behavior="default to 0.0",
        feature_scope="tls"
    )
]


def get_feature_schema() -> FeatureSchemaMetadata:
    """Returns the versioned feature schema metadata."""
    model_features = [f for f in FEATURE_DEFINITIONS if f.is_model_feature]
    return FeatureSchemaMetadata(
        version=SCHEMA_VERSION,
        description="SENTRA Unidirectional IP Traffic Feature Schema for Anomaly and Threat Classification",
        total_features=len(FEATURE_DEFINITIONS),
        model_feature_count=len(model_features),
        features=FEATURE_DEFINITIONS
    )

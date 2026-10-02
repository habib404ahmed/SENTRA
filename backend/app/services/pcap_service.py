import os
import uuid
import struct
import logging
from datetime import datetime, timezone
from typing import Dict, Tuple, Optional, Any
from sqlalchemy.orm import Session
from scapy.utils import PcapReader, PcapNgReader, Scapy_Exception
from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6

from app.config import settings
from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.database import SessionLocal

logger = logging.getLogger("sentra.pcap_service")

# PCAP & PCAPNG Magic Byte Signatures
MAGIC_PCAP_MICRO_BE = b"\xa1\xb2\xc3\xd4"
MAGIC_PCAP_MICRO_LE = b"\xd4\xc3\xb2\xa1"
MAGIC_PCAP_NANO_BE  = b"\xa1\xb2\x3c\x4d"
MAGIC_PCAP_NANO_LE  = b"\x4d\x3c\xb2\xa1"
MAGIC_PCAPNG        = b"\x0a\x0d\x0d\x0a"

VALID_CAPTURE_MAGICS = {
    MAGIC_PCAP_MICRO_BE: "pcap",
    MAGIC_PCAP_MICRO_LE: "pcap",
    MAGIC_PCAP_NANO_BE:  "pcap",
    MAGIC_PCAP_NANO_LE:  "pcap",
    MAGIC_PCAPNG:        "pcapng",
}


class PcapValidationError(Exception):
    """Raised when uploaded file fails format or security checks."""
    pass


def validate_pcap_header(file_path: str) -> str:
    """
    Validates capture file magic bytes.
    Returns capture format ('pcap' or 'pcapng').
    Raises PcapValidationError if file is empty or corrupted.
    """
    if not os.path.exists(file_path):
        raise PcapValidationError("File does not exist on storage.")

    size = os.path.getsize(file_path)
    if size == 0:
        raise PcapValidationError("Uploaded file is empty (0 bytes).")

    if size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise PcapValidationError(
            f"File size ({size / 1024 / 1024:.2f} MB) exceeds maximum allowed limit ({settings.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB)."
        )

    with open(file_path, "rb") as f:
        header = f.read(4)

    if len(header) < 4:
        raise PcapValidationError("Malformed file: insufficient header bytes.")

    capture_type = VALID_CAPTURE_MAGICS.get(header)
    if not capture_type:
        raise PcapValidationError(
            "Unsupported capture format. Magic bytes do not match standard PCAP or PCAPNG header."
        )

    return capture_type


class DirectionalFlowAccumulator:
    """
    Maintains streaming statistics for an ordered 5-tuple directional flow:
    (source_ip, source_port, destination_ip, destination_port, protocol)
    Strictly forward-only; reverse traffic is NOT merged into this record.
    """
    def __init__(self, key: Tuple[str, Optional[int], str, Optional[int], str]):
        self.key = key
        self.source_ip, self.source_port, self.destination_ip, self.destination_port, self.protocol = key
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.packet_count: int = 0
        self.byte_count: int = 0
        self.prev_time: Optional[float] = None
        self.sum_iat: float = 0.0
        self.count_iat: int = 0
        self.tcp_syn_count: int = 0
        self.tcp_ack_count: int = 0
        self.tcp_fin_count: int = 0
        self.tcp_rst_count: int = 0

    def add_packet(self, pkt_len: int, pkt_time: float, tcp_flags: Optional[Any] = None):
        self.packet_count += 1
        self.byte_count += pkt_len

        if self.start_time is None or pkt_time < self.start_time:
            self.start_time = pkt_time
        if self.end_time is None or pkt_time > self.end_time:
            self.end_time = pkt_time

        if self.prev_time is not None:
            iat = max(0.0, pkt_time - self.prev_time)
            self.sum_iat += iat
            self.count_iat += 1
        self.prev_time = pkt_time

        if tcp_flags is not None:
            # Check TCP control flags
            flag_str = str(tcp_flags)
            if 'S' in flag_str:
                self.tcp_syn_count += 1
            if 'A' in flag_str:
                self.tcp_ack_count += 1
            if 'F' in flag_str:
                self.tcp_fin_count += 1
            if 'R' in flag_str:
                self.tcp_rst_count += 1

    def to_model(self, import_id: int, server_id: Optional[int]) -> TrafficFlowModel:
        start_ts = self.start_time if self.start_time is not None else 0.0
        end_ts = self.end_time if self.end_time is not None else start_ts
        duration = max(0.0, end_ts - start_ts)

        avg_packet_size = (self.byte_count / self.packet_count) if self.packet_count > 0 else 0.0
        pps = (self.packet_count / duration) if duration > 0.0 else float(self.packet_count)
        bps = (self.byte_count / duration) if duration > 0.0 else float(self.byte_count)
        avg_iat = (self.sum_iat / self.count_iat) if self.count_iat > 0 else 0.0

        try:
            start_dt = datetime.fromtimestamp(start_ts, tz=timezone.utc)
            end_dt = datetime.fromtimestamp(end_ts, tz=timezone.utc)
        except (ValueError, OverflowError, OSError):
            start_dt = datetime.now(timezone.utc)
            end_dt = start_dt

        return TrafficFlowModel(
            import_id=import_id,
            server_id=server_id,
            source_ip=self.source_ip,
            destination_ip=self.destination_ip,
            source_port=self.source_port,
            destination_port=self.destination_port,
            protocol=self.protocol,
            start_time=start_dt,
            end_time=end_dt,
            duration=round(duration, 6),
            packet_count=self.packet_count,
            byte_count=self.byte_count,
            average_packet_size=round(avg_packet_size, 2),
            packets_per_second=round(pps, 2),
            bytes_per_second=round(bps, 2),
            average_interarrival_time=round(avg_iat, 6),
            tcp_syn_count=self.tcp_syn_count,
            tcp_ack_count=self.tcp_ack_count,
            tcp_fin_count=self.tcp_fin_count,
            tcp_rst_count=self.tcp_rst_count,
        )


def process_pcap_file(import_id: int):
    """
    Worker function to stream packets from uploaded PCAP/PCAPNG,
    aggregate unidirectional flows, and persist flow metadata to PostgreSQL.
    """
    db: Session = SessionLocal()
    import_record = db.get(PcapImportModel, import_id)
    if not import_record:
        logger.error(f"PcapImport {import_id} not found.")
        db.close()
        return

    import_record.status = "processing"
    import_record.processing_started_at = datetime.now(timezone.utc)
    # Clean up any existing flows if re-running to maintain strict idempotence
    db.query(TrafficFlowModel).filter(TrafficFlowModel.import_id == import_id).delete()
    db.commit()

    file_path = os.path.join(settings.UPLOAD_DIR, import_record.stored_filename)

    try:
        capture_type = validate_pcap_header(file_path)
    except PcapValidationError as err:
        import_record.status = "failed"
        import_record.error_message = str(err)
        import_record.processing_completed_at = datetime.now(timezone.utc)
        db.commit()
        db.close()
        return

    # Choose streaming reader
    ReaderCls = PcapNgReader if capture_type == "pcapng" else PcapReader

    flow_table: Dict[Tuple[str, Optional[int], str, Optional[int], str], DirectionalFlowAccumulator] = {}
    total_packets = 0
    skipped_packets = 0

    try:
        with ReaderCls(file_path) as reader:
            for packet in reader:
                total_packets += 1

                # Extract IP layer
                src_ip: Optional[str] = None
                dst_ip: Optional[str] = None

                if packet.haslayer(IP):
                    ip_layer = packet[IP]
                    src_ip = ip_layer.src
                    dst_ip = ip_layer.dst
                elif packet.haslayer(IPv6):
                    ip_layer = packet[IPv6]
                    src_ip = ip_layer.src
                    dst_ip = ip_layer.dst
                else:
                    skipped_packets += 1
                    continue

                # Extract Transport layer & ports
                protocol = "IP"
                src_port: Optional[int] = None
                dst_port: Optional[int] = None
                tcp_flags = None

                if packet.haslayer(TCP):
                    protocol = "TCP"
                    tcp_layer = packet[TCP]
                    src_port = int(tcp_layer.sport)
                    dst_port = int(tcp_layer.dport)
                    tcp_flags = tcp_layer.flags
                elif packet.haslayer(UDP):
                    protocol = "UDP"
                    udp_layer = packet[UDP]
                    src_port = int(udp_layer.sport)
                    dst_port = int(udp_layer.dport)
                elif packet.haslayer(ICMP):
                    protocol = "ICMP"
                else:
                    # Non-TCP/UDP/ICMP protocol
                    protocol = getattr(ip_layer, "proto", "OTHER")
                    protocol = str(protocol).upper()

                pkt_len = len(packet)
                pkt_time = float(getattr(packet, "time", datetime.now().timestamp()))

                # Ordered Directional Flow Key:
                # Forward only. (A->B is strictly separate from B->A)
                flow_key = (src_ip, src_port, dst_ip, dst_port, protocol)

                if flow_key not in flow_table:
                    flow_table[flow_key] = DirectionalFlowAccumulator(flow_key)

                flow_table[flow_key].add_packet(pkt_len, pkt_time, tcp_flags)

    except Scapy_Exception as s_err:
        logger.warning(f"Scapy encountered an issue while streaming {file_path}: {s_err}")
    except Exception as exc:
        logger.error(f"Error parsing capture file {file_path}: {exc}", exc_info=True)
        import_record.status = "failed"
        import_record.error_message = f"Parser error: {str(exc)}"
        import_record.processing_completed_at = datetime.now(timezone.utc)
        db.commit()
        db.close()
        return

    # Persist accumulated directional flows in batches
    flow_models = [
        acc.to_model(import_id=import_record.id, server_id=import_record.server_id)
        for acc in flow_table.values()
    ]

    try:
        # Batch insert
        BATCH_SIZE = 1000
        for i in range(0, len(flow_models), BATCH_SIZE):
            db.bulk_save_objects(flow_models[i:i + BATCH_SIZE])
            db.commit()

        import_record.status = "completed"
        import_record.total_packets = total_packets
        import_record.total_flows = len(flow_models)
        import_record.error_message = None if skipped_packets == 0 else f"{skipped_packets} non-IP or unparseable packets skipped."
        import_record.processing_completed_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as save_err:
        logger.error(f"Failed to save flows for import {import_id}: {save_err}", exc_info=True)
        db.rollback()
        import_record.status = "failed"
        import_record.error_message = f"Database save error: {str(save_err)}"
        import_record.processing_completed_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()

"""
Pytest configuration and shared fixtures for SENTRA integration, performance, and validation tests.
"""

import os
import sys
import io
import random
import tempfile
import shutil
import pytest
import numpy as np

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from scapy.all import wrpcap, Ether, IP, TCP, UDP, DNS, DNSQR, Raw
from app.main import app
from app.database import SessionLocal
from app.models.server import MonitoredServerModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.pcap_import import PcapImportModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.detection_job import DetectionJobModel


@pytest.fixture(autouse=True)
def set_deterministic_seeds():
    """Ensure reproducible random state across all test modules."""
    random.seed(42)
    np.random.seed(42)


@pytest.fixture(scope="session")
def test_client():
    """Shared FastAPI TestClient."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """
    Yields a database session and safely closes it after each test.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="session")
def test_server_id():
    """
    Ensures a designated test server exists for integration testing.
    """
    db = SessionLocal()
    try:
        server = db.query(MonitoredServerModel).filter_by(name="SIH-26145 Test Server").first()
        if not server:
            server = MonitoredServerModel(
                name="SIH-26145 Test Server",
                hostname="sih-validator.sentra.local",
                ip_address="10.0.0.99",
                server_type="Core API Gateway",
                environment="production",
                traffic_source="PCAP",
                status="active",
                description="Dedicated monitored server for Phase 7 validation and integration testing"
            )
            db.add(server)
            db.commit()
            db.refresh(server)
        return server.id
    finally:
        db.close()


@pytest.fixture
def test_import_id(test_server_id):
    """
    Ensures a designated test PCAP import record exists for foreign key constraints.
    """
    from app.models.pcap_import import PcapImportModel
    db = SessionLocal()
    try:
        imp = db.query(PcapImportModel).filter_by(original_filename="test_fixture.pcap").first()
        if not imp:
            imp = PcapImportModel(
                server_id=test_server_id,
                original_filename="test_fixture.pcap",
                stored_filename="test_fixture_stored.pcap",
                file_size=1024,
                status="completed",
                total_packets=10,
                total_flows=1,
            )
            db.add(imp)
            db.commit()
            db.refresh(imp)
        return imp.id
    finally:
        db.close()


@pytest.fixture
def temp_artifact_dir():
    """Creates an isolated temporary directory for test file operations."""
    temp_dir = tempfile.mkdtemp(prefix="sentra_test_artifacts_")
    try:
        yield temp_dir
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def packets_to_pcap_bytes(packets) -> bytes:
    """Safely serializes Scapy packets to PCAP bytes via a temporary file."""
    with tempfile.NamedTemporaryFile(suffix=".pcap", delete=False) as tmp:
        tmp_name = tmp.name
    try:
        wrpcap(tmp_name, packets)
        with open(tmp_name, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)


class SyntheticTrafficGenerator:
    """
    Generates deterministic in-memory PCAP captures for both benign traffic
    and distinct cyber threat categories (DDoS, Port Scan, DNS Tunneling, Exfiltration).
    """

    @staticmethod
    def generate_benign_traffic(packet_count: int = 20) -> bytes:
        """Standard unidirectional web/DNS requests toward monitored node."""
        packets = []
        base_time = 1770000000.0
        for i in range(packet_count):
            pkt_time = base_time + (i * 0.05)
            if i % 2 == 0:
                pkt = (
                    Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") /
                    IP(src=f"192.168.1.{10 + (i % 5)}", dst="10.0.0.99") /
                    TCP(sport=49152 + i, dport=80, flags="A") /
                    Raw(load=b"GET /index.html HTTP/1.1\r\nHost: 10.0.0.99\r\n\r\n")
                )
            else:
                pkt = (
                    Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") /
                    IP(src=f"192.168.1.{10 + (i % 5)}", dst="10.0.0.99") /
                    UDP(sport=53000 + i, dport=53) /
                    DNS(rd=1, qd=DNSQR(qname=f"api-{i}.sentra.internal"))
                )
            pkt.time = pkt_time
            packets.append(pkt)

        return packets_to_pcap_bytes(packets)

    @staticmethod
    def generate_ddos_syn_flood(packet_count: int = 150) -> bytes:
        """High-rate unidirectional SYN flood targeting a single port."""
        packets = []
        base_time = 1770000000.0
        for i in range(packet_count):
            pkt_time = base_time + (i * 0.0002)  # 5,000 PPS
            pkt = (
                Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") /
                IP(src=f"198.51.100.{1 + (i % 10)}", dst="10.0.0.99") /
                TCP(sport=30000 + i, dport=443, flags="S", seq=1000 + i)
            )
            pkt.time = pkt_time
            packets.append(pkt)

        return packets_to_pcap_bytes(packets)

    @staticmethod
    def generate_port_scan(port_count: int = 50) -> bytes:
        """Reconnaissance scan sweeping sequential destination ports."""
        packets = []
        base_time = 1770000000.0
        for i in range(port_count):
            pkt_time = base_time + (i * 0.01)
            target_port = 20 + i  # Sweep ports 20-70
            pkt = (
                Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") /
                IP(src="203.0.113.150", dst="10.0.0.99") /
                TCP(sport=61000, dport=target_port, flags="S")
            )
            pkt.time = pkt_time
            packets.append(pkt)

        return packets_to_pcap_bytes(packets)

    @staticmethod
    def generate_dns_tunneling(packet_count: int = 30) -> bytes:
        """High-entropy anomalous subdomains simulating C2 data exfiltration over DNS."""
        packets = []
        base_time = 1770000000.0
        import base64
        for i in range(packet_count):
            pkt_time = base_time + (i * 0.08)
            encoded_payload = base64.b32encode(f"chunk_{i}_secret_payload_{i*999}".encode()).decode().lower()
            pkt = (
                Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") /
                IP(src="192.168.1.188", dst="10.0.0.99") /
                UDP(sport=55123, dport=53) /
                DNS(rd=1, qd=DNSQR(qname=f"{encoded_payload[:25]}.exfil-c2.net"))
            )
            pkt.time = pkt_time
            packets.append(pkt)

        return packets_to_pcap_bytes(packets)


@pytest.fixture
def traffic_generator():
    """Provides access to the SyntheticTrafficGenerator helper."""
    return SyntheticTrafficGenerator


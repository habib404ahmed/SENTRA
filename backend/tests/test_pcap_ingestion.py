import os
import sys
import io
import time
import pytest

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from scapy.all import wrpcap, Ether, IP, TCP, UDP, ICMP
from app.main import app
from app.database import SessionLocal
from app.models.server import MonitoredServerModel
from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.services.pcap_service import process_pcap_file, validate_pcap_header, PcapValidationError

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_test_server():
    db = SessionLocal()
    # Check or create a test server
    server = db.query(MonitoredServerModel).filter_by(name="Ingestion Test Server").first()
    if not server:
        server = MonitoredServerModel(
            name="Ingestion Test Server",
            hostname="ingest.local",
            ip_address="10.0.0.25",
            server_type="Test Server",
            environment="development",
            traffic_source="PCAP",
            status="active",
            description="Server used for automated ingestion testing"
        )
        db.add(server)
        db.commit()
        db.refresh(server)
    server_id = server.id
    db.close()
    yield server_id


import tempfile

def create_synthetic_pcap_bytes() -> bytes:
    """
    Creates a synthetic PCAP in memory with:
    - 2 packets from 192.168.1.10:80 to 10.0.0.1:443 (TCP SYN, ACK)
    - 1 reverse packet from 10.0.0.1:443 to 192.168.1.10:80 (TCP SYN/ACK)
    - 2 UDP packets from 172.16.0.5:53 to 10.0.0.1:5353
    """
    pkts = [
        # Explicit ethernet MACs so Scapy does not query Windows ARP/winpcap
        Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="192.168.1.10", dst="10.0.0.1") / TCP(sport=80, dport=443, flags="S"),
        Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="192.168.1.10", dst="10.0.0.1") / TCP(sport=80, dport=443, flags="A"),
        # Reverse flow 2 (Packet 3) - MUST REMAIN A SEPARATE DIRECTIONAL FLOW
        Ether(src="66:77:88:99:aa:bb", dst="00:11:22:33:44:55") / IP(src="10.0.0.1", dst="192.168.1.10") / TCP(sport=443, dport=80, flags="SA"),
        # UDP flow 3 (Packets 4 & 5)
        Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="172.16.0.5", dst="10.0.0.1") / UDP(sport=53, dport=5353) / b"DNS_QUERY_DATA",
        Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="172.16.0.5", dst="10.0.0.1") / UDP(sport=53, dport=5353) / b"DNS_QUERY_DATA_2",
    ]
    with tempfile.NamedTemporaryFile(suffix=".pcap", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        wrpcap(tmp_path, pkts)
        with open(tmp_path, "rb") as f:
            data = f.read()
        return data
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_health_endpoints():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

    res_db = client.get("/api/health/db")
    assert res_db.status_code == 200
    assert res_db.json()["database"] == "connected"


def test_reject_empty_upload():
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/ingestion/pcap",
        files={"file": ("empty.pcap", empty_file, "application/vnd.tcpdump.pcap")}
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_reject_invalid_magic_bytes():
    fake_pcap = io.BytesIO(b"THIS IS NOT A VALID PCAP FILE CONTENT")
    res = client.post(
        "/api/ingestion/pcap",
        files={"file": ("fake.pcap", fake_pcap, "application/vnd.tcpdump.pcap")}
    )
    assert res.status_code == 400
    assert "magic bytes" in res.json()["detail"].lower() or "unsupported" in res.json()["detail"].lower()


def test_reject_invalid_extension():
    pcap_data = create_synthetic_pcap_bytes()
    res = client.post(
        "/api/ingestion/pcap",
        files={"file": ("capture.txt", io.BytesIO(pcap_data), "text/plain")}
    )
    assert res.status_code == 400
    assert "extension" in res.json()["detail"].lower()


def test_upload_and_directional_flow_separation(setup_test_server):
    server_id = setup_test_server
    pcap_bytes = create_synthetic_pcap_bytes()

    res = client.post(
        "/api/ingestion/pcap",
        data={"server_id": server_id},
        files={"file": ("synthetic_traffic.pcap", io.BytesIO(pcap_bytes), "application/vnd.tcpdump.pcap")}
    )
    assert res.status_code == 202
    data = res.json()
    assert "id" in data
    import_id = data["id"]
    assert data["status"] in ("queued", "processing", "completed")
    assert data["original_filename"] == "synthetic_traffic.pcap"

    # Synchronously run process_pcap_file to ensure processing completes in test
    process_pcap_file(import_id)

    # Verify import status
    res_status = client.get(f"/api/ingestion/{import_id}")
    assert res_status.status_code == 200
    import_details = res_status.json()
    assert import_details["status"] == "completed"
    assert import_details["total_packets"] == 5
    assert import_details["total_flows"] == 3  # 1 forward TCP, 1 reverse TCP, 1 UDP

    # Fetch flows for this import
    res_flows = client.get(f"/api/ingestion/{import_id}/flows")
    assert res_flows.status_code == 200
    flows_data = res_flows.json()
    assert flows_data["total"] == 3
    flows = flows_data["items"]

    # Test DIRECTIONAL FLOW SEPARATION:
    # 1. Forward flow: 192.168.1.10:80 -> 10.0.0.1:443
    forward_flow = next((f for f in flows if f["source_ip"] == "192.168.1.10" and f["destination_ip"] == "10.0.0.1"), None)
    assert forward_flow is not None
    assert forward_flow["source_port"] == 80
    assert forward_flow["destination_port"] == 443
    assert forward_flow["protocol"] == "TCP"
    assert forward_flow["packet_count"] == 2
    assert forward_flow["tcp_syn_count"] == 1
    assert forward_flow["tcp_ack_count"] == 1

    # 2. Reverse flow: 10.0.0.1:443 -> 192.168.1.10:80 (MUST BE SEPARATE)
    reverse_flow = next((f for f in flows if f["source_ip"] == "10.0.0.1" and f["destination_ip"] == "192.168.1.10"), None)
    assert reverse_flow is not None
    assert reverse_flow["id"] != forward_flow["id"]
    assert reverse_flow["source_port"] == 443
    assert reverse_flow["destination_port"] == 80
    assert reverse_flow["protocol"] == "TCP"
    assert reverse_flow["packet_count"] == 1
    assert reverse_flow["tcp_syn_count"] == 1
    assert reverse_flow["tcp_ack_count"] == 1

    # 3. UDP flow: 172.16.0.5:53 -> 10.0.0.1:5353
    udp_flow = next((f for f in flows if f["protocol"] == "UDP"), None)
    assert udp_flow is not None
    assert udp_flow["source_ip"] == "172.16.0.5"
    assert udp_flow["destination_ip"] == "10.0.0.1"
    assert udp_flow["source_port"] == 53
    assert udp_flow["destination_port"] == 5353
    assert udp_flow["packet_count"] == 2
    assert udp_flow["tcp_syn_count"] == 0
    assert udp_flow["byte_count"] > 0
    assert udp_flow["average_packet_size"] > 0


def test_global_flows_filtering_and_pagination():
    # Test protocol filter
    res_tcp = client.get("/api/flows?protocol=TCP")
    assert res_tcp.status_code == 200
    for flow in res_tcp.json()["items"]:
        assert flow["protocol"] == "TCP"

    # Test single flow retrieval
    all_flows = client.get("/api/flows?limit=1").json()
    if all_flows["total"] > 0:
        first_id = all_flows["items"][0]["id"]
        res_single = client.get(f"/api/flows/{first_id}")
        assert res_single.status_code == 200
        assert res_single.json()["id"] == first_id

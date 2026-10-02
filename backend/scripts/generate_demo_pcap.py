import os
import sys
from scapy.all import wrpcap, Ether, IP, TCP, UDP, ICMP

# Ensure backend root on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "demo_enterprise_traffic.pcap")

packets = [
    # 1. Forward Web Client Traffic -> E-Commerce Web Server (10.0.0.10)
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="192.168.1.105", dst="10.0.0.10") / TCP(sport=52431, dport=443, flags="S"),
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="192.168.1.105", dst="10.0.0.10") / TCP(sport=52431, dport=443, flags="A") / b"GET /api/v1/catalog HTTP/1.1\r\nHost: ecommerce.local\r\n\r\n",
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="192.168.1.105", dst="10.0.0.10") / TCP(sport=52431, dport=443, flags="PA") / b"DATA_PAYLOAD_CHUNK_1",
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="192.168.1.105", dst="10.0.0.10") / TCP(sport=52431, dport=443, flags="FA"),

    # 2. Reverse Web Server -> Client (Unidirectional: MUST be stored as independent directional flow)
    Ether(src="66:77:88:99:aa:bb", dst="00:11:22:33:44:55") / IP(src="10.0.0.10", dst="192.168.1.105") / TCP(sport=443, dport=52431, flags="SA"),
    Ether(src="66:77:88:99:aa:bb", dst="00:11:22:33:44:55") / IP(src="10.0.0.10", dst="192.168.1.105") / TCP(sport=443, dport=52431, flags="PA") / b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n",

    # 3. DNS Telemetry Queries (UDP)
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="10.0.0.10", dst="1.1.1.1") / UDP(sport=61200, dport=53) / b"\x00\x01\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x07gateway\x05local\x00\x00\x01\x00\x01",
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="10.0.0.10", dst="1.1.1.1") / UDP(sport=61200, dport=53) / b"\x00\x02\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03api\x05local\x00\x00\x01\x00\x01",

    # 4. Internal Database Microservice (PostgreSQL Port 5432)
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="10.0.0.10", dst="10.0.0.50") / TCP(sport=48912, dport=5432, flags="S"),
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="10.0.0.10", dst="10.0.0.50") / TCP(sport=48912, dport=5432, flags="PA") / b"SELECT * FROM inventory WHERE status='ready';",
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="10.0.0.10", dst="10.0.0.50") / TCP(sport=48912, dport=5432, flags="A"),

    # 5. ICMP Keepalive Ping
    Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") / IP(src="10.0.0.10", dst="10.0.0.1") / ICMP(type=8, code=0) / b"PING_KEEPALIVE_TELEMETRY",
]

wrpcap(output_path, packets)
print(f"Generated demo PCAP with {len(packets)} packets at: {output_path}")

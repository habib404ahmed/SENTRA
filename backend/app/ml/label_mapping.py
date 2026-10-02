"""
Standardized Threat Label Mapping for SENTRA.
Maps heterogeneous public dataset attack labels (CIC-IDS, UNSW-NB15, CSE-CIC, etc.)
into SENTRA's standardized threat taxonomy.
"""

from typing import Dict, Optional

# Master SENTRA Threat Categories
STANDARD_CLASSES = [
    "Normal",
    "DDoS",
    "Reconnaissance",
    "Botnet",
    "DNS Tunneling",
    "Data Exfiltration",
]

# Heterogeneous dataset alias mapping dictionary
LABEL_ALIASES: Dict[str, str] = {
    # Benign / Normal
    "benign": "Normal",
    "normal": "Normal",
    "clean": "Normal",
    "background": "Normal",

    # Denial of Service / Distributed Denial of Service
    "ddos": "DDoS",
    "dos": "DDoS",
    "dos hulk": "DDoS",
    "dos goldeneye": "DDoS",
    "dos slowloris": "DDoS",
    "dos slowhttptest": "DDoS",
    "ddos attacks-loic-http": "DDoS",
    "ddos-loic-udp": "DDoS",
    "ddos-hoic": "DDoS",
    "syn flood": "DDoS",
    "udp flood": "DDoS",

    # Reconnaissance / Scanning / Probing
    "portscan": "Reconnaissance",
    "port scan": "Reconnaissance",
    "reconnaissance": "Reconnaissance",
    "probe": "Reconnaissance",
    "ipsweep": "Reconnaissance",
    "nmap": "Reconnaissance",
    "vulnerability scan": "Reconnaissance",

    # Botnet / Command & Control
    "bot": "Botnet",
    "botnet": "Botnet",
    "ares": "Botnet",
    "mirai": "Botnet",
    "c2": "Botnet",
    "command and control": "Botnet",

    # DNS Tunneling / Exfiltration
    "dns tunneling": "DNS Tunneling",
    "dns_tunnel": "DNS Tunneling",
    "dnscat2": "DNS Tunneling",
    "iodine": "DNS Tunneling",

    # Data Exfiltration / Infiltration
    "infiltration": "Data Exfiltration",
    "exfiltration": "Data Exfiltration",
    "data exfiltration": "Data Exfiltration",
    "backdoor": "Data Exfiltration",
    "theft": "Data Exfiltration",
}


def map_label(raw_label: Optional[str]) -> str:
    """
    Maps an arbitrary raw dataset label to a canonical SENTRA category.
    Defaults to 'Normal' if label is missing, or maps through case-insensitive dictionary.
    """
    if not raw_label:
        return "Normal"

    clean_str = str(raw_label).strip().lower()
    if clean_str in LABEL_ALIASES:
        return LABEL_ALIASES[clean_str]

    # Partial keyword heuristic fallback
    if "ddos" in clean_str or "dos" in clean_str or "flood" in clean_str:
        return "DDoS"
    if "scan" in clean_str or "probe" in clean_str or "recon" in clean_str:
        return "Reconnaissance"
    if "bot" in clean_str:
        return "Botnet"
    if "dns" in clean_str and "tunnel" in clean_str:
        return "DNS Tunneling"
    if "exfil" in clean_str or "theft" in clean_str:
        return "Data Exfiltration"

    # Default fallback for unmapped non-benign
    return "Other Malicious"

# SENTRA — AI-Based Detection of Cyber Threats in Unidirectional IP Traffic

> **Smart India Hackathon 2026**  
> **Problem Statement ID:** 26145  
> **Official Problem Statement:** AI-Based Detection of Cyber Threats in Unidirectional IP Traffic  
> **Team:** Sentra 1  
> **Team ID:** 191970  
> **Theme:** Blockchain & Cybersecurity  
> **Category:** Software / Hardware  

---

## 🛡️ Executive Summary

**SENTRA** is an enterprise-grade Security Operations Center (SOC) and passive network security monitoring platform engineered specifically for **unidirectional IP networks** (such as optical data diodes, hardware simplex fiber links, and passive network taps).

In high-security networks (defense, nuclear plants, SCADA, critical financial backbones), unidirectional physical boundaries allow inbound telemetry while physically severing the reverse transmission path. Traditional intrusion detection systems (IDS) fail in unidirectional scenarios because they depend on bidirectional TCP handshakes, return ACKs, and active host interrogation.

**SENTRA solves this problem** by extracting high-dimensional forward flow characteristics, inter-arrival time (IAT) statistics, payload entropy, and spectral features to detect cyber threats passively in real time without generating any return-path network emissions.

---

## 🏗️ System Architecture (Phase 3 Pipeline)

```text
Authorized Capture File (.pcap / .pcapng)
             │
             ▼  Multipart POST /api/ingestion/pcap
      FastAPI Upload & Header Validation (Magic Bytes & Size Verification)
             │
             ▼  Background Streaming Parser (Scapy PcapReader / PcapNgReader)
Directional 5-Tuple Aggregation (Src IP, Src Port, Dst IP, Dst Port, Protocol)
  [Forward only: reverse traffic is strictly separated as independent flows]
             │
             ▼  SQLAlchemy 2.x Batch Insert
    PostgreSQL 18 Database (`pcap_imports` & `traffic_flows`)
             │
             ▼  REST APIs & Real-Time Polling (/api/ingestion, /api/flows)
SENTRA SOC Console (React 19 + TypeScript + Flow Explorer + Telemetry Modal)
```

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI + Pydantic v2 + Uvicorn + Scapy
- **Database:** PostgreSQL 18
- **ORM:** SQLAlchemy 2.x
- **Schema Migrations:** Alembic
- **DB Driver:** `psycopg` (v3 with binary wheels)

---

## 🚀 Implementation Status

### Phase 1: High-Density SOC Frontend & User Experience (Completed)
- [x] Complete SOC console with dark-first, contrast-compliant cybersecurity aesthetics.
- [x] Multi-page navigation: Overview Dashboard, Monitored Servers, Threat Alerts, Traffic Analytics, Threat Intelligence, Reports, Settings.
- [x] Interactive data tables, waveform graphs, donut distributions, and detail modals.

### Phase 2: FastAPI + PostgreSQL + SQLAlchemy + Alembic Integration (Completed)
- [x] Dedicated PostgreSQL `sentra` database with environment credentials.
- [x] Alembic schema migrations for `monitored_servers`.
- [x] Full CRUD server REST endpoints with Pydantic validation.
- [x] Interactive OpenAPI / Swagger UI at `http://localhost:8000/docs`.
- [x] Connected frontend servers management with real-time feedback.

### Phase 3: Network Traffic Ingestion & PCAP Processing (Completed)
- [x] **Secure PCAP/PCAPNG Uploads:**
  - File format validation (`.pcap`, `.pcapng`, `.cap`)
  - Deep magic bytes verification (standard microsecond & nanosecond PCAP, PCAPNG Section Header Block `0x0A0D0D0A`)
  - Configurable file size limits (default: 100 MB)
  - Safe generated filesystem paths (`UUID4.ext`) stored outside public web roots
  - Non-blocking background task parsing
- [x] **Streaming Packet Parsing & Unidirectional Flow Aggregation:**
  - Streaming reader (`PcapReader` / `PcapNgReader`) prevents loading large captures into memory
  - **Strict Directional Flow Separation:** Ordered 5-tuple `(source_ip, source_port, destination_ip, destination_port, protocol)`. Reverse traffic is **never merged**, reflecting unidirectional diode realities.
  - Graceful handling of IPv4, IPv6, TCP, UDP, ICMP, and non-IP packets
  - $O(1)$ memory streaming calculation for durations, average packet size, PPS, BPS, and average inter-arrival time (IAT)
  - Extraction of TCP control flag counters (SYN, ACK, FIN, RST) without persisting raw packet payloads
- [x] **PostgreSQL Schema & Migrations:**
  - `pcap_imports` table tracking upload lifecycle (`queued`, `processing`, `completed`, `failed`), total packets, and total flows
  - `traffic_flows` table indexing endpoints, ports, protocols, and metadata
- [x] **REST APIs:**
  - `POST /api/ingestion/pcap`: Upload capture file and queue processing
  - `GET /api/ingestion`: List import history with status and server filters
  - `GET /api/ingestion/{id}`: Detailed processing state of single import
  - `GET /api/ingestion/{id}/flows`: Directional flows extracted from an import
  - `GET /api/flows`: Global flow explorer with multi-factor search and pagination
  - `GET /api/flows/{id}`: Deep directional metadata inspection
- [x] **Frontend UI Integration:**
  - Dedicated **Traffic Ingestion** navigation view
  - Drag-and-drop / Browse upload card with live size checking and server association
  - Real-time import history table with auto-polling while processing
  - Interactive **Flow Explorer** with IP, Port, and Protocol filtering
  - **Directional Flow Details Modal** showing 5-tuple telemetry, throughput rates, and TCP control flag visual meters
  - Overview KPI integration displaying actual ingested flows and packet counts
- [x] **Automated Test Suite:**
  - End-to-end tests covering upload validation, empty file rejection, invalid magic bytes, directional flow separation, and API pagination.

---

## 💻 Local Setup Guide

### Prerequisites
- **Node.js:** `v18+` (npm `v9+`)
- **Python:** `v3.10+` (tested with Python 3.12 and 3.14)
- **PostgreSQL:** Local PostgreSQL server running on port `5432`

---

### Step 1: Install PostgreSQL & Create Database
Ensure PostgreSQL is running locally on port `5432`:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE sentra;"
```

---

### Step 2: Configure Backend Environment Variables
In the `backend/` directory, copy `.env.example` to `.env`:

```bash
cd backend
cp .env.example .env
```

Verify your `.env` settings:
```ini
DATABASE_URL=postgresql+psycopg://postgres:sentra123@localhost:5432/sentra
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
```

*(Note: `.env` is git-ignored and never committed).*

---

### Step 3: Install Python Dependencies
```bash
# Using uv (recommended):
uv venv .venv
uv pip install -r requirements.txt --python .venv\Scripts\python.exe

# Or standard pip:
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

---

### Step 4: Run Database Migrations
Apply Alembic migrations to create tables:

```bash
alembic upgrade head
```

---

### Step 5: Start the FastAPI Backend
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Root:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Ingestion API:** [http://localhost:8000/api/ingestion](http://localhost:8000/api/ingestion)
- **Flow Explorer API:** [http://localhost:8000/api/flows](http://localhost:8000/api/flows)

---

### Step 6: Start React Frontend
In the project root:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Step 7: Run Backend Test Suite
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

---

## 🔮 Future Roadmap (Phase 4 & Beyond)

- **Phase 4: AI / Machine Learning Engine**
  - Supervised Classification: XGBoost and Random Forest ensembles for known threat signatures (DDoS, Port Scan, DNS Tunneling).
  - Unsupervised Anomaly Detection: Isolation Forest and Autoencoders for novel zero-day exfiltration patterns.
  - Feature extraction mapping directional flow metadata to model feature vectors.
- **Phase 5: Real-Time Flow Telemetry & SIEM Integration**
  - Live socket tap streaming (AF_PACKET / DPDK zero-copy ring buffer).
  - WebSocket / SSE live alert streaming connecting directly into the `sentraApi` abstraction.
  - Integration with organizational SIEMs (Elasticsearch, Splunk, Syslog).

---

## ⚖️ Analytical Terminology & Disclaimer

In alignment with professional cybersecurity forensics standards:
- All external addresses are referred to as **"Observed Source IPs"** rather than definitive attacker identities.
- AI inferences are expressed as **"Model Confidence Scores"** rather than absolute probabilities.
- Deviations in network telemetry are characterized as **"Suspicious Traffic Patterns"** or **"Potential Threats"**.
- This phase handles traffic ingestion and flow metadata extraction. Machine learning threat detection is scheduled for Phase 4.

---

**Team Sentra 1 — Smart India Hackathon 2026**

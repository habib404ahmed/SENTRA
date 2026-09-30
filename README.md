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

## 🏗️ System Architecture (Phase 2 Connected)

```text
React 19 + TypeScript (Vite Frontend)
             │
             ▼  REST API (CORS restricted, configurable base URL)
     FastAPI Backend (Python 3.12 / 3.14)
             │
             ▼  SQLAlchemy 2.x ORM
     PostgreSQL 18 Database (sentra)
             ▲
             │  Migrations & Versioning
       Alembic Migrations
```

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI + Pydantic v2 + Uvicorn
- **Database:** PostgreSQL
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
- [x] **PostgreSQL Database:** Dedicated `sentra` database configured with credentials via environment variables (never committed to git).
- [x] **Alembic Schema Migrations:** Auto-generated and applied migration for `monitored_servers` and scaffolded `threat_alerts` tables.
- [x] **FastAPI REST API:** Full CRUD endpoints with Pydantic validation for server registration, retrieval, modification, and deregistration:
  - `GET /api/health` — API liveness probe
  - `GET /api/health/db` — PostgreSQL active connection verification
  - `GET /api/servers` — Retrieve all monitored assets from PostgreSQL
  - `GET /api/servers/{id}` — Retrieve asset details by ID
  - `POST /api/servers` — Register a new monitored asset (with IP & field validations)
  - `PUT /api/servers/{id}` — Update asset configuration and monitoring status
  - `DELETE /api/servers/{id}` — Deregister and remove asset from database
- [x] **Interactive Documentation:** Automatic OpenAPI / Swagger UI at `http://localhost:8000/docs`.
- [x] **Clean Frontend API Layer:** Modular `src/services/servers.ts` client with base URL environment configuration (`VITE_API_BASE_URL`).
- [x] **Connected UI Components:**
  - Real database list in `ServerTable.tsx`
  - Real server registration through `AddServerModal.tsx`
  - Real server editing through `EditServerModal.tsx`
  - Real server deletion with confirmation modal
  - Real-time pause/resume monitoring status toggle
  - Asset details modal connected to database records
  - Loading skeletons, error state banners with retry triggers, and success toasts.
- [x] **Controlled Demonstration Server:** Seeded demo server `E-Commerce Web Server` (`10.0.0.10`, `ecommerce.local`, `Demo`, `Flow Telemetry`).
- [x] **Preserved Phase 1 Demo Modules:** Analytics, Threat Intelligence, and Alert feeds remain clearly labeled as simulated telemetry pending later ML phases.

---

## 💻 Local Setup Guide

Follow these steps to run the complete SENTRA stack (Frontend + Backend + PostgreSQL) locally:

### Prerequisites
- **Node.js:** `v18+` (npm `v9+`)
- **Python:** `v3.10+` (tested with Python 3.12 and 3.14)
- **PostgreSQL:** Local PostgreSQL server running on port `5432`

---

### Step 1: Install PostgreSQL & Create Database
Ensure PostgreSQL is running locally on port `5432`. Connect via `psql` or pgAdmin and create the `sentra` database:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE sentra;"
```

---

### Step 2: Configure Backend Environment Variables
Navigate to the `backend/` directory and copy `.env.example` to `.env`:

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

*(Note: `.env` is listed in `.gitignore` and is never committed to GitHub).*

---

### Step 3: Install Python Backend Dependencies
Create a virtual environment and install the required packages:

```bash
# Using standard venv
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\activate
pip install -r requirements.txt

# Or using uv (ultra-fast):
uv venv .venv
uv pip install -r requirements.txt --python .venv\Scripts\python.exe
```

---

### Step 4: Run Alembic Database Migrations
Apply the database migrations to set up the `monitored_servers` and `threat_alerts` tables in PostgreSQL:

```bash
alembic upgrade head
```

---

### Step 5: Start the FastAPI Backend
Launch the API server with Uvicorn:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Root:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **DB Health Check:** [http://localhost:8000/api/health/db](http://localhost:8000/api/health/db)

---

### Step 6: Configure & Start React Frontend
In the root directory, configure the frontend `.env` (optional, defaults to `http://localhost:8000`):

```bash
cp .env.example .env
```

Install frontend packages and start Vite:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Step 7: Build for Production
To test the production build:

```bash
npm run build
```

---

## 🔮 Future Roadmap (Phase 3 & Beyond)

- **Phase 3: AI / Machine Learning Engine**
  - Supervised Classification: XGBoost and Random Forest ensembles for known threat signatures (DDoS, Port Scan, DNS Tunneling).
  - Unsupervised Anomaly Detection: Isolation Forest and Autoencoders for novel zero-day exfiltration patterns.
  - Temporal Model: LSTM / GRU networks for low-frequency C2 periodic beaconing.
- **Phase 4: Network Ingestion & Real-Time Flow Extraction**
  - Passive optical tap driver and zero-copy ring buffer packet capture (PCAP / DPDK).
  - NetFlow v9 / IPFIX streaming telemetry parsers.
  - Forward-only flow feature extraction (packet inter-arrival time, window variance, entropy calculation).
- **Phase 5: Production SOC Live Ingestion & SIEM Integration**
  - WebSocket / SSE live alert streaming connecting directly into the `sentraApi` abstraction.
  - Integration with organizational SIEMs (Elasticsearch, Splunk, Syslog).

---

## ⚖️ Analytical Terminology & Disclaimer

In alignment with professional cybersecurity forensics standards:
- All external addresses are referred to as **"Observed Source IPs"** rather than definitive attacker identities.
- AI inferences are expressed as **"Model Confidence Scores"** rather than absolute probabilities.
- Deviations in network telemetry are characterized as **"Suspicious Traffic Patterns"** or **"Potential Threats"**.
- Features without live stream ingestion in Phase 2 are clearly labeled as **"Demo Data"** or **"Simulated Telemetry"**.

---

**Team Sentra 1 — Smart India Hackathon 2026**

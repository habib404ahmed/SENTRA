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

### Phase 4: Feature Extraction and Dataset Preparation (Completed)
- [x] **Modular Feature Engineering Package (`backend/app/features/`):**
  - **Data Cleaning & Quality Reporting (`cleaning.py`):**
    - Cleans raw directional flows, imputes safe fallbacks, filters corrupt entries (negative packet counts, excessive clock skews) without discarding genuine anomalous attack flows (e.g. single-packet port scans or SYN floods).
    - Produces audit-grade `DataQualityReport` tracking total input, valid, invalid, duplicate, excluded records, and remediation actions.
  - **Flow-Level Statistical Extraction (`flow_features.py`):**
    - 19 transport-level metrics including zero-duration safe rate calculations (`packets_per_second`, `bytes_per_second`), average packet size, normalized port addresses (`[0, 1]`), ephemeral source flag, well-known destination flag, IANA protocol mapping (TCP=6, UDP=17, ICMP=1), TCP control flag counts and ratios (`syn_ratio`, `ack_ratio`, `rst_ratio`).
  - **Leakage-Free Retrospective Behavioral Windowing (`behavioral_features.py`):**
    - Calculates time-windowed behavioral metrics (`[t - W, t]`) using strictly backward-looking historical state queues:
      - `src_unique_dst_count`: Unique destination IPs contacted by source in window
      - `src_unique_dst_port_count`: Unique destination ports targeted by source in window
      - `dst_unique_src_count`: Unique source IPs contacting destination in window
      - `src_fan_out_ratio`: Ratio of unique destinations to total source connections
      - `repeated_connection_count`: Prior matching connections to same `(src_ip, dst_ip, dst_port)`
      - `avg_connection_interval`: Mean elapsed seconds between successive connections from source
    - **No Lookahead Bias:** Mathematically guarantees observations occurring after time $t$ are never utilized.
  - **DNS & TLS Transport Metadata (`dns_features.py`, `tls_features.py`):**
    - `is_dns_service`, `dns_query_len_estimate` (estimated L3/L4 payload length).
    - `is_tls_service`, `encrypted_flow_byte_ratio` (encapsulation efficiency relative to Ethernet MTU).
    - Never decrypts payloads; metadata alone does not imply malicious intent.
  - **Versioned Feature Schema (`v1.0.0` in `schemas.py` & `validation.py`):**
    - Master mathematical registry of 29 features with explicit data types, calculation formulas, source fields, and missing-value imputation policies.
    - Validates feature vectors against strict bounds and guarantees zero NaN/Inf contamination.
  - **Dataset Generation & Identifier Separation (`dataset_export.py`):**
    - Strictly isolates audit identifiers (IP addresses, MACs, flow IDs, server IDs, timestamps) from pure ML-ready numerical feature matrices to prevent target leakage and model bias.
    - Produces both **Unlabeled ML-Ready Datasets** (pure numerical matrices) and **Full Analyzed Datasets** (with audit columns) in both **CSV** and binary **Apache Parquet** (`pyarrow`) formats with SHA-256 verification.
- [x] **PostgreSQL Schema & Alembic Migrations:**
  - `feature_jobs`: Tracking extraction lifecycle (`queued`, `processing`, `completed`, `failed`), schema version, input/valid/invalid flow counts, and JSONB `quality_report`.
  - `flow_features`: High-performance JSONB storage of extracted feature dimensions per flow.
  - `feature_datasets`: Tracking generated CSV and Parquet files, row/column dimensions, and SHA-256 digests.
- [x] **REST APIs:**
  - `POST /api/features/extract`: Queue background feature extraction for an imported capture with configurable window duration.
  - `GET /api/features/jobs`: List extraction jobs and execution states.
  - `GET /api/features/jobs/{id}`: Detailed state and audit-grade quality report.
  - `GET /api/features`: Paginated flow feature query engine.
  - `GET /api/features/schema`: Active `v1.0.0` feature schema definitions.
  - `GET /api/datasets`: List generated dataset artifacts.
  - `GET /api/datasets/{id}/download`: Secure file download (CSV/Parquet) with path traversal security guards.
- [x] **Frontend UI Integration:**
  - Dedicated **Feature Engineering** page accessible via sidebar.
  - **Feature Extraction Launcher:** Modal allowing operators to select completed PCAP imports and tune behavioral retrospective window (60s, 300s, 600s).
  - **Extraction Jobs Table:** Displays real-time statuses with 3s auto-polling, flow counts, and instant audit inspection.
  - **Quality Audit Modal:** Visualizes total inputs, duplicate pruning, corrupt exclusions by reason, and missing value imputation logs.
  - **Generated Datasets Table:** Displays CSV and Parquet files with dimensions, file size, SHA-256 digests, and one-click download buttons.
  - **Feature Schema Explorer:** Searchable, scope-filterable table detailing all 29 feature definitions, calculation methods, and missing-value policies.
- [x] **Automated Test Suite (`backend/tests/`):**
  - 12 comprehensive unit and integration tests covering flow rates, zero-duration flows, data cleaning, behavioral windowing, schema validation, end-to-end pipeline, and API endpoints.

---

## 💻 Local Setup Guide

### Phase 5: AI/ML Model Development and Threat Detection (Completed)
- [x] **Modular Machine Learning Package (`backend/app/ml/`):**
  - **Label Mapping (`label_mapping.py`):** Canonical mapping resolving public benchmark datasets (CIC-IDS2017, CSE-CIC-IDS2018, UNSW-NB15) to SENTRA target threat classes (`Normal`, `DDoS`, `Reconnaissance`, `DNS Tunneling`, `Data Exfiltration`).
  - **Dataset Loader & Benchmark Generator (`dataset_loader.py`):** Strict feature schema validation conforming to SENTRA v1.0.0 (30 numerical features). Includes synthetic benchmark generation for reproducible offline testing.
  - **Leakage-Free Preprocessing (`preprocessing.py`):** Robust scaler fitting strictly on training partitions; test partitions remain completely isolated until final evaluation.
  - **Random Forest Threat Classifier (`classifier.py`):** Supervised multi-class ensemble with configurable estimators, max depth, class balancing, reproducible random seed, and Gini impurity (MDI) feature importance extraction.
  - **Isolation Forest Anomaly Detector (`anomaly_detector.py`):** Unsupervised tree isolation with configurable contamination parameter and anomaly score percentile calibration.
  - **Comprehensive Evaluator (`evaluation.py`):** Empirical, factual metric computation (Accuracy, Macro/Weighted Precision, Recall, F1, Per-Class breakdowns, Confusion Matrix, Normal False-Positive Rate, ROC-AUC).
  - **Safe Model Registry & Artifact Manager (`model_registry.py`):** Versioned serialization with `joblib`, path traversal protection, metadata tracking, and model storage outside public directories (`backend/storage/models/`).
  - **Real-Time Prediction Interface (`prediction.py`):** Robust flow inference with schema validation, non-finite handling, missing feature imputation, class probability distributions, and anomaly isolation scores.
- [x] **Database Schema & Migrations:**
  - `ml_datasets`: Tracks registered dataset files, sources, schema versions, class distributions, and record counts.
  - `ml_training_jobs`: Asynchronous job queue recording dataset references, model types, hyperparameters, status (`queued`, `training`, `completed`, `failed`), and timing.
  - `ml_models`: Model registry storing algorithm details, version strings, feature names, hyperparameter configurations, and artifact paths.
  - `ml_evaluations`: Persists empirical evaluation metrics, confusion matrices, test-set compositions, and feature importance rankings.
- [x] **REST APIs (`/api/ml/...`):**
  - `POST /api/ml/datasets`: Register or generate feature dataset
  - `GET /api/ml/datasets`: List registered datasets
  - `GET /api/ml/datasets/{id}`: Detailed dataset metadata
  - `POST /api/ml/training-jobs`: Launch non-blocking background model training job
  - `GET /api/ml/training-jobs`: List training job history
  - `GET /api/ml/training-jobs/{id}`: Inspect job status and execution logs
  - `GET /api/ml/models`: List registered model artifacts
  - `GET /api/ml/models/{id}`: Model metadata and parameters
  - `GET /api/ml/models/{id}/evaluation`: Empirical evaluation report
  - `GET /api/ml/feature-importance/{id}`: Gini MDI feature importance ranking
  - `POST /api/ml/predict/{id}`: Live flow prediction endpoint
  - `GET /api/ml/health`: ML engine subsystem health and storage status
- [x] **Interactive Frontend SOC Integration:**
  - Dedicated **AI/ML Models** page in sidebar navigation.
  - **Model Registry Table:** List trained artifacts, algorithms, versions, status, and direct actions.
  - **Training History Table:** Real-time background job tracking with auto-polling every 3s.
  - **Dataset Registry:** Browse registered datasets or generate canonical benchmark datasets.
  - **Model Evaluation Dashboard:** View factual metrics (Accuracy, Macro F1, Recall, Confusion Matrix, Score Distribution, Feature Importance).
  - **Inference Playground Modal:** Test trained models interactively against pre-configured traffic signatures or custom feature vectors.
- [x] **Automated Test Suite (`tests/test_ml_pipeline.py`):**
  - Unit and integration tests for label mapping, leakage-free preprocessing, Random Forest training, Isolation Forest anomaly scoring, artifact persistence, API endpoints, and inference.

---

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
Apply Alembic migrations to create all tables (servers, PCAP imports, traffic flows, feature datasets, ML models, and evaluations):

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
- **ML Subsystem Health:** [http://localhost:8000/api/ml/health](http://localhost:8000/api/ml/health)
- **Model Registry API:** [http://localhost:8000/api/ml/models](http://localhost:8000/api/ml/models)

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

## 🔮 Future Roadmap (Phase 6 & Beyond)

- **Phase 6: Live Streaming Inference & Socket Taps**
  - High-throughput zero-copy ring buffers (AF_PACKET / DPDK).
  - Online feature calculation windowing on live unidirectional traffic diodes.
  - WebSocket alert broadcasting to the SENTRA SOC console.
- **Phase 7: Active Response & SIEM Integration**
  - Configurable defensive actions (firewall rule dispatch, BGP blackholing where egress path permits).
  - SIEM connectors (Elasticsearch, Splunk HEC, Syslog).

---

## ⚖️ Analytical Terminology & Disclaimer

In alignment with scientific machine learning and cybersecurity forensics standards:
- **No Fabricated Performance:** All reported accuracies, F1-scores, and false-positive rates reflect empirical holdout test partition evaluations.
- **Scope Limitations:** Anomaly detectors flag statistical dissimilarity from baseline traffic profiles; an anomaly score is not an absolute probability of malicious intent.
- **Unidirectional Boundary:** Models are trained strictly on forward-flow telemetry without assuming bidirectional TCP acknowledgments or responses.

---

**Team Sentra 1 — Smart India Hackathon 2026**

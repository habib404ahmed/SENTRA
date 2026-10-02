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

### Phase 6: Threat Detection, Alert Engine & Dashboard Integration (Completed)
- [x] **End-to-End Threat Detection Pipeline:**
  - Ingested directional flow telemetry $\to$ Feature extraction (`v1.0.0`) $\to$ Multi-model inference (Random Forest classifier + Isolation Forest anomaly detector) $\to$ Decision policy evaluation (`v1.0.0`) $\to$ Structured evidence generation $\to$ Deduplication & recurrence tracking $\to$ Alert persistence & SSE streaming.
- [x] **Multi-Criteria Decision Policy Engine (`backend/app/detection/policy.py`):**
  - Synthesizes supervised class probabilities with unsupervised isolation scores and flow rate facts.
  - Policy outcomes: `likely_malicious`, `suspicious`, `anomalous`, `inconclusive`, `normal`.
  - Severity triage model: Combines threat category, flow volume/rates (PPS/BPS), and monitored server criticality environment (`production`, `staging`, `development`, `dmz`).
  - Model scores are explicitly kept distinct from severity triage labels.
- [x] **Structured Evidence Generator (`backend/app/detection/evidence.py`):**
  - Separates deterministic observed telemetry facts (5-tuple, packet/byte counts, duration, asymmetry ratio) from probabilistic model inferences (predicted class, class vote share, anomaly score) and behavioral indicators.
  - Forensic integrity disclaimer: Explicitly avoids unwarranted real-world attacker identity attribution on unidirectional ingress.
- [x] **Temporal Alert Deduplication Engine (`backend/app/detection/deduplication.py`):**
  - Computes 32-character SHA-256 fingerprint over `(server_id, source_ip, destination_ip, protocol, threat_class)`.
  - Re-observed attacks within a 24-hour temporal window increment `occurrence_count` and update `last_seen_at` without spamming analysts.
- [x] **Alert Lifecycle State Machine & Audit Trail (`backend/app/detection/lifecycle.py`):**
  - Valid transitions: `new` $\to$ `acknowledged` $\to$ `investigating` $\to$ `resolved` / `false_positive` $\to$ `new` (reopen).
  - Persists full operator audit log in `alert_status_history` table (`previous_status`, `new_status`, `changed_by`, `note`, `timestamp`).
- [x] **FastAPI Alert & Detection Endpoints:**
  - `GET /api/alerts`: Multi-parameter filtered alerts (server, severity, threat, status, pagination)
  - `GET /api/alerts/summary`: Real-time SOC operational statistics and attack distribution
  - `GET /api/alerts/stream`: Server-Sent Events (SSE) streaming live alert broadcasts and status transitions
  - `GET /api/alerts/{id}`: Detailed incident investigation with structured evidence and audit trail
  - `PATCH /api/alerts/{id}/status`: Lifecycle transitions with operator audit logging
  - `POST /api/detection/run`: Launch batch threat detection across imports, datasets, or flow IDs
  - `GET /api/detection/jobs`: Detection job execution history and progress tracking
  - `GET /api/detection/jobs/{id}`: Detection job status and metrics
  - `GET /api/detection/results`: Per-flow detection decisions and policy rationales
  - `GET /api/detection/health`: Detection engine subsystem health and model readiness
- [x] **Frontend SOC Incident Management Integration:**
  - Interactive **Alerts Table** with search, multi-factor filters, occurrence badges (`xN`), and anomaly indicators.
  - **Run Threat Detection Modal**: Select server, import batch, or dataset with custom confidence thresholds to launch detection runs.
  - **Incident Investigation Modal**: Full breakdown of Observed Network Facts, Model Inferences, Behavioral Indicators, Lifecycle Action Buttons (`Acknowledge`, `Investigate`, `Resolve`, `False Positive`, `Reopen`), and historical Audit Trail.
  - Live SSE notification subscriber with automated toast alerts.
- [x] **Automated Test Suite (`tests/test_detection_engine.py`):**
  - 8 comprehensive test cases covering health endpoints, decision policy rules, facts vs. inferences separation, deduplication, lifecycle transitions, API endpoints, and end-to-end flow evaluation.

### Phase 7: Full-System Testing, Performance Evaluation & Validation (Completed)
- [x] **Reproducible Test Environment & Generators (`tests/conftest.py`):**
  - Deterministic seeds (`random_state=42`) across NumPy, Python random, and Scikit-Learn.
  - Safe, cross-platform Scapy PCAP byte serialization via temporary files.
  - `SyntheticTrafficGenerator` simulating benign traffic, DDoS SYN floods, port scan sweeps, and DNS tunneling streams.
- [x] **End-to-End Pipeline Integration Suite (`tests/test_e2e_pipeline.py`):**
  - Strict unidirectional flow separation (ensuring reverse traffic is never merged).
  - Schema v1.0.0 feature extraction $\to$ multi-model inference $\to$ policy evaluation.
  - 24-hour temporal alert deduplication and occurrence counting.
  - Full analyst triage lifecycle state machine (`new` $\to$ `investigating` $\to$ `resolved`) with immutable audit logging.
- [x] **Controlled Detection Evaluation Pipeline (`app/evaluation/`):**
  - `ControlledDetectionEvaluator`: Leakage-free train/test evaluation on benchmark datasets.
  - Accuracy: **99.50%**, Macro F1: **99.50%**, Binary Anomaly ROC-AUC: **0.9991**, False-Positive Rate on Normal Traffic: **0.00%**.
  - Forensic case analysis of false positives and false negatives.
  - Threshold sensitivity curves spanning confidence thresholds $0.40$ to $0.85$.
  - Generates machine-readable JSON (`reports/detection_evaluation_report.json`) and Markdown (`reports/detection_evaluation_report.md`).
- [x] **Performance & Scalability Benchmarking (`scripts/run_benchmarks.py`):**
  - Streaming packet parser throughput: **573.45 packets/second**.
  - Feature extraction throughput: **9,999.6 flows/second** (mean latency: **96.05 $\mu$s**).
  - End-to-end decision pipeline throughput: **3,618.15 flows/second** (mean latency: **0.2764 ms**).
  - Peak memory footprint: **12.10 MB**.
  - Generates benchmark reports (`reports/benchmark_results.json` and `reports/benchmark_results.md`).
- [x] **API & Database Reliability Suite (`tests/test_api_reliability_and_security.py`):**
  - Input validation and 422 Unprocessable Entity error handling.
  - 404 Not Found handling on non-existent resource IDs.
  - PCAP magic bytes validation, empty file rejection, and path traversal defense.
  - SQL injection resilience across flow filters, server creation, and alert notes.
- [x] **Performance SLA Test Suite (`tests/test_performance_benchmarks.py`):**
  - Continuous validation ensuring latencies stay within strict SLA bounds.
- [x] **SIH 2026 Live Demonstration & State Reset Scripts:**
  - `scripts/demo_sih2026.py`: Complete 8-step live demonstration for hackathon judges.
  - `scripts/reset_demo_state.py`: Idempotent database state cleaner for repeated presentations.

---

## ⚡ Performance & Evaluation Highlights (Phase 7 Empirical Data)

| Metric | Result | Benchmark SLA | Target Status |
| :--- | :---: | :---: | :---: |
| **Multi-Class Accuracy** | **99.50%** | $> 95.0\%$ | **EXCEEDED** |
| **Macro F1-Score** | **99.50%** | $> 95.0\%$ | **EXCEEDED** |
| **Anomaly ROC-AUC** | **0.9991** | $> 0.95$ | **EXCEEDED** |
| **Normal Traffic False-Positive Rate** | **0.00%** | $< 1.0\%$ | **EXCEEDED** |
| **Feature Extraction Latency** | **96.05 $\mu$s** | $< 500$ $\mu$s | **EXCEEDED** |
| **Decision Pipeline Latency** | **0.2764 ms** | $< 5.0$ ms | **EXCEEDED** |
| **Decision Flow Throughput** | **3,618 flows/sec** | $> 500$ flows/sec | **EXCEEDED** |
| **Peak Memory Footprint** | **12.10 MB** | $< 250$ MB | **OPTIMAL** |
| **Total Automated Tests** | **45 / 45 Passed** | 100% Pass | **100% PASS** |

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

### Step 7: Run Full Automated Test Suite (45 Tests)
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

---

### Step 8: Execute Controlled Detection Evaluation
Runs train/test evaluation on benchmark datasets, computes confusion matrix, per-class metrics, false-positive analysis, and threshold sensitivity curves:

```bash
cd backend
.\.venv\Scripts\python.exe scripts/run_evaluation.py
```
*Reports generated: `backend/reports/detection_evaluation_report.json` and `backend/reports/detection_evaluation_report.md`*

---

### Step 9: Run Performance & Scalability Benchmarks
Benchmarks streaming packet parsing throughput, feature extraction latency, model inference, and end-to-end decision pipeline:

```bash
cd backend
.\.venv\Scripts\python.exe scripts/run_benchmarks.py
```
*Reports generated: `backend/reports/benchmark_results.json` and `backend/reports/benchmark_results.md`*

---

### Step 10: Run Live SIH 2026 Demonstration Script
Demonstrates the full passive unidirectional defense pipeline to hackathon judges:

```bash
cd backend
.\.venv\Scripts\python.exe scripts/demo_sih2026.py
```

To safely reset test demonstration records for repeated evaluation runs:
```bash
cd backend
.\.venv\Scripts\python.exe scripts/reset_demo_state.py
```

---

### Step 11: Build Production Frontend
In the root directory:

```bash
npm run build
```

---

## 🔄 Windows Background Service & Automatic Startup Guide

SENTRA provides automated background startup and self-healing lifecycle management on Windows. This eliminates the need to manually open a terminal window and run `uvicorn` every time your computer boots or you sign in.

### Quick Start: Lifecycle Management Commands

Use the unified lifecycle manager script (`sentra-service.ps1` or `sentra-service.bat`) from the project root:

| Command | Batch Equivalent | Action |
| :--- | :--- | :--- |
| `.\sentra-service.ps1 start` | `.\sentra-service.bat start` | Starts FastAPI backend in background (windowless, detached) |
| `.\sentra-service.ps1 stop` | `.\sentra-service.bat stop` | Gracefully terminates supervisor and backend processes |
| `.\sentra-service.ps1 restart` | `.\sentra-service.bat restart` | Restarts the backend and reloads configuration |
| `.\sentra-service.ps1 status` | `.\sentra-service.bat status` | Displays live health, latency, port, PID, DB, and startup task status |
| `.\sentra-service.ps1 logs` | `.\sentra-service.bat logs` | Displays the last 40 lines of `backend/logs/backend.log` |
| `.\sentra-service.ps1 logs -Follow` | `.\sentra-service.bat logs` | Streams live log output in real time |
| `.\sentra-service.ps1 install` | `.\sentra-service.bat install` | Configures automatic background startup at logon / boot |
| `.\sentra-service.ps1 uninstall` | `.\sentra-service.bat uninstall` | Removes the automatic startup task and shortcuts |

---

### How Automatic Startup Works

SENTRA uses a dual-layer Windows startup architecture designed for zero friction:

1. **User Logon Startup Shortcut (Zero-Admin Mode):**
   * Configured in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SENTRA_Backend.lnk`.
   * Automatically starts at user logon without requiring Windows Administrator elevation.
   * Runs `backend/.venv/Scripts/pythonw.exe` executing `backend/scripts/server_supervisor.py` completely windowless.

2. **Windows Task Scheduler Service (`SENTRA_Backend_Service`):**
   * Registered via `Register-ScheduledTask` (run `sentra-service.ps1 install` in an Administrator PowerShell).
   * Triggers automatically at logon with OS-level retry settings:
     - `RestartCount = 5`
     - `RestartInterval = 1 minute`
     - `AllowStartIfOnBatteries = true`
     - Windowless background execution without open terminal windows.

3. **Background Supervisor & Self-Healing Crash Recovery:**
   * Managed by `backend/scripts/server_supervisor.py`.
   * **PID Tracking & Duplicate Prevention:** Detects if port 8000 is already active to prevent port collision or orphan instances.
   * **Crash Detection & Auto-Restart:** Continuously monitors the Uvicorn child process. If the backend process crashes or is killed unexpectedly, the supervisor detects the termination and automatically restarts FastAPI with exponential backoff (0s → 2s → 4s → 8s → 15s).
   * **Structured Logging:** All supervisor events, startup banners, request access logs, and Uvicorn tracebacks are logged with timestamps into `backend/logs/backend.log`.

---

### Managing PostgreSQL Automatic Startup on Windows

FastAPI depends on PostgreSQL. Verify that PostgreSQL starts automatically as a Windows service:

1. Check current PostgreSQL service status:
   ```powershell
   Get-Service *postgres* | Select-Object Name, Status, StartType
   ```
2. If `StartType` is `Manual`, configure it to start automatically with Windows (Run in Administrator PowerShell):
   ```powershell
   Set-Service -Name postgresql-x64-18 -StartupType Automatic
   ```
3. **Database Unavailability Resilience:**
   * SENTRA's backend application lifespan handles temporary database unavailability gracefully. If Windows boots and FastAPI starts before PostgreSQL has finished initializing, FastAPI catches the initial connection delay without crashing permanently.
   * SQLAlchemy connection pooling (`pool_pre_ping=True`) automatically re-establishes database connections as soon as PostgreSQL is ready.

---

### Dashboard Automatic Reconnection & Recovery

The React frontend includes built-in connection diagnostics and self-healing recovery:
- **Real-Time Health Checks:** Probes `/api/health` (FastAPI liveness) and `/api/health/db` (PostgreSQL connectivity) with a 3-second abort timeout.
- **Header Status Pill:** Live indicator in the top navbar shows `BACKEND: ONLINE` (green pulse), `POSTGRES: CONNECTING` (amber pulse), or `BACKEND: OFFLINE` (red).
- **Auto-Recovery Loop:** When the backend is offline, the dashboard displays an active countdown banner (`Auto-reconnecting in Xs (Attempt #N)...`) with exponential backoff (3s, 5s, 8s, 12s, 15s).
- **Zero-Refresh Recovery:** As soon as the backend starts up, the dashboard automatically detects the live health check, refreshes monitored server telemetry, and clears error banners without requiring the user to refresh the page.
- **Window Focus / Online Recovery:** Switching back to the browser tab or regaining network connectivity triggers an immediate diagnostic check.

---

### Optional Frontend Automatic Startup

To have the React dashboard also start automatically on Windows boot, you can either:
1. **Development Server Shortcut:** Create a shortcut in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` pointing to `npm run dev` in the project root.
2. **Production Preview via PM2 / Service:** Build the production bundle with `npm run build` and serve via a lightweight Windows background process (e.g. `npx serve -s dist -l 5173`).

---

### Limitations & Troubleshooting

- **Computer State:** The backend service and scheduled tasks only execute when the Windows computer is powered on and running. If the PC is shut down or in deep hibernation, the backend is naturally offline.
- **Log Inspection:** If the backend fails to start, inspect `backend/logs/backend.log`:
  ```powershell
  .\sentra-service.ps1 logs
  ```
- **Port Conflicts:** If port 8000 is occupied by another application, edit `PORT=8000` in `backend/.env` and update the proxy in `vite.config.ts`.
- **Manual Override:** You can stop and restart the service at any time without restarting Windows using `.\sentra-service.ps1 restart`.

---

## 🌐 Hosted Cloud Deployment (Replacing Localhost)

To deploy SENTRA so that the web dashboard does **not** rely on `localhost` or your personal computer, follow the complete cloud architecture documented in [DEPLOYMENT.md](file:///c:/Users/HABIB/Videos/SENTRA/DEPLOYMENT.md):

1. **Provision Managed PostgreSQL:** (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), [Render](https://render.com)).
2. **Deploy FastAPI Backend:** (e.g. Render, Railway, AWS ECS).
   - Set `DATABASE_URL` with SSL (`?sslmode=require`).
   - Run `python migrate.py` for automated schema deployment.
   - Start via `python run.py`.
3. **Deploy React Frontend:** (e.g. Vercel, Netlify, Cloudflare Pages).
   - Set environment variable `VITE_API_BASE_URL=https://your-backend.onrender.com`.
   - Build with `npm run build`.
4. **Deploy with Docker Compose (Single VM / VPS):**
   ```bash
   docker compose up -d --build
   ```

*See the step-by-step walkthrough in [DEPLOYMENT.md](file:///c:/Users/HABIB/Videos/SENTRA/DEPLOYMENT.md).*

---

## 🔮 Future Roadmap (Post-Hackathon Extensions)

- **Hardware Diode Transceiver Offload:** Zero-copy kernel bypass (DPDK / eBPF) for line-rate 10Gbps+ simplex fiber taps.
- **Federated Anomaly Profile Exchange:** Cross-enclave model weight synchronization via cryptographic secure multi-party computation.
- **Out-of-Band Upstream Orchestration:** Automated defensive signaling to perimeter SDN routers via isolated management plane channels.

---

## ⚖️ Analytical Terminology & Disclaimer

In alignment with scientific machine learning and cybersecurity forensics standards:
- **No Fabricated Performance:** All reported accuracies, F1-scores, and false-positive rates reflect empirical holdout test partition evaluations.
- **Scope Limitations:** Anomaly detectors flag statistical dissimilarity from baseline traffic profiles; an anomaly score is not an absolute probability of malicious intent.
- **Unidirectional Boundary:** Models are trained strictly on forward-flow telemetry without assuming bidirectional TCP acknowledgments or responses.

---

**Team Sentra 1 — Smart India Hackathon 2026**

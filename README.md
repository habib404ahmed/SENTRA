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

## 🚀 Phase 1 Implementation Status

SENTRA is being developed systematically phase-by-phase. **Phase 1 represents the complete UI/UX and SOC Frontend Console**:

- [x] **Dark-First SOC Aesthetics:** High-density, professional cybersecurity operations dashboard designed with subtle glassmorphism and contrast-compliant colors.
- [x] **Complete Multi-Page Architecture:**
  1. **Overview Dashboard:** Top KPI cards, Threat Activity Timeline, Threat Distribution donut chart, Recent Incidents feed, and Monitored Asset Health.
  2. **Monitored Servers Console:** Asset directory with tabular and card-grid views, filters by environment/source, and interactive monitoring controls.
  3. **Add Server Flow:** Modal with strict IPv4 validation and passive tap telemetry presets.
  4. **Deep Asset Telemetry Console:** Comprehensive per-server inspection with bandwidth, PPS waveforms, connection rates, flow symmetry, and incident history.
  5. **Threat Alerts & Incident Management:** Multi-factor filtering (severity, category, asset, status), model score analysis, behavioral evidence breakdown, and flow header inspection.
  6. **Traffic Analytics:** High-resolution ingress throughput, PPS, flow count, transport protocol breakdown, and top communicating endpoints.
  7. **Threat Intelligence Knowledgebase:** 6 classified threat taxonomies tailored for unidirectional detection, plus an observed source IP watchlist.
  8. **Compliance & Threat Reports:** Security summary digests, report generation, and CSV / PDF export simulation.
  9. **Platform & Sensor Settings:** Diode hardware enforcement toggles, ring buffer allocations, and Phase 2 ML confidence threshold sliders.
  10. **Global Telemetry Search:** Keyboard-accessible (`Ctrl+K`) search across servers, alerts, IPs, and threat categories.
  11. **Incident Notification Center:** Real-time alert popover with unread badge tracking and batch mark-read actions.
  12. **Mock SOC Authentication:** Dedicated sign-in experience with demo analyst clearance levels.
- [x] **Clean Mock-Data & Future API Abstraction:** Built on TypeScript interfaces and service-layer promises (`src/services/api.ts`) ready for drop-in Phase 2 backend replacement.
- [x] **Zero TypeScript / Build Errors:** Fully compiled and validated production build.

---

## 🛠️ Technology Stack

- **Core Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8 (Hot Module Replacement, ultra-fast bundling)
- **Styling:** Vanilla Tailwind CSS with custom SOC dark theme palette
- **Icons:** Lucide React
- **Visualizations & Charts:** Recharts (Area charts, Line waveforms, Donut charts, Bar distributions)
- **State Management:** React Context API + asynchronous service layer

---

## 📂 Project Structure

```text
SENTRA/
├── public/                 # Static assets and favicons
├── src/
│   ├── components/
│   │   ├── alerts/         # Incident table, filters, and investigation modal
│   │   ├── analytics/      # Traffic charts, protocol breakdowns, port matrices
│   │   ├── common/         # Badge, Button, Input, Modal, Select, StatCard, Tabs, Toast
│   │   ├── intel/          # Threat category taxonomy, observed source IP tracker
│   │   ├── layout/         # Header, Sidebar, Global SearchModal, live clock
│   │   ├── overview/       # Timeline charts, donut charts, asset health, live feed
│   │   ├── reports/        # Executive audit cards and export triggers
│   │   ├── servers/        # Server table, card grid, add-server modal, telemetry console
│   │   └── settings/       # Diode configurations and ML threshold sliders
│   ├── context/
│   │   └── AppContext.tsx  # Central state management & mock data store
│   ├── data/
│   │   ├── mockAlerts.ts   # Realistic threat alerts with behavioral evidence
│   │   ├── mockNotifications.ts # SOC notification entries
│   │   ├── mockServers.ts  # Controlled e-commerce demo asset environment
│   │   ├── mockThreats.ts  # Threat intelligence and observed IPs
│   │   └── mockTraffic.ts  # Hourly telemetry, protocols, and top ports
│   ├── pages/
│   │   ├── AlertsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── IntelligencePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── OverviewPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── ServersPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/
│   │   └── api.ts          # Future REST API contract abstraction layer
│   ├── types/
│   │   └── index.ts        # Domain TypeScript interfaces and types
│   ├── App.tsx             # Root layout and view controller
│   ├── index.css           # Tailwind base styles and custom dark SOC scrollbars
│   └── main.tsx            # Application entrypoint
├── index.html              # SEO and metadata configuration
├── tailwind.config.js      # SOC color tokens and font definitions
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build and path aliases
```

---

## 💻 How to Run Locally

### Prerequisites
- Node.js `v18+` (tested on Node `v24.x`)
- npm `v9+`

### 1. Clone the Repository
```bash
git clone https://github.com/habib404ahmed/SENTRA.git
cd SENTRA
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🔮 Future Roadmap (Phase 2 & Beyond)

Phase 1 establishes the complete, production-grade frontend architecture. The future roadmap includes:

- **Phase 2: Packet Ingestion & Flow Extraction**
  - Passive optical tap driver and raw AF_PACKET / DPDK zero-copy ring buffer ingestion.
  - PCAP / NetFlow v9 / IPFIX streaming telemetry parsers.
  - Forward-only flow feature extraction (packet inter-arrival time, window variance, entropy calculation).
- **Phase 3: AI / Machine Learning Engine**
  - Supervised Classification: XGBoost and Random Forest ensembles for known threat signatures (DDoS, Port Scan, DNS Tunneling).
  - Unsupervised Anomaly Detection: Isolation Forest and Autoencoders for novel zero-day exfiltration patterns.
  - Temporal Model: LSTM / GRU networks for low-frequency C2 periodic beaconing.
- **Phase 4: Production SOC Backend & Real-Time Telemetry Streaming**
  - High-performance FastAPI / Go telemetry ingestion broker.
  - WebSocket / SSE live alert streaming connecting directly into the `sentraApi` abstraction.
  - Integration with organizational SIEMs (Elasticsearch, Splunk, Syslog).

---

## ⚖️ Analytical Terminology & Disclaimer

In alignment with professional cybersecurity forensics standards:
- All external addresses are referred to as **"Observed Source IPs"** rather than definitive attacker identities.
- AI inferences are expressed as **"Model Confidence Scores"** rather than absolute probabilities.
- Deviations in network telemetry are characterized as **"Suspicious Traffic Patterns"** or **"Potential Threats"**.
- This repository contains **mock telemetry** representing a controlled environment for evaluation purposes.

---

**Team Sentra 1 — Smart India Hackathon 2026**

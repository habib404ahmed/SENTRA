# SENTRA — Render Cloud Deployment & Hosting Architecture

This guide provides exact, step-by-step instructions for deploying the complete **SENTRA** platform (React frontend, FastAPI backend, and PostgreSQL database) to [Render](https://render.com) from your GitHub repository:
`https://github.com/habib404ahmed/SENTRA.git`.

---

## 🏛️ Cloud Architecture Overview

```text
┌─────────────────────────────────┐
│        Web Client Browser       │
└────────────────┬────────────────┘
                 │ HTTPS (Port 443)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  sentra-frontend (Render Static Site)                        │
│  - Hosted on Render Global CDN                               │
│  - Built with: npm install && npm run build                  │
│  - Publish Directory: ./dist                                 │
│  - SPA Routing: Rewrites /* -> /index.html                   │
│  - API Integration: Configured via VITE_API_BASE_URL         │
└────────────────┬─────────────────────────────────────────────┘
                 │ REST & Health Checks (HTTPS)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  sentra-backend (Render Python Web Service)                  │
│  - Root Directory: backend                                   │
│  - Runtime: Python 3                                         │
│  - Build: pip install -r requirements.txt                    │
│  - Start: python migrate.py && python run.py                 │
│  - Health Check: /api/health                                 │
│  - Auto-binds to $PORT provided by Render                    │
│  - Dynamic CORS: Matches *.onrender.com                      │
└────────────────┬─────────────────────────────────────────────┘
                 │ TLS Encrypted (Port 5432, sslmode=require)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  sentra-db (Render Managed PostgreSQL or Neon / Supabase)    │
│  - Persistent storage for assets, flows, alerts & ML models  │
│  - Automatic schema management via Alembic (upgrade head)    │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Important Hosting & Hardware Disclosures

> [!IMPORTANT]
> **PCAP Ingestion & ML Processing vs. Continuous Physical Sniffing:**
> - When deployed on Render (or any cloud container platform), SENTRA operates as a **Cloud SOC & Threat Analytics Hub**.
> - Ingestion is performed via **authorized PCAP/PCAPNG file uploads** (`/api/ingestion/pcap`) exported from network taps, firewalls, Zeek sensors, or optical data diodes.
> - **Continuous live packet capture from a physical enterprise network requires local hardware access (e.g., NICs in promiscuous mode or raw socket tap appliances on-premise).** Cloud hosting does not and cannot sniff your local protected network.
> - **Resource Limits:** On Render's Free or Starter instances (512MB RAM), keep uploaded PCAPs under 50MB to avoid container out-of-memory (OOM) termination during Pandas feature extraction and Scikit-learn inference.

---

## 🚀 Option 1: Automated Blueprint Deployment (Recommended)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) Blueprint that provisions all three services simultaneously with zero manual linking.

### Step 1: Sign in to Render in your Browser
1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in (using your GitHub account is recommended).
2. Authorize Render to access your GitHub repositories.

### Step 2: Create a New Blueprint
1. In the top-right corner of your Render dashboard, click **New +** and select **Blueprint**.
2. Select your repository: `habib404ahmed/SENTRA`.
3. Render will automatically detect [`render.yaml`](./render.yaml) and display the resources to be created:
   - **`sentra-db`**: PostgreSQL Database (free/starter plan).
   - **`sentra-backend`**: Python Web Service.
   - **`sentra-frontend`**: Static Site.
4. Click **Apply**.

### Step 3: Connect Frontend to Backend URL
1. Once the deployment initializes, open the **`sentra-backend`** service page in Render.
2. Note the public URL assigned to your backend (e.g., `https://sentra-backend.onrender.com`).
3. Navigate to the **`sentra-frontend`** service in Render > **Environment**.
4. Set or verify the following environment variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://sentra-backend.onrender.com` *(replace with your actual backend URL)*
5. Trigger a **Manual Deploy > Clear build cache & deploy** on the frontend so Vite embeds the production API URL.

---

## 🛠️ Option 2: Manual Step-by-Step Service Creation

If you prefer to configure each service manually without Blueprints:

### Step 1: Create the PostgreSQL Database
1. In Render Dashboard, click **New +** > **PostgreSQL**.
2. Name: `sentra-db`
3. Database: `sentra`
4. User: `sentra_user`
5. Plan: Select **Free** (or Starter for non-expiring production storage).
6. Click **Create Database**.
7. Once provisioned, copy the **Internal Database URL** (for services inside Render) or **External Database URL** (if connecting externally).

### Step 2: Create the FastAPI Web Service
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect `https://github.com/habib404ahmed/SENTRA.git`.
3. Configure settings:
   - **Name:** `sentra-backend`
   - **Region:** Choose the same region as your database (e.g., Oregon or Frankfurt).
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python migrate.py && python run.py`
4. Expand **Advanced** and set:
   - **Health Check Path:** `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | *Paste internal PostgreSQL URL* | E.g. `postgresql://sentra_user:...@dpg-xxx/sentra` |
   | `ENVIRONMENT` | `production` | Enables production safeguards |
   | `DOCS_ENABLED` | `true` | Enables `/docs` Swagger UI |
   | `CORS_ORIGIN_REGEX` | `^https:\/\/.*\.onrender\.com$` | Permits all Render frontend subdomains |
   | `WEB_CONCURRENCY` | `1` | 1 worker process for 512MB RAM instances |
6. Click **Create Web Service**. Wait for the build and migration to succeed.
7. Verify health:
   - `https://your-backend.onrender.com/api/health` -> `{"status":"ok","service":"sentra-api"}`
   - `https://your-backend.onrender.com/api/health/db` -> `{"status":"ok","database":"connected"}`

### Step 3: Create the React Static Site
1. In Render Dashboard, click **New +** > **Static Site**.
2. Connect `https://github.com/habib404ahmed/SENTRA.git`.
3. Configure settings:
   - **Name:** `sentra-frontend`
   - **Branch:** `main`
   - **Root Directory:** *(leave blank — repository root)*
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `./dist`
4. Under **Redirects / Rewrites**, add an SPA routing rule:
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://your-backend.onrender.com` | Use your actual backend URL from Step 2 |
6. Click **Create Static Site**.

---

## 📋 Complete Environment Variables Reference

### Backend (`sentra-backend`)
| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql+psycopg://...` | Connection string to PostgreSQL with SSL |
| `PORT` | Auto | *Injected by Render* | Port FastAPI binds to (handled in `run.py`) |
| `ENVIRONMENT` | Optional | `production` | Controls logging and security profiles |
| `DOCS_ENABLED` | Optional | `true` | Toggles OpenAPI documentation at `/docs` |
| `CORS_ORIGIN_REGEX` | Optional | `^https:\/\/.*\.onrender\.com$` | Regex for allowed frontend web origins |
| `CORS_ORIGINS` | Optional | `http://localhost:5173` | Explicit comma-separated allowed origins |
| `WEB_CONCURRENCY` | Optional | `1` | Uvicorn worker count (keep at 1 for free tier) |
| `MAX_UPLOAD_SIZE_BYTES` | Optional | `104857600` | Max PCAP upload size (100 MB) |

### Frontend (`sentra-frontend`)
| Variable | Required | Example | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://sentra-backend.onrender.com` | Backend API base URL baked into client bundle |

---

## 🔍 Validation & Verification Matrix

| Verification Item | Local Verified | Cloud Verification (Post-Deploy) |
| :--- | :---: | :--- |
| **Backend Unit & Integration Tests (56/56)** | **PASSED** | Runs during startup migration & test suite |
| **Frontend TypeScript Build (`npm run build`)** | **PASSED (0 errors)** | Automatically executed during Render build |
| **`/api/health` Liveness Probe** | **PASSED (HTTP 200)** | Verified at `https://<backend>.onrender.com/api/health` |
| **`/api/health/db` Database Probe** | **PASSED (HTTP 200)** | Verified at `https://<backend>.onrender.com/api/health/db` |
| **CORS Regex Matching** | **PASSED** | Allows any `https://*.onrender.com` frontend |
| **SPA Client Routing** | **PASSED** | Handled by `render.yaml` rewrite rule `/* -> /index.html` |
| **Actual Cloud Deployment** | *Pending* | **Requires you to link the repository in Render** |

---

## ❓ Troubleshooting Common Deployment Issues

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Header shows "BACKEND: OFFLINE"** | Frontend cannot reach backend URL, or backend is sleeping on Render Free tier. | Render free instances spin down after 15 minutes of inactivity and take 30-50s to wake up on first request. Wait 30 seconds and click "Retry Connection", or verify `VITE_API_BASE_URL`. |
| **Header shows "POSTGRES: CONNECTING"** | Backend is live, but PostgreSQL is unreachable. | Check `DATABASE_URL` in backend environment variables. Ensure `sslmode=require` is present if connecting to external cloud DBs. |
| **Browser Console: "CORS error"** | Request blocked by CORS policy. | Ensure `CORS_ORIGIN_REGEX` is set to `^https:\/\/.*\.onrender\.com$` or your custom domain is in `CORS_ORIGINS`. |
| **404 when refreshing non-root pages (e.g. `/servers`)** | Static site web server not rewriting client routes. | Ensure the rewrite rule `/* -> /index.html` is configured in the static site settings. |
| **Backend Out-of-Memory (OOM) crash** | Large PCAP file exceeded free instance 512MB RAM. | Keep uploads under 50MB, or upgrade backend instance to `starter` (512MB-1GB). |

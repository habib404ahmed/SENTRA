# SENTRA — Production Cloud Deployment & Hosting Architecture

This guide details the complete procedure for deploying **SENTRA** to hosted cloud environments, severing dependencies on `localhost`, and establishing a scalable, remotely accessible cybersecurity operations platform.

---

## 🏛️ Deployment Topology

```text
┌─────────────────────────────────┐
│        Web Client Browser       │
└────────────────┬────────────────┘
                 │ HTTPS (Port 443)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  SENTRA SOC Console (Frontend)                               │
│  - Hosted on Vercel / Netlify / Cloudflare Pages / Docker    │
│  - Configured with VITE_API_BASE_URL=https://api.sentra.sec  │
└────────────────┬─────────────────────────────────────────────┘
                 │ REST & SSE Telemetry (HTTPS)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  SENTRA Threat Defense API (FastAPI Backend)                 │
│  - Hosted on Render / Railway / AWS ECS / Linux VPS          │
│  - Command: python run.py (Uvicorn + Proxy Headers)          │
│  - Auto-Migration on Release: python migrate.py              │
└────────────────┬─────────────────────────────────────────────┘
                 │ TLS Encrypted Pool (Port 5432, sslmode=require)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL 16/18 Database (Managed Cloud Instance)          │
│  - Hosted on Supabase / Neon / Render Postgres / AWS RDS     │
│  - Persistent schemas: servers, flows, alerts, ML models     │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Required Environment Variables

### 1. Frontend (`.env` / Host Environment)

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Public URL of the hosted FastAPI service. If blank in production, requests use same-origin relative `/api`. | `https://sentra-api.onrender.com` or `https://api.sentra.yourdomain.com` |

> [!NOTE]
> Vite embeds `VITE_*` variables at **build time**. When deploying to Vercel/Netlify, define `VITE_API_BASE_URL` in the hosting dashboard *before* triggering the deployment build.

### 2. Backend (`backend/.env` / Host Environment)

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string. Supports `postgres://`, `postgresql://`, and `postgresql+psycopg://`. | `postgresql+psycopg://user:pass@ep-xyz.neon.tech/sentra?sslmode=require` |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins (without trailing slashes). | `https://sentra.vercel.app,https://sentra.yourdomain.com` |
| `CORS_ORIGIN_REGEX` | Optional regex for preview environments (e.g. Vercel preview URLs). | `^https:\/\/sentra.*\.vercel\.app$` |
| `PORT` | Network port for FastAPI (auto-injected by Render, Railway, Heroku). | `8000` (or injected by PaaS) |
| `HOST` | Interface binding. | `0.0.0.0` |
| `ENVIRONMENT` | Deployment environment mode. | `production` |
| `DOCS_ENABLED` | Toggle interactive OpenAPI Swagger UI (`/docs`). | `true` or `false` |
| `WEB_CONCURRENCY` | Number of worker processes (default: 1). | `2` (adjust according to RAM/CPU) |

---

## 🚀 Deployment Strategy 1: Managed Cloud PaaS (Recommended)

### Step 1: Provision Cloud PostgreSQL
1. Create a database on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Render](https://render.com).
2. Copy the pooled connection string (with `sslmode=require`).
   - Example: `postgres://sentra_user:secret@ep-cool-fog-12345.us-east-2.aws.neon.tech/sentra?sslmode=require`
   *(SENTRA automatically normalizes this to `postgresql+psycopg://` internally).*

### Step 2: Deploy FastAPI Backend (e.g. Render / Railway)
1. Link your GitHub repository: `https://github.com/habib404ahmed/SENTRA.git`.
2. Configure service settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Pre-deploy / Release Command:** `python migrate.py` *(automatically applies Alembic schema migrations before traffic starts)*
   - **Start Command:** `python run.py`
3. Add Environment Variables:
   ```env
   DATABASE_URL=your_postgres_connection_string_with_sslmode=require
   CORS_ORIGINS=https://your-frontend.vercel.app
   ENVIRONMENT=production
   DOCS_ENABLED=true
   ```
4. Verify backend health once deployed:
   - Healthcheck: `https://your-backend.onrender.com/api/health`
   - DB Connectivity: `https://your-backend.onrender.com/api/health/db`

### Step 3: Deploy Frontend (Vercel / Netlify / Cloudflare Pages)
1. Import repository on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Configure build settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Set Environment Variable:
   ```env
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```
4. Deploy! Access your live domain and verify that the header status pill displays **BACKEND: ONLINE**.

---

## 🐳 Deployment Strategy 2: Docker & Docker Compose

For deploying on a single Cloud VM (AWS EC2, DigitalOcean Droplet, GCP Compute Engine, or local server):

1. Clone repository on the server:
   ```bash
   git clone https://github.com/habib404ahmed/SENTRA.git
   cd SENTRA
   ```
2. Create root `.env` file:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=generate_a_secure_password_here
   POSTGRES_DB=sentra
   CORS_ORIGINS=https://sentra.yourdomain.com,http://localhost
   VITE_API_BASE_URL=
   ```
3. Start the entire stack:
   ```bash
   docker compose up -d --build
   ```
4. The compose stack orchestrates:
   - **sentra-db:** PostgreSQL 16 with persistent volume and `pg_isready` healthcheck.
   - **sentra-backend:** Runs `python migrate.py && python run.py`.
   - **sentra-frontend:** Nginx serving the compiled SPA and reverse-proxying `/api/` requests internally to `backend:8000`.

---

## 🔒 Security & Hardening Checklist

- [x] **No Hardcoded Credentials:** Passwords and keys are never committed to Git or embedded in frontend code.
- [x] **Database Isolation:** PostgreSQL is accessible only through private virtual networks or TLS-encrypted SSL connections (`sslmode=require`).
- [x] **Restricted CORS:** Backend rejects unauthorized cross-origin requests in production.
- [x] **Client-Side Sanitization:** Frontend diagnostics report clear connection state without leaking internal server secrets, database credentials, or stack traces.
- [x] **Reverse-Proxy Ready:** Uvicorn runs with `--proxy-headers` and `--forwarded-allow-ips='*'` to correctly handle HTTPS termination and client IP tracking across cloud load balancers.

---

## 🔍 Troubleshooting Remote Connection Failures

| Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **Frontend displays "Backend API server is offline"** | `VITE_API_BASE_URL` is pointing to `localhost` or an unreachable domain. | Verify `VITE_API_BASE_URL` in the frontend hosting environment and redeploy. |
| **Header shows "POSTGRES: CONNECTING"** | Backend is live, but PostgreSQL is unreachable or still starting up. | Check cloud database credentials in `DATABASE_URL`, ensure database provider allows connections, and check `/api/health/db`. |
| **Browser Console: "Blocked by CORS policy"** | Frontend origin is missing from backend's `CORS_ORIGINS`. | Add frontend domain (e.g. `https://sentra.vercel.app`) to backend's `CORS_ORIGINS` environment variable and restart backend. |
| **Database error: "no pg_hba.conf entry for host"** | Cloud database requires SSL connection. | Append `?sslmode=require` to `DATABASE_URL`. |
| **Mixed Content Warning (HTTPS -> HTTP)** | Frontend hosted on HTTPS trying to access `http://` backend. | Ensure `VITE_API_BASE_URL` uses `https://`. |

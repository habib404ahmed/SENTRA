#!/usr/bin/env python3
"""
SENTRA Production & Development Server Entrypoint
=================================================
Runs FastAPI with Uvicorn configured for cloud deployments:
- Reads PORT and HOST from environment variables or settings.
- Enables proxy headers and forwarded IPs for reverse proxies (Render, AWS, Cloud Run, Nginx).
- Supports multi-worker configurations via WEB_CONCURRENCY.
"""

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.config import settings

if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.PORT))
    host = os.environ.get("HOST", settings.HOST)
    workers = int(os.environ.get("WEB_CONCURRENCY", 1))

    print(f"[*] Starting SENTRA Threat Defense API on {host}:{port} (workers={workers}, env={settings.ENVIRONMENT})...", flush=True)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=workers,
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_level="info",
    )

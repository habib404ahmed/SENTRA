#!/usr/bin/env python3
"""
SENTRA Database Migration Runner
================================
Applies Alembic database migrations programmatically on deploy.
Can be executed as a pre-deploy or release command on cloud platforms
(e.g., Render Release Command, Railway Deploy Command, Docker entrypoint).
"""

import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command
from app.config import settings


def run_migrations():
    """Apply Alembic migrations to target head."""
    print("[*] Running SENTRA Alembic database migrations...", flush=True)
    ini_path = backend_dir / "alembic.ini"

    if not ini_path.exists():
        print(f"[!] Error: alembic.ini not found at {ini_path}", file=sys.stderr)
        sys.exit(1)

    alembic_cfg = Config(str(ini_path))
    # Override sqlalchemy.url dynamically using sanitized settings
    alembic_cfg.set_main_option("sqlalchemy.url", settings.sync_database_url)

    try:
        command.upgrade(alembic_cfg, "head")
        print("[OK] All SENTRA database migrations applied successfully (head).", flush=True)
    except Exception as exc:
        print(f"[!] Migration failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()

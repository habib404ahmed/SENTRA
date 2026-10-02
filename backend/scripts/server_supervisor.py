#!/usr/bin/env python3
"""
SENTRA Backend Service Supervisor (Windows Background Lifecycle Engine)
=======================================================================
Manages the FastAPI/Uvicorn backend process lifecycle on Windows:
- Starts the backend inside the project's virtual environment.
- Prevents duplicate processes via PID tracking and port collision detection.
- Captures stdout/stderr into dedicated rotating log files (backend/logs/backend.log).
- Automatically restarts the backend if terminated or crashed unexpectedly.
- Supports graceful shutdown via signals or control flag file (backend/logs/stop.signal).
- Runs windowless via pythonw.exe or standard python.exe.
"""

import os
import sys
import time
import socket
import signal
import subprocess
from pathlib import Path
from datetime import datetime

# Resolve paths dynamically relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
LOGS_DIR = BACKEND_DIR / "logs"
PID_FILE = LOGS_DIR / "backend.pid"
STOP_SIGNAL_FILE = LOGS_DIR / "stop.signal"
LOG_FILE = LOGS_DIR / "backend.log"

# Default network configuration
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000


def ensure_dirs():
    """Ensure required log and storage directories exist."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def log_event(message: str, level: str = "INFO"):
    """Write timestamped supervisor log message to stdout and backend.log."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [SUPERVISOR] [{level}] {message}"
    print(formatted, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass


def load_env_config():
    """Load HOST and PORT from backend/.env without exposing credentials."""
    host = DEFAULT_HOST
    port = DEFAULT_PORT
    env_file = BACKEND_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key == "HOST" and val:
                        host = val
                    elif key == "PORT" and val:
                        try:
                            port = int(val)
                        except ValueError:
                            pass
        except Exception as e:
            log_event(f"Error parsing .env file: {e}", level="WARN")
    return host, port


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if the given port is actively listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        try:
            s.connect((host, port))
            return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False


def is_pid_alive(pid: int) -> bool:
    """Check whether a process with the specified PID is currently running."""
    if pid <= 0:
        return False
    try:
        # On Windows, os.kill(pid, 0) checks if process exists and is accessible
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def check_existing_instance(port: int) -> bool:
    """Verify if another instance of SENTRA is already active."""
    if PID_FILE.exists():
        try:
            content = PID_FILE.read_text(encoding="utf-8").strip()
            parts = content.split(":")
            if len(parts) >= 2:
                sup_pid = int(parts[0])
                child_pid = int(parts[1])
                if is_pid_alive(sup_pid) or is_pid_alive(child_pid):
                    if is_port_in_use(port):
                        log_event(
                            f"Existing SENTRA backend is active (Supervisor PID: {sup_pid}, Child PID: {child_pid}) on port {port}. Exiting.",
                            level="INFO"
                        )
                        return True
        except Exception:
            pass

    if is_port_in_use(port):
        log_event(f"Port {port} is already in use by another process. Exiting to avoid duplicate server instances.", level="WARN")
        return True

    return False


def get_python_executable() -> str:
    """Find the best Python executable in backend virtual environment."""
    venv_python = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def write_pid(supervisor_pid: int, child_pid: int):
    """Save supervisor and uvicorn child PIDs."""
    try:
        PID_FILE.write_text(f"{supervisor_pid}:{child_pid}", encoding="utf-8")
    except Exception as e:
        log_event(f"Failed to write PID file: {e}", level="WARN")


def remove_pid_file():
    """Remove PID file upon clean termination."""
    try:
        if PID_FILE.exists():
            PID_FILE.unlink()
    except Exception:
        pass


def remove_stop_signal():
    """Remove stop signal file if present."""
    try:
        if STOP_SIGNAL_FILE.exists():
            STOP_SIGNAL_FILE.unlink()
    except Exception:
        pass


def run_supervisor():
    """Main supervisor loop with auto-restart, logging, and crash recovery."""
    ensure_dirs()
    remove_stop_signal()

    host, port = load_env_config()
    log_event(f"Starting SENTRA Backend Supervisor for {host}:{port}...")

    # Single-instance guard
    if check_existing_instance(port):
        return 0

    python_exe = get_python_executable()
    log_event(f"Using Python runtime: {python_exe}")
    log_event(f"Working Directory: {BACKEND_DIR}")

    # Prepare environment
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_DIR)
    env["PYTHONUNBUFFERED"] = "1"

    consecutive_crashes = 0
    max_crashes_before_delay = 5
    is_shutting_down = False

    def handle_shutdown_signal(signum, frame):
        nonlocal is_shutting_down
        is_shutting_down = True
        log_event(f"Received termination signal ({signum}). Initiating graceful shutdown...", level="INFO")

    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    while not is_shutting_down:
        # Check for external stop request
        if STOP_SIGNAL_FILE.exists():
            log_event("Detected stop signal file. Shutting down supervisor.", level="INFO")
            remove_stop_signal()
            break

        uvicorn_cmd = [
            python_exe,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            host,
            "--port",
            str(port),
            "--log-level",
            "info"
        ]

        log_event(f"Launching Uvicorn process: {' '.join(uvicorn_cmd)}", level="INFO")
        start_time = time.time()

        try:
            # Open log file in append mode for uvicorn output
            log_handle = open(LOG_FILE, "a", encoding="utf-8")
            log_handle.write(f"\n--- [UVICORN PROCESS START] {datetime.now().isoformat()} ---\n")
            log_handle.flush()

            proc = subprocess.Popen(
                uvicorn_cmd,
                cwd=str(BACKEND_DIR),
                env=env,
                stdout=log_handle,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            )

            write_pid(os.getpid(), proc.pid)
            log_event(f"Uvicorn started successfully with PID: {proc.pid}", level="INFO")

            # Monitoring loop while uvicorn is running
            while proc.poll() is None:
                if is_shutting_down or STOP_SIGNAL_FILE.exists():
                    log_event(f"Stopping Uvicorn process (PID {proc.pid})...", level="INFO")
                    proc.terminate()
                    try:
                        proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        log_event(f"Process {proc.pid} did not exit in 5s. Forcing termination.", level="WARN")
                        proc.kill()
                    is_shutting_down = True
                    break
                time.sleep(1.0)

            exit_code = proc.returncode
            try:
                log_handle.close()
            except Exception:
                pass

            uptime = time.time() - start_time

            # If stopped intentionally
            if is_shutting_down or STOP_SIGNAL_FILE.exists():
                log_event(f"Uvicorn cleanly terminated (exit code: {exit_code}).", level="INFO")
                break

            # If crashed unexpectedly
            log_event(
                f"Uvicorn process (PID {proc.pid}) exited unexpectedly with code {exit_code} (uptime: {uptime:.1f}s).",
                level="WARN"
            )

            # Reset consecutive crashes if process ran stably for > 30s
            if uptime > 30:
                consecutive_crashes = 0
            else:
                consecutive_crashes += 1

            # Backoff mechanism
            if consecutive_crashes >= max_crashes_before_delay:
                backoff_seconds = 15
                log_event(
                    f"Frequent rapid crashes detected ({consecutive_crashes} in a row). Waiting {backoff_seconds}s before restart...",
                    level="ERROR"
                )
            else:
                backoff_seconds = min(2 * consecutive_crashes, 8)
                log_event(f"Restarting SENTRA backend in {backoff_seconds}s...", level="INFO")

            # Sleep during backoff while watching for stop signal
            for _ in range(int(backoff_seconds * 2)):
                if is_shutting_down or STOP_SIGNAL_FILE.exists():
                    break
                time.sleep(0.5)

        except Exception as e:
            log_event(f"Fatal error in supervisor process loop: {e}", level="ERROR")
            time.sleep(3)

    remove_pid_file()
    remove_stop_signal()
    log_event("SENTRA Backend Supervisor terminated cleanly.", level="INFO")
    return 0


if __name__ == "__main__":
    sys.exit(run_supervisor())

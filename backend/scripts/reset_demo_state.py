"""
SENTRA — Demo State Reset Script
Safely purges synthetic demonstration records from the PostgreSQL database
while preserving trained AI/ML models, system configurations, and schema migrations.
"""

import os
import sys
import logging

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app.models.server import MonitoredServerModel
from app.models.alert import AlertModel, AlertStatusHistoryModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.pcap_import import PcapImportModel
from app.models.detection_job import DetectionJobModel

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("sentra.reset")


def reset_demo_state(dry_run: bool = False):
    """
    Cleans up demonstration alerts, audit logs, flows, imports, and jobs.
    Preserves ML models, model weights, and core servers.
    """
    db: Session = SessionLocal()
    try:
        print("=" * 60)
        print("  SENTRA Demonstration State Reset Tool")
        print("=" * 60)

        # Count records to be purged
        alert_count = db.query(AlertModel).count()
        history_count = db.query(AlertStatusHistoryModel).count()
        flow_count = db.query(TrafficFlowModel).count()
        import_count = db.query(PcapImportModel).count()
        job_count = db.query(DetectionJobModel).count()
        demo_server_count = db.query(MonitoredServerModel).filter(
            MonitoredServerModel.ip_address.in_(["10.0.100.50", "10.77.88.99", "198.51.100.99"])
        ).count()

        print(f"  Records identified for cleanup:")
        print(f"    - Threat Alerts:            {alert_count}")
        print(f"    - Alert Audit History:      {history_count}")
        print(f"    - Traffic Flows:            {flow_count}")
        print(f"    - PCAP Ingestion Imports:   {import_count}")
        print(f"    - Detection Jobs:           {job_count}")
        print(f"    - Temporary Demo Servers:   {demo_server_count}")

        if dry_run:
            print("\n  [DRY-RUN] No records were deleted.")
            return

        print("\n  Purging demonstration records...")

        # 1. Purge alerts and their status history
        db.query(AlertStatusHistoryModel).delete()
        db.query(AlertModel).delete()

        # 2. Purge flows and detection jobs
        db.query(DetectionJobModel).delete()
        db.query(TrafficFlowModel).delete()

        # 3. Purge PCAP imports
        db.query(PcapImportModel).delete()

        # 4. Remove temporary demo servers
        db.query(MonitoredServerModel).filter(
            MonitoredServerModel.ip_address.in_(["10.0.100.50", "10.77.88.99", "198.51.100.99"])
        ).delete(synchronize_session=False)

        db.commit()
        print("  State reset successfully completed! Database is clean for next demonstration run.")
        print("=" * 60)
    except Exception as exc:
        db.rollback()
        print(f"  ERROR during state reset: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    is_dry = "--dry-run" in sys.argv
    reset_demo_state(dry_run=is_dry)

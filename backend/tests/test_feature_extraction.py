import os
import pytest
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.pcap_import import PcapImportModel
from app.models.traffic_flow import TrafficFlowModel
from app.models.feature_job import FeatureJobModel
from app.models.flow_feature import FlowFeatureModel
from app.models.feature_dataset import FeatureDatasetModel
from app.features.cleaning import FlowDataCleaner, DataQualityReport
from app.features.flow_features import extract_flow_features
from app.features.behavioral_features import BehavioralFeatureExtractor
from app.features.dns_features import extract_dns_features, calculate_shannon_entropy
from app.features.tls_features import extract_tls_features
from app.features.validation import FeatureValidator
from app.features.dataset_export import DatasetExporter
from app.features.pipeline import FeatureExtractionPipeline
from app.features.schemas import get_feature_schema, SCHEMA_VERSION

client = TestClient(app)


def test_flow_features_and_zero_duration():
    """Verify flow statistical features, rates, and zero-duration safety."""
    # Test zero-duration flow (instantaneous)
    zero_row = pd.Series({
        "packet_count": 1,
        "byte_count": 64,
        "duration": 0.0,
        "source_port": 50000,
        "destination_port": 80,
        "protocol": "TCP",
        "tcp_syn_count": 1,
        "tcp_ack_count": 0,
        "tcp_fin_count": 0,
        "tcp_rst_count": 0,
        "average_interarrival_time": 0.0
    })
    res_zero = extract_flow_features(zero_row)
    assert res_zero["flow_duration"] == 0.0
    assert res_zero["packets_per_second"] == 1.0  # safe rate fallback
    assert res_zero["bytes_per_second"] == 64.0
    assert res_zero["syn_ratio"] == 1.0
    assert res_zero["is_ephemeral_source_port"] == 1
    assert res_zero["is_well_known_destination_port"] == 1
    assert res_zero["protocol_code"] == 6

    # Test multi-packet flow with duration
    normal_row = pd.Series({
        "packet_count": 10,
        "byte_count": 1000,
        "duration": 2.0,
        "source_port": 12345,
        "destination_port": 53,
        "protocol": "UDP",
        "tcp_syn_count": 0,
        "tcp_ack_count": 0,
        "tcp_fin_count": 0,
        "tcp_rst_count": 0,
        "average_interarrival_time": 0.2
    })
    res_norm = extract_flow_features(normal_row)
    assert res_norm["flow_duration"] == 2.0
    assert res_norm["packets_per_second"] == 5.0
    assert res_norm["bytes_per_second"] == 500.0
    assert res_norm["average_packet_size"] == 100.0
    assert res_norm["protocol_code"] == 17
    assert res_norm["is_ephemeral_source_port"] == 0


def test_data_cleaning_and_quality_report():
    """Verify corrupt records are flagged and excluded while audit report is generated."""
    cleaner = FlowDataCleaner(drop_duplicates=True)
    raw_data = [
        # Valid flow 1
        {
            "source_ip": "10.0.0.1", "destination_ip": "10.0.0.2", "source_port": 1024, "destination_port": 80,
            "protocol": "TCP", "packet_count": 5, "byte_count": 300, "duration": 1.0, "start_time": "2026-10-01 12:00:00"
        },
        # Corrupt flow: missing destination IP
        {
            "source_ip": "10.0.0.1", "destination_ip": None, "source_port": 1024, "destination_port": 80,
            "protocol": "TCP", "packet_count": 5, "byte_count": 300, "duration": 1.0, "start_time": "2026-10-01 12:00:01"
        },
        # Corrupt flow: negative packet count
        {
            "source_ip": "10.0.0.1", "destination_ip": "10.0.0.3", "source_port": 1024, "destination_port": 80,
            "protocol": "TCP", "packet_count": -5, "byte_count": 300, "duration": 1.0, "start_time": "2026-10-01 12:00:02"
        },
        # Duplicate of flow 1
        {
            "source_ip": "10.0.0.1", "destination_ip": "10.0.0.2", "source_port": 1024, "destination_port": 80,
            "protocol": "TCP", "packet_count": 5, "byte_count": 300, "duration": 1.0, "start_time": "2026-10-01 12:00:00"
        }
    ]

    cleaned_df, report = cleaner.clean(raw_data)
    assert report.total_input_records == 4
    assert report.duplicate_records == 1
    assert report.valid_records == 1
    assert report.records_excluded == 3
    assert "missing_ip_endpoints" in report.exclusion_reasons
    assert "zero_or_negative_packet_or_byte_count" in report.exclusion_reasons


def test_behavioral_retrospective_window_and_leak_prevention():
    """Verify retrospective windowing does not leak future data."""
    extractor = BehavioralFeatureExtractor(window_seconds=60.0)
    base_time = datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)

    # 3 flows from source 10.0.0.10:
    # Flow 0 (t=0): to dst 10.0.0.1:80
    # Flow 1 (t=10): to dst 10.0.0.2:80
    # Flow 2 (t=20): to dst 10.0.0.3:80
    test_df = pd.DataFrame([
        {
            "source_ip": "10.0.0.10", "destination_ip": "10.0.0.1", "destination_port": 80,
            "start_time": base_time
        },
        {
            "source_ip": "10.0.0.10", "destination_ip": "10.0.0.2", "destination_port": 80,
            "start_time": base_time + timedelta(seconds=10)
        },
        {
            "source_ip": "10.0.0.10", "destination_ip": "10.0.0.3", "destination_port": 80,
            "start_time": base_time + timedelta(seconds=20)
        }
    ])

    results = extractor.extract(test_df)
    assert len(results) == 3

    # At Flow 0: Only 1 unique dst seen so far
    assert results[0]["src_unique_dst_count"] == 1
    assert results[0]["repeated_connection_count"] == 0

    # At Flow 1: 2 unique dsts seen so far
    assert results[1]["src_unique_dst_count"] == 2
    assert results[1]["repeated_connection_count"] == 0

    # At Flow 2: 3 unique dsts seen so far
    assert results[2]["src_unique_dst_count"] == 3
    assert results[2]["repeated_connection_count"] == 0


def test_dns_and_tls_extractors():
    """Verify DNS and TLS heuristic metadata extractors."""
    # Shannon entropy
    entropy = calculate_shannon_entropy("example.com")
    assert entropy > 2.0

    # DNS flow
    dns_row = pd.Series({"source_port": 45000, "destination_port": 53, "average_packet_size": 90.0})
    dns_res = extract_dns_features(dns_row)
    assert dns_res["is_dns_service"] == 1
    assert dns_res["dns_query_len_estimate"] == 48.0  # 90.0 - 42.0

    # TLS flow
    tls_row = pd.Series({"source_port": 51000, "destination_port": 443, "average_packet_size": 1200.0})
    tls_res = extract_tls_features(tls_row)
    assert tls_res["is_tls_service"] == 1
    assert tls_res["encrypted_flow_byte_ratio"] == 0.8  # 1200 / 1500


def test_schema_and_feature_validator():
    """Verify schema metadata and feature validation checks."""
    schema = get_feature_schema()
    assert schema.version == SCHEMA_VERSION
    assert schema.total_features > 20

    validator = FeatureValidator(schema_version=SCHEMA_VERSION)
    
    # Valid synthetic record
    valid_record = {f.name: 1.0 if f.data_type == "float" else 1 for f in schema.features}
    valid_record["syn_ratio"] = 0.5
    valid_record["ack_ratio"] = 0.5
    valid_record["rst_ratio"] = 0.0
    valid_record["source_port_normalized"] = 0.1
    valid_record["destination_port_normalized"] = 0.2
    valid_record["src_fan_out_ratio"] = 0.8
    valid_record["encrypted_flow_byte_ratio"] = 0.5
    valid_record["flow_duration"] = 1.5

    is_valid, errors = validator.validate_record(valid_record)
    assert is_valid, f"Validation failed: {errors}"

    # Invalid record with NaN
    invalid_record = valid_record.copy()
    invalid_record["flow_duration"] = float("nan")
    is_valid_nan, errors_nan = validator.validate_record(invalid_record)
    assert not is_valid_nan
    assert any("NaN" in e for e in errors_nan)


def test_end_to_end_feature_pipeline_and_api():
    """Verify end-to-end extraction pipeline, CSV/Parquet export, and REST API."""
    db = SessionLocal()
    try:
        # Create a test PCAP import
        pcap_import = PcapImportModel(
            original_filename="test_pipeline.pcap",
            stored_filename="test_pipeline_uuid.pcap",
            file_size=1024,
            status="completed",
            total_packets=4,
            total_flows=2
        )
        db.add(pcap_import)
        db.commit()
        db.refresh(pcap_import)

        # Add 2 synthetic flows
        f1 = TrafficFlowModel(
            import_id=pcap_import.id,
            source_ip="192.168.1.100",
            destination_ip="10.0.0.1",
            source_port=49500,
            destination_port=443,
            protocol="TCP",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(seconds=1),
            duration=1.0,
            packet_count=5,
            byte_count=500,
            average_packet_size=100.0,
            packets_per_second=5.0,
            bytes_per_second=500.0,
            average_interarrival_time=0.2,
            tcp_syn_count=1,
            tcp_ack_count=4,
            tcp_fin_count=0,
            tcp_rst_count=0
        )
        f2 = TrafficFlowModel(
            import_id=pcap_import.id,
            source_ip="192.168.1.100",
            destination_ip="1.1.1.1",
            source_port=53000,
            destination_port=53,
            protocol="UDP",
            start_time=datetime.now(timezone.utc) + timedelta(seconds=2),
            end_time=datetime.now(timezone.utc) + timedelta(seconds=2),
            duration=0.0,
            packet_count=2,
            byte_count=120,
            average_packet_size=60.0,
            packets_per_second=2.0,
            bytes_per_second=120.0,
            average_interarrival_time=0.0,
            tcp_syn_count=0,
            tcp_ack_count=0,
            tcp_fin_count=0,
            tcp_rst_count=0
        )
        db.add_all([f1, f2])
        db.commit()

        # Run pipeline directly
        pipeline = FeatureExtractionPipeline(window_seconds=60.0)
        job = FeatureJobModel(
            import_id=pcap_import.id,
            status="queued",
            schema_version="v1.0.0",
            input_flows=2
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        completed_job = pipeline.run(db, job_id=job.id, import_id=pcap_import.id)
        assert completed_job.status == "completed"
        assert completed_job.valid_flows == 2
        assert completed_job.invalid_flows == 0

        # Check FlowFeature records
        flow_features = db.query(FlowFeatureModel).filter(FlowFeatureModel.job_id == job.id).all()
        assert len(flow_features) == 2

        # Check datasets generated (CSV + Parquet)
        datasets = db.query(FeatureDatasetModel).filter(FeatureDatasetModel.job_id == job.id).all()
        assert len(datasets) == 3  # ml_ready CSV, full_analyzed CSV, ml_ready Parquet
        formats = [d.format for d in datasets]
        assert "csv" in formats
        assert "parquet" in formats

        # Test API endpoints
        # 1. GET /api/features/schema
        resp_schema = client.get("/api/features/schema")
        assert resp_schema.status_code == 200
        assert resp_schema.json()["version"] == "v1.0.0"

        # 2. GET /api/features/jobs
        resp_jobs = client.get(f"/api/features/jobs?import_id={pcap_import.id}")
        assert resp_jobs.status_code == 200
        assert resp_jobs.json()["total"] >= 1

        # 3. GET /api/features
        resp_feats = client.get(f"/api/features?job_id={job.id}")
        assert resp_feats.status_code == 200
        assert resp_feats.json()["total"] == 2

        # 4. GET /api/datasets
        resp_ds = client.get(f"/api/datasets?job_id={job.id}")
        assert resp_ds.status_code == 200
        assert resp_ds.json()["total"] == 3

        # 5. GET /api/datasets/{dataset_id}/download
        target_ds = datasets[0]
        resp_down = client.get(f"/api/datasets/{target_ds.id}/download")
        assert resp_down.status_code == 200
        assert len(resp_down.content) > 0

    finally:
        db.close()

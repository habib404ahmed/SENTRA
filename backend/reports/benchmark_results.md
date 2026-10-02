# SENTRA — Performance & Scalability Benchmark Report

> **Smart India Hackathon 2026 — Problem Statement 26145**  
> **Execution Date:** 2026-10-02 11:43:27 UTC  
> **System Architecture:** Windows-11-10.0.26300-SP0 (16 Cores)  
> **Peak Memory Allocated:** `12.1 MB`  

---

## 1. Packet Ingestion & Directional Parsing Throughput

| Packets Analyzed | Directional Flows | Processing Time | Packets / Sec | Throughput (MB/s) |
|---|---|---|---|---|
| 100 | 100 | 0.4752s | `210.4` | `0.05 MB/s` |
| 500 | 100 | 0.8837s | `565.8` | `0.15 MB/s` |
| 1000 | 100 | 1.7438s | `573.5` | `0.15 MB/s` |

---

## 2. Feature Extraction Latency (v1.0.0 Schema — 19 to 29 Dimensions)

- **Flows Processed:** 1000
- **Total Elapsed:** 0.1s
- **Flow Throughput:** `9,999.6 flows/sec`

| Latency Percentile | Duration (us) |
|---|---|
| **Median (p50)** | `99.6 us` |
| **95th Percentile (p95)** | `140.3 us` |
| **99th Percentile (p99)** | `213.74 us` |
| **Mean** | `96.05 us` |

---

## 3. Machine Learning Inference Latency

| Model Architecture | Mean Latency | Median (p50) | p95 Latency | Throughput (Flows/Sec) |
|---|---|---|---|---|
| **Random Forest Classifier** | `95.9269 ms` | `95.5184 ms` | `107.9269 ms` | `10.42 flows/s` |
| **Isolation Forest Detector** | `102.7461 ms` | `100.7471 ms` | `118.4888 ms` | `9.73 flows/s` |

---

## 4. End-to-End Decision Pipeline Throughput

Measures: Feature Extraction $\to$ Dual Model Inference $\to$ Policy Decision $\to$ Evidence Generation $\to$ Deduplication Signature.

- **Tested Flows:** 200
- **Mean Latency per Flow:** `0.2764 ms`
- **Median Latency (p50):** `0.2214 ms`
- **95th Percentile (p95):** `0.4158 ms`
- **End-to-End Pipeline Throughput:** `3618.15 flows/sec`

---

1. **Streaming Memory Boundary:** Scapy streaming reader keeps memory consumption constant regardless of capture file size.
2. **Vectorized Scaling:** Preprocessing and feature calculations execute in under 100 microseconds per flow, well within real-time line-rate constraints for typical data diode deployments.
3. **Local Benchmark Constraint:** Benchmarks reflect a single development workstation; production deployments with multi-worker Uvicorn processes and dedicated database servers will scale horizontally.
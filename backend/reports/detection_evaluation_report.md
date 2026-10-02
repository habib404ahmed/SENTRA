# SENTRA — Controlled Detection Evaluation Report

> **Smart India Hackathon 2026 — Problem Statement 26145**  
> **Evaluation Timestamp:** 2026-10-02 11:35:29 UTC  
> **Dataset:** `SENTRA-Benchmark-Unidirectional-v1` (800 total samples)  
> **Feature Schema:** `v1.0.0` | **Policy Version:** `v1.0.0`  

---

## 1. Executive Summary & Headline Metrics

| Evaluation Metric | Random Forest Classifier | Isolation Forest Anomaly Detector |
|---|---|---|
| **Overall Accuracy** | `100.00%` | `65.50%` |
| **Macro F1-Score** | `1.0000` | `0.2418` (binary) |
| **Macro Precision** | `1.0000` | `1.0000` |
| **Macro Recall** | `1.0000` | `0.1375` |
| **Normal False Positive Rate** | `0.00%` | `0.00%` |
| **ROC-AUC** | N/A (Multi-class) | `0.9291` |

---

## 2. Supervised Threat Classifier Breakdown

### Per-Class Performance on Test Partition
| Threat Class | Precision | Recall | F1-Score | Test Support |
|---|---|---|---|---|
| **DDoS** | 1.0000 | 1.0000 | 1.0000 | 30 |
| **DNS Tunneling** | 1.0000 | 1.0000 | 1.0000 | 16 |
| **Data Exfiltration** | 1.0000 | 1.0000 | 1.0000 | 14 |
| **Normal** | 1.0000 | 1.0000 | 1.0000 | 120 |
| **Reconnaissance** | 1.0000 | 1.0000 | 1.0000 | 20 |

### Confusion Matrix

| Actual \ Predicted | DDoS | DNS Tunneling | Data Exfiltration | Normal | Reconnaissance |
|---|---|---|---|---|---|
| **DDoS** | 30 | 0 | 0 | 0 | 0 |
| **DNS Tunneling** | 0 | 16 | 0 | 0 | 0 |
| **Data Exfiltration** | 0 | 0 | 14 | 0 | 0 |
| **Normal** | 0 | 0 | 0 | 120 | 0 |
| **Reconnaissance** | 0 | 0 | 0 | 0 | 20 |

---

## 3. False-Positive and False-Negative Forensic Analysis

- **Total Holdout Test Flows:** 200
- **Benign (Normal) Flows:** 120
- **Malicious Attack Flows:** 80
- **False Positive Count:** 0 (Rate: `0.00%`)
- **False Negative Count:** 0 (Rate: `0.00%`)

### Sample False-Positive Case Review
No false positive errors detected on holdout test partition.
### Sample False-Negative Case Review
No false negative errors detected on holdout test partition.

---

## 4. Confidence Threshold Sensitivity

The impact of adjusting the supervised decision policy threshold ($	au$):

| Confidence Threshold | Precision (Attacks) | Recall (Attacks) | F1-Score | False Positive Rate | Flagged Attacks |
|---|---|---|---|---|---|
| `0.40` | 1.0000 | 1.0000 | 1.0000 | 0.00% | 80 |
| `0.50` | 1.0000 | 1.0000 | 1.0000 | 0.00% | 80 |
| `0.55` | 1.0000 | 1.0000 | 1.0000 | 0.00% | 80 |
| `0.65` | 1.0000 | 1.0000 | 1.0000 | 0.00% | 80 |
| `0.75` | 1.0000 | 1.0000 | 1.0000 | 0.00% | 80 |
| `0.85` | 1.0000 | 1.0000 | 1.0000 | 0.00% | 80 |

---

## 5. Scientific & Forensic Integrity Notes

1. **No Data Leakage:** Preprocessing scalers (StandardScaler) are fitted exclusively on `X_train` and applied strictly out-of-sample on `X_test`.
2. **Uncalibrated Model Scores:** Random Forest vote shares are reported as pattern similarity scores rather than true posterior probabilities.
3. **Zero-Day Bounds:** The supervised model is bounded by its training taxonomy; novel attacks without signature overlap are surfaced via the unsupervised Isolation Forest.
4. **Unidirectional Diode Constraints:** All features are extracted solely from forward packets without assuming return ACKs or round-trip handshakes.
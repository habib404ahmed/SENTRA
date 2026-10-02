"""
SENTRA Evaluation Package (Phase 7).
"""

from app.evaluation.evaluator import ControlledDetectionEvaluator
from app.evaluation.report_generator import save_evaluation_report, generate_markdown_report

__all__ = [
    "ControlledDetectionEvaluator",
    "save_evaluation_report",
    "generate_markdown_report",
]

"""
Feature Preprocessing and Leakage-Free Normalization for SENTRA ML.
Guarantees scalers and transformers are fit strictly on training partitions only.
"""

from typing import Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from app.features.schemas import FEATURE_DEFINITIONS


class MLPreprocessor:
    """
    Standardizes feature matrices for Random Forest and Isolation Forest models.
    """

    FEATURE_NAMES = [f.name for f in FEATURE_DEFINITIONS if f.is_model_feature]

    def __init__(self, with_mean: bool = True, with_std: bool = True):
        self.scaler = StandardScaler(with_mean=with_mean, with_std=with_std)
        self.is_fitted = False

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        """
        Fits scaler strictly on training partition and transforms features.
        """
        # Ensure ordered column alignment
        X_aligned = self._align_columns(X)
        X_scaled = self.scaler.fit_transform(X_aligned)
        self.is_fitted = True
        return X_scaled

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """
        Transforms evaluation or test partition using previously fitted training statistics.
        """
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted on training partition before transform.")
        X_aligned = self._align_columns(X)
        return self.scaler.transform(X_aligned)

    def _align_columns(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Guarantees exact column sequence and fills missing or non-finite values.
        """
        df = X.copy()
        for f in self.FEATURE_NAMES:
            if f not in df.columns:
                df[f] = 0.0

        aligned = df[self.FEATURE_NAMES].copy()
        # Sanitize Inf / NaN
        aligned = aligned.replace([np.inf, -np.inf], np.nan)
        aligned = aligned.fillna(0.0)
        return aligned

"""
dataset_v2.py — PyTorch Dataset for stock sequences.

Improvements over original:
- Scaler is saved as an attribute → can be persisted and reused at inference (critical bug fix)
- Accepts a pre-fitted scaler → prevents train/test leakage when splitting
- Accepts explicit feature columns via FEATURE_COLS import
- Window and noise_threshold are configurable
- Added summary() method for quick sanity checks
- Bug fix: original used StandardScaler on full df.values including close index=3 hardcoded
  — now uses FEATURE_COLS, close column resolved by name
"""

import joblib
import numpy as np
import torch
from torch.utils.data import Dataset
from sklearn.preprocessing import StandardScaler

from features_v2 import FEATURE_COLS


class StockDatasetV2(Dataset):
    """
    Sliding-window dataset over a feature-engineered DataFrame.

    Each sample:
        X       : (window, n_features)  — normalised input sequence
        y_dir   : int                   — 0 (DOWN) or 1 (UP)
        y_ret   : float                 — next-day return (raw, not normalised)
    """

    def __init__(
        self,
        df,                             # Feature-engineered DataFrame (FEATURE_COLS)
        window: int = 60,
        noise_threshold: float = 0.003, # Ignore near-zero returns (noise filter)
        scaler: StandardScaler = None,  # Pass a fitted scaler to avoid leakage
    ):
        assert set(FEATURE_COLS).issubset(set(df.columns)), \
            f"DataFrame is missing feature columns. Run add_features_v2() first."

        df = df[FEATURE_COLS].copy()
        self.close_idx = FEATURE_COLS.index("close")

        # Fit scaler only on training data; at val/test time pass in fitted scaler
        if scaler is None:
            scaler = StandardScaler()
            data = scaler.fit_transform(df.values)
        else:
            data = scaler.transform(df.values)

        self.scaler = scaler  # Expose for persistence (save/load with joblib)

        X_list, y_dir_list, y_ret_list = [], [], []

        for i in range(len(data) - window - 1):
            x = data[i : i + window]                            # (window, features)

            # Use raw (unscaled) close for return calculation — avoids scaler distortion
            curr_close = df["close"].iloc[i + window - 1]
            next_close = df["close"].iloc[i + window]

            if curr_close == 0:
                continue

            ret = (next_close - curr_close) / curr_close

            # Filter micro-moves (noise)
            if abs(ret) < noise_threshold:
                continue

            direction = 1 if ret > 0 else 0

            X_list.append(x)
            y_dir_list.append(direction)
            y_ret_list.append(ret)

        if len(X_list) == 0:
            raise ValueError("No valid samples found. Check data length and noise_threshold.")

        self.X = torch.tensor(np.array(X_list), dtype=torch.float32)
        self.y_dir = torch.tensor(y_dir_list, dtype=torch.long)
        self.y_ret = torch.tensor(y_ret_list, dtype=torch.float32)

        self.n_features = self.X.shape[2]

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y_dir[idx], self.y_ret[idx]

    def summary(self):
        n = len(self.X)
        up = self.y_dir.sum().item()
        down = n - up
        print(f"StockDatasetV2 | samples={n:,} | UP={up:,} ({up/n:.1%}) | DOWN={down:,} ({down/n:.1%})")
        print(f"  X shape: {tuple(self.X.shape)}")
        print(f"  Return range: [{self.y_ret.min():.4f}, {self.y_ret.max():.4f}]")

    def save_scaler(self, path: str):
        joblib.dump(self.scaler, path)
        print(f"Scaler saved → {path}")

    @staticmethod
    def load_scaler(path: str) -> StandardScaler:
        return joblib.load(path)
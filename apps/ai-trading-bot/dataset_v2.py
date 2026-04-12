"""
dataset_v2.py — PyTorch Dataset for StockPredictor V4
======================================================

KEY CHANGE FROM V3: horizon parameter
───────────────────────────────────────
V3 always predicted the next 1-day return (ret_1d[i+window]).
V4 predicts the N-day cumulative return (horizon=3 by default).

Why multi-day horizon:
    1-day return SNR ≈ 3.3%  (dominated by microstructure noise)
    3-day return SNR ≈ 5.8%  (smoother signal, 75% better)

Label for horizon=3:
    Label[i] = (close[i+window+3] - close[i+window]) / close[i+window]
    i.e., the cumulative return 3 days after the last day of the window.

This is computed from the RAW (unscaled) ret_1d series by chaining:
    3-day return = (1 + ret[t+1]) × (1 + ret[t+2]) × (1 + ret[t+3]) - 1

SINGLE LABEL OUTPUT
────────────────────
V3 returned: X, y_dir (int), y_ret (float)
V4 returns:  X, y_ret (float)   ← just the signed return

Direction is NOT a separate label — it is derived from sign(y_ret).
This matches the V4 model which has a single regression output.
The dataset still computes direction internally for class-balance checking
in the summary() method.

Note: backtest_v2.py and train_v2.py are updated to unpack (X, y_ret)
instead of (X, y_dir, y_ret).
"""

import glob
import os
import sys

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.preprocessing import RobustScaler
from torch.utils.data import ConcatDataset, Dataset

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from features_v2 import FEATURE_COLS, add_features_v2


class StockDatasetV2(Dataset):
    """
    Sliding-window dataset for StockPredictor V4.

    Each sample:
        X (window, n_features):  RobustScaler-normalised feature sequence
        y_ret (float):           signed N-day cumulative return (label)

    Direction is derived at inference: sign(y_ret) → 1=UP, 0=DOWN.
    """

    def __init__(
        self,
        df,
        window:          int   = 30,
        horizon:         int   = 3,     # predict return N days ahead
        noise_threshold: float = 0.002, # slightly higher than 1-day (3-day returns are bigger)
        scaler                 = None,
        symbol:          str   = "",
    ):
        """
        Args:
            df:              Feature-engineered DataFrame (must have FEATURE_COLS).
            window:          Number of past days to use as input.
            horizon:         How many days ahead to predict (1, 3, or 5).
            noise_threshold: Skip samples where |label| < this value.
                             For horizon=3: 0.002 keeps ~88% of samples.
                             For horizon=1: 0.001 keeps ~90% of samples.
            scaler:          Fitted RobustScaler. If None, fit one on this data.
            symbol:          Optional label for summary display.
        """
        missing = set(FEATURE_COLS) - set(df.columns)
        if missing:
            raise ValueError(
                f"DataFrame missing feature columns: {missing}\n"
                "Call add_features_v2() before creating StockDatasetV2."
            )

        df = df[FEATURE_COLS].copy().reset_index(drop=True)

        if scaler is None:
            scaler = RobustScaler()
            data   = scaler.fit_transform(df.values)
        else:
            data   = scaler.transform(df.values)

        self.scaler  = scaler
        self.symbol  = symbol
        self.horizon = horizon

        # Raw ret_1d for label computation (unscaled — scaler should not touch labels)
        ret1d = df["ret_1d"].values

        X_list, y_ret_list = [], []

        # We need window + horizon rows to form one sample
        n = len(data)
        for i in range(n - window - horizon):
            x = data[i : i + window]    # (window, n_features)

            # Compute N-day cumulative return by chaining daily returns
            # ret_1d[i+window]   = return on day window+1 after start
            # ret_1d[i+window+1] = return on day window+2
            # etc.
            cum_return = 1.0
            valid      = True
            for h in range(1, horizon + 1):
                r = ret1d[i + window + h - 1]
                if np.isnan(r):
                    valid = False
                    break
                cum_return *= (1.0 + r)
            if not valid:
                continue

            label = cum_return - 1.0   # e.g. 0.018 = +1.8% over horizon days

            # Skip near-zero moves (noise floor)
            if abs(label) < noise_threshold:
                continue

            X_list.append(x)
            y_ret_list.append(float(label))

        if len(X_list) == 0:
            raise ValueError(
                f"No valid samples (symbol='{symbol}', horizon={horizon}, "
                f"noise_threshold={noise_threshold}). "
                f"Data length={len(df)}, window={window}. "
                "Try a longer date range or lower noise_threshold."
            )

        self.X     = torch.tensor(np.array(X_list), dtype=torch.float32)
        self.y_ret = torch.tensor(y_ret_list,        dtype=torch.float32)
        self.n_features = self.X.shape[2]

        # Compute direction for summary (not returned by __getitem__)
        self._y_dir = (self.y_ret > 0).long()

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        # V4: returns (X, y_ret) — just two values, not three
        return self.X[idx], self.y_ret[idx]

    def summary(self):
        n    = len(self.X)
        up   = int(self._y_dir.sum())
        down = n - up
        sym  = f"[{self.symbol}] " if self.symbol else ""
        print(
            f"  {sym}n={n:,}  "
            f"UP={up} ({up/n:.1%})  DOWN={down} ({down/n:.1%})  "
            f"horizon={self.horizon}d  shape={tuple(self.X.shape)}"
        )

    def save_scaler(self, path: str):
        joblib.dump(self.scaler, path)
        print(f"  Scaler saved → {path}")

    @staticmethod
    def load_scaler(path: str) -> RobustScaler:
        return joblib.load(path)


# ─── Multi-stock dataset builder ──────────────────────────────────────────────

def build_multi_stock_dataset(
    symbols:         list,
    data_dir:        str   = "data",
    window:          int   = 30,
    horizon:         int   = 3,
    noise_threshold: float = 0.002,
    val_split:       float = 0.2,
    gap:             int   = 10,
) -> tuple:
    """
    Build combined train + val datasets from multiple stock symbols.

    Fits ONE RobustScaler on combined training data (no leakage).
    All val sets use the same fitted scaler.

    Returns: (train_dataset, val_dataset, fitted_scaler)
    """
    print(f"\nBuilding multi-stock dataset  horizon={horizon}d  symbols={symbols}")

    train_dfs, val_dfs = [], []

    for symbol in symbols:
        folder = os.path.join(data_dir, symbol.upper())
        files  = sorted(glob.glob(os.path.join(folder, "*.parquet")))
        if not files:
            print(f"  [SKIP] {symbol}: no parquet in {folder}")
            continue

        df_raw = pd.read_parquet(files[-1])
        print(f"  {symbol}: {len(df_raw):,} raw rows")
        df     = add_features_v2(df_raw)

        n       = len(df)
        n_val   = int(n * val_split)
        n_train = n - n_val - gap

        if n_train < window + horizon + 100:
            print(f"  [SKIP] {symbol}: only {n_train} train rows")
            continue

        train_dfs.append((symbol, df.iloc[:n_train].copy()))
        val_dfs.append((symbol,   df.iloc[n_train + gap:].copy()))

    if not train_dfs:
        raise ValueError(
            "No usable data found.\n"
            "Run: python data_fetch_upstox.py --symbol RELIANCE --start 2010-01-01"
        )

    # Fit ONE scaler on ALL training rows combined
    combined = np.vstack([df[FEATURE_COLS].values for _, df in train_dfs])
    scaler   = RobustScaler()
    scaler.fit(combined)
    print(f"\n  Scaler fitted on {len(combined):,} combined training rows")

    train_sets, val_sets = [], []

    for symbol, df in train_dfs:
        try:
            ds = StockDatasetV2(df, window=window, horizon=horizon,
                                noise_threshold=noise_threshold,
                                scaler=scaler, symbol=symbol)
            ds.summary()
            train_sets.append(ds)
        except ValueError as e:
            print(f"  [SKIP train] {symbol}: {e}")

    for symbol, df in val_dfs:
        try:
            ds = StockDatasetV2(df, window=window, horizon=horizon,
                                noise_threshold=noise_threshold,
                                scaler=scaler, symbol=symbol)
            val_sets.append(ds)
        except ValueError as e:
            print(f"  [SKIP val] {symbol}: {e}")

    if not train_sets:
        raise ValueError("All stocks failed dataset creation.")

    train_combined = ConcatDataset(train_sets)
    val_combined   = ConcatDataset(val_sets)
    n_tr = sum(len(d) for d in train_sets)
    n_va = sum(len(d) for d in val_sets)
    print(f"\n  TOTAL: {n_tr:,} train + {n_va:,} val from {len(train_sets)} stocks\n")

    return train_combined, val_combined, scaler
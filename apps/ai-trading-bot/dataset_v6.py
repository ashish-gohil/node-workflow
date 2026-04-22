"""
dataset_v2.py — StockDataset V5
==================================

KEY CHANGES FROM V4
────────────────────
1. Multi-step horizon labels
   V4: y_ret = single scalar (cumulative N-day return)
   V5: y_seq = (horizon,) tensor of cumulative returns from t to t+h
       y_seq[0] = (price[t+1] - price[t]) / price[t]   ← 1-day ahead
       y_seq[1] = (price[t+2] - price[t]) / price[t]   ← 2-day ahead
       y_seq[2] = (price[t+3] - price[t]) / price[t]   ← 3-day ahead (primary signal)

   This gives the model explicit supervision at every horizon step, not just
   the final one. Leads to faster convergence and better calibration.

2. Cyclic temporal features
   V4: calendar features were part of FEATURE_COLS (normalised month_norm etc.)
   V5: calendar features are extracted separately as a second tensor.
       Shape: (window, 6) containing [month_sin, month_cos, dow_sin, dow_cos, dom_sin, dom_cos]
       These are passed as the second input to StockForecastNet.

   Why separate? The temporal embedding module in V5 needs raw cyclic
   values, not pre-normalised scalar values. sin/cos encoding preserves
   the circular structure (December → January is a small step, not a jump
   from 11 to 0 after normalisation).

   If datetime information is not available, time_features is all-zeros.

3. RobustScaler is still used as global pre-processing
   ReVIN in the model handles per-instance non-stationarity.
   The global RobustScaler still serves a purpose: it removes extreme
   outliers (crash days ±10% returns become manageable values) before
   the data enters ReVIN's per-instance normalisation.
   Both scalers work together: global RobustScaler first, then per-window
   ReVIN inside the model.

4. __getitem__ returns THREE values (not two):
   x:             (window, n_features)     — scaled features
   time_features: (window, 6)              — cyclic time encodings
   y_seq:         (horizon,)               — multi-step return labels
"""

import glob
import math
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

from features_v6 import FEATURE_COLS, add_features_v6


# ─── Cyclic time encoding helper ──────────────────────────────────────────────

def _cyclic_encode(values: np.ndarray, period: float) -> np.ndarray:
    """
    Encode a periodic variable using sin/cos.

    Example: months 1–12 encoded as sin(2π×month/12), cos(2π×month/12)
    This makes the encoding continuous across boundaries (Dec → Jan).

    Args:
        values: raw integer values (e.g. month 1–12, weekday 0–4)
        period: the full cycle length (12 for months, 5 for trading days)

    Returns:
        (n, 2) array of [sin, cos] encodings, range [-1, +1]
    """
    angle = 2.0 * math.pi * values / period
    return np.stack([np.sin(angle), np.cos(angle)], axis=-1)


def extract_time_features(df: pd.DataFrame, window_start: int, window_len: int) -> np.ndarray:
    """
    Extract cyclic temporal features for rows [window_start : window_start+window_len].

    Returns:
        time_feats: (window_len, 6) array
            Columns: [month_sin, month_cos, dow_sin, dow_cos, dom_sin, dom_cos]

    If 'datetime' is not in df.columns, returns zeros (model still runs,
    just without temporal context).
    """
    if "datetime" not in df.columns:
        return np.zeros((window_len, 6), dtype=np.float32)

    dt   = pd.to_datetime(df["datetime"].iloc[window_start : window_start + window_len])
    months   = dt.dt.month.values.astype(float)     # 1–12
    weekdays = dt.dt.dayofweek.values.astype(float) # 0 (Mon) – 4 (Fri, ignoring weekends)
    dom      = dt.dt.day.values.astype(float)       # 1–31

    month_enc = _cyclic_encode(months,   12.0)   # (T, 2)
    dow_enc   = _cyclic_encode(weekdays,  5.0)   # (T, 2)
    dom_enc   = _cyclic_encode(dom,      31.0)   # (T, 2)

    return np.concatenate([month_enc, dow_enc, dom_enc], axis=-1).astype(np.float32)
    # → (T, 6)


# ─── Dataset ──────────────────────────────────────────────────────────────────

class StockDatasetV2(Dataset):
    """
    Sliding-window dataset for StockForecastNet V5.

    Each sample is a (window, horizon) pair:
        x             (window, n_features): scaled feature sequences
        time_features (window, 6):          cyclic temporal encodings
        y_seq         (horizon,):           multi-step cumulative return labels

    y_seq[h] = (close[i+window+h+1] - close[i+window]) / close[i+window]

    i.e. the cumulative return from the LAST day of the window to each
    future day. y_seq[0] is the 1-day ahead, y_seq[-1] is the N-day ahead.

    The primary training signal is y_seq[-1] (the furthest horizon),
    but the model is also supervised at intermediate steps.
    """

    def __init__(
        self,
        df,
        window:          int   = 90,     # sequence length (60–90 days recommended)
        horizon:         int   = 3,      # number of future steps (3–5 days)
        noise_threshold: float = 0.001,  # skip samples where |y_seq[-1]| < threshold
        scaler                 = None,   # fitted RobustScaler or None to fit new
        symbol:          str   = "",     # for summary display
    ):
        """
        Args:
            df:              DataFrame with FEATURE_COLS (from add_features_v6)
                             and optionally a 'datetime' column.
            window:          How many past days to include in each sample.
            horizon:         How many future days to predict (multi-step labels).
            noise_threshold: Skip samples where the primary label |y[-1]| is too
                             small to be meaningful. Reduces noise in training.
            scaler:          Pre-fitted RobustScaler. If None, fit on this df.
            symbol:          Optional name for summary prints.
        """
        missing = set(FEATURE_COLS) - set(df.columns)
        if missing:
            raise ValueError(
                f"DataFrame missing feature columns: {missing}\n"
                "Call add_features_v6(df) before creating StockDatasetV2."
            )

        # ── Store close prices for backtest mark-to-market ─────────────────
        # Before narrowing to FEATURE_COLS, save the raw close price series.
        # The backtest uses these to compute share quantities and entry/exit prices.
        if "close" in df.columns:
            self._close_prices = df["close"].values.copy()
        else:
            self._close_prices = None

        # ── Also store datetime for temporal feature extraction ─────────────
        self._has_datetime = "datetime" in df.columns
        self._df_ref = df   # keep reference for extract_time_features

        # ── Scale features ─────────────────────────────────────────────────
        df_feat = df[FEATURE_COLS].copy().reset_index(drop=True)

        if scaler is None:
            scaler = RobustScaler()
            data   = scaler.fit_transform(df_feat.values)
        else:
            data   = scaler.transform(df_feat.values)

        self.scaler  = scaler
        self.symbol  = symbol
        self.window  = window
        self.horizon = horizon

        # ret_1d values for multi-step label computation (unscaled)
        ret1d = df["ret_1d"].values   # already a return, no need for raw close

        # Close prices for computing cumulative returns from window end
        # Use ret_1d to reconstruct relative price: P[t+h]/P[t] = prod(1+ret[k])
        # Actually we need the close prices to compute y[h] = (P[t+h] - P[t]) / P[t]
        # P is not in FEATURE_COLS, so we use ret_1d to chain returns
        # P[t+h]/P[t] = prod_{k=1}^{h} (1 + ret_1d[t+k])
        # y[h] = P[t+h]/P[t] - 1

        n = len(data)

        X_list    = []
        time_list = []
        y_list    = []

        for i in range(n - window - horizon):
            # Input window: features [i .. i+window-1]
            x = data[i : i + window]     # (window, n_features)

            # Multi-step labels: cumulative returns from position i+window
            labels = np.zeros(horizon, dtype=np.float32)
            valid  = True
            cum    = 1.0

            for h in range(1, horizon + 1):
                r = ret1d[i + window + h - 1]
                if np.isnan(r) or np.isinf(r):
                    valid = False
                    break
                cum        *= (1.0 + r)
                labels[h - 1] = float(cum - 1.0)
                # labels[0] = 1-day cumulative return from window end
                # labels[1] = 2-day cumulative return from window end
                # labels[h-1] = h-day cumulative return from window end

            if not valid:
                continue

            # Skip if primary label (furthest horizon) is near zero
            if abs(labels[-1]) < noise_threshold:
                continue

            # Temporal features for this window
            tf = extract_time_features(df, window_start=i, window_len=window)

            X_list.append(x.astype(np.float32))
            time_list.append(tf)
            y_list.append(labels)

        if len(X_list) == 0:
            raise ValueError(
                f"No valid samples (symbol='{symbol}', window={window}, "
                f"horizon={horizon}, noise_threshold={noise_threshold}). "
                f"Data rows: {n}. Try a longer date range or lower noise_threshold."
            )

        self.X             = torch.tensor(np.array(X_list),    dtype=torch.float32)
        self.time_features = torch.tensor(np.array(time_list), dtype=torch.float32)
        self.y_seq         = torch.tensor(np.array(y_list),    dtype=torch.float32)
        self.n_features    = self.X.shape[2]

        # For internal use (summary, backtest)
        self._primary_labels = self.y_seq[:, -1]   # furthest horizon step

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        """
        Returns: (x, time_features, y_seq)
            x:             (window, n_features)  — scaled feature window
            time_features: (window, 6)            — cyclic time encodings
            y_seq:         (horizon,)             — multi-step return labels
        """
        return self.X[idx], self.time_features[idx], self.y_seq[idx]

    def summary(self):
        n     = len(self.X)
        up    = (self._primary_labels > 0).sum().item()
        down  = n - up
        sym   = f"[{self.symbol}] " if self.symbol else ""
        print(
            f"  {sym}n={n:,}  "
            f"UP={up} ({up/n:.1%})  DOWN={down} ({down/n:.1%})  "
            f"horizon={self.horizon}d  shape={tuple(self.X.shape)}  "
            f"time_shape={tuple(self.time_features.shape)}",
            flush=True,
        )

    def save_scaler(self, path: str):
        joblib.dump(self.scaler, path)
        print(f"  Scaler saved → {path}", flush=True)

    @staticmethod
    def load_scaler(path: str) -> RobustScaler:
        return joblib.load(path)


# ─── Multi-stock dataset builder ──────────────────────────────────────────────

def build_multi_stock_dataset(
    symbols:         list,
    data_dir:        str   = "data",
    window:          int   = 90,
    horizon:         int   = 3,
    noise_threshold: float = 0.001,
    val_split:       float = 0.2,
    gap:             int   = 10,
) -> tuple:
    """
    Build combined train + val datasets from multiple NSE stock symbols.

    Uses a single shared RobustScaler fitted on ALL training data combined.
    This ensures consistent scaling across stocks at the global level,
    while ReVIN in the model handles per-window non-stationarity.

    Args:
        symbols:         NSE stock tickers (["RELIANCE", "TCS", ...])
        data_dir:        Root data directory (contains data/{SYMBOL}/ folders)
        window:          Input sequence length (60–90 days)
        horizon:         Prediction horizon steps (3–5)
        noise_threshold: Min |primary label| to include sample
        val_split:       Fraction of each stock for validation
        gap:             Days to skip between train and val splits

    Returns:
        (train_dataset, val_dataset, fitted_scaler)
    """
    print(f"\nBuilding multi-stock dataset: {symbols}", flush=True)

    train_dfs = []
    val_dfs   = []

    for symbol in symbols:
        folder = os.path.join(data_dir, symbol.upper())
        files  = sorted(glob.glob(os.path.join(folder, "*.parquet")))
        if not files:
            print(f"  [SKIP] {symbol}: no .parquet in {folder}", flush=True)
            continue

        df_raw = pd.read_parquet(files[-1])
        print(f"  {symbol}: {len(df_raw):,} raw rows", flush=True)

        df = add_features_v6(df_raw)

        n       = len(df)
        n_val   = int(n * val_split)
        n_train = n - n_val - gap

        if n_train < window + horizon + 50:
            print(f"  [SKIP] {symbol}: only {n_train} training rows", flush=True)
            continue

        train_dfs.append((symbol, df.iloc[:n_train].copy()))
        val_dfs.append((symbol, df.iloc[n_train + gap:].copy()))

    if not train_dfs:
        raise ValueError(
            "No usable stock data. "
            "Run: python data_fetch_upstox.py --symbol RELIANCE --start 2010-01-01"
        )

    # Fit ONE scaler on ALL training data
    combined = np.vstack([df[FEATURE_COLS].values for _, df in train_dfs])
    scaler   = RobustScaler()
    scaler.fit(combined)
    print(f"\n  Shared scaler fitted on {len(combined):,} rows from {len(train_dfs)} stocks", flush=True)

    train_sets, val_sets = [], []

    for symbol, df in train_dfs:
        try:
            ds = StockDatasetV2(df, window=window, horizon=horizon,
                                noise_threshold=noise_threshold,
                                scaler=scaler, symbol=symbol)
            ds.summary()
            train_sets.append(ds)
        except ValueError as e:
            print(f"  [SKIP train] {symbol}: {e}", flush=True)

    for symbol, df in val_dfs:
        try:
            ds = StockDatasetV2(df, window=window, horizon=horizon,
                                noise_threshold=noise_threshold,
                                scaler=scaler, symbol=symbol)
            val_sets.append(ds)
        except ValueError as e:
            print(f"  [SKIP val] {symbol}: {e}", flush=True)

    if not train_sets:
        raise ValueError("All stocks failed. Check data and parameters.")

    train_combined = ConcatDataset(train_sets)
    val_combined   = ConcatDataset(val_sets)

    n_tr = sum(len(d) for d in train_sets)
    n_va = sum(len(d) for d in val_sets)
    print(
        f"\n  TOTAL: {n_tr:,} train + {n_va:,} val samples "
        f"from {len(train_sets)} stocks\n",
        flush=True,
    )

    return train_combined, val_combined, scaler
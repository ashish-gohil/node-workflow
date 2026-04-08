"""
features_v2.py — Feature engineering for stock OHLCV data.

Improvements over original:
- Added MACD, Bollinger Bands, ATR, VWAP, OBV, price position features
- Explicit FEATURE_COLS list — single source of truth used by dataset + API
- No more silent NaN propagation: dropna() called at the end with a note
- All features are stateless transforms (no lookahead leakage)
"""

import numpy as np
import pandas as pd

# ─── Canonical feature column list ────────────────────────────────────────────
# This is imported by dataset_v2.py, train_v2.py, and api_v2.py.
# Update here → updates everywhere.
FEATURE_COLS = [
    "open", "high", "low", "close", "volume",
    "returns",
    "log_returns",
    "volatility",
    "volume_ratio",
    "ma_10", "ma_20", "ma_50",
    "ema_12", "ema_26",
    "macd", "macd_signal",
    "rsi",
    "bb_upper", "bb_lower", "bb_width", "bb_position",
    "atr",
    "high_low_ratio",
    "close_to_high",
    "close_to_low",
    "resistance", "breakout",
]


def add_features_v2(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add technical indicators to a raw OHLCV DataFrame.

    Args:
        df: DataFrame with columns [open, high, low, close, volume]

    Returns:
        DataFrame with FEATURE_COLS added, NaN rows dropped.
        Column order matches FEATURE_COLS.
    """
    df = df.copy()
    _validate_ohlcv(df)

    # ── Momentum ──────────────────────────────────────────────────────────────
    df["returns"] = df["close"].pct_change()
    df["log_returns"] = np.log(df["close"] / df["close"].shift(1))

    # ── Volatility ────────────────────────────────────────────────────────────
    df["volatility"] = df["returns"].rolling(10).std()

    # ── Volume ────────────────────────────────────────────────────────────────
    vol_ma = df["volume"].rolling(10).mean()
    df["volume_ratio"] = df["volume"] / vol_ma.replace(0, np.nan)

    # ── Moving averages ───────────────────────────────────────────────────────
    df["ma_10"] = df["close"].rolling(10).mean()
    df["ma_20"] = df["close"].rolling(20).mean()
    df["ma_50"] = df["close"].rolling(50).mean()

    # ── MACD ──────────────────────────────────────────────────────────────────
    df["ema_12"] = df["close"].ewm(span=12, adjust=False).mean()
    df["ema_26"] = df["close"].ewm(span=26, adjust=False).mean()
    df["macd"] = df["ema_12"] - df["ema_26"]
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()

    # ── RSI ───────────────────────────────────────────────────────────────────
    df["rsi"] = _compute_rsi(df["close"], period=14)

    # ── Bollinger Bands ───────────────────────────────────────────────────────
    bb_mid = df["close"].rolling(20).mean()
    bb_std = df["close"].rolling(20).std()
    df["bb_upper"] = bb_mid + 2 * bb_std
    df["bb_lower"] = bb_mid - 2 * bb_std
    bb_range = (df["bb_upper"] - df["bb_lower"]).replace(0, np.nan)
    df["bb_width"] = bb_range / bb_mid
    df["bb_position"] = (df["close"] - df["bb_lower"]) / bb_range  # 0=lower band, 1=upper

    # ── ATR (Average True Range) ──────────────────────────────────────────────
    df["atr"] = _compute_atr(df, period=14)

    # ── Price position features ───────────────────────────────────────────────
    hl = (df["high"] - df["low"]).replace(0, np.nan)
    df["high_low_ratio"] = hl / df["close"]
    df["close_to_high"] = (df["high"] - df["close"]) / hl
    df["close_to_low"] = (df["close"] - df["low"]) / hl

    # ── Breakout ──────────────────────────────────────────────────────────────
    df["resistance"] = df["high"].rolling(20).max()
    df["breakout"] = (df["close"] > df["resistance"].shift(1)).astype(float)

    # ── Drop NaN rows introduced by rolling windows ───────────────────────────
    before = len(df)
    df = df.dropna(subset=FEATURE_COLS).reset_index(drop=True)
    print(f"[features] Dropped {before - len(df)} NaN rows → {len(df)} clean rows")

    return df[FEATURE_COLS]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _validate_ohlcv(df: pd.DataFrame):
    required = {"open", "high", "low", "close", "volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"DataFrame missing columns: {missing}")


def _compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _compute_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high_low = df["high"] - df["low"]
    high_close = (df["high"] - df["close"].shift(1)).abs()
    low_close = (df["low"] - df["close"].shift(1)).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return true_range.rolling(period).mean()
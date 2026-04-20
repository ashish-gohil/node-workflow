"""
features_v2.py — Feature engineering for stock OHLCV data
===========================================================
Integrates all 19 strategy modules into a single 60-feature stationary dataset.

DESIGN PRINCIPLES
─────────────────
1. ALL features are stationary.
   Raw prices (open/high/low/close) are NON-STATIONARY — their mean changes
   over time (RELIANCE went from ₹300 in 2010 to ₹2500 today).
   StandardScaler/RobustScaler fitted on training data will produce wildly
   wrong normalisations for future data.
   FIX: every feature is a RATIO, RETURN, or NORMALISED VALUE that has
   the same statistical distribution in 2010 and 2025.

2. No lookahead leakage.
   All rolling windows use pandas default (closed='right') which includes
   only rows up to and including the current row.
   All .shift(N) calls use positive N (shift backward = look at past).
   No shift(-N) anywhere.

3. FEATURE_COLS is the single source of truth.
   dataset_v2.py, train_v2.py, api_v2.py, infer.py all import from here.
   Change features here → changes everywhere automatically.

4. NaN handling.
   Rolling windows create NaN in the first N rows. These are dropped at
   the end of add_features_v2(). The scaler is never fit on NaN rows.

LOOKAHEAD AUDIT (all clean):
   pct_change(N)     → only uses past N values
   rolling(N).mean() → closed='right', only past
   ewm(span=N)       → only past (adjust=False)
   shift(1)          → looks at yesterday (past)
   cumsum()          → only accumulates past values
"""

import numpy as np
import pandas as pd
import os
import sys

# Path fix so this file works when imported from any directory
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from strategies.stochastic_strategy import StochasticStrategy
from strategies.cci_strategy import CCIStrategy
from strategies.williams_r_strategy import WilliamsRStrategy
from strategies.obv_strategy import OBVStrategy
from strategies.donchian_strategy import DonchianStrategy
from strategies.supertrend_strategy import SuperTrendStrategy
from strategies.keltner_strategy import KeltnerStrategy
from strategies.heikin_ashi_strategy import HeikinAshiStrategy
from strategies.pivot_strategy import PivotStrategy
from strategies.ichimoku_strategy import IchimokuStrategy


# ─── FEATURE_COLS — canonical list, 60 stationary features ────────────────────
# The Variable Selection Network in model_v2.py will learn which of these
# are actually predictive for a given stock. Having more features is fine —
# the VSN suppresses noisy ones automatically.

FEATURE_COLS = [

    # ── RETURNS (6) ───────────────────────────────────────────────────────────
    # All are pct_change = stationary regardless of price level
    "ret_1d",        # today's return: (close - prev_close) / prev_close
    "ret_3d",        # 3-day cumulative return
    "ret_5d",        # 1-week return
    "ret_10d",       # 2-week return
    "ret_20d",       # 1-month return
    "log_ret_1d",    # log(close/prev_close) — symmetric, better for modelling

    # ── VOLATILITY (3) ────────────────────────────────────────────────────────
    "vol_5d",        # std(daily returns, 5 days) — short-term choppiness
    "vol_20d",       # std(daily returns, 20 days) — medium-term volatility
    "vol_ratio",     # vol_5d / vol_20d — is volatility expanding or contracting?

    # ── VOLUME RATIOS (3) ─────────────────────────────────────────────────────
    "volume_ratio_5d",   # today's volume / 5-day avg — unusual activity?
    "volume_ratio_20d",  # today's volume / 20-day avg
    "volume_trend",      # 5-day vol avg / 20-day vol avg — is participation growing?

    # ── MA RATIOS (5) ─────────────────────────────────────────────────────────
    # close/MA - 1 is stationary (mean-reverts around 0)
    "price_to_ma10",  # short-term: +0.02 = price 2% above 10-day MA
    "price_to_ma20",  # medium-term
    "price_to_ma50",  # long-term
    "ma10_to_ma20",   # MA10/MA20 - 1: crossover signal (pos = bullish)
    "ma20_to_ma50",   # MA20/MA50 - 1

    # ── MACD (2) ──────────────────────────────────────────────────────────────
    "macd_norm",       # (EMA12-EMA26) / close — momentum speed, normalised
    "macd_hist_norm",  # (MACD - Signal) / close — is momentum accelerating?

    # ── RSI (3) ───────────────────────────────────────────────────────────────
    "rsi_14",    # standard 14-period RSI (0-100)
    "rsi_7",     # faster 7-period RSI — catches reversals sooner
    "rsi_diff",  # rsi_7 - rsi_14: positive = short-term stronger than medium

    # ── BOLLINGER BANDS (2) ───────────────────────────────────────────────────
    "bb_position",  # (close-lower)/(upper-lower): 0=at lower, 1=at upper band
    "bb_width",     # (upper-lower)/MA20: low = squeeze, breakout likely

    # ── ATR (2) ───────────────────────────────────────────────────────────────
    "atr_pct",    # ATR / close * 100: typical daily move as % of price
    "atr_ratio",  # current ATR / 20-day avg ATR: volatility expanding?

    # ── PRICE STRUCTURE / CANDLE SHAPE (5) ───────────────────────────────────
    "close_to_high",  # (High-Close)/(High-Low): 0 = closed at day's high
    "close_to_low",   # (Close-Low)/(High-Low): 0 = closed at day's low
    "body_ratio",     # |Close-Open|/(High-Low): 1 = marubozu (full directional)
    "upper_wick",     # wick above body / range: bearish rejection
    "lower_wick",     # wick below body / range: bullish rejection

    # ── BREAKOUT / SUPPORT (3) ────────────────────────────────────────────────
    "pct_from_20d_high",  # (close - 20d_high) / 20d_high: negative = below resistance
    "pct_from_20d_low",   # (close - 20d_low) / 20d_low: positive = above support
    "breakout_flag",      # 1 if close > yesterday's 20-day high

    # ── STOCHASTIC (2) ────────────────────────────────────────────────────────
    "stoch_norm",    # %K / 100 (0-1): position in 14-day price range
    "stoch_cross",   # +1 K crossed above D, -1 crossed below (momentum flip)

    # ── CCI (1) ───────────────────────────────────────────────────────────────
    "cci_norm",      # CCI / 200, clipped [-1,+1]: deviation from statistical avg

    # ── WILLIAMS %R (1) ───────────────────────────────────────────────────────
    "williams_r_norm",  # normalised %R (0=oversold, 1=overbought)

    # ── ON-BALANCE VOLUME (2) ─────────────────────────────────────────────────
    "obv_change",    # +1/-1: was today a volume accumulation or distribution day?
    "obv_to_ma20",   # OBV / OBV_MA20 - 1: divergence from trend (stationary)

    # ── DONCHIAN CHANNELS (2) ─────────────────────────────────────────────────
    "don_position",      # where close sits in 20-day channel (0=bottom, 1=top)
    "don_breakout_up",   # 1 if price broke above yesterday's 20-day high

    # ── SUPERTREND (2) ────────────────────────────────────────────────────────
    "supertrend_dir",   # +1 = uptrend, -1 = downtrend (very popular in India)
    "supertrend_dist",  # (close - supertrend_line) / close: how far above/below

    # ── HEIKIN-ASHI (2) ───────────────────────────────────────────────────────
    "ha_trend",         # +1 bullish HA candle, -1 bearish
    "ha_body_norm",     # HA body / close: trend strength from smoothed candles

    # ── PIVOT POINTS (3) ──────────────────────────────────────────────────────
    "dist_to_pp",   # (close - pivot_point) / close: above/below fair value
    "dist_to_r1",   # distance to nearest resistance
    "dist_to_s1",   # distance to nearest support

    # ── ICHIMOKU (2) ──────────────────────────────────────────────────────────
    "ichi_above_cloud",  # +1 above cloud (bullish), -1 below (bearish), 0 inside
    "ichi_tk_cross",     # +1 Tenkan crossed above Kijun (buy signal)

    # ── TREND STRENGTH (2) ────────────────────────────────────────────────────
    "adx_proxy",          # simplified ADX: 0-100, high = strong trend
    "trend_consistency",  # % of last 10 days matching 20-day trend direction

    # ── CALENDAR (3) ──────────────────────────────────────────────────────────
    "day_of_week",   # 0=Mon, 1=Fri (normalised): Mon gaps, Fri profit-taking
    "month_norm",    # 0=Jan, 1=Dec: seasonal patterns, Jan effect, Dec selling
    "is_month_end",  # 1 if last 3 days of month: options expiry, rebalancing
    
]


# ─── Main feature engineering function ────────────────────────────────────────

def add_features_v2(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all 60 features from a raw OHLCV DataFrame.

    Args:
        df: DataFrame with columns [open, high, low, close, volume].
            'datetime' column or index is used for calendar features if present.

    Returns:
        DataFrame with exactly FEATURE_COLS columns, NaN warmup rows dropped.
        Column order matches FEATURE_COLS exactly.
        All values are stationary — safe to use across any date range.
    """
    df = df.copy()
    _validate_ohlcv(df)

    # Normalise datetime
    if "datetime" not in df.columns and df.index.name == "datetime":
        df = df.reset_index()
    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"])

    close  = df["close"]
    high   = df["high"]
    low    = df["low"]
    open_  = df["open"]
    volume = df["volume"]

    # ── Returns ───────────────────────────────────────────────────────────────
    df["ret_1d"]     = close.pct_change(1)
    df["ret_3d"]     = close.pct_change(3)
    df["ret_5d"]     = close.pct_change(5)
    df["ret_10d"]    = close.pct_change(10)
    df["ret_20d"]    = close.pct_change(20)
    df["log_ret_1d"] = np.log(close / close.shift(1))

    # ── Volatility ────────────────────────────────────────────────────────────
    ret      = close.pct_change()
    df["vol_5d"]    = ret.rolling(5).std()
    df["vol_20d"]   = ret.rolling(20).std()
    df["vol_ratio"] = df["vol_5d"] / df["vol_20d"].replace(0, np.nan)

    # ── Volume ratios ─────────────────────────────────────────────────────────
    vm5  = volume.rolling(5).mean().replace(0, np.nan)
    vm20 = volume.rolling(20).mean().replace(0, np.nan)
    df["volume_ratio_5d"]  = volume / vm5
    df["volume_ratio_20d"] = volume / vm20
    df["volume_trend"]     = vm5 / vm20

    # ── MA ratios ─────────────────────────────────────────────────────────────
    ma10 = close.rolling(10).mean()
    ma20 = close.rolling(20).mean()
    ma50 = close.rolling(50).mean()
    df["price_to_ma10"] = close / ma10 - 1
    df["price_to_ma20"] = close / ma20 - 1
    df["price_to_ma50"] = close / ma50.replace(0, np.nan) - 1
    df["ma10_to_ma20"]  = ma10 / ma20 - 1
    df["ma20_to_ma50"]  = ma20 / ma50.replace(0, np.nan) - 1

    # ── MACD ──────────────────────────────────────────────────────────────────
    ema12  = close.ewm(span=12, adjust=False).mean()
    ema26  = close.ewm(span=26, adjust=False).mean()
    macd   = ema12 - ema26
    sig    = macd.ewm(span=9, adjust=False).mean()
    df["macd_norm"]      = macd / close.replace(0, np.nan)
    df["macd_hist_norm"] = (macd - sig) / close.replace(0, np.nan)  

    # ── RSI ───────────────────────────────────────────────────────────────────
    df["rsi_14"]   = _rsi(close, 14)
    df["rsi_7"]    = _rsi(close, 7)
    df["rsi_diff"] = df["rsi_7"] - df["rsi_14"]

    # ── Bollinger Bands ───────────────────────────────────────────────────────
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    bb_up  = bb_mid + 2 * bb_std
    bb_dn  = bb_mid - 2 * bb_std
    bb_rng = (bb_up - bb_dn).replace(0, np.nan)
    df["bb_upper"]    = bb_up    # needed by KeltnerStrategy for squeeze
    df["bb_lower"]    = bb_dn
    df["bb_position"] = (close - bb_dn) / bb_rng
    df["bb_width"]    = bb_rng / bb_mid.replace(0, np.nan)

    # ── ATR ───────────────────────────────────────────────────────────────────
    atr = _atr(df, 14)
    df["atr_pct"]   = atr / close.replace(0, np.nan) * 100
    df["atr_ratio"] = atr / atr.rolling(20).mean().replace(0, np.nan)

    # ── Price structure (candle shape) ────────────────────────────────────────
    hl = (high - low).replace(0, np.nan)
    df["close_to_high"] = (high - close) / hl
    df["close_to_low"]  = (close - low)  / hl
    df["body_ratio"]    = (close - open_).abs() / hl
    df["upper_wick"]    = (high - df[["open", "close"]].max(axis=1)) / hl
    df["lower_wick"]    = (df[["open", "close"]].min(axis=1) - low)  / hl

    # ── Breakout ──────────────────────────────────────────────────────────────
    h20 = high.rolling(20).max()
    l20 = low.rolling(20).min()
    df["pct_from_20d_high"] = (close - h20) / h20.replace(0, np.nan)
    df["pct_from_20d_low"]  = (close - l20) / l20.replace(0, np.nan)
    df["breakout_flag"]     = (close > h20.shift(1)).astype(float)

    # ── ADX proxy ─────────────────────────────────────────────────────────────
    up_mv   = high.diff()
    dn_mv   = -low.diff()
    plus_dm = up_mv.where((up_mv > dn_mv) & (up_mv > 0), 0.0)
    minus_dm = dn_mv.where((dn_mv > up_mv) & (dn_mv > 0), 0.0)
    tr_sm   = _atr(df, 1).rolling(14).mean().replace(0, np.nan)
    plus_di  = 100 * plus_dm.rolling(14).mean()  / tr_sm
    minus_di = 100 * minus_dm.rolling(14).mean() / tr_sm
    df["adx_proxy"] = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)

    # ── Trend consistency ─────────────────────────────────────────────────────
    df["trend_consistency"] = (
        (np.sign(df["ret_1d"]) == np.sign(df["ret_20d"]))
        .astype(float).rolling(10).mean()
    )

    # ── Calendar ──────────────────────────────────────────────────────────────
    if "datetime" in df.columns:
        dt = df["datetime"]
        df["day_of_week"]  = dt.dt.dayofweek / 4.0
        df["month_norm"]   = (dt.dt.month - 1) / 11.0
        df["is_month_end"] = (
            dt.dt.is_month_end | (dt.dt.day >= dt.dt.days_in_month - 2)
        ).astype(float)
    else:
        df["day_of_week"] = 0.0
        df["month_norm"]  = 0.0
        df["is_month_end"] = 0.0

    # ── Apply strategy modules ─────────────────────────────────────────────────
    # Each strategy adds its own columns; we then pick what we need in FEATURE_COLS

    df = StochasticStrategy(k_period=14, d_period=3).apply(df)
    df = CCIStrategy(period=20).apply(df)
    df = WilliamsRStrategy(period=14).apply(df)
    df = OBVStrategy(ma_period=20).apply(df)
    df = DonchianStrategy(period=20).apply(df)
    df = SuperTrendStrategy(period=10, multiplier=3.0).apply(df)
    df = KeltnerStrategy(ema_period=20, atr_period=10, multiplier=2.0).apply(df)
    df = HeikinAshiStrategy().apply(df)
    df = PivotStrategy(threshold_pct=0.005).apply(df)
    df = IchimokuStrategy(tenkan=9, kijun=26, senkou_b=52).apply(df)

    # ── Drop NaN warmup rows ──────────────────────────────────────────────────
    # Ichimoku(52) + shift(26) needs 78 rows warmup — this is the longest
    before = len(df)
    df = df.dropna(subset=FEATURE_COLS).reset_index(drop=True)
    print(
        f"[features] {before:,} rows → {len(df):,} clean rows "
        f"(dropped {before - len(df)} NaN warmup rows, "
        f"need ~100 rows minimum per stock)"
    )

    return df[FEATURE_COLS]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _validate_ohlcv(df: pd.DataFrame):
    required = {"open", "high", "low", "close", "volume"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(
            f"DataFrame missing columns: {missing}\n"
            f"Available columns: {sorted(df.columns.tolist())}"
        )


def _rsi(close: pd.Series, period: int) -> pd.Series:
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = (-delta.clip(upper=0)).rolling(period).mean()
    rs    = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _atr(df: pd.DataFrame, period: int) -> pd.Series:
    hl = df["high"] - df["low"]
    hc = (df["high"] - df["close"].shift(1)).abs()
    lc = (df["low"]  - df["close"].shift(1)).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    return tr if period == 1 else tr.rolling(period).mean()
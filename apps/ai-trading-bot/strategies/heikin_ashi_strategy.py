"""
strategies/heikin_ashi_strategy.py — Heikin-Ashi Candles

WHAT HEIKIN-ASHI IS:
    Heikin-Ashi (Japanese: "average bar") is a modified candlestick chart
    that smooths price action by using averaged values instead of raw OHLC.

    HA_Close = (Open + High + Low + Close) / 4         (average of all 4 prices)
    HA_Open  = (Prev HA_Open + Prev HA_Close) / 2      (average of prev HA candle)
    HA_High  = max(High, HA_Open, HA_Close)
    HA_Low   = min(Low,  HA_Open, HA_Close)

WHY HEIKIN-ASHI IS USEFUL:
    Regular candles are noisy — price jumps up and down each day. This makes it
    hard to see the underlying trend.

    Heikin-Ashi SMOOTHS this noise:
    - Strong uptrend:   most candles are green with NO lower wick
    - Strong downtrend: most candles are red with NO upper wick
    - Trend weakening:  small bodies appear, wicks on both sides

    The model benefits because HA features encode TREND STRENGTH more directly
    than raw price structure.

    IMPORTANT: Heikin-Ashi candles are for signal generation only.
    For actual trade execution, use the original OHLC prices (not HA).

COLUMNS ADDED:
    ha_open, ha_high, ha_low, ha_close:  The 4 HA candle values (non-stationary)
    ha_body:        HA_Close - HA_Open (positive = bullish HA candle)
    ha_trend:       +1 if HA close > HA open (bullish), -1 if bearish
    ha_no_low_wick: 1 if HA low wick is very small (strong uptrend signal)
    ha_no_hi_wick:  1 if HA upper wick is very small (strong downtrend signal)
    ha_body_norm:   ha_body / close (stationary, for model input)
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class HeikinAshiStrategy(BaseStrategy):

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        ha_close = (df["open"] + df["high"] + df["low"] + df["close"]) / 4.0

        ha_open = pd.Series(index=df.index, dtype=float)
        ha_open.iloc[0] = (df["open"].iloc[0] + df["close"].iloc[0]) / 2.0
        for i in range(1, len(df)):
            ha_open.iloc[i] = (ha_open.iloc[i - 1] + ha_close.iloc[i - 1]) / 2.0

        ha_high = pd.concat(
            [df["high"], ha_open, ha_close], axis=1
        ).max(axis=1)
        ha_low  = pd.concat(
            [df["low"],  ha_open, ha_close], axis=1
        ).min(axis=1)

        df["ha_open"]  = ha_open
        df["ha_high"]  = ha_high
        df["ha_low"]   = ha_low
        df["ha_close"] = ha_close

        # Candle body: positive = bullish HA bar, negative = bearish
        df["ha_body"] = ha_close - ha_open

        # Trend direction from HA candle
        df["ha_trend"] = np.sign(df["ha_body"])

        # Wick analysis (stationary ratios)
        ha_range = (ha_high - ha_low).replace(0, np.nan)
        upper_wick = (ha_high - df[["ha_open", "ha_close"]].max(axis=1)) / ha_range
        lower_wick = (df[["ha_open", "ha_close"]].min(axis=1) - ha_low) / ha_range

        # Strong trend signals: no wick on the trend side
        df["ha_no_low_wick"]  = (lower_wick < 0.05).astype(float)   # strong uptrend
        df["ha_no_hi_wick"]   = (upper_wick < 0.05).astype(float)   # strong downtrend

        # Stationary body for model
        df["ha_body_norm"]    = df["ha_body"] / df["close"].replace(0, np.nan)

        return df
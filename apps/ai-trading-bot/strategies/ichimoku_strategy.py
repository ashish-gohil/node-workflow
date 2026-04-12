"""
strategies/ichimoku_strategy.py — Ichimoku Cloud (Ichimoku Kinko Hyo)

WHAT ICHIMOKU IS:
    Ichimoku ("one look equilibrium chart") is a comprehensive indicator that shows
    support/resistance, trend direction, momentum, AND buy/sell signals all at once.

    5 components (all based on midpoints of highs/lows over different periods):

    Tenkan-sen (Conversion Line, 9):
        (9-day High + 9-day Low) / 2
        Fast moving "average" — if price is above it, short-term bullish.

    Kijun-sen (Base Line, 26):
        (26-day High + 26-day Low) / 2
        Slower version. Primary trend indicator.
        Price above = uptrend; below = downtrend.

    Senkou Span A (Leading Span A):
        (Tenkan + Kijun) / 2  — plotted 26 periods AHEAD
        One edge of the "cloud" (Kumo).

    Senkou Span B (Leading Span B, 52):
        (52-day High + 52-day Low) / 2 — plotted 26 periods AHEAD
        Other edge of the cloud.

    Chikou Span (Lagging Span):
        Today's close plotted 26 periods BACK.

THE CLOUD (Kumo):
    Area between Span A and Span B. Think of it as a dynamic support/resistance zone.
    - Price ABOVE cloud = uptrend
    - Price BELOW cloud = downtrend
    - Price INSIDE cloud = sideways/transition

WHY WE USE LAGGED VALUES:
    Spans A and B are "future projected" in visual charts but for ML training
    we use the current-day values shifted back (equivalent to projecting forward).
    This is standard for using Ichimoku in backtesting.

COLUMNS ADDED (all stationary — as distance ratios to close):
    ichi_tenkan_dist:  (Tenkan - close) / close
    ichi_kijun_dist:   (Kijun - close) / close
    ichi_cloud_top:    max(SpanA, SpanB) 26 periods ago relative to close
    ichi_cloud_bot:    min(SpanA, SpanB) 26 periods ago relative to close
    ichi_above_cloud:  1 if price is above the cloud, -1 if below, 0 inside
    ichi_tk_cross:     +1 when Tenkan crosses above Kijun (bullish), -1 for bearish
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class IchimokuStrategy(BaseStrategy):

    def __init__(self, tenkan: int = 9, kijun: int = 26, senkou_b: int = 52):
        self.tenkan   = tenkan
        self.kijun    = kijun
        self.senkou_b = senkou_b

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        def midpoint(series_high, series_low, n):
            return (series_high.rolling(n).max() + series_low.rolling(n).min()) / 2.0

        tenkan  = midpoint(df["high"], df["low"], self.tenkan)
        kijun   = midpoint(df["high"], df["low"], self.kijun)
        span_a  = (tenkan + kijun) / 2.0
        span_b  = midpoint(df["high"], df["low"], self.senkou_b)

        close   = df["close"].replace(0, np.nan)
        df["ichi_tenkan_dist"] = (tenkan - df["close"]) / close
        df["ichi_kijun_dist"]  = (kijun  - df["close"]) / close

        # Cloud levels from 26 periods ago (what the cloud shows "now" in a live chart)
        cloud_top = span_a.shift(self.kijun).combine(span_b.shift(self.kijun), max)
        cloud_bot = span_a.shift(self.kijun).combine(span_b.shift(self.kijun), min)

        df["ichi_cloud_top"] = (cloud_top - df["close"]) / close
        df["ichi_cloud_bot"] = (cloud_bot - df["close"]) / close

        # Price relative to cloud
        above_cloud = df["close"] > cloud_top
        below_cloud = df["close"] < cloud_bot
        df["ichi_above_cloud"] = 0
        df.loc[above_cloud, "ichi_above_cloud"] =  1
        df.loc[below_cloud, "ichi_above_cloud"] = -1

        # Tenkan / Kijun crossover
        tk_above      = tenkan > kijun
        tk_above_prev = tenkan.shift(1) > kijun.shift(1)
        df["ichi_tk_cross"] = 0
        df.loc[tk_above & ~tk_above_prev,  "ichi_tk_cross"] =  1
        df.loc[~tk_above & tk_above_prev,  "ichi_tk_cross"] = -1

        return df
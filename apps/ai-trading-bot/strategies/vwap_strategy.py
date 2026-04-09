"""
strategies/vwap_strategy.py — VWAP (Volume Weighted Average Price) strategy.

What VWAP is:
    VWAP = Sum(Price x Volume) / Sum(Volume)

    It is the average price a stock traded at across the day, weighted by how
    much volume occurred at each price level.

    VWAP is the single most-watched intraday level by institutional traders
    (mutual funds, hedge funds, FIIs). Institutions try to execute large orders
    NEAR the VWAP to minimise market impact. This makes VWAP a magnetic level.

    Price ABOVE VWAP → Buyers are in control. Institutional activity bullish.
    Price BELOW VWAP → Sellers are in control. Institutional activity bearish.

    The VWAP deviation (how far price is from VWAP as a %) tells the model:
    - Large positive deviation: stock stretched above fair value — mean reversion risk
    - Large negative deviation: stock stretched below fair value — bounce candidate
    - Near zero: price is at fair value — no strong directional signal

Why the model benefits from this:
    RSI and MACD are pure price-based. VWAP incorporates VOLUME — it tells you
    where the money actually transacted. A move on high volume near VWAP is more
    significant than a move on thin volume far from VWAP.

Note on daily data:
    True intraday VWAP requires tick or minute-level data. On daily OHLCV data,
    we approximate using the typical price = (high + low + close) / 3 × volume.
    This is the standard approach used in daily charts.
"""

import numpy as np
import pandas as pd
from .base import BaseStrategy


class VWAPStrategy(BaseStrategy):

    def __init__(self, period: int = 20):
        """
        Args:
            period: Rolling window for VWAP calculation (default 20 days).
                    20 = approximately one month of trading days.
        """
        self.period = period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Typical price = average of high, low, close for the day
        typical_price = (df["high"] + df["low"] + df["close"]) / 3.0

        # Volume-weighted sum over the rolling window
        tp_vol   = (typical_price * df["volume"]).rolling(self.period).sum()
        vol_sum  = df["volume"].rolling(self.period).sum().replace(0, np.nan)

        df["vwap"] = tp_vol / vol_sum

        # Deviation from VWAP as a fraction of VWAP (positive = above, negative = below)
        df["vwap_deviation"] = (df["close"] - df["vwap"]) / df["vwap"].replace(0, np.nan)

        # Signal: 1 = price above VWAP (bullish), -1 = below (bearish), 0 = neutral (within 0.5%)
        df["vwap_signal"] = 0
        df.loc[df["vwap_deviation"] >  0.005, "vwap_signal"] =  1
        df.loc[df["vwap_deviation"] < -0.005, "vwap_signal"] = -1

        # Distance trend: is price moving TOWARD or AWAY from VWAP?
        # Positive = diverging (stretched), Negative = converging (mean-reverting)
        df["vwap_diverging"] = df["vwap_deviation"].diff()

        return df
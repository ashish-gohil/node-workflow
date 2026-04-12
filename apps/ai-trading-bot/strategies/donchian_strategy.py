"""
strategies/donchian_strategy.py — Donchian Channels

WHAT DONCHIAN CHANNELS ARE:
    Donchian channels draw a band around price using the highest high and lowest low
    over a lookback period. Created by Richard Donchian (pioneer of trend-following).

    Upper band = max(high, last N days)
    Lower band = min(low,  last N days)
    Middle band = (upper + lower) / 2

    These form a "channel" showing the price range.

TRADING SIGNALS:
    BREAKOUT: When price closes above the upper band, it is making a NEW N-day high.
    This is often the start of a trend move (breakout trading).

    RANGE CONTRACTION: When upper - lower is very small, price is in tight range.
    A big breakout often follows tight range compression (similar to BB squeeze).

    POSITION: Where is today's close within the channel?
    top = above midpoint, bottom = below midpoint

DIFFERENCE FROM BOLLINGER BANDS:
    Bollinger Bands use standard deviation (volatility-based dynamic width).
    Donchian uses raw price extremes (simpler, based on actual traded prices).
    Donchian is better for breakout systems; BB is better for mean-reversion.

COLUMNS ADDED:
    don_upper:    Upper Donchian channel (highest high over N days)
    don_lower:    Lower Donchian channel (lowest low over N days)
    don_mid:      Midpoint of channel
    don_width:    Channel width / close (normalised, stationary)
    don_position: Where close sits in channel: 0=bottom, 1=top
    don_breakout_up:   1 if price broke above yesterday's upper band
    don_breakout_down: 1 if price broke below yesterday's lower band
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class DonchianStrategy(BaseStrategy):

    def __init__(self, period: int = 20):
        self.period = period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        df["don_upper"] = df["high"].rolling(self.period).max()
        df["don_lower"] = df["low"].rolling(self.period).min()
        df["don_mid"]   = (df["don_upper"] + df["don_lower"]) / 2.0

        channel_range = (df["don_upper"] - df["don_lower"]).replace(0, np.nan)
        df["don_width"]    = channel_range / df["close"].replace(0, np.nan)
        df["don_position"] = (df["close"] - df["don_lower"]) / channel_range

        # Breakout signals: compare today's close to YESTERDAY's channel extremes
        # (use .shift(1) to avoid lookahead — today's high contributes to today's upper)
        df["don_breakout_up"]   = (df["close"] > df["don_upper"].shift(1)).astype(float)
        df["don_breakout_down"] = (df["close"] < df["don_lower"].shift(1)).astype(float)

        return df
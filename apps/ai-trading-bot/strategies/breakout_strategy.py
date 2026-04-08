"""
strategies/breakout_strategy.py — Price breakout detection.

What it detects:
    A breakout happens when today's closing price is HIGHER than the highest
    price seen in the last 20 days (resistance level).

    Why this matters:
        Resistance = a price level where sellers previously dominated.
        When price breaks through it, those sellers are "defeated" —
        it often leads to a strong continuation move upward.

    breakout = 1 → Price closed above the 20-day high (bullish signal)
    breakout = 0 → No breakout
"""

import pandas as pd
from .base import BaseStrategy


class BreakoutStrategy(BaseStrategy):

    def __init__(self, lookback: int = 20):
        self.lookback = lookback

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # The highest high in the past `lookback` days (EXCLUDING today)
        # shift(1) is critical — prevents lookahead bias (we don't know today's
        # resistance until after today ends)
        df["resistance"] = df["high"].rolling(self.lookback).max().shift(1)
        df["support"]    = df["low"].rolling(self.lookback).min().shift(1)

        # Binary breakout signal
        df["breakout"] = (df["close"] > df["resistance"]).astype(float)

        # How far above resistance did price close? (0 = no breakout, >0 = how strong)
        df["breakout_strength"] = ((df["close"] - df["resistance"]) / df["resistance"]).clip(lower=0)

        return df
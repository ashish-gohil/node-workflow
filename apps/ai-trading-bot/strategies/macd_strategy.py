"""
strategies/macd_strategy.py — MACD (Moving Average Convergence Divergence).

What MACD measures:
    MACD = EMA(12) - EMA(26)

    EMA = Exponential Moving Average — like a regular moving average but
    it gives MORE weight to recent prices (reacts faster to new information).

    MACD Line: Difference between 12-day and 26-day EMA
    Signal Line: 9-day EMA of the MACD line itself (smoothed version)
    Histogram: MACD - Signal (positive = bullish momentum, negative = bearish)

    When MACD crosses ABOVE Signal → buy signal (momentum turning positive)
    When MACD crosses BELOW Signal → sell signal (momentum turning negative)

Why the model needs this:
    MACD captures the speed and direction of price change.
    RSI says "how tired is this move?" — MACD says "is the move accelerating?"
    Together they give the model momentum + exhaustion information.
"""

import pandas as pd
from .base import BaseStrategy


class MACDStrategy(BaseStrategy):

    def __init__(self, fast: int = 12, slow: int = 26, signal: int = 9):
        self.fast   = fast
        self.slow   = slow
        self.signal = signal

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        ema_fast = df["close"].ewm(span=self.fast, adjust=False).mean()
        ema_slow = df["close"].ewm(span=self.slow, adjust=False).mean()

        df["macd"]        = ema_fast - ema_slow
        df["macd_signal"] = df["macd"].ewm(span=self.signal, adjust=False).mean()
        df["macd_hist"]   = df["macd"] - df["macd_signal"]

        # Normalize histogram by price so it's comparable across different stocks/prices
        df["macd_hist_norm"] = df["macd_hist"] / df["close"]

        # Crossover signal: 1 = MACD crossed above signal, -1 = crossed below, 0 = no cross
        df["macd_cross"] = 0
        df.loc[(df["macd"] > df["macd_signal"]) & (df["macd"].shift(1) <= df["macd_signal"].shift(1)), "macd_cross"] = 1
        df.loc[(df["macd"] < df["macd_signal"]) & (df["macd"].shift(1) >= df["macd_signal"].shift(1)), "macd_cross"] = -1

        return df
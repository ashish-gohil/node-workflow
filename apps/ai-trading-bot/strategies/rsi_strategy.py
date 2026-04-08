"""
strategies/rsi_strategy.py — Relative Strength Index strategy.

What RSI measures:
    RSI compares the size of recent gains vs recent losses over 14 days.
    Result is a number between 0 and 100.

    RSI > 70 → Overbought (price moved up too fast, likely to reverse DOWN)
    RSI < 30 → Oversold  (price moved down too fast, likely to reverse UP)
    30-70    → Neutral

Why the model needs this:
    The transformer can't inherently know "this stock has been falling for 2 weeks
    and is exhausted". RSI encodes that momentum exhaustion as a number.
"""

import pandas as pd
from .base import BaseStrategy


class RSIStrategy(BaseStrategy):

    def __init__(self, period: int = 14):
        self.period = period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        delta = df["close"].diff()
        gain = delta.clip(lower=0).rolling(self.period).mean()
        loss = (-delta.clip(upper=0)).rolling(self.period).mean()

        rs = gain / loss.replace(0, float("nan"))
        df["rsi"] = 100 - (100 / (1 + rs))

        # Categorical signal: 1=oversold(buy), -1=overbought(sell), 0=neutral
        df["rsi_signal"] = 0
        df.loc[df["rsi"] < 30, "rsi_signal"] = 1
        df.loc[df["rsi"] > 70, "rsi_signal"] = -1

        # Normalized RSI (0 to 1) — easier for the model to consume
        df["rsi_norm"] = df["rsi"] / 100.0

        return df
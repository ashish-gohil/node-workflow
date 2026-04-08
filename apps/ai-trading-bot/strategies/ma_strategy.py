"""
strategies/ma_strategy.py — Moving Average crossover strategy.

What it detects:
    When the fast moving average (MA10) crosses ABOVE the slow (MA20),
    it signals upward momentum — the recent trend is stronger than the longer trend.

    MA10 > MA20 → Bullish (signal = 1)
    MA10 < MA20 → Bearish (signal = 0)

Why this works:
    Price tends to follow momentum. When short-term average rises above
    long-term average, more recent buyers are profitable — continuation is likely.
"""

import pandas as pd
from .base import BaseStrategy


class MovingAverageStrategy(BaseStrategy):

    def __init__(self, fast: int = 10, slow: int = 20):
        self.fast = fast
        self.slow = slow

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        df[f"ma_{self.fast}"] = df["close"].rolling(self.fast).mean()
        df[f"ma_{self.slow}"] = df["close"].rolling(self.slow).mean()

        # 1 = fast above slow (bullish), 0 = fast below slow (bearish)
        df["ma_signal"] = (df[f"ma_{self.fast}"] > df[f"ma_{self.slow}"]).astype(int)

        # Distance between the two MAs as a % of price — strength indicator
        df["ma_spread"] = (df[f"ma_{self.fast}"] - df[f"ma_{self.slow}"]) / df["close"]

        return df
"""
strategies/bb_strategy.py — Bollinger Bands strategy.

What Bollinger Bands measure:
    Bollinger Bands draw a "channel" around price based on volatility.

    Middle Band  = 20-day moving average
    Upper Band   = Middle + 2 × standard deviation
    Lower Band   = Middle - 2 × standard deviation

    Think of it as: "where is price relative to its normal range?"

    bb_position = 0   → price at the lower band (potentially oversold)
    bb_position = 0.5 → price in the middle (normal)
    bb_position = 1   → price at the upper band (potentially overbought)
    bb_position > 1   → price ABOVE the upper band (strong breakout)

    bb_width measures how "wide" the channel is — wide = high volatility period.
    When bands are very narrow (squeeze), a big move is usually coming soon.

Why the model needs this:
    Bollinger Bands tell the model both where price IS (relative position)
    and how volatile the market currently IS (band width). These are two
    separate and very useful signals.
"""

import pandas as pd
from .base import BaseStrategy


class BollingerBandStrategy(BaseStrategy):

    def __init__(self, period: int = 20, std_dev: float = 2.0):
        self.period  = period
        self.std_dev = std_dev

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        rolling_mean = df["close"].rolling(self.period).mean()
        rolling_std  = df["close"].rolling(self.period).std()

        df["bb_upper"]    = rolling_mean + self.std_dev * rolling_std
        df["bb_lower"]    = rolling_mean - self.std_dev * rolling_std
        df["bb_mid"]      = rolling_mean

        band_range = (df["bb_upper"] - df["bb_lower"]).replace(0, float("nan"))

        # 0 = at lower band, 1 = at upper band
        df["bb_position"] = (df["close"] - df["bb_lower"]) / band_range

        # Band width relative to price — measure of current volatility
        df["bb_width"] = band_range / rolling_mean

        # Squeeze: bands are very narrow (low volatility, breakout incoming)
        # Defined as: current width is in the bottom 20% of last 50 days
        df["bb_squeeze"] = (df["bb_width"] < df["bb_width"].rolling(50).quantile(0.2)).astype(float)

        return df
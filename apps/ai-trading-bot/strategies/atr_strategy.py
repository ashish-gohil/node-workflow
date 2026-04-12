"""
strategies/atr_strategy.py — ATR (Average True Range) volatility strategy.

What ATR is:
    ATR measures how much a stock MOVES each day, in absolute price terms.
    It captures the "typical daily range" of a stock.

    True Range for one day = max of:
        1. High - Low           (today's intraday range)
        2. |High - Prev Close|  (gap up scenario)
        3. |Low  - Prev Close|  (gap down scenario)

    ATR = rolling average of True Range (default 14 days)

    Example: If RELIANCE has ATR = ₹45, it typically moves ₹45 in a day.

Why ATR matters for the model:
    1. VOLATILITY REGIME DETECTION
       High ATR = high volatility period (news, earnings, macro events)
       Low ATR  = low volatility / squeeze (breakout likely coming)
       The model needs to know "is this a quiet market or a choppy one?"

    2. POSITION SIZING (not in model, but for actual trading)
       Professional traders size positions as: Risk / ATR
       If you want to risk ₹5000 and ATR=₹50 → buy 100 shares
       This keeps your risk constant regardless of which stock you trade

    3. STOP-LOSS PLACEMENT
       Place stop 1.5x ATR below entry. Statistically, normal market noise
       is less than 1 ATR — only a real adverse move hits a 1.5x ATR stop.

Derived features:
    atr:            Raw ATR in price units (₹)
    atr_pct:        ATR as % of price (comparable across different price stocks)
    atr_ratio:      Current ATR / 20-day avg ATR (is volatility expanding?)
    high_vol_regime: 1 if current ATR > 1.5x its own 20-day average
"""

import numpy as np
import pandas as pd
from .base import BaseStrategy


class ATRStrategy(BaseStrategy):

    def __init__(self, atr_period: int = 14, vol_period: int = 20):
        """
        Args:
            atr_period: Period for ATR calculation (14 is standard)
            vol_period: Period for volatility regime comparison
        """
        self.atr_period = atr_period
        self.vol_period = vol_period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # True Range components
        high_low   = df["high"] - df["low"]
        high_close = (df["high"] - df["close"].shift(1)).abs()
        low_close  = (df["low"]  - df["close"].shift(1)).abs()

        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df["atr"]  = true_range.rolling(self.atr_period).mean()

        # ATR as % of price — comparable across stocks trading at different prices
        # RELIANCE ATR=45 at price 2500 is 1.8%. IRCTC ATR=8 at price 700 is 1.1%.
        # The % form makes these comparable.
        df["atr_pct"] = df["atr"] / df["close"].replace(0, np.nan) * 100

        # ATR ratio: is current volatility HIGH or LOW relative to recent history?
        avg_atr = df["atr"].rolling(self.vol_period).mean().replace(0, np.nan)
        df["atr_ratio"] = df["atr"] / avg_atr

        # Volatility regime: 1 = high volatility (ATR > 1.5x its 20-day average)
        df["high_vol_regime"] = (df["atr_ratio"] > 1.5).astype(float)

        # Volatility compression: ATR near its 20-day LOW → squeeze, breakout likely
        atr_20low = df["atr"].rolling(self.vol_period).min()
        df["vol_compressed"] = (df["atr"] < atr_20low * 1.2).astype(float)

        return df
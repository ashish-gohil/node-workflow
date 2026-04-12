"""
strategies/stochastic_strategy.py — Stochastic Oscillator (%K and %D)

WHAT IT IS:
    The Stochastic Oscillator compares a closing price to the price range
    (high-low) over a lookback period. The result is a number 0-100 showing
    WHERE today's close sits within the recent price range.

    %K = (Close - Lowest Low over N days) / (Highest High - Lowest Low) x 100
    %D = Simple moving average of %K (usually 3 days)

    Close at the TOP of the range → %K near 100 (overbought, buyers in control)
    Close at the BOTTOM            → %K near 0 (oversold, sellers in control)

    Classic signals:
      %K crosses ABOVE %D and both are below 20 → buy signal (oversold reversal)
      %K crosses BELOW %D and both are above 80 → sell signal (overbought reversal)

DIFFERENCE FROM RSI:
    RSI measures momentum (speed of price changes).
    Stochastic measures POSITION within a range (where is price relative to recent highs/lows).
    They complement each other — RSI says "how tired is this move?",
    Stochastic says "is price near the top or bottom of its recent range?"

COLUMNS ADDED:
    stoch_k:      Raw %K (0-100)
    stoch_d:      3-day smoothed %K (the signal line)
    stoch_cross:  +1 when K crosses above D (bullish), -1 when K crosses below D (bearish)
    stoch_norm:   stoch_k normalised to 0-1 (for model input)
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class StochasticStrategy(BaseStrategy):

    def __init__(self, k_period: int = 14, d_period: int = 3):
        """
        Args:
            k_period: Lookback window for %K calculation (default 14 days)
            d_period: Smoothing period for %D signal line (default 3 days)
        """
        self.k_period = k_period
        self.d_period = d_period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        lowest_low   = df["low"].rolling(self.k_period).min()
        highest_high = df["high"].rolling(self.k_period).max()

        price_range = (highest_high - lowest_low).replace(0, np.nan)

        df["stoch_k"] = (df["close"] - lowest_low) / price_range * 100
        df["stoch_d"] = df["stoch_k"].rolling(self.d_period).mean()

        # Crossover: +1 = K just crossed above D (bullish), -1 = K crossed below D
        k_above_d      = df["stoch_k"] > df["stoch_d"]
        k_above_d_prev = df["stoch_k"].shift(1) > df["stoch_d"].shift(1)
        df["stoch_cross"] = 0
        df.loc[k_above_d & ~k_above_d_prev, "stoch_cross"] = 1
        df.loc[~k_above_d & k_above_d_prev, "stoch_cross"] = -1

        # Normalised to 0-1 for model consumption
        df["stoch_norm"] = df["stoch_k"] / 100.0

        return df
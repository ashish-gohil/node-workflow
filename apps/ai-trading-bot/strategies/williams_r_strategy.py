"""
strategies/williams_r_strategy.py — Williams %R

WHAT IT IS:
    Created by Larry Williams. Measures how close the current close is to the
    HIGHEST HIGH over the lookback period. The result is always -100 to 0.

    %R = (Highest High - Close) / (Highest High - Lowest Low) x (-100)

    %R near   0 → close is near the highest high (bullish momentum)
    %R near -100 → close is near the lowest low (bearish momentum)

    Overbought zone: %R between 0 and -20 (price near the top of range)
    Oversold zone:   %R between -80 and -100 (price near the bottom)

DIFFERENCE FROM STOCHASTIC:
    Williams %R and Stochastic %K measure very similar things. The key difference:
    - Stochastic: looks at close relative to LOWEST LOW
    - Williams %R: looks at close relative to HIGHEST HIGH (inverted perspective)
    - Stochastic output: 0-100; Williams %R output: -100 to 0
    Williams %R reacts faster (not smoothed by default) — better at catching
    early reversal signals.

COLUMNS ADDED:
    williams_r:      Raw %R (-100 to 0)
    williams_r_norm: Normalised to 0-1 (0 = oversold extreme, 1 = overbought extreme)
    williams_r_sig:  +1 if oversold (<-80), -1 if overbought (>-20), 0 neutral
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class WilliamsRStrategy(BaseStrategy):

    def __init__(self, period: int = 14):
        self.period = period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        highest_high = df["high"].rolling(self.period).max()
        lowest_low   = df["low"].rolling(self.period).min()
        price_range  = (highest_high - lowest_low).replace(0, np.nan)

        df["williams_r"] = (highest_high - df["close"]) / price_range * (-100)

        # Normalised 0-1: 0 = at lowest (oversold), 1 = at highest (overbought)
        df["williams_r_norm"] = (df["williams_r"] + 100) / 100.0

        df["williams_r_sig"] = 0
        df.loc[df["williams_r"] < -80, "williams_r_sig"] =  1   # oversold = potential buy
        df.loc[df["williams_r"] > -20, "williams_r_sig"] = -1   # overbought = potential sell

        return df
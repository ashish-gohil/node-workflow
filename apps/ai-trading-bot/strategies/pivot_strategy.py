"""
strategies/pivot_strategy.py — Classical Pivot Points

WHAT PIVOT POINTS ARE:
    Pivot points are support and resistance LEVELS calculated from the
    previous trading day's High, Low, and Close.

    These exact levels are watched by floor traders, market makers, and
    algorithmic systems — making them self-fulfilling to some degree.

    Pivot Point (PP)    = (Prev High + Prev Low + Prev Close) / 3
    Resistance 1 (R1)   = 2 x PP - Prev Low
    Resistance 2 (R2)   = PP + (Prev High - Prev Low)
    Support 1 (S1)      = 2 x PP - Prev High
    Support 2 (S2)      = PP - (Prev High - Prev Low)

WHY THE MODEL NEEDS THIS:
    Price action near known support/resistance levels behaves differently
    from price action in "open space." Near support:
    - If price holds → bounce potential (buy)
    - If price breaks → acceleration down (sell)

    Expressing distance to these levels as a % of price gives the model
    context about where price is in its "decision zone."

COLUMNS ADDED:
    pivot_pp:          Pivot point level
    pivot_r1, pivot_r2: Resistance levels
    pivot_s1, pivot_s2: Support levels
    dist_to_pp:         (close - PP) / close  (stationary)
    dist_to_r1:         (close - R1) / close
    dist_to_s1:         (close - S1) / close
    near_support:       1 if close is within 0.5% of S1 or S2
    near_resistance:    1 if close is within 0.5% of R1 or R2
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class PivotStrategy(BaseStrategy):

    def __init__(self, threshold_pct: float = 0.005):
        """
        Args:
            threshold_pct: How close to a level (as % of price) counts as "near"
                           Default 0.5%
        """
        self.threshold = threshold_pct

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Pivot levels are based on PREVIOUS day's data
        prev_high  = df["high"].shift(1)
        prev_low   = df["low"].shift(1)
        prev_close = df["close"].shift(1)

        pp = (prev_high + prev_low + prev_close) / 3.0
        r1 = 2 * pp - prev_low
        r2 = pp + (prev_high - prev_low)
        s1 = 2 * pp - prev_high
        s2 = pp - (prev_high - prev_low)

        df["pivot_pp"] = pp
        df["pivot_r1"] = r1
        df["pivot_r2"] = r2
        df["pivot_s1"] = s1
        df["pivot_s2"] = s2

        close = df["close"].replace(0, np.nan)
        df["dist_to_pp"] = (df["close"] - pp) / close
        df["dist_to_r1"] = (df["close"] - r1) / close
        df["dist_to_s1"] = (df["close"] - s1) / close

        # Binary: is price close to any support or resistance level?
        df["near_support"] = (
            (df["dist_to_s1"].abs() < self.threshold) |
            ((df["close"] - s2).abs() / close < self.threshold)
        ).astype(float)

        df["near_resistance"] = (
            (df["dist_to_r1"].abs() < self.threshold) |
            ((df["close"] - r2).abs() / close < self.threshold)
        ).astype(float)

        return df
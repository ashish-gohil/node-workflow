"""
strategies/supertrend_strategy.py — SuperTrend

WHAT SUPERTREND IS:
    SuperTrend is a trend-following indicator that sits above or below price
    depending on trend direction. When price is above the SuperTrend line → uptrend.
    When price is below → downtrend.

    It is calculated using ATR (Average True Range) to set band width:
        Upper Band = (High + Low) / 2 + multiplier x ATR
        Lower Band = (High + Low) / 2 - multiplier x ATR

    The final SuperTrend line flips between upper and lower bands based on
    whether price closes above or below the previous band.

WHY SUPERTREND IS USEFUL:
    Unlike moving averages, SuperTrend:
    - Does NOT cross during sideways (avoids whipsaws better than MA crossover)
    - Adapts to volatility via ATR (wider bands in volatile periods)
    - Gives clean binary signal: in trend (1) or in downtrend (-1)

    Very popular among Indian retail traders — many use it as primary signal.

COLUMNS ADDED:
    supertrend_val:  The SuperTrend line value (price level)
    supertrend_dir:  +1 = price above SuperTrend (uptrend), -1 = below (downtrend)
    supertrend_dist: (close - supertrend_val) / close  (stationary distance)
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class SuperTrendStrategy(BaseStrategy):

    def __init__(self, period: int = 10, multiplier: float = 3.0):
        """
        Args:
            period:     ATR period (default 10)
            multiplier: Band width multiplier (default 3.0)
                        Higher = fewer signals but less noise
                        Lower  = more signals but more whipsaws
        """
        self.period     = period
        self.multiplier = multiplier

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # ATR
        hl  = df["high"] - df["low"]
        hc  = (df["high"] - df["close"].shift(1)).abs()
        lc  = (df["low"]  - df["close"].shift(1)).abs()
        tr  = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        atr = tr.rolling(self.period).mean()

        mid = (df["high"] + df["low"]) / 2.0
        upper_basic = mid + self.multiplier * atr
        lower_basic = mid - self.multiplier * atr

        # Compute final SuperTrend with direction-aware banding
        n = len(df)
        supertrend = pd.Series(index=df.index, dtype=float)
        direction  = pd.Series(index=df.index, dtype=int)

        # Initialise first valid row
        first = atr.first_valid_index()
        if first is None:
            df["supertrend_val"]  = np.nan
            df["supertrend_dir"]  = 0
            df["supertrend_dist"] = np.nan
            return df

        loc = df.index.get_loc(first)
        supertrend.iloc[loc] = upper_basic.iloc[loc]
        direction.iloc[loc]  = -1

        for i in range(loc + 1, n):
            prev_sup  = supertrend.iloc[i - 1]
            prev_dir  = direction.iloc[i - 1]
            close     = df["close"].iloc[i]
            close_prev = df["close"].iloc[i - 1]
            ub = upper_basic.iloc[i]
            lb = lower_basic.iloc[i]

            if prev_dir == 1:
                # Was in uptrend
                curr_sup = max(lb, prev_sup) if close > prev_sup else ub
                curr_dir = 1 if close > curr_sup else -1
            else:
                # Was in downtrend
                curr_sup = min(ub, prev_sup) if close < prev_sup else lb
                curr_dir = -1 if close < curr_sup else 1

            supertrend.iloc[i] = curr_sup
            direction.iloc[i]  = curr_dir

        df["supertrend_val"]  = supertrend
        df["supertrend_dir"]  = direction
        df["supertrend_dist"] = (df["close"] - supertrend) / df["close"].replace(0, np.nan)

        return df
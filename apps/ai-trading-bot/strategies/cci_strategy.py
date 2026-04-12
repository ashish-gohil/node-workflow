"""
strategies/cci_strategy.py — Commodity Channel Index (CCI)

WHAT IT IS:
    CCI measures how far price is from its "statistical average" using
    mean deviation rather than standard deviation. Created by Donald Lambert
    in 1980 originally for commodities, but widely used in equities.

    CCI = (Typical Price - SMA of Typical Price) / (0.015 x Mean Deviation)

    Typical Price = (High + Low + Close) / 3

    0.015 is a scaling constant that makes ~70-80% of CCI values fall in [-100, +100].

    Key levels:
      CCI > +100 → price is well above its average (strong uptrend, or overbought)
      CCI < -100 → price is well below its average (strong downtrend, or oversold)
      CCI crosses zero → trend change signal

WHY CCI INSTEAD OF (OR ALONGSIDE) RSI:
    RSI compares up-moves to down-moves.
    CCI compares price to its statistical mean — more sensitive to sudden price
    surges (big intraday moves). Good at catching the START of a new trend.

    Together: RSI for momentum exhaustion, CCI for trend deviation.

COLUMNS ADDED:
    cci:         Raw CCI value (typically -200 to +200, no hard cap)
    cci_signal:  +1 if CCI > 100 (strong uptrend), -1 if CCI < -100 (downtrend), 0 otherwise
    cci_norm:    CCI / 200 clipped to [-1, +1] — for model input
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class CCIStrategy(BaseStrategy):

    def __init__(self, period: int = 20):
        """
        Args:
            period: Lookback window (default 20 — common standard)
        """
        self.period = period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Typical price: the representative price for the day
        typical = (df["high"] + df["low"] + df["close"]) / 3.0

        sma_typical = typical.rolling(self.period).mean()

        # Mean deviation: average absolute deviation from the mean
        def mean_dev(series):
            return series.rolling(self.period).apply(
                lambda x: np.abs(x - x.mean()).mean(), raw=True
            )

        mad = mean_dev(typical).replace(0, np.nan)

        df["cci"] = (typical - sma_typical) / (0.015 * mad)

        # Classic trading signals
        df["cci_signal"] = 0
        df.loc[df["cci"] >  100, "cci_signal"] =  1
        df.loc[df["cci"] < -100, "cci_signal"] = -1

        # Normalised to [-1, +1] for model consumption
        df["cci_norm"] = (df["cci"] / 200.0).clip(-1.0, 1.0)

        return df
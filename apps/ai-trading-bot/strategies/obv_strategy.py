"""
strategies/obv_strategy.py — On-Balance Volume (OBV)

WHAT IT IS:
    OBV accumulates volume: adds volume on up days, subtracts on down days.
    It answers: "Is volume flowing INTO (buying pressure) or OUT OF (selling pressure)
    this stock?"

    If Close > Prev Close: OBV = Prev OBV + Volume
    If Close < Prev Close: OBV = Prev OBV - Volume
    If Close = Prev Close: OBV = Prev OBV

WHY OBV IS POWERFUL:
    Price can be manipulated (low-volume moves are easy to push). Volume is harder
    to fake. When price rises but OBV falls (DIVERGENCE), the price rise is weak —
    not backed by real buying. This often precedes a reversal.

    Conversely: when price falls but OBV rises → smart money is accumulating
    (buying into the dip). A strong move up is likely coming.

THE PROBLEM WITH RAW OBV:
    Raw OBV is non-stationary (keeps accumulating forever like a random walk).
    We can't feed raw OBV to a model trained on different time periods.
    Solution: use OBV CHANGE (daily OBV delta / volume) and OBV TREND
    (OBV relative to its moving average). Both are stationary.

COLUMNS ADDED:
    obv:           Raw accumulated OBV (non-stationary — for reference only)
    obv_change:    Daily OBV change / volume (stationary, +1 or -1 typically)
    obv_to_ma20:   OBV / 20-day OBV MA - 1 (stationary, divergence signal)
    obv_rising:    1 if OBV is above its 20-day MA (accumulation trend)
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class OBVStrategy(BaseStrategy):

    def __init__(self, ma_period: int = 20):
        self.ma_period = ma_period

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Compute OBV: cumulative signed volume
        direction        = np.sign(df["close"].diff().fillna(0))
        obv              = (direction * df["volume"]).cumsum()
        df["obv"]        = obv

        # Daily signed volume (stationary proxy for OBV momentum)
        df["obv_change"] = direction   # +1, -1, or 0

        # OBV relative to its moving average (stationary divergence signal)
        obv_ma           = obv.rolling(self.ma_period).mean().replace(0, np.nan)
        df["obv_to_ma20"] = obv / obv_ma - 1

        # Is OBV above its MA? (accumulation vs distribution trend)
        df["obv_rising"] = (obv > obv_ma).astype(float)

        return df
"""
strategies/keltner_strategy.py — Keltner Channels

WHAT KELTNER CHANNELS ARE:
    Keltner Channels draw bands above and below an EMA (exponential moving average)
    using ATR (Average True Range) as the band width.

    Middle  = EMA(close, period)
    Upper   = EMA + multiplier x ATR
    Lower   = EMA - multiplier x ATR

KELTNER vs BOLLINGER BANDS:
    Both are "envelope" indicators drawing bands around price.
    Key difference: Bollinger uses Standard Deviation; Keltner uses ATR.

    - Bollinger responds to price VOLATILITY (big price moves widen the band)
    - Keltner responds to TRUE RANGE volatility (includes gaps, more stable)
    - Keltner bands are smoother and don't expand/contract as dramatically

SQUEEZE SIGNAL (very powerful):
    When Bollinger Bands are INSIDE Keltner Channels → "Squeeze"
    This means volatility has compressed significantly.
    A big breakout is imminent (direction unknown until it happens).
    This is one of the most reliable volatility compression signals.

    squeeze = bb_upper < kc_upper AND bb_lower > kc_lower

COLUMNS ADDED:
    kc_upper:    Upper Keltner Channel
    kc_lower:    Lower Keltner Channel
    kc_mid:      Middle EMA line
    kc_position: Where close sits in channel (0=lower, 1=upper)
    kc_width:    Channel width / close (normalised volatility)
    kc_squeeze:  1 if Bollinger Bands are inside Keltner Channels
"""

import pandas as pd
import numpy as np
from .base import BaseStrategy


class KeltnerStrategy(BaseStrategy):

    def __init__(self, ema_period: int = 20, atr_period: int = 10,
                 multiplier: float = 2.0):
        self.ema_period  = ema_period
        self.atr_period  = atr_period
        self.multiplier  = multiplier

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        ema = df["close"].ewm(span=self.ema_period, adjust=False).mean()

        hl  = df["high"] - df["low"]
        hc  = (df["high"] - df["close"].shift(1)).abs()
        lc  = (df["low"]  - df["close"].shift(1)).abs()
        atr = pd.concat([hl, hc, lc], axis=1).max(axis=1).rolling(self.atr_period).mean()

        df["kc_mid"]   = ema
        df["kc_upper"] = ema + self.multiplier * atr
        df["kc_lower"] = ema - self.multiplier * atr

        kc_range = (df["kc_upper"] - df["kc_lower"]).replace(0, np.nan)
        df["kc_position"] = (df["close"] - df["kc_lower"]) / kc_range
        df["kc_width"]    = kc_range / df["close"].replace(0, np.nan)

        # Squeeze detection (requires Bollinger Bands columns)
        if "bb_upper" in df.columns and "bb_lower" in df.columns:
            df["kc_squeeze"] = (
                (df["bb_upper"] < df["kc_upper"]) &
                (df["bb_lower"] > df["kc_lower"])
            ).astype(float)
        else:
            df["kc_squeeze"] = 0.0

        return df
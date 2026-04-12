"""
strategies/momentum_strategy.py — Multi-timeframe price momentum strategy.

What momentum is:
    Momentum = the tendency of things that are moving to keep moving.
    In markets: stocks that have risen recently tend to continue rising
    (in the short/medium term). This is one of the most robustly documented
    effects in financial markets — published in hundreds of academic papers.

    This strategy measures momentum at multiple timeframes simultaneously:
    - 1-week  (5 days):   Very short-term micro-momentum
    - 1-month (20 days):  Short-term momentum
    - 3-month (60 days):  Medium-term momentum (strongest predictive power)
    - 6-month (120 days): Long-term momentum

    When multiple timeframes align (e.g. all positive), the signal is stronger.
    When they diverge (1-week negative, 1-month positive), mixed signals → caution.

Why multi-timeframe matters:
    A stock might have 1-week positive momentum (bouncing from a dip) but
    3-month negative momentum (still in a downtrend). Buying a dip in a
    downtrend is different from buying a dip in an uptrend.
    The transformer learns to interpret these combinations.

Rate of Change (ROC):
    ROC(n) = (close_today - close_n_days_ago) / close_n_days_ago x 100
    Simple but effective. Shows "how much has this stock moved in the last n days?"

Momentum oscillator:
    Compares recent short-term return to recent longer-term return.
    Positive = recent days are stronger than the month average (acceleration)
    Negative = recent days are weaker than the month average (deceleration)
"""

import numpy as np
import pandas as pd
from .base import BaseStrategy


class MomentumStrategy(BaseStrategy):

    def __init__(
        self,
        periods: list = None,   # Lookback periods in days
    ):
        # Standard multi-timeframe periods
        self.periods = periods or [5, 10, 20, 60, 120]

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # ── Rate of Change for each period ─────────────────────────────────────
        for n in self.periods:
            prev = df["close"].shift(n).replace(0, np.nan)
            df[f"roc_{n}"] = (df["close"] - prev) / prev * 100

        # ── Momentum alignment score ───────────────────────────────────────────
        # How many timeframes are positive at the same time?
        # Range: -len(periods) to +len(periods)
        # +5 = all timeframes bullish (strong uptrend)
        # -5 = all timeframes bearish (strong downtrend)
        alignment = sum(
            (df[f"roc_{n}"] > 0).astype(int) - (df[f"roc_{n}"] < 0).astype(int)
            for n in self.periods
        )
        df["momentum_alignment"] = alignment

        # ── Normalised alignment (−1 to +1) ────────────────────────────────────
        df["momentum_score"] = df["momentum_alignment"] / len(self.periods)

        # ── Momentum acceleration ──────────────────────────────────────────────
        # Is short-term (5d) momentum stronger or weaker than medium-term (20d)?
        # Positive = accelerating (recent days outperforming the month)
        # Negative = decelerating (recent days underperforming the month)
        if 5 in self.periods and 20 in self.periods:
            df["momentum_accel"] = df["roc_5"] - df["roc_20"]

        # ── 52-week high proximity ─────────────────────────────────────────────
        # Distance from 52-week high as a % — how far below the yearly peak?
        # Value near 0 = near 52-week high (strength)
        # Value near -30% = far below 52-week high (potential weakness or deep value)
        yearly_high = df["close"].rolling(252).max().replace(0, np.nan)
        df["pct_from_52w_high"] = (df["close"] - yearly_high) / yearly_high * 100

        # ── 52-week low proximity ──────────────────────────────────────────────
        yearly_low = df["close"].rolling(252).min().replace(0, np.nan)
        df["pct_from_52w_low"]  = (df["close"] - yearly_low)  / yearly_low  * 100

        return df
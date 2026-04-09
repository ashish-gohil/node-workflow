"""
strategies/candlestick_strategy.py — Candlestick pattern detection.

What candlestick patterns are:
    Each day's candle has a shape defined by open, high, low, close.
    Certain shapes reliably signal reversals or continuations.
    These patterns encode institutional behaviour that pure indicators miss.

    A candlestick has:
        Body:       |close - open|        (the thick part)
        Upper Wick: high - max(open,close) (thin line above)
        Lower Wick: min(open,close) - low  (thin line below)

Patterns detected (all values: 1=bullish, -1=bearish, 0=no pattern):

    DOJI:
        Open ≈ Close (body is very small, < 10% of range)
        Meaning: buyers and sellers are equally matched → indecision
        After a trend, a doji signals the trend may be exhausting

    HAMMER / HANGING MAN:
        Long lower wick (> 2x body), small upper wick
        At bottom of downtrend (hammer): bulls rejected the lows → reversal UP
        At top of uptrend (hanging man): warning sign, possible reversal DOWN

    SHOOTING STAR:
        Long upper wick (> 2x body), small lower wick, small body at BOTTOM of range
        After an uptrend: bulls pushed price up during day but sellers took over → bearish

    ENGULFING:
        Bullish: Current day's body completely ENGULFS prior day's body, current closes UP
        Bearish: Current day's body completely ENGULFS prior day's body, current closes DOWN
        Strong reversal signals — especially on high volume

    MARUBOZU:
        Entire day is one big body with no wicks
        Bullish: Opens at low, closes at high — pure buying pressure all day
        Bearish: Opens at high, closes at low — pure selling pressure all day

Why the model benefits from these:
    Technical indicators like RSI and MACD are "lagging" — they reflect what
    ALREADY happened. Candlestick patterns capture the intraday PSYCHOLOGY of
    buyers and sellers. A bullish engulfing on high volume tells you something
    RSI cannot.
"""

import numpy as np
import pandas as pd
from .base import BaseStrategy


class CandlestickStrategy(BaseStrategy):

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        body       = (df["close"] - df["open"]).abs()
        full_range = (df["high"] - df["low"]).replace(0, np.nan)
        upper_wick = df["high"] - df[["open", "close"]].max(axis=1)
        lower_wick = df[["open", "close"]].min(axis=1) - df["low"]
        body_ratio = body / full_range   # 0=pure doji, 1=marubozu

        # ── Doji ──────────────────────────────────────────────────────────────
        # Body is less than 10% of the day's range → indecision
        df["doji"] = (body_ratio < 0.1).astype(float)

        # ── Hammer (bullish) ──────────────────────────────────────────────────
        # Long lower wick, small upper wick, body in upper part of range
        # Signals: sellers pushed price down but buyers recovered strongly
        hammer_cond = (
            (lower_wick > 2 * body.clip(lower=1e-9)) &
            (upper_wick < 0.3 * full_range) &
            (df["close"] > df["open"])    # Closed green (confirms bullish)
        )
        df["hammer"] = hammer_cond.astype(float)

        # ── Shooting Star (bearish) ────────────────────────────────────────────
        # Long upper wick, small lower wick, body in lower part of range
        # Signals: buyers pushed price up but sellers overwhelmed them
        star_cond = (
            (upper_wick > 2 * body.clip(lower=1e-9)) &
            (lower_wick < 0.3 * full_range) &
            (df["close"] < df["open"])    # Closed red (confirms bearish)
        )
        df["shooting_star"] = star_cond.astype(float)

        # ── Bullish Engulfing ─────────────────────────────────────────────────
        # Current green candle's body is LARGER than previous red candle's body
        prev_body  = body.shift(1)
        prev_close = df["close"].shift(1)
        prev_open  = df["open"].shift(1)

        bull_engulf = (
            (df["close"] > df["open"]) &        # Current is green
            (prev_close < prev_open) &           # Previous was red
            (df["open"]  < prev_close) &         # Opens below prev close
            (df["close"] > prev_open)            # Closes above prev open
        )
        df["bullish_engulfing"] = bull_engulf.astype(float)

        # ── Bearish Engulfing ─────────────────────────────────────────────────
        bear_engulf = (
            (df["close"] < df["open"]) &         # Current is red
            (prev_close > prev_open) &            # Previous was green
            (df["open"]  > prev_close) &          # Opens above prev close
            (df["close"] < prev_open)             # Closes below prev open
        )
        df["bearish_engulfing"] = bear_engulf.astype(float)

        # ── Marubozu (strong trend candle) ────────────────────────────────────
        # Body is > 90% of range (almost no wicks) → strong conviction
        df["bullish_marubozu"] = ((body_ratio > 0.9) & (df["close"] > df["open"])).astype(float)
        df["bearish_marubozu"] = ((body_ratio > 0.9) & (df["close"] < df["open"])).astype(float)

        # ── Composite candle signal ───────────────────────────────────────────
        # +1 = at least one bullish pattern, -1 = bearish, 0 = no clear pattern
        bullish = df["hammer"] | df["bullish_engulfing"] | df["bullish_marubozu"]
        bearish = df["shooting_star"] | df["bearish_engulfing"] | df["bearish_marubozu"]
        df["candle_signal"] = bullish.astype(int) - bearish.astype(int)

        return df
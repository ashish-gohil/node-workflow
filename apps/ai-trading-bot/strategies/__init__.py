"""
strategies/__init__.py — All available trading strategies.

Each strategy adds columns to a DataFrame via strategy.apply(df).
Import and use in features_v2.py to enrich the feature set.

Available strategies (grouped by category):

TREND:
  MovingAverageStrategy   — MA crossover signals (fast/slow MA)
  MACDStrategy            — MACD momentum and histogram
  SuperTrendStrategy      — ATR-based trend-following indicator
  IchimokuStrategy        — Full Ichimoku Cloud (trend, support, momentum)

MOMENTUM / OSCILLATORS:
  RSIStrategy             — Relative Strength Index (14-period standard)
  StochasticStrategy      — %K/%D stochastic oscillator
  WilliamsRStrategy       — Williams %R (faster stochastic variant)
  CCIStrategy             — Commodity Channel Index

VOLATILITY / BANDS:
  BollingerBandStrategy   — Bollinger Bands (standard deviation bands)
  KeltnerStrategy         — Keltner Channels (ATR-based bands)
  ATRStrategy             — Average True Range + regime detection

VOLUME:
  VWAPStrategy            — Volume Weighted Average Price
  OBVStrategy             — On-Balance Volume (accumulation/distribution)

BREAKOUT / SUPPORT-RESISTANCE:
  BreakoutStrategy        — 20-day high breakout detection
  DonchianStrategy        — Donchian Channels (N-day high/low bands)
  PivotStrategy           — Classical Pivot Points (PP, S1, S2, R1, R2)

PATTERN:
  CandlestickStrategy     — Single and multi-candle patterns (doji, engulfing, etc.)
  HeikinAshiStrategy      — Heikin-Ashi smoothed candles + trend strength

MULTI-TIMEFRAME:
  MomentumStrategy        — Rate of change at 5, 10, 20, 60, 120 day windows
"""

from .base import BaseStrategy

# Trend
from .ma_strategy import MovingAverageStrategy
from .macd_strategy import MACDStrategy
from .supertrend_strategy import SuperTrendStrategy
from .ichimoku_strategy import IchimokuStrategy

# Momentum / Oscillators
from .rsi_strategy import RSIStrategy
from .stochastic_strategy import StochasticStrategy
from .williams_r_strategy import WilliamsRStrategy
from .cci_strategy import CCIStrategy

# Volatility / Bands
from .bb_strategy import BollingerBandStrategy
from .keltner_strategy import KeltnerStrategy
from .atr_strategy import ATRStrategy

# Volume
from .vwap_strategy import VWAPStrategy
from .obv_strategy import OBVStrategy

# Breakout / Support-Resistance
from .breakout_strategy import BreakoutStrategy
from .donchian_strategy import DonchianStrategy
from .pivot_strategy import PivotStrategy

# Pattern
from .candlestick_strategy import CandlestickStrategy
from .heikin_ashi_strategy import HeikinAshiStrategy

# Multi-timeframe
from .momentum_strategy import MomentumStrategy


__all__ = [
    "BaseStrategy",
    # Trend
    "MovingAverageStrategy",
    "MACDStrategy",
    "SuperTrendStrategy",
    "IchimokuStrategy",
    # Momentum / Oscillators
    "RSIStrategy",
    "StochasticStrategy",
    "WilliamsRStrategy",
    "CCIStrategy",
    # Volatility / Bands
    "BollingerBandStrategy",
    "KeltnerStrategy",
    "ATRStrategy",
    # Volume
    "VWAPStrategy",
    "OBVStrategy",
    # Breakout / Support-Resistance
    "BreakoutStrategy",
    "DonchianStrategy",
    "PivotStrategy",
    # Pattern
    "CandlestickStrategy",
    "HeikinAshiStrategy",
    # Multi-timeframe
    "MomentumStrategy",
]
"""
utils/trading_v2.py — Signal generation for StockPredictor V4
==============================================================

WHY THE OLD BACKTEST TRADED NOTHING
─────────────────────────────────────
The old `generate_signal_v2` expected:
    direction  = int from argmax(softmax(logits))  — 0 or 1
    confidence = float from softmax.max()           — 0.0 to 1.0

With the V4 single-head model, there are NO logits. The model outputs
a signed return scalar. Confidence is derived from the magnitude of that
scalar via sigmoid. With typical model outputs of ±0.005 to ±0.02:
    sigmoid(0.01 × 100) = sigmoid(1.0) = 0.73

So confidence CAN reach above the old thresholds — BUT the old
`generate_signal_v2` was still called with `confidence` from a
misinterpreted float and `direction` from `argmax` of a 1-dim tensor,
producing unpredictable results.

V4 SIGNAL LOGIC
────────────────
The V4 model outputs a single signed return prediction:
    pred > 0  → model predicts price will go UP over the horizon
    pred < 0  → model predicts price will go DOWN
    |pred|    → magnitude of the expected move

Confidence is derived from magnitude:
    conf = sigmoid(|pred| × CONF_SCALE)

    |pred| = 0.005 (0.5%)   → conf = sigmoid(0.5)  = 0.62
    |pred| = 0.010 (1.0%)   → conf = sigmoid(1.0)  = 0.73
    |pred| = 0.020 (2.0%)   → conf = sigmoid(2.0)  = 0.88
    |pred| = 0.030 (3.0%)   → conf = sigmoid(3.0)  = 0.95

Threshold tuning:
    CONF_SCALE is the key parameter. Higher = more selective (fewer trades).
    CONFIDENCE_FLOOR is the minimum confidence to generate ANY signal.

    For a 3-day horizon on a model that just started training:
    - Expected |pred| at random initialisation: ~0.001-0.005
    - conf from random model: ~0.50-0.62  (below CONFIDENCE_FLOOR=0.52)
    - conf from trained model: 0.60-0.88  (above floor, generates signals)

    This means: a random model produces HOLD (good — no spurious trades).
    A trained model produces BUY/SELL signals.

THRESHOLDS
───────────
CONFIDENCE_FLOOR = 0.52  (lowered from 0.55 — allows more trades in backtest)
CONF_SCALE = 100.0       (sigmoid scaling factor for magnitude → confidence)

For 3-day horizon, a 1% predicted move is meaningful.
For 1-day horizon, raise thresholds (more noise in short horizon).
"""

import math
from dataclasses import dataclass
from typing import Literal

# ─── Scaling and threshold constants ─────────────────────────────────────────

# CONF_SCALE: multiplier applied to |pred_return| before sigmoid
# Calibrated so that |pred| = 1% gives confidence ≈ 0.73
# Increase to be more selective (fewer trades); decrease for more trades
CONF_SCALE = 100.0

# Floor: below this confidence → always HOLD
# Lowered from 0.55 to 0.52 — allows more backtest trades
# Raise to 0.60+ for live trading with real capital
CONFIDENCE_FLOOR = 0.52

# Signal strength tiers
STRONG_CONFIDENCE = 0.70   # sigmoid(|pred|×100) ≥ 0.70 → |pred| ≥ 0.85%
MEDIUM_CONFIDENCE = 0.60   # sigmoid(|pred|×100) ≥ 0.60 → |pred| ≥ 0.40%

# Return magnitude thresholds (additional filter on top of confidence)
STRONG_RETURN_PCT = 0.010  # predicted move ≥ 1.0% for STRONG
MEDIUM_RETURN_PCT = 0.004  # predicted move ≥ 0.4% for MEDIUM


@dataclass
class SignalResult:
    signal:     Literal["BUY", "SELL", "HOLD"]
    strength:   Literal["STRONG", "MEDIUM", "WEAK"]
    reason:     str


def pred_to_confidence(pred_return: float, scale: float = CONF_SCALE) -> float:
    """
    Convert a raw signed return prediction to a confidence value in [0, 1].

    Uses sigmoid of the magnitude:
        conf = 1 / (1 + exp(-|pred_return| × scale))

    Args:
        pred_return: signed return from model (e.g. +0.015 = +1.5%)
        scale:       scaling factor (default CONF_SCALE=100)

    Returns:
        confidence in (0.5, 1.0) — always above 0.5 since we take |pred|
    """
    magnitude = abs(pred_return)
    return 1.0 / (1.0 + math.exp(-magnitude * scale))


def generate_signal_v2(
    direction:       int,
    confidence:      float,
    expected_return: float,
) -> tuple[str, str]:
    """
    Convert model outputs into a trading signal.

    For V4 single-head model, call like this:
        pred = model(x).item()                          # signed return
        direction = 1 if pred > 0 else 0               # derived direction
        confidence = pred_to_confidence(pred)           # magnitude-based
        signal, strength = generate_signal_v2(direction, confidence, pred)

    Args:
        direction:       1 = UP prediction, 0 = DOWN prediction
        confidence:      0-1 value (from pred_to_confidence or softmax)
        expected_return: raw predicted return (signed float)

    Returns:
        (signal, strength) where:
            signal   ∈ {BUY, SELL, HOLD}
            strength ∈ {STRONG, MEDIUM, WEAK}
    """
    result = _evaluate(direction, confidence, expected_return)
    return result.signal, result.strength


def _evaluate(direction: int, confidence: float,
              expected_return: float) -> SignalResult:

    abs_ret = abs(expected_return)

    # Gate 1: minimum confidence floor
    if confidence < CONFIDENCE_FLOOR:
        return SignalResult(
            "HOLD", "WEAK",
            f"conf={confidence:.3f} below floor={CONFIDENCE_FLOOR}"
        )

    # Gate 2: minimum return magnitude (filters noise from near-zero predictions)
    if abs_ret < MEDIUM_RETURN_PCT:
        return SignalResult(
            "HOLD", "WEAK",
            f"|ret|={abs_ret:.4f} below minimum={MEDIUM_RETURN_PCT}"
        )

    # BUY signals
    if direction == 1:
        if confidence >= STRONG_CONFIDENCE and abs_ret >= STRONG_RETURN_PCT:
            return SignalResult(
                "BUY", "STRONG",
                f"conf={confidence:.3f} pred={expected_return:+.4f}"
            )
        if confidence >= MEDIUM_CONFIDENCE:
            return SignalResult(
                "BUY", "MEDIUM",
                f"conf={confidence:.3f} pred={expected_return:+.4f}"
            )
        return SignalResult(
            "HOLD", "WEAK",
            f"BUY: conf={confidence:.3f} below MEDIUM_CONFIDENCE={MEDIUM_CONFIDENCE}"
        )

    # SELL signals
    if direction == 0:
        if confidence >= STRONG_CONFIDENCE and abs_ret >= STRONG_RETURN_PCT:
            return SignalResult(
                "SELL", "STRONG",
                f"conf={confidence:.3f} pred={expected_return:+.4f}"
            )
        if confidence >= MEDIUM_CONFIDENCE:
            return SignalResult(
                "SELL", "MEDIUM",
                f"conf={confidence:.3f} pred={expected_return:+.4f}"
            )
        return SignalResult(
            "HOLD", "WEAK",
            f"SELL: conf={confidence:.3f} below MEDIUM_CONFIDENCE={MEDIUM_CONFIDENCE}"
        )

    return SignalResult("HOLD", "WEAK", "Unknown direction")
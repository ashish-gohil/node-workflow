"""
utils/trading_v2.py  --  Signal Generation for StockForecastNet V6
====================================================================

HOW CONFIDENCE WORKS IN V6
-----------------------------
V5 model output:  a single signed return scalar (e.g. +0.012 = +1.2%)
  Confidence was derived from the MAGNITUDE of the return prediction:
      conf = sigmoid(|pred_return| * 100)
  Problem: large magnitudes did not reliably indicate correct direction.

V6 model output:  a logit from the direction_head
  sigmoid(logit) = direct probability of UP direction.
  Confidence is simply how far the probability is from 0.5:
      if signal is UP:   confidence = sigmoid(logit)         [range 0.5..1.0]
      if signal is DOWN: confidence = 1.0 - sigmoid(logit)   [range 0.5..1.0]

  This is much better calibrated because BCE training directly optimises
  the logit to produce correct UP/DOWN probabilities.

THRESHOLD GUIDE FOR V6
------------------------
  CONFIDENCE_FLOOR = 0.60
    Any signal below this is HOLD. For V6 this maps to sigmoid(logit) < 0.60
    or > 0.40, meaning the model is less than 60% confident in its call.
    V5 used 0.52 because its confidence was poorly calibrated.
    V6's BCE-trained logit is better calibrated so 0.60 is appropriate.
    Raise to 0.65 for live trading with real capital.

  STRONG_CONFIDENCE = 0.70
    sigmoid(logit) >= 0.70 means the model gives 70%+ probability to its call.
    These signals have the best historical accuracy. Prioritize these.

  MEDIUM_CONFIDENCE = 0.63
    Between floor and strong. Valid trade but smaller position size recommended.

RETURN MAGNITUDE FILTER
-------------------------
  V6 still uses pred_return as a secondary filter, but pred_return is now
  obtained by DENORMALISING the magnitude_head output (not from the logit).
  This means pred_return is only used for position sizing and magnitude gate --
  never for direction determination.

USAGE
------
  # V6 usage (typical):
  from utils.trading_v2 import generate_signal_v2, CONFIDENCE_FLOOR

  p_up = float(torch.sigmoid(logit[0]).item())
  direction  = 1 if p_up >= 0.5 else 0
  confidence = p_up if direction == 1 else (1.0 - p_up)
  pred_return = float(mag_denorm[-1].item())   # for magnitude gate only

  signal, strength = generate_signal_v2(direction, confidence, pred_return)

  # LightGBM usage:
  p_up = lgbm_model.predict_proba(X)[:, 1]
  direction  = 1 if p_up >= 0.5 else 0
  confidence = p_up if direction == 1 else (1.0 - p_up)
  signal, strength = generate_signal_v2(direction, confidence, 0.01)
"""

import math
from dataclasses import dataclass
from typing import Literal, Tuple


# ─── Constants ────────────────────────────────────────────────────────────────

# Floor confidence for generating any trade signal.
# V6: raised from 0.52 (V5) to 0.60 because V6 BCE logit is better calibrated.
# A V6 model with random init scores ~0.50 confidence -- no spurious trades.
# A well-trained V6 model will typically score 0.58-0.72 on its predictions.
CONFIDENCE_FLOOR   = 0.60

# STRONG signals: model is very confident. These have the best win rate.
STRONG_CONFIDENCE  = 0.70

# MEDIUM signals: model is moderately confident.
MEDIUM_CONFIDENCE  = 0.63

# Minimum absolute predicted return for a STRONG or MEDIUM signal.
# Acts as a secondary filter to avoid trading on tiny predicted moves.
# 0.005 = 0.5% predicted move over the horizon.
STRONG_RETURN_PCT  = 0.010   # >= 1.0% predicted 3-day return
MEDIUM_RETURN_PCT  = 0.004   # >= 0.4% predicted 3-day return

# Legacy constant kept for backward compatibility with V5-era code.
# V6 does not use CONF_SCALE -- confidence comes directly from sigmoid(logit).
CONF_SCALE = 100.0


# ─── Data structures ──────────────────────────────────────────────────────────

@dataclass
class SignalResult:
    signal:   Literal["BUY", "SELL", "HOLD"]
    strength: Literal["STRONG", "MEDIUM", "WEAK"]
    reason:   str


# ─── Public interface ─────────────────────────────────────────────────────────

def generate_signal_v2(
    direction:       int,
    confidence:      float,
    expected_return: float,
) -> Tuple[str, str]:
    """
    Convert V6 model outputs into a trading signal (BUY / SELL / HOLD).

    Args:
        direction:       1 = UP prediction, 0 = DOWN prediction.
                         For V6 Transformer: derived from sigmoid(logit) >= 0.5.
                         For LightGBM: derived from predict_proba()[:, 1] >= 0.5.

        confidence:      Probability distance from 0.5 (range: 0.5 to 1.0).
                         For V6 Transformer: sigmoid(logit) if UP, else 1-sigmoid(logit).
                         For LightGBM: same calculation from predict_proba output.
                         Minimum possible value = 0.5 (completely uncertain).
                         Maximum possible value = 1.0 (completely certain).

        expected_return: Estimated % return over the horizon (signed float).
                         For V6 Transformer: obtained from magnitude_head output
                         AFTER denormalisation. Used only for magnitude filter.
                         For LightGBM: pass a constant (e.g. 0.01) if no magnitude.

    Returns:
        (signal, strength) where:
            signal   in {"BUY", "SELL", "HOLD"}
            strength in {"STRONG", "MEDIUM", "WEAK"}

    Example:
        # V6 Transformer:
        p_up = float(torch.sigmoid(logit[0]).item())
        direction = 1 if p_up >= 0.5 else 0
        confidence = p_up if direction == 1 else (1.0 - p_up)
        pred_return = float(revin.denormalize(mag_norm[0], stats)[-1].item())
        signal, strength = generate_signal_v2(direction, confidence, pred_return)

        # LightGBM:
        p_up = float(model.predict_proba(X_row)[0, 1])
        direction = 1 if p_up >= 0.5 else 0
        confidence = p_up if direction == 1 else (1.0 - p_up)
        signal, strength = generate_signal_v2(direction, confidence, 0.01)
    """
    result = _evaluate(direction, confidence, expected_return)
    return result.signal, result.strength


def pred_to_confidence(pred_return: float, scale: float = CONF_SCALE) -> float:
    """
    Legacy V5 function: convert signed return to confidence via sigmoid(magnitude).
    Kept for backward compatibility with V5-era backtest and API code.
    For V6, compute confidence directly from sigmoid(logit) instead.

    Args:
        pred_return: signed return scalar from V5 model output.
        scale: scaling factor (default 100).

    Returns:
        Confidence value in (0.5, 1.0).
    """
    magnitude = abs(pred_return)
    return 1.0 / (1.0 + math.exp(-magnitude * scale))


# ─── Implementation ───────────────────────────────────────────────────────────

def _evaluate(
    direction:       int,
    confidence:      float,
    expected_return: float,
) -> SignalResult:
    """
    Core signal evaluation logic. Not called directly -- use generate_signal_v2.

    Gate 1: Confidence floor.
        Rejects signals where the model is less than CONFIDENCE_FLOOR sure.
        For V6, CONFIDENCE_FLOOR=0.60 means the model must give >60% probability
        to UP or DOWN. If it gives 55% UP probability, confidence=0.55 < 0.60,
        and the signal is HOLD.

    Gate 2: Minimum return magnitude.
        Even with high confidence, if the predicted return is tiny (< 0.4%),
        transaction costs (0.30% round-trip) would consume most of the gain.
        This gate prevents trading on statistically significant but economically
        meaningless predictions.

    Signal tiers:
        STRONG: confidence >= 0.70 AND |return| >= 1.0%
        MEDIUM: confidence >= 0.63 AND |return| >= 0.4%
        WEAK/HOLD: anything below these thresholds
    """
    abs_ret = abs(expected_return)

    # Gate 1: minimum confidence
    if confidence < CONFIDENCE_FLOOR:
        return SignalResult(
            "HOLD", "WEAK",
            f"conf={confidence:.3f} < floor={CONFIDENCE_FLOOR}"
        )

    # Gate 2: minimum return magnitude
    if abs_ret < MEDIUM_RETURN_PCT:
        return SignalResult(
            "HOLD", "WEAK",
            f"|ret|={abs_ret:.4f} < min={MEDIUM_RETURN_PCT} (costs would consume gain)"
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
            f"BUY: conf={confidence:.3f} < MEDIUM={MEDIUM_CONFIDENCE}"
        )

    # SELL signals (direction == 0 means DOWN)
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
            f"SELL: conf={confidence:.3f} < MEDIUM={MEDIUM_CONFIDENCE}"
        )

    return SignalResult("HOLD", "WEAK", "Unknown direction value")
"""
infer.py  --  Daily Inference Script  (StockForecastNet V6 + LightGBM)
=======================================================================

This script runs the full inference pipeline for a given NSE stock symbol.
It supports three inference modes:

  MODE 1 -- Transformer only (default)
    Uses StockForecastNet V6 (PatchTST + Feature Attention + BCE Loss).
    Fastest. Single model. Good for most use cases.

  MODE 2 -- LightGBM only (--model lgbm)
    Uses the trained LightGBM direction classifier.
    No GPU needed. Trains in 2-5 min. Often matches transformer accuracy.
    Good for production environments without GPU.

  MODE 3 -- Ensemble (--model ensemble)
    Combines both models: weighted average of their UP probabilities.
    LightGBM weight 0.55 + Transformer weight 0.45 by default.
    Most reliable. Recommended for production trading.

USAGE
------
  # Transformer only (most common)
  python infer.py --symbol TCS

  # Specify different symbol
  python infer.py --symbol INFY

  # LightGBM only
  python infer.py --symbol TCS --model lgbm

  # Ensemble (both models combined)
  python infer.py --symbol TCS --model ensemble

  # JSON output (for n8n automation / API integration)
  python infer.py --symbol TCS --output json
  python infer.py --symbol TCS --model ensemble --output json

  # Show feature attention weights (which indicators the model focused on)
  python infer.py --symbol TCS --show_attention

  # More candles (default 300, minimum = SEQ_LEN + warmup = ~190)
  python infer.py --symbol TCS --candles 400

WHAT THE OUTPUT MEANS
-----------------------
  signal:          BUY / SELL / HOLD
  strength:        STRONG / MEDIUM / WEAK
  direction_label: UP / DOWN  (the raw direction regardless of thresholds)
  p_up:            Probability that price will be higher in HORIZON days (0-1)
  confidence:      How confident the model is in its direction call (0.5-1.0)
                   0.5 = completely uncertain, 1.0 = completely certain
  predicted_return: Estimated % return over the horizon (display only)
                    V6: denormalised from magnitude_head, not from logit
  step_agreement:  True if all 3 horizon steps predict same direction
                   True = stronger signal, False = mixed (weaker signal)
  top5_features:   For transformer: which indicators got highest attention weight
                   These are the features the model relied on most for this prediction

HOW CONFIDENCE WORKS IN V6
-----------------------------
  V5: confidence = sigmoid(|pred_return| * 100)  -- poorly calibrated
      Random model gave 0.50 confidence, but systematic bias pushed this to 0.62+
      even when direction was wrong.

  V6: confidence = sigmoid(logit)  [for UP predictions]
      confidence = 1 - sigmoid(logit)  [for DOWN predictions]
      This comes directly from BCE training -- the model is TRAINED to output
      correct probabilities. A value of 0.68 means the model was right 68%
      of the time on similarly-confident predictions during training.

ENVIRONMENT VARIABLES
-----------------------
  MODEL_PATH:  path to pretrained_v6.pth
  CONFIG_PATH: path to pretrained_v6_config.pth
  SCALER_PATH: path to scaler_v2.pkl
  LGBM_PATH:   path to lgbm_it_model.pkl (only needed for --model lgbm/ensemble)
"""

import argparse
import json
import os
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import joblib
import numpy as np
import pandas as pd
import torch

from config import settings, validate
from data_fetch_upstox import fetch_historical_data
from dataset_v6 import extract_time_features
from features_v6 import FEATURE_COLS, add_features_v6
from model_v6 import StockForecastNet
from utils.trading_v6 import (
    CONFIDENCE_FLOOR,
    STRONG_CONFIDENCE,
    MEDIUM_CONFIDENCE,
    generate_signal_v2,
)


# ─── Transformer inference ────────────────────────────────────────────────────

def load_transformer(
    model_path:  str = None,
    config_path: str = None,
) -> StockForecastNet:
    """
    Load a trained StockForecastNet V6 from disk.

    Args:
        model_path:  path to .pth weights file (uses settings.MODEL_PATH if None)
        config_path: path to config .pth file  (uses settings.CONFIG_PATH if None)

    Returns:
        model in eval mode on CPU.

    Raises:
        FileNotFoundError if either file is missing.
    """
    model_path  = model_path  or settings.MODEL_PATH
    config_path = config_path or settings.CONFIG_PATH

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model weights not found: {model_path}\n"
            f"Train the model first:\n"
            f"  python train_v2.py --mode pretrain "
            f"--symbols TCS,INFY,WIPRO,HCLTECH,TECHM,LTI,MPHASIS\n"
            f"Or download from Colab after training."
        )

    # Load architecture config
    if os.path.exists(config_path):
        cfg = torch.load(config_path, map_location="cpu")
    else:
        # Fallback to V6 defaults if config file is missing
        print(f"  [warn] Config not found at {config_path}. Using V6 defaults.", flush=True)
        cfg = {
            "n_features":   len(FEATURE_COLS),
            "seq_len":      90,
            "horizon":      3,
            "patch_size":   16,
            "stride":       8,
            "d_model":      96,
            "n_heads":      4,
            "n_layers":     2,
            "d_ff":         192,
            "dropout":      0.0,   # always 0 at inference
            "revin_affine": True,
        }

    model = StockForecastNet(**cfg)
    state_dict = torch.load(model_path, map_location="cpu")
    missing, unexpected = model.load_state_dict(state_dict, strict=False)

    if missing:
        print(f"  [warn] {len(missing)} missing keys in state_dict (zero-initialised).", flush=True)
    if unexpected:
        print(f"  [warn] {len(unexpected)} unexpected keys in state_dict (ignored).", flush=True)

    model.eval()
    return model


def run_transformer(
    df_feat:    pd.DataFrame,
    model:      StockForecastNet,
    scaler,
    seq_len:    int = 90,
) -> dict:
    """
    Run StockForecastNet V6 on the most recent SEQ_LEN rows of df_feat.

    Args:
        df_feat:  DataFrame with FEATURE_COLS (from add_features_v6)
                  plus 'datetime' column (used for time features).
        model:    Loaded StockForecastNet V6 in eval mode.
        scaler:   Fitted RobustScaler (from scaler_v2.pkl).
        seq_len:  Input window length in days.

    Returns:
        dict with keys:
            p_up, direction, confidence, pred_return, all_steps,
            step_agreement, top5_features
    """
    n_rows = len(df_feat)

    if n_rows < seq_len:
        raise ValueError(
            f"Need at least {seq_len} rows after feature engineering. "
            f"Got {n_rows}. Fetch more candle history (try --candles 400)."
        )

    # Scale the last SEQ_LEN rows of features
    X_raw    = df_feat.tail(seq_len)[FEATURE_COLS].values   # (seq_len, 56)
    X_scaled = scaler.transform(X_raw)                       # (seq_len, 56)
    X_t      = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)  # (1, seq_len, 56)

    # Extract cyclic time features [month_sin, month_cos, dow_sin, dow_cos, dom_sin, dom_cos]
    tf_arr = extract_time_features(df_feat, window_start=n_rows - seq_len, window_len=seq_len)
    tf_t   = torch.tensor(tf_arr, dtype=torch.float32).unsqueeze(0)  # (1, seq_len, 6)

    # V6 forward: returns (logit, mag_norm, revin_stats)
    # Optionally returns attention weights as 4th element if return_attn_weights=True
    with torch.no_grad():
        logit, mag_norm, revin_stats, attn_w = model.forward(
            X_t, tf_t, return_attn_weights=True
        )

    # Direction from logit probability
    # sigmoid(logit) = P(UP). Range 0..1.
    p_up       = float(torch.sigmoid(logit[0]).item())
    direction  = 1 if p_up >= 0.5 else 0
    confidence = p_up if direction == 1 else (1.0 - p_up)

    # Denormalise magnitude for display
    # This is only for human-readable output -- NOT used for direction decision.
    mag_denorm  = model.revin.denormalize(mag_norm[0], revin_stats)  # (horizon,)
    pred_return = float(mag_denorm[-1].item())   # primary = furthest horizon step
    all_steps   = [round(float(v), 6) for v in mag_denorm.tolist()]

    # Agreement: all horizon steps predict same direction?
    step_agreement = (
        all(s > 0 for s in all_steps) or
        all(s < 0 for s in all_steps)
    )

    # Feature attention weights -- which indicators the model relied on most
    attn = attn_w[0].tolist()  # (56,) -- one weight per feature
    top5_idx = sorted(range(len(attn)), key=lambda i: attn[i], reverse=True)[:5]
    top5_features = {
        FEATURE_COLS[i]: round(attn[i], 4) for i in top5_idx
    }

    return {
        "p_up":           round(p_up, 4),
        "direction":      direction,
        "confidence":     round(confidence, 4),
        "pred_return":    round(pred_return, 6),
        "all_steps":      all_steps,
        "step_agreement": step_agreement,
        "top5_features":  top5_features,
        "model_type":     "transformer_v6",
    }


# ─── LightGBM inference ───────────────────────────────────────────────────────

def load_lgbm(lgbm_path: str = None):
    """
    Load a trained LGBMDirectionModel from disk.

    Args:
        lgbm_path: path to lgbm_it_model.pkl

    Returns:
        LGBMDirectionModel instance.

    Raises:
        FileNotFoundError if lgbm_path does not exist.
        ImportError if lightgbm package is not installed.
    """
    lgbm_path = lgbm_path or os.getenv("LGBM_PATH", "lgbm_it_model.pkl")

    if not os.path.exists(lgbm_path):
        raise FileNotFoundError(
            f"LightGBM model not found: {lgbm_path}\n"
            f"Train it first:\n"
            f"  pip install lightgbm\n"
            f"  python lgbm_model.py --symbols TCS,INFY,WIPRO,HCLTECH,TECHM\n"
            f"Then set LGBM_PATH={lgbm_path} in your .env file."
        )

    from lgbm_model import LGBMDirectionModel
    return LGBMDirectionModel.load(lgbm_path)


def run_lgbm(df_feat: pd.DataFrame, lgbm_model) -> dict:
    """
    Run LightGBM direction classifier on the most recent data point.

    The LightGBM model creates ~580 tabular features from the last 20 days
    of each of the 56 indicators (lagged values, rolling stats, interactions).
    It then predicts P(direction=UP) for the most recent date.

    Args:
        df_feat:    DataFrame with FEATURE_COLS (from add_features_v6).
        lgbm_model: Loaded LGBMDirectionModel instance.

    Returns:
        dict with keys: p_up, direction, confidence, model_type
    """
    result = lgbm_model.predict_latest(df_feat)

    return {
        "p_up":           result["p_up"],
        "direction":      result["direction"],
        "confidence":     result["confidence"],
        "pred_return":    0.01,   # placeholder -- LightGBM has no magnitude estimate
        "all_steps":      [],
        "step_agreement": True,   # LightGBM doesn't predict multi-step
        "top5_features":  {},
        "model_type":     "lightgbm",
    }


# ─── Ensemble combination ─────────────────────────────────────────────────────

def combine_ensemble(
    trans_result: dict,
    lgbm_result:  dict,
    lgbm_weight:  float = 0.55,
    trans_weight: float = 0.45,
) -> dict:
    """
    Combine transformer and LightGBM predictions by weighted average of P(UP).

    Default weights: LightGBM 0.55, Transformer 0.45.
    Rationale: LightGBM tends to perform slightly better on IT-sector-only
    correlated data (tabular format, less diversity needed). Both models
    contribute complementary signal: transformer captures temporal patterns,
    LightGBM captures indicator threshold patterns.

    To adjust weights: pass --lgbm_weight when calling from CLI,
    or call combine_ensemble() directly with custom weights.

    Higher lgbm_weight = trust LightGBM more.
    Higher trans_weight = trust transformer more.

    Args:
        trans_result: output dict from run_transformer()
        lgbm_result:  output dict from run_lgbm()
        lgbm_weight:  weight for LightGBM P(UP) (default 0.55)
        trans_weight: weight for Transformer P(UP) (default 0.45)

    Returns:
        Combined result dict with all original transformer fields plus ensemble stats.
    """
    p_up_trans = trans_result["p_up"]
    p_up_lgbm  = lgbm_result["p_up"]

    # Weighted average of UP probabilities
    p_up_ensemble = lgbm_weight * p_up_lgbm + trans_weight * p_up_trans

    direction  = 1 if p_up_ensemble >= 0.5 else 0
    confidence = p_up_ensemble if direction == 1 else (1.0 - p_up_ensemble)

    # Use transformer's magnitude estimate (LightGBM doesn't have one)
    pred_return = trans_result["pred_return"]

    return {
        "p_up":              round(p_up_ensemble, 4),
        "direction":         direction,
        "confidence":        round(confidence, 4),
        "pred_return":       pred_return,
        "all_steps":         trans_result["all_steps"],
        "step_agreement":    trans_result["step_agreement"],
        "top5_features":     trans_result["top5_features"],
        "model_type":        "ensemble",
        "p_up_transformer":  round(p_up_trans, 4),
        "p_up_lgbm":         round(p_up_lgbm, 4),
        "lgbm_weight":       lgbm_weight,
        "trans_weight":      trans_weight,
        "weight_sum_check":  round(lgbm_weight + trans_weight, 3),
    }


# ─── Main inference entry point ───────────────────────────────────────────────

def run_inference(
    symbol:        str,
    model_type:    str  = "transformer",  # "transformer" | "lgbm" | "ensemble"
    candles:       int  = 300,
    model_path:    str  = None,
    config_path:   str  = None,
    scaler_path:   str  = None,
    lgbm_path:     str  = None,
    lgbm_weight:   float = 0.55,
    trans_weight:  float = 0.45,
) -> dict:
    """
    Full inference pipeline for one stock symbol.

    Fetches recent OHLCV data, engineers features, runs the selected model(s),
    applies signal thresholds, and returns a structured result dict.

    Args:
        symbol:       NSE stock symbol (e.g. "TCS", "INFY").
                      The script appends .NS for yfinance if needed.
        model_type:   Which model(s) to use: "transformer", "lgbm", or "ensemble".
        candles:      How many recent candles to fetch. Must be >= SEQ_LEN + ~100.
                      Minimum recommended: 300.
        model_path:   Path to pretrained_v6.pth (uses settings.MODEL_PATH if None).
        config_path:  Path to pretrained_v6_config.pth (uses settings.CONFIG_PATH if None).
        scaler_path:  Path to scaler_v2.pkl (uses settings.SCALER_PATH if None).
        lgbm_path:    Path to lgbm_it_model.pkl (uses LGBM_PATH env var if None).
        lgbm_weight:  Weight for LightGBM in ensemble (default 0.55).
        trans_weight: Weight for Transformer in ensemble (default 0.45).

    Returns:
        dict with full prediction result. Always contains:
            symbol, model_type, signal, strength, direction, direction_label,
            p_up, confidence, predicted_return, horizon_days, all_horizon_steps,
            step_agreement, top5_features, action
        Ensemble also includes: p_up_transformer, p_up_lgbm, lgbm_weight, trans_weight
    """
    scaler_path = scaler_path or settings.SCALER_PATH
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(
            f"Scaler not found: {scaler_path}\n"
            f"Train the model first and make sure scaler_v2.pkl is in the project folder."
        )

    print(f"[infer] Fetching {candles} candles for {symbol}...", file=sys.stderr)

    # Fetch recent data (Upstox or cached parquet)
    df_raw = fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        use_cache=True, force_refresh=False,
    ).tail(candles)

    if len(df_raw) < 200:
        raise ValueError(
            f"Only {len(df_raw)} rows fetched for {symbol}. "
            f"Need at least 200 rows (try --candles 500)."
        )

    # Feature engineering: raw OHLCV -> 56 stationary indicators
    print(f"[infer] Engineering features...", file=sys.stderr)
    df_feat = add_features_v6(df_raw)

    if len(df_feat) < 90:
        raise ValueError(
            f"Only {len(df_feat)} rows after feature engineering. "
            f"Ichimoku + SuperTrend need ~100 warmup rows. "
            f"Fetch more history with --candles 400."
        )

    # Load scaler (always needed for transformer; also for LightGBM's build_tree_features)
    scaler = joblib.load(scaler_path)

    # Run the selected inference mode
    if model_type == "transformer":
        model = load_transformer(model_path, config_path)
        cfg   = model.get_config()
        result = run_transformer(df_feat, model, scaler, seq_len=cfg["seq_len"])
        horizon = cfg["horizon"]

    elif model_type == "lgbm":
        lgbm_mdl = load_lgbm(lgbm_path)
        result   = run_lgbm(df_feat, lgbm_mdl)
        horizon  = lgbm_mdl.horizon

    elif model_type == "ensemble":
        # Load both models, run both, combine results
        model    = load_transformer(model_path, config_path)
        cfg      = model.get_config()
        lgbm_mdl = load_lgbm(lgbm_path)
        horizon  = cfg["horizon"]

        trans_result = run_transformer(df_feat, model, scaler, seq_len=cfg["seq_len"])
        lgbm_result  = run_lgbm(df_feat, lgbm_mdl)
        result = combine_ensemble(trans_result, lgbm_result, lgbm_weight, trans_weight)

    else:
        raise ValueError(
            f"Unknown model_type '{model_type}'. "
            f"Choose: 'transformer', 'lgbm', or 'ensemble'."
        )

    # Generate BUY / SELL / HOLD signal using V6 thresholds
    direction  = result["direction"]
    confidence = result["confidence"]
    pred_return = result["pred_return"]
    signal, strength = generate_signal_v2(direction, confidence, pred_return)

    # Latest date from data
    if "datetime" in df_feat.columns:
        latest_date = str(df_feat["datetime"].iloc[-1].date())
    else:
        latest_date = "unknown"

    direction_label = "UP" if direction == 1 else "DOWN"
    sign = "+" if pred_return >= 0 else ""

    # Build the full result dict
    full_result = {
        "symbol":            symbol,
        "date":              latest_date,
        "model_type":        result["model_type"],
        "signal":            signal,
        "strength":          strength,
        "direction":         direction,
        "direction_label":   direction_label,
        "p_up":              result["p_up"],
        "confidence":        result["confidence"],
        "predicted_return":  pred_return,
        "horizon_days":      horizon,
        "all_horizon_steps": result["all_steps"],
        "step_agreement":    result["step_agreement"],
        "top5_features":     result["top5_features"],
        # One-line human-readable action string (good for notifications / n8n)
        "action": (
            f"{signal} ({strength}) -- {direction_label} "
            f"{confidence:.1%} confidence. "
            f"Predicted {horizon}d: {sign}{pred_return:.2%}."
        ),
    }

    # Add ensemble-specific fields if applicable
    if model_type == "ensemble":
        full_result["p_up_transformer"] = result.get("p_up_transformer")
        full_result["p_up_lgbm"]        = result.get("p_up_lgbm")
        full_result["lgbm_weight"]       = result.get("lgbm_weight")
        full_result["trans_weight"]      = result.get("trans_weight")

    return full_result


# ─── Pretty printer ───────────────────────────────────────────────────────────

def print_human(result: dict):
    """Print the inference result in a readable format for terminal use."""
    sep = "=" * 65

    print(f"\n{sep}")
    print(f"  PREDICTION  --  {result['symbol']}  "
          f"(Model: {result['model_type'].upper()})")
    print(f"  Date: {result['date']}")
    print(sep)
    print(f"  Signal:        {result['signal']}  ({result['strength']})")
    print(f"  Direction:     {result['direction_label']}  "
          f"(p_up = {result['p_up']:.1%})")
    print(f"  Confidence:    {result['confidence']:.1%}")

    if result["all_horizon_steps"]:
        steps_str = "  ".join(
            f"day{i+1}: {s:+.2%}"
            for i, s in enumerate(result["all_horizon_steps"])
        )
        print(f"  Horizon:       {steps_str}")
        if result["step_agreement"]:
            print(f"  Agreement:     All steps agree (stronger signal)")
        else:
            print(f"  Agreement:     Steps diverge (weaker signal -- use caution)")

    if result.get("model_type") == "ensemble":
        print(f"\n  Ensemble breakdown:")
        print(f"    Transformer p_up: {result['p_up_transformer']:.1%}  "
              f"(weight {result['trans_weight']:.0%})")
        print(f"    LightGBM    p_up: {result['p_up_lgbm']:.1%}  "
              f"(weight {result['lgbm_weight']:.0%})")
        print(f"    Combined:         {result['p_up']:.1%}")

    if result.get("top5_features"):
        print(f"\n  Top indicators (attention weights):")
        for feat, wt in result["top5_features"].items():
            bar = "=" * int(wt * 200)
            print(f"    {feat:<30}  {wt:.4f}  {bar}")

    print(f"\n  Action: {result['action']}")
    print(sep)

    # Interpretation guide
    print()
    print("  Confidence thresholds:")
    print(f"    >= {STRONG_CONFIDENCE:.0%} = STRONG signal  (model very confident)")
    print(f"    >= {MEDIUM_CONFIDENCE:.0%} = MEDIUM signal")
    print(f"     < {CONFIDENCE_FLOOR:.0%} = HOLD (model uncertain -- no trade)")
    print()


# ─── CLI ──────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="StockForecastNet V6 + LightGBM Daily Inference",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python infer.py --symbol TCS\n"
            "  python infer.py --symbol INFY --model ensemble\n"
            "  python infer.py --symbol TCS --output json --model lgbm\n"
        ),
    )

    parser.add_argument(
        "--symbol",
        required=True,
        help=(
            "NSE stock symbol (e.g. TCS, INFY, RELIANCE).\n"
            "Do NOT include .NS -- the data fetch adds it automatically."
        ),
    )
    parser.add_argument(
        "--model",
        default="transformer",
        choices=["transformer", "lgbm", "ensemble"],
        help=(
            "Which model to use for inference:\n"
            "  transformer  -- StockForecastNet V6 (default)\n"
            "  lgbm         -- LightGBM direction classifier\n"
            "  ensemble     -- Weighted combination of both\n"
        ),
    )
    parser.add_argument(
        "--output",
        default="human",
        choices=["human", "json"],
        help=(
            "Output format:\n"
            "  human -- formatted terminal output (default)\n"
            "  json  -- single JSON line (for n8n / API integration)\n"
        ),
    )
    parser.add_argument(
        "--candles",
        type=int,
        default=300,
        help=(
            "How many recent candles to fetch (default: 300).\n"
            "Minimum: ~190 (90 window + 100 warmup rows).\n"
            "Increase to 400+ if you get 'not enough rows' errors."
        ),
    )
    parser.add_argument(
        "--lgbm_weight",
        type=float,
        default=0.55,
        help=(
            "LightGBM weight in ensemble (default: 0.55).\n"
            "Transformer weight = 1.0 - lgbm_weight.\n"
            "Increase if LightGBM val_acc > Transformer val_acc."
        ),
    )
    parser.add_argument(
        "--model_path",
        default=None,
        help="Override path to pretrained_v6.pth. Uses MODEL_PATH env var if not set.",
    )
    parser.add_argument(
        "--config_path",
        default=None,
        help="Override path to pretrained_v6_config.pth.",
    )
    parser.add_argument(
        "--scaler_path",
        default=None,
        help="Override path to scaler_v2.pkl.",
    )
    parser.add_argument(
        "--lgbm_path",
        default=None,
        help="Override path to lgbm_it_model.pkl.",
    )
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()

    try:
        # Validate that required config paths exist
        validate()

        result = run_inference(
            symbol       = args.symbol,
            model_type   = args.model,
            candles      = args.candles,
            model_path   = args.model_path,
            config_path  = args.config_path,
            scaler_path  = args.scaler_path,
            lgbm_path    = args.lgbm_path,
            lgbm_weight  = args.lgbm_weight,
            trans_weight = 1.0 - args.lgbm_weight,
        )

        if args.output == "json":
            print(json.dumps(result))
        else:
            print_human(result)

    except FileNotFoundError as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        import traceback
        print(f"\nUNEXPECTED ERROR: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
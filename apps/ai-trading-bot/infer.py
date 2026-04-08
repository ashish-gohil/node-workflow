"""
infer.py — Daily inference script.

This is the script your n8n node (or cron job) calls every day AFTER market
close to get a BUY / SELL / HOLD signal for the next trading day.

HOW IT WORKS:
    1. Fetches the latest N candles for a symbol from Upstox
    2. Runs feature engineering (IDENTICAL to training pipeline)
    3. Applies the saved scaler (SAME normalisation used at training time)
    4. Passes the last `window` candles through the trained model
    5. Prints a human-readable or JSON signal

HOW TO CALL FROM n8n "Execute Command" node:
    python infer.py --symbol RELIANCE --output json

    The JSON output can then be parsed in n8n using the JSON node.

USAGE:
    python infer.py --symbol RELIANCE
    python infer.py --symbol TCS --output json
    python infer.py --symbol HDFCBANK --candles 300
"""

import argparse
import json
import sys

import joblib
import torch
import torch.nn.functional as F

from config import settings, validate
from data_fetch_upstox import fetch_historical_data
from features_v2 import add_features_v2, FEATURE_COLS
from model_v2 import StockTransformerV2
from utils.trading_v2 import generate_signal_v2


def run_inference(
    symbol: str,
    model_path: str = None,
    config_path: str = None,
    scaler_path: str = None,
    candles: int = 200,
) -> dict:
    """
    Fetch latest data for a symbol, run the model, return a trading signal dict.

    Args:
        symbol:      NSE stock symbol (e.g. "RELIANCE", "TCS", "HDFCBANK")
        model_path:  Path to trained model weights (.pth)
        config_path: Path to saved model architecture config (.pth)
        scaler_path: Path to saved StandardScaler (.pkl)
        candles:     How many recent candles to fetch (200 gives enough for all indicators)

    Returns:
        {
            "symbol":          "RELIANCE",
            "signal":          "BUY",          # BUY / SELL / HOLD
            "strength":        "STRONG",        # STRONG / MEDIUM / WEAK
            "direction":       1,               # 1 = UP, 0 = DOWN
            "direction_label": "UP",
            "confidence":      0.7812,          # Model's certainty (0-1)
            "expected_return": 0.0184,          # Predicted % move
            "action":          "BUY RELIANCE — STRONG signal ..."
        }
    """
    model_path  = model_path  or settings.MODEL_PATH
    config_path = config_path or settings.CONFIG_PATH
    scaler_path = scaler_path or settings.SCALER_PATH

    # ── Step 1: Load model + scaler ───────────────────────────────────────────
    _require_file(model_path,  f"Model not found. Run: python train_v2.py --symbol {symbol}")
    _require_file(scaler_path, f"Scaler not found. Run: python train_v2.py --symbol {symbol}")

    cfg = torch.load(config_path, map_location="cpu") if _exists(config_path) else {}

    model = StockTransformerV2(
        input_dim=cfg.get("input_dim", len(FEATURE_COLS)),
        d_model=cfg.get("d_model", 128),
        n_heads=cfg.get("n_heads", 8),
        n_layers=cfg.get("n_layers", 4),
        dropout=0.0,   # Dropout must be OFF at inference time
    )
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    scaler = joblib.load(scaler_path)
    window = cfg.get("window", settings.WINDOW)

    # ── Step 2: Fetch latest candles ──────────────────────────────────────────
    print(f"[infer] Fetching latest {candles} daily candles for {symbol}...", file=sys.stderr)
    df_raw = fetch_historical_data(
        symbol=symbol,
        unit="days",
        interval="1",
        use_cache=True,
        force_refresh=False,
    ).tail(candles)

    # ── Step 3: Feature engineering ───────────────────────────────────────────
    df = add_features_v2(df_raw)

    if len(df) < window:
        raise ValueError(
            f"After feature engineering, only {len(df)} rows remain — need {window}. "
            f"Try --candles 300"
        )

    # ── Step 4: Build input tensor ────────────────────────────────────────────
    # Take EXACTLY the last `window` rows, in the SAME column order as training
    df_window = df.tail(window)[FEATURE_COLS]

    # Apply SAME scaler that was used during training (critical for correct predictions)
    X_scaled = scaler.transform(df_window.values)
    X = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)   # shape: (1, 60, n_features)

    # ── Step 5: Run model ─────────────────────────────────────────────────────
    with torch.no_grad():
        dir_logits, ret_pred = model(X)

        # Convert raw logits to probabilities
        probs = F.softmax(dir_logits, dim=1)

        confidence      = probs.max().item()          # How sure is the model?
        direction       = probs.argmax().item()       # 0 = DOWN, 1 = UP
        expected_return = ret_pred.item()             # Predicted % move

    # ── Step 6: Translate model outputs → trading signal ──────────────────────
    signal, strength = generate_signal_v2(direction, confidence, expected_return)

    direction_label = "UP" if direction == 1 else "DOWN"
    sign = "+" if expected_return >= 0 else ""

    action_text = (
        f"{signal} {symbol} — {strength} "
        f"(direction: {direction_label}, confidence: {confidence:.1%}, "
        f"expected move: {sign}{expected_return:.2%})"
    )

    return {
        "symbol":          symbol,
        "signal":          signal,
        "strength":        strength,
        "direction":       direction,
        "direction_label": direction_label,
        "confidence":      round(confidence, 4),
        "expected_return": round(expected_return, 6),
        "action":          action_text,
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _exists(path: str) -> bool:
    import os
    return os.path.exists(path)

def _require_file(path: str, msg: str):
    if not _exists(path):
        raise FileNotFoundError(f"{path}: {msg}")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run daily inference for a stock symbol")
    parser.add_argument("--symbol",  required=True,  help="NSE symbol e.g. RELIANCE")
    parser.add_argument("--candles", type=int, default=200,
                        help="Candles to fetch (default 200; use 300 if you get too-few-rows error)")
    parser.add_argument("--model",   default=None, help="Override model path")
    parser.add_argument("--scaler",  default=None, help="Override scaler path")
    parser.add_argument("--output",  default="human", choices=["human", "json"],
                        help="'json' for n8n / automation, 'human' for terminal")
    args = parser.parse_args()

    try:
        validate()   # Checks UPSTOX_ACCESS_TOKEN is set in .env

        result = run_inference(
            symbol=args.symbol,
            model_path=args.model,
            scaler_path=args.scaler,
            candles=args.candles,
        )

        if args.output == "json":
            print(json.dumps(result))
        else:
            print()
            print("=" * 60)
            print(f"  DAILY SIGNAL — {result['symbol']}")
            print("=" * 60)
            print(f"  Signal:          {result['signal']}  ({result['strength']})")
            print(f"  Direction:       {result['direction_label']}")
            print(f"  Confidence:      {result['confidence']:.1%}")
            print(f"  Expected Return: {result['expected_return']:+.2%}")
            print()
            print(f"  {result['action']}")
            print("=" * 60)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
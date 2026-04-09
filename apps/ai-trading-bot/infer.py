"""
infer.py — Daily inference script for n8n / automation.

Run every day after market close (3:45 PM IST):
    python infer.py --symbol RELIANCE --output json
"""

import argparse
import json
import os
import sys

# ── Fix imports ───────────────────────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# ─────────────────────────────────────────────────────────────────────────────

import joblib
import torch
import torch.nn.functional as F

from config import settings, validate
from data_fetch_upstox import fetch_historical_data
from features_v2 import add_features_v2, FEATURE_COLS
from model_v2 import StockTransformerV2
from utils.trading_v2 import generate_signal_v2    # works — sys.path set above


def run_inference(
    symbol: str,
    model_path: str = None,
    config_path: str = None,
    scaler_path: str = None,
    candles: int = 200,
) -> dict:
    model_path  = model_path  or settings.MODEL_PATH
    config_path = config_path or settings.CONFIG_PATH
    scaler_path = scaler_path or settings.SCALER_PATH

    _require_file(model_path,  f"Run: python train_v2.py --symbol {symbol}")
    _require_file(scaler_path, f"Run: python train_v2.py --symbol {symbol}")

    cfg = torch.load(config_path, map_location="cpu") if _exists(config_path) else {}

    model = StockTransformerV2(
        input_dim=cfg.get("input_dim", len(FEATURE_COLS)),
        d_model=cfg.get("d_model", 128),
        n_heads=cfg.get("n_heads", 8),
        n_layers=cfg.get("n_layers", 4),
        dropout=0.0,
    )
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    scaler = joblib.load(scaler_path)
    window = cfg.get("window", settings.WINDOW)

    print(f"[infer] Fetching {candles} candles for {symbol}...", file=sys.stderr)
    df_raw = fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        use_cache=True, force_refresh=False,
    ).tail(candles)

    df = add_features_v2(df_raw)
    if len(df) < window:
        raise ValueError(f"Only {len(df)} rows after features — need {window}. Try --candles 300")

    df_window = df.tail(window)[FEATURE_COLS]
    X_scaled  = scaler.transform(df_window.values)
    X = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        dir_logits, ret_pred = model(X)
        probs           = F.softmax(dir_logits, dim=1)
        confidence      = probs.max().item()
        direction       = probs.argmax().item()
        expected_return = ret_pred.item()

    signal, strength = generate_signal_v2(direction, confidence, expected_return)

    direction_label = "UP" if direction == 1 else "DOWN"
    sign = "+" if expected_return >= 0 else ""

    return {
        "symbol":          symbol,
        "signal":          signal,
        "strength":        strength,
        "direction":       direction,
        "direction_label": direction_label,
        "confidence":      round(confidence, 4),
        "expected_return": round(expected_return, 6),
        "action": (
            f"{signal} {symbol} — {strength} "
            f"(direction: {direction_label}, confidence: {confidence:.1%}, "
            f"expected move: {sign}{expected_return:.2%})"
        ),
    }


def _exists(path):
    return os.path.exists(path)

def _require_file(path, msg):
    if not _exists(path):
        raise FileNotFoundError(f"{path} not found. {msg}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol",  required=True)
    parser.add_argument("--candles", type=int, default=200)
    parser.add_argument("--model",   default=None)
    parser.add_argument("--scaler",  default=None)
    parser.add_argument("--output",  default="human", choices=["human", "json"])
    args = parser.parse_args()

    try:
        validate()
        result = run_inference(symbol=args.symbol, model_path=args.model,
                               scaler_path=args.scaler, candles=args.candles)

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
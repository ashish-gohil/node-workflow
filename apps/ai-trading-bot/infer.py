"""
infer.py — Daily inference for StockPredictor V4
==================================================
Run after market close (3:45 PM IST):
    python infer.py --symbol RELIANCE
    python infer.py --symbol RELIANCE --output json   (for n8n)
"""
import argparse, json, os, sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import joblib, torch

from config import settings, validate
from data_fetch_upstox import fetch_historical_data
from features_v2 import FEATURE_COLS, add_features_v2
from model_v2 import StockPredictor
from utils.trading_v2 import generate_signal_v2, pred_to_confidence


def run_inference(
    symbol:      str,
    model_path:  str = None,
    config_path: str = None,
    scaler_path: str = None,
    candles:     int = 300,
) -> dict:
    model_path  = model_path  or settings.MODEL_PATH
    config_path = config_path or settings.CONFIG_PATH
    scaler_path = scaler_path or settings.SCALER_PATH

    for path, label in [(model_path, "Model"), (scaler_path, "Scaler")]:
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"{label} not found: {path}\n"
                f"Run: python train_v2.py --symbol {symbol}"
            )

    # Load config and model
    cfg = torch.load(config_path, map_location="cpu") if os.path.exists(config_path) else {
        "input_dim": len(FEATURE_COLS), "window": 30, "d_model": 64,
        "n_layers": 2, "n_heads": 4, "d_ff": 128, "dropout": 0.0, "horizon": 3,
    }

    model = StockPredictor(**cfg)
    model.load_state_dict(torch.load(model_path, map_location="cpu"), strict=False)
    model.eval()

    scaler = joblib.load(scaler_path)
    window = cfg.get("window", 30)

    print(f"[infer] Fetching {candles} candles for {symbol}...", file=sys.stderr)
    df_raw = fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        use_cache=True, force_refresh=False,
    ).tail(candles)

    df = add_features_v2(df_raw)
    if len(df) < window:
        raise ValueError(
            f"Only {len(df)} rows after features — need {window}. Try --candles 400"
        )

    X_scaled = scaler.transform(df.tail(window)[FEATURE_COLS].values)
    X = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        pred_raw = model(X).squeeze(-1).item()

    direction  = 1 if pred_raw > 0 else 0
    confidence = pred_to_confidence(pred_raw)
    signal, strength = generate_signal_v2(direction, confidence, pred_raw)

    dl   = "UP" if direction == 1 else "DOWN"
    sign = "+" if pred_raw >= 0 else ""
    horizon = cfg.get("horizon", 3)

    return {
        "symbol":            symbol,
        "signal":            signal,
        "strength":          strength,
        "direction":         direction,
        "direction_label":   dl,
        "confidence":        round(confidence, 4),
        "predicted_return":  round(pred_raw, 6),
        "horizon_days":      horizon,
        "action": (
            f"{signal} {symbol} — {strength} "
            f"(direction: {dl}, conf: {confidence:.1%}, "
            f"predicted {horizon}d return: {sign}{pred_raw:.2%})"
        ),
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--symbol",  required=True)
    p.add_argument("--candles", type=int, default=300)
    p.add_argument("--model",   default=None)
    p.add_argument("--scaler",  default=None)
    p.add_argument("--output",  default="human", choices=["human", "json"])
    args = p.parse_args()

    try:
        validate()
        r = run_inference(args.symbol, args.model, None, args.scaler, args.candles)
        if args.output == "json":
            print(json.dumps(r))
        else:
            print()
            print("=" * 62)
            print(f"  SIGNAL — {r['symbol']}  (horizon: {r['horizon_days']}d)")
            print("=" * 62)
            print(f"  Signal:           {r['signal']}  ({r['strength']})")
            print(f"  Direction:        {r['direction_label']}")
            print(f"  Confidence:       {r['confidence']:.1%}")
            print(f"  Predicted return: {r['predicted_return']:+.2%}")
            print()
            print(f"  {r['action']}")
            print("=" * 62)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
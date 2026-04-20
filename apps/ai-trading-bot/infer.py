"""
infer.py — Daily Inference for StockForecastNet V5
====================================================
Run after market close (3:45 PM IST):
    python infer.py --symbol RELIANCE
    python infer.py --symbol RELIANCE --output json
"""
import argparse, json, math, os, sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import joblib, numpy as np, torch

from config import settings, validate
from data_fetch_upstox import fetch_historical_data
from dataset_v2 import extract_time_features
from features_v2 import FEATURE_COLS, add_features_v2
from model_v2 import StockForecastNet
from utils.trading_v2 import generate_signal_v2, pred_to_confidence


def run_inference(symbol, model_path=None, config_path=None,
                  scaler_path=None, candles=300):
    model_path  = model_path  or settings.MODEL_PATH
    config_path = config_path or settings.CONFIG_PATH
    scaler_path = scaler_path or settings.SCALER_PATH

    for p, l in [(model_path, "Model"), (scaler_path, "Scaler")]:
        if not os.path.exists(p):
            raise FileNotFoundError(
                f"{l} not found: {p}\n"
                f"Run: python train_v2.py --symbol {symbol}"
            )

    cfg = (torch.load(config_path, map_location="cpu")
           if os.path.exists(config_path) else {
               "n_features": len(FEATURE_COLS), "seq_len": 90, "horizon": 3,
               "patch_size": 16, "stride": 8, "d_model": 128,
               "n_heads": 4, "n_layers": 2, "d_ff": 256, "dropout": 0.0,
           })

    model = StockForecastNet(**cfg)
    model.load_state_dict(torch.load(model_path, map_location="cpu"), strict=False)
    model.eval()

    scaler = joblib.load(scaler_path)
    window = cfg.get("seq_len", 90)
    horizon = cfg.get("horizon", 3)

    print(f"[infer] Fetching {candles} candles for {symbol}...", file=sys.stderr)
    df_raw = fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        use_cache=True, force_refresh=False,
    ).tail(candles)

    df = add_features_v2(df_raw)
    if len(df) < window:
        raise ValueError(f"Only {len(df)} rows — need {window}. Try --candles 400")

    # Scale features
    X_scaled = scaler.transform(df.tail(window)[FEATURE_COLS].values)
    X = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

    # Time features for the last `window` rows
    n_total = len(df)
    start_idx = n_total - window
    tf = extract_time_features(df, window_start=start_idx, window_len=window)
    tf_tensor = torch.tensor(tf, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        preds = model(X, tf_tensor)   # (1, horizon)

    pred_raw  = preds[0, -1].item()   # primary signal = furthest horizon
    direction  = 1 if pred_raw > 0 else 0
    confidence = pred_to_confidence(pred_raw)
    signal, strength = generate_signal_v2(direction, confidence, pred_raw)

    dl   = "UP" if direction == 1 else "DOWN"
    sign = "+" if pred_raw >= 0 else ""
    all_steps = [round(float(preds[0, h]), 6) for h in range(horizon)]

    return {
        "symbol":          symbol,
        "signal":          signal,
        "strength":        strength,
        "direction":       direction,
        "direction_label": dl,
        "confidence":      round(confidence, 4),
        "predicted_return": round(pred_raw, 6),
        "horizon_days":    horizon,
        "all_horizon_steps": all_steps,   # V5: predictions for each step
        "step_agreement": all(s > 0 for s in all_steps) or all(s < 0 for s in all_steps),
        "action": (
            f"{signal} {symbol} — {strength} "
            f"(direction: {dl}, conf: {confidence:.1%}, "
            f"predicted {horizon}d return: {sign}{pred_raw:.2%})"
        ),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol",  required=True)
    parser.add_argument("--candles", type=int, default=300)
    parser.add_argument("--output",  default="human", choices=["human", "json"])
    args = parser.parse_args()

    try:
        validate()
        r = run_inference(args.symbol, candles=args.candles)
        if args.output == "json":
            print(json.dumps(r))
        else:
            print()
            print("=" * 62)
            print(f"  DAILY SIGNAL — {r['symbol']}  (V5 iTransformer)")
            print("=" * 62)
            print(f"  Signal:            {r['signal']}  ({r['strength']})")
            print(f"  Direction:         {r['direction_label']}")
            print(f"  Confidence:        {r['confidence']:.1%}")
            print(f"  Primary ({r['horizon_days']}-day):  {r['predicted_return']:+.2%}")
            print(f"  All horizon steps: {[f'{s:+.2%}' for s in r['all_horizon_steps']]}")
            agree = "✓ All steps agree" if r["step_agreement"] else "~ Steps disagree (lower confidence)"
            print(f"  Step agreement:    {agree}")
            print()
            print(f"  {r['action']}")
            print("=" * 62)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
"""
infer.py — Daily Inference for StockForecastNet V6
====================================================

V6 changes:
  - Forward returns (logit, mag_norm, revin_stats) — no denorm in forward
  - Direction from sigmoid(logit), not sign(pred_return)
  - Optional LightGBM ensemble for IT sector
  - Feature attention weights exported for debugging

Usage:
  python infer.py --symbol TCS
  python infer.py --symbol TCS --output json
  python infer.py --symbol TCS --use_ensemble   # LightGBM + Transformer
"""

import argparse, json, math, os, sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path: sys.path.insert(0, _ROOT)

import joblib, numpy as np, torch

from config import settings, validate
from data_fetch_upstox import fetch_historical_data
from dataset_v5 import extract_time_features
from features_v2 import FEATURE_COLS, add_features_v2
from model_v6 import StockForecastNet
from utils.trading_v2 import generate_signal_v2


def run_inference(symbol, model_path=None, config_path=None, scaler_path=None,
                  candles=300, use_ensemble=False, lgbm_path="lgbm_it_model.pkl"):

    model_path  = model_path  or settings.MODEL_PATH
    config_path = config_path or settings.CONFIG_PATH
    scaler_path = scaler_path or settings.SCALER_PATH

    for p, l in [(model_path, "Model"), (scaler_path, "Scaler")]:
        if not os.path.exists(p):
            raise FileNotFoundError(
                f"{l} not found: {p}\n"
                f"Train first: python train_v2.py --mode pretrain "
                f"--symbols TCS,INFY,WIPRO,HCLTECH,TECHM"
            )

    # Load config
    cfg = (torch.load(config_path, map_location="cpu")
           if os.path.exists(config_path) else {
               "n_features": len(FEATURE_COLS), "seq_len": 90, "horizon": 3,
               "patch_size": 16, "stride": 8, "d_model": 96,
               "n_heads": 4, "n_layers": 2, "d_ff": 192, "dropout": 0.0,
           })

    model = StockForecastNet(**cfg)
    model.load_state_dict(torch.load(model_path, map_location="cpu"), strict=False)
    model.eval()

    scaler = joblib.load(scaler_path)
    window  = cfg.get("seq_len",  90)
    horizon = cfg.get("horizon",  3)

    print(f"[infer] Fetching {candles} candles for {symbol}...", file=sys.stderr)
    df_raw = fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        use_cache=True, force_refresh=False,
    ).tail(candles)
    df = add_features_v2(df_raw)
    if len(df) < window:
        raise ValueError(f"Only {len(df)} rows after features — need {window}.")

    X_scaled = scaler.transform(df.tail(window)[FEATURE_COLS].values)
    X_t  = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)
    n    = len(df)
    tf   = extract_time_features(df, window_start=n-window, window_len=window)
    tf_t = torch.tensor(tf, dtype=torch.float32).unsqueeze(0)

    # V6 forward: returns (logit, mag_norm, revin_stats)
    with torch.no_grad():
        logit, mag_norm, revin_stats, attn_w = model.forward(
            X_t, tf_t, return_attn_weights=True)

    # Direction from logit probability
    p_up       = torch.sigmoid(logit[0]).item()
    direction  = 1 if p_up >= 0.5 else 0
    confidence = p_up if direction == 1 else (1.0 - p_up)

    # Denorm magnitude only for human-readable output
    mag_denorm = model.revin.denormalize(mag_norm[0], revin_stats)
    pred_return = mag_denorm[-1].item()
    all_steps   = mag_denorm.tolist()
    agree = all(s > 0 for s in all_steps) or all(s < 0 for s in all_steps)

    # Feature attention top-5
    attn = attn_w[0].tolist()
    top5_idx = sorted(range(len(attn)), key=lambda i: attn[i], reverse=True)[:5]
    top5 = {FEATURE_COLS[i]: round(attn[i], 4) for i in top5_idx}

    signal, strength = generate_signal_v2(direction, confidence, pred_return)

    result = {
        "symbol":            symbol,
        "signal":            signal,
        "strength":          strength,
        "direction":         direction,
        "direction_label":   "UP" if direction == 1 else "DOWN",
        "p_up":              round(p_up, 4),
        "confidence":        round(confidence, 4),
        "predicted_return":  round(pred_return, 6),
        "horizon_days":      horizon,
        "all_horizon_steps": [round(s, 6) for s in all_steps],
        "step_agreement":    agree,
        "top5_features":     top5,
        "model_version":     "V6",
    }

    # Optional: LightGBM ensemble
    if use_ensemble and os.path.exists(lgbm_path):
        try:
            from lgbm_model import LGBMDirectionModel, ensemble_predict
            lgbm = LGBMDirectionModel.load(lgbm_path)
            ens = ensemble_predict(lgbm, model, df, scaler, seq_len=window)
            result["ensemble"] = ens
            # Override signal with ensemble
            direction  = ens["direction"]
            confidence = ens["confidence"]
            signal, strength = generate_signal_v2(direction, confidence, pred_return)
            result["signal"]    = signal
            result["strength"]  = strength
            result["direction"] = direction
            result["confidence"] = confidence
            result["source"]    = "ensemble"
        except Exception as e:
            result["ensemble_error"] = str(e)

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol",       required=True)
    parser.add_argument("--candles",      type=int, default=300)
    parser.add_argument("--output",       default="human", choices=["human","json"])
    parser.add_argument("--use_ensemble", action="store_true")
    parser.add_argument("--lgbm_path",    default="lgbm_it_model.pkl")
    args = parser.parse_args()

    try:
        validate()
        r = run_inference(args.symbol, candles=args.candles,
                          use_ensemble=args.use_ensemble,
                          lgbm_path=args.lgbm_path)
        if args.output == "json":
            print(json.dumps(r))
        else:
            sep = "=" * 62
            print(f"\n{sep}")
            print(f"  SIGNAL — {r['symbol']}  (StockForecastNet {r['model_version']})")
            print(sep)
            print(f"  Signal:        {r['signal']}  ({r['strength']})")
            print(f"  Direction:     {r['direction_label']}  (p_up={r['p_up']:.1%})")
            print(f"  Confidence:    {r['confidence']:.1%}")
            print(f"  Primary {r['horizon_days']}d:   {r['predicted_return']:+.2%}")
            print(f"  All steps:     {[f'{s:+.2%}' for s in r['all_horizon_steps']]}")
            print(f"  Agreement:     {'✓ All agree' if r['step_agreement'] else '~ Diverge'}")
            print(f"\n  Top features (attention):")
            for feat, wt in r["top5_features"].items():
                print(f"    {feat:<30} {wt:.4f}")
            if "ensemble" in r:
                e = r["ensemble"]
                print(f"\n  Ensemble: lgbm={e['p_up_lgbm']:.1%} "
                      f"trans={e['p_up_transformer']:.1%} "
                      f"combined={e['p_up_ensemble']:.1%}")
            print(sep)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
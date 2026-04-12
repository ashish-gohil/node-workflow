"""
backtest_v2.py — Backtesting pipeline for StockPredictor V4
=============================================================

ZERO-TRADE BUG FIX
───────────────────
The old backtest called:
    logits, ret_p = model(x)            # expected TWO outputs (V3 dual-head)
    probs  = F.softmax(logits, dim=1)
    conf   = probs.max()                # 0-1 from softmax

With V4 single-head model:
    pred = model(x)                     # ONE output: signed return scalar

The old code would crash or produce garbage confidence values
(softmax on a 1-dim tensor returns 1.0 always → everything above
CONFIDENCE_FLOOR → infinite trades or type errors).

V4 FIX:
    pred      = model(x).squeeze(-1).item()          # signed return
    direction = 1 if pred > 0 else 0                 # derived
    confidence = pred_to_confidence(pred)             # sigmoid of magnitude
    signal, strength = generate_signal_v2(direction, confidence, pred)

USAGE
──────
  python backtest_v2.py --data data/RELIANCE/RELIANCE_daily_2010-01-01_2026-04-09.parquet

  # With custom confidence threshold (more trades):
  python backtest_v2.py --data data/RELIANCE/... --confidence 0.55

  # GPU inference:
  python backtest_v2.py --data data/RELIANCE/... --device cuda
"""

import argparse
import os
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import joblib
import numpy as np
import torch

from dataset_v2 import StockDatasetV2
from features_v2 import add_features_v2, FEATURE_COLS
from model_v4 import StockPredictor
from utils.trading_v2 import (
    CONFIDENCE_FLOOR, generate_signal_v2, pred_to_confidence
)


def backtest_v2(
    model:          StockPredictor,
    dataset:        StockDatasetV2,
    min_confidence: float = CONFIDENCE_FLOOR,
    device:         str   = "cpu",
) -> dict:
    """
    Walk-forward backtest: run V4 model on every sample in dataset,
    apply signal logic, and track capital changes.

    The model returns a single signed return prediction.
    Direction and confidence are derived from that prediction.

    Args:
        model:           Trained StockPredictor V4
        dataset:         StockDatasetV2 (returns X, y_ret — two values)
        min_confidence:  Skip trades below this confidence threshold
        device:          "cpu", "cuda", or "mps"

    Returns:
        dict with performance metrics
    """
    dev = torch.device(device)
    model.eval()
    model.to(dev)

    capital       = 100_000.0
    capital_curve = [capital]
    trade_rets    = []

    total = wins = 0
    st_t  = st_w = 0   # STRONG
    md_t  = md_w = 0   # MEDIUM
    held = 0
    streak = best_streak = worst_streak = 0

    for i in range(len(dataset)):
        x, y_ret_t = dataset[i]          # V4: unpack TWO values (not three)
        actual_ret  = y_ret_t.item()

        with torch.no_grad():
            pred_raw = model(x.unsqueeze(0).to(dev)).squeeze(-1).item()

        # V4 inference: derive direction and confidence from single scalar
        direction  = 1 if pred_raw > 0 else 0
        confidence = pred_to_confidence(pred_raw)

        if confidence < min_confidence:
            held += 1
            capital_curve.append(capital)
            continue

        signal, strength = generate_signal_v2(direction, confidence, pred_raw)

        if signal == "HOLD":
            held += 1
            capital_curve.append(capital)
            continue

        total += 1
        is_win = (
            (signal == "BUY"  and actual_ret > 0) or
            (signal == "SELL" and actual_ret < 0)
        )

        if is_win:
            wins   += 1
            streak  = max(streak + 1, 1)
            best_streak = max(best_streak, streak)
        else:
            streak  = min(streak - 1, -1)
            worst_streak = min(worst_streak, streak)

        if strength == "STRONG":
            st_t += 1
            if is_win: st_w += 1
        elif strength == "MEDIUM":
            md_t += 1
            if is_win: md_w += 1

        pnl     = capital * actual_ret if signal == "BUY" else capital * (-actual_ret)
        capital += pnl
        trade_rets.append(pnl / max(capital - pnl, 1e-9))
        capital_curve.append(capital)

    acc   = wins / total if total > 0 else 0.0
    sharpe = _sharpe(trade_rets)
    maxdd  = _maxdd(capital_curve)

    r = {
        "final_capital":     round(capital, 2),
        "total_return_pct":  round((capital / 100_000 - 1) * 100, 2),
        "total_trades":      total,
        "held":              held,
        "trade_rate_pct":    round(total / max(total + held, 1) * 100, 1),
        "accuracy":          round(acc, 4),
        "sharpe_ratio":      round(sharpe, 3),
        "max_drawdown_pct":  round(maxdd * 100, 2),
        "best_win_streak":   best_streak,
        "worst_loss_streak": abs(worst_streak),
        "strong_trades":     st_t,
        "strong_accuracy":   round(st_w / st_t, 4) if st_t else 0.0,
        "medium_trades":     md_t,
        "medium_accuracy":   round(md_w / md_t, 4) if md_t else 0.0,
        "capital_curve":     capital_curve,
    }
    _print_results(r)
    return r


def _sharpe(rets: list) -> float:
    if len(rets) < 2: return 0.0
    a = np.array(rets, dtype=np.float64)
    s = a.std()
    return float(np.sqrt(252) * a.mean() / s) if s > 1e-9 else 0.0


def _maxdd(curve: list) -> float:
    arr = np.array(curve, dtype=np.float64)
    peak = arr[0]; dd = 0.0
    for v in arr:
        if v > peak: peak = v
        dd = max(dd, (peak - v) / max(peak, 1e-9))
    return dd


def _print_results(r: dict):
    sep = "=" * 55
    print(f"\n{sep}\n  BACKTEST RESULTS\n{sep}")
    print(f"  Final Capital:      ₹{r['final_capital']:>12,.2f}  ({r['total_return_pct']:+.2f}%)")
    print(f"  Total Trades:       {r['total_trades']:>6}  "
          f"(held {r['held']}, traded {r['trade_rate_pct']:.1f}% of days)")
    print(f"  Direction Accuracy: {r['accuracy']:>6.2%}")
    print(f"  Sharpe Ratio:       {r['sharpe_ratio']:>6.3f}  (>1.5 = good)")
    print(f"  Max Drawdown:       {r['max_drawdown_pct']:>6.2f}%")
    print(f"  Win/Loss Streak:    +{r['best_win_streak']} / -{r['worst_loss_streak']}")
    if r["strong_trades"]:
        print(f"  STRONG:             {r['strong_trades']:>6}  acc={r['strong_accuracy']:.2%}")
    if r["medium_trades"]:
        print(f"  MEDIUM:             {r['medium_trades']:>6}  acc={r['medium_accuracy']:.2%}")
    if r["total_trades"] == 0:
        print()
        print("  NOTE: 0 trades generated.")
        print("  This usually means model predictions are all near zero.")
        print("  Solutions:")
        print("    1. Retrain with V4 architecture (train_v2.py)")
        print("    2. Lower --confidence threshold (try 0.50)")
        print("    3. Check that model config matches: --config model_v2_config.pth")
    print(f"{sep}\n")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backtest StockPredictor V4")
    parser.add_argument("--data",       required=True,
                        help=".parquet or .csv file with OHLCV data")
    parser.add_argument("--model",      default="model_v2.pth")
    parser.add_argument("--config",     default="model_v2_config.pth")
    parser.add_argument("--scaler",     default="scaler_v2.pkl")
    parser.add_argument("--confidence", type=float, default=CONFIDENCE_FLOOR)
    parser.add_argument("--device",     default="cpu",
                        choices=["cpu", "cuda", "mps"])
    parser.add_argument("--horizon",    type=int, default=3)
    parser.add_argument("--window",     type=int, default=30)
    args = parser.parse_args()

    import pandas as pd

    # Load data
    print(f"Loading: {args.data}")
    df_raw = pd.read_parquet(args.data) if args.data.endswith(".parquet") \
             else pd.read_csv(args.data)
    df = add_features_v2(df_raw)

    # Load scaler + dataset
    scaler  = joblib.load(args.scaler)
    dataset = StockDatasetV2(df, window=args.window, horizon=args.horizon,
                              scaler=scaler)
    dataset.summary()

    # Load model via get_config() pattern (fixes state_dict mismatch)
    if os.path.exists(args.config):
        cfg = torch.load(args.config, map_location="cpu")
        print(f"  Config: {cfg}")
    else:
        print(f"  [WARNING] Config not found: {args.config}")
        print("  Using defaults — retrain to fix any mismatch.")
        cfg = {
            "input_dim": len(FEATURE_COLS), "window": args.window,
            "d_model": 64, "n_layers": 2, "n_heads": 4,
            "d_ff": 128, "dropout": 0.0, "horizon": args.horizon,
        }

    if cfg.get("input_dim") != dataset.n_features:
        print(f"  [WARNING] Config input_dim={cfg.get('input_dim')} but "
              f"dataset has {dataset.n_features} features. Updating.")
        cfg["input_dim"] = dataset.n_features

    model = StockPredictor(**cfg)
    state = torch.load(args.model, map_location="cpu")
    missing, unexpected = model.load_state_dict(state, strict=False)
    if missing:
        print(f"  {len(missing)} missing keys → zero-initialised")
    if unexpected:
        print(f"  {len(unexpected)} unexpected keys → ignored")

    print(f"  {model}")

    backtest_v2(model, dataset,
                min_confidence=args.confidence,
                device=args.device)
"""
backtest_v2.py — Backtesting pipeline for StockTransformerV2.

Improvements over original:
- Added Sharpe ratio, max drawdown, win streak tracking
- Tracks trades by strength tier (STRONG / MEDIUM)
- Reports trade frequency (what % of days the model actually trades)
- Capital curve stored for downstream plotting
- Bug fix: original passed `dataset.y_ret[i]` but StockDatasetV2 returns tensors
  via __getitem__, not direct attribute access — both now work correctly
- Takes scaler_path arg to properly scale inputs (was missing in original)
"""

import argparse

import joblib
import numpy as np
import torch
import torch.nn.functional as F

from dataset_v2 import StockDatasetV2
from features_v2 import add_features_v2
from model_v2 import StockTransformerV2
from utils.trading_v2 import generate_signal_v2, CONFIDENCE_FLOOR


def backtest_v2(
    model: StockTransformerV2,
    dataset: StockDatasetV2,
    min_confidence: float = CONFIDENCE_FLOOR,
    device: str = "cpu",
) -> dict:
    """
    Run a full backtest on a dataset.

    Returns:
        dict with all performance metrics + capital_curve list
    """
    model.eval()
    model.to(device)

    capital = 100_000.0
    capital_curve = [capital]
    trade_returns = []

    total = wins = 0
    strong_total = strong_wins = 0
    medium_total = medium_wins = 0
    held_count = 0

    current_streak = best_streak = worst_streak = 0

    for i in range(len(dataset)):
        x, _, y_ret_tensor = dataset[i]
        x = x.unsqueeze(0).to(device)
        actual_ret = y_ret_tensor.item()

        with torch.no_grad():
            dir_logits, ret_pred = model(x)
            probs = F.softmax(dir_logits, dim=1)
            confidence = probs.max().item()
            direction = probs.argmax().item()
            expected_return = ret_pred.item()

        if confidence < min_confidence:
            held_count += 1
            capital_curve.append(capital)
            continue

        signal, strength = generate_signal_v2(direction, confidence, expected_return)

        if signal == "HOLD":
            held_count += 1
            capital_curve.append(capital)
            continue

        total += 1
        is_win = (signal == "BUY" and actual_ret > 0) or (signal == "SELL" and actual_ret < 0)

        if is_win:
            wins += 1
            current_streak = max(current_streak + 1, 1)
            best_streak = max(best_streak, current_streak)
        else:
            current_streak = min(current_streak - 1, -1)
            worst_streak = min(worst_streak, current_streak)

        # Track by tier
        if strength == "STRONG":
            strong_total += 1
            if is_win:
                strong_wins += 1
        elif strength == "MEDIUM":
            medium_total += 1
            if is_win:
                medium_wins += 1

        # Capital update
        pnl = capital * actual_ret if signal == "BUY" else capital * (-actual_ret)
        capital += pnl
        trade_returns.append(pnl / (capital - pnl))  # % return on capital
        capital_curve.append(capital)

    # ── Metrics ───────────────────────────────────────────────────────────────
    accuracy = wins / total if total > 0 else 0.0

    sharpe = _sharpe(trade_returns)
    max_dd = _max_drawdown(capital_curve)

    results = {
        "final_capital":        round(capital, 2),
        "total_return_pct":     round((capital / 100_000 - 1) * 100, 2),
        "total_trades":         total,
        "held":                 held_count,
        "trade_rate_pct":       round(total / (total + held_count) * 100, 1) if (total + held_count) > 0 else 0,
        "accuracy":             round(accuracy, 4),
        "sharpe_ratio":         round(sharpe, 3),
        "max_drawdown_pct":     round(max_dd * 100, 2),
        "best_win_streak":      best_streak,
        "worst_loss_streak":    abs(worst_streak),
        "strong_trades":        strong_total,
        "strong_accuracy":      round(strong_wins / strong_total, 4) if strong_total > 0 else 0,
        "medium_trades":        medium_total,
        "medium_accuracy":      round(medium_wins / medium_total, 4) if medium_total > 0 else 0,
        "capital_curve":        capital_curve,
    }

    _print_results(results)
    return results


def _sharpe(returns: list, risk_free: float = 0.0) -> float:
    if len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    excess = arr - risk_free / 252
    return float(np.sqrt(252) * excess.mean() / (excess.std() + 1e-9))


def _max_drawdown(curve: list) -> float:
    arr = np.array(curve)
    peak = arr[0]
    max_dd = 0.0
    for v in arr:
        if v > peak:
            peak = v
        dd = (peak - v) / peak
        max_dd = max(max_dd, dd)
    return max_dd


def _print_results(r: dict):
    print("\n" + "=" * 50)
    print("BACKTEST V2 RESULTS")
    print("=" * 50)
    print(f"  Final Capital:       ₹{r['final_capital']:,.2f}  ({r['total_return_pct']:+.2f}%)")
    print(f"  Total Trades:        {r['total_trades']}  (held {r['held']}, trade rate {r['trade_rate_pct']}%)")
    print(f"  Overall Accuracy:    {r['accuracy']:.2%}")
    print(f"  Sharpe Ratio:        {r['sharpe_ratio']:.3f}")
    print(f"  Max Drawdown:        {r['max_drawdown_pct']:.2f}%")
    print(f"  Win/Loss Streak:     +{r['best_win_streak']} / -{r['worst_loss_streak']}")
    if r['strong_trades']:
        print(f"  STRONG trades:       {r['strong_trades']}  acc={r['strong_accuracy']:.2%}")
    if r['medium_trades']:
        print(f"  MEDIUM trades:       {r['medium_trades']}  acc={r['medium_accuracy']:.2%}")
    print("=" * 50)


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data",       required=True, help="Path to processed CSV / parquet")
    parser.add_argument("--model",      default="model_v2.pth")
    parser.add_argument("--config",     default="model_v2_config.pth")
    parser.add_argument("--scaler",     default="scaler_v2.pkl")
    parser.add_argument("--confidence", type=float, default=CONFIDENCE_FLOOR)
    args = parser.parse_args()

    import pandas as pd
    df = pd.read_parquet(args.data) if args.data.endswith(".parquet") else pd.read_csv(args.data)
    df = add_features_v2(df)

    scaler = joblib.load(args.scaler)
    dataset = StockDatasetV2(df, scaler=scaler)

    cfg = torch.load(args.config, map_location="cpu") if args.config else {}
    model = StockTransformerV2(
        input_dim=dataset.n_features,
        d_model=cfg.get("d_model", 128),
        n_heads=cfg.get("n_heads", 8),
        n_layers=cfg.get("n_layers", 4),
    )
    model.load_state_dict(torch.load(args.model, map_location="cpu"))

    backtest_v2(model, dataset, min_confidence=args.confidence)
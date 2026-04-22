"""
backtest_v2.py — Portfolio-Based Backtesting for StockForecastNet V5
====================================================================

TRADING RULES IMPLEMENTED
───────────────────────────
Rule 1 — Current Holdings:
    Portfolio tracks actual SHARE QUANTITIES, not abstract ₹ amounts.
    Every day, all held shares are marked to market at the previous day's
    closing price, and unrealised P&L is included in total portfolio value.

Rule 2 — Buy Condition:
    A BUY signal allocates position_size_pct × available_cash.
    If available cash < min_trade_value, the buy is SKIPPED (insufficient funds).
    Shares bought = floor(allocated_cash / entry_price)
    Leftover cash (from rounding) stays in the cash account.

Rule 3 — Sell Condition:
    A SELL signal checks whether we currently hold shares of this stock.
    If shares_held == 0, the signal is IGNORED (cannot short what you don't own).
    If shares_held > 0, ALL held shares are sold at the current close price.
    (Short-selling is not modelled — this is a long-only portfolio.)

Rule 4 — P&L Calculation:
    Realised P&L:   profit/loss locked in from completed sell transactions.
    Unrealised P&L: value of currently held shares minus their purchase cost,
                    using the most recent available close price (prev day close).
    Total P&L       = Realised P&L + Unrealised P&L
    Total Value     = Cash + (shares_held × latest_close_price)

Rule 5 — Portfolio Integrity:
    shares_held is only modified by confirmed buy/sell executions.
    avg_cost_per_share is updated on each buy (weighted average cost).
    On sell, realised P&L = (sell_price - avg_cost) × shares_sold - costs.

WHY PREVIOUS APPROACHES WERE WRONG
────────────────────────────────────
Old approach: pnl = capital × actual_return
  This treats capital as a continuous % bet, not as real shares.
  It ignores the mechanics of buying N shares at price P and selling at P'.
  Share rounding (you can't buy 0.7 shares) and dividend treatment matter.
  More importantly, it allowed "SELL signals" even when nothing was held.

New approach: proper share ledger
  cash                   — INR available for new purchases
  shares_held            — integer number of shares currently owned
  avg_cost_per_share     — weighted average purchase cost
  Realised P&L           — accumulated on every sell
  Unrealised P&L         — computed fresh each day from latest price

USAGE
──────
  # Basic (no per-trade log)
  python backtest_v2.py --data data/RELIANCE/RELIANCE_daily_2010-01-01_2026-04-09.parquet

  # With per-trade logging
  python backtest_v2.py --data ... --log_trades

  # Save full trade log to CSV (open in Excel)
  python backtest_v2.py --data ... --log_trades --csv trades.csv

  # Adjust position size (default 20% of cash per buy signal)
  python backtest_v2.py --data ... --position_size 0.10

  # Lower confidence threshold (more signals)
  python backtest_v2.py --data ... --confidence 0.50
"""

import argparse
import csv
import os
import sys
from dataclasses import dataclass, field
from typing import List, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import joblib
import numpy as np
import torch

from dataset_v6 import StockDatasetV2
from features_v6 import add_features_v6, FEATURE_COLS
from model_v6 import StockForecastNet
StockPredictor = StockForecastNet
from utils.trading_v6 import (
    CONFIDENCE_FLOOR, generate_signal_v2, pred_to_confidence
)


# ─── Trading cost constants (NSE realistic) ───────────────────────────────────
BROKERAGE_PCT  = 0.001    # 0.10% per leg (Zerodha/Upstox flat fee approximation)
SLIPPAGE_PCT   = 0.0005   # 0.05% slippage per leg (market impact + bid-ask spread)
COST_PER_LEG   = BROKERAGE_PCT + SLIPPAGE_PCT   # 0.15% per leg
MIN_TRADE_VALUE = 1_000.0  # ₹1,000 minimum trade size (avoid micro lots)


# ─── Data structures ──────────────────────────────────────────────────────────

@dataclass
class Position:
    """
    Represents one open stock holding in the portfolio.

    shares:          Number of whole shares currently held.
    avg_cost:        Weighted average purchase price per share (includes entry costs).
    total_cost_basis: Total INR spent to acquire this position (for realised P&L calc).
    open_day_idx:    Dataset index when this position was opened.
    signal:          "BUY" (long) — short selling not modelled.
    pred_return:     What the model predicted at entry.
    confidence:      Model confidence at entry.
    strength:        "STRONG" or "MEDIUM".
    entry_price:     Actual close price at entry.
    """
    shares:           int
    avg_cost:         float
    total_cost_basis: float
    open_day_idx:     int
    signal:           str
    pred_return:      float
    confidence:       float
    strength:         str
    entry_price:      float


@dataclass
class ClosedTrade:
    """
    Complete record of one round-trip trade (buy → sell).
    Used for the final summary report and CSV export.
    """
    trade_num:       int
    open_day_idx:    int
    close_day_idx:   int
    signal:          str         # always "BUY" in long-only mode
    strength:        str
    pred_return:     float       # model prediction at entry
    confidence:      float
    entry_price:     float       # ₹ per share at buy
    exit_price:      float       # ₹ per share at sell
    shares:          int
    gross_pnl:       float       # (exit_price - entry_price) × shares
    costs:           float       # total brokerage + slippage (both legs)
    net_pnl:         float       # gross_pnl - costs
    is_win:          bool
    cash_before:     float       # portfolio cash before the sell executed
    cash_after:      float       # portfolio cash after the sell executed
    portfolio_value_after: float  # total portfolio value after close


@dataclass
class Portfolio:
    """
    Complete portfolio state.

    cash:              INR not invested in any position.
    position:          The currently open position (None if flat).
    closed_trades:     List of all completed round trips.
    realised_pnl:      Sum of all net_pnl from closed trades.
    best_streak:       Longest consecutive winning streak.
    worst_streak:      Longest consecutive losing streak.
    _current_streak:   Running streak counter (+ve=wins, -ve=losses).
    """
    initial_capital:  float
    cash:             float
    position:         Optional[Position] = None
    closed_trades:    List[ClosedTrade]  = field(default_factory=list)
    realised_pnl:     float = 0.0
    best_streak:      int   = 0
    worst_streak:     int   = 0
    _current_streak:  int   = 0

    @property
    def shares_held(self) -> int:
        return self.position.shares if self.position else 0

    def total_value(self, current_price: float) -> float:
        """
        Total portfolio value = cash + market value of any open position.

        Uses current_price (latest available close) to mark the position
        to market. This is the unrealised P&L calculation.
        """
        if self.position:
            return self.cash + self.position.shares * current_price
        return self.cash

    def unrealised_pnl(self, current_price: float) -> float:
        """
        Unrealised P&L on the open position at the current price.
        = (current_price - avg_cost) × shares  [before exit costs]
        """
        if not self.position:
            return 0.0
        return (current_price - self.position.avg_cost) * self.position.shares

    def update_streak(self, is_win: bool):
        if is_win:
            self._current_streak = max(self._current_streak + 1, 1)
            self.best_streak = max(self.best_streak, self._current_streak)
        else:
            self._current_streak = min(self._current_streak - 1, -1)
            self.worst_streak = min(self.worst_streak, self._current_streak)


# ─── Core execution functions ──────────────────────────────────────────────────

def _execute_buy(
    portfolio:         Portfolio,
    day_idx:           int,
    entry_price:       float,
    pred_return:       float,
    confidence:        float,
    strength:          str,
    position_size_pct: float,
    log_trades:        bool,
    day_label:         str,
) -> bool:
    """
    Attempt to open a long position.

    Rule 2 — Buy Condition:
        Only executes if:
          (a) No position currently held (one position at a time)
          (b) Available cash >= MIN_TRADE_VALUE after deducting costs

    Share quantity:
        allocated = cash × position_size_pct
        entry_cost_rate = COST_PER_LEG (brokerage + slippage on entry)
        effective_price = entry_price × (1 + COST_PER_LEG)
        shares = floor(allocated / effective_price)

        The effective_price is higher than the raw close price because
        we pay brokerage and slippage on the way in. This ensures
        the cost_basis accurately reflects what we actually spent.

    Returns True if the buy was executed, False if skipped.
    """
    # Rule 2: check no open position
    if portfolio.position is not None:
        return False

    allocated = portfolio.cash * position_size_pct

    # Rule 2: check sufficient capital
    if allocated < MIN_TRADE_VALUE:
        if log_trades:
            print(
                f"  {day_label}  SKIP BUY — insufficient cash "
                f"(₹{portfolio.cash:,.0f} × {position_size_pct:.0%} = "
                f"₹{allocated:,.0f} < min ₹{MIN_TRADE_VALUE:,.0f})",
                flush=True,
            )
        return False

    if entry_price <= 0:
        return False

    # Effective price per share including entry costs
    effective_price = entry_price * (1.0 + COST_PER_LEG)
    shares = int(allocated / effective_price)   # floor — only whole shares

    if shares <= 0:
        return False

    # Actual cash deducted = shares × effective_price (includes brokerage+slippage)
    cash_deducted = shares * effective_price
    portfolio.cash -= cash_deducted

    portfolio.position = Position(
        shares           = shares,
        avg_cost         = effective_price,     # cost per share inc. entry costs
        total_cost_basis = cash_deducted,
        open_day_idx     = day_idx,
        signal           = "BUY",
        pred_return      = pred_return,
        confidence       = confidence,
        strength         = strength,
        entry_price      = entry_price,
    )

    if log_trades:
        print(
            f"  {day_label}  ▲ BUY   {strength:>6}  "
            f"pred={pred_return:+.2%}  conf={confidence:.3f}  "
            f"price=₹{entry_price:>8,.2f}  "
            f"shares={shares:>5}  "
            f"cost_basis=₹{cash_deducted:>10,.2f}  "
            f"cash_left=₹{portfolio.cash:>10,.2f}",
            flush=True,
        )

    return True


def _execute_sell(
    portfolio:    Portfolio,
    day_idx:      int,
    exit_price:   float,
    trade_num:    int,
    log_trades:   bool,
    day_label:    str,
    forced:       bool = False,   # True when closing at end-of-data
) -> Optional[ClosedTrade]:
    """
    Close the open long position.

    Rule 3 — Sell Condition:
        Only executes if portfolio.position is not None (shares exist).
        If no position is held, signal is ignored and None is returned.

    Rule 4 — Realised P&L:
        gross_pnl = (exit_price - entry_price) × shares
        exit_cost = shares × exit_price × COST_PER_LEG
        net_pnl   = gross_pnl - exit_cost
        (entry cost is already embedded in cost_basis / avg_cost)

    Cash after sell:
        cash += shares × exit_price × (1 - COST_PER_LEG)

    Returns the ClosedTrade record, or None if no position to close.
    """
    # Rule 3: nothing to sell
    if portfolio.position is None:
        if log_trades and not forced:
            print(
                f"  {day_label}  SKIP SELL — no open position (short-selling not allowed)",
                flush=True,
            )
        return None

    pos       = portfolio.position
    shares    = pos.shares

    # Proceeds received after exit costs (slippage + brokerage on the way out)
    exit_cost_rate = COST_PER_LEG
    proceeds   = shares * exit_price * (1.0 - exit_cost_rate)
    exit_cost  = shares * exit_price * exit_cost_rate

    # Entry cost is already in cost_basis — total cost = entry cost + exit cost
    entry_cost = pos.total_cost_basis - (shares * pos.entry_price)  # cost portion only
    total_cost = entry_cost + exit_cost

    # Gross P&L: purely the price difference × shares
    gross_pnl = (exit_price - pos.entry_price) * shares
    # Net P&L: what actually flows into/out of cash
    net_pnl   = proceeds - pos.total_cost_basis   # what we got back minus what we spent

    portfolio.cash        += proceeds
    portfolio.realised_pnl += net_pnl
    portfolio.position    = None   # position is closed

    is_win = net_pnl > 0.0
    portfolio.update_streak(is_win)

    total_value_after = portfolio.total_value(exit_price)

    trade = ClosedTrade(
        trade_num             = trade_num,
        open_day_idx          = pos.open_day_idx,
        close_day_idx         = day_idx,
        signal                = pos.signal,
        strength              = pos.strength,
        pred_return           = pos.pred_return,
        confidence            = pos.confidence,
        entry_price           = pos.entry_price,
        exit_price            = exit_price,
        shares                = shares,
        gross_pnl             = round(gross_pnl, 2),
        costs                 = round(total_cost, 2),
        net_pnl               = round(net_pnl, 2),
        is_win                = is_win,
        cash_before           = round(portfolio.cash - proceeds, 2),
        cash_after            = round(portfolio.cash, 2),
        portfolio_value_after = round(total_value_after, 2),
    )

    if log_trades:
        win_sym = "✓ WIN " if is_win else "✗ LOSS"
        label   = "CLOSE" if not forced else "EXPIRY"
        print(
            f"  {day_label}  ▼ {label:<6}  {pos.strength:>6}  "
            f"entry=₹{pos.entry_price:>8,.2f}  "
            f"exit=₹{exit_price:>8,.2f}  "
            f"shares={shares:>5}  "
            f"net_pnl=₹{net_pnl:>+10,.2f}  "
            f"cash=₹{portfolio.cash:>10,.2f}  "
            f"total=₹{total_value_after:>10,.2f}  "
            f"{win_sym}",
            flush=True,
        )

    return trade


# ─── Main backtest function ───────────────────────────────────────────────────

def backtest_v2(
    model:              StockForecastNet,
    dataset:            StockDatasetV2,
    horizon:            int   = 3,
    min_confidence:     float = CONFIDENCE_FLOOR,
    position_size_pct:  float = 0.20,
    device:             str   = "cpu",
    log_trades:         bool  = True,
    log_interval:       int   = 250,
    csv_path:           Optional[str] = None,
) -> dict:
    """
    Portfolio-based walk-forward backtest.

    DAILY LOOP (for each day i in the dataset):
    ────────────────────────────────────────────
    1. Get today's close price from dataset._close_prices.
       This price is used to:
         a) Mark any open position to market (unrealised P&L)
         b) As the exit price if a SELL signal fires today
         c) As the entry price if a BUY signal fires today

    2. Check if an open position should close today.
       The position was opened on day open_day_idx.
       It closes on day open_day_idx + horizon.
       We use the SELL signal logic at close time:
         - Execute sell at today's close price
         - Record realised P&L

    3. Run model inference (only if no position is open — no overlap).
       pred_raw → direction → confidence → signal/strength

    4. Execute signal:
       - BUY:  Open new long position (Rule 2 — check cash)
       - SELL: Close open position    (Rule 3 — check holdings)
               In long-only mode, a model SELL signal after horizon days
               means the model predicted DOWN — we use this as the exit trigger.

    5. Snapshot today's total portfolio value:
       total_value = cash + shares_held × today_close_price

    Note on horizon-based exit:
    The model was trained to predict the N-day return.
    The "sell after horizon days" rule matches the training objective.
    A model SELL signal on a day we are flat is ignored (long-only).

    Returns: dict with full metrics and trade list.
    """
    dev = torch.device(device)
    model.eval()
    model.to(dev)

    # Validate close prices available
    if dataset._close_prices is None:
        raise ValueError(
            "dataset._close_prices is None — the dataset was built without "
            "a DataFrame containing a 'close' column. Pass the full featured "
            "df (output of add_features_v6 called on a df that has 'close')."
        )

    close_prices = dataset._close_prices  # shape: (n_rows_in_clean_df,)
    window       = dataset.X.shape[1]     # e.g. 30
    n_samples    = len(dataset)

    portfolio   = Portfolio(
        initial_capital = 100_000.0,
        cash            = 100_000.0,
    )
    cap_curve   = []      # total portfolio value each day
    trade_count = 0

    _print_header(position_size_pct, min_confidence, horizon)

    for i in range(n_samples):
        # ── Resolve today's close price ───────────────────────────────────
        # dataset[i] covers feature rows [i .. i+window-1]
        # The signal fires on row i+window (first day after the feature window)
        # Entry/exit price = close on row (i + window)
        price_idx     = i + window        # index into close_prices array
        horizon_idx   = i + window + horizon   # index of exit day

        # Clamp to valid range
        price_idx_clamped   = min(price_idx,   len(close_prices) - 1)
        horizon_idx_clamped = min(horizon_idx, len(close_prices) - 1)

        today_close  = float(close_prices[price_idx_clamped])
        exit_close   = float(close_prices[horizon_idx_clamped])

        day_label = f"Day {i:>4}/{n_samples}"

        # ── Check if open position should close today ─────────────────────
        # Rule: positions opened on day i_open close on day i_open + horizon
        # We check: current day i == i_open + horizon  →  close the position
        if portfolio.position is not None:
            open_idx = portfolio.position.open_day_idx
            if i >= open_idx + horizon:
                trade_count += 1
                trade = _execute_sell(
                    portfolio   = portfolio,
                    day_idx     = i,
                    exit_price  = today_close,   # close at today's price
                    trade_num   = trade_count,
                    log_trades  = log_trades,
                    day_label   = day_label,
                )
                if trade:
                    portfolio.closed_trades.append(trade)

        # ── Snapshot portfolio value (mark to market) ──────────────────────
        # Rule 1 & 4: total value includes unrealised P&L at today's close
        total_val = portfolio.total_value(today_close)
        cap_curve.append(total_val)

        # ── Progress log ──────────────────────────────────────────────────
        if log_interval > 0 and i > 0 and i % log_interval == 0:
            ret_pct = (total_val / portfolio.initial_capital - 1) * 100
            unreal  = portfolio.unrealised_pnl(today_close)
            print(
                f"  Day {i:>4}/{n_samples}  "
                f"Total=₹{total_val:>10,.0f} ({ret_pct:+.1f}%)  "
                f"Cash=₹{portfolio.cash:>9,.0f}  "
                f"Shares={portfolio.shares_held:>4}  "
                f"UnrealPnL=₹{unreal:>+9,.0f}  "
                f"Trades={len(portfolio.closed_trades)}",
                flush=True,
            )

        # ── Run model inference ───────────────────────────────────────────
        # Skip if already in a position (no overlapping trades)
        if portfolio.position is not None:
            continue

        x, time_feats, _ = dataset[i]
        with torch.no_grad():
            # V6: forward returns (logit, mag_norm, revin_stats)
            logit, mag_norm, revin_stats = model(
                x.unsqueeze(0).to(dev), time_feats.unsqueeze(0).to(dev))
            import torch as _t
            p_up     = float(_t.sigmoid(logit[0]).item())
            pred_raw = mag_norm[0, -1].item()   # use magnitude for sizing
        direction = 1 if p_up >= 0.5 else 0
        confidence_from_logit = p_up if direction == 1 else (1.0 - p_up)

        confidence = confidence_from_logit  # already computed above

        if confidence < min_confidence:
            continue

        signal, strength = generate_signal_v2(direction, confidence, pred_raw)

        # ── Execute signal ────────────────────────────────────────────────
        if signal == "BUY":
            # Rule 2: buy only if sufficient cash
            _execute_buy(
                portfolio          = portfolio,
                day_idx            = i,
                entry_price        = today_close,
                pred_return        = pred_raw,
                confidence         = confidence,
                strength           = strength,
                position_size_pct  = position_size_pct,
                log_trades         = log_trades,
                day_label          = day_label,
            )

        elif signal == "SELL":
            # Rule 3: in long-only mode, SELL means "exit existing position"
            # If we have no position, this signal is ignored
            if portfolio.position is not None:
                trade_count += 1
                trade = _execute_sell(
                    portfolio  = portfolio,
                    day_idx    = i,
                    exit_price = today_close,
                    trade_num  = trade_count,
                    log_trades = log_trades,
                    day_label  = day_label,
                )
                if trade:
                    portfolio.closed_trades.append(trade)
            else:
                if log_trades:
                    print(
                        f"  {day_label}  IGNORE SELL — no position held "
                        f"(long-only: cannot short)",
                        flush=True,
                    )

    # ── Force-close any remaining open position at end of data ────────────
    if portfolio.position is not None:
        last_price = float(close_prices[-1])
        trade_count += 1
        trade = _execute_sell(
            portfolio  = portfolio,
            day_idx    = n_samples - 1,
            exit_price = last_price,
            trade_num  = trade_count,
            log_trades = log_trades,
            day_label  = f"Day {n_samples}/{n_samples} [END]",
            forced     = True,
        )
        if trade:
            portfolio.closed_trades.append(trade)
        # Final snapshot
        cap_curve.append(portfolio.total_value(last_price))

    # ── Build results dict ────────────────────────────────────────────────
    final_close  = float(close_prices[-1])
    final_value  = portfolio.total_value(final_close)
    unrealised   = portfolio.unrealised_pnl(final_close)
    results      = _compute_metrics(portfolio, cap_curve, final_value, final_close)

    _print_results(results, portfolio)

    if csv_path:
        _save_csv(portfolio.closed_trades, csv_path)
        print(f"\n  Trade log saved → {csv_path}", flush=True)

    return results


# ─── Metrics ──────────────────────────────────────────────────────────────────

def _compute_metrics(
    portfolio:   Portfolio,
    cap_curve:   list,
    final_value: float,
    final_price: float,
) -> dict:
    trades    = portfolio.closed_trades
    n_trades  = len(trades)
    wins      = sum(1 for t in trades if t.is_win)
    initial   = portfolio.initial_capital

    strong_t  = [t for t in trades if t.strength == "STRONG"]
    medium_t  = [t for t in trades if t.strength == "MEDIUM"]

    total_costs  = sum(t.costs   for t in trades)
    total_net    = sum(t.net_pnl for t in trades)

    avg_win  = (np.mean([t.net_pnl for t in trades if t.is_win])
                if wins > 0 else 0.0)
    avg_loss = (np.mean([t.net_pnl for t in trades if not t.is_win])
                if (n_trades - wins) > 0 else 0.0)

    pnl_per_trade = [t.net_pnl / max(t.shares * t.entry_price, 1.0) for t in trades]
    sharpe = _sharpe(pnl_per_trade)
    maxdd  = _maxdd(cap_curve)

    unrealised = portfolio.unrealised_pnl(final_price)

    return {
        "initial_capital":    initial,
        "final_value":        round(final_value, 2),
        "cash":               round(portfolio.cash, 2),
        "shares_held":        portfolio.shares_held,
        "unrealised_pnl":     round(unrealised, 2),
        "realised_pnl":       round(portfolio.realised_pnl, 2),
        "total_return_pct":   round((final_value / initial - 1) * 100, 2),
        "total_costs":        round(total_costs, 2),
        "n_days":             len(cap_curve),
        "n_trades":           n_trades,
        "accuracy":           round(wins / n_trades, 4) if n_trades else 0.0,
        "wins":               wins,
        "losses":             n_trades - wins,
        "avg_win_inr":        round(avg_win,  2),
        "avg_loss_inr":       round(avg_loss, 2),
        "profit_factor":      round(abs(avg_win / avg_loss), 3) if avg_loss != 0 else 0.0,
        "sharpe_ratio":       round(sharpe, 3),
        "max_drawdown_pct":   round(maxdd * 100, 2),
        "best_streak":        portfolio.best_streak,
        "worst_streak":       abs(portfolio.worst_streak),
        "n_strong":           len(strong_t),
        "strong_accuracy":    (round(sum(1 for t in strong_t if t.is_win) / len(strong_t), 4)
                               if strong_t else 0.0),
        "n_medium":           len(medium_t),
        "medium_accuracy":    (round(sum(1 for t in medium_t if t.is_win) / len(medium_t), 4)
                               if medium_t else 0.0),
        "capital_curve":      cap_curve,
        "trades":             trades,
    }


def _sharpe(rets: list) -> float:
    if len(rets) < 2: return 0.0
    a = np.array(rets, dtype=np.float64)
    s = a.std()
    return float(np.sqrt(252) * a.mean() / s) if s > 1e-9 else 0.0


def _maxdd(curve: list) -> float:
    if not curve: return 0.0
    arr  = np.array(curve, dtype=np.float64)
    peak = arr[0]; dd = 0.0
    for v in arr:
        if v > peak: peak = v
        dd = max(dd, (peak - v) / max(peak, 1e-9))
    return dd


# ─── Logging ──────────────────────────────────────────────────────────────────

def _print_header(pos_size: float, conf_floor: float, horizon: int):
    W = 68
    sep = "=" * W
    print(flush=True)
    print(sep, flush=True)
    print("  BACKTEST CONFIGURATION", flush=True)
    print(sep, flush=True)
    print(f"  Mode:              Long-only (no short selling)", flush=True)
    print(f"  Horizon:           {horizon} days per position", flush=True)
    print(f"  Position size:     {pos_size:.0%} of available cash per BUY", flush=True)
    print(f"  Confidence floor:  {conf_floor:.2f}", flush=True)
    print(f"  Brokerage:         {BROKERAGE_PCT:.2%} per leg", flush=True)
    print(f"  Slippage:          {SLIPPAGE_PCT:.2%} per leg  (round-trip: {COST_PER_LEG*2:.2%})", flush=True)
    print(f"  Min trade value:   ₹{MIN_TRADE_VALUE:,.0f}", flush=True)
    print(f"  Overlap:           PREVENTED  (one position at a time)", flush=True)
    print(f"  Sell rule:         Only when shares held > 0", flush=True)
    print(sep, flush=True)
    print(flush=True)

    # Trade log column headers
    print(
        f"  {'Day':<9}  {'Action':<8}  {'Str':>6}  "
        f"{'Pred%':>6}  {'Conf':>5}  "
        f"{'Price':>9}  {'Shares':>6}  "
        f"{'NetPnL':>10}  {'Cash':>10}  "
        f"{'Total':>10}  Result",
        flush=True,
    )
    print("  " + "-" * 95, flush=True)


def _print_results(r: dict, portfolio: Portfolio):
    """Print final summary — called exactly once, all output flush=True."""
    W   = 68
    sep = "=" * W
    print(flush=True)
    print(sep, flush=True)
    print("  BACKTEST RESULTS — PORTFOLIO SUMMARY", flush=True)
    print(sep, flush=True)

    # ── Capital & P&L ────────────────────────────────────────────────────
    print(f"  Starting Capital:     ₹{r['initial_capital']:>12,.2f}", flush=True)
    print(f"  Final Portfolio Value:₹{r['final_value']:>12,.2f}  "
          f"({r['total_return_pct']:+.2f}%)", flush=True)
    print(f"    Cash (uninvested):  ₹{r['cash']:>12,.2f}", flush=True)
    if r['shares_held'] > 0:
        print(f"    Open position:       {r['shares_held']:>6} shares held", flush=True)
        print(f"    Unrealised P&L:    ₹{r['unrealised_pnl']:>+12,.2f}  "
              "(included in final value)", flush=True)
    print(f"  Realised P&L:         ₹{r['realised_pnl']:>+12,.2f}  "
          f"(from {r['n_trades']} closed trades)", flush=True)
    print(f"  Transaction Costs:    ₹{r['total_costs']:>12,.2f}  "
          f"({r['total_costs']/r['initial_capital']*100:.2f}% of capital)", flush=True)

    print(flush=True)

    # ── Trade statistics ──────────────────────────────────────────────────
    print(f"  ── Trade Statistics ───────────────────────────────────────", flush=True)
    print(f"  Total Days:           {r['n_days']:>6}", flush=True)
    print(f"  Closed Trades:        {r['n_trades']:>6}", flush=True)
    if r['n_trades'] > 0:
        acc = r['accuracy']
        print(f"  Win Rate:             {acc:>6.2%}  "
              f"({r['wins']} wins / {r['losses']} losses)", flush=True)
        print(f"  Avg Win:             ₹{r['avg_win_inr']:>+12,.2f}", flush=True)
        print(f"  Avg Loss:            ₹{r['avg_loss_inr']:>+12,.2f}", flush=True)
        pf = r['profit_factor']
        pf_note = ("(>1.5=good)" if pf>=1.5 else
                   ("(>1.0=profitable)" if pf>=1.0 else "(loss-making)"))
        print(f"  Profit Factor:        {pf:>6.3f}  {pf_note}", flush=True)
        print(f"  Best Win Streak:      {r['best_streak']:>6}", flush=True)
        print(f"  Worst Loss Streak:    {r['worst_streak']:>6}", flush=True)

    print(flush=True)

    # ── Risk ──────────────────────────────────────────────────────────────
    print(f"  ── Risk Metrics ───────────────────────────────────────────", flush=True)
    sr = r['sharpe_ratio']
    sr_note = ("(>1.5=strong)" if sr>1.5 else
               ("(>1.0=acceptable)" if sr>1.0 else
                ("(>0=marginal)" if sr>0 else "(negative=losing)")))
    print(f"  Sharpe Ratio:         {sr:>6.3f}  {sr_note}", flush=True)
    dd = r['max_drawdown_pct']
    dd_note = "(<15%=good)" if dd<15 else ("(<30%=OK)" if dd<30 else "(>30%=high risk)")
    print(f"  Max Drawdown:         {dd:>6.2f}%  {dd_note}", flush=True)

    print(flush=True)

    # ── Strength breakdown ────────────────────────────────────────────────
    if r['n_strong'] or r['n_medium']:
        print(f"  ── By Signal Strength ─────────────────────────────────────", flush=True)
        if r['n_strong']:
            print(f"  STRONG trades:        {r['n_strong']:>6}  "
                  f"acc={r['strong_accuracy']:.2%}", flush=True)
        if r['n_medium']:
            print(f"  MEDIUM trades:        {r['n_medium']:>6}  "
                  f"acc={r['medium_accuracy']:.2%}", flush=True)
        print(flush=True)

    # ── Interpretation ────────────────────────────────────────────────────
    print(f"  ── Interpretation ─────────────────────────────────────────", flush=True)
    ret = r['total_return_pct']
    if r['n_trades'] == 0:
        print("  ⚠  ZERO TRADES — predictions all below threshold.", flush=True)
        print("     Retrain V4 model, or lower --confidence threshold.", flush=True)
    elif ret > 200:
        print("  ⚠  HIGH RETURNS — verify no data leakage in feature pipeline.", flush=True)
        print("     Check: are features computed on future data accidentally?", flush=True)
    elif sr > 1.5 and r['accuracy'] >= 0.57:
        print("  ✓  STRONG — Sharpe > 1.5 with good accuracy.", flush=True)
        print("     Paper-trade for 30+ days before using real capital.", flush=True)
    elif sr > 0.8:
        print("  ~  ACCEPTABLE — Sharpe > 0.8, model has some edge.", flush=True)
    else:
        print("  ✗  WEAK — Sharpe < 0.8. Model not ready for live trading.", flush=True)
        print("     Try: more stocks in pretrain, start_date 2010, retrain.", flush=True)

    print(sep, flush=True)
    print(flush=True)


def _save_csv(trades: list, path: str):
    if not trades:
        print(f"  No trades to save.", flush=True)
        return
    fields = [
        "trade_num", "open_day_idx", "close_day_idx",
        "signal", "strength", "pred_return_pct", "confidence",
        "entry_price", "exit_price", "shares",
        "gross_pnl", "costs", "net_pnl",
        "is_win", "cash_before", "cash_after", "portfolio_value_after",
    ]
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for t in trades:
            w.writerow({
                "trade_num":             t.trade_num,
                "open_day_idx":          t.open_day_idx,
                "close_day_idx":         t.close_day_idx,
                "signal":                t.signal,
                "strength":              t.strength,
                "pred_return_pct":       round(t.pred_return * 100, 4),
                "confidence":            round(t.confidence, 4),
                "entry_price":           round(t.entry_price, 2),
                "exit_price":            round(t.exit_price, 2),
                "shares":                t.shares,
                "gross_pnl":             t.gross_pnl,
                "costs":                 t.costs,
                "net_pnl":               t.net_pnl,
                "is_win":                t.is_win,
                "cash_before":           t.cash_before,
                "cash_after":            t.cash_after,
                "portfolio_value_after": t.portfolio_value_after,
            })


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Portfolio-based backtest for StockForecastNet V5",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python backtest_v2.py --data data/RELIANCE/RELIANCE_daily_2010-01-01_2026-04-09.parquet\n"
            "  python backtest_v2.py --data ... --log_trades --csv trades.csv\n"
            "  python backtest_v2.py --data ... --position_size 0.20 --confidence 0.55\n"
        ),
    )
    parser.add_argument("--data",          required=True)
    parser.add_argument("--model",         default="model_v2.pth")
    parser.add_argument("--config",        default="model_v2_config.pth")
    parser.add_argument("--scaler",        default="scaler_v2.pkl")
    parser.add_argument("--confidence",    type=float, default=CONFIDENCE_FLOOR)
    parser.add_argument("--position_size", type=float, default=0.20,
                        help="Fraction of cash per BUY (default 0.20 = 20%%)")
    parser.add_argument("--horizon",       type=int,   default=3)
    parser.add_argument("--window",        type=int,   default=30)
    parser.add_argument("--device",        default="cpu",
                        choices=["cpu", "cuda", "mps"])
    parser.add_argument("--log_trades",    action="store_true",
                        help="Print each buy/sell as it executes")
    parser.add_argument("--log_interval",  type=int,   default=250,
                        help="Print portfolio status every N days (0=off)")
    parser.add_argument("--csv",           default=None,
                        help="Save trade log to CSV file")
    args = parser.parse_args()

    import pandas as pd

    print(f"\nLoading: {args.data}", flush=True)
    df_raw = (pd.read_parquet(args.data) if args.data.endswith(".parquet")
              else pd.read_csv(args.data))

    # IMPORTANT: keep 'close' in df for share-price tracking
    # add_features_v6 works on a df with 'close'; it drops raw prices from
    # the returned FEATURE_COLS — but we preserve 'close' via _close_prices
    # stored inside StockDatasetV2 (see dataset_v2.py)
    df = add_features_v6(df_raw)

    # Re-attach close prices from raw df to the feature df
    # (add_features_v6 drops raw prices from output — we re-add for backtest)
    df_raw_aligned = df_raw.reset_index(drop=True)
    df_with_close  = df.copy()
    # Map clean df rows back to original close prices
    # Since add_features_v6 drops NaN rows and resets index, we need
    # to carry close prices through. We do this by using df_raw's close
    # aligned to the same row count after NaN removal.
    # The cleanest approach: pass df_raw close prices alongside features.
    # We achieve this by ensuring the df passed to StockDatasetV2 has 'close'.
    if "close" not in df.columns:
        # Reconstruct: add_features_v6 resets index after dropping NaN.
        # The raw df may be longer. We pass close from df_raw indexed to
        # the surviving rows. Use the fact that add_features_v6 prints
        # "N rows → M clean rows" — M rows survive.
        n_raw = len(df_raw)
        n_clean = len(df)
        # Simple heuristic: last n_clean rows of df_raw (warmup rows dropped from front)
        close_aligned = df_raw["close"].values[-n_clean:] if n_raw >= n_clean else df_raw["close"].values
        df["close"] = close_aligned[:n_clean]

    scaler  = joblib.load(args.scaler)
    dataset = StockDatasetV2(
        df, window=args.window, horizon=args.horizon, scaler=scaler
    )
    dataset.summary()
    print(flush=True)

    if os.path.exists(args.config):
        cfg = torch.load(args.config, map_location="cpu")
        print(f"  Config: {cfg}", flush=True)
    else:
        print(f"  [WARNING] Config not found, using defaults.", flush=True)
        cfg = {
            "input_dim": len(FEATURE_COLS), "window": args.window,
            "d_model": 64, "n_layers": 2, "n_heads": 4,
            "d_ff": 128, "dropout": 0.0, "horizon": args.horizon,
        }

    if cfg.get("input_dim") != dataset.n_features:
        cfg["input_dim"] = dataset.n_features

    model = StockForecastNet(**cfg)
    state = torch.load(args.model, map_location="cpu")
    missing, unexpected = model.load_state_dict(state, strict=False)
    if missing:
        print(f"  [INFO] {len(missing)} missing keys zero-initialised", flush=True)
    print(f"  {model}", flush=True)

    backtest_v2(
        model             = model,
        dataset           = dataset,
        horizon           = args.horizon,
        min_confidence    = args.confidence,
        position_size_pct = args.position_size,
        device            = args.device,
        log_trades        = args.log_trades,
        log_interval      = args.log_interval,
        csv_path          = args.csv,
    )
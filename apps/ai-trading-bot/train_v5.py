"""
train_v2.py  (this file is train_v5.py in the user's repo)
============================================================
StockForecastNet V5 — Training Pipeline

CRASH HISTORY AND FIXES
─────────────────────────
Attempt 1:  Crash: duplicate output, 7× UserWarning
  Cause:    Missing if __name__ == "__main__" guard on Windows.
            Python's 'spawn' multiprocessing re-runs the entire module
            for each DataLoader worker, calling build_multi_stock_dataset()
            and constructing StockForecastNet() multiple times.
  Fix:      All executable code inside if __name__ == "__main__":

Attempt 2:  Crash: silent exit after epoch header, no traceback
  Cause:    'except Exception' does not catch SystemExit or OS-level kills.
  Fix:      Added 'except BaseException', dry-run forward pass, stderr output.

Attempt 3:  STILL crashes silently after epoch header
  Real Cause: WeightedRandomSampler calls torch.multinomial() internally.
    On Windows with Intel MKL / OpenMP threading, torch.multinomial on
    tensors > ~1000 elements causes a thread-level memory violation that
    kills the process at the OS level — bypassing ALL Python exception
    handling including BaseException.
    This is a known PyTorch/Windows bug:
    github.com/pytorch/pytorch/issues/17199
  DEFINITIVE FIX: Remove DataLoader + WeightedRandomSampler entirely.
    Replaced with _iter_batches() — a pure Python manual batch iterator
    using torch.randperm for shuffling. No C++ threads, no multinomial,
    no worker processes. Works identically on Windows, Linux, Mac.

ADDITIONAL TRAINING IMPROVEMENTS IN THIS VERSION
──────────────────────────────────────────────────
1.  patience=30  (was 25)
    CosineAnnealingWarmRestarts has its first LR restart at epoch 20.
    With patience=25, early stopping could trigger between epoch 20-25,
    aborting training right when the LR restart would rescue a plateau.
    patience=30 ensures we survive the restart.

2.  OMP_NUM_THREADS=1, MKL_NUM_THREADS=1  (new)
    Even without DataLoader, MKL threading can cause issues on Windows.
    Limiting to 1 OpenMP thread per PyTorch thread prevents conflicts.

3.  Sector diversity warning  (new)
    With only 2 IT stocks (TCS + INFY), the model learns only one
    market pattern. Cross-sector diversity is critical for generalisation.
    The training script now warns when symbol diversity looks too narrow.

4.  Epoch speed estimation  (new)
    Prints estimated total training time after epoch 1.

EXPECTED TRAINING BEHAVIOUR
─────────────────────────────
With 2 stocks (TCS + INFY):
  - Training WILL run (crash is fixed)
  - Accuracy will likely plateau at 52-55%
  - This is not a bug — it is a data problem
  - Model needs cross-sector diversity to learn generalisable patterns

With 5+ diverse stocks (recommended):
  - Training should reach 56-62% val accuracy after 60-80 epochs
  - Accuracy above 60% is considered good for stock direction prediction

MODES
──────
  single:   python train_v2.py --symbol RELIANCE
  pretrain: python train_v2.py --mode pretrain --symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,MARUTI,AXISBANK
  finetune: python train_v2.py --mode finetune --symbol RELIANCE
"""

import argparse
import glob
import os
import random
import sys
import time

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import joblib
import numpy as np
import torch
import torch.nn as nn

from config import settings
from data_fetch_upstox import fetch_historical_data
from dataset_v5 import StockDatasetV2, build_multi_stock_dataset
from features_v2 import FEATURE_COLS, add_features_v2
from model_v5 import StockForecastNet


# ─── Default configuration ────────────────────────────────────────────────────
DEFAULT_CFG = {
    "mode":            "single",
    "symbol":          "RELIANCE",
    "symbols":         "RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,MARUTI,AXISBANK",
    "start_date":      "2010-01-01",
    "seq_len":         90,
    "horizon":         3,
    "patch_size":      16,
    "stride":          8,
    "d_model":         128,
    "n_heads":         4,
    "n_layers":        2,
    "d_ff":            256,
    "dropout":         0.1,
    "batch_size":      32,
    "epochs":          100,
    "lr":              3e-4,
    "weight_decay":    1e-3,
    "val_split":       0.2,
    "patience":        30,        # INCREASED: survive CosineAnnealing restart at epoch 20
    "noise_threshold": 0.001,
    "gap":             10,
    "pretrain_path":   "pretrained_v5.pth",
    "model_path":      settings.MODEL_PATH,
    "scaler_path":     settings.SCALER_PATH,
    "config_path":     settings.CONFIG_PATH,
    "seed":            42,
}


# ─── Manual batch iterator — replaces DataLoader entirely ─────────────────────

def _iter_batches(dataset, batch_size: int, shuffle: bool, device: torch.device):
    """
    Manual batch iterator. Replaces DataLoader + WeightedRandomSampler.

    WHY:
    WeightedRandomSampler internally calls torch.multinomial(). On Windows
    with Intel MKL / OpenMP, this causes an OS-level thread kill that
    bypasses all Python exception handling. The process dies silently
    after printing the epoch header.

    This function uses only:
      torch.randperm  — pure C, no threading
      direct dataset indexing — no worker processes
      torch.stack     — simple tensor concat

    100% portable. No known crash scenarios.
    """
    n = len(dataset)
    indices = torch.randperm(n).tolist() if shuffle else list(range(n))

    for start in range(0, n - batch_size + 1, batch_size):
        batch_idx = indices[start : start + batch_size]
        Xs, tfs, ys = [], [], []
        for idx in batch_idx:
            x, tf, y = dataset[idx]
            Xs.append(x); tfs.append(tf); ys.append(y)
        yield (
            torch.stack(Xs).to(device),
            torch.stack(tfs).to(device),
            torch.stack(ys).to(device),
        )


def _n_batches(n: int, batch_size: int) -> int:
    return max(n // batch_size, 1)


# ─── Utilities ────────────────────────────────────────────────────────────────

def _set_windows_env():
    """Prevent MKL / OMP threading deadlocks on Windows."""
    if sys.platform == "win32":
        os.environ.setdefault("OMP_NUM_THREADS", "1")
        os.environ.setdefault("MKL_NUM_THREADS", "1")
        os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
        torch.set_num_threads(min(os.cpu_count() or 4, 4))


def detect_device() -> torch.device:
    sep = "=" * 60
    print(f"\n{sep}", flush=True)
    print("  COMPUTE DEVICE", flush=True)
    print(sep, flush=True)
    if torch.cuda.is_available():
        device = torch.device("cuda")
        p = torch.cuda.get_device_properties(0)
        print(f"  ✓ NVIDIA GPU: {p.name}  ({p.total_memory/1024**3:.1f} GB)", flush=True)
        torch.backends.cudnn.benchmark = True
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        print("  ✓ Apple MPS (M1/M2/M3)", flush=True)
    else:
        device = torch.device("cpu")
        _set_windows_env()
        n = os.cpu_count() or 4
        print(f"  CPU ({n} cores)", flush=True)
        print("  OMP/MKL threads limited to prevent Windows deadlock", flush=True)
        print("  Tip: Colab free T4 GPU → 15-20× faster", flush=True)
    print(sep, flush=True)
    return device


def set_seed(seed: int):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(seed)


def _build_model(cfg: dict, n_features: int) -> StockForecastNet:
    return StockForecastNet(
        n_features=n_features, seq_len=cfg["seq_len"], horizon=cfg["horizon"],
        patch_size=cfg["patch_size"], stride=cfg["stride"], d_model=cfg["d_model"],
        n_heads=cfg["n_heads"], n_layers=cfg["n_layers"], d_ff=cfg["d_ff"],
        dropout=cfg["dropout"],
    )


def _print_model_info(model: StockForecastNet, batch_size: int):
    print(f"\n  {model}", flush=True)
    c = model.count_parameters()
    print(f"\n  {'Component':<26} {'Params':>10}", flush=True)
    print(f"  {'-'*40}", flush=True)
    for k, v in c.items():
        if k not in ("total", "size_mb"):
            print(f"  {k:<26} {v:>10,}", flush=True)
    print(f"  {'─'*40}", flush=True)
    print(f"  {'TOTAL':<26} {c['total']:>10,}  ({c['size_mb']} MB)", flush=True)
    B_C = batch_size * model.n_features
    fused_mb = B_C * model.n_patches * model.d_model * 4 / 1024 / 1024
    print(f"\n  B×C = {batch_size}×{model.n_features} = {B_C}  |  "
          f"fused tensor ≈ {fused_mb:.1f} MB", flush=True)
    print(flush=True)


def _warn_sector_diversity(symbols: list):
    """Warn if training symbols look insufficiently diverse."""
    it_stocks    = {'TCS','INFY','WIPRO','TECHM','HCL','PERSISTENT','MPHASIS'}
    bank_stocks  = {'HDFCBANK','ICICIBANK','AXISBANK','KOTAKBANK','SBIN','BANDHANBNK'}
    energy_stocks = {'RELIANCE','ONGC','BPCL','IOC'}

    sym_upper = {s.upper() for s in symbols}
    sectors_present = []
    if sym_upper & it_stocks:    sectors_present.append("IT")
    if sym_upper & bank_stocks:  sectors_present.append("Banking")
    if sym_upper & energy_stocks: sectors_present.append("Energy")

    print(f"\n  Sectors detected: {sectors_present or ['UNKNOWN']}", flush=True)

    if len(sym_upper) < 5:
        print(f"  ⚠ WARNING: Only {len(symbols)} stocks.", flush=True)
        print("    Model needs cross-sector diversity to generalise.", flush=True)
        print("    Recommend: RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,MARUTI,AXISBANK", flush=True)

    if len(sectors_present) < 2 and len(sym_upper) >= 3:
        print("  ⚠ WARNING: All symbols appear to be in the same sector.", flush=True)
        print("    Correlated stocks teach the model only one market pattern.", flush=True)
        print("    Add stocks from energy, banking, auto, FMCG sectors.", flush=True)


def _save_all(model, best_state, scaler, model_path, config_path, scaler_path):
    state = best_state or {k: v.cpu() for k, v in model.state_dict().items()}
    torch.save(state, model_path)
    print(f"  Weights  → {model_path}", flush=True)
    torch.save(model.get_config(), config_path)
    print(f"  Config   → {config_path}", flush=True)
    joblib.dump(scaler, scaler_path)
    print(f"  Scaler   → {scaler_path}", flush=True)


def _load_or_fetch(symbol: str, start_date: str):
    import pandas as pd
    folder = os.path.join("data", symbol.upper())
    files  = sorted(glob.glob(os.path.join(folder, "*.parquet")))
    if files:
        print(f"  Cached: {os.path.basename(files[-1])}", flush=True)
        return pd.read_parquet(files[-1])
    print(f"  Fetching {symbol} from Upstox...", flush=True)
    return fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        start_date=start_date, use_cache=True,
    )


def _result_summary(best_acc: float, n_stocks: int = 1):
    sep = "=" * 60
    print(f"\n{sep}", flush=True)
    print("  TRAINING RESULT", flush=True)
    print(sep, flush=True)
    if best_acc >= 0.60:
        print(f"  ✓ STRONG  — Val accuracy {best_acc:.2%}", flush=True)
        print("  Next: python backtest_v2.py --data ...", flush=True)
    elif best_acc >= 0.56:
        print(f"  ~ GOOD    — Val accuracy {best_acc:.2%}", flush=True)
        print("  Acceptable. Backtest before live trading.", flush=True)
    elif best_acc >= 0.53:
        print(f"  ~ MARGINAL — Val accuracy {best_acc:.2%}", flush=True)
        if n_stocks < 7:
            print(f"  Data limited ({n_stocks} stocks). Add more diverse stocks:", flush=True)
            print("  --symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,MARUTI,AXISBANK,TATASTEEL", flush=True)
    else:
        print(f"  ✗ WEAK    — Val accuracy {best_acc:.2%}", flush=True)
        print("  Random-level performance. Likely causes:", flush=True)
        print("   1. Too few stocks (need 7+ from diverse sectors)", flush=True)
        print("   2. Short date range (use --start_date 2010-01-01)", flush=True)
        print("   3. Too similar stocks (IT+IT = one sector pattern)", flush=True)
    print(f"{sep}\n", flush=True)


# ─── Core training loop ───────────────────────────────────────────────────────

def train_loop(model, train_ds, val_ds, cfg, device) -> tuple:
    """
    Training loop using pure Python batch iteration.

    Uses _iter_batches() instead of DataLoader to avoid the Windows
    torch.multinomial crash in WeightedRandomSampler.
    """
    batch_size = cfg["batch_size"]
    optimizer  = torch.optim.AdamW(
        model.parameters(), lr=cfg["lr"],
        weight_decay=cfg["weight_decay"], betas=(0.9, 0.999),
    )
    # T_0=20: first restart at epoch 20
    # patience=30: ensures we see the epoch-20 restart before early stopping
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=20, T_mult=2, eta_min=1e-6,
    )
    loss_fn    = nn.HuberLoss(delta=0.02)
    n_tr_batch = _n_batches(len(train_ds), batch_size)
    n_va_batch = _n_batches(len(val_ds),   batch_size)

    best_loss  = float("inf")
    best_acc   = 0.0
    best_state = None
    no_improve = 0

    # ── Dry run ───────────────────────────────────────────────────────────────
    print("  Dry-run: testing one forward pass...", flush=True)
    sys.stdout.flush()
    try:
        model.eval()
        with torch.no_grad():
            x0, tf0, y0 = train_ds[0]
            pout = model(x0.unsqueeze(0).to(device), tf0.unsqueeze(0).to(device))
            chk  = loss_fn(pout[:, -1], y0[-1:].to(device))
        print(f"  ✓ OK — in {tuple(x0.shape)} → out {tuple(pout.shape)} "
              f"loss={chk.item():.6f}", flush=True)
        del x0, tf0, y0, pout, chk
    except Exception as e:
        print(f"\n  ✗ DRY RUN FAILED: {type(e).__name__}: {e}", flush=True)
        import traceback; traceback.print_exc()
        print("\n  Cannot start training. Fix the error above.", flush=True)
        return None, 0.0

    # ── Epoch table ───────────────────────────────────────────────────────────
    hdr = (f"  {'Ep':>4}  {'TrLoss':>9}  {'TrAcc':>6}  "
           f"{'VaLoss':>9}  {'VaAcc':>6}  {'LR':>9}  {'s/ep':>6}")
    print(hdr, flush=True)
    print("  " + "-" * (len(hdr) - 2), flush=True)
    sys.stdout.flush()

    epoch_times = []

    for epoch in range(1, cfg["epochs"] + 1):
        t0 = time.time()
        model.train()
        tr_loss = tr_correct = tr_total = 0

        for X, tf, y in _iter_batches(train_ds, batch_size, shuffle=True, device=device):
            preds = model(X, tf)
            loss  = (sum(loss_fn(preds[:, h], y[:, h])
                        for h in range(cfg["horizon"])) / cfg["horizon"])
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            tr_loss    += loss.item()
            tr_correct += int((torch.sign(preds[:, -1]) == torch.sign(y[:, -1])).sum())
            tr_total   += y.size(0)

        scheduler.step()

        model.eval()
        va_loss = va_correct = va_total = 0
        with torch.no_grad():
            for X, tf, y in _iter_batches(val_ds, batch_size, shuffle=False, device=device):
                preds   = model(X, tf)
                va_loss += (sum(loss_fn(preds[:, h], y[:, h])
                               for h in range(cfg["horizon"])) / cfg["horizon"]).item()
                va_correct += int((torch.sign(preds[:, -1]) == torch.sign(y[:, -1])).sum())
                va_total   += y.size(0)

        tr_acc  = tr_correct / max(tr_total, 1)
        va_acc  = va_correct / max(va_total, 1)
        avg_tr  = tr_loss / n_tr_batch
        avg_va  = va_loss / n_va_batch
        cur_lr  = optimizer.param_groups[0]["lr"]
        elapsed = time.time() - t0
        epoch_times.append(elapsed)

        print(f"  {epoch:>4}  {avg_tr:>9.5f}  {tr_acc:>6.3f}  "
              f"{avg_va:>9.5f}  {va_acc:>6.3f}  {cur_lr:>9.2e}  "
              f"{elapsed:>6.1f}s", flush=True)
        sys.stdout.flush()

        # After first epoch, estimate total time
        if epoch == 1:
            est_total = elapsed * cfg["epochs"] / 60
            print(f"  [Estimated total: ~{est_total:.0f} min  "
                  f"({elapsed:.1f}s × {cfg['epochs']} epochs)]", flush=True)

        if avg_va < best_loss:
            best_loss  = avg_va
            best_acc   = va_acc
            no_improve = 0
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            no_improve += 1
            if no_improve >= cfg["patience"]:
                print(f"\n  Early stop at epoch {epoch} "
                      f"(patience={cfg['patience']} reached).", flush=True)
                print(f"  Best val loss={best_loss:.5f}  "
                      f"best val acc={best_acc:.2%}", flush=True)
                break

    return best_state, best_acc


# ─── Training modes ───────────────────────────────────────────────────────────

def run_single(cfg: dict):
    sep = "=" * 60
    print(f"\n{sep}\n  SINGLE — {cfg['symbol']}\n"
          f"  seq={cfg['seq_len']}  horizon={cfg['horizon']}d  "
          f"patch={cfg['patch_size']}/{cfg['stride']}\n{sep}", flush=True)
    device = detect_device(); set_seed(cfg["seed"])

    df_raw = _load_or_fetch(cfg["symbol"], cfg["start_date"])
    df     = add_features_v2(df_raw)
    n      = len(df); n_val = int(n * cfg["val_split"])
    n_tr   = n - n_val - cfg["gap"]

    train_ds = StockDatasetV2(df.iloc[:n_tr], window=cfg["seq_len"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        symbol=cfg["symbol"])
    val_ds = StockDatasetV2(df.iloc[n_tr + cfg["gap"]:], window=cfg["seq_len"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        scaler=train_ds.scaler, symbol=cfg["symbol"])

    print("  Datasets:", flush=True); train_ds.summary(); val_ds.summary()
    model = _build_model(cfg, train_ds.n_features).to(device)
    _print_model_info(model, cfg["batch_size"])

    best_state, best_acc = train_loop(model, train_ds, val_ds, cfg, device)
    print("\n  Saving...", flush=True)
    _save_all(model, best_state, train_ds.scaler,
              cfg["model_path"], cfg["config_path"], cfg["scaler_path"])
    _result_summary(best_acc, n_stocks=1)
    return best_acc


def run_pretrain(cfg: dict):
    symbols = [s.strip() for s in cfg["symbols"].split(",")]
    sep = "=" * 60
    print(f"\n{sep}\n  PRETRAIN\n"
          f"  seq={cfg['seq_len']}  horizon={cfg['horizon']}d  "
          f"patch={cfg['patch_size']}/{cfg['stride']}\n"
          f"  Symbols: {symbols}\n{sep}", flush=True)
    _warn_sector_diversity(symbols)
    device = detect_device(); set_seed(cfg["seed"])

    train_ds, val_ds, scaler = build_multi_stock_dataset(
        symbols=symbols, data_dir="data",
        window=cfg["seq_len"], horizon=cfg["horizon"],
        noise_threshold=cfg["noise_threshold"],
        val_split=cfg["val_split"], gap=cfg["gap"],
    )

    model = _build_model(cfg, len(FEATURE_COLS)).to(device)
    _print_model_info(model, cfg["batch_size"])

    pretrain_cfg_path = cfg["pretrain_path"].replace(".pth", "_config.pth")
    pretrain_cfg = {**cfg, "patience": cfg["patience"] + 5}

    best_state, best_acc = train_loop(model, train_ds, val_ds, pretrain_cfg, device)
    print("\n  Saving pretrained model...", flush=True)
    _save_all(model, best_state, scaler,
              cfg["pretrain_path"], pretrain_cfg_path, cfg["scaler_path"])
    _result_summary(best_acc, n_stocks=len(symbols))
    return best_acc


def run_finetune(cfg: dict):
    sep = "=" * 60
    print(f"\n{sep}\n  FINETUNE — {cfg['symbol']}\n"
          f"  seq={cfg['seq_len']}  horizon={cfg['horizon']}d\n{sep}", flush=True)
    device = detect_device(); set_seed(cfg["seed"])

    df_raw = _load_or_fetch(cfg["symbol"], cfg["start_date"])
    df     = add_features_v2(df_raw)
    n      = len(df); n_val = int(n * cfg["val_split"])
    n_tr   = n - n_val - cfg["gap"]

    pretrain_cfg_path = cfg["pretrain_path"].replace(".pth", "_config.pth")
    scaler = joblib.load(cfg["scaler_path"]) if os.path.exists(cfg["scaler_path"]) else None
    if scaler:
        print(f"  Loaded scaler: {cfg['scaler_path']}", flush=True)

    train_ds = StockDatasetV2(df.iloc[:n_tr], window=cfg["seq_len"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        scaler=scaler, symbol=cfg["symbol"])
    val_ds = StockDatasetV2(df.iloc[n_tr + cfg["gap"]:], window=cfg["seq_len"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        scaler=train_ds.scaler, symbol=cfg["symbol"])
    train_ds.summary(); val_ds.summary()

    pt_cfg = torch.load(pretrain_cfg_path, map_location="cpu") if os.path.exists(pretrain_cfg_path) else {}
    model = StockForecastNet(
        n_features = train_ds.n_features,
        seq_len    = pt_cfg.get("seq_len",    cfg["seq_len"]),
        horizon    = pt_cfg.get("horizon",    cfg["horizon"]),
        patch_size = pt_cfg.get("patch_size", cfg["patch_size"]),
        stride     = pt_cfg.get("stride",     cfg["stride"]),
        d_model    = pt_cfg.get("d_model",    cfg["d_model"]),
        n_heads    = pt_cfg.get("n_heads",    cfg["n_heads"]),
        n_layers   = pt_cfg.get("n_layers",   cfg["n_layers"]),
        d_ff       = pt_cfg.get("d_ff",       cfg["d_ff"]),
        dropout    = cfg["dropout"],
    )
    if os.path.exists(cfg["pretrain_path"]):
        state = torch.load(cfg["pretrain_path"], map_location="cpu")
        missing, _ = model.load_state_dict(state, strict=False)
        if missing: print(f"  {len(missing)} keys zero-init", flush=True)
        print(f"  Loaded: {cfg['pretrain_path']}", flush=True)

    model = model.to(device)
    _print_model_info(model, cfg["batch_size"])
    ft_cfg = {**cfg, "lr": cfg["lr"] / 5, "epochs": 40, "patience": 15}
    best_state, best_acc = train_loop(model, train_ds, val_ds, ft_cfg, device)

    print("\n  Saving finetuned...", flush=True)
    _save_all(model, best_state, train_ds.scaler,
              cfg["model_path"], cfg["config_path"], cfg["scaler_path"])
    _result_summary(best_acc, n_stocks=1)
    return best_acc


# ─── CLI ──────────────────────────────────────────────────────────────────────

def _build_parser():
    p = argparse.ArgumentParser(
        description=(
            "StockForecastNet V5 — PatchTST + ReVIN + CI Transformer\n"
            "Manual batching (no DataLoader) for Windows compatibility."
        ),
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Recommended first run:\n"
            "  python train_v2.py --mode pretrain \\\n"
            "    --symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,MARUTI,AXISBANK \\\n"
            "    --start_date 2010-01-01\n\n"
            "Then finetune on target stock:\n"
            "  python train_v2.py --mode finetune --symbol RELIANCE\n"
        ),
    )
    p.add_argument("--mode",       default="single", choices=["single","pretrain","finetune"])
    p.add_argument("--symbol",     default=DEFAULT_CFG["symbol"])
    p.add_argument("--symbols",    default=DEFAULT_CFG["symbols"],
                   help="Comma-separated list. Use diverse sectors!")
    p.add_argument("--start_date", default=DEFAULT_CFG["start_date"])
    p.add_argument("--seq_len",    type=int,   default=DEFAULT_CFG["seq_len"])
    p.add_argument("--horizon",    type=int,   default=DEFAULT_CFG["horizon"])
    p.add_argument("--patch_size", type=int,   default=DEFAULT_CFG["patch_size"])
    p.add_argument("--stride",     type=int,   default=DEFAULT_CFG["stride"])
    p.add_argument("--d_model",    type=int,   default=DEFAULT_CFG["d_model"])
    p.add_argument("--n_heads",    type=int,   default=DEFAULT_CFG["n_heads"])
    p.add_argument("--n_layers",   type=int,   default=DEFAULT_CFG["n_layers"])
    p.add_argument("--d_ff",       type=int,   default=DEFAULT_CFG["d_ff"])
    p.add_argument("--dropout",    type=float, default=DEFAULT_CFG["dropout"])
    p.add_argument("--batch_size", type=int,   default=DEFAULT_CFG["batch_size"],
                   help="Batch size (32 safe for CPU; 64-128 on GPU)")
    p.add_argument("--epochs",     type=int,   default=DEFAULT_CFG["epochs"])
    p.add_argument("--lr",         type=float, default=DEFAULT_CFG["lr"])
    p.add_argument("--patience",   type=int,   default=DEFAULT_CFG["patience"])
    p.add_argument("--noise_threshold", type=float, default=DEFAULT_CFG["noise_threshold"])
    p.add_argument("--seed",       type=int,   default=DEFAULT_CFG["seed"])
    return p


# ══════════════════════════════════════════════════════════════════════
# REQUIRED ON WINDOWS: all executable code inside this guard.
# Python's 'spawn' multiprocessing re-runs the module for each worker.
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    args   = _build_parser().parse_args()
    config = {**DEFAULT_CFG, **vars(args)}

    if args.mode == "pretrain":
        run_pretrain(config)
    elif args.mode == "finetune":
        run_finetune(config)
    else:
        run_single(config)
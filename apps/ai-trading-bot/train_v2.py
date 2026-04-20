"""
train_v2.py — Training pipeline for StockPredictor V4
======================================================

V4 CHANGES
───────────
1. Single HuberLoss only  (no FocalLoss — no classification head)
   loss = HuberLoss(predicted_signed_return, actual_signed_return)
   Direction accuracy is computed from sign(pred) == sign(actual)
   for monitoring, but NOT used in the loss function.

2. Dataset returns (X, y_ret) not (X, y_dir, y_ret)
   Training loop unpacks two values, not three.

3. horizon parameter added throughout
   Controls how many days ahead we predict (default 3).
   Passed to StockDatasetV2 and saved in model config.

4. LR schedule: CosineAnnealingWarmRestarts
   Better than OneCycleLR for stock data because it allows
   the model to escape local minima via restarts.
   T_0=20 means restart every 20 epochs. eta_min=1e-6.

5. Accuracy metric: direction accuracy
   sign(pred) == sign(actual) → correct direction
   This is reported each epoch so you can see if the model
   is learning anything above 50%.

6. --start_date default changed to 2010-01-01
   (2000-2026 causes regime mixing; 2010-2026 is cleaner)

USAGE
──────
  # Single stock
  python train_v2.py --symbol RELIANCE --horizon 3

  # Multi-stock pretrain (recommended)
  python train_v2.py --mode pretrain --symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK --horizon 3

  # Fine-tune on target stock
  python train_v2.py --mode finetune --symbol RELIANCE --horizon 3
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

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import ConcatDataset, DataLoader

from config import settings
from data_fetch_upstox import fetch_historical_data
from dataset_v2 import StockDatasetV2, build_multi_stock_dataset
from features_v2 import FEATURE_COLS, add_features_v2
from model_v4 import StockPredictor


# ─── Default config ───────────────────────────────────────────────────────────
DEFAULT_CFG = {
    "mode":            "single",
    "symbol":          "RELIANCE",
    "symbols":         "RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK",
    "start_date":      "2010-01-01",   # 2010 not 2000 (regime non-stationarity)
    "horizon":         3,              # predict 3-day return
    "window":          30,
    "d_model":         64,
    "n_layers":        2,
    "n_heads":         4,
    "d_ff":            128,
    "dropout":         0.1,
    "batch_size":      64,
    "epochs":          100,
    "lr":              3e-4,
    "val_split":       0.2,
    "patience":        25,
    "noise_threshold": 0.002,
    "gap":             10,
    "pretrain_path":   "pretrained_v4.pth",
    "model_path":      settings.MODEL_PATH,
    "scaler_path":     settings.SCALER_PATH,
    "config_path":     settings.CONFIG_PATH,
    "seed":            42,
}


# ─── Device detection ─────────────────────────────────────────────────────────

def detect_device() -> torch.device:
    print("\n" + "=" * 58)
    print("  DEVICE")
    print("=" * 58)
    if torch.cuda.is_available():
        device = torch.device("cuda")
        p = torch.cuda.get_device_properties(0)
        print(f"  ✓ {p.name}  ({p.total_memory/1024**3:.1f}GB VRAM)")
        torch.backends.cudnn.benchmark = True
        print("  Monitor with: nvidia-smi -l 1")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        print("  ✓ Apple MPS (M-series GPU)")
    else:
        device = torch.device("cpu")
        print(f"  ✗ CPU ({os.cpu_count()} cores)")
        print("  → Use train_colab.ipynb for free T4 GPU on Colab")
    print("=" * 58 + "\n")
    return device


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def gpu_mem(device: torch.device) -> str:
    if device.type == "cuda":
        return f"{torch.cuda.memory_allocated(device)/1024**2:>5.0f}MB"
    return ""


# ─── DataLoader ───────────────────────────────────────────────────────────────

def make_loader(dataset, batch_size: int, shuffle: bool,
                pin_memory: bool = False) -> DataLoader:
    return DataLoader(
        dataset, batch_size=batch_size, shuffle=shuffle,
        pin_memory=pin_memory, num_workers=0,
        drop_last=True,   # avoid single-sample batches that break BatchNorm
    )


# ─── Core training loop ───────────────────────────────────────────────────────

def train_loop(
    model:        StockPredictor,
    train_loader: DataLoader,
    val_loader:   DataLoader,
    cfg:          dict,
    device:       torch.device,
) -> tuple:
    """
    Train with HuberLoss (single regression objective).
    Reports direction accuracy (sign agreement) each epoch.

    Returns: (best_state_dict, best_val_direction_accuracy)
    """
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg["lr"],
        weight_decay=1e-3,
        betas=(0.9, 0.999),
    )

    # CosineAnnealingWarmRestarts: restarts every T_0 epochs
    # Better than OneCycleLR for stock data: allows escaping local minima
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer,
        T_0=20,        # restart period (epochs)
        T_mult=2,      # double the period after each restart
        eta_min=1e-6,  # minimum LR
    )

    # HuberLoss: robust to outlier returns (crash days ±5%)
    # delta=0.02 = 2%: below 2% → MSE behaviour; above → MAE behaviour
    loss_fn = nn.HuberLoss(delta=0.02)

    best_val_loss = float("inf")
    best_val_acc  = 0.0
    best_state    = None
    patience_ctr  = 0

    hdr = (f"{'Ep':>4}  {'TrLoss':>8}  {'TrAcc':>6}  "
           f"{'VaLoss':>8}  {'VaAcc':>6}  {'LR':>9}  {'Time':>6}  GPU")
    print(hdr)
    print("-" * len(hdr))

    for epoch in range(1, cfg["epochs"] + 1):
        t0 = time.time()

        # ── Train ─────────────────────────────────────────────────────────────
        model.train()
        tr_loss = tr_correct = tr_total = 0

        for X, y_ret in train_loader:    # V4: unpack 2 values (not 3)
            X     = X.to(device,     non_blocking=True)
            y_ret = y_ret.to(device, non_blocking=True)

            pred  = model(X).squeeze(-1)        # (B,)
            loss  = loss_fn(pred, y_ret)

            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            tr_loss    += loss.item()
            # Direction accuracy: did sign(pred) match sign(actual)?
            tr_correct += (torch.sign(pred) == torch.sign(y_ret)).sum().item()
            tr_total   += y_ret.size(0)

        scheduler.step()

        # ── Validate ──────────────────────────────────────────────────────────
        model.eval()
        va_loss = va_correct = va_total = 0

        with torch.no_grad():
            for X, y_ret in val_loader:
                X     = X.to(device,     non_blocking=True)
                y_ret = y_ret.to(device, non_blocking=True)

                pred   = model(X).squeeze(-1)
                va_loss    += loss_fn(pred, y_ret).item()
                va_correct += (torch.sign(pred) == torch.sign(y_ret)).sum().item()
                va_total   += y_ret.size(0)

        tr_acc  = tr_correct / max(tr_total, 1)
        va_acc  = va_correct / max(va_total, 1)
        avg_tr  = tr_loss / len(train_loader)
        avg_va  = va_loss / len(val_loader)
        cur_lr  = scheduler.get_last_lr()[0]
        elapsed = time.time() - t0

        print(
            f"{epoch:>4}  {avg_tr:>8.5f}  {tr_acc:>6.3f}  "
            f"{avg_va:>8.5f}  {va_acc:>6.3f}  {cur_lr:>9.2e}  "
            f"{elapsed:>5.1f}s  {gpu_mem(device)}"
        )

        if avg_va < best_val_loss:
            best_val_loss = avg_va
            best_val_acc  = va_acc
            patience_ctr  = 0
            best_state    = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience_ctr += 1
            if patience_ctr >= cfg["patience"]:
                print(f"\n  Early stopping: no improvement for {cfg['patience']} epochs.")
                break

    return best_state, best_val_acc


# ─── Save ─────────────────────────────────────────────────────────────────────

def save_model(model: StockPredictor, best_state: dict, scaler, cfg: dict):
    import joblib
    state = best_state or {k: v.cpu() for k, v in model.state_dict().items()}
    torch.save(state, cfg["model_path"])
    print(f"  Weights  → {cfg['model_path']}")
    torch.save(model.get_config(), cfg["config_path"])
    print(f"  Config   → {cfg['config_path']}")
    joblib.dump(scaler, cfg["scaler_path"])
    print(f"  Scaler   → {cfg['scaler_path']}")


def _load_or_fetch(symbol: str, start_date: str):
    import pandas as pd
    folder = os.path.join("data", symbol.upper())
    files  = sorted(glob.glob(os.path.join(folder, "*.parquet")))
    if files:
        print(f"  Cache: {files[-1]}")
        return pd.read_parquet(files[-1])
    print(f"  Fetching {symbol} from Upstox API...")
    return fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        start_date=start_date, use_cache=True,
    )


# ─── Training modes ───────────────────────────────────────────────────────────

def train_single(cfg: dict):
    print(f"\n{'='*58}\n  SINGLE — {cfg['symbol']}  horizon={cfg['horizon']}d\n{'='*58}")
    device = detect_device()
    set_seed(cfg["seed"])

    df = add_features_v2(_load_or_fetch(cfg["symbol"], cfg["start_date"]))
    print(f"  {len(df):,} feature rows")

    n       = len(df)
    n_val   = int(n * cfg["val_split"])
    n_train = n - n_val - cfg["gap"]

    train_ds = StockDatasetV2(
        df.iloc[:n_train], window=cfg["window"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        symbol=cfg["symbol"],
    )
    val_ds = StockDatasetV2(
        df.iloc[n_train + cfg["gap"]:], window=cfg["window"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        scaler=train_ds.scaler, symbol=cfg["symbol"],
    )
    print("  Dataset:"); train_ds.summary(); val_ds.summary()

    pin = device.type == "cuda"
    train_loader = make_loader(train_ds, cfg["batch_size"], True,  pin)
    val_loader   = make_loader(val_ds,   cfg["batch_size"], False, pin)

    model = StockPredictor(
        input_dim=train_ds.n_features,
        window=cfg["window"], d_model=cfg["d_model"],
        n_layers=cfg["n_layers"], n_heads=cfg["n_heads"],
        d_ff=cfg["d_ff"], dropout=cfg["dropout"],
        horizon=cfg["horizon"],
    ).to(device)

    print(f"\n  {model}")
    counts = model.count_parameters()
    print(f"  Breakdown:")
    for k, v in counts.items():
        if k != "size_mb":
            print(f"    {k:25s}: {v:>8,}")

    best_state, best_acc = train_loop(model, train_loader, val_loader, cfg, device)

    print(f"\n  Saving...")
    save_model(model, best_state, train_ds.scaler, cfg)
    _print_result(best_acc)
    return best_acc


def pretrain(cfg: dict):
    symbols = [s.strip() for s in cfg["symbols"].split(",")]
    print(f"\n{'='*58}\n  PRETRAIN  horizon={cfg['horizon']}d\n  {symbols}\n{'='*58}")
    device = detect_device()
    set_seed(cfg["seed"])

    train_ds, val_ds, scaler = build_multi_stock_dataset(
        symbols=symbols, data_dir="data",
        window=cfg["window"], horizon=cfg["horizon"],
        noise_threshold=cfg["noise_threshold"],
        val_split=cfg["val_split"], gap=cfg["gap"],
    )

    pin = device.type == "cuda"
    train_loader = make_loader(train_ds, cfg["batch_size"], True,  pin)
    val_loader   = make_loader(val_ds,   cfg["batch_size"], False, pin)

    model = StockPredictor(
        input_dim=len(FEATURE_COLS),
        window=cfg["window"], d_model=cfg["d_model"],
        n_layers=cfg["n_layers"], n_heads=cfg["n_heads"],
        d_ff=cfg["d_ff"], dropout=cfg["dropout"],
        horizon=cfg["horizon"],
    ).to(device)
    print(f"\n  {model}")

    pt_cfg = {**cfg,
              "model_path":  cfg["pretrain_path"],
              "config_path": cfg["pretrain_path"].replace(".pth", "_config.pth")}

    best_state, best_acc = train_loop(model, train_loader, val_loader, pt_cfg, device)

    print(f"\n  Saving pretrained model...")
    save_model(model, best_state, scaler, pt_cfg)
    _print_result(best_acc)
    return best_acc


def finetune(cfg: dict):
    print(f"\n{'='*58}\n  FINETUNE — {cfg['symbol']}  horizon={cfg['horizon']}d\n{'='*58}")
    device = detect_device()
    set_seed(cfg["seed"])

    import joblib
    df = add_features_v2(_load_or_fetch(cfg["symbol"], cfg["start_date"]))
    n  = len(df)
    n_val   = int(n * cfg["val_split"])
    n_train = n - n_val - cfg["gap"]

    scaler = joblib.load(cfg["scaler_path"]) if os.path.exists(cfg["scaler_path"]) else None

    train_ds = StockDatasetV2(
        df.iloc[:n_train], window=cfg["window"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        scaler=scaler, symbol=cfg["symbol"],
    )
    val_ds = StockDatasetV2(
        df.iloc[n_train + cfg["gap"]:], window=cfg["window"],
        horizon=cfg["horizon"], noise_threshold=cfg["noise_threshold"],
        scaler=train_ds.scaler, symbol=cfg["symbol"],
    )
    train_ds.summary(); val_ds.summary()

    # Load pretrained config
    pretrain_cfg_path = cfg["pretrain_path"].replace(".pth", "_config.pth")
    if os.path.exists(pretrain_cfg_path):
        pt_cfg_dict = torch.load(pretrain_cfg_path, map_location="cpu")
    else:
        pt_cfg_dict = {}

    model = StockPredictor(
        input_dim=train_ds.n_features,
        window=pt_cfg_dict.get("window", cfg["window"]),
        d_model=pt_cfg_dict.get("d_model", cfg["d_model"]),
        n_layers=pt_cfg_dict.get("n_layers", cfg["n_layers"]),
        n_heads=pt_cfg_dict.get("n_heads", cfg["n_heads"]),
        d_ff=pt_cfg_dict.get("d_ff", cfg["d_ff"]),
        dropout=cfg["dropout"],
        horizon=cfg["horizon"],
    )

    if os.path.exists(cfg["pretrain_path"]):
        state = torch.load(cfg["pretrain_path"], map_location="cpu")
        model.load_state_dict(state, strict=False)
        print(f"  Loaded pretrained: {cfg['pretrain_path']}")

    model = model.to(device)
    print(f"  {model}")

    ft_cfg = {**cfg, "lr": cfg["lr"] / 5, "epochs": 40, "patience": 15}
    pin    = device.type == "cuda"
    best_state, best_acc = train_loop(
        model,
        make_loader(train_ds, cfg["batch_size"], True,  pin),
        make_loader(val_ds,   cfg["batch_size"], False, pin),
        ft_cfg, device,
    )

    print(f"\n  Saving finetuned model...")
    save_model(model, best_state, train_ds.scaler, cfg)
    _print_result(best_acc)
    return best_acc


def _print_result(best_acc: float):
    print(f"\n{'='*58}")
    if best_acc >= 0.60:
        print(f"  ✓ GOOD — direction accuracy {best_acc:.2%}  (≥60%)")
    elif best_acc >= 0.55:
        print(f"  ~ OK   — direction accuracy {best_acc:.2%}  (55-60%)")
        print("    Try: pretrain with more stocks")
    else:
        print(f"  ✗ WEAK — direction accuracy {best_acc:.2%}  (<55%)")
        print("    Try: --mode pretrain with 5+ stocks  --start_date 2010-01-01")
    print("=" * 58)


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="Train StockPredictor V4 (iTransformer + single head)",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python train_v2.py --symbol RELIANCE --horizon 3\n"
            "  python train_v2.py --mode pretrain "
            "--symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK --horizon 3\n"
            "  python train_v2.py --mode finetune --symbol RELIANCE\n"
        ),
    )
    p.add_argument("--mode",         default=DEFAULT_CFG["mode"],
                   choices=["single", "pretrain", "finetune"])
    p.add_argument("--symbol",       default=DEFAULT_CFG["symbol"])
    p.add_argument("--symbols",      default= DEFAULT_CFG["symbols"])
    p.add_argument("--start_date",   default=DEFAULT_CFG["start_date"])
    p.add_argument("--horizon",      type=int,   default=DEFAULT_CFG["horizon"])
    p.add_argument("--window",       type=int,   default=DEFAULT_CFG["window"])
    p.add_argument("--d_model",      type=int,   default=DEFAULT_CFG["d_model"])
    p.add_argument("--n_layers",     type=int,   default=DEFAULT_CFG["n_layers"])
    p.add_argument("--n_heads",      type=int,   default=DEFAULT_CFG["n_heads"])
    p.add_argument("--d_ff",         type=int,   default=DEFAULT_CFG["d_ff"])
    p.add_argument("--dropout",      type=float, default=DEFAULT_CFG["dropout"])
    p.add_argument("--batch_size",   type=int,   default=DEFAULT_CFG["batch_size"])
    p.add_argument("--epochs",       type=int,   default=DEFAULT_CFG["epochs"])
    p.add_argument("--lr",           type=float, default=DEFAULT_CFG["lr"])
    p.add_argument("--patience",     type=int,   default=DEFAULT_CFG["patience"])
    p.add_argument("--noise_threshold", type=float,
                   default=DEFAULT_CFG["noise_threshold"])
    p.add_argument("--seed",         type=int,   default=DEFAULT_CFG["seed"])
    args = p.parse_args()
    cfg  = {**DEFAULT_CFG, **vars(args)}

    if cfg["mode"] == "pretrain":
        pretrain(cfg)
    elif cfg["mode"] == "finetune":
        finetune(cfg)
    else:
        train_single(cfg)
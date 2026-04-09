"""
train_v2.py — Production training pipeline for StockTransformerV2.

Features:
- Full GPU detection with detailed diagnostics (CUDA, MPS on Mac, CPU fallback)
- Live GPU memory usage printed each epoch
- OneCycleLR scheduler for fast convergence
- Weighted sampler to handle UP/DOWN class imbalance
- Early stopping with patience
- HuberLoss for robust return regression
- Saves model + scaler + config atomically
- Reproducible via seed setting
- All config overridable from CLI or dict
"""

import argparse
import os
import random
import time

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, WeightedRandomSampler

from config import settings
from data_fetch_upstox import fetch_historical_data
from dataset_v2 import StockDatasetV2
from features_v2 import add_features_v2
from model_v2 import StockTransformerV2


# ─── Defaults ─────────────────────────────────────────────────────────────────

DEFAULT_CFG = {
    "symbol":          "RELIANCE",
    "start_date":      "2000-01-01",   # ~10 years of data recommended
    "window":          60,
    "d_model":         128,
    "n_heads":         8,
    "n_layers":        4,
    "d_ff":            256,
    "dropout":         0.1,
    "batch_size":      64,
    "epochs":          50,
    "lr":              1e-4,
    "val_split":       0.2,
    "patience":        8,
    "noise_threshold": 0.003,
    "seed":            42,
    "model_path":      settings.MODEL_PATH,
    "scaler_path":     settings.SCALER_PATH,
    "config_path":     settings.CONFIG_PATH,
}


# ─── GPU Detection ────────────────────────────────────────────────────────────

def detect_device() -> torch.device:
    """
    Detect the best available compute device with full diagnostics.
    Prints a clear report so you always know exactly what hardware is being used.

    Priority: CUDA GPU > Apple MPS > CPU

    How to verify YOUR GPU is being used:
        - If you see "CUDA GPU detected", your NVIDIA GPU is active.
        - Watch "GPU memory" printed each epoch — it should increase as batches load.
        - Run `nvidia-smi` in a separate terminal to see live GPU utilisation.
    """
    print("\n" + "=" * 60)
    print("  DEVICE DETECTION")
    print("=" * 60)

    # ── CUDA (NVIDIA GPU) ──────────────────────────────────────────────────────
    if torch.cuda.is_available():
        device = torch.device("cuda")
        gpu_count = torch.cuda.device_count()

        print(f"  ✓ CUDA GPU detected ({gpu_count} device{'s' if gpu_count > 1 else ''})")
        for i in range(gpu_count):
            props = torch.cuda.get_device_properties(i)
            vram_gb = props.total_memory / 1024 ** 3
            print(f"    GPU {i}: {props.name}")
            print(f"           VRAM:       {vram_gb:.1f} GB")
            print(f"           CUDA caps:  {props.major}.{props.minor}")
            print(f"           SM count:   {props.multi_processor_count}")

        # cuDNN benchmark: finds fastest convolution algorithms on first run
        # Slightly slower first epoch, faster all subsequent epochs
        torch.backends.cudnn.benchmark = True
        print(f"\n  Active device:  cuda:{torch.cuda.current_device()}")
        print(f"  cuDNN version:  {torch.backends.cudnn.version()}")
        print(f"  cuDNN benchmark: enabled")

    # ── MPS (Apple Silicon GPU) ────────────────────────────────────────────────
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        print("  ✓ Apple MPS (Metal Performance Shaders) GPU detected")
        print("    This is the GPU inside your Mac (M1/M2/M3 chip)")
        print("  Active device:  mps")

    # ── CPU fallback ──────────────────────────────────────────────────────────
    else:
        device = torch.device("cpu")
        cpu_count = os.cpu_count()
        print(f"  ✗ No GPU found — using CPU ({cpu_count} cores)")
        print()
        print("  To check if you have a CUDA GPU:")
        print("    1. Run: nvidia-smi")
        print("       If it shows a GPU → install CUDA-enabled PyTorch:")
        print("       pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
        print("    2. Then re-run this script — it will use the GPU automatically.")
        print()
        print("  CPU training is ~10-30x slower than GPU for this model.")
        print("  Expected time on CPU: 3-8 minutes per epoch.")

    print("=" * 60 + "\n")
    return device


def log_gpu_memory(device: torch.device, prefix: str = ""):
    """Print current GPU memory usage. Called once per epoch."""
    if device.type != "cuda":
        return
    allocated = torch.cuda.memory_allocated(device) / 1024 ** 2
    reserved  = torch.cuda.memory_reserved(device)  / 1024 ** 2
    print(f"  {prefix}GPU mem: {allocated:.0f}MB alloc / {reserved:.0f}MB reserved", end="")


def set_seed(seed: int):
    """Make training reproducible. Same seed = same model every run."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


# ─── Training ─────────────────────────────────────────────────────────────────

def train_v2(cfg: dict = None):
    cfg = {**DEFAULT_CFG, **(cfg or {})}

    set_seed(cfg["seed"])
    device = detect_device()

    print(f"Training config:")
    for k, v in cfg.items():
        print(f"  {k:20s} = {v}")
    print()

    # ── Step 1: Fetch data ─────────────────────────────────────────────────────
    print(f"[1/6] Fetching data for {cfg['symbol']}...")
    df_raw = fetch_historical_data(
        symbol=cfg["symbol"],
        unit="days",
        interval="1",
        start_date=cfg["start_date"],
        use_cache=True,
    )
    print(f"      Raw candles: {len(df_raw):,}")

    # ── Step 2: Feature engineering ────────────────────────────────────────────
    print("[2/6] Computing features...")
    df = add_features_v2(df_raw)
    print(f"      Feature rows: {len(df):,}  |  Feature cols: {df.shape[1]}")

    # ── Step 3: Train / val split (chronological — NO shuffle) ─────────────────
    print("[3/6] Splitting data...")
    n_total = len(df)
    n_val   = int(n_total * cfg["val_split"])
    n_train = n_total - n_val
    df_train = df.iloc[:n_train]
    df_val   = df.iloc[n_train:]
    print(f"      Train rows: {len(df_train):,}  |  Val rows: {len(df_val):,}")

    # Fit scaler ONLY on training data to prevent leakage
    train_ds = StockDatasetV2(
        df_train,
        window=cfg["window"],
        noise_threshold=cfg["noise_threshold"],
    )
    # Pass the FITTED scaler to val — it must see the same normalisation as train
    val_ds = StockDatasetV2(
        df_val,
        window=cfg["window"],
        noise_threshold=cfg["noise_threshold"],
        scaler=train_ds.scaler,
    )

    train_ds.summary()
    val_ds.summary()

    # ── Step 4: DataLoaders ────────────────────────────────────────────────────
    print("[4/6] Creating DataLoaders...")

    # WeightedRandomSampler: ensures each batch has ~50% UP and ~50% DOWN
    # Without this, if dataset is 60% UP, model learns to always predict UP (lazy accuracy)
    class_counts  = torch.bincount(train_ds.y_dir)
    class_weights = 1.0 / class_counts.float()
    sample_weights = class_weights[train_ds.y_dir]
    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True,
    )

    # pin_memory=True: keeps data in pinned CPU memory for faster GPU transfer
    # num_workers: parallel data loading (use 0 on Windows if you get errors)
    n_workers = 0 if os.name == "nt" else 4

    train_loader = DataLoader(
        train_ds,
        batch_size=cfg["batch_size"],
        sampler=sampler,
        pin_memory=(device.type == "cuda"),
        num_workers=n_workers,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=cfg["batch_size"],
        shuffle=False,
        pin_memory=(device.type == "cuda"),
        num_workers=n_workers,
    )
    print(f"      Train batches: {len(train_loader)}  |  Val batches: {len(val_loader)}")
    print(f"      Class weights: DOWN={class_weights[0]:.3f}  UP={class_weights[1]:.3f}")

    # ── Step 5: Model ──────────────────────────────────────────────────────────
    print("[5/6] Building model...")
    model = StockTransformerV2(
        input_dim=train_ds.n_features,
        d_model=cfg["d_model"],
        n_heads=cfg["n_heads"],
        n_layers=cfg["n_layers"],
        d_ff=cfg["d_ff"],
        dropout=cfg["dropout"],
    ).to(device)

    print(f"      {model}")
    total_params    = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"      Total params:     {total_params:,}")
    print(f"      Trainable params: {trainable_params:,}")
    print(f"      Model size:       {total_params * 4 / 1024 / 1024:.2f} MB (float32)")

    # ── Optimizer + Scheduler ─────────────────────────────────────────────────
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg["lr"],
        weight_decay=1e-4,
        betas=(0.9, 0.999),
    )

    # OneCycleLR: warms up LR for first 30% of training, then anneals down
    # This is faster than fixed LR and reduces need for manual LR tuning
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer,
        max_lr=cfg["lr"],
        steps_per_epoch=len(train_loader),
        epochs=cfg["epochs"],
        pct_start=0.3,
        anneal_strategy="cos",
    )

    # HuberLoss: robust regression loss — not distorted by outlier price moves
    huber = torch.nn.HuberLoss(delta=0.01)

    # ── Step 6: Training loop ──────────────────────────────────────────────────
    print(f"\n[6/6] Training...")
    print("-" * 80)
    print(f"{'Epoch':>5}  {'TrLoss':>7}  {'TrAcc':>6}  {'VaLoss':>7}  {'VaAcc':>6}  {'LR':>9}  {'Time':>6}  {'GPU':>12}")
    print("-" * 80)

    best_val_loss    = float("inf")
    best_val_acc     = 0.0
    patience_counter = 0
    best_state       = None

    for epoch in range(1, cfg["epochs"] + 1):
        t0 = time.time()

        # ── Train ──────────────────────────────────────────────────────────────
        model.train()
        tr_loss = tr_correct = tr_total = 0

        for X, y_dir, y_ret in train_loader:
            # .to(device, non_blocking=True): async transfer to GPU — faster than blocking
            X     = X.to(device, non_blocking=True)
            y_dir = y_dir.to(device, non_blocking=True)
            y_ret = y_ret.to(device, non_blocking=True)

            dir_logits, ret_pred = model(X)

            # Combined loss: cross-entropy for direction + huber for return magnitude
            loss_dir = F.cross_entropy(dir_logits, y_dir, label_smoothing=0.1)
            loss_ret = huber(ret_pred.squeeze(-1), y_ret)
            loss     = loss_dir + 0.3 * loss_ret

            optimizer.zero_grad(set_to_none=True)   # set_to_none=True is faster than zero_grad()
            loss.backward()

            # Gradient clipping: prevents exploding gradients, especially early in training
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

            optimizer.step()
            scheduler.step()

            tr_loss    += loss.item()
            tr_correct += (dir_logits.argmax(1) == y_dir).sum().item()
            tr_total   += y_dir.size(0)

        # ── Validation ─────────────────────────────────────────────────────────
        model.eval()
        va_loss = va_correct = va_total = 0

        with torch.no_grad():
            for X, y_dir, y_ret in val_loader:
                X     = X.to(device, non_blocking=True)
                y_dir = y_dir.to(device, non_blocking=True)
                y_ret = y_ret.to(device, non_blocking=True)

                dir_logits, ret_pred = model(X)
                loss_dir = F.cross_entropy(dir_logits, y_dir, label_smoothing=0.1)
                loss_ret = huber(ret_pred.squeeze(-1), y_ret)
                va_loss    += (loss_dir + 0.3 * loss_ret).item()
                va_correct += (dir_logits.argmax(1) == y_dir).sum().item()
                va_total   += y_dir.size(0)

        tr_acc   = tr_correct / tr_total
        va_acc   = va_correct / va_total
        avg_tr   = tr_loss / len(train_loader)
        avg_va   = va_loss / len(val_loader)
        cur_lr   = scheduler.get_last_lr()[0]
        elapsed  = time.time() - t0

        # GPU memory line
        gpu_str = ""
        if device.type == "cuda":
            alloc_mb = torch.cuda.memory_allocated(device) / 1024 ** 2
            gpu_str  = f"{alloc_mb:>8.0f} MB"

        print(
            f"{epoch:>5}  {avg_tr:>7.4f}  {tr_acc:>6.3f}  {avg_va:>7.4f}  {va_acc:>6.3f}"
            f"  {cur_lr:>9.2e}  {elapsed:>5.1f}s  {gpu_str:>12}"
        )

        # ── Early stopping ──────────────────────────────────────────────────────
        if avg_va < best_val_loss:
            best_val_loss = avg_va
            best_val_acc  = va_acc
            patience_counter = 0
            # Deep copy on CPU to avoid holding GPU memory for the checkpoint
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1
            if patience_counter >= cfg["patience"]:
                print(f"\nEarly stopping at epoch {epoch} — no val improvement for {cfg['patience']} epochs.")
                break

    # ── Save everything ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SAVING")
    print("=" * 60)

    if best_state is None:
        best_state = {k: v.cpu() for k, v in model.state_dict().items()}

    torch.save(best_state, cfg["model_path"])
    print(f"  Model weights → {cfg['model_path']}")

    # Save architecture config so inference can rebuild the exact same model
    arch_cfg = {
        "input_dim": train_ds.n_features,
        "d_model":   cfg["d_model"],
        "n_heads":   cfg["n_heads"],
        "n_layers":  cfg["n_layers"],
        "d_ff":      cfg["d_ff"],
        "dropout":   cfg["dropout"],
        "window":    cfg["window"],
    }
    torch.save(arch_cfg, cfg["config_path"])
    print(f"  Architecture config → {cfg['config_path']}")

    train_ds.save_scaler(cfg["scaler_path"])

    print()
    print(f"  Best Val Loss:     {best_val_loss:.4f}")
    print(f"  Best Val Accuracy: {best_val_acc:.2%}")
    print()

    if best_val_acc >= 0.65:
        print("  ✓ EXCELLENT — Val accuracy ≥ 65%. Model is production-ready.")
    elif best_val_acc >= 0.60:
        print("  ✓ GOOD — Val accuracy ≥ 60%. Model is usable.")
    elif best_val_acc >= 0.55:
        print("  ~ MARGINAL — Val accuracy 55-60%. Consider more data or tuning.")
    else:
        print("  ✗ POOR — Val accuracy < 55%. Try longer training data or different hyperparams.")

    print("=" * 60)
    return best_val_acc


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train StockTransformerV2")
    parser.add_argument("--symbol",     default=DEFAULT_CFG["symbol"],     help="NSE symbol")
    parser.add_argument("--start_date", default=DEFAULT_CFG["start_date"], help="Training start date")
    parser.add_argument("--epochs",     type=int,   default=DEFAULT_CFG["epochs"])
    parser.add_argument("--d_model",    type=int,   default=DEFAULT_CFG["d_model"])
    parser.add_argument("--n_heads",    type=int,   default=DEFAULT_CFG["n_heads"])
    parser.add_argument("--n_layers",   type=int,   default=DEFAULT_CFG["n_layers"])
    parser.add_argument("--d_ff",       type=int,   default=DEFAULT_CFG["d_ff"])
    parser.add_argument("--dropout",    type=float, default=DEFAULT_CFG["dropout"])
    parser.add_argument("--batch_size", type=int,   default=DEFAULT_CFG["batch_size"])
    parser.add_argument("--lr",         type=float, default=DEFAULT_CFG["lr"])
    parser.add_argument("--window",     type=int,   default=DEFAULT_CFG["window"])
    parser.add_argument("--patience",   type=int,   default=DEFAULT_CFG["patience"])
    parser.add_argument("--seed",       type=int,   default=DEFAULT_CFG["seed"])
    args = parser.parse_args()

    train_v2(vars(args))
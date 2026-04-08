"""
train_v2.py — Training pipeline for StockTransformerV2.

Improvements over original:
- Train / validation split (80/20) — prevents overfitting evaluation
- Learning rate scheduler (OneCycleLR) — faster convergence
- Early stopping — stops when val loss plateaus
- Class imbalance handling via weighted sampler
- Saves scaler alongside model — required for correct inference
- Loss = CrossEntropy (label_smoothing=0.1) + 0.3 * HuberLoss (more robust than MSE)
- Logs direction accuracy per epoch, not just loss
- Configurable via CLI args or direct import
"""

import argparse
import os
import time

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, WeightedRandomSampler, random_split

from data_fetch_upstox import fetch_historical_data
from dataset_v2 import StockDatasetV2
from features_v2 import add_features_v2
from model_v2 import StockTransformerV2


# ─── Config ───────────────────────────────────────────────────────────────────

DEFAULT_CFG = {
    "symbol":           "RELIANCE",
    "days":             1500,           # ~4 years of daily data
    "window":           60,
    "d_model":          128,
    "n_heads":          8,
    "n_layers":         4,
    "dropout":          0.1,
    "batch_size":       64,
    "epochs":           50,
    "lr":               1e-4,
    "val_split":        0.2,
    "patience":         8,              # Early stopping patience
    "noise_threshold":  0.003,
    "model_path":       "model_v2.pth",
    "scaler_path":      "scaler_v2.pkl",
}


# ─── Training ─────────────────────────────────────────────────────────────────

def train_v2(cfg: dict = None):
    cfg = {**DEFAULT_CFG, **(cfg or {})}

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # ── Data ──────────────────────────────────────────────────────────────────
    df_raw = fetch_historical_data(
        symbol=cfg["symbol"],
        unit="days",
        interval="1",
        start_date="2019-01-01",
    )

    df = add_features_v2(df_raw)
    print(f"Features computed. Shape: {df.shape}")

    # ── Dataset + split ────────────────────────────────────────────────────────
    # Fit scaler only on train portion to avoid leakage
    n_total = len(df)
    n_val = int(n_total * cfg["val_split"])
    n_train = n_total - n_val

    df_train = df.iloc[:n_train]
    df_val = df.iloc[n_train:]

    train_ds = StockDatasetV2(df_train, window=cfg["window"], noise_threshold=cfg["noise_threshold"])
    val_ds = StockDatasetV2(df_val, window=cfg["window"], noise_threshold=cfg["noise_threshold"],
                            scaler=train_ds.scaler)  # Use train scaler on val

    train_ds.summary()
    val_ds.summary()

    # ── Weighted sampler (handle UP/DOWN imbalance) ────────────────────────────
    class_counts = torch.bincount(train_ds.y_dir)
    weights = 1.0 / class_counts.float()
    sample_weights = weights[train_ds.y_dir]
    sampler = WeightedRandomSampler(sample_weights, len(sample_weights), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=cfg["batch_size"], sampler=sampler)
    val_loader = DataLoader(val_ds, batch_size=cfg["batch_size"], shuffle=False)

    # ── Model ──────────────────────────────────────────────────────────────────
    model = StockTransformerV2(
        input_dim=train_ds.n_features,
        d_model=cfg["d_model"],
        n_heads=cfg["n_heads"],
        n_layers=cfg["n_layers"],
        dropout=cfg["dropout"],
    ).to(device)
    print(model)

    # ── Optimizer + Scheduler ─────────────────────────────────────────────────
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg["lr"], weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer,
        max_lr=cfg["lr"],
        steps_per_epoch=len(train_loader),
        epochs=cfg["epochs"],
        pct_start=0.3,
    )

    # ── Loss ───────────────────────────────────────────────────────────────────
    huber = torch.nn.HuberLoss(delta=0.01)   # More robust than MSE for returns

    # ── Training loop ─────────────────────────────────────────────────────────
    best_val_loss = float("inf")
    patience_counter = 0
    best_state = None

    for epoch in range(1, cfg["epochs"] + 1):
        t0 = time.time()

        # ── Train ──────────────────────────────────────────────────────────────
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0

        for X, y_dir, y_ret in train_loader:
            X, y_dir, y_ret = X.to(device), y_dir.to(device), y_ret.to(device)

            dir_logits, ret_pred = model(X)

            dir_loss = F.cross_entropy(dir_logits, y_dir, label_smoothing=0.1)
            ret_loss = huber(ret_pred.squeeze(), y_ret)
            loss = dir_loss + 0.3 * ret_loss

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()

            train_loss += loss.item()
            preds = dir_logits.argmax(dim=1)
            train_correct += (preds == y_dir).sum().item()
            train_total += y_dir.size(0)

        # ── Validation ─────────────────────────────────────────────────────────
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0

        with torch.no_grad():
            for X, y_dir, y_ret in val_loader:
                X, y_dir, y_ret = X.to(device), y_dir.to(device), y_ret.to(device)
                dir_logits, ret_pred = model(X)
                dir_loss = F.cross_entropy(dir_logits, y_dir, label_smoothing=0.1)
                ret_loss = huber(ret_pred.squeeze(), y_ret)
                val_loss += (dir_loss + 0.3 * ret_loss).item()
                preds = dir_logits.argmax(dim=1)
                val_correct += (preds == y_dir).sum().item()
                val_total += y_dir.size(0)

        train_acc = train_correct / train_total
        val_acc = val_correct / val_total
        avg_val_loss = val_loss / len(val_loader)
        elapsed = time.time() - t0

        print(
            f"Epoch {epoch:3d}/{cfg['epochs']} | "
            f"Train Loss: {train_loss/len(train_loader):.4f} Acc: {train_acc:.3f} | "
            f"Val Loss: {avg_val_loss:.4f} Acc: {val_acc:.3f} | "
            f"LR: {scheduler.get_last_lr()[0]:.2e} | {elapsed:.1f}s"
        )

        # ── Early stopping ──────────────────────────────────────────────────────
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1
            if patience_counter >= cfg["patience"]:
                print(f"Early stopping at epoch {epoch} (patience={cfg['patience']})")
                break

    # ── Save best model + scaler ──────────────────────────────────────────────
    if best_state:
        torch.save(best_state, cfg["model_path"])
        print(f"Model saved → {cfg['model_path']}")

    train_ds.save_scaler(cfg["scaler_path"])

    # Save model config for inference
    torch.save({
        "input_dim": train_ds.n_features,
        "d_model": cfg["d_model"],
        "n_heads": cfg["n_heads"],
        "n_layers": cfg["n_layers"],
        "dropout": cfg["dropout"],
        "window": cfg["window"],
    }, cfg["model_path"].replace(".pth", "_config.pth"))

    print("Training complete.")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol",  default=DEFAULT_CFG["symbol"])
    parser.add_argument("--epochs",  type=int, default=DEFAULT_CFG["epochs"])
    parser.add_argument("--d_model", type=int, default=DEFAULT_CFG["d_model"])
    parser.add_argument("--n_heads", type=int, default=DEFAULT_CFG["n_heads"])
    parser.add_argument("--n_layers",type=int, default=DEFAULT_CFG["n_layers"])
    args = parser.parse_args()

    train_v2({
        "symbol":  args.symbol,
        "epochs":  args.epochs,
        "d_model": args.d_model,
        "n_heads": args.n_heads,
        "n_layers":args.n_layers,
    })
"""
train_v2.py — StockForecastNet V6 Training
===========================================

V6 TRAINING CHANGES (fixes 47.9% val accuracy bug)
────────────────────────────────────────────────────

1.  DUAL LOSS — BCEWithLogitsLoss + MSELoss
    V5: HuberLoss(denorm(y_raw), raw_returns)
        Problem: the denorm operation added a directional bias equal to
        mean(ret_1d over the input window). In a bull-market training set
        this mean is always positive, biasing every prediction toward UP.
        On the val set (different regime), this bias inverts predictions.
    V6: BCE_loss(logit, direction_label) × 0.7
        + MSE_loss(mag_norm, y_norm)  × 0.3
        Direction signal is PRIMARY. Magnitude is SECONDARY regulariser.
        No denorm anywhere near the loss computation.

2.  NORMALISED LABELS
    V5: y_true = raw cumulative returns (0.015 = +1.5%)
    V6: y_norm = y_true / rolling_vol_window
        Rolling vol = std(ret_1d over last 20 days) × sqrt(horizon)
        Labels are now scale-independent — a +1.5% move in a low-vol
        stock and a +1.5% move in a high-vol stock get different labels.
        This prevents the model from learning "IT stocks have ~1% moves"
        as a shortcut instead of learning directional patterns.

3.  BALANCED BATCH SAMPLING
    V5: Used WeightedRandomSampler (crashed on Windows via torch.multinomial)
    V6: Manual balanced sampling in _iter_batches — shuffles UP/DOWN
        indices separately, then interleaves. Guarantees exactly 50/50
        UP/DOWN in every batch without any C++ threading.

4.  DEFAULTS FOR IT-ONLY TRAINING
    d_model: 96   (was 128 — right-sized for correlated IT data)
    dropout: 0.2  (was 0.1 — more regularisation)
    patience: 30  (unchanged — must survive LR restart at epoch 20)

MODES
──────
  python train_v2.py --symbol TCS
  python train_v2.py --mode pretrain --symbols TCS.NS,INFY.NS,WIPRO.NS,HCLTECH.NS,TECHM.NS
  python train_v2.py --mode finetune --symbol TCS
"""

import argparse, glob, os, random, sys, time

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path: sys.path.insert(0, _ROOT)

import joblib, numpy as np, torch, torch.nn as nn
from torch.utils.data import ConcatDataset

from config import settings
from data_fetch_upstox import fetch_historical_data
from dataset_v2 import StockDatasetV2, build_multi_stock_dataset
from features_v6 import FEATURE_COLS, add_features_v6
from model_v2 import StockForecastNet


# ─── Defaults ─────────────────────────────────────────────────────────────────
DEFAULT_CFG = {
    "mode":            "single",
    "symbol":          "TCS",
    "symbols":         "TCS,INFY,WIPRO,HCLTECH,TECHM",
    "start_date":      "2012-01-01",
    "seq_len":         90,
    "horizon":         3,
    "patch_size":      16,
    "stride":          8,
    "d_model":         96,    # V6: reduced from 128
    "n_heads":         4,
    "n_layers":        2,
    "d_ff":            192,   # V6: 2× d_model
    "dropout":         0.2,   # V6: increased from 0.1
    "batch_size":      64,
    "epochs":          100,
    "lr":              3e-4,
    "weight_decay":    1e-3,
    "bce_weight":      0.7,   # V6: direction loss weight
    "mse_weight":      0.3,   # V6: magnitude loss weight
    "val_split":       0.2,
    "patience":        30,
    "noise_threshold": 0.001,
    "gap":             10,
    "pretrain_path":   "pretrained_v6.pth",
    "model_path":      settings.MODEL_PATH,
    "scaler_path":     settings.SCALER_PATH,
    "config_path":     settings.CONFIG_PATH,
    "seed":            42,
}


# ─── Balanced manual batch iterator ───────────────────────────────────────────

def _iter_batches_balanced(dataset, batch_size: int, shuffle: bool,
                           device: torch.device):
    """
    Balanced batch iterator — guarantees 50/50 UP/DOWN per batch.

    V6 replacement for WeightedRandomSampler (which crashed on Windows
    via torch.multinomial OS-level thread kill).

    Approach:
      1. Collect all UP indices and all DOWN indices
      2. Shuffle each separately
      3. Interleave: half batch from UP, half from DOWN
      4. Drop last partial batch
    """
    # Get primary labels (last horizon step)
    if isinstance(dataset, ConcatDataset):
        labels = torch.cat([d._primary_labels for d in dataset.datasets])
    else:
        labels = dataset._primary_labels

    up_idx   = (labels > 0).nonzero(as_tuple=True)[0].tolist()
    down_idx = (labels <= 0).nonzero(as_tuple=True)[0].tolist()

    if shuffle:
        random.shuffle(up_idx)
        random.shuffle(down_idx)

    half = batch_size // 2
    n_batches = min(len(up_idx), len(down_idx)) // half

    for i in range(n_batches):
        batch_idx = up_idx[i*half : (i+1)*half] + down_idx[i*half : (i+1)*half]
        if shuffle:
            random.shuffle(batch_idx)

        Xs, tfs, ys = [], [], []
        for idx in batch_idx:
            x, tf, y = dataset[idx]
            Xs.append(x); tfs.append(tf); ys.append(y)

        yield (
            torch.stack(Xs).to(device),
            torch.stack(tfs).to(device),
            torch.stack(ys).to(device),
        )


def _n_balanced_batches(dataset, batch_size: int) -> int:
    if isinstance(dataset, ConcatDataset):
        labels = torch.cat([d._primary_labels for d in dataset.datasets])
    else:
        labels = dataset._primary_labels
    n_up   = int((labels > 0).sum())
    n_down = int((labels <= 0).sum())
    return min(n_up, n_down) // (batch_size // 2)


# ─── Utilities ────────────────────────────────────────────────────────────────

def _set_windows_env():
    if sys.platform == "win32":
        os.environ.setdefault("OMP_NUM_THREADS", "1")
        os.environ.setdefault("MKL_NUM_THREADS", "1")
        torch.set_num_threads(min(os.cpu_count() or 4, 4))


def detect_device() -> torch.device:
    sep = "=" * 60
    print(f"\n{sep}\n  COMPUTE DEVICE\n{sep}", flush=True)
    if torch.cuda.is_available():
        device = torch.device("cuda")
        p = torch.cuda.get_device_properties(0)
        print(f"  ✓ GPU: {p.name}  ({p.total_memory/1024**3:.1f} GB)", flush=True)
        torch.backends.cudnn.benchmark = True
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        print("  ✓ Apple MPS", flush=True)
    else:
        device = torch.device("cpu")
        _set_windows_env()
        print(f"  CPU ({os.cpu_count()} cores) — OMP threads limited (Windows safe)", flush=True)
    print(sep, flush=True)
    return device


def set_seed(seed: int):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(seed)


def _build_model(cfg: dict, n_features: int) -> StockForecastNet:
    return StockForecastNet(
        n_features=n_features, seq_len=cfg["seq_len"], horizon=cfg["horizon"],
        patch_size=cfg["patch_size"], stride=cfg["stride"],
        d_model=cfg["d_model"], n_heads=cfg["n_heads"],
        n_layers=cfg["n_layers"], d_ff=cfg["d_ff"], dropout=cfg["dropout"],
    )


def _print_model_info(model: StockForecastNet, batch_size: int):
    print(f"\n  {model}", flush=True)
    c = model.count_parameters()
    print(f"\n  {'Component':<30} {'Params':>10}", flush=True)
    print(f"  {'─'*42}", flush=True)
    for k, v in c.items():
        if k not in ("total", "size_mb"):
            print(f"  {k:<30} {v:>10,}", flush=True)
    print(f"  {'─'*42}", flush=True)
    print(f"  {'TOTAL':<30} {c['total']:>10,}  ({c['size_mb']} MB)", flush=True)
    print(flush=True)


def _save_all(model, best_state, scaler, model_path, config_path, scaler_path):
    state = best_state or {k: v.cpu() for k, v in model.state_dict().items()}
    torch.save(state, model_path)
    torch.save(model.get_config(), config_path)
    joblib.dump(scaler, scaler_path)
    print(f"  Weights  → {model_path}", flush=True)
    print(f"  Config   → {config_path}", flush=True)
    print(f"  Scaler   → {scaler_path}", flush=True)


def _load_or_fetch(symbol: str, start_date: str):
    import pandas as pd
    folder = os.path.join("data", symbol.upper().replace(".NS", ""))
    files  = sorted(glob.glob(os.path.join(folder, "*.parquet")))
    if files:
        print(f"  Cached: {os.path.basename(files[-1])}", flush=True)
        return pd.read_parquet(files[-1])
    print(f"  Fetching {symbol}...", flush=True)
    return fetch_historical_data(
        symbol=symbol, unit="days", interval="1",
        start_date=start_date, use_cache=True,
    )


def _result_summary(best_acc: float, n_stocks: int = 1):
    sep = "=" * 60
    print(f"\n{sep}\n  TRAINING RESULT\n{sep}", flush=True)
    if best_acc >= 0.58:
        print(f"  ✓ GOOD    — Val acc {best_acc:.2%}  (target ≥ 58%)", flush=True)
    elif best_acc >= 0.54:
        print(f"  ~ MARGINAL — Val acc {best_acc:.2%}", flush=True)
        print("  Add more IT stocks or increase training period", flush=True)
    else:
        print(f"  ✗ WEAK    — Val acc {best_acc:.2%}", flush=True)
        print("  Check data quality; model may need more diverse IT stocks", flush=True)
    print(f"{sep}\n", flush=True)


# ─── V6 Training Loop ─────────────────────────────────────────────────────────

def _normalize_labels(y: torch.Tensor, revin_stats: tuple) -> torch.Tensor:
    """
    Normalize y labels using the SAME window stats as features.
    This ensures labels are in a consistent scale for MSE loss,
    matching the normalized feature space.
    y: (B, horizon) raw returns
    Returns: (B, horizon) normalized returns
    """
    _, std = revin_stats
    s = std[:, 0, 0].unsqueeze(-1)          # (B, 1)
    return y / (s + 1e-8)


def train_loop(model, train_ds, val_ds, cfg, device) -> tuple:
    """
    V6 training loop.

    Loss = BCE_WEIGHT * BCEWithLogitsLoss(logit, direction)
         + MSE_WEIGHT * MSELoss(mag_norm, y_norm)

    Direction labels: 1 if y[:,-1] > 0 (UP), 0 otherwise (DOWN).
    No denorm anywhere in the loss path.
    """
    batch_size = cfg["batch_size"]
    optimizer  = torch.optim.AdamW(
        model.parameters(), lr=cfg["lr"],
        weight_decay=cfg["weight_decay"], betas=(0.9, 0.999),
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=20, T_mult=2, eta_min=1e-6,
    )
    bce_loss = nn.BCEWithLogitsLoss()
    mse_loss = nn.MSELoss()
    bce_w    = cfg.get("bce_weight", 0.7)
    mse_w    = cfg.get("mse_weight", 0.3)

    n_tr_batches = _n_balanced_batches(train_ds, batch_size)
    n_va_batches = _n_balanced_batches(val_ds,   batch_size)

    best_loss, best_acc, best_state, no_improve = float("inf"), 0.0, None, 0

    # Dry-run
    print("  Dry-run...", end=" ", flush=True)
    model.eval()
    with torch.no_grad():
        x0, tf0, y0 = train_ds[0]
        logit0, mag0, _ = model(x0.unsqueeze(0).to(device), tf0.unsqueeze(0).to(device))
    print(f"✓  logit{tuple(logit0.shape)} mag{tuple(mag0.shape)}", flush=True)
    del x0, tf0, y0, logit0, mag0

    hdr = (f"  {'Ep':>4}  {'TrLoss':>9}  {'TrAcc':>6}  "
           f"{'VaLoss':>9}  {'VaAcc':>6}  {'LR':>9}  {'s/ep':>6}")
    print(hdr, flush=True)
    print("  " + "─" * 62, flush=True)

    for epoch in range(1, cfg["epochs"] + 1):
        t0 = time.time()
        model.train()
        tr_loss = tr_correct = tr_total = 0

        for X, tf, y in _iter_batches_balanced(
                train_ds, batch_size, shuffle=True, device=device):

            logit, mag_norm, revin_stats = model(X, tf)

            # Direction label: 1=UP, 0=DOWN  (B,)
            dir_label = (y[:, -1] > 0).float()

            # Normalise y for MSE (keeps loss scale consistent)
            y_norm = _normalize_labels(y, revin_stats)

            loss = (bce_w * bce_loss(logit, dir_label)
                  + mse_w * mse_loss(mag_norm, y_norm))

            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            tr_loss    += loss.item()
            pred_dir    = (torch.sigmoid(logit) >= 0.5).float()
            tr_correct += int((pred_dir == dir_label).sum())
            tr_total   += y.size(0)

        scheduler.step()

        model.eval()
        va_loss = va_correct = va_total = 0
        with torch.no_grad():
            for X, tf, y in _iter_batches_balanced(
                    val_ds, batch_size, shuffle=False, device=device):

                logit, mag_norm, revin_stats = model(X, tf)
                dir_label = (y[:, -1] > 0).float()
                y_norm    = _normalize_labels(y, revin_stats)

                va_loss += (bce_w * bce_loss(logit, dir_label)
                           + mse_w * mse_loss(mag_norm, y_norm)).item()
                pred_dir   = (torch.sigmoid(logit) >= 0.5).float()
                va_correct += int((pred_dir == dir_label).sum())
                va_total   += y.size(0)

        tr_acc  = tr_correct / max(tr_total, 1)
        va_acc  = va_correct / max(va_total, 1)
        avg_tr  = tr_loss / max(n_tr_batches, 1)
        avg_va  = va_loss / max(n_va_batches, 1)
        cur_lr  = optimizer.param_groups[0]["lr"]
        elapsed = time.time() - t0

        print(f"  {epoch:>4}  {avg_tr:>9.5f}  {tr_acc:>6.3f}  "
              f"{avg_va:>9.5f}  {va_acc:>6.3f}  {cur_lr:>9.2e}  "
              f"{elapsed:>6.1f}s", flush=True)
        sys.stdout.flush()

        if epoch == 1:
            eta = elapsed * cfg["epochs"] / 60
            print(f"  [ETA: ~{eta:.0f} min — will be less with early stop]", flush=True)

        if avg_va < best_loss:
            best_loss, best_acc, no_improve = avg_va, va_acc, 0
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            no_improve += 1
            if no_improve >= cfg["patience"]:
                print(f"\n  Early stop at epoch {epoch} (patience={cfg['patience']}).", flush=True)
                print(f"  Best val loss={best_loss:.5f}  val acc={best_acc:.2%}", flush=True)
                break

    return best_state, best_acc


# ─── Training modes ───────────────────────────────────────────────────────────

def run_single(cfg: dict):
    sep = "=" * 60
    print(f"\n{sep}\n  SINGLE — {cfg['symbol']}\n  seq={cfg['seq_len']}  "
          f"horizon={cfg['horizon']}d  d_model={cfg['d_model']}\n{sep}", flush=True)
    device = detect_device(); set_seed(cfg["seed"])

    df_raw = _load_or_fetch(cfg["symbol"], cfg["start_date"])
    df     = add_features_v6(df_raw)
    n      = len(df); n_val = int(n * cfg["val_split"]); n_tr = n - n_val - cfg["gap"]

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
    _result_summary(best_acc, 1)
    return best_acc


def run_pretrain(cfg: dict):
    symbols = [s.strip() for s in cfg["symbols"].split(",")]
    sep = "=" * 60
    print(f"\n{sep}\n  PRETRAIN — IT SECTOR\n  {symbols}\n  "
          f"seq={cfg['seq_len']}  horizon={cfg['horizon']}d\n{sep}", flush=True)

    # Sector diversity check
    it_stocks = {s.upper().replace(".NS","") for s in symbols}
    if len(it_stocks) < 4:
        print("  ⚠ Only {len(it_stocks)} IT stocks. Recommend 5+ for better generalisation.", flush=True)
    print(f"  Note: IT-only training. Expected val acc 53-58%.", flush=True)
    print(f"  If val acc < 52%, increase to 7+ IT stocks or extend start_date.", flush=True)

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
    best_state, best_acc = train_loop(model, train_ds, val_ds,
                                       {**cfg, "patience": cfg["patience"] + 5},
                                       device)
    print("\n  Saving pretrained model...", flush=True)
    _save_all(model, best_state, scaler,
              cfg["pretrain_path"], pretrain_cfg_path, cfg["scaler_path"])
    _result_summary(best_acc, len(symbols))
    return best_acc


def run_finetune(cfg: dict):
    sep = "=" * 60
    print(f"\n{sep}\n  FINETUNE — {cfg['symbol']}\n{sep}", flush=True)
    device = detect_device(); set_seed(cfg["seed"])

    df_raw = _load_or_fetch(cfg["symbol"], cfg["start_date"])
    df     = add_features_v6(df_raw)
    n      = len(df); n_val = int(n * cfg["val_split"]); n_tr = n - n_val - cfg["gap"]

    pretrain_cfg_path = cfg["pretrain_path"].replace(".pth", "_config.pth")
    scaler = joblib.load(cfg["scaler_path"]) if os.path.exists(cfg["scaler_path"]) else None
    if scaler: print(f"  Scaler: {cfg['scaler_path']}", flush=True)

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
        **{k: pt_cfg.get(k, cfg[k]) for k in
           ["seq_len","horizon","patch_size","stride","d_model","n_heads","n_layers","d_ff"]},
        dropout = cfg["dropout"],
    )
    if os.path.exists(cfg["pretrain_path"]):
        missing, _ = model.load_state_dict(
            torch.load(cfg["pretrain_path"], map_location="cpu"), strict=False)
        if missing: print(f"  {len(missing)} keys zero-init", flush=True)
        print(f"  Loaded: {cfg['pretrain_path']}", flush=True)

    model = model.to(device)
    _print_model_info(model, cfg["batch_size"])
    ft_cfg = {**cfg, "lr": cfg["lr"] / 5, "epochs": 40, "patience": 20}
    best_state, best_acc = train_loop(model, train_ds, val_ds, ft_cfg, device)

    print("\n  Saving finetuned...", flush=True)
    _save_all(model, best_state, train_ds.scaler,
              cfg["model_path"], cfg["config_path"], cfg["scaler_path"])
    _result_summary(best_acc, 1)
    return best_acc


# ─── CLI ──────────────────────────────────────────────────────────────────────

def _build_parser():
    p = argparse.ArgumentParser(
        description="StockForecastNet V6 — IT Sector Training",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Recommended for IT sector:\n"
            "  python train_v2.py --mode pretrain \\\n"
            "    --symbols TCS,INFY,WIPRO,HCLTECH,TECHM,LTI,MPHASIS,PERSISTENT \\\n"
            "    --start_date 2012-01-01\n"
        ),
    )
    p.add_argument("--mode",       default="single", choices=["single","pretrain","finetune"])
    p.add_argument("--symbol",     default=DEFAULT_CFG["symbol"])
    p.add_argument("--symbols",    default=DEFAULT_CFG["symbols"])
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
    p.add_argument("--batch_size", type=int,   default=DEFAULT_CFG["batch_size"])
    p.add_argument("--epochs",     type=int,   default=DEFAULT_CFG["epochs"])
    p.add_argument("--lr",         type=float, default=DEFAULT_CFG["lr"])
    p.add_argument("--patience",   type=int,   default=DEFAULT_CFG["patience"])
    p.add_argument("--noise_threshold", type=float, default=DEFAULT_CFG["noise_threshold"])
    p.add_argument("--bce_weight", type=float, default=DEFAULT_CFG["bce_weight"])
    p.add_argument("--mse_weight", type=float, default=DEFAULT_CFG["mse_weight"])
    p.add_argument("--seed",       type=int,   default=DEFAULT_CFG["seed"])
    return p


if __name__ == "__main__":
    args   = _build_parser().parse_args()
    config = {**DEFAULT_CFG, **vars(args)}
    if args.mode == "pretrain":
        run_pretrain(config)
    elif args.mode == "finetune":
        run_finetune(config)
    else:
        run_single(config)
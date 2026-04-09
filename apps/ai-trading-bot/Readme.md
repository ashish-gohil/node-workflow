# 🧠 AI Stock Prediction Service — V2
### Complete Reference Guide

---

## Table of Contents

1. [What This System Does](#1-what-this-system-does)
2. [Project Structure](#2-project-structure)
3. [Quick Start](#3-quick-start)
4. [Fetching Data — All Options Explained](#4-fetching-data)
5. [GPU Setup — Dell Laptop Guide](#5-gpu-setup-dell-laptop)
6. [Hyperparameters — What Each One Does](#6-hyperparameters)
7. [What Are Epochs — Full Explanation](#7-what-are-epochs)
8. [Parameter Count — Live Calculator Formula](#8-parameter-count-formula)
9. [All Strategies — What They Are and When to Use Each](#9-all-strategies)
10. [How to Make the Model More Efficient](#10-model-efficiency)
11. [The Full Architecture](#11-architecture)
12. [All Commands Reference](#12-commands-reference)

---

## 1. What This System Does

Every trading day after market close (3:45 PM IST), this service answers:

> "Based on the last 60 trading days of data for RELIANCE, should I BUY, SELL, or HOLD tomorrow?"

Full pipeline:

```
Raw OHLCV Data  →  Feature Engineering (27 indicators)
      →  Sliding Window (last 60 days)
      →  Transformer Neural Network
      →  Direction (UP/DOWN) + Expected Return
      →  Confidence Calibration
      →  BUY STRONG / SELL MEDIUM / HOLD WEAK
```

---

## 2. Project Structure

```
ai-trading-service/
│
├── data_fetch_upstox.py     Fetch OHLCV data from Upstox API
├── features_v2.py           Compute 27 technical indicators
├── dataset_v2.py            Build PyTorch Dataset from features
├── model_v2.py              Transformer neural network
├── train_v2.py              Training pipeline
├── infer.py                 Daily prediction script (run after market close)
├── backtest_v2.py           Test model on historical data
├── api_v2.py                FastAPI HTTP endpoint for n8n
├── config.py                Settings from .env file
│
├── strategies/              Technical indicator strategy classes
│   ├── base.py              Abstract base all strategies inherit
│   ├── ma_strategy.py       Moving Average crossover
│   ├── rsi_strategy.py      RSI momentum oscillator
│   ├── macd_strategy.py     MACD momentum
│   ├── bb_strategy.py       Bollinger Bands volatility
│   ├── breakout_strategy.py Price breakout detection
│   ├── vwap_strategy.py     Volume Weighted Average Price
│   ├── atr_strategy.py      Average True Range volatility
│   ├── candlestick_strategy.py  Candlestick pattern detection
│   └── momentum_strategy.py Multi-timeframe momentum
│
├── utils/
│   └── trading_v2.py        Signal engine (confidence → BUY/SELL/HOLD)
│
├── pyrightconfig.json       Fixes VS Code import warnings
├── .env                     Your API keys (never commit to git)
├── .env.example             Template
├── requirements.txt         Python dependencies
├── Dockerfile               Container definition
└── start.sh                 Production server startup
```

---

## 3. Quick Start

```bash
cd apps/ai-trading-service

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Mac / Linux
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env → fill in UPSTOX_ACCESS_TOKEN

# Full pipeline
python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01
python train_v2.py --symbol RELIANCE
python backtest_v2.py --data data/raw/RELIANCE/1d.parquet
python infer.py --symbol RELIANCE --output json
```

---

## 4. Fetching Data

### Basic fetch — all available history

```bash
python data_fetch_upstox.py --symbol RELIANCE --start 2000-01-01
```

### Fetch a specific date range (from date TO date)

The `fetch_historical_data()` function accepts `start_date`. To also restrict the end date, edit the call or use the cached file and filter in pandas. The function always fetches up to yesterday's close.

```bash
# Fetch from 2015 onwards (recommended — 10 years is ideal)
python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01

# Fetch only last 3 years
python data_fetch_upstox.py --symbol RELIANCE --start 2022-01-01

# Force re-fetch even if cache exists
python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01 --force
```

If you already have a parquet file and want a specific date range for training only, filter it in `train_v2.py`:

```python
# In train_v2.py, after loading df_raw:
df_raw = df_raw[
    (df_raw["datetime"] >= "2018-01-01") &
    (df_raw["datetime"] <= "2023-12-31")
]
```

### Fetch different intervals (timeframes)

```bash
# Daily candles (default — what we use for training)
python data_fetch_upstox.py --symbol RELIANCE --unit days --interval 1

# Weekly candles
python data_fetch_upstox.py --symbol RELIANCE --unit weeks --interval 1

# 30-minute candles (last 30 days only — Upstox API limit)
python data_fetch_upstox.py --symbol RELIANCE --unit minutes --interval 30

# 15-minute candles
python data_fetch_upstox.py --symbol RELIANCE --unit minutes --interval 15
```

**Note on minute data:** Upstox restricts intraday history to last 30 days. Daily data goes back to 2000. For long-term model training, always use `--unit days`.

### Fetch multiple symbols

```bash
for symbol in RELIANCE TCS HDFCBANK INFY ICICIBANK; do
    python data_fetch_upstox.py --symbol $symbol --start 2015-01-01
done
```

### What gets saved

Data is cached at `data/raw/{SYMBOL}/1d.parquet`. Next time you run, it loads from cache instantly. Use `--force` to re-download.

### Using existing local data

If you already have a CSV file with OHLCV data:

```python
# In train_v2.py, replace the fetch call with:
import pandas as pd
df_raw = pd.read_csv("your_data.csv", parse_dates=["datetime"])
df_raw = df_raw.rename(columns={"Date": "datetime", "Open": "open",
                                 "High": "high", "Low": "low",
                                 "Close": "close", "Volume": "volume"})
```

The CSV just needs columns: `datetime, open, high, low, close, volume`.

---

## 5. GPU Setup — Dell Laptop

### Step 1 — Find out what GPU your Dell has

Open Command Prompt (Windows):
```
dxdiag
```
Look for "Display" tab → shows your GPU name. Common Dell GPU chips:

| GPU Name | Type | PyTorch Support |
|---|---|---|
| NVIDIA GeForce RTX 3050/4050/4060 | NVIDIA dedicated | ✓ CUDA — full speed |
| NVIDIA GeForce GTX 1650/1660 | NVIDIA dedicated | ✓ CUDA — full speed |
| Intel Iris Xe / UHD Graphics | Intel integrated | ✗ Not supported by PyTorch |
| AMD Radeon (various) | AMD | Limited (ROCm, Linux only) |

Most Dell XPS, Inspiron with "Gaming" label, and Alienware have NVIDIA GPUs. Budget models often have only Intel integrated graphics.

### Step 2 — Check if NVIDIA GPU is present

```bash
nvidia-smi
```

**If it shows output like this → you have CUDA:**
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 525.xx    Driver Version: 525.xx    CUDA Version: 12.x           |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence  | Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce RTX 3050  |  00000000:01:00.0 Off |                  N/A |
| N/A   50C    P8    12W /  80W |    500MiB /  4096MiB |      0%      Default |
+-----------------------------------------------------------------------------+
```

**If you get "nvidia-smi is not recognized" → either no NVIDIA GPU, or driver not installed.**

Install the NVIDIA driver from: https://www.nvidia.com/Download/index.aspx

### Step 3 — Install CUDA-enabled PyTorch

First uninstall any existing PyTorch:
```bash
pip uninstall torch torchvision torchaudio -y
```

Then install with CUDA support (pick the right CUDA version from `nvidia-smi` output):

```bash
# For CUDA 12.1 (most common on modern drivers)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# For CUDA 11.8 (older drivers)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Step 4 — Verify GPU is available in Python

```python
import torch
print(torch.cuda.is_available())       # Should print: True
print(torch.cuda.get_device_name(0))   # Should print: NVIDIA GeForce RTX XXXX
print(torch.cuda.device_count())       # Should print: 1
```

### Step 5 — Verify GPU is being used WHILE training

When you run `python train_v2.py`, the training script prints a full device report at startup:

```
============================================================
  DEVICE DETECTION
============================================================
  ✓ CUDA GPU detected (1 device)
    GPU 0: NVIDIA GeForce RTX 3050
           VRAM:       4.0 GB
           CUDA caps:  8.6
           SM count:   20

  Active device:  cuda:0
  cuDNN version:  8902
  cuDNN benchmark: enabled
============================================================
```

**During training, every epoch line shows GPU memory:**
```
Epoch   1  TrLoss: 0.8432  TrAcc: 0.532  VaLoss: 0.7891  VaAcc: 0.551  LR: 1.00e-04  8.2s    284 MB
Epoch   2  TrLoss: 0.7214  TrAcc: 0.561  VaLoss: 0.7102  VaAcc: 0.574  LR: 2.00e-04  8.1s    284 MB
```

The last column `284 MB` is GPU memory currently allocated. If it shows a number → GPU is working.

**To monitor in real time (open a second terminal while training runs):**
```bash
# Windows — refresh every 1 second
nvidia-smi -l 1

# Look for "GPU-Util" column — should show 30-80% during training
# Look for "Memory-Usage" — should increase when training starts
```

### What if training still uses CPU even with NVIDIA GPU?

1. PyTorch was installed without CUDA — reinstall using Step 3 above.
2. The CUDA toolkit version doesn't match — check `nvidia-smi` shows CUDA version matching your PyTorch install.
3. Driver is outdated — update from NVIDIA website.

**Quick test — run this before training:**
```python
python -c "import torch; print('CUDA:', torch.cuda.is_available(), '| GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

---

## 6. Hyperparameters

Every parameter in `DEFAULT_CFG` in `train_v2.py` controls something specific. Here is every parameter, what it does, and the exact effect of increasing or decreasing it.

---

### `d_model` — Transformer embedding dimension
**Default: 128**

This is the "width" of the transformer. Every input feature is projected into a `d_model`-dimensional vector. Every attention computation, every feedforward layer, every output operates in this dimension.

Think of it as the model's "working memory" per timestep. Bigger = more capacity to represent complex patterns. Smaller = simpler model that generalises more easily on small data.

| Value | Effect | Use when |
|---|---|---|
| 32–64 | Very small, fast, may underfit | Dataset < 500 samples |
| **128** | **Default, good balance** | **1000–5000 samples** |
| 256 | Larger capacity, slower, needs more data | 5000+ samples |
| 512 | Very large, risk of overfitting | 10,000+ samples with GPU |

**Rule:** `d_model` must always be divisible by `n_heads`. If `d_model=128` and `n_heads=8`, each head gets 128/8=16 dimensions. Valid combos: (64,4), (64,8), (128,4), (128,8), (256,8), (256,16).

---

### `n_heads` — Number of attention heads
**Default: 8**

The self-attention mechanism splits `d_model` into `n_heads` parallel attention computations, each looking at the data differently. Each head can specialise — one might focus on volume patterns, another on momentum indicators, another on price structure.

More heads = more types of patterns the model can attend to simultaneously.

| Value | Effect | Use when |
|---|---|---|
| 2–4 | Few perspectives, fast | Small d_model (32–64) |
| **8** | **Default, good for d_model=128** | **Standard config** |
| 16 | Many perspectives, needs d_model≥256 | Large models |

**Hard constraint:** `n_heads` must evenly divide `d_model`. Each head gets `d_model / n_heads` dimensions — if this isn't an integer, PyTorch throws an error.

---

### `n_layers` — Number of transformer encoder layers
**Default: 4**

Each layer stacks on top of the previous one. Early layers learn local, simple patterns ("two red candles in a row"). Later layers learn abstract, multi-week narratives ("consolidation after a downtrend before a breakout").

More layers = more abstraction = more capacity for complex patterns, but also more overfitting risk and slower training.

| Value | Effect | Use when |
|---|---|---|
| 1–2 | Shallow, quick, basic patterns only | Very limited data |
| **4** | **Default, good balance** | **Standard config** |
| 6–8 | Deep, learns complex narratives | Large dataset, GPU, regularisation needed |
| 12+ | Very deep, aggressive regularisation needed | Research setting, not recommended here |

**Practical tip:** Before increasing `n_layers`, first try increasing `d_model`. A deeper narrow model often learns less than a shallower wider one.

---

### `d_ff` — Feedforward dimension inside each transformer layer
**Default: 256**

Inside each transformer encoder layer, after the self-attention step, there is a small feedforward network with two linear layers: `d_model → d_ff → d_model`. The `d_ff` dimension is the "internal width" of this sub-network.

The standard rule (from the original Transformer paper) is `d_ff = 4 × d_model`. With `d_model=128`, that gives `d_ff=512`. We use 256 (2×) which is slightly more conservative and reduces overfitting risk on financial data.

| Value | Effect |
|---|---|
| d_model × 1 | Very small, minimal feature transformation |
| d_model × 2 = 256 | Conservative, default here |
| d_model × 4 = 512 | Standard per original paper |
| d_model × 8 | Large, risk of overfitting on small data |

This parameter has a large effect on total parameter count — see Section 8.

---

### `dropout`
**Default: 0.1 (10%)**

Dropout randomly zeros out 10% of neurons during each training step. This forces the model to not rely on any single neuron and generalise better. It is a regularisation technique — it prevents overfitting.

**Critical:** Dropout is automatically disabled during inference (`model.eval()` in `infer.py`). During training it is active.

| Value | Effect | Use when |
|---|---|---|
| 0.0 | No regularisation, fastest convergence | Large dataset, GPU |
| **0.1** | **Light regularisation, default** | **Standard** |
| 0.2–0.3 | Moderate regularisation | Overfitting observed in backtest |
| 0.5 | Heavy regularisation | Very small dataset |

**How to know if you need more dropout:** If your training accuracy is 70% but val accuracy is only 55%, the model is memorising training data (overfitting). Increase dropout to 0.2-0.3.

---

### `batch_size`
**Default: 64**

How many training samples are processed simultaneously before updating the model weights. Larger batches use more GPU memory but give more stable gradient estimates.

| Value | Effect | Use when |
|---|---|---|
| 16–32 | More updates per epoch, noisier gradients, good for small data | Limited GPU memory |
| **64** | **Default, stable balance** | **Standard** |
| 128–256 | Faster on large datasets, needs more GPU memory | GPU with ≥8GB VRAM, large dataset |

**Memory rule of thumb:** Each sample is `(60 × 27 × 4 bytes) = ~6.5 KB`. With batch_size=64, one batch = ~416 KB. The GPU also holds gradients and activations, so multiply by ~10. 64 is safe for even a 4GB VRAM GPU.

---

### `lr` — Learning rate
**Default: 0.0001 (1e-4)**

How big each parameter update step is. Too large: the model overshoots good solutions, training becomes unstable. Too small: training converges very slowly or gets stuck.

We use `OneCycleLR` which starts at lr, warms up to max_lr, then anneals down. So this value is the **maximum** learning rate reached during the warm-up phase.

| Value | Effect | Use when |
|---|---|---|
| 1e-5 | Very slow convergence | Fine-tuning a pre-trained model |
| **1e-4** | **Default, stable** | **Training from scratch** |
| 3e-4 | Faster convergence, riskier | Large batch, large dataset |
| 1e-3 | Often unstable with Transformer | Not recommended |

---

### `window`
**Default: 60 (60 trading days = ~3 months)**

How many past days the model "sees" when making a prediction. Each prediction is based on the last `window` days of feature data.

| Value | Effect | Use when |
|---|---|---|
| 20–30 | Short memory, misses medium-term patterns | Fast-moving stocks, intraday |
| **60** | **Default, ~3 months of context** | **Standard daily trading** |
| 90–120 | Longer memory, sees quarterly patterns | Slower stocks, position trading |

**Effect on dataset size:** With `window=60`, the first valid training sample needs 60 days of history + 1 day for the label. Every 10 you add to `window` costs ~10 samples from the beginning of your data.

---

### `noise_threshold`
**Default: 0.003 (0.3%)**

Days where the next-day return is smaller than this threshold are **excluded from training**. If the stock barely moved (+0.1%), there is no useful signal — it's just noise. We don't want to train the model to predict these micro-moves.

| Value | Effect | Use when |
|---|---|---|
| 0.001 | Almost no filtering, many noisy samples | Very long dataset (10+ years) |
| **0.003** | **Default, removes noise** | **Standard** |
| 0.005 | Stricter, cleaner signal, fewer samples | Volatile stocks |
| 0.010 | Very strict, only large moves trained | Position trading only |

---

### `patience` — Early stopping patience
**Default: 8**

Training stops if validation loss hasn't improved for `patience` consecutive epochs. This prevents wasting time training past the optimal point.

| Value | Effect |
|---|---|
| 3–5 | Stops very early, fast but may stop too soon |
| **8** | **Default, gives model room to improve** |
| 15–20 | Long patience, only stops when clearly plateaued |
| 999 | Effectively disabled, trains all epochs |

---

### `val_split`
**Default: 0.2 (20%)**

The last 20% of data (by time, not randomly) is reserved for validation. The model never trains on validation data — it's used only to measure how well the model generalises to unseen data.

**Always chronological, never random.** Randomly splitting time-series data causes data leakage — the model would "train on the future" because later rows get mixed into the training set.

---

## 7. What Are Epochs

### The core concept

An **epoch** is one complete pass through the entire training dataset. During one epoch, the model sees every training sample exactly once, updates its parameters after each batch, and at the end we evaluate it on the validation set.

Think of it like studying for an exam:
- **1 epoch** = reading the entire textbook once
- **50 epochs** = reading the textbook 50 times, each time correcting your mistakes

After each reading, you get a test score (validation accuracy). You keep studying until the test score stops improving.

### What happens mathematically each epoch

```
For each batch in training data:
    1. Forward pass:  model produces predictions
    2. Loss computed: how wrong was the model?
    3. Backward pass: compute gradient of loss w.r.t. every parameter
    4. Optimizer step: nudge every parameter in the direction that reduces loss

After all batches:
    5. Run validation: evaluate model on held-out data (no parameter updates)
    6. Print: epoch number, train loss, train accuracy, val loss, val accuracy
    7. Check early stopping: if val loss didn't improve → increment patience counter
```

### What happens as epoch number increases

```
Early epochs (1–10):
  Model is learning basic patterns.
  Training loss drops fast.
  Val loss drops alongside training loss.
  You NEED these epochs — the model is genuinely improving.

Middle epochs (10–30):
  Fine-tuning. Loss drops slowly.
  Val accuracy may plateau.
  Still useful.

Late epochs (30–50+):
  Two possible situations:
    A) Val loss still declining → keep training, more epochs needed
    B) Val loss flat or rising while train loss still drops → OVERFITTING
       The model is memorising training data rather than learning general patterns.
       Early stopping kicks in here and halts training.
```

### Effect of increasing/decreasing epochs

| Epochs | Risk | What happens |
|---|---|---|
| Too few (5–10) | Underfitting | Model hasn't learned enough, accuracy low on both train and val |
| Good range (20–50) | Normal training | Validation accuracy improves, early stopping finds the optimal point |
| Too many (100+) without early stopping | Overfitting | Training accuracy high, validation accuracy drops. Model memorised training data |

**With early stopping (`patience=8`), this is self-correcting.** The training automatically stops when the validation loss stops improving. You don't need to manually choose the right epoch count — set `epochs=100` with `patience=8` and let it stop when ready.

### Reading the training output

```
Epoch   1  TrLoss: 0.843  TrAcc: 0.532  VaLoss: 0.789  VaAcc: 0.551   ← Both improving: good
Epoch  10  TrLoss: 0.721  TrAcc: 0.591  VaLoss: 0.710  VaAcc: 0.581   ← Both improving: good
Epoch  25  TrLoss: 0.611  TrAcc: 0.638  VaLoss: 0.644  VaAcc: 0.621   ← Both improving: good
Epoch  30  TrLoss: 0.590  TrAcc: 0.652  VaLoss: 0.649  VaAcc: 0.619   ← VaLoss rose slightly
Epoch  35  TrLoss: 0.571  TrAcc: 0.664  VaLoss: 0.655  VaAcc: 0.616   ← VaLoss still rising
Epoch  38  Early stopping triggered. Best was epoch 25.                 ← patience=8 kicks in
```

The model saved is the one from **epoch 25** (best val loss), not epoch 38.

---

## 8. Parameter Count Formula

### How to calculate total parameters for any config

Given: `input_dim`, `d_model`, `n_heads`, `n_layers`, `d_ff`

```
COMPONENT 1 — CLS Token
  = d_model
  = 128

COMPONENT 2 — Input Projection (Linear + LayerNorm)
  Linear weights  = input_dim × d_model
  Linear bias     = d_model
  LayerNorm weight = d_model
  LayerNorm bias  = d_model
  Total = input_dim × d_model + 3 × d_model
  = 27 × 128 + 3 × 128
  = 3,456 + 384
  = 3,840

COMPONENT 3 — One Transformer Encoder Layer
  Three sub-components per layer:

  a) Self-Attention:
     QKV projection (packed):  3 × d_model × d_model + 3 × d_model
     Output projection:             d_model × d_model +     d_model
     Total attention = 4 × d_model² + 4 × d_model
     = 4 × 128² + 4 × 128
     = 65,536 + 512
     = 66,048

  b) Feed-Forward Network:
     Linear 1: d_model × d_ff + d_ff
     Linear 2: d_ff × d_model + d_model
     Total FFN = d_model × d_ff + d_ff + d_ff × d_model + d_model
               = 2 × d_model × d_ff + d_ff + d_model
     = 2 × 128 × 256 + 256 + 128
     = 65,536 + 384
     = 65,920

  c) Two LayerNorms (Pre-LN: one before attention, one before FFN):
     Each LayerNorm = 2 × d_model (weight + bias)
     Total LN = 4 × d_model = 4 × 128 = 512

  TOTAL per layer = 66,048 + 65,920 + 512 = 132,480

COMPONENT 4 — All n_layers + Final LayerNorm
  n_layers × layer_params + 2 × d_model  (final LN)
  = 4 × 132,480 + 256
  = 529,920 + 256
  = 530,176

COMPONENT 5 — MLP Trunk (128 → 128 → 64)
  Layer 1: d_model × d_model + d_model = 128 × 128 + 128 = 16,512
  Layer 2: d_model × (d_model÷2) + (d_model÷2) = 128×64 + 64 = 8,256
  Total MLP = 24,768

COMPONENT 6 — Output Heads
  Direction head: (d_model÷2) × 2 + 2 = 64 × 2 + 2 = 130
  Return head:    (d_model÷2) × 1 + 1 = 64 × 1 + 1 = 65

GRAND TOTAL = 128 + 3,840 + 530,176 + 24,768 + 130 + 65
            = 559,107 parameters
            = 2.13 MB in float32 (4 bytes per param)
```

### Quick formula for any config

```python
def count_params(input_dim, d_model, n_heads, n_layers, d_ff):
    cls          = d_model
    input_proj   = input_dim * d_model + 3 * d_model
    attn         = 4 * d_model**2 + 4 * d_model        # QKV + OutProj
    ffn          = 2 * d_model * d_ff + d_ff + d_model  # FFN layers
    ln_per_layer = 4 * d_model                          # 2 LayerNorms × 2 params each
    per_layer    = attn + ffn + ln_per_layer
    transformer  = n_layers * per_layer + 2 * d_model   # + final LN
    mlp          = d_model**2 + d_model + d_model*(d_model//2) + d_model//2
    heads        = (d_model//2)*2 + 2 + (d_model//2)*1 + 1
    return cls + input_proj + transformer + mlp + heads
```

### Example calculations for common configs

| Config | Total Params | Size (MB) | Training time / epoch (RTX 3050) |
|---|---|---|---|
| d_model=64, n_layers=2, d_ff=128 | ~90,000 | 0.34 MB | ~2 sec |
| **d_model=128, n_layers=4, d_ff=256 (default)** | **~559,000** | **2.13 MB** | **~8 sec** |
| d_model=256, n_layers=4, d_ff=512 | ~2,240,000 | 8.55 MB | ~25 sec |
| d_model=256, n_layers=6, d_ff=1024 | ~5,100,000 | 19.5 MB | ~55 sec |
| d_model=512, n_layers=6, d_ff=2048 | ~20,000,000 | 76 MB | ~3 min |

**For your dataset size (~2000–4000 training samples), the default 559K config is optimal.** Jumping to 2M+ params without 10× more data will cause overfitting.

---

## 9. All Strategies

Strategies live in the `strategies/` folder. They compute technical indicator columns from raw OHLCV data. The features computed by `features_v2.py` are the primary input to the model — strategies are available as modular building blocks you can add to the feature pipeline.

---

### Moving Average (`ma_strategy.py`)

**What it is:** Averages the last N closing prices. The "moving" part means it updates every day as new prices come in.

**MA10 vs MA20:** MA10 (10-day average) reacts faster to price changes. MA20 reacts slower.

**Signal:** When MA10 crosses ABOVE MA20, short-term trend is stronger than medium-term trend → bullish. When MA10 crosses BELOW MA20 → bearish.

**When to use:** Core trend-following indicator. Best in trending markets. Useless in flat/sideways markets (produces many false signals).

```
ma_10     = rolling mean of last 10 closes
ma_20     = rolling mean of last 20 closes
ma_signal = 1 if ma_10 > ma_20 (bullish), 0 if bearish
ma_spread = (ma_10 - ma_20) / close  (strength of the crossover)
```

---

### RSI (`rsi_strategy.py`)

**What it is:** Relative Strength Index. Compares the average size of UP days vs DOWN days over the last 14 days. Result: a number between 0 and 100.

```
RSI > 70 → Overbought. Price moved up too fast. Likely to reverse DOWN.
RSI < 30 → Oversold.  Price moved down too fast. Likely to reverse UP.
RSI 30–70 → Neutral zone.
```

**When to use:** Best as a reversal signal — identifies when a move is "exhausted". Works well in range-bound markets. Less useful in strong trends (RSI can stay above 70 for weeks in a bull run).

**Combine with:** Bollinger Bands (both confirm overbought), MACD (confirms direction of reversal).

---

### MACD (`macd_strategy.py`)

**What it is:** Moving Average Convergence Divergence. Takes two exponential moving averages (EMA12 and EMA26) and subtracts them.

```
MACD Line   = EMA(12) - EMA(26)    (fast minus slow)
Signal Line = EMA(9) of MACD Line  (smoothed MACD)
Histogram   = MACD - Signal        (positive = bullish momentum)
```

**Signal:** When MACD crosses above Signal → momentum turning bullish. When MACD crosses below Signal → momentum turning bearish.

**When to use:** Momentum direction. MACD tells you "is the trend accelerating or decelerating?" while RSI tells you "is the trend exhausted?". Use together.

**Key feature:** `macd_hist_norm` (histogram normalised by price) is very useful for the model because it's comparable across stocks at different price levels.

---

### Bollinger Bands (`bb_strategy.py`)

**What it is:** A volatility channel around price. Three lines:
- Middle band = 20-day moving average
- Upper band = middle + 2× standard deviation
- Lower band = middle - 2× standard deviation

**Key derived features:**
```
bb_position = (close - lower) / (upper - lower)
  0.0 = price AT the lower band (potentially oversold)
  0.5 = price in the middle (fair value)
  1.0 = price AT the upper band (potentially overbought)

bb_width = (upper - lower) / middle
  Wide bands = high volatility period
  Narrow bands = low volatility / squeeze → breakout likely

bb_squeeze = bands are at their narrowest in 50 days → breakout imminent
```

**When to use:** Volatility regime detection and mean-reversion signals. When bands are very wide (after a big move), mean reversion is likely. When bands are very narrow (squeeze), a large move is coming — but MACD/direction tells you which way.

---

### Breakout (`breakout_strategy.py`)

**What it is:** Detects when price closes above a key resistance level — specifically the highest high of the last 20 days.

```
resistance = rolling max of HIGH over last 20 days
breakout   = 1 if close > yesterday's resistance
```

**When to use:** Trend initiation signals. When price breaks above a key level, it often continues up as short-sellers cover and new buyers enter. High-probability setup when combined with high volume (check `volume_ratio`).

**Combine with:** Volume ratio (breakout on 2× average volume is much more reliable), ATR (size of the breakout relative to daily range).

---

### VWAP (`vwap_strategy.py`)

**What it is:** Volume Weighted Average Price. The average price weighted by how much volume traded at each price level.

```
VWAP = Sum(typical_price × volume) / Sum(volume)
  where typical_price = (high + low + close) / 3

vwap_deviation = (close - VWAP) / VWAP
  +0.02 = price is 2% ABOVE VWAP (bulls in control)
  -0.02 = price is 2% BELOW VWAP (bears in control)
```

**When to use:** VWAP is the most-watched level by institutional investors (mutual funds, FIIs). Price above VWAP = institutions are net buyers. Very useful on high-volume days. Adds a "institutional activity" dimension that pure price indicators miss.

**Best for:** Mid-to-large cap stocks with high daily volume (RELIANCE, TCS, HDFCBANK). Less meaningful for illiquid small caps.

---

### ATR (`atr_strategy.py`)

**What it is:** Average True Range. Measures the typical daily price range including gaps.

```
True Range = max(
    high - low,
    |high - previous_close|,   (gap up scenario)
    |low  - previous_close|    (gap down scenario)
)
ATR = rolling average of True Range (14 days)

atr_pct       = ATR / close × 100    (ATR as % of price)
atr_ratio     = current ATR / 20-day avg ATR (is volatility expanding?)
high_vol_regime = 1 if ATR > 1.5× its average (high volatility period)
vol_compressed  = 1 if ATR near 20-day low (squeeze, breakout likely)
```

**When to use:** Always. ATR is the foundation of professional position sizing and stop-loss placement. Also detects volatility compression before breakouts (similar to Bollinger squeeze but calculated differently). Use `atr_pct` not raw `atr` as a model feature (normalised by price).

**Combine with:** Bollinger squeeze and breakout for high-probability setups.

---

### Candlestick Patterns (`candlestick_strategy.py`)

**What it is:** Detects specific shapes formed by a single day's candle or pairs of candles. Each shape encodes buyer/seller psychology.

```
Doji:              Open ≈ Close. Indecision. After trend → reversal signal.
Hammer:            Long lower wick, small body at top. Buyers rejected lows. → Bullish.
Shooting Star:     Long upper wick, small body at bottom. Sellers rejected highs. → Bearish.
Bullish Engulfing: Green candle completely covers prior red candle. → Strong bullish reversal.
Bearish Engulfing: Red candle completely covers prior green candle. → Strong bearish reversal.
Bullish Marubozu:  Entire day is one green body, no wicks. Pure buying pressure.
Bearish Marubozu:  Entire day is one red body, no wicks. Pure selling pressure.

candle_signal: +1 (bullish pattern), -1 (bearish pattern), 0 (no pattern)
```

**When to use:** These patterns are most reliable at significant price levels (near support/resistance, after a sustained trend). Add `candle_signal` as a feature to give the model direct access to intraday price action psychology that standard indicators miss.

---

### Multi-Timeframe Momentum (`momentum_strategy.py`)

**What it is:** Measures price momentum (Rate of Change) simultaneously across 5 different time windows (5, 10, 20, 60, 120 days).

```
roc_5   = (close - close_5_days_ago) / close_5_days_ago × 100
roc_20  = (close - close_20_days_ago) / close_20_days_ago × 100
roc_60  = (close - close_60_days_ago) / close_60_days_ago × 100

momentum_alignment = how many timeframes are positive simultaneously (range: -5 to +5)
  +5 = ALL timeframes bullish (strong uptrend, good BUY candidate)
  -5 = ALL timeframes bearish (strong downtrend, good SELL candidate)
  0  = mixed signals

momentum_accel = roc_5 - roc_20
  Positive = recent days are outperforming the month (accelerating)
  Negative = recent days are underperforming the month (decelerating)

pct_from_52w_high = how far below the 52-week high
pct_from_52w_low  = how far above the 52-week low
```

**When to use:** Momentum is one of the best-documented anomalies in financial markets. Stocks that have risen across multiple timeframes tend to continue rising. The `momentum_alignment` score is particularly powerful — it summarises the full trend picture in one number.

---

### Strategy Selection Guide

| Market Condition | Best Strategies | Avoid |
|---|---|---|
| Strong uptrend | Momentum, MA crossover, Breakout, VWAP | RSI (stays overbought) |
| Strong downtrend | Momentum (short), MACD, Bearish candlesticks | RSI (stays oversold) |
| Sideways / ranging | RSI, Bollinger Bands, VWAP | MA crossover (whipsaws) |
| Low volatility (before breakout) | Bollinger squeeze, ATR compression, BB squeeze | Momentum (no direction) |
| High volatility / news events | ATR regime, reduce position size | Any reversal signals |
| Near support/resistance | Candlestick patterns + RSI | Standalone momentum |

**For the AI model specifically:** All 9 strategies together give the richest feature set. The transformer learns which combinations matter in which contexts — you don't need to manually pick strategies. Add all of them to `features_v2.py`.

---

## 10. Model Efficiency

### Parameters by impact on accuracy (most to least)

**1. Data quality and quantity (biggest impact — not a hyperparameter)**
No hyperparameter tuning compensates for poor data. Use at least 5 years of daily data. Clean outliers (split-adjusted prices, ex-dividend dates). This matters more than any model tweak.

**2. `window` (high impact)**
Increasing from 60 to 90 gives the model 50% more historical context per prediction. If your stock has clear quarterly patterns (earnings-driven), a longer window helps capture them. Cost: slightly smaller dataset, slightly slower training.

**3. `n_layers` (high impact)**
Each additional layer enables the model to learn more abstract, multi-week patterns. Going from 4 to 6 layers often improves accuracy on datasets with 3000+ training samples. Below 3000 samples, extra layers typically overfit.

**4. Feature engineering (high impact)**
Adding VWAP, candlestick signals, and multi-timeframe momentum to `features_v2.py` expands `input_dim` from 27 to ~45. More input features = richer input representation. This often has more impact than enlarging the model.

**5. `d_model` (medium impact)**
Going from 128 to 256 doubles the model's internal capacity. Useful with 5000+ training samples. With less data, the extra capacity is wasted on memorising noise.

**6. `d_ff` (medium impact)**
Increasing from 256 to 512 (the "standard" ratio of 4×) adds ~260K more parameters from the FFN layers alone. Test if validation accuracy improves before committing.

**7. `dropout` (medium impact on overfitting)**
Not a capacity parameter — a regularisation parameter. If validation accuracy is lower than training accuracy by more than 10 percentage points, increase dropout. If both are equally low, decrease it.

**8. `lr` and `batch_size` (lower impact when using OneCycleLR)**
OneCycleLR is largely self-adapting. `lr=1e-4` works well for most configs. Only tune if training is clearly unstable (loss spikes up) or too slow.

### The most reliable improvement steps in order

```
Step 1: Get more data
  python data_fetch_upstox.py --symbol RELIANCE --start 2010-01-01
  More data > any model change.

Step 2: Add more features (expand features_v2.py)
  Import and apply VWAPStrategy, CandlestickStrategy, MomentumStrategy.
  input_dim goes from 27 to ~45. Richer signal for the model.

Step 3: Try slightly larger model
  python train_v2.py --d_model 256 --n_heads 8 --n_layers 6 --d_ff 512
  Only worth it if you have 5000+ training samples.

Step 4: Tune noise_threshold
  python train_v2.py --noise_threshold 0.005
  Cleaner training signal, fewer samples.

Step 5: Adjust confidence thresholds in utils/trading_v2.py
  If backtest shows STRONG trades are 70%+ accurate,
  lower MEDIUM threshold to generate more MEDIUM signals too.
```

---

## 11. Architecture

```
Input: (batch, 60, 27)      ← 60 days of 27 features each

        ↓  Linear(27 → 128) + LayerNorm
        ↓  [Prepend CLS token]
        ↓  Positional Encoding (sinusoidal, no learnable params)
        ↓
        ┌─────────────────────────────────────┐
        │  Transformer Encoder Layer × 4      │
        │                                     │
        │  LayerNorm (Pre-LN)                 │
        │  Multi-Head Self-Attention (8 heads) │
        │  + Residual connection              │
        │  LayerNorm (Pre-LN)                 │
        │  Feed-Forward Network (128→256→128) │
        │  + Residual connection              │
        └─────────────────────────────────────┘
        ↓
        ↓  Final LayerNorm
        ↓  Extract CLS token (position 0)  ← shape: (batch, 128)
        ↓  MLP: Linear(128→128) → GELU → Dropout → Linear(128→64) → GELU
        ↓
   ┌────┴────┐
   ↓         ↓
Linear(64→2) Linear(64→1)
Direction    Return
(UP/DOWN)    (+1.8%)
```

---

## 12. All Commands Reference

```bash
# ── Setup ──────────────────────────────────────────────────────────────────
pip install -r requirements.txt
cp .env.example .env

# Check GPU
nvidia-smi
python -c "import torch; print('GPU:', torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'not found')"

# Install CUDA PyTorch (NVIDIA GPU)
pip uninstall torch torchvision -y
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# ── Fetch data ──────────────────────────────────────────────────────────────
python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01
python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01 --force   # force refresh
python data_fetch_upstox.py --symbol RELIANCE --unit minutes --interval 15  # 15min candles

# ── Train ───────────────────────────────────────────────────────────────────
python train_v2.py --symbol RELIANCE
python train_v2.py --symbol RELIANCE --epochs 100 --patience 10
python train_v2.py --symbol RELIANCE --d_model 256 --n_heads 8 --n_layers 6 --d_ff 512
python train_v2.py --symbol RELIANCE --window 90 --noise_threshold 0.005

# ── Backtest ────────────────────────────────────────────────────────────────
python backtest_v2.py --data data/raw/RELIANCE/1d.parquet
python backtest_v2.py --data data/raw/RELIANCE/1d.parquet --confidence 0.65

# ── Daily inference ─────────────────────────────────────────────────────────
python infer.py --symbol RELIANCE
python infer.py --symbol RELIANCE --output json

# ── API server ──────────────────────────────────────────────────────────────
uvicorn api_v2:app --reload        # dev
bash start.sh                       # production
curl http://localhost:8000/health
curl http://localhost:8000/info

# ── Docker ──────────────────────────────────────────────────────────────────
docker build -t ai-trading-service .
docker run --env-file .env -p 8000:8000 ai-trading-service
docker run -d --name ai-service --restart always --env-file .env -p 8000:8000 ai-trading-service
docker logs ai-service
docker stop ai-service
```
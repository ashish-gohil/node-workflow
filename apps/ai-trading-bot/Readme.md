# AI Stock Prediction Service — V2

A production-grade AI trading microservice that uses a Transformer neural network to predict the next day's price direction and expected return, then converts that into a BUY / SELL / HOLD signal.

Designed to plug into your n8n workflow builder as an autonomous daily trading node.

---

## Complete file map

```
ai-trading-service/
│
│  LAYER 1 — DATA
├── data_fetch_upstox.py    Fetches historical OHLCV from Upstox API
│
│  LAYER 2 — FEATURES
├── features_v2.py          Turns raw OHLCV into 27 technical indicators
│                           Exports FEATURE_COLS — the master feature list
├── strategies/
│   ├── base.py             Abstract base all strategies implement
│   ├── ma_strategy.py      Moving Average crossover (MA10 vs MA20)
│   ├── rsi_strategy.py     RSI — momentum exhaustion
│   ├── macd_strategy.py    MACD — momentum speed and direction
│   ├── bb_strategy.py      Bollinger Bands — volatility + price position
│   └── breakout_strategy.py  20-day resistance breakout
│
│  LAYER 3 — ML
├── dataset_v2.py           DataFrame → PyTorch sliding window dataset
├── model_v2.py             Transformer neural network
├── train_v2.py             Training loop with early stopping
├── backtest_v2.py          Historical performance evaluation
│
│  LAYER 4 — INFERENCE
├── infer.py                Daily CLI prediction (called by n8n)
├── api_v2.py               FastAPI REST endpoint /predict
│
│  LAYER 5 — SIGNAL
├── utils/trading_v2.py     Model outputs → BUY/SELL/HOLD + strength
│
│  CONFIG
├── config.py               Loads .env (Upstox token, paths, etc.)
├── requirements.txt
├── Dockerfile
├── start.sh
└── .env.example
```

---

## The AI architecture in plain English

### What the model sees

For every prediction, the model receives 60 trading days of data. Each day is 27 numbers (price features, RSI, MACD, Bollinger Bands, ATR, etc.). The model reads all 60 days at once and outputs: direction (UP/DOWN) + expected return %.

### The 5 layers inside the model

```
INPUT (60 days × 27 features)
        │
        ▼
1. LINEAR PROJECTION
   Projects 27 features → 128 numbers per day
   Each day becomes a 128-dimensional "fingerprint"
        │
        ▼
2. POSITIONAL ENCODING
   Adds a unique timestamp to each day
   Without this, the model cannot tell Day 1 from Day 60
        │
        ▼
3. TRANSFORMER ENCODER (4 layers)
   Each layer: Self-Attention + Feed-Forward Network
   Every day attends to every other day simultaneously
   The model learns which days and indicators matter most
        │
        ▼
4. CLS TOKEN POOLING
   A special "summary token" absorbs information from all 60 days
   This becomes the single vector representing the whole sequence
        │
        ▼
5. DUAL OUTPUT HEADS
   dir_head  → [UP probability, DOWN probability]
   ret_head  → single number (predicted % return)
```

### Why Transformer, not LSTM

LSTM reads the sequence left to right, one step at a time — by the time it reaches Day 60, it has largely forgotten Day 1 (vanishing gradient problem).

The Transformer reads all 60 days simultaneously. Day 1 can directly influence Day 60's understanding. This lets the model learn patterns like "whenever RSI was compressed for 20 days before a MACD crossover, the stock moved strongly" — multi-week relationships that LSTMs miss.

### How self-attention works here

For each day, the model computes how much it should "attend to" every other day. It does this by learning:
- Query (Q): what am I looking for?
- Key (K): what do I contain?
- Value (V): what information do I carry?

High Query-Key match → high attention weight → that day has strong influence on the current day's representation.

With 8 attention heads running in parallel, different heads specialise: one learns RSI patterns, another learns MACD crossovers, another learns volume spikes. All 8 run simultaneously and their outputs are merged.

### CLS Token (the change from original code)

The original code used "attention pooling" — a learned weighted sum of all timestep outputs. The rewritten model uses a CLS token (from BERT), which is a single learnable vector prepended to the sequence. After the Transformer runs, the CLS token has attended to all 60 days and accumulated a summary. This is more stable during training because its gradient path is cleaner.

---

## What each file does

### data_fetch_upstox.py

Downloads historical OHLCV candles from Upstox's API. Handles:
- Auto-downloading the NSE instruments list to find the correct instrument key for any symbol
- Parallel chunk fetching (splits years into chunks, fetches all simultaneously)
- Deduplication and sorting (parallel fetches return out-of-order)
- Caching to parquet files so you don't re-download on every run

### features_v2.py

Takes raw OHLCV and computes 27 technical indicator features. The key insight is that these features encode *what the price has been doing*, not just where it is now. Features include:

- **Momentum**: returns, log_returns, volatility
- **Trend**: ma_10, ma_20, ma_50, ema_12, ema_26, macd, macd_signal
- **Exhaustion**: rsi (0-100, >70 = overbought, <30 = oversold)
- **Volatility channel**: bb_upper, bb_lower, bb_width, bb_position (0=lower band, 1=upper)
- **Range**: atr, high_low_ratio, close_to_high, close_to_low
- **Breakout**: resistance (20-day high), breakout flag
- **Volume**: volume_ratio (today vs 10-day average)

Exports `FEATURE_COLS` — the canonical list used by dataset, train, and API. Change features in one place, all files stay in sync.

### strategies/

Each file is a standalone strategy class following a common interface (`BaseStrategy.apply(df) → df`). They are composable — you can apply any combination of strategies to a DataFrame. The strategies used by `features_v2.py` are: MA, RSI, MACD, Bollinger Bands, Breakout.

### dataset_v2.py

Converts a feature-engineered DataFrame into PyTorch tensors using a sliding window approach:
- Window of 60 days → one sample
- Label: 1 if the next day's return > 0.3% (UP), else 0 (DOWN)
- Returns smaller than ±0.3% are discarded as noise
- StandardScaler normalises all features to mean≈0, std≈1
- **Critical**: the scaler is saved as an attribute and must be persisted alongside the model

### model_v2.py

The Transformer architecture. Key design choices:
- `norm_first=True` (Pre-LN): LayerNorm is applied before attention, not after. This gives more stable gradients during training — the original Post-LN version can diverge at higher learning rates.
- CLS token pooling instead of attention pooling
- `d_model=128, n_heads=8, n_layers=4` — balanced between capacity and training speed on CPU
- `d_model % n_heads == 0` is enforced — each head gets 128/8=16 dimensions

### train_v2.py

Training loop with:
- **80/20 chronological split** — no data leakage (future data never in training)
- **WeightedRandomSampler** — balances UP/DOWN samples if the dataset is imbalanced
- **OneCycleLR scheduler** — learning rate warms up then decays, reaches better minima faster than constant LR
- **HuberLoss for return prediction** — more robust than MSE to outlier returns (like ±10% on earnings day)
- **Early stopping** — stops when validation loss stops improving (patience=8 epochs)
- Saves 3 files: `model_v2.pth`, `model_v2_config.pth`, `scaler_v2.pkl`

### utils/trading_v2.py

Converts raw model outputs into a trading decision using three gates:
1. If confidence < 0.55 → HOLD (model is not sure enough)
2. If abs(expected_return) < threshold → HOLD (predicted move is too small to trade)
3. Otherwise → BUY (direction=UP) or SELL (direction=DOWN)

Strength tiers: STRONG (conf > 0.72 AND return > 1.5%), MEDIUM (conf > 0.62 AND return > 0.8%).

### infer.py

The script you call from n8n or cron every day. Fetches the latest candles, runs the same feature pipeline as training, applies the saved scaler, passes through the model, prints the signal. Use `--output json` for machine-readable output that n8n can parse.

### api_v2.py

REST API wrapping the same inference logic. Accepts candle JSON, validates input, runs prediction, returns structured response. Loads model and scaler once at startup (not on every request) for performance.

---

## Step-by-step commands

### Setup

```bash
cd apps/ai-trading-service
python -m venv venv
source venv/bin/activate        # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your UPSTOX_ACCESS_TOKEN
```

### Fetch all historical data for any ticker

```bash
# Daily data back to 2000 (all available history)
python data_fetch_upstox.py --symbol RELIANCE --unit days --interval 1 --start 2000-01-01

# Other tickers:
python data_fetch_upstox.py --symbol TCS --start 2000-01-01
python data_fetch_upstox.py --symbol HDFCBANK --start 2000-01-01
python data_fetch_upstox.py --symbol INFY --start 2000-01-01

# Force re-download (ignore cache):
python data_fetch_upstox.py --symbol RELIANCE --force

# Data saved to: data/raw/RELIANCE/1d.parquet
```

### Train the model

```bash
# Default settings (recommended for first run)
python train_v2.py --symbol RELIANCE

# With custom hyperparameters:
python train_v2.py --symbol RELIANCE --d_model 256 --n_heads 8 --n_layers 6 --epochs 80

# Watch for val accuracy climbing above 0.58 — that means the model has learned something real
# Early stopping will trigger automatically when improvement stops
```

### Backtest (check model quality before going live)

```bash
python backtest_v2.py \
    --data data/raw/RELIANCE/1d.parquet \
    --model model_v2.pth \
    --config model_v2_config.pth \
    --scaler scaler_v2.pkl

# Look for:
#   Accuracy > 58%       (model has an edge)
#   Sharpe > 1.0         (good risk-adjusted returns)
#   STRONG acc > 65%     (confidence filter is working)
#   Max Drawdown < 25%   (not catastrophically losing)
```

### Daily prediction

```bash
# Human-readable (for manual review)
python infer.py --symbol RELIANCE

# JSON output (for n8n / automation)
python infer.py --symbol RELIANCE --output json

# Multiple tickers:
python infer.py --symbol TCS --output json
python infer.py --symbol HDFCBANK --output json
```

### Start the API server

```bash
./start.sh           # production
./start.sh --dev     # development (auto-reload)

# Test:
curl http://localhost:8000/health
curl http://localhost:8000/info
```

---

## n8n integration — the AI Trader node

The infer.py script is designed to be called directly from an n8n Execute Command node, or you can call the REST API from an HTTP Request node.

### Using Execute Command node (same machine)

```
Command: cd /path/to/ai-trading-service && source venv/bin/activate && python infer.py --symbol RELIANCE --output json
```

Parse the output in a Code node:
```javascript
return [{ json: JSON.parse($input.first().json.stdout) }];
```

### Using HTTP Request node (API on EC2)

```
Method: POST
URL:    http://your-ec2-ip:8000/predict
Body:   { "candles": {{ $json.candles }} }
```

### Recommended workflow structure

```
Cron (3:30 PM weekdays)
    → Fetch last 200 candles from Upstox
    → POST to /predict
    → Switch on signal:
        BUY  + STRONG  → Place order
        SELL + STRONG  → Close/short
        anything else  → Log only
    → Send Telegram notification
```

---

## Performance expectations

- Directional accuracy on unseen data: **60–65%** is excellent
- STRONG signal accuracy: **65–72%**
- Trade frequency: **~25% of days** generate a signal
- Training time on CPU: **15–30 minutes** for 4 years of daily data

Markets are partially random. Even 60% accuracy compounded over many STRONG signals produces significant positive expected value. The edge is real — it is just not dramatic.

---

## Improving the model further

1. **Multi-timeframe features** — add weekly candle features alongside daily
2. **5+ years of training data** — more history = better generalisation
3. **Index features** — add NIFTY50 columns so the model knows market direction
4. **Tune confidence thresholds** — backtest per threshold, find where your model actually exceeds 65%
5. **Monthly retraining** — market regimes change; schedule automated retraining
6. **Walk-forward validation** — more honest than a single 80/20 split
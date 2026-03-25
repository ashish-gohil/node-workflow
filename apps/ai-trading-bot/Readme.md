# 🧠 AI Stock Prediction Service

A production-ready, extensible AI system for predicting **stock direction (UP/DOWN)** and **expected return (%)** using:

* Historical OHLCV data (Zerodha API)
* Technical indicators
* Real-world trading strategies
* Transformer-based deep learning model
* Backtesting engine
* API for workflow automation (n8n compatible)

---

# 🚀 What This Project Does

This service acts as an **AI-powered technical analyst**.

Given the last *N days* of stock data, it predicts:

```json
{
  "direction": "UP",
  "confidence": 0.63,
  "expected_return": 0.012
}
```

### 🔍 Meaning of Output

| Field             | Meaning                                       |
| ----------------- | --------------------------------------------- |
| `direction`       | Predicted market movement (UP or DOWN)        |
| `confidence`      | Model certainty (0 → 1)                       |
| `expected_return` | Estimated % price change (e.g. 0.012 = +1.2%) |

---

# ⚠️ Important Reality

This is NOT a "future prediction oracle".

👉 It is a **probabilistic system**.

* 60% accuracy = VERY strong model
* Profit depends on strategy, not just prediction
* Markets are partially random

---

# 🧠 Core Idea

Instead of only using raw price:

```text
OHLCV → ❌ (Not enough)
```

We enhance it with:

```text
OHLCV
+ Indicators
+ Strategy Signals
+ Strategy Behavior
        ↓
Transformer Model
```

---

# 🏗️ Architecture Overview

```text
Zerodha API
    ↓
Data Fetch
    ↓
Feature Engineering
    ↓
Strategy Engine (pluggable)
    ↓
Dataset (sliding window)
    ↓
Transformer Model
    ↓
Backtesting Engine
    ↓
FastAPI Service (n8n)
```

---

# 📁 Project Structure

```
ai-service/
│
├── strategies/         # Plug-and-play trading strategies
│   ├── base.py
│   ├── ma_strategy.py
│   ├── rsi_strategy.py
│   └── breakout_strategy.py
│
├── data_fetch.py       # Zerodha data fetch
├── features.py         # Feature + strategy processing
├── dataset.py          # Sequence builder
├── model.py            # Transformer model
├── train.py            # Training pipeline
├── backtest.py         # Trading simulation
├── infer.py            # Prediction logic
└── api.py              # FastAPI for n8n
```

---

# 🔌 Strategy System (KEY FEATURE)

This project supports **extensible trading strategies**.

Each strategy:

* Adds signals to dataset
* Helps model learn real-world behavior

### Example strategies included:

* Moving Average Crossover
* RSI (overbought/oversold)
* Breakout detection

---

## ➕ Adding New Strategy

1. Create new file:

```python
class MyStrategy(BaseStrategy):
    def apply(self, df):
        df["my_signal"] = ...
        return df
```

2. Register in `features.py`:

```python
strategies.append(MyStrategy())
```

✅ Done — model will automatically use it.

---

# 📊 Data Pipeline

## Source: Zerodha API

Data used:

* Open
* High
* Low
* Close
* Volume

---

## Feature Engineering Includes:

* Returns (% change)
* Volatility
* Volume spikes
* RSI
* Moving averages
* Strategy signals

---

# 🧩 Dataset Creation

We use a **sliding window approach**:

```text
Last 30 days → Predict next day
```

Example:

```text
[Day1 ... Day30] → predict Day31
```

---

# 🤖 Model Architecture

Transformer-based model:

* Learns sequential patterns
* Understands trends and momentum
* Combines all strategies intelligently

---

## Model Outputs:

1. Direction (classification)
2. Return % (regression)

---

# 🏋️ Training Process

```bash
python train.py
```

Steps:

1. Fetch data
2. Process features
3. Apply strategies
4. Build dataset
5. Train model
6. Save model (`model.pt`)

---

# 🧪 Backtesting (CRITICAL)

Backtesting simulates real trading using model predictions.

```bash
python backtest.py
```

---

## What It Measures:

* Final capital
* Win rate
* Strategy effectiveness

---

## Why It Matters

Training accuracy ≠ real profit

👉 Backtesting tells truth

---

# 🔮 Prediction (Inference)

```python
predict(model, last_30_days_data)
```

Returns:

* Direction
* Confidence
* Expected return

---

# 🌐 API Usage (n8n Integration)

Start server:

```bash
uvicorn api:app --reload
```

---

## Endpoint:

```
POST /predict
```

### Input:

```json
[
  [features_day_1],
  [features_day_2],
  ...
]
```

---

### Output:

```json
{
  "direction": "UP",
  "confidence": 0.61,
  "expected_return": 0.008
}
```

---

# 🔗 n8n Integration

Use **HTTP Node**:

* Method: POST
* URL: `/predict`
* Input: last 30 days data

---

# 🎯 How to Use Predictions

DO NOT blindly trade.

---

## Recommended Strategy:

```text
If confidence > 0.6:
    take trade
Else:
    skip
```

---

## Combine With:

* Stop loss
* Risk management
* Portfolio rules

---

# 📈 Improving Model Performance

### ✅ Do This:

* Train per stock
* Add more strategies
* Improve features
* Filter noise
* Backtest properly

---

### ❌ Avoid:

* Overfitting
* Using only raw price
* Ignoring market randomness

---

# 🚀 Future Enhancements

* News sentiment integration
* Portfolio optimization
* Reinforcement learning trader
* Live trading execution
* Strategy marketplace (n8n-style nodes)

---

# 🧠 Final Philosophy

This system is NOT:

❌ Price predictor

This system IS:

✅ **AI trading decision engine**

---

# 📜 License

MIT License

---

# 👨‍💻 Author

Built for scalable AI trading systems & workflow automation.

---

# 💬 Final Note

Success in trading =

```text
Prediction + Strategy + Discipline
```

Not prediction alone.

# Deployment Guide — AI Trading Service (TFT Architecture)

---

## Table of Contents

1. [Prerequisites and file overview](#1-prerequisites)
2. [Run locally — no Docker](#2-run-locally)
3. [Run with Docker](#3-docker)
4. [Deploy to AWS EC2](#4-aws-ec2)
5. [Connect to n8n workflow](#5-n8n)
6. [Daily automation](#6-daily-automation)
7. [Update a running deployment](#7-update-deployment)
8. [Debugging](#8-debugging)

---

## 1. Prerequisites

### Three files the service needs to start

These are created by training (`python train_v2.py` or the Colab notebook). Without them the server will refuse to start with a clear error.

```
model_v2.pth          Trained model weights (the "brain")
model_v2_config.pth   Architecture config — how to rebuild the model at startup
scaler_v2.pkl         Fitted data scaler — MUST match the one used during training
```

If you do not have these yet:

- **Fastest path:** Run `train_colab.ipynb` on Google Colab (free T4 GPU, ~10 min), download the 3 files
- **Local training:** `python train_v2.py --mode pretrain --symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK`

### Python version

Python 3.11 or newer. Check with:

```bash
python --version
```

---

## 2. Run Locally

### Step 1 — Navigate

```bash
cd apps/ai-trading-service
```

### Step 2 — Virtual environment

```bash
python -m venv venv

# Mac / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt.

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

This installs PyTorch, FastAPI, scikit-learn, Upstox SDK, yfinance, and everything else. Takes 2-5 minutes on first run.

### Step 4 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your Upstox credentials:

```
UPSTOX_ACCESS_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
```

Get your token from https://upstox.com/developer/. The access token expires daily — for production automation you need to refresh it via the Upstox OAuth flow.

### Step 5 — Place trained model files

Copy the 3 model files to the project root:

```
apps/ai-trading-service/
├── model_v2.pth
├── model_v2_config.pth
├── scaler_v2.pkl
```

### Step 6 — Start the API server

```bash
uvicorn api_v2:app --reload --host 0.0.0.0 --port 8000
```

`--reload` restarts automatically when you edit code. Only use this in development.

### Step 7 — Test

```bash
# Health check
curl http://localhost:8000/health
# → {"status":"ok","model_loaded":true}

# Model info
curl http://localhost:8000/info
# → {"model":"StockPredictorTFT(...)","features":[...],"n_features":39,"window":30}

# Interactive docs (open in browser)
# http://localhost:8000/docs
```

### Step 8 — Test a prediction

```bash
python infer.py --symbol RELIANCE
```

Expected output:

```
============================================================
  DAILY SIGNAL — RELIANCE
============================================================
  Signal:          BUY  (STRONG)
  Direction:       UP
  Confidence:      67.3%
  Expected Return: +1.42%

  BUY RELIANCE — STRONG (direction: UP, confidence: 67.3%, expected move: +1.42%)
============================================================
```

---

## 3. Docker

### Build image

```bash
docker build -t ai-trading-service .
```

First build: 5-10 minutes (downloads Python packages). Subsequent builds: 30 seconds (cached layers).

### Run for development

```bash
docker run --env-file .env -p 8000:8000 ai-trading-service
```

### Run with live code reload (mount local folder)

```bash
docker run --env-file .env -p 8000:8000 -v $(pwd):/app ai-trading-service
```

### Test

```
http://localhost:8000/docs
```

---

## 4. AWS EC2

This is for the production inference server — the service your n8n workflow calls every day.

### Step 1 — Launch EC2 instance

In the AWS Console:

- AMI: Ubuntu Server 22.04 LTS
- Instance type: **t2.micro** (free tier — sufficient for CPU inference)
- Key pair: create or select a .pem file
- Security group: add inbound rule — Custom TCP, Port 8000, Source 0.0.0.0/0

### Step 2 — SSH in

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3 — Install Docker

```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit
```

Reconnect (required for group change to take effect):

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
docker --version   # should show version number
```

### Step 4 — Clone repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo/apps/ai-trading-service
```

### Step 5 — Create .env file

```bash
nano .env
```

Paste your credentials and save (Ctrl+X → Y → Enter).

### Step 6 — Copy trained model files from your local machine

Run this on your **local machine** (not EC2):

```bash
scp -i your-key.pem \
    model_v2.pth model_v2_config.pth scaler_v2.pkl \
    ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/your-repo/apps/ai-trading-service/
```

### Step 7 — Build Docker image

```bash
docker build -t ai-trading-service .
```

### Step 8 — Run in production mode

```bash
docker run -d \
    --name ai-service \
    --restart always \
    --env-file .env \
    -p 8000:8000 \
    ai-trading-service
```

Flags:

- `-d` — runs in background (detached)
- `--name ai-service` — name for easy reference
- `--restart always` — auto-restarts on crash or EC2 reboot
- `--env-file .env` — injects your API credentials

### Step 9 — Verify

```bash
docker ps                    # check container is running
docker logs ai-service       # check startup logs
curl http://localhost:8000/health
```

From outside (your laptop or n8n):

```bash
curl http://YOUR_EC2_PUBLIC_IP:8000/health
```

---

## 5. n8n Integration

### Option A — HTTP Request Node (recommended for production)

Add an HTTP Request node to your n8n workflow:

- Method: POST
- URL: `http://YOUR_EC2_PUBLIC_IP:8000/predict`
- Body (JSON):

```json
{
  "candles": [
    {"open": 2450.0, "high": 2480.0, "low": 2440.0, "close": 2470.0, "volume": 1200000},
    ... (at least 80 candles)
  ]
}
```

Response:

```json
{
  "direction": 1,
  "confidence": 0.6731,
  "expected_return": 0.0142,
  "signal": "BUY",
  "strength": "STRONG"
}
```

Access signal in downstream n8n nodes: `{{ $json.signal }}`

### Option B — Execute Command Node (same server)

If n8n runs on the same machine as the trading service:

```bash
cd /path/to/ai-trading-service && source venv/bin/activate && python infer.py --symbol RELIANCE --output json
```

The `--output json` flag prints clean JSON that n8n can parse.

---

## 6. Daily Automation

### Recommended n8n workflow

```
[Cron: 4:00 PM IST, Mon-Fri]
         ↓
[HTTP Request → POST /predict with recent candles]
         ↓
[Set node — extract fields]
  signal    = {{ $json.signal }}
  strength  = {{ $json.strength }}
  confidence = {{ $json.confidence }}
         ↓
[IF: signal != "HOLD"]
         ↓                           ↓
[Telegram/Slack message]     [IF: strength == "STRONG"]
  "RELIANCE: BUY STRONG              ↓
   (67% confidence)"         [Place order via Upstox API]
```

### Cron job alternative (no n8n)

On your server or laptop, add to crontab (`crontab -e`):

```bash
# Run at 4:00 PM IST (10:30 UTC) Monday-Friday
30 10 * * 1-5 cd /path/to/ai-trading-service && source venv/bin/activate && python infer.py --symbol RELIANCE --output json >> /var/log/trading-signals.log 2>&1
```

---

## 7. Update a Running Deployment

When you retrain the model or update code on EC2:

```bash
# SSH in
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd your-repo/apps/ai-trading-service

# Pull latest code
git pull

# If you retrained — copy new model files from your local machine first:
# (run this on your LOCAL machine)
# scp -i your-key.pem model_v2.pth model_v2_config.pth scaler_v2.pkl ubuntu@EC2_IP:/path/to/service/

# Rebuild image with latest code and model files
docker build -t ai-trading-service .

# Stop old container
docker stop ai-service
docker rm ai-service

# Start new container
docker run -d \
    --name ai-service \
    --restart always \
    --env-file .env \
    -p 8000:8000 \
    ai-trading-service

# Verify
docker logs ai-service
curl http://localhost:8000/health
```

---

## 8. Debugging

### Check if container is running

```bash
docker ps
docker ps -a   # includes stopped containers
```

### View logs

```bash
docker logs ai-service             # all logs
docker logs -f ai-service          # follow live
docker logs --tail 50 ai-service   # last 50 lines
```

### Common errors and fixes

**"Model not found: model_v2.pth"**
The model files were not in the project directory when the Docker image was built. Copy `model_v2.pth`, `model_v2_config.pth`, `scaler_v2.pkl` into the project folder and rebuild the image.

**"Connection refused on port 8000"**
Either the container is not running (`docker ps` shows nothing) or the EC2 security group is missing the port 8000 inbound rule. Check AWS Console → EC2 → Security Groups.

**"After feature engineering only N rows remain; need 30"**
Your `/predict` request needs at least 80 candles (30 for the window + 50 for indicator warmup). Send 150-200 candles.

**Container starts then immediately stops**
Run `docker logs ai-service` — usually a missing .env variable or missing model file.

**"StockPredictorTFT" constructor error**
Old model files (trained with the previous Transformer architecture) are incompatible with the new TFT architecture. Delete old `.pth` files and retrain.

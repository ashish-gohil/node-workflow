# 🚀 AI Trading Service – Complete Setup & Deployment Guide

This guide covers **everything end-to-end**:

- 🧪 Run locally (dev)
- 🐳 Run with Docker
- ☁️ Deploy to AWS EC2 (production)
- 🔗 Integrate with Turborepo / n8n

---

# 🧠 1. PROJECT OVERVIEW

Your service:

```text
AI Trading Microservice (Python + FastAPI)
```

Flow:

```text
OHLC Data → Features (Strategies) → Model → Prediction API
```

---

# 📁 2. FINAL PROJECT STRUCTURE

```
apps/
└── ai-trading-service/
    ├── strategies/
    ├── data_fetch.py
    ├── features.py
    ├── dataset.py
    ├── model.py
    ├── train.py
    ├── backtest.py
    ├── infer.py
    ├── api.py
    ├── config.py

    ├── requirements.txt
    ├── Dockerfile
    ├── .dockerignore
    ├── start.sh

    ├── .env
    ├── .env.example

    ├── models/
    │   └── model.pt
```

---

# 🧪 3. RUN LOCALLY (WITHOUT DOCKER)

---

## Step 1: Navigate

```bash
cd apps/ai-trading-service
```

---

## Step 2: Create Virtual Environment

```bash
python -m venv venv
```

### Activate

**Windows**

```bash
venv\Scripts\activate
```

**Mac/Linux**

```bash
source venv/bin/activate
```

---

## Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Step 4: Setup Environment Variables

Create `.env`:

```env
KITE_API_KEY=
KITE_API_SECRET=
ACCESS_TOKEN=
MODEL_PATH=models/model.pt
```

---

## Step 5: Train Model

```bash
python train.py
```

✔ This generates:

```
models/model.pt
```

---

## Step 6: Run API

```bash
uvicorn api:app --reload
```

---

## Step 7: Test

Open:

```
http://localhost:8000/docs
```

---

# 🐳 4. RUN LOCALLY USING DOCKER

---

## Step 1: Build Image

```bash
docker build -t ai-trading-service .
```

---

## Step 2: Run Container

```bash
docker run --env-file .env -p 8000:8000 ai-trading-service
```

---

## Step 3: Access API

```
http://localhost:8000/docs
```

---

## 🔥 Dev Mode (Hot Reload)

```bash
docker run --env-file .env -p 8000:8000 -v $(pwd):/app ai-trading-service
```

---

# ☁️ 5. DEPLOY TO AWS EC2 (PRODUCTION)

---

## Step 1: Launch EC2

- OS: Ubuntu 22.04
- Instance: `t2.micro` (Free tier)

---

## Step 2: Configure Security Group

Allow:

```
Custom TCP → Port 8000 → 0.0.0.0/0
```

---

## Step 3: SSH into EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

---

## Step 4: Install Docker

```bash
sudo apt update
sudo apt install docker.io -y

sudo systemctl start docker
sudo systemctl enable docker
```

---

## Step 5: Enable Docker Without sudo

```bash
sudo usermod -aG docker ubuntu
exit
```

Reconnect:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

---

## Step 6: Clone Repository

```bash
git clone <your-repo-url>
cd apps/ai-trading-service
```

---

## Step 7: Add Environment Variables

```bash
nano .env
```

Paste your values.

---

## Step 8: Build Docker Image

```bash
docker build -t ai-trading-service .
```

---

## Step 9: Run Container (Production Mode)

```bash
docker run -d \
  --name ai-service \
  --restart always \
  --env-file .env \
  -p 8000:8000 \
  ai-trading-service
```

---

## Step 10: Access API

```
http://your-ec2-ip:8000/docs
```

---

# 🔗 6. CONNECT WITH N8N / NODE API

---

## Endpoint

```
POST http://your-ec2-ip:8000/predict
```

---

## Body Example

```json
{
  "candles": [
    {
      "open": 100,
      "high": 105,
      "low": 99,
      "close": 104,
      "volume": 1000
    }
  ]
}
```

---

# 🔄 7. UPDATE DEPLOYMENT (CI FLOW)

---

```bash
cd apps/ai-trading-service

git pull

docker build -t ai-trading-service .

docker stop ai-service
docker rm ai-service

docker run -d \
  --name ai-service \
  --restart always \
  --env-file .env \
  -p 8000:8000 \
  ai-trading-service
```

---

# 📊 8. DEBUGGING

---

## Check Running Containers

```bash
docker ps
```

---

## View Logs

```bash
docker logs ai-service
```

---

## Stop Container

```bash
docker stop ai-service
```

---

# ⚠️ 9. PRODUCTION BEST PRACTICES

---

## ✅ Load model once (performance)

## ✅ Separate training & inference

## ✅ Use Docker always

## ✅ Use `.env` (never hardcode secrets)

---

## 🔐 Future Improvements

- Nginx (reverse proxy)
- HTTPS (SSL)
- Domain mapping
- AWS ECS / Kubernetes
- Redis caching
- Queue-based inference

---

# 🧠 FINAL FLOW

```text
Train Model → model.pt
        ↓
Docker Build
        ↓
Deploy to EC2
        ↓
FastAPI Service
        ↓
n8n / Backend / Frontend
        ↓
Prediction
```

---

# 🎯 FINAL NOTE

- Train models locally or via pipeline
- Deploy only inference service
- Keep updating models periodically

---

🚀 Your AI Trading Service is now **fully production-ready + scalable + microservice compatible**

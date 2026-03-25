# 🚀 Deployment Guide: AI Trading Service (Docker + AWS EC2)

This guide explains **step-by-step deployment** of your AI Trading Service using:

- 🐳 Docker (for packaging)
- ☁️ AWS EC2 (for hosting)
- 🔗 Integration with Turborepo

---

# 📁 1. Turborepo Folder Structure

Place your AI service inside:

```
/apps/ai-trading-service
```

---

## ✅ Final Structure

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
```

---

# 🐳 2. Build & Test Locally

---

## Step 1: Build Docker Image

```
docker build -t ai-trading-service .
```

---

## Step 2: Run Container

```
docker run --env-file .env -p 8000:8000 ai-trading-service
```

---

## Step 3: Test API

Open:

```
http://localhost:8000/docs
```

---

# ☁️ 3. AWS EC2 SETUP

---

## Step 1: Launch EC2

- OS: Ubuntu
- Instance: t2.micro (Free Tier)

---

## Step 2: Open Port

Allow:

```
Port: 8000
```

---

## Step 3: SSH

```
ssh -i your-key.pem ubuntu@your-ec2-ip
```

---

# ⚙️ 4. INSTALL DOCKER

```
sudo apt update
sudo apt install docker.io -y

sudo systemctl start docker
sudo systemctl enable docker
```

---

## Allow docker without sudo

```
sudo usermod -aG docker ubuntu
exit
```

Reconnect SSH.

---

# 📥 5. DEPLOY CODE

```
git clone <your-repo>
cd apps/ai-trading-service
```

---

# 🐳 6. BUILD IMAGE

```
docker build -t ai-trading-service .
```

---

# ▶️ 7. RUN CONTAINER

```
docker run -d -p 8000:8000 ai-trading-service
```

---

# 🌐 8. ACCESS API

```
http://your-ec2-ip:8000/docs
```

---

# 🔗 9. CONNECT n8n

Use HTTP node:

```
POST http://your-ec2-ip:8000/predict
```

---

# 🔄 10. UPDATE DEPLOYMENT

```
git pull
docker build -t ai-trading-service .
docker stop <container_id>
docker run -d -p 8000:8000 ai-trading-service
```

---

# 📊 11. DEBUGGING

---

## Running containers

```
docker ps
```

---

## Logs

```
docker logs <container_id>
```

---

## Stop

```
docker stop <container_id>
```

---

# ⚠️ 12. PRODUCTION IMPROVEMENTS

---

## Persistent container

```
docker run -d -p 8000:8000 --name ai-service ai-trading-service
```

---

## Auto restart

```
docker run -d --restart always -p 8000:8000 ai-trading-service
```

---

## Use Nginx later for:

- HTTPS
- Domain

---

# 🧠 FINAL FLOW

```
Train Model → model.pt
        ↓
Docker Image
        ↓
EC2
        ↓
API
        ↓
n8n → Prediction
```

---

# 🎯 FINAL NOTE

- Train locally
- Deploy only inference
- Keep model updated

---

🚀 Your AI service is now production-ready.

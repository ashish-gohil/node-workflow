# Deployment Guide — AI Trading Service

Everything you need to run this service: locally for development, in Docker, and on AWS EC2 for production.

---

## What We Are Deploying

This is a Python FastAPI service that loads a trained PyTorch model and serves trading signals over HTTP. Your n8n workflow calls it to get BUY / SELL / HOLD signals.

```
n8n workflow / cron job
        ↓
   Port 8000
        ↓
  FastAPI  (api_v2.py)
        ↓
  StockTransformerV2  (model_v2.pth)
        ↓
  Trading Signal
```

Three files must be present before starting the service — created by `train_v2.py`:

- `model_v2.pth` — trained model weights
- `model_v2_config.pth` — architecture config
- `scaler_v2.pkl` — fitted data scaler

---

## Option 1 — Run Locally (Development)

```bash
cd apps/ai-trading-service

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install packages
pip install -r requirements.txt

# Setup env
cp .env.example .env
# Edit .env → fill in UPSTOX_ACCESS_TOKEN

# Fetch data + train
python data_fetch_upstox.py --symbol RELIANCE --start 2000-01-01
python train_v2.py --symbol RELIANCE

# Start server
uvicorn api_v2:app --reload
```

Visit http://localhost:8000/docs to test.

---

## Option 2 — Run with Docker (Local)

```bash
# Build image
docker build -t ai-trading-service .

# Run
docker run --env-file .env -p 8000:8000 ai-trading-service

# Dev mode (hot reload with live code mount)
docker run --env-file .env -p 8000:8000 -v $(pwd):/app ai-trading-service
```

---

## Option 3 — Deploy to AWS EC2 (Production)

### Launch EC2

- OS: Ubuntu Server 22.04 LTS
- Instance type: t2.micro (free tier, good for CPU inference)
- Key pair: create/select a .pem file

### Security Group — add inbound rule

```
Type: Custom TCP    Port: 8000    Source: 0.0.0.0/0
```

### SSH in

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Install Docker

```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit   # disconnect then reconnect for group change to apply
```

### Clone repo and configure

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo/apps/ai-trading-service
nano .env    # paste your credentials
```

### Copy trained model files from your local machine

Run this on your LOCAL machine:

```bash
scp -i your-key.pem model_v2.pth model_v2_config.pth scaler_v2.pkl \
    ubuntu@your-ec2-ip:/home/ubuntu/your-repo/apps/ai-trading-service/
```

### Build and run

```bash
docker build -t ai-trading-service .

docker run -d \
  --name ai-service \
  --restart always \
  --env-file .env \
  -p 8000:8000 \
  ai-trading-service
```

`--restart always` means Docker auto-restarts the container after crashes or EC2 reboots.

### Verify

```bash
docker ps
docker logs ai-service
curl http://localhost:8000/health
curl http://your-ec2-public-ip:8000/health   # from outside
```

Update your n8n HTTP Request node URL to: `http://your-ec2-public-ip:8000/predict`

---

## Updating the Deployment

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd your-repo/apps/ai-trading-service
git pull

# If you retrained: copy new model files from local machine first (see above)

docker build -t ai-trading-service .
docker stop ai-service && docker rm ai-service

docker run -d \
  --name ai-service \
  --restart always \
  --env-file .env \
  -p 8000:8000 \
  ai-trading-service
```

---

## Debugging

```bash
docker ps                          # is container running?
docker logs ai-service             # full logs
docker logs -f ai-service          # live follow
docker logs --tail 50 ai-service   # last 50 lines
```

Common errors:

**"Model not found: model_v2.pth"** — Model files not in project folder when image was built. Copy them in and rebuild.

**"Connection refused on port 8000"** — Container not running, or EC2 security group missing the port 8000 inbound rule.

**Container immediately exits** — Run `docker logs ai-service` to see the error. Usually missing .env variables.

**"Not enough candles"** from /predict — Send at least 80 candles (150-200 is safer).

---

## Future Production Hardening

- **Nginx** as reverse proxy on port 80/443
- **HTTPS** via Let's Encrypt / Certbot (free SSL)
- **Domain name** — point a subdomain to your EC2 IP
- **API key auth** — add a secret header check in `api_v2.py`
- **Auto-retrain cron** — weekly job that fetches fresh data and retrains
- **t3.medium** for faster startup; GPU instance only needed for training

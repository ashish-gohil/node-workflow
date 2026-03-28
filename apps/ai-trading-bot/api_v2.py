from fastapi import FastAPI
import torch
import torch.nn.functional as F
import pandas as pd

from model_v2 import StockTransformerV2
from features_v2 import add_features_v2
from utils.trading_v2 import generate_signal_v2

app = FastAPI()

# Load model
model = StockTransformerV2(input_dim=12)  # adjust if features change
model.load_state_dict(torch.load("model_v2.pth", map_location="cpu"))
model.eval()

# -------------------------------
# HEALTH CHECK
# -------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------------
# PREDICT ENDPOINT
# -------------------------------

@app.post("/predict")
def predict(data: list):

    # Convert input → DataFrame
    df = pd.DataFrame(data)

    # Feature engineering
    df = add_features_v2(df)

    # Take last 60 timesteps
    df = df.tail(60)

    # Convert to tensor
    X = torch.tensor(df.values, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():

        dir_pred, ret_pred = model(X)

        # 🔥 Convert logits → probabilities
        probs = F.softmax(dir_pred, dim=1)

        confidence = probs.max().item()
        direction = probs.argmax().item()
        expected_return = ret_pred.item()

    # 🔥 Generate trading signal
    signal, strength = generate_signal_v2(
        direction,
        confidence,
        expected_return
    )

    return {
        "direction": direction,
        "confidence": confidence,
        "return": expected_return,
        "signal": signal,
        "strength": strength
    }
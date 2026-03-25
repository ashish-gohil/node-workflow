from fastapi import FastAPI
import torch
from model import StockTransformer

app = FastAPI()

model = StockTransformer(input_dim=INPUT_DIM)
model.load_state_dict(torch.load("model.pt"))
model.eval()

@app.post("/predict")
def predict(data: list):

    x = torch.tensor(data, dtype=torch.float32).unsqueeze(0)

    dir_logits, ret = model(x)

    probs = torch.softmax(dir_logits, dim=1)

    return {
        "direction": "UP" if probs.argmax() == 1 else "DOWN",
        "confidence": probs.max().item(),
        "expected_return": ret.item()
    }
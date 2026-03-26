from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

import pandas as pd
from infer import predict   # ✅ use infer layer

app = FastAPI()


# -------------------------------
# REQUEST SCHEMA (IMPORTANT)
# -------------------------------

class Candle(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float


class PredictRequest(BaseModel):
    candles: List[Candle]


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
def predict_api(req: PredictRequest):

    # Convert structured input → DataFrame
    df = pd.DataFrame([c.dict() for c in req.candles])

    # Call inference layer
    result = predict(df)

    return result
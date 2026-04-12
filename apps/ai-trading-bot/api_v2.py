"""
api_v2.py — FastAPI inference service for StockPredictor V4
=============================================================

V4 changes from V3:
  - Model outputs a single signed return scalar (not logits + return)
  - Direction derived from sign(pred), confidence from sigmoid(|pred|×scale)
  - /predict accepts at least 120 candles (Ichimoku needs ~100 warmup rows)
  - /info shows model horizon
"""
import os
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from contextlib import asynccontextmanager

import joblib
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator

from features_v2 import FEATURE_COLS, add_features_v2
from model_v2 import StockPredictor
from utils.trading_v2 import generate_signal_v2, pred_to_confidence

MODEL_PATH  = os.getenv("MODEL_PATH",  "model_v2.pth")
CONFIG_PATH = os.getenv("CONFIG_PATH", "model_v2_config.pth")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler_v2.pkl")

_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model + scaler once at startup."""
    for path, label in [(MODEL_PATH, "Model"), (SCALER_PATH, "Scaler")]:
        if not os.path.exists(path):
            raise RuntimeError(
                f"{label} not found: {path}\n"
                "Run: python train_v2.py --symbol RELIANCE --horizon 3"
            )

    # Load architecture config (saved by model.get_config())
    if os.path.exists(CONFIG_PATH):
        cfg = torch.load(CONFIG_PATH, map_location="cpu")
    else:
        cfg = {
            "input_dim": len(FEATURE_COLS), "window": 30,
            "d_model": 64, "n_layers": 2, "n_heads": 4,
            "d_ff": 128, "dropout": 0.0, "horizon": 3,
        }

    model = StockPredictor(**cfg)
    state = torch.load(MODEL_PATH, map_location="cpu")
    missing, _ = model.load_state_dict(state, strict=False)
    if missing:
        print(f"[api] Note: {len(missing)} missing keys (zero-initialised)")
    model.eval()

    _state["model"]  = model
    _state["scaler"] = joblib.load(SCALER_PATH)
    _state["config"] = cfg
    print(f"[api] {model}")
    yield
    _state.clear()


app = FastAPI(title="AI Trading Service — V4 iTransformer", version="4.0",
              lifespan=lifespan)


class Candle(BaseModel):
    open: float
    high: float
    low:  float
    close: float
    volume: float

    @field_validator("open", "high", "low", "close", "volume")
    @classmethod
    def non_negative(cls, v):
        if v < 0:
            raise ValueError("OHLCV values must be non-negative")
        return v


class PredictRequest(BaseModel):
    candles: list[Candle]

    @field_validator("candles")
    @classmethod
    def min_length(cls, v):
        # Ichimoku needs ~100 warmup rows + 30 window + some buffer
        if len(v) < 150:
            raise ValueError(
                "Need at least 150 candles "
                "(Ichimoku needs ~100 warmup rows + 30-day window + buffer)."
            )
        return v


class PredictResponse(BaseModel):
    direction:         int    # 1 = UP, 0 = DOWN
    confidence:        float  # 0-1, from sigmoid(|pred|*scale)
    predicted_return:  float  # signed return (e.g. +0.018 = +1.8%)
    horizon_days:      int    # prediction horizon
    signal:            str    # BUY / SELL / HOLD
    strength:          str    # STRONG / MEDIUM / WEAK


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in _state}


@app.get("/info")
def info():
    cfg = _state.get("config", {})
    return {
        "model":        str(_state.get("model", "not loaded")),
        "architecture": "iTransformer V4",
        "features":     FEATURE_COLS,
        "n_features":   len(FEATURE_COLS),
        "window":       cfg.get("window", 30),
        "horizon_days": cfg.get("horizon", 3),
        "output":       "single signed return (direction = sign(output))",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        model  = _state["model"]
        scaler = _state["scaler"]
        cfg    = _state["config"]
        window = cfg.get("window", 30)

        df = pd.DataFrame([c.model_dump() for c in request.candles])
        df = add_features_v2(df)

        if len(df) < window:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"After feature engineering only {len(df)} rows remain; "
                    f"need {window}. Send more candles."
                )
            )

        X_scaled = scaler.transform(df.tail(window)[FEATURE_COLS].values)
        X = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            pred_raw = model(X).squeeze(-1).item()

        direction  = 1 if pred_raw > 0 else 0
        confidence = pred_to_confidence(pred_raw)
        signal, strength = generate_signal_v2(direction, confidence, pred_raw)

        return PredictResponse(
            direction=direction,
            confidence=round(confidence, 4),
            predicted_return=round(pred_raw, 6),
            horizon_days=cfg.get("horizon", 3),
            signal=signal,
            strength=strength,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
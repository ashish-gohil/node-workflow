"""
api_v2.py — FastAPI inference service.
"""

import os
import sys

# ── Fix imports (must be before any local imports) ────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# ─────────────────────────────────────────────────────────────────────────────

from contextlib import asynccontextmanager

import joblib
import pandas as pd
import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator

from features_v2 import add_features_v2, FEATURE_COLS
from model_v2 import StockTransformerV2
from utils.trading_v2 import generate_signal_v2   # works because sys.path is set above

# ─── Paths ────────────────────────────────────────────────────────────────────
MODEL_PATH  = os.getenv("MODEL_PATH",  "model_v2.pth")
CONFIG_PATH = os.getenv("CONFIG_PATH", "model_v2_config.pth")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler_v2.pkl")

_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading model...")
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model not found: {MODEL_PATH}. Run train_v2.py first.")
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError(f"Scaler not found: {SCALER_PATH}. Run train_v2.py first.")

    cfg = torch.load(CONFIG_PATH, map_location="cpu") if os.path.exists(CONFIG_PATH) else {}
    model = StockTransformerV2(
        input_dim=cfg.get("input_dim", len(FEATURE_COLS)),
        d_model=cfg.get("d_model", 128),
        n_heads=cfg.get("n_heads", 8),
        n_layers=cfg.get("n_layers", 4),
        dropout=0.0,
    )
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()

    scaler = joblib.load(SCALER_PATH)
    _state["model"]  = model
    _state["scaler"] = scaler
    _state["config"] = cfg

    print(f"Model loaded: {model}")
    yield
    _state.clear()


app = FastAPI(title="AI Trading Service", version="2.0", lifespan=lifespan)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class Candle(BaseModel):
    open:   float
    high:   float
    low:    float
    close:  float
    volume: float

    @field_validator("close", "open", "high", "low", "volume")
    @classmethod
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError("OHLCV values must be non-negative")
        return v


class PredictRequest(BaseModel):
    candles: list[Candle]

    @field_validator("candles")
    @classmethod
    def min_candles(cls, v):
        if len(v) < 80:
            raise ValueError("Need at least 80 candles")
        return v


class PredictResponse(BaseModel):
    direction:       int
    confidence:      float
    expected_return: float
    signal:          str
    strength:        str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in _state}


@app.get("/info")
def info():
    cfg = _state.get("config", {})
    return {
        "model":      str(_state.get("model", "not loaded")),
        "features":   FEATURE_COLS,
        "n_features": len(FEATURE_COLS),
        "window":     cfg.get("window", 60),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        model  = _state["model"]
        scaler = _state["scaler"]
        window = _state["config"].get("window", 60)

        df = pd.DataFrame([c.model_dump() for c in request.candles])
        df = add_features_v2(df)

        if len(df) < window:
            raise HTTPException(
                status_code=422,
                detail=f"After feature engineering only {len(df)} rows remain; need {window}."
            )

        df_window = df.tail(window)[FEATURE_COLS]
        X_scaled  = scaler.transform(df_window.values)
        X = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            dir_logits, ret_pred = model(X)
            probs           = torch.nn.functional.softmax(dir_logits, dim=1)
            confidence      = probs.max().item()
            direction       = probs.argmax().item()
            expected_return = ret_pred.item()

        signal, strength = generate_signal_v2(direction, confidence, expected_return)

        return PredictResponse(
            direction=direction,
            confidence=round(confidence, 4),
            expected_return=round(expected_return, 6),
            signal=signal,
            strength=strength,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
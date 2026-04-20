"""
api_v2.py — FastAPI Inference Service for StockForecastNet V5
==============================================================

ROUTES
───────
GET  /health                   → liveness check
GET  /info                     → model architecture + feature list
POST /predict                  → standard OHLCV candle objects
POST /predict/upstox           → raw Upstox historical candle array (direct)
POST /predict/upstox/intraday  → raw Upstox intraday candle array
POST /predict/upstox/auto      → auto-detect any Upstox response shape

V5 CHANGES
───────────
- Model outputs (horizon,) multi-step predictions, not a single scalar
- time_features extracted from candle timestamps and passed to model
- Response includes all_horizon_steps and step_agreement
- Primary signal = last horizon step (furthest prediction)
"""

import os
import sys
from typing import Any, Dict, List, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from contextlib import asynccontextmanager

import joblib
import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from dataset_v5 import extract_time_features
from features_v2 import FEATURE_COLS, add_features_v2
from model_v5 import StockForecastNet
from utils.trading_v2 import generate_signal_v2, pred_to_confidence

MODEL_PATH  = os.getenv("MODEL_PATH",  "model_v2.pth")
CONFIG_PATH = os.getenv("CONFIG_PATH", "model_v2_config.pth")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler_v2.pkl")
MIN_CANDLES = 150   # Ichimoku(52)+MA50+window=90 needs ~150 candles

_state: dict = {}


# ─── Model loading ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    for path, label in [(MODEL_PATH, "Model"), (SCALER_PATH, "Scaler")]:
        if not os.path.exists(path):
            raise RuntimeError(
                f"{label} not found: {path}\n"
                "Run: python train_v2.py --mode pretrain "
                "--symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK"
            )

    cfg = (torch.load(CONFIG_PATH, map_location="cpu")
           if os.path.exists(CONFIG_PATH) else {
               "n_features": len(FEATURE_COLS), "seq_len": 90, "horizon": 3,
               "patch_size": 16, "stride": 8, "d_model": 128,
               "n_heads": 4, "n_layers": 2, "d_ff": 256,
               "dropout": 0.0, "revin_affine": True,
           })

    model = StockForecastNet(**cfg)
    weights = torch.load(MODEL_PATH, map_location="cpu")
    missing, _ = model.load_state_dict(weights, strict=False)
    if missing:
        print(f"[api] {len(missing)} missing keys (zero-initialised)")
    model.eval()

    _state["model"]   = model
    _state["scaler"]  = joblib.load(SCALER_PATH)
    _state["config"]  = cfg
    print(f"[api] Loaded: {model}")
    yield
    _state.clear()


app = FastAPI(
    title="AI Trading Service — StockForecastNet V5",
    version="5.0",
    lifespan=lifespan,
    description=(
        "Multi-step stock return forecasting using PatchTST + ReVIN + "
        "Dual-Stream CI Transformer. Accepts standard OHLCV or raw Upstox API responses."
    ),
)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class Candle(BaseModel):
    open:     float
    high:     float
    low:      float
    close:    float
    volume:   float
    datetime: Optional[str] = None

    @field_validator("open", "high", "low", "close", "volume")
    @classmethod
    def non_negative(cls, v):
        if v < 0:
            raise ValueError("OHLCV values must be ≥ 0")
        return v


class PredictRequest(BaseModel):
    candles: List[Candle]

    @field_validator("candles")
    @classmethod
    def check_length(cls, v):
        if len(v) < MIN_CANDLES:
            raise ValueError(
                f"Need ≥ {MIN_CANDLES} candles. Got {len(v)}. "
                "Ichimoku needs 78 warmup rows + 90-day model window + buffer."
            )
        return v


class UpstoxRequest(BaseModel):
    """
    Accepts the raw Upstox API response in any of these shapes:
      Shape A: {"status":"success","data":{"candles":[[ts,o,h,l,c,v,oi],...]}}
      Shape B: {"data":{"candles":[...]}}
      Shape C: {"candles":[[ts,o,h,l,c,v,oi],...]}
    Candle order: newest first (reversed automatically).
    """
    status:  Optional[str]             = None
    data:    Optional[Dict[str, Any]]  = None
    candles: Optional[List[List[Any]]] = None

    @model_validator(mode="after")
    def resolve_candles(self) -> "UpstoxRequest":
        c = self.candles
        if c is None and self.data:
            c = self.data.get("candles")
        if c is None:
            raise ValueError(
                "No candles found. Expected: "
                "{'candles':[[ts,o,h,l,c,v,oi],...]} or full Upstox response."
            )
        if len(c) < MIN_CANDLES:
            raise ValueError(f"Need ≥ {MIN_CANDLES} candles. Got {len(c)}.")
        for i, row in enumerate(c):
            if not isinstance(row, (list, tuple)) or len(row) < 6:
                raise ValueError(
                    f"candles[{i}] invalid. Expected [ts,open,high,low,close,volume,oi?]. "
                    f"Got: {row}"
                )
        self.candles = c
        return self


class PredictResponse(BaseModel):
    signal:              str
    strength:            str
    direction:           int
    direction_label:     str
    confidence:          float
    predicted_return:    float
    horizon_days:        int
    all_horizon_steps:   List[float]
    step_agreement:      bool
    candles_received:    int
    candles_used:        int
    action:              str


# ─── Shared inference logic ───────────────────────────────────────────────────

def _run_inference(df: pd.DataFrame, n_received: int) -> PredictResponse:
    """
    Run V5 inference on an OHLCV DataFrame.
    Extracts time_features from datetime column if available.
    """
    model  = _state["model"]
    scaler = _state["scaler"]
    cfg    = _state["config"]
    window = cfg.get("seq_len", 90)
    horizon = cfg.get("horizon", 3)

    try:
        df_feat = add_features_v2(df)
    except Exception as e:
        raise HTTPException(422, f"Feature engineering failed: {e}")

    n_clean = len(df_feat)
    if n_clean < window:
        raise HTTPException(
            422,
            f"After feature engineering only {n_clean} rows remain; "
            f"need {window}. Send more candles (received {n_received})."
        )

    # Scale features
    X_raw    = df_feat.tail(window)[FEATURE_COLS].values
    X_scaled = scaler.transform(X_raw)
    X        = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

    # Time features for the model window
    window_start = max(0, n_clean - window)
    tf_np  = extract_time_features(df_feat, window_start=window_start, window_len=window)
    tf_t   = torch.tensor(tf_np, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        preds = model(X, tf_t)   # (1, horizon)

    pred_primary = preds[0, -1].item()
    all_steps    = [round(float(preds[0, h]), 6) for h in range(horizon)]
    direction    = 1 if pred_primary > 0 else 0
    confidence   = pred_to_confidence(pred_primary)
    signal, strength = generate_signal_v2(direction, confidence, pred_primary)

    dl   = "UP" if direction == 1 else "DOWN"
    sign = "+" if pred_primary >= 0 else ""
    agree = all(s > 0 for s in all_steps) or all(s < 0 for s in all_steps)

    action = (
        f"{signal} ({strength}) — {dl} with {confidence:.1%} confidence. "
        f"Predicted {horizon}-day return: {sign}{pred_primary:.2%}. "
        f"All steps: {[f'{s:+.2%}' for s in all_steps]}."
    )

    return PredictResponse(
        signal            = signal,
        strength          = strength,
        direction         = direction,
        direction_label   = dl,
        confidence        = round(confidence, 4),
        predicted_return  = round(pred_primary, 6),
        horizon_days      = horizon,
        all_horizon_steps = all_steps,
        step_agreement    = agree,
        candles_received  = n_received,
        candles_used      = n_clean,
        action            = action,
    )


def _upstox_candles_to_df(candles: List[List[Any]]) -> pd.DataFrame:
    """
    Convert raw Upstox candle array to OHLCV DataFrame.
    Upstox returns newest-first → reversed to oldest-first.
    Each candle: [timestamp, open, high, low, close, volume, oi]
    """
    rows = []
    for c in reversed(candles):   # oldest first
        rows.append({
            "datetime": c[0],
            "open":     float(c[1]),
            "high":     float(c[2]),
            "low":      float(c[3]),
            "close":    float(c[4]),
            "volume":   float(c[5]),
        })
    df = pd.DataFrame(rows)
    try:
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True).dt.tz_localize(None)
    except Exception:
        try:
            df["datetime"] = pd.to_datetime(df["datetime"])
        except Exception:
            df = df.drop(columns=["datetime"])

    if "datetime" in df.columns:
        df = (df.drop_duplicates("datetime")
                .sort_values("datetime")
                .reset_index(drop=True))
    return df


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in _state,
            "model": str(_state.get("model", "not loaded"))}


@app.get("/info")
def info():
    cfg = _state.get("config", {})
    return {
        "architecture":   "StockForecastNet V5 — PatchTST + ReVIN + CI Transformer",
        "model":          str(_state.get("model", "not loaded")),
        "n_features":     len(FEATURE_COLS),
        "features":       FEATURE_COLS,
        "seq_len":        cfg.get("seq_len", 90),
        "horizon_days":   cfg.get("horizon", 3),
        "patch_size":     cfg.get("patch_size", 16),
        "min_candles":    MIN_CANDLES,
        "output":         "multi-step cumulative returns (horizon,)",
        "primary_signal": "last horizon step (furthest prediction)",
        "routes": {
            "POST /predict":                 "Standard OHLCV objects",
            "POST /predict/upstox":          "Raw Upstox historical API response",
            "POST /predict/upstox/intraday": "Raw Upstox intraday API response",
            "POST /predict/upstox/auto":     "Auto-detect any Upstox format",
        },
    }


@app.post("/predict", response_model=PredictResponse,
          summary="Predict from standard OHLCV candle objects")
def predict(request: PredictRequest):
    """
    Predict multi-step returns from a list of OHLCV candle objects.
    Send ≥150 daily candles. Optional 'datetime' field enables calendar features.
    """
    try:
        rows = [
            {"open": c.open, "high": c.high, "low": c.low,
             "close": c.close, "volume": c.volume,
             **( {"datetime": c.datetime} if c.datetime else {})}
            for c in request.candles
        ]
        df = pd.DataFrame(rows)
        if "datetime" in df.columns:
            try: df["datetime"] = pd.to_datetime(df["datetime"])
            except Exception: df = df.drop(columns=["datetime"])
        return _run_inference(df, n_received=len(request.candles))
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, f"Internal error: {e}")


@app.post("/predict/upstox", response_model=PredictResponse,
          summary="Predict from raw Upstox historical candle response")
def predict_upstox(request: UpstoxRequest):
    """
    Pass the full JSON from Upstox historical-candle API directly.
    Candle format: [timestamp, open, high, low, close, volume, oi]
    Upstox returns newest-first — reversed automatically.
    """
    try:
        df = _upstox_candles_to_df(request.candles)
        return _run_inference(df, n_received=len(request.candles))
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, f"Internal error: {e}")


@app.post("/predict/upstox/intraday", response_model=PredictResponse,
          summary="Predict from raw Upstox intraday candle response")
def predict_upstox_intraday(request: UpstoxRequest):
    """
    Same format as /predict/upstox. Named alias for n8n workflow clarity.
    Note: model trained on daily candles; intraday signals are less reliable.
    """
    try:
        df = _upstox_candles_to_df(request.candles)
        return _run_inference(df, n_received=len(request.candles))
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, f"Internal error: {e}")


@app.post("/predict/upstox/auto", response_model=PredictResponse,
          summary="Auto-detect Upstox response format — best for n8n")
def predict_upstox_auto(body: Dict[str, Any]):
    """
    Flexible endpoint — auto-detects the Upstox candle structure.
    Pass the entire Upstox HTTP response body from your n8n HTTP Request node.
    Supports all three Upstox response shapes.
    """
    try:
        candles = None
        if isinstance(body, list):
            candles = body
        elif "candles" in body:
            candles = body["candles"]
        elif "data" in body and isinstance(body["data"], dict):
            candles = body["data"].get("candles")

        if candles is None:
            raise HTTPException(422,
                "Could not find candles. Expected: "
                "{'candles':[...]}, {'data':{'candles':[...]}}, or "
                "{'status':'success','data':{'candles':[...]}}")

        if len(candles) < MIN_CANDLES:
            raise HTTPException(422,
                f"Need ≥ {MIN_CANDLES} candles. Got {len(candles)}.")

        df = _upstox_candles_to_df(candles)
        return _run_inference(df, n_received=len(candles))
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, f"Internal error: {e}")
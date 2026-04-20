"""
api_v2.py — FastAPI Inference Service V6
==========================================
StockForecastNet V6 + optional LightGBM ensemble

Routes:
  GET  /health
  GET  /info
  POST /predict               — standard OHLCV objects
  POST /predict/upstox        — raw Upstox candle response
  POST /predict/upstox/auto   — auto-detect format (best for n8n)
  POST /predict/ensemble      — V6 Transformer + LightGBM ensemble
"""

import copy, os, sys
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path: sys.path.insert(0, _ROOT)

import joblib, numpy as np, pandas as pd, torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from dataset_v5 import extract_time_features
from features_v2 import FEATURE_COLS, add_features_v2
from model_v6 import StockForecastNet
from utils.trading_v2 import generate_signal_v2

MODEL_PATH  = os.getenv("MODEL_PATH",  "model_v6.pth")
CONFIG_PATH = os.getenv("CONFIG_PATH", "model_v6_config.pth")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler_v6.pkl")
LGBM_PATH   = os.getenv("LGBM_PATH",  "lgbm_it_model.pkl")
MIN_CANDLES = 150

_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    for path, label in [(MODEL_PATH, "Model"), (SCALER_PATH, "Scaler")]:
        if not os.path.exists(path):
            raise RuntimeError(f"{label} not found: {path}")

    cfg = (torch.load(CONFIG_PATH, map_location="cpu")
           if os.path.exists(CONFIG_PATH) else {
               "n_features": len(FEATURE_COLS), "seq_len": 90, "horizon": 3,
               "patch_size": 16, "stride": 8, "d_model": 96,
               "n_heads": 4, "n_layers": 2, "d_ff": 192,
               "dropout": 0.0, "revin_affine": True,
           })

    model = StockForecastNet(**cfg)
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"), strict=False)
    model.eval()
    _state["model"]  = model
    _state["scaler"] = joblib.load(SCALER_PATH)
    _state["config"] = cfg
    print(f"[api] {model}")

    # Optional LightGBM
    if os.path.exists(LGBM_PATH):
        try:
            from lgbm_model import LGBMDirectionModel
            _state["lgbm"] = LGBMDirectionModel.load(LGBM_PATH)
            print(f"[api] LightGBM ensemble model loaded: {LGBM_PATH}")
        except Exception as e:
            print(f"[api] LightGBM not loaded: {e}")

    yield
    _state.clear()


app = FastAPI(
    title="AI Trading Service V6",
    version="6.0",
    lifespan=lifespan,
    description=(
        "StockForecastNet V6: PatchTST + Feature Attention + Dual-Loss Head. "
        "V6 fixes the directional bias bug in V5 that caused val acc < 50%."
    ),
)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class Candle(BaseModel):
    open: float; high: float; low: float; close: float; volume: float
    datetime: Optional[str] = None

class PredictRequest(BaseModel):
    candles: List[Candle]
    @field_validator("candles")
    @classmethod
    def check_len(cls, v):
        if len(v) < MIN_CANDLES:
            raise ValueError(f"Need ≥{MIN_CANDLES} candles. Got {len(v)}.")
        return v

class UpstoxRequest(BaseModel):
    status:  Optional[str]            = None
    data:    Optional[Dict[str, Any]] = None
    candles: Optional[List[List[Any]]] = None

    @model_validator(mode="after")
    def resolve(self) -> "UpstoxRequest":
        c = self.candles
        if c is None and self.data: c = self.data.get("candles")
        if c is None: raise ValueError("No candles found.")
        if len(c) < MIN_CANDLES:
            raise ValueError(f"Need ≥{MIN_CANDLES} candles. Got {len(c)}.")
        for i, row in enumerate(c):
            if not isinstance(row, (list, tuple)) or len(row) < 6:
                raise ValueError(f"candles[{i}] bad format.")
        self.candles = c
        return self

class PredictResponse(BaseModel):
    signal:            str
    strength:          str
    direction:         int
    direction_label:   str
    p_up:              float
    confidence:        float
    predicted_return:  float
    horizon_days:      int
    all_horizon_steps: List[float]
    step_agreement:    bool
    top5_features:     Dict[str, float]
    candles_used:      int
    model_version:     str
    action:            str


# ─── Shared inference ─────────────────────────────────────────────────────────

def _run_inference(df: pd.DataFrame, n_received: int) -> PredictResponse:
    model  = _state["model"]
    scaler = _state["scaler"]
    cfg    = _state["config"]
    window  = cfg.get("seq_len", 90)
    horizon = cfg.get("horizon", 3)

    try:
        df_feat = add_features_v2(df)
    except Exception as e:
        raise HTTPException(422, f"Feature engineering failed: {e}")

    n_clean = len(df_feat)
    if n_clean < window:
        raise HTTPException(422,
            f"Only {n_clean} rows after features; need {window}.")

    X_raw    = df_feat.tail(window)[FEATURE_COLS].values
    X_scaled = scaler.transform(X_raw)
    X_t      = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

    tf_np  = extract_time_features(df_feat,
                window_start=max(0, n_clean-window), window_len=window)
    tf_t   = torch.tensor(tf_np, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        logit, mag_norm, revin_stats, attn_w = model.forward(
            X_t, tf_t, return_attn_weights=True)

    p_up       = float(torch.sigmoid(logit[0]).item())
    direction  = 1 if p_up >= 0.5 else 0
    confidence = p_up if direction == 1 else (1.0 - p_up)

    mag_denorm = model.revin.denormalize(mag_norm[0], revin_stats)
    pred_return = float(mag_denorm[-1].item())
    all_steps   = [float(v) for v in mag_denorm.tolist()]
    agree = all(s > 0 for s in all_steps) or all(s < 0 for s in all_steps)

    attn = attn_w[0].tolist()
    top5_idx = sorted(range(len(attn)), key=lambda i: attn[i], reverse=True)[:5]
    top5 = {FEATURE_COLS[i]: round(attn[i], 4) for i in top5_idx}

    signal, strength = generate_signal_v2(direction, confidence, pred_return)
    dl   = "UP" if direction == 1 else "DOWN"
    sign = "+" if pred_return >= 0 else ""

    return PredictResponse(
        signal=signal, strength=strength, direction=direction,
        direction_label=dl, p_up=round(p_up, 4),
        confidence=round(confidence, 4),
        predicted_return=round(pred_return, 6),
        horizon_days=horizon, all_horizon_steps=all_steps,
        step_agreement=agree, top5_features=top5,
        candles_used=n_clean, model_version="V6",
        action=(f"{signal} ({strength}) — {dl} {confidence:.1%} conf. "
                f"Predicted {horizon}d: {sign}{pred_return:.2%}."),
    )


def _upstox_to_df(candles: List[List[Any]]) -> pd.DataFrame:
    rows = [{"datetime": c[0], "open": float(c[1]), "high": float(c[2]),
             "low": float(c[3]), "close": float(c[4]), "volume": float(c[5])}
            for c in reversed(candles)]
    df = pd.DataFrame(rows)
    try: df["datetime"] = pd.to_datetime(df["datetime"], utc=True).dt.tz_localize(None)
    except Exception: pass
    if "datetime" in df.columns:
        df = (df.drop_duplicates("datetime").sort_values("datetime").reset_index(drop=True))
    return df


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "V6",
            "lgbm": "loaded" if "lgbm" in _state else "not_loaded"}

@app.get("/info")
def info():
    return {
        "version": "V6",
        "changes_from_v5": [
            "ReVIN denorm removed from training forward pass (fixes directional bias)",
            "Feature Attention Pooling (learned weights per indicator)",
            "Dual loss: 70% BCE direction + 30% MSE magnitude",
            "Balanced batch sampling (50/50 UP/DOWN per batch)",
            "d_model=96, dropout=0.2 (right-sized for IT sector)",
        ],
        "n_features":  len(FEATURE_COLS),
        "min_candles": MIN_CANDLES,
        "lgbm_available": "lgbm" in _state,
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        rows = [{"open": c.open, "high": c.high, "low": c.low,
                 "close": c.close, "volume": c.volume,
                 **( {"datetime": c.datetime} if c.datetime else {})}
                for c in request.candles]
        df = pd.DataFrame(rows)
        if "datetime" in df.columns:
            try: df["datetime"] = pd.to_datetime(df["datetime"])
            except Exception: df = df.drop(columns=["datetime"])
        return _run_inference(df, len(request.candles))
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))

@app.post("/predict/upstox", response_model=PredictResponse)
def predict_upstox(request: UpstoxRequest):
    try: return _run_inference(_upstox_to_df(request.candles), len(request.candles))
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))

@app.post("/predict/upstox/auto", response_model=PredictResponse)
def predict_upstox_auto(body: Dict[str, Any]):
    try:
        candles = None
        if isinstance(body, list): candles = body
        elif "candles" in body:    candles = body["candles"]
        elif "data" in body and isinstance(body["data"], dict):
            candles = body["data"].get("candles")
        if candles is None:
            raise HTTPException(422, "Cannot find candles in request body.")
        if len(candles) < MIN_CANDLES:
            raise HTTPException(422, f"Need ≥{MIN_CANDLES} candles.")
        return _run_inference(_upstox_to_df(candles), len(candles))
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))

@app.post("/predict/ensemble")
def predict_ensemble(body: Dict[str, Any]):
    """Combine V6 Transformer + LightGBM predictions."""
    if "lgbm" not in _state:
        raise HTTPException(503, "LightGBM model not loaded. "
                            "Set LGBM_PATH env var and restart.")
    try:
        from lgbm_model import ensemble_predict
        candles = None
        if "candles" in body: candles = body["candles"]
        elif "data" in body:  candles = body["data"].get("candles")
        if not candles:
            raise HTTPException(422, "No candles found.")
        df_raw = _upstox_to_df(candles)
        df     = add_features_v2(df_raw)
        ens    = ensemble_predict(
            _state["lgbm"], _state["model"], df, _state["scaler"],
            seq_len=_state["config"].get("seq_len", 90))
        return ens
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))
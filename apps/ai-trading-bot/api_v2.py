"""
api_v2.py — FastAPI Inference Service for StockPredictor V4
=============================================================

ROUTES
───────
GET  /health                      → liveness check
GET  /info                        → model metadata + feature list
POST /predict                     → standard OHLCV candles (your own format)
POST /predict/upstox              → raw Upstox API candle array (direct pass-through)
POST /predict/upstox/intraday     → raw Upstox intraday API response

UPSTOX API CANDLE FORMAT
─────────────────────────
Upstox historical and intraday APIs return candles as nested arrays:

  Historical (GET /v2/historical-candle/{key}/{interval}/{to}/{from}):
  {
    "status": "success",
    "data": {
      "candles": [
        ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0],
        ["2024-01-16T00:00:00+05:30", 2465.3, 2510.0, 2455.0, 2498.0, 987654,  0],
        ...
      ]
    }
  }

  Each inner array: [timestamp, open, high, low, close, volume, oi]
  Index:             [0]         [1]   [2]   [3]  [4]    [5]     [6]

  Intraday (GET /v2/historical-candle/intraday/{key}/{interval}):
  Same structure under data.candles, but with intraday timestamps.

  Both endpoints return candles in DESCENDING order (newest first).
  The /predict/upstox route automatically reverses to ascending order.

HOW TO CALL FROM n8n / PYTHON
───────────────────────────────
# Option A — Pass the full Upstox API response body directly:
POST /predict/upstox
{
  "status": "success",
  "data": {
    "candles": [
      ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0],
      ...
    ]
  }
}

# Option B — Pass just the candles array:
POST /predict/upstox
{
  "candles": [
    ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0],
    ...
  ]
}

# Option C — Standard route with your own candle objects:
POST /predict
{
  "candles": [
    {"open": 2450.5, "high": 2480.0, "low": 2440.0, "close": 2465.3, "volume": 1234567},
    ...
  ]
}

MINIMUM CANDLE COUNT
─────────────────────
You must send at least 150 candles for daily data.
  Why: Ichimoku needs 52+26=78 warmup rows, MA50 needs 50, ATR needs 14.
  After warmup ~100 rows are consumed, leaving at least 30 for the model window.

For intraday candles (5-min, 15-min), the same 150-candle minimum applies,
but these represent a shorter time period and may not produce reliable signals
since the model was trained on daily data.
"""

import os
import sys
from typing import Any, Dict, List, Optional, Union

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from contextlib import asynccontextmanager

import joblib
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from features_v2 import FEATURE_COLS, add_features_v2
from model_v4 import StockPredictor
from utils.trading_v2 import generate_signal_v2, pred_to_confidence

MODEL_PATH  = os.getenv("MODEL_PATH",  "pretrained_v4.pth")
CONFIG_PATH = os.getenv("CONFIG_PATH", "pretrained_v4_config.pth")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler_v2.pkl")

# Minimum candles needed for feature engineering + model window
MIN_CANDLES = 150

_state: dict = {}


# ─── Model loading ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model + scaler once at startup using get_config() pattern."""
    for path, label in [(MODEL_PATH, "Model"), (SCALER_PATH, "Scaler")]:
        if not os.path.exists(path):
            raise RuntimeError(
                f"{label} not found: {path}\n"
                "Train first: python train_v2.py --mode pretrain "
                "--symbols RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK --horizon 3"
            )

    cfg = (torch.load(CONFIG_PATH, map_location="cpu")
           if os.path.exists(CONFIG_PATH)
           else {
               "input_dim": len(FEATURE_COLS), "window": 30,
               "d_model": 64, "n_layers": 2, "n_heads": 4,
               "d_ff": 128, "dropout": 0.0, "horizon": 3,
           })

    model = StockPredictor(**cfg)
    weights = torch.load(MODEL_PATH, map_location="cpu")
    missing, _ = model.load_state_dict(weights, strict=False)
    if missing:
        print(f"[api] {len(missing)} missing keys (zero-initialised)")
    model.eval()

    _state["model"]  = model
    _state["scaler"] = joblib.load(SCALER_PATH)
    _state["config"] = cfg
    print(f"[api] Loaded: {model}")
    yield
    _state.clear()


app = FastAPI(
    title="AI Trading Service — iTransformer V4",
    version="4.0",
    lifespan=lifespan,
    description=(
        "Stock direction prediction using iTransformer architecture. "
        "Accepts both standard OHLCV candle objects and raw Upstox API responses."
    ),
)


# ─── Shared schemas ───────────────────────────────────────────────────────────

class PredictResponse(BaseModel):
    """Unified prediction response for all /predict routes."""
    signal:            str    # "BUY", "SELL", or "HOLD"
    strength:          str    # "STRONG", "MEDIUM", or "WEAK"
    direction:         int    # 1 = UP, 0 = DOWN
    direction_label:   str    # "UP" or "DOWN"
    confidence:        float  # 0.0–1.0  (sigmoid of |pred| × scale)
    predicted_return:  float  # signed decimal e.g. +0.018 = predicted +1.8%
    horizon_days:      int    # how many days ahead the prediction covers
    candles_received:  int    # number of candles in the request
    candles_used:      int    # number after feature-engineering warmup
    action:            str    # human-readable summary


# ─── Standard route — your own candle objects ─────────────────────────────────

class Candle(BaseModel):
    """One OHLCV candle in the standard format."""
    open:   float
    high:   float
    low:    float
    close:  float
    volume: float
    # datetime is optional — used for calendar features if present
    datetime: Optional[str] = None

    @field_validator("open", "high", "low", "close", "volume")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("OHLCV values must be ≥ 0")
        return v


class PredictRequest(BaseModel):
    """Standard predict request — list of OHLCV objects."""
    candles: List[Candle]

    @field_validator("candles")
    @classmethod
    def enough_candles(cls, v: list) -> list:
        if len(v) < MIN_CANDLES:
            raise ValueError(
                f"Need at least {MIN_CANDLES} candles. "
                f"Got {len(v)}. "
                "Ichimoku (52-period) + MA50 need ~100 warmup rows before "
                "the 30-day model window."
            )
        return v


# ─── Upstox-format route ──────────────────────────────────────────────────────

class UpstoxPredictRequest(BaseModel):
    """
    Accepts the raw Upstox historical-candle API response.

    Supports three input shapes:

    Shape A — full Upstox API response body:
    {
      "status": "success",
      "data": {
        "candles": [
          ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0],
          ...
        ]
      }
    }

    Shape B — just the data object:
    {
      "data": {
        "candles": [...]
      }
    }

    Shape C — just the candles array:
    {
      "candles": [
        ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0],
        ...
      ]
    }

    Each candle is: [timestamp, open, high, low, close, volume, oi]
    Upstox returns candles NEWEST FIRST — this route reverses to oldest-first.
    """
    # Accept any of the three shapes — validated in model_validator
    status:  Optional[str]              = None
    data:    Optional[Dict[str, Any]]   = None
    candles: Optional[List[List[Any]]]  = None

    @model_validator(mode="after")
    def extract_and_validate(self) -> "UpstoxPredictRequest":
        # Resolve candles from whichever shape was provided
        candles = self.candles

        if candles is None and self.data:
            candles = self.data.get("candles")

        if candles is None:
            raise ValueError(
                "No candles found. Provide one of:\n"
                "  { 'candles': [[timestamp, open, high, low, close, vol, oi], ...] }\n"
                "  { 'data': { 'candles': [...] } }\n"
                "  { 'status': 'success', 'data': { 'candles': [...] } }"
            )

        if not isinstance(candles, list) or len(candles) == 0:
            raise ValueError("candles must be a non-empty list")

        # Validate each candle has at least 6 elements
        for idx, c in enumerate(candles):
            if not isinstance(c, (list, tuple)) or len(c) < 6:
                raise ValueError(
                    f"candles[{idx}] is invalid. "
                    f"Each candle must be [timestamp, open, high, low, close, volume] "
                    f"(with optional oi at index 6). Got: {c}"
                )

        if len(candles) < MIN_CANDLES:
            raise ValueError(
                f"Need at least {MIN_CANDLES} candles. Got {len(candles)}."
            )

        self.candles = candles
        return self


# ─── Core inference logic (shared by all routes) ──────────────────────────────

def _run_inference(df: pd.DataFrame, n_received: int) -> PredictResponse:
    """
    Run the full inference pipeline on a OHLCV DataFrame.

    Steps:
    1. Feature engineering (add_features_v2) — drops NaN warmup rows
    2. Scale using the loaded RobustScaler
    3. Take the last `window` rows as model input
    4. Run StockPredictor forward pass
    5. Derive direction + confidence + signal

    Args:
        df:          DataFrame with columns [open, high, low, close, volume]
                     and optionally [datetime].
        n_received:  Number of candles before feature engineering (for logging).

    Returns:
        PredictResponse with full prediction details.
    """
    model  = _state["model"]
    scaler = _state["scaler"]
    cfg    = _state["config"]
    window = cfg.get("window", 30)

    # Step 1: Feature engineering
    try:
        df_feat = add_features_v2(df)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Feature engineering failed: {e}. "
                   "Check that all OHLCV columns are present and non-zero."
        )

    n_clean = len(df_feat)
    
    if n_clean < window:
        raise HTTPException(
            status_code=422,
            detail=(
                f"After feature engineering only {n_clean} rows remain; "
                f"need {window}. "
                f"Send at least {MIN_CANDLES} candles "
                f"({n_received} received, {n_received - n_clean} consumed as warmup)."
            )
        )

    # Step 2: Scale
    X_raw    = df_feat.tail(window)[FEATURE_COLS].values  
    
    
    X_scaled = scaler.transform(X_raw)
    X        = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)  # (1, window, features)

    # Step 3: Inference
    with torch.no_grad():
        pred_raw = model(X).squeeze(-1).item()

    # Step 4: Signal derivation
    direction  = 1 if pred_raw > 0 else 0
    confidence = pred_to_confidence(pred_raw)
    signal, strength = generate_signal_v2(direction, confidence, pred_raw)

    horizon      = cfg.get("horizon", 3)
    dir_label    = "UP" if direction == 1 else "DOWN"
    ret_sign     = "+" if pred_raw >= 0 else ""
    action = (
        f"{signal} ({strength}) — model predicts {dir_label} "
        f"with {confidence:.1%} confidence. "
        f"Predicted {horizon}-day return: {ret_sign}{pred_raw:.2%}"
    )

    return PredictResponse(
        signal           = signal,
        strength         = strength,
        direction        = direction,
        direction_label  = dir_label,
        confidence       = round(confidence, 4),
        predicted_return = round(pred_raw, 6),
        horizon_days     = horizon,
        candles_received = n_received,
        candles_used     = n_clean,
        action           = action,
    )


def _candles_to_df(candles: List[List[Any]]) -> pd.DataFrame:
    """
    Convert a raw Upstox candle array to a clean OHLCV DataFrame.

    Input (from Upstox API):
        Each row: [timestamp, open, high, low, close, volume, oi(optional)]
        Upstox returns newest-first → we reverse to oldest-first.

    Output:
        DataFrame with columns [datetime, open, high, low, close, volume]
        datetime parsed to datetime64, numeric columns as float.
    """
    # Upstox returns newest-first — reverse to chronological order
    candles_asc = list(reversed(candles))

    rows = []
    for c in candles_asc:
        rows.append({
            "datetime": c[0],   # ISO 8601 timestamp e.g. "2024-01-15T00:00:00+05:30"
            "open":     float(c[1]),
            "high":     float(c[2]),
            "low":      float(c[3]),
            "close":    float(c[4]),
            "volume":   float(c[5]),
            # c[6] is OI — we don't use it
        })

    df = pd.DataFrame(rows)

    # Parse datetime — handles both ISO format and epoch timestamps
    try:
        df["datetime"] = pd.to_datetime(df["datetime"], utc=True).dt.tz_localize(None)
    except Exception:
        try:
            df["datetime"] = pd.to_datetime(df["datetime"])
        except Exception:
            # If datetime parsing fails, drop the column gracefully
            # (calendar features will be disabled but OHLCV features work)
            df = df.drop(columns=["datetime"])

    # Remove duplicate timestamps (can happen at market open/close)
    if "datetime" in df.columns:
        df = (df.drop_duplicates(subset=["datetime"])
                .sort_values("datetime")
                .reset_index(drop=True))

    return df


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", summary="Liveness check")
def health():
    """Returns ok if the server is running and model is loaded."""
    return {
        "status":       "ok",
        "model_loaded": "model" in _state,
        "model":        str(_state.get("model", "not loaded")),
    }


@app.get("/info", summary="Model metadata")
def info():
    """Returns model architecture, feature list, window and horizon."""
    cfg = _state.get("config", {})
    return {
        "architecture":   "iTransformer V4",
        "model":          str(_state.get("model", "not loaded")),
        "n_features":     len(FEATURE_COLS),
        "features":       FEATURE_COLS,
        "window":         cfg.get("window", 30),
        "horizon_days":   cfg.get("horizon", 3),
        "min_candles":    MIN_CANDLES,
        "output":         "signed return (direction = sign(output))",
        "routes": {
            "POST /predict":                  "Standard OHLCV objects",
            "POST /predict/upstox":           "Raw Upstox historical candle array",
            "POST /predict/upstox/intraday":  "Raw Upstox intraday candle array (same format)",
        },
    }


@app.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict from standard OHLCV candles",
)
def predict(request: PredictRequest):
    """
    Predict the next N-day return from a list of OHLCV candle objects.

    Send at least 150 candles. The most recent 30 are used as the model window;
    earlier candles are used to compute technical indicators.

    Example request body:
    ```json
    {
      "candles": [
        {"open": 2450.5, "high": 2480.0, "low": 2440.0, "close": 2465.3,
         "volume": 1234567, "datetime": "2024-01-15"},
        ...
      ]
    }
    ```
    """
    try:
        rows = []
        for c in request.candles:
            row = {"open": c.open, "high": c.high, "low": c.low,
                   "close": c.close, "volume": c.volume}
            if c.datetime:
                row["datetime"] = c.datetime
            rows.append(row)

        df = pd.DataFrame(rows)
        if "datetime" in df.columns:
            try:
                df["datetime"] = pd.to_datetime(df["datetime"])
            except Exception:
                df = df.drop(columns=["datetime"])

        return _run_inference(df, n_received=len(request.candles))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post(
    "/predict/upstox",
    response_model=PredictResponse,
    summary="Predict from raw Upstox historical candle API response",
)
def predict_upstox(request: UpstoxPredictRequest):
    """
    Predict directly from the raw Upstox historical candle API response.

    Pass the full JSON response from:
    `GET https://api.upstox.com/v2/historical-candle/{instrumentKey}/{interval}/{toDate}/{fromDate}`

    Or just the `data` object, or just the `candles` array.

    Candle format: `[timestamp, open, high, low, close, volume, oi]`
    Upstox returns newest-first — this route reverses automatically.

    Example (full response):
    ```json
    {
      "status": "success",
      "data": {
        "candles": [
          ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0]
        ]
      }
    }
    ```

    Example (candles only):
    ```json
    {
      "candles": [
        ["2024-01-15T00:00:00+05:30", 2450.5, 2480.0, 2440.0, 2465.3, 1234567, 0]
      ]
    }
    ```
    """
    try:
        df = _candles_to_df(request.candles)
        return _run_inference(df, n_received=len(request.candles))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post(
    "/predict/upstox/intraday",
    response_model=PredictResponse,
    summary="Predict from raw Upstox intraday candle API response",
)
def predict_upstox_intraday(request: UpstoxPredictRequest):
    """
    Predict from the Upstox intraday candle API response.

    Same format as /predict/upstox — the candle structure is identical.
    This route exists as a named alias for clarity when building n8n workflows.

    Note: The model was trained on DAILY candles. Using intraday candles
    (5-min, 15-min) will produce less reliable signals since indicator
    periods (e.g. RSI-14 on 15-min = ~3.5 hours) have different meanings
    than on daily data.

    API endpoint:
    `GET https://api.upstox.com/v2/historical-candle/intraday/{instrumentKey}/{interval}`
    """
    try:
        df = _candles_to_df(request.candles)
        return _run_inference(df, n_received=len(request.candles))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# ─── n8n helper route ─────────────────────────────────────────────────────────

@app.post(
    "/predict/upstox/auto",
    response_model=PredictResponse,
    summary="Auto-detect Upstox response format",
)
def predict_upstox_auto(body: Dict[str, Any]):
    """
    Flexible endpoint that auto-detects the Upstox response format.
    Use this in n8n when you're not sure which exact structure Upstox returned.

    Accepts all three formats:
    - Full response: {"status": "success", "data": {"candles": [...]}}
    - Data only:     {"data": {"candles": [...]}}
    - Candles only:  {"candles": [[...]]}

    Also accepts a flat list at the top level:
    - List directly: [[timestamp, open, high, low, close, vol, oi], ...]
    """
    try:
        # Try to extract candles from any known structure
        candles = None

        # Check for flat list (the body itself is an array — unlikely via JSON but handle it)
        if isinstance(body, list):
            candles = body
        elif "candles" in body:
            candles = body["candles"]
        elif "data" in body and isinstance(body["data"], dict):
            candles = body["data"].get("candles")

        if candles is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not find candles in the request body. "
                    "Expected one of: "
                    "{'candles': [...]}, "
                    "{'data': {'candles': [...]}}, "
                    "{'status': 'success', 'data': {'candles': [...]}}"
                )
            )

        if len(candles) < MIN_CANDLES:
            raise HTTPException(
                status_code=422,
                detail=f"Need at least {MIN_CANDLES} candles. Got {len(candles)}."
            )

        df = _candles_to_df(candles)
        return _run_inference(df, n_received=len(candles))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")
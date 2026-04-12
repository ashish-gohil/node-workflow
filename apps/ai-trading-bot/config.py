"""
config.py — Central configuration for the AI Trading Service.

All environment variables are loaded from .env file.
Every other file imports from here — never read os.environ directly elsewhere.

Usage:
    from config import settings
    print(settings.UPSTOX_ACCESS_TOKEN)
"""
import os
import sys

# ── PATH FIX ──────────────────────────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# ─────────────────────────────────────────────────────────────────────────────

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Upstox API credentials ────────────────────────────────────────────────
    UPSTOX_ACCESS_TOKEN: str = ""
    UPSTOX_API_KEY:      str = ""
    UPSTOX_API_SECRET:   str = ""

    # ── Model files ───────────────────────────────────────────────────────────
    MODEL_PATH:  str = "model_v2.pth"
    CONFIG_PATH: str = "model_v2_config.pth"
    SCALER_PATH: str = "scaler_v2.pkl"

    # ── TFT training defaults (matches train_v2.py DEFAULT_CFG) ──────────────
    WINDOW:        int   = 30     # Sequence window (days)
    D_MODEL:       int   = 64     # TFT embedding dimension
    N_TCN_LAYERS:  int   = 4      # Dilated conv layers
    N_ATTN_HEADS:  int   = 2      # Lightweight attention heads
    DROPOUT:       float = 0.2
    BATCH_SIZE:    int   = 128
    EPOCHS:        int   = 80
    LR:            float = 3e-4

    # ── API ───────────────────────────────────────────────────────────────────
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # ── Data ──────────────────────────────────────────────────────────────────
    DATA_DIR: str = "data"


settings = Settings()


def validate():
    """Call at startup to verify credentials are set."""
    if not settings.UPSTOX_ACCESS_TOKEN:
        raise EnvironmentError(
            "UPSTOX_ACCESS_TOKEN is not set.\n"
            "1. Create a .env file in apps/ai-trading-service/\n"
            "2. Add: UPSTOX_ACCESS_TOKEN=your_token_here\n"
            "3. Get the token from https://upstox.com/developer/"
        )
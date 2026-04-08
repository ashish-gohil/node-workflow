"""
config.py — Central configuration for the AI Trading Service.

All environment variables are loaded here from a .env file.
Every other file imports from here — never read os.environ directly elsewhere.

Usage:
    from config import settings
    print(settings.UPSTOX_ACCESS_TOKEN)
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Pydantic BaseSettings reads values from environment variables AND a .env file.
    If a variable is in both, environment variable wins (useful for Docker/EC2).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",         # Don't raise error for unknown env vars
    )

    # ── Upstox credentials ────────────────────────────────────────────────────
    # Get these from https://upstox.com/developer/api-documentation/
    UPSTOX_ACCESS_TOKEN: str = ""
    UPSTOX_API_KEY:      str = ""
    UPSTOX_API_SECRET:   str = ""

    # ── Model file paths ──────────────────────────────────────────────────────
    MODEL_PATH:  str = "model_v2.pth"
    CONFIG_PATH: str = "model_v2_config.pth"
    SCALER_PATH: str = "scaler_v2.pkl"

    # ── Training defaults ─────────────────────────────────────────────────────
    WINDOW:     int   = 60      # How many past days to look at
    D_MODEL:    int   = 128     # Transformer embedding dimension
    N_HEADS:    int   = 8       # Attention heads (must divide d_model)
    N_LAYERS:   int   = 4       # Transformer layers
    DROPOUT:    float = 0.1
    BATCH_SIZE: int   = 64
    EPOCHS:     int   = 50
    LR:         float = 1e-4

    # ── API settings ──────────────────────────────────────────────────────────
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # ── Data paths ────────────────────────────────────────────────────────────
    DATA_DIR: str = "data/raw"


# Single shared instance — import this everywhere
settings = Settings()


# ── Validate on import ────────────────────────────────────────────────────────
def validate():
    """Call this in train/fetch scripts to check credentials exist."""
    if not settings.UPSTOX_ACCESS_TOKEN:
        raise EnvironmentError(
            "UPSTOX_ACCESS_TOKEN is not set.\n"
            "1. Create a .env file in the project root\n"
            "2. Add: UPSTOX_ACCESS_TOKEN=your_token_here\n"
            "3. Get the token from https://upstox.com/developer/"
        )
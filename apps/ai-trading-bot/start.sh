#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — Start the AI Trading Service API
#
# Usage:
#   ./start.sh           → production mode (no reload)
#   ./start.sh --dev     → development mode (auto-reload on file changes)
# ─────────────────────────────────────────────────────────────────────────────

echo "Starting AI Trading Service..."
python --version

if [ "$1" == "--dev" ]; then
    echo "Mode: DEVELOPMENT (auto-reload enabled)"
    uvicorn api_v2:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Mode: PRODUCTION"
    uvicorn api_v2:app --host 0.0.0.0 --port 8000 --workers 1
fi
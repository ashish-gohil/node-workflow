#!/bin/bash

echo "🚀 Starting AI Trading Service..."

# Optional: print Python version for debugging
python --version

# Start FastAPI server
uvicorn api:app --host 0.0.0.0 --port 8000
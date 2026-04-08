# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — AI Trading Service
# ─────────────────────────────────────────────────────────────────────────────

# Use slim Python base (saves ~600MB vs full image)
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by torch + pyarrow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching — only re-installs if requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose the API port
EXPOSE 8000

# Default command: start the FastAPI server
CMD ["uvicorn", "api_v2:app", "--host", "0.0.0.0", "--port", "8000"]
# Production Dockerfile for SENTRA FastAPI Backend
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install system dependencies (libpcap for network traffic parsing and curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpcap-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source and database configuration
COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
COPY migrate.py /app/migrate.py
COPY run.py /app/run.py

# Ensure storage directories exist with non-root ownership
RUN mkdir -p /app/storage/uploads /app/storage/datasets /app/storage/models /app/logs \
    && groupadd -r sentra && useradd -r -g sentra sentra \
    && chown -R sentra:sentra /app

USER sentra

EXPOSE 8000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Run database migrations then start production Uvicorn server
CMD ["sh", "-c", "python migrate.py && python run.py"]

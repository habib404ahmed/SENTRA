import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:sentra123@localhost:5432/sentra",
        description="SQLAlchemy PostgreSQL connection URL"
    )
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        description="Comma-separated allowed CORS origins"
    )
    CORS_ORIGIN_REGEX: Optional[str] = Field(
        default=r"^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/.*\.onrender\.com$",
        description="Optional regex pattern to match allowed CORS origins (e.g. for Render or preview domains)"
    )
    HOST: str = Field(default="0.0.0.0", description="Host address for FastAPI server")
    PORT: int = Field(default=8000, description="Port for FastAPI server (auto-detected on PaaS)")
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, or production")
    DOCS_ENABLED: bool = Field(default=True, description="Enable /docs and /redoc API documentation")

    # PCAP Ingestion Storage & Controls
    UPLOAD_DIR: str = Field(
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "uploads"),
        description="Filesystem path for secure PCAP upload storage"
    )
    MAX_UPLOAD_SIZE_BYTES: int = Field(
        default=100 * 1024 * 1024, # 100 MB limit
        description="Maximum allowed upload file size in bytes"
    )

    # Feature Extraction & Dataset Export Storage
    DATASET_DIR: str = Field(
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "datasets"),
        description="Filesystem path for generated feature datasets (CSV, Parquet)"
    )

    # Machine Learning Model Artifact Storage
    MODEL_DIR: str = Field(
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "models"),
        description="Filesystem path for trained ML model artifacts (.joblib)"
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def sync_database_url(self) -> str:
        """
        Normalize DATABASE_URL for SQLAlchemy 2.x and psycopg v3.
        Cloud providers (Render, Neon, Supabase, Railway, AWS RDS) often provide
        'postgres://...' or 'postgresql://...' URLs.
        """
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()

# Ensure uploads, datasets, and models directories exist securely outside web roots
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.DATASET_DIR, exist_ok=True)
os.makedirs(settings.MODEL_DIR, exist_ok=True)

import os
from typing import List
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
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"

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

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()

# Ensure uploads and datasets directory exist securely outside web roots
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.DATASET_DIR, exist_ok=True)

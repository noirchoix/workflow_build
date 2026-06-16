from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Workflow Builder API"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_path: Path = Path("data/workflow_builder.sqlite3")
    upload_dir: Path = Path("data/uploads")
    llm_provider: str = "offline"
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
settings.database_path.parent.mkdir(parents=True, exist_ok=True)
settings.upload_dir.mkdir(parents=True, exist_ok=True)

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE_PATH = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    """Application settings from environment variables"""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        case_sensitive=True,
        extra="ignore",
    )
    
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_CONNECT_TIMEOUT: int = 10
    DB_STATEMENT_TIMEOUT_MS: int = 15000
    
    # Application
    APP_ENV: str = "development"
    LOG_LEVEL: str = "info"
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Clerk Authentication (optional unless Clerk-backed routes are enabled)
    CLERK_SECRET_KEY: str = ""
    
    # SMTP for email notifications
    SMTP_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Captain Insecticide"
    
# Global settings instance
settings = Settings()


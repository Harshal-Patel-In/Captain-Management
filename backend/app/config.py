from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Database
    DATABASE_URL: str
    
    # Application
    APP_ENV: str = "development"
    LOG_LEVEL: str = "info"
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Clerk Authentication
    CLERK_SECRET_KEY: str
    
    # SMTP for email notifications
    SMTP_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Captain Insecticide"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

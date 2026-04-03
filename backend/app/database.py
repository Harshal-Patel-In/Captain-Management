from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings


def _normalize_database_url(raw_url: str) -> str:
    """Normalize DB URL for managed Postgres providers."""
    url = raw_url.strip()

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    return url


normalized_database_url = _normalize_database_url(settings.DATABASE_URL)

connect_args = {}
if normalized_database_url.startswith("postgresql"):
    connect_args = {
        "sslmode": "require",
        "connect_timeout": settings.DB_CONNECT_TIMEOUT,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        "application_name": "captain-insecticide-api",
        "options": f"-c statement_timeout={settings.DB_STATEMENT_TIMEOUT_MS}",
    }

# Create SQLAlchemy engine
engine = create_engine(
    normalized_database_url,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_use_lifo=True,
    connect_args=connect_args,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
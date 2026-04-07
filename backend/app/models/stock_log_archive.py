from sqlalchemy import Column, Date, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class StockLogArchive(Base):
    """Tracks export and archival metadata for stock-log retention periods."""

    __tablename__ = "stock_log_archives"
    __table_args__ = (
        UniqueConstraint("period_start", "period_end", name="uq_stock_log_archives_period"),
    )

    id = Column(Integer, primary_key=True, index=True)
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False, index=True)
    log_count = Column(Integer, nullable=False, default=0)
    archived_file_path = Column(String, nullable=True)
    exported_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

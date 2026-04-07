from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from app.models.stock_log import StockAction


class StockLogResponse(BaseModel):
    """Schema for stock log response"""
    id: int
    product_id: int
    product_name: str
    action: StockAction
    quantity: float
    previous_quantity: float
    new_quantity: float
    timestamp: datetime
    remarks: Optional[str]
    
    class Config:
        from_attributes = True


class StockLogList(BaseModel):
    """Schema for stock logs list response"""
    logs: list[StockLogResponse]
    total: int


class DateRangeFilter(BaseModel):
    """Schema for date range filtering"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class LogsRetentionStatusResponse(BaseModel):
    """Retention and warning status for previous-month stock logs."""

    period_start: date
    period_end: date
    export_deadline: date
    delete_after: date
    days_until_export_deadline: int
    days_until_delete: int
    has_logs_in_main_db: bool
    has_been_exported: bool
    exported_at: Optional[datetime] = None
    is_last_export_day: bool
    is_delete_window: bool
    is_deletion_due: bool
    warning_message: Optional[str] = None
    suggested_filename: str

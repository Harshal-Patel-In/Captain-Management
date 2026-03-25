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

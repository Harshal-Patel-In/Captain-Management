from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class DailyStockData(BaseModel):
    """Schema for daily stock data point"""
    date: date
    quantity: float


class ProductActivity(BaseModel):
    """Schema for product activity"""
    product_id: int
    product_name: str
    log_count: int
    total_in: float
    total_out: float


class LowStockProduct(BaseModel):
    """Schema for low stock product"""
    product_id: int
    product_name: str
    category: Optional[str]
    quantity: float


class StockTrendsResponse(BaseModel):
    """Schema for analytics stock trends response"""
    daily_stock_in: list[DailyStockData]
    daily_stock_out: list[DailyStockData]
    net_stock_change: list[DailyStockData]
    most_active_products: list[ProductActivity]
    low_stock_products: list[LowStockProduct]


class AnalyticsFilter(BaseModel):
    """Schema for analytics filtering"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    low_stock_threshold: int = Field(default=5, gt=0, description="Threshold for low stock alerts")

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


class StockConsistencyRow(BaseModel):
    """Per-day consistency validation row"""
    date: date
    stock_in: float
    stock_out: float
    net_change: float
    expected_net_change: float
    difference: float
    is_consistent: bool


class StockConsistencyResponse(BaseModel):
    """Stock analytics consistency report"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_days_checked: int
    inconsistent_days: int
    is_consistent: bool
    rows: list[StockConsistencyRow]


class ProductDailySummaryResponse(BaseModel):
    """Current-day stock movement summary for a single product."""
    product_id: int
    date: date
    stock_in: float
    stock_out: float
    net_change: float


class AnalyticsFilter(BaseModel):
    """Schema for analytics filtering"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    low_stock_threshold: int = Field(default=5, gt=0, description="Threshold for low stock alerts")

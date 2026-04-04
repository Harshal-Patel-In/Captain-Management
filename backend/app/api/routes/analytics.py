from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from fastapi import HTTPException
from app.api.deps import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    StockTrendsResponse,
    StockConsistencyResponse,
    ProductDailySummaryResponse,
    ProductMonthlySummaryResponse,
    LowStockMonthlySummaryResponse,
)

router = APIRouter()


@router.get("/stock-trends", response_model=StockTrendsResponse)
async def get_stock_trends(
    start_date: Optional[date] = Query(None, description="Start date for analytics (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for analytics (YYYY-MM-DD)"),
    low_stock_threshold: int = Query(5, gt=0, description="Threshold for low stock alerts"),
    db: Session = Depends(get_db)
):
    """
    Get analytics stock trends (5 KPIs):
    1. Daily stock-in quantity
    2. Daily stock-out quantity
    3. Net stock change over time
    4. Most active products
    5. Low stock products
    """
    return AnalyticsService.get_stock_trends(
        db,
        start_date,
        end_date,
        low_stock_threshold
    )


@router.get("/stock-consistency", response_model=StockConsistencyResponse)
async def get_stock_consistency(
    start_date: Optional[date] = Query(None, description="Start date for consistency check (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for consistency check (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Validate daily analytics invariant:
    net_change = stock_in - stock_out
    """
    return AnalyticsService.get_stock_consistency_report(
        db,
        start_date,
        end_date,
    )


@router.get("/product-daily-summary", response_model=ProductDailySummaryResponse)
async def get_product_daily_summary(
    product_id: int = Query(..., gt=0, description="Product ID"),
    target_date: Optional[date] = Query(None, description="Date for summary (YYYY-MM-DD), defaults to today"),
    db: Session = Depends(get_db)
):
    """Get stock-in, stock-out, and net-change for one product on one day."""
    try:
        return AnalyticsService.get_product_daily_summary(db, product_id, target_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load product daily summary: {str(exc)}")


@router.get("/product-monthly-summary", response_model=ProductMonthlySummaryResponse)
async def get_product_monthly_summary(
    product_id: int = Query(..., gt=0, description="Product ID"),
    target_date: Optional[date] = Query(None, description="Any date in the target month (YYYY-MM-DD), defaults to current month"),
    db: Session = Depends(get_db)
):
    """Get stock-in, stock-out, and net-change for one product in the current calendar month."""
    try:
        return AnalyticsService.get_product_monthly_summary(db, product_id, target_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load product monthly summary: {str(exc)}")


@router.get("/low-stock-monthly-summary", response_model=LowStockMonthlySummaryResponse)
async def get_low_stock_monthly_summary(
    low_stock_threshold: int = Query(5, gt=0, description="Threshold for low stock alerts"),
    target_date: Optional[date] = Query(None, description="Any date in the target month (YYYY-MM-DD), defaults to current month"),
    db: Session = Depends(get_db)
):
    """Get current quantity and current-month stock movement for all low-stock products."""
    try:
        return AnalyticsService.get_low_stock_monthly_summary(db, low_stock_threshold, target_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load low-stock monthly summary: {str(exc)}")

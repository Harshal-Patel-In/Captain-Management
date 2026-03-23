from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.api.deps import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import StockTrendsResponse

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

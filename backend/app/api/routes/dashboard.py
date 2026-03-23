from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    low_stock_threshold: int = Query(5, gt=0, description="Threshold for low stock alerts"),
    db: Session = Depends(get_db)
):
    """
    Get optimized dashboard statistics in a single call.
    Returns: total_products, total_inventory, low_stock_count, active_products
    """
    return DashboardService.get_dashboard_stats(db, low_stock_threshold)

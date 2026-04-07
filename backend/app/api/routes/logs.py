from fastapi import APIRouter, Depends, Query
import logging
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.api.deps import get_db
from app.models.stock_log import StockLog, StockAction
from app.models.product import Product
from app.schemas.logs import LogsRetentionStatusResponse, StockLogList
from sqlalchemy import func
from app.services.log_retention_service import LogRetentionService
from app.utils.precision import normalize_quantity

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/retention/status", response_model=LogsRetentionStatusResponse)
async def get_logs_retention_status(db: Session = Depends(get_db)):
    """Get previous-month retention status and run overdue archival cleanup."""
    try:
        LogRetentionService.run_maintenance(db)
    except Exception as exc:
        logger.exception("Retention maintenance failed", exc_info=exc)

    try:
        return LogRetentionService.get_previous_month_status(db)
    except Exception as exc:
        logger.exception("Failed to build retention status", exc_info=exc)

        period_start, period_end = LogRetentionService.get_previous_month_bounds(date.today())
        export_deadline = LogRetentionService.get_export_deadline(period_end)
        delete_after = LogRetentionService.get_delete_after(export_deadline)

        return {
            "period_start": period_start,
            "period_end": period_end,
            "export_deadline": export_deadline,
            "delete_after": delete_after,
            "days_until_export_deadline": (export_deadline - date.today()).days,
            "days_until_delete": (delete_after - date.today()).days,
            "has_logs_in_main_db": False,
            "has_been_exported": False,
            "exported_at": None,
            "is_last_export_day": False,
            "is_delete_window": False,
            "is_deletion_due": False,
            "warning_message": None,
            "suggested_filename": f"{period_start}_{period_end}stock_logs.xlsx",
        }


@router.get("", response_model=StockLogList)
async def get_logs(
    start_date: Optional[date] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    action: Optional[StockAction] = Query(None, description="Filter by action (in/out)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get stock logs with optional filtering"""
    query = db.query(
        StockLog.id,
        StockLog.product_id,
        Product.name.label('product_name'),
        StockLog.action,
        StockLog.quantity,
        StockLog.previous_quantity,
        StockLog.new_quantity,
        StockLog.timestamp,
        StockLog.remarks
    ).join(Product, StockLog.product_id == Product.id)
    
    # Apply filters
    if start_date:
        query = query.filter(func.date(StockLog.timestamp) >= start_date)
    if end_date:
        query = query.filter(func.date(StockLog.timestamp) <= end_date)
    if product_id:
        query = query.filter(StockLog.product_id == product_id)
    if action:
        query = query.filter(StockLog.action == action)
    
    total = query.count()
    results = query.order_by(StockLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    logs = [
        {
            "id": row.id,
            "product_id": row.product_id,
            "product_name": row.product_name,
            "action": row.action,
            "quantity": normalize_quantity(row.quantity),
            "previous_quantity": normalize_quantity(row.previous_quantity),
            "new_quantity": normalize_quantity(row.new_quantity),
            "timestamp": row.timestamp,
            "remarks": row.remarks
        }
        for row in results
    ]
    
    return {"logs": logs, "total": total}

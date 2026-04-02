from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.api.deps import get_db
from app.models.stock_log import StockLog, StockAction
from app.models.product import Product
from app.schemas.logs import StockLogList
from sqlalchemy import func
from app.utils.precision import normalize_quantity

router = APIRouter()


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

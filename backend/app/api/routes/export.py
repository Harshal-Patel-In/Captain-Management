from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.api.deps import get_db
from app.services.csv_service import CSVService
from app.services.log_retention_service import LogRetentionService

router = APIRouter()


@router.get("/inventory")
async def export_inventory(
    db: Session = Depends(get_db)
):
    """Export current inventory as CSV"""
    csv_content = CSVService.export_inventory(db)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=inventory_export.csv"
        }
    )


@router.get("/logs")
async def export_logs(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Export stock logs as CSV with optional date filtering"""
    csv_content = CSVService.export_logs(db, start_date, end_date)
    
    filename = "stock_logs_export.csv"
    if start_date or end_date:
        date_range = f"{start_date or 'start'}_to_{end_date or 'end'}"
        filename = f"stock_logs_{date_range}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/logs-excel")
async def export_logs_excel(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Export stock logs as Excel (XLSX) with optional date filtering."""
    excel_content = CSVService.export_logs_excel(db, start_date, end_date)

    if start_date and end_date:
        LogRetentionService.mark_period_exported(db, start_date, end_date)

    filename = "stock_logs.xlsx"
    if start_date and end_date:
        filename = f"{start_date}_{end_date}stock_logs.xlsx"

    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/analytics")
async def export_analytics(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    low_stock_threshold: int = Query(5, gt=0, description="Low stock threshold"),
    db: Session = Depends(get_db)
):
    """Export analytics data as CSV with optional date filtering"""
    csv_content = CSVService.export_analytics(db, start_date, end_date, low_stock_threshold)
    
    filename = "analytics_export.csv"
    if start_date or end_date:
        date_range = f"{start_date or 'start'}_to_{end_date or 'end'}"
        filename = f"analytics_{date_range}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

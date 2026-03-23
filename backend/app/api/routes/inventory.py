from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.inventory_service import InventoryService
from app.schemas.inventory import InventoryList
from typing import Optional

router = APIRouter()


@router.get("", response_model=InventoryList)
async def get_inventory(
    search: Optional[str] = Query(None, description="Search by product name or QR code"),
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get current inventory with optional filtering"""
    items, total = InventoryService.get_all_inventory(db, search, category, skip, limit)
    return {"items": items, "total": total}

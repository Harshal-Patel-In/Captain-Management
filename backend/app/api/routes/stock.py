from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.stock_service import StockService
from app.schemas.stock import StockOperationRequest, StockOperationResponse

router = APIRouter()


@router.post("/in", response_model=StockOperationResponse)
async def stock_in(
    request: StockOperationRequest,
    db: Session = Depends(get_db)
):
    """Add stock (transaction-safe)"""
    return StockService.stock_in(
        db,
        request.qr_code_value,
        request.quantity,
        request.remarks
    )


@router.post("/out", response_model=StockOperationResponse)
async def stock_out(
    request: StockOperationRequest,
    db: Session = Depends(get_db)
):
    """Remove stock (transaction-safe with validation)"""
    return StockService.stock_out(
        db,
        request.qr_code_value,
        request.quantity,
        request.remarks
    )

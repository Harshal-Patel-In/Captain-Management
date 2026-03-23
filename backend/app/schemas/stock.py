from pydantic import BaseModel, Field
from app.models.stock_log import StockAction
from typing import Optional


class StockOperationRequest(BaseModel):
    """Schema for stock-in/stock-out operations"""
    qr_code_value: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0, description="Must be greater than 0")
    remarks: Optional[str] = Field(None, max_length=500)


class StockOperationResponse(BaseModel):
    """Schema for stock operation response"""
    success: bool
    message: str
    product_id: int
    product_name: str
    action: StockAction
    previous_quantity: float
    new_quantity: float
    quantity_changed: float

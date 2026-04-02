from pydantic import BaseModel, Field, field_validator
from app.models.stock_log import StockAction
from typing import Optional
from app.utils.precision import normalize_positive_quantity


class StockOperationRequest(BaseModel):
    """Schema for stock-in/stock-out operations"""
    qr_code_value: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0, description="Must be greater than 0")
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("quantity")
    @classmethod
    def normalize_request_quantity(cls, value: float) -> float:
        return normalize_positive_quantity(value)


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

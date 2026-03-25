from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.product import UnitType, UnitLabel


class InventoryItem(BaseModel):
    """Schema for inventory item response"""
    product_id: int
    product_name: str
    category: Optional[str]
    qr_code_value: str
    unit_type: UnitType
    unit_label: UnitLabel
    quantity: float
    last_updated: datetime
    
    class Config:
        from_attributes = True


class InventoryList(BaseModel):
    """Schema for inventory list response"""
    items: list[InventoryItem]
    total: int

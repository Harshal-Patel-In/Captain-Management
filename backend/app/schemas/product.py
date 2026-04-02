from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime
from app.models.product import UnitType, UnitLabel
from enum import Enum


class ProductBase(BaseModel):
    """Base product schema"""
    name: str = Field(..., min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=255)
    qr_code_value: str = Field(..., min_length=1, max_length=255)
    unit_type: UnitType = Field(default=UnitType.piece)
    unit_label: UnitLabel = Field(default=UnitLabel.pcs)

    @model_validator(mode="after")
    def align_unit_label(self):
        unit_label_map = {
            UnitType.piece: UnitLabel.pcs,
            UnitType.volume: UnitLabel.L,
            UnitType.mass: UnitLabel.Kg,
        }
        self.unit_label = unit_label_map[self.unit_type]
        return self


class ProductCreate(ProductBase):
    """Schema for creating a product"""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating editable product fields"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=255)
    unit_type: Optional[UnitType] = None


class ProductResponse(ProductBase):
    """Schema for product response"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductList(BaseModel):
    """Schema for product list response"""
    products: list[ProductResponse]
    total: int

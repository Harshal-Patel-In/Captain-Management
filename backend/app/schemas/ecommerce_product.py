"""Pydantic schemas for e-commerce products"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ============= Request Schemas =============

class EcommerceProductPublish(BaseModel):
    """Schema for publishing a product to e-commerce (manual fields only)"""
    source_product_id: int  # Internal product ID
    
    # Manual input fields
    description: str = Field(min_length=1)
    price: Decimal = Field(gt=0)
    pack_size: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    images: List[str] = Field(min_length=1)  # URLs (Required)
    is_active: bool = True


class EcommerceProductUpdate(BaseModel):
    """Schema for updating an e-commerce product"""
    description: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, gt=0)
    pack_size: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ============= Response Schemas =============

class PublishableProductResponse(BaseModel):
    """Response schema for products available to publish"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    category: Optional[str] = None
    qr_code_value: str
    unit_type: str
    unit_label: str
    stock_quantity: float  # From inventory


class EcommerceProductResponse(BaseModel):
    """Response schema for published e-commerce product"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    price: Decimal
    stock_quantity: int
    low_stock_threshold: int
    unit_of_measure: str
    pack_size: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: bool
    source_product_id: Optional[int] = None


class EcommerceProductListResponse(BaseModel):
    """Response schema for product list (minimal)"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    sku: str
    name: str
    category: str
    price: Decimal
    stock_quantity: int
    is_active: bool

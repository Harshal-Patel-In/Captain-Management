"""Pydantic schemas for deliveries"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ============= Request Schemas =============

class DeliveryItemInput(BaseModel):
    """Schema for delivering a single order item"""
    order_item_id: UUID
    delivered_quantity: int = Field(gt=0)
    remarks: Optional[str] = None


class DeliverItemsRequest(BaseModel):
    """Schema for processing multiple deliveries"""
    deliveries: List[DeliveryItemInput]


# ============= Response Schemas =============

class DeliveryLogResponse(BaseModel):
    """Response schema for delivery log"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    order_item_id: UUID
    product_name: Optional[str] = None
    delivered_quantity: int
    delivered_by: Optional[UUID] = None
    remarks: Optional[str] = None
    delivered_at: datetime


class DeliveryStatusResponse(BaseModel):
    """Response schema for delivery status of an order item"""
    model_config = ConfigDict(from_attributes=True)
    
    order_item_id: UUID
    product_id: UUID
    product_name: str
    ordered_quantity: int
    delivered_quantity: int
    remaining_quantity: int
    available_stock: int
    is_fully_delivered: bool


class OrderDeliveryStatusResponse(BaseModel):
    """Response schema for order delivery status"""
    order_id: UUID
    order_status: str
    items: List[DeliveryStatusResponse]
    is_fully_delivered: bool

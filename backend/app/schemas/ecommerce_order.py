"""Pydantic schemas for e-commerce orders"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator, field_validator
from typing_extensions import Annotated
from app.models.ecommerce_order import OrderStatus, PaymentStatus


def normalize_status(v: Any) -> Any:
    """Normalize status to lowercase if strictly needed matching the Enum"""
    if isinstance(v, str):
        return v.lower()
    return v



# ============= Request Schemas =============

class OrderItemCreate(BaseModel):
    """Schema for creating an order item"""
    product_id: UUID
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    """Schema for creating a new order"""
    items: List[OrderItemCreate]
    shipping_address: dict


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status (approve/reject)"""
    status: OrderStatus
    remarks: Optional[str] = None


class DeliveryItemInput(BaseModel):
    """Schema for delivering a single order item"""
    order_item_id: UUID
    delivered_quantity: int = Field(gt=0)
    remarks: Optional[str] = None


class DeliveryCreate(BaseModel):
    """Schema for processing deliveries"""
    deliveries: List[DeliveryItemInput]


# ============= Response Schemas =============

class OrderItemResponse(BaseModel):
    """Response schema for order item"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    quantity: int
    delivered_quantity: int
    remaining_quantity: int
    unit_price: Decimal
    line_total: float


class OrderCustomerInfo(BaseModel):
    """Customer info for order display"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    full_name: Optional[str] = None
    email: str
    phone_number: Optional[str] = None


class OrderListResponse(BaseModel):
    """Response schema for order list (minimal)"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    customer_name: Optional[str] = None
    status: Annotated[OrderStatus, BeforeValidator(normalize_status)]
    payment_status: Annotated[PaymentStatus, BeforeValidator(normalize_status)]
    total_amount: Decimal
    amount_paid: Decimal
    remaining_amount: float
    created_at: datetime


class OrderDetailResponse(BaseModel):
    """Response schema for order detail"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    status: Annotated[OrderStatus, BeforeValidator(normalize_status)]
    payment_status: Annotated[PaymentStatus, BeforeValidator(normalize_status)]
    total_amount: Decimal
    amount_paid: Decimal
    remaining_amount: float
    shipping_address: dict
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Related data
    customer: Optional[OrderCustomerInfo] = None
    items: List[OrderItemResponse] = []


class OrderStatsResponse(BaseModel):
    """Response schema for order statistics"""
    pending_count: int
    approved_count: int
    partially_delivered_count: int
    fully_delivered_count: int
    rejected_count: int
    total_revenue: Decimal
    outstanding_payments: Decimal

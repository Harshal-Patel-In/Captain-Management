"""Pydantic schemas for payments"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ============= Request Schemas =============

class PaymentCreate(BaseModel):
    """Schema for recording a payment"""
    amount: Decimal = Field(gt=0)
    payment_method: str = Field(pattern="^(cash|upi|bank|other)$")
    remarks: Optional[str] = None


# ============= Response Schemas =============

class PaymentLogResponse(BaseModel):
    """Response schema for payment log"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    order_id: UUID
    amount_paid: Decimal
    payment_method: str
    remarks: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime


class PaymentHistoryResponse(BaseModel):
    """Response schema for payment history"""
    model_config = ConfigDict(from_attributes=True)
    
    order_id: UUID
    total_amount: Decimal
    amount_paid: Decimal
    remaining_amount: float
    payments: list[PaymentLogResponse]


class PaymentListResponse(BaseModel):
    """Response schema for payment list (with customer info)"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    order_id: UUID
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    amount_paid: Decimal
    payment_method: str
    created_at: datetime


class PaymentReceiptData(BaseModel):
    """Data for generating payment receipt PDF"""
    receipt_id: UUID
    order_id: UUID
    date: datetime
    
    # Customer info
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    
    # Payment details
    amount_paid: Decimal
    payment_method: str
    remarks: Optional[str] = None
    
    # Order summary
    order_total: Decimal
    paid_till_now: Decimal
    remaining_due: float

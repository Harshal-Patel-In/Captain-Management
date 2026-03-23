"""Management API - Payments Routes"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.payment_service import PaymentService
from app.schemas.payment import (
    PaymentLogResponse, PaymentHistoryResponse, PaymentListResponse
)

router = APIRouter(prefix="/management/payments", tags=["Management - Payments"])


@router.get("", response_model=list[PaymentListResponse])
def get_all_payments(
    order_id: Optional[UUID] = None,
    payment_method: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all payments with optional filters"""
    payments = PaymentService.get_all_payments(
        db, limit, offset, order_id, payment_method
    )
    
    result = []
    for payment in payments:
        # Get customer info from order
        customer_name = None
        customer_email = None
        if payment.order and payment.order.user:
            customer_name = payment.order.user.full_name
            customer_email = payment.order.user.email
        
        result.append(PaymentListResponse(
            id=payment.id,
            order_id=payment.order_id,
            customer_name=customer_name,
            customer_email=customer_email,
            amount_paid=payment.amount_paid,
            payment_method=payment.payment_method,
            created_at=payment.created_at
        ))
    
    return result


@router.get("/stats")
def get_payment_stats(db: Session = Depends(get_db)):
    """Get payment statistics"""
    return PaymentService.get_payment_stats(db)


@router.get("/{payment_id}", response_model=PaymentLogResponse)
def get_payment_detail(
    payment_id: UUID,
    db: Session = Depends(get_db)
):
    """Get payment details"""
    payment = PaymentService.get_payment_detail(db, payment_id)
    return PaymentLogResponse.model_validate(payment)


@router.get("/order/{order_id}/history", response_model=PaymentHistoryResponse)
def get_order_payment_history(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Get payment history for an order"""
    return PaymentService.get_payment_history(db, order_id)


@router.get("/{payment_id}/receipt")
def get_payment_receipt(
    payment_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Generate payment receipt data.
    For PDF generation, implement with a library like reportlab or weasyprint.
    """
    from app.schemas.payment import PaymentReceiptData
    
    payment = PaymentService.get_payment_detail(db, payment_id)
    
    # Get order details
    order = payment.order
    customer_address = None
    if order and order.shipping_address:
        addr = order.shipping_address
        parts = [
            addr.get("address_line1"),
            addr.get("city"),
            addr.get("state"),
            addr.get("postal_code")
        ]
        customer_address = ", ".join([p for p in parts if p])
    
    receipt = PaymentReceiptData(
        receipt_id=payment.id,
        order_id=payment.order_id,
        date=payment.created_at,
        customer_name=order.user.full_name if order and order.user else None,
        customer_address=customer_address,
        amount_paid=payment.amount_paid,
        payment_method=payment.payment_method,
        remarks=payment.remarks,
        order_total=order.total_amount if order else 0,
        paid_till_now=order.amount_paid if order else 0,
        remaining_due=order.remaining_amount if order else 0
    )
    
    return receipt

"""Payment Service - Payment recording and history"""
from typing import Optional, List
from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models import (
    EcommerceOrder, EcommerceUser, PaymentStatus,
    PaymentLog, OrderLog, OrderAction, Notification
)
from app.schemas.payment import PaymentCreate, PaymentLogResponse, PaymentHistoryResponse


class PaymentService:
    """Service for payment operations"""
    
    @staticmethod
    def record_payment(
        db: Session,
        order_id: UUID,
        payment_data: PaymentCreate,
        admin_id: Optional[UUID] = None
    ) -> PaymentLog:
        """
        Record a payment for an order.
        - Validates amount <= remaining
        - Updates order.amount_paid
        - Creates immutable payment log
        - Updates payment status
        - Sends notification
        """
        try:
            # Get order with lock
            order = db.query(EcommerceOrder).filter(
                EcommerceOrder.id == order_id
            ).with_for_update().first()
            
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            # Helper to check allowed statuses (PENDING not included)
            allowed_statuses = ["APPROVED", "PARTIALLY_DELIVERED", "FULLY_DELIVERED"]
            if order.status.upper() not in allowed_statuses:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot record payment for order with status {order.status}. Order must be approved first."
                )
            
            # Calculate remaining
            remaining = float(order.total_amount) - float(order.amount_paid)
            
            if payment_data.amount > Decimal(str(remaining)):
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment amount ({payment_data.amount}) exceeds remaining due ({remaining:.2f})"
                )
            
            if payment_data.amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Payment amount must be greater than 0"
                )
            
            # Update order amount_paid
            previous_paid = float(order.amount_paid)
            order.amount_paid = Decimal(str(float(order.amount_paid) + float(payment_data.amount)))
            new_paid = float(order.amount_paid)
            
            # Update payment status
            previous_payment_status = order.payment_status
            if float(order.amount_paid) >= float(order.total_amount):
                order.payment_status = PaymentStatus.PAID.value.upper()
            elif float(order.amount_paid) > 0:
                order.payment_status = PaymentStatus.PARTIAL.value.upper()
            
            # Create immutable payment log
            payment_log = PaymentLog(
                order_id=order.id,
                amount_paid=payment_data.amount,
                payment_method=payment_data.payment_method,
                remarks=payment_data.remarks,
                created_by=admin_id
            )
            db.add(payment_log)
            db.flush()  # Get payment_log ID
            
            # Create order log
            order_log = OrderLog(
                order_id=order.id,
                action=OrderAction.PAYMENT_UPDATED.value,
                performed_by=admin_id,
                previous_state={
                    "amount_paid": previous_paid,
                    "payment_status": previous_payment_status
                },
                new_state={
                    "amount_paid": new_paid,
                    "payment_status": order.payment_status
                },
                remarks=f"Payment of {payment_data.amount} received via {payment_data.payment_method}"
            )
            db.add(order_log)
            
            # Create notification
            notification = Notification(
                user_id=order.user_id,
                type="payment_received",
                title="Payment Received",
                message=f"Payment of ₹{payment_data.amount} received for your order.",
                order_id=order.id
            )
            db.add(notification)
            
            db.commit()
            db.refresh(payment_log)
            return payment_log
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Payment recording failed: {str(e)}")
    
    @staticmethod
    def get_payment_history(db: Session, order_id: UUID) -> PaymentHistoryResponse:
        """Get payment history for an order"""
        order = db.query(EcommerceOrder).filter(
            EcommerceOrder.id == order_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        payments = db.query(PaymentLog).filter(
            PaymentLog.order_id == order_id
        ).order_by(PaymentLog.created_at.desc()).all()
        
        return PaymentHistoryResponse(
            order_id=order.id,
            total_amount=order.total_amount,
            amount_paid=order.amount_paid,
            remaining_amount=order.remaining_amount,
            payments=[PaymentLogResponse.model_validate(p) for p in payments]
        )
    
    @staticmethod
    def get_all_payments(
        db: Session,
        limit: int = 50,
        offset: int = 0,
        order_id: Optional[UUID] = None,
        payment_method: Optional[str] = None
    ) -> List[PaymentLog]:
        """Get all payments with optional filters"""
        query = db.query(PaymentLog)
        
        if order_id:
            query = query.filter(PaymentLog.order_id == order_id)
        
        if payment_method:
            query = query.filter(PaymentLog.payment_method == payment_method)
        
        return query.order_by(PaymentLog.created_at.desc()).offset(offset).limit(limit).all()
    
    @staticmethod
    def get_payment_detail(db: Session, payment_id: UUID) -> PaymentLog:
        """Get payment details"""
        payment = db.query(PaymentLog).filter(
            PaymentLog.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        return payment
    
    @staticmethod
    def get_payment_stats(db: Session) -> dict:
        """Get payment statistics"""
        today_payments = db.query(func.sum(PaymentLog.amount_paid)).filter(
            func.date(PaymentLog.created_at) == func.current_date()
        ).scalar() or 0
        
        total_payments = db.query(func.sum(PaymentLog.amount_paid)).scalar() or 0
        
        payment_count = db.query(func.count(PaymentLog.id)).scalar() or 0
        
        # Payments by method
        by_method = db.query(
            PaymentLog.payment_method,
            func.sum(PaymentLog.amount_paid)
        ).group_by(PaymentLog.payment_method).all()
        
        return {
            "today_payments": float(today_payments),
            "total_payments": float(total_payments),
            "payment_count": payment_count,
            "by_method": {method: float(amount) for method, amount in by_method}
        }

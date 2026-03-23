"""Order Service - Core order management operations"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException

from app.models import (
    EcommerceOrder, EcommerceOrderItem, EcommerceProduct, EcommerceUser,
    OrderStatus, PaymentStatus, OrderLog, OrderAction, Notification, PaymentLog
)
from app.schemas.ecommerce_order import OrderCreate, OrderListResponse, OrderDetailResponse


class OrderService:
    """Service for order lifecycle management"""
    
    @staticmethod
    def create_order(
        db: Session,
        user_id: UUID,
        order_data: OrderCreate
    ) -> EcommerceOrder:
        """
        Create a new order from cart items.
        Status: pending
        Payment: unpaid
        """
        try:
            # Validate user exists
            user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Calculate total amount and validate products
            total_amount = 0
            order_items = []
            
            for item in order_data.items:
                product = db.query(EcommerceProduct).filter(
                    EcommerceProduct.id == item.product_id,
                    EcommerceProduct.is_active == True
                ).first()
                
                if not product:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Product {item.product_id} not found or inactive"
                    )
                
                if product.stock_quantity < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}"
                    )
                
                line_total = float(product.price) * item.quantity
                total_amount += line_total
                
                order_items.append({
                    "product_id": product.id,
                    "quantity": item.quantity,
                    "unit_price": product.price
                })
            
            # Create order
            order = EcommerceOrder(
                user_id=user_id,
                status=OrderStatus.PENDING.value.upper(),
                payment_status=PaymentStatus.UNPAID.value.upper(),
                total_amount=total_amount,
                amount_paid=0,
                shipping_address=order_data.shipping_address
            )
            db.add(order)
            db.flush()  # Get order ID
            
            # Create order items
            for item_data in order_items:
                order_item = EcommerceOrderItem(
                    order_id=order.id,
                    product_id=item_data["product_id"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    delivered_quantity=0
                )
                db.add(order_item)
            
            # Log order creation
            order_log = OrderLog(
                order_id=order.id,
                action=OrderAction.CREATED.value,
                new_state={"status": OrderStatus.PENDING.value}
            )
            db.add(order_log)
            
            db.commit()
            db.refresh(order)
            return order
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")
    
    @staticmethod
    def approve_order(
        db: Session,
        order_id: UUID,
        admin_id: Optional[UUID] = None
    ) -> EcommerceOrder:
        """Approve a pending order"""
        try:
            order = db.query(EcommerceOrder).filter(
                EcommerceOrder.id == order_id
            ).with_for_update().first()
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order.status != OrderStatus.PENDING.value.upper():
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot approve order with status: {order.status}"
                )
            
            previous_state = {"status": order.status}
            order.status = OrderStatus.APPROVED.value.upper()
            new_state = {"status": order.status}
            
            # Log action
            order_log = OrderLog(
                order_id=order.id,
                action=OrderAction.APPROVED.value,
                performed_by=admin_id,
                previous_state=previous_state,
                new_state=new_state
            )
            db.add(order_log)
            
            # Create notification
            notification = Notification(
                user_id=order.user_id,
                type="order_approved",
                title="Order Approved",
                message=f"Your order has been approved and is being prepared for delivery.",
                order_id=order.id
            )
            db.add(notification)
            
            db.commit()
            db.refresh(order)
            return order
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Order approval failed: {str(e)}")
    
    @staticmethod
    def reject_order(
        db: Session,
        order_id: UUID,
        admin_id: Optional[UUID] = None,
        reason: Optional[str] = None
    ) -> EcommerceOrder:
        """Reject a pending order"""
        try:
            order = db.query(EcommerceOrder).filter(
                EcommerceOrder.id == order_id
            ).with_for_update().first()
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order.status != OrderStatus.PENDING.value.upper():
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot reject order with status: {order.status}"
                )
            
            previous_state = {"status": order.status}
            order.status = OrderStatus.REJECTED.value.upper()
            new_state = {"status": order.status}
            
            # Log action
            order_log = OrderLog(
                order_id=order.id,
                action=OrderAction.REJECTED.value,
                performed_by=admin_id,
                previous_state=previous_state,
                new_state=new_state,
                remarks=reason
            )
            db.add(order_log)
            
            # Create notification
            notification = Notification(
                user_id=order.user_id,
                type="order_rejected",
                title="Order Rejected",
                message=f"Your order has been rejected. Reason: {reason or 'Not specified'}",
                order_id=order.id
            )
            db.add(notification)
            
            db.commit()
            db.refresh(order)
            return order
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Order rejection failed: {str(e)}")
    
    @staticmethod
    def get_orders_by_status(
        db: Session,
        status: Optional[OrderStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[EcommerceOrder]:
        """Get orders filtered by status"""
        query = db.query(EcommerceOrder)
        
        if status:
            query = query.filter(EcommerceOrder.status == status.value.upper())
        
        return query.order_by(EcommerceOrder.created_at.desc()).offset(offset).limit(limit).all()
    
    @staticmethod
    def get_order_detail(db: Session, order_id: UUID) -> EcommerceOrder:
        """Get full order details with items and customer"""
        order = db.query(EcommerceOrder).filter(
            EcommerceOrder.id == order_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return order
    
    @staticmethod
    def get_order_stats(db: Session) -> dict:
        """Get order statistics for dashboard"""
        from sqlalchemy import func
        
        stats = {}
        for status in OrderStatus:
            count = db.query(func.count(EcommerceOrder.id)).filter(
                EcommerceOrder.status == status.value.upper()
            ).scalar()
            stats[f"{status.value.lower()}_count"] = count
        
        # Use the immutable payment ledger as the source of truth for collected money.
        total_revenue = db.query(func.sum(PaymentLog.amount_paid)).scalar() or 0
        
        # Outstanding payments
        outstanding = db.query(
            func.sum(EcommerceOrder.total_amount - EcommerceOrder.amount_paid)
        ).filter(
            EcommerceOrder.status.in_([
                OrderStatus.APPROVED.value.upper(),
                OrderStatus.PARTIALLY_DELIVERED.value.upper(),
                OrderStatus.FULLY_DELIVERED.value.upper()
            ])
        ).scalar() or 0
        
        stats["total_revenue"] = float(total_revenue)
        stats["outstanding_payments"] = float(outstanding)
        
        return stats

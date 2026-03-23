"""Management API - Logs Routes (Audit)"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from app.database import get_db
from app.models import OrderLog, DeliveryLog, PaymentLog

router = APIRouter(prefix="/management/logs", tags=["Management - Logs"])


# Response models
class OrderLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    order_id: UUID
    action: str
    performed_by: Optional[UUID] = None
    previous_state: Optional[dict] = None
    new_state: Optional[dict] = None
    remarks: Optional[str] = None
    created_at: datetime


class DeliveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    order_item_id: UUID
    product_name: Optional[str] = None
    delivered_quantity: int
    delivered_by: Optional[UUID] = None
    remarks: Optional[str] = None
    delivered_at: datetime


@router.get("/orders/{order_id}", response_model=list[OrderLogResponse])
def get_order_logs(
    order_id: UUID,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get action logs for an order"""
    logs = db.query(OrderLog).filter(
        OrderLog.order_id == order_id
    ).order_by(OrderLog.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        OrderLogResponse(
            id=log.id,
            order_id=log.order_id,
            action=log.action.value if log.action else None,
            performed_by=log.performed_by,
            previous_state=log.previous_state,
            new_state=log.new_state,
            remarks=log.remarks,
            created_at=log.created_at
        )
        for log in logs
    ]


@router.get("/orders/{order_id}/deliveries", response_model=list[DeliveryLogResponse])
def get_order_delivery_logs(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Get delivery logs for all items in an order"""
    from app.models import EcommerceOrderItem, EcommerceProduct
    
    # Get all order items
    order_items = db.query(EcommerceOrderItem).filter(
        EcommerceOrderItem.order_id == order_id
    ).all()
    
    item_ids = [item.id for item in order_items]
    
    # Get delivery logs
    logs = db.query(DeliveryLog).filter(
        DeliveryLog.order_item_id.in_(item_ids)
    ).order_by(DeliveryLog.delivered_at.desc()).all()
    
    # Build response with product names
    result = []
    for log in logs:
        product_name = None
        if log.order_item and log.order_item.product:
            product_name = log.order_item.product.name
        
        result.append(DeliveryLogResponse(
            id=log.id,
            order_item_id=log.order_item_id,
            product_name=product_name,
            delivered_quantity=log.delivered_quantity,
            delivered_by=log.delivered_by,
            remarks=log.remarks,
            delivered_at=log.delivered_at
        ))
    
    return result


@router.get("/combined/{order_id}")
def get_combined_order_logs(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get combined timeline of all logs for an order.
    Useful for the audit screen.
    """
    from app.models import EcommerceOrderItem
    
    timeline = []
    
    # Get order logs
    order_logs = db.query(OrderLog).filter(
        OrderLog.order_id == order_id
    ).all()
    
    for log in order_logs:
        timeline.append({
            "type": "order_action",
            "timestamp": log.created_at.isoformat(),
            "action": log.action.value if log.action else None,
            "description": f"Order {log.action.value}" if log.action else "Unknown action",
            "details": log.new_state
        })
    
    # Get payment logs
    payment_logs = db.query(PaymentLog).filter(
        PaymentLog.order_id == order_id
    ).all()
    
    for log in payment_logs:
        timeline.append({
            "type": "payment",
            "timestamp": log.created_at.isoformat(),
            "action": "payment_received",
            "description": f"Payment of ₹{log.amount_paid} received via {log.payment_method}",
            "details": {
                "amount": float(log.amount_paid),
                "method": log.payment_method
            }
        })
    
    # Get delivery logs
    order_items = db.query(EcommerceOrderItem).filter(
        EcommerceOrderItem.order_id == order_id
    ).all()
    
    item_ids = [item.id for item in order_items]
    
    delivery_logs = db.query(DeliveryLog).filter(
        DeliveryLog.order_item_id.in_(item_ids)
    ).all()
    
    for log in delivery_logs:
        product_name = "Unknown"
        if log.order_item and log.order_item.product:
            product_name = log.order_item.product.name
        
        timeline.append({
            "type": "delivery",
            "timestamp": log.delivered_at.isoformat(),
            "action": "item_delivered",
            "description": f"Delivered {log.delivered_quantity} units – {product_name}",
            "details": {
                "product": product_name,
                "quantity": log.delivered_quantity
            }
        })
    
    # Sort by timestamp (newest first)
    timeline.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "order_id": str(order_id),
        "timeline": timeline
    }

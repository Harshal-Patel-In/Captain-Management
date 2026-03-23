"""Management API - Orders Routes"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EcommerceOrder, OrderStatus, PaymentStatus
from app.services.order_service import OrderService
from app.services.delivery_service import DeliveryService
from app.services.payment_service import PaymentService
from app.services.email_service import (
    send_order_approved_email, send_order_rejected_email,
    send_delivery_update_email, send_payment_received_email,
    send_bill_email,
)
from app.services.bill_service import generate_bill_pdf
from app.schemas.ecommerce_order import (
    OrderListResponse, OrderDetailResponse, OrderStatsResponse
)
from app.schemas.delivery import DeliverItemsRequest, OrderDeliveryStatusResponse
from app.schemas.payment import PaymentCreate, PaymentLogResponse

router = APIRouter(prefix="/management/orders", tags=["Management - Orders"])


def _send_bill_if_complete(order, db: Session):
    """Send PDF bill email if order is fully delivered AND fully paid."""
    if (order.status == OrderStatus.FULLY_DELIVERED.value.upper()
            and order.payment_status == PaymentStatus.PAID.value.upper()
            and order.user and order.user.email):
        pdf = generate_bill_pdf(order, db)
        send_bill_email(
            to_email=order.user.email,
            customer_name=order.user.full_name,
            order_id=str(order.id),
            pdf_bytes=pdf,
        )


@router.get("", response_model=list[OrderListResponse])
def get_orders(
    status: Optional[OrderStatus] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get orders list, optionally filtered by status"""
    orders = OrderService.get_orders_by_status(db, status, limit, offset)
    
    result = []
    for order in orders:
        result.append(OrderListResponse(
            id=order.id,
            user_id=order.user_id,
            customer_name=order.user.full_name if order.user else None,
            status=order.status,
            payment_status=order.payment_status,
            total_amount=order.total_amount,
            amount_paid=order.amount_paid,
            remaining_amount=order.remaining_amount,
            created_at=order.created_at
        ))
    
    return result


@router.get("/stats", response_model=OrderStatsResponse)
def get_order_stats(db: Session = Depends(get_db)):
    """Get order statistics for dashboard"""
    stats = OrderService.get_order_stats(db)
    return OrderStatsResponse(
        pending_count=stats.get("pending_count", 0),
        approved_count=stats.get("approved_count", 0),
        partially_delivered_count=stats.get("partially_delivered_count", 0),
        fully_delivered_count=stats.get("fully_delivered_count", 0),
        rejected_count=stats.get("rejected_count", 0),
        total_revenue=stats.get("total_revenue", 0),
        outstanding_payments=stats.get("outstanding_payments", 0)
    )


@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order_detail(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Get full order details with items and customer info"""
    order = OrderService.get_order_detail(db, order_id)
    
    return OrderDetailResponse(
        id=order.id,
        user_id=order.user_id,
        status=order.status,
        payment_status=order.payment_status,
        total_amount=order.total_amount,
        amount_paid=order.amount_paid,
        remaining_amount=order.remaining_amount,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        updated_at=order.updated_at,
        customer={
            "id": order.user.id,
            "full_name": order.user.full_name,
            "email": order.user.email,
            "phone_number": order.user.phone_number
        } if order.user else None,
        items=[
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else None,
                "quantity": item.quantity,
                "delivered_quantity": item.delivered_quantity,
                "remaining_quantity": item.remaining_quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total
            }
            for item in order.items
        ]
    )


@router.post("/{order_id}/approve")
def approve_order(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Approve a pending order"""
    order = OrderService.approve_order(db, order_id)

    # Email notification
    if order.user and order.user.email:
        send_order_approved_email(
            to_email=order.user.email,
            customer_name=order.user.full_name,
            order_id=str(order.id),
            items=[{"product_name": it.product.name if it.product else "Product",
                    "quantity": it.quantity, "unit_price": float(it.unit_price),
                    "line_total": float(it.line_total)} for it in order.items],
            total_amount=order.total_amount,
        )

    return {
        "success": True,
        "message": "Order approved successfully",
        "order_id": str(order.id),
        "status": order.status
    }


@router.post("/{order_id}/reject")
def reject_order(
    order_id: UUID,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Reject a pending order"""
    order = OrderService.reject_order(db, order_id, reason=reason)

    # Email notification
    if order.user and order.user.email:
        send_order_rejected_email(
            to_email=order.user.email,
            customer_name=order.user.full_name,
            order_id=str(order.id),
            reason=reason,
        )

    return {
        "success": True,
        "message": "Order rejected",
        "order_id": str(order.id),
        "status": order.status
    }


@router.get("/{order_id}/delivery-status", response_model=OrderDeliveryStatusResponse)
def get_delivery_status(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Get delivery status for all items in an order"""
    order = OrderService.get_order_detail(db, order_id)
    items = DeliveryService.get_delivery_status(db, order_id)
    
    return OrderDeliveryStatusResponse(
        order_id=order.id,
        order_status=order.status,
        items=items,
        is_fully_delivered=all(item.is_fully_delivered for item in items)
    )


@router.post("/{order_id}/deliver")
def deliver_items(
    order_id: UUID,
    request: DeliverItemsRequest,
    db: Session = Depends(get_db)
):
    """Deliver items from an order (partial or full)"""
    # Validate first
    validation = DeliveryService.validate_stock_availability(db, request.deliveries)
    invalid = [v for v in validation if not v["valid"]]
    
    if invalid:
        return {
            "success": False,
            "message": "Validation failed",
            "errors": invalid
        }
    
    # Process delivery
    order = DeliveryService.deliver_items(db, order_id, request.deliveries)

    # Email notification
    if order.user and order.user.email:
        is_fully = order.status == OrderStatus.FULLY_DELIVERED.value.upper()
        send_delivery_update_email(
            to_email=order.user.email,
            customer_name=order.user.full_name,
            order_id=str(order.id),
            delivered_items=[{"product_name": it.product.name if it.product else "Product",
                              "delivered_quantity": it.delivered_quantity}
                             for it in order.items if it.delivered_quantity > 0],
            is_fully_delivered=is_fully,
        )
        _send_bill_if_complete(order, db)

    return {
        "success": True,
        "message": "Delivery processed successfully",
        "order_id": str(order.id),
        "status": order.status
    }


@router.post("/{order_id}/payment", response_model=PaymentLogResponse)
def record_payment(
    order_id: UUID,
    payment: PaymentCreate,
    db: Session = Depends(get_db)
):
    """Record a payment for an order"""
    payment_log = PaymentService.record_payment(db, order_id, payment)

    # Email notification
    order = db.query(EcommerceOrder).filter(EcommerceOrder.id == order_id).first()
    if order and order.user and order.user.email:
        total_paid = float(order.amount_paid)
        remaining = float(order.total_amount) - total_paid
        send_payment_received_email(
            to_email=order.user.email,
            customer_name=order.user.full_name,
            order_id=str(order.id),
            amount_paid_now=payment_log.amount_paid,
            payment_method=payment_log.payment_method,
            total_amount=order.total_amount,
            total_paid=total_paid,
            remaining=remaining,
        )
        _send_bill_if_complete(order, db)

    return PaymentLogResponse.model_validate(payment_log)


@router.get("/{order_id}/bill")
def download_bill(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Download PDF bill for an order (admin print / download)"""
    order = OrderService.get_order_detail(db, order_id)
    pdf = generate_bill_pdf(order, db)
    short = str(order.id)[:8].upper()
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="Bill_{short}.pdf"'},
    )

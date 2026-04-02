"""Delivery Service - Handles partial/full delivery with stock management"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import (
    EcommerceOrder, EcommerceOrderItem, EcommerceProduct,
    OrderStatus, OrderLog, OrderAction, DeliveryLog, Notification,
    Inventory, StockLog, StockAction
)
from app.schemas.delivery import DeliveryItemInput, DeliveryStatusResponse
from app.utils.precision import normalize_quantity


class DeliveryService:
    """Service for delivery operations with stock management"""
    
    @staticmethod
    def validate_stock_availability(
        db: Session,
        deliveries: List[DeliveryItemInput]
    ) -> List[dict]:
        """
        Pre-flight check for stock availability.
        Returns list of validation results.
        """
        results = []
        
        for delivery in deliveries:
            order_item = db.query(EcommerceOrderItem).filter(
                EcommerceOrderItem.id == delivery.order_item_id
            ).first()
            
            if not order_item:
                results.append({
                    "order_item_id": str(delivery.order_item_id),
                    "valid": False,
                    "error": "Order item not found"
                })
                continue
            
            product = db.query(EcommerceProduct).filter(
                EcommerceProduct.id == order_item.product_id
            ).first()
            
            remaining = order_item.quantity - order_item.delivered_quantity
            
            if delivery.delivered_quantity > remaining:
                results.append({
                    "order_item_id": str(delivery.order_item_id),
                    "product_name": product.name if product else "Unknown",
                    "valid": False,
                    "error": f"Delivery quantity ({delivery.delivered_quantity}) exceeds remaining ({remaining})"
                })
                continue
            
            if product.stock_quantity < delivery.delivered_quantity:
                results.append({
                    "order_item_id": str(delivery.order_item_id),
                    "product_name": product.name if product else "Unknown",
                    "valid": False,
                    "error": f"Insufficient stock. Available: {product.stock_quantity}, Requested: {delivery.delivered_quantity}"
                })
                continue
            
            results.append({
                "order_item_id": str(delivery.order_item_id),
                "product_name": product.name if product else "Unknown",
                "valid": True,
                "available_stock": product.stock_quantity,
                "remaining_to_deliver": remaining
            })
        
        return results
    
    @staticmethod
    def deliver_items(
        db: Session,
        order_id: UUID,
        deliveries: List[DeliveryItemInput],
        admin_id: Optional[UUID] = None
    ) -> EcommerceOrder:
        """
        Process deliveries atomically:
        1. Lock inventory rows
        2. Validate quantities
        3. Update order items
        4. Reduce inventory
        5. Create stock logs
        6. Create delivery logs
        7. Update order status
        8. Send notification
        """
        try:
            # Get order with lock
            order = db.query(EcommerceOrder).filter(
                EcommerceOrder.id == order_id
            ).with_for_update().first()
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order.status not in [OrderStatus.APPROVED.value.upper(), OrderStatus.PARTIALLY_DELIVERED.value.upper()]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot deliver order with status: {order.status}"
                )
            
            # Process each delivery
            for delivery in deliveries:
                # Get order item
                order_item = db.query(EcommerceOrderItem).filter(
                    EcommerceOrderItem.id == delivery.order_item_id,
                    EcommerceOrderItem.order_id == order_id
                ).with_for_update().first()
                
                if not order_item:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Order item {delivery.order_item_id} not found in this order"
                    )
                
                remaining = order_item.quantity - order_item.delivered_quantity
                if delivery.delivered_quantity > remaining:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Delivery quantity ({delivery.delivered_quantity}) exceeds remaining ({remaining})"
                    )
                
                # Get product and inventory
                product = db.query(EcommerceProduct).filter(
                    EcommerceProduct.id == order_item.product_id
                ).first()
                
                if not product or not product.source_product_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product not properly linked to inventory"
                    )
                
                # Lock and get inventory
                inventory = db.query(Inventory).filter(
                    Inventory.product_id == product.source_product_id
                ).with_for_update().first()
                
                if not inventory:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Inventory not found for product"
                    )
                
                current_inventory = normalize_quantity(inventory.quantity)
                if current_inventory < delivery.delivered_quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for {product.name}. Available: {current_inventory}"
                    )
                
                # Update order item delivered quantity
                order_item.delivered_quantity += delivery.delivered_quantity
                
                # Update inventory
                previous_qty = normalize_quantity(inventory.quantity)
                inventory.quantity = normalize_quantity(previous_qty - delivery.delivered_quantity)
                new_qty = normalize_quantity(inventory.quantity)
                
                # Create stock log with order reference
                stock_log = StockLog(
                    product_id=product.source_product_id,
                    action=StockAction.OUT.value,
                    quantity=delivery.delivered_quantity,
                    previous_quantity=previous_qty,
                    new_quantity=new_qty,
                    remarks=f"Delivery for order {order_id}",
                    reference_order_id=order_id,
                    reference_order_item_id=order_item.id
                )
                db.add(stock_log)
                
                # Create delivery log
                delivery_log = DeliveryLog(
                    order_item_id=order_item.id,
                    delivered_quantity=delivery.delivered_quantity,
                    delivered_by=admin_id,
                    remarks=delivery.remarks
                )
                db.add(delivery_log)
            
            # Calculate new order status
            all_items = db.query(EcommerceOrderItem).filter(
                EcommerceOrderItem.order_id == order_id
            ).all()
            
            fully_delivered = all(item.delivered_quantity >= item.quantity for item in all_items)
            partially_delivered = any(item.delivered_quantity > 0 for item in all_items)
            
            previous_state = {"status": order.status}
            
            if fully_delivered:
                order.status = OrderStatus.FULLY_DELIVERED.value.upper()
                notification_message = "Your order has been fully delivered."
            elif partially_delivered:
                order.status = OrderStatus.PARTIALLY_DELIVERED.value.upper()
                notification_message = "Part of your order has been delivered."
            
            new_state = {"status": order.status}
            
            # Log order status change
            order_log = OrderLog(
                order_id=order.id,
                action=OrderAction.FULLY_DELIVERED.value if fully_delivered else OrderAction.PARTIALLY_DELIVERED.value,
                performed_by=admin_id,
                previous_state=previous_state,
                new_state=new_state
            )
            db.add(order_log)
            
            # Create notification
            notification = Notification(
                user_id=order.user_id,
                type="delivery_update",
                title="Delivery Update",
                message=notification_message,
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
            raise HTTPException(status_code=500, detail=f"Delivery failed: {str(e)}")
    
    @staticmethod
    def get_delivery_status(db: Session, order_id: UUID) -> List[DeliveryStatusResponse]:
        """Get delivery status for all items in an order"""
        order = db.query(EcommerceOrder).filter(
            EcommerceOrder.id == order_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        items = db.query(EcommerceOrderItem).filter(
            EcommerceOrderItem.order_id == order_id
        ).all()
        
        result = []
        for item in items:
            product = db.query(EcommerceProduct).filter(
                EcommerceProduct.id == item.product_id
            ).first()
            
            # Get available stock
            available_stock = 0
            if product and product.source_product_id:
                inventory = db.query(Inventory).filter(
                    Inventory.product_id == product.source_product_id
                ).first()
                if inventory:
                    available_stock = int(normalize_quantity(inventory.quantity))
            
            result.append(DeliveryStatusResponse(
                order_item_id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else "Unknown",
                ordered_quantity=item.quantity,
                delivered_quantity=item.delivered_quantity,
                remaining_quantity=item.quantity - item.delivered_quantity,
                available_stock=available_stock,
                is_fully_delivered=item.delivered_quantity >= item.quantity
            ))
        
        return result

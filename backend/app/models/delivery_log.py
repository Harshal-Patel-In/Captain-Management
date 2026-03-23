"""Delivery Log Model - Tracks delivery of order items"""
from uuid import uuid4
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DeliveryLog(Base):
    """
    Tracks individual deliveries for order items.
    Supports partial delivery tracking with audit trail.
    """
    __tablename__ = "delivery_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_order_items.id"), nullable=False, index=True)
    delivered_quantity = Column(Integer, nullable=False)
    delivered_by = Column(UUID(as_uuid=True), nullable=True)  # Admin user ID
    remarks = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("delivered_quantity > 0", name="positive_delivery_quantity"),
    )
    
    # Relationships
    order_item = relationship("EcommerceOrderItem", back_populates="delivery_logs")

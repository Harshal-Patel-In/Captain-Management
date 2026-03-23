"""Notification Model - In-app notifications for customers"""
import enum
from uuid import uuid4
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationType(str, enum.Enum):
    """Notification types"""
    ORDER_CREATED = "order_created"
    ORDER_APPROVED = "order_approved"
    ORDER_REJECTED = "order_rejected"
    DELIVERY_UPDATE = "delivery_update"
    PAYMENT_RECEIVED = "payment_received"
    ORDER_COMPLETE = "order_complete"
    GENERAL = "general"


class Notification(Base):
    """
    In-app notification for e-commerce users.
    Triggered by order status changes, deliveries, and payments.
    """
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_users.id"), nullable=False, index=True)
    
    # Notification content
    type = Column(String, nullable=False)  # NotificationType value
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    
    # Order reference
    order_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_orders.id"), nullable=True, index=True)
    
    # Status
    is_read = Column(Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("EcommerceUser", back_populates="notifications")
    order = relationship("EcommerceOrder", back_populates="notifications")

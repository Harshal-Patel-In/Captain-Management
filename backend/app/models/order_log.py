"""Order Log Model - Audit trail for order state changes"""
import enum
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class OrderAction(str, enum.Enum):
    """Order action types for audit trail"""
    CREATED = "created"
    APPROVED = "approved"
    REJECTED = "rejected"
    PARTIALLY_DELIVERED = "partially_delivered"
    FULLY_DELIVERED = "fully_delivered"
    PAYMENT_UPDATED = "payment_updated"
    CANCELLED = "cancelled"


class OrderLog(Base):
    """
    Immutable order action log for audit compliance.
    Records all state changes on orders with before/after snapshots.
    """
    __tablename__ = "order_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_orders.id"), nullable=False, index=True)
    action = Column(String, nullable=False)  # Stored as string, validated by DB Enum
    performed_by = Column(UUID(as_uuid=True), nullable=True)  # Admin user ID
    previous_state = Column(JSONB, nullable=True)  # Snapshot before action
    new_state = Column(JSONB, nullable=True)  # Snapshot after action
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    order = relationship("EcommerceOrder", back_populates="order_logs")

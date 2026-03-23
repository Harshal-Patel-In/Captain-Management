"""E-commerce Order Model"""
import enum
from uuid import uuid4
from sqlalchemy import Column, Numeric, DateTime, ForeignKey, Enum, CheckConstraint, String
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class OrderStatus(str, enum.Enum):
    """Order lifecycle states"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PARTIALLY_DELIVERED = "partially_delivered"
    FULLY_DELIVERED = "fully_delivered"
    CANCELLED = "cancelled"
    # Mapping for legacy/existing statuses if needed
    # SHIPPED -> PARTIALLY_DELIVERED
    # DELIVERED -> FULLY_DELIVERED


class PaymentStatus(str, enum.Enum):
    """Payment states"""
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


class EcommerceOrder(Base):
    """
    Customer order with status tracking and payment management.
    Supports partial delivery and partial payment flows.
    """
    __tablename__ = "ecommerce_orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_users.id"), nullable=False, index=True)
    
    # Status tracking
    # Status tracking
    status = Column(String, nullable=False, default=OrderStatus.PENDING.value)
    payment_status = Column(String, nullable=False, default=PaymentStatus.UNPAID.value)
    
    # Payment amounts
    total_amount = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)
    # Note: remaining_amount = total_amount - amount_paid (computed, not stored)
    
    # Shipping
    shipping_address = Column(JSONB, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    payment_deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("amount_paid <= total_amount", name="valid_payment_amount"),
        CheckConstraint("amount_paid >= 0", name="non_negative_payment"),
        CheckConstraint("total_amount > 0", name="positive_total"),
    )
    
    # Relationships
    user = relationship("EcommerceUser", back_populates="orders")
    items = relationship("EcommerceOrderItem", back_populates="order", cascade="all, delete-orphan")
    payment_logs = relationship("PaymentLog", back_populates="order", cascade="all, delete-orphan")
    order_logs = relationship("OrderLog", back_populates="order", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="order")
    stock_logs = relationship("StockLog", backref="reference_order")
    
    @property
    def remaining_amount(self) -> float:
        """Computed remaining amount to be paid"""
        return float(self.total_amount) - float(self.amount_paid)

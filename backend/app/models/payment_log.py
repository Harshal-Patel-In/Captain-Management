"""Payment Log Model - Immutable audit trail for payments"""
import enum
from uuid import uuid4
from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey, CheckConstraint, Enum
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class PaymentMethod(str, enum.Enum):
    """Payment method types"""
    CASH = "cash"
    UPI = "upi"
    BANK = "bank"
    OTHER = "other"


class PaymentLog(Base):
    """
    Immutable payment record for audit compliance.
    Once created, payment logs cannot be modified or deleted.
    """
    __tablename__ = "payment_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_orders.id"), nullable=False, index=True)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    remarks = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)  # Admin user ID who recorded the payment
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("amount_paid > 0", name="positive_payment_amount"),
    )
    
    # Relationships
    order = relationship("EcommerceOrder", back_populates="payment_logs")

"""E-commerce Order Item Model"""
from uuid import uuid4
from sqlalchemy import Column, Integer, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class EcommerceOrderItem(Base):
    """
    Individual line item in an order.
    Tracks ordered quantity, delivered quantity, and unit price.
    """
    __tablename__ = "ecommerce_order_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_orders.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_products.id"), nullable=False, index=True)
    
    # Quantities
    quantity = Column(Integer, nullable=False)  # Ordered quantity
    delivered_quantity = Column(Integer, nullable=False, default=0)  # Delivered so far
    # Note: remaining = quantity - delivered_quantity (computed)
    
    # Pricing
    unit_price = Column(Numeric(12, 2), nullable=False)  # Price at time of order
    # Note: line_total = quantity * unit_price (computed)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("quantity > 0", name="positive_quantity"),
        CheckConstraint("delivered_quantity >= 0", name="non_negative_delivered"),
        CheckConstraint("delivered_quantity <= quantity", name="valid_delivery_quantity"),
        CheckConstraint("unit_price > 0", name="positive_price"),
    )
    
    # Relationships
    order = relationship("EcommerceOrder", back_populates="items")
    product = relationship("EcommerceProduct", back_populates="order_items")
    delivery_logs = relationship("DeliveryLog", back_populates="order_item", cascade="all, delete-orphan")
    stock_logs = relationship("StockLog", backref="reference_order_item")
    
    @property
    def remaining_quantity(self) -> int:
        """Computed remaining quantity to be delivered"""
        return self.quantity - self.delivered_quantity
    
    @property
    def line_total(self) -> float:
        """Computed line total"""
        return self.quantity * float(self.unit_price)
    
    @property
    def is_fully_delivered(self) -> bool:
        """Check if item is fully delivered"""
        return self.delivered_quantity >= self.quantity

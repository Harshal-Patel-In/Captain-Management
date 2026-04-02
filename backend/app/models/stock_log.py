import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import event
from app.database import Base
from app.utils.precision import normalize_positive_quantity, normalize_quantity


class StockAction(str, enum.Enum):
    """Stock action types"""
    IN = "IN"
    OUT = "OUT"


class StockLog(Base):
    """Immutable source-of-truth for stock movements"""
    __tablename__ = "stock_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    action = Column(Enum(StockAction), nullable=False)
    quantity = Column(Float, CheckConstraint("quantity > 0"), nullable=False)
    previous_quantity = Column(Float, nullable=False)
    new_quantity = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    remarks = Column(String, nullable=True)
    
    # E-commerce order references (for delivery tracking)
    reference_order_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_orders.id"), nullable=True, index=True)
    reference_order_item_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_order_items.id"), nullable=True)
    
    # Relationships
    product = relationship("Product", back_populates="stock_logs")


@event.listens_for(StockLog, "before_insert")
@event.listens_for(StockLog, "before_update")
def normalize_stock_log_quantities(_, __, target: StockLog) -> None:
    target.quantity = normalize_positive_quantity(target.quantity)
    target.previous_quantity = normalize_quantity(target.previous_quantity)
    target.new_quantity = normalize_quantity(target.new_quantity)


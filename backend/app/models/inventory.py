from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy import event
from app.database import Base
from app.utils.precision import normalize_quantity


class Inventory(Base):
    """Current stock state (never modified directly)"""
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    quantity = Column(Float, CheckConstraint("quantity >= 0"), nullable=False, default=0.0, index=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="inventory")


@event.listens_for(Inventory, "before_insert")
@event.listens_for(Inventory, "before_update")
def normalize_inventory_quantity(_, __, target: Inventory) -> None:
    target.quantity = normalize_quantity(target.quantity)

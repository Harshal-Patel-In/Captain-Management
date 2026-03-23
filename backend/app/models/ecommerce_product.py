"""E-commerce Product Model - Published products for sale"""
from uuid import uuid4
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class EcommerceProduct(Base):
    """
    Published products available for purchase on e-commerce app.
    Auto-synced with inventory via database trigger.
    """
    __tablename__ = "ecommerce_products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Auto-filled from products table
    sku = Column(String, nullable=False, unique=True, index=True)  # From products.qr_code_value
    name = Column(String, nullable=False, index=True)  # From products.name
    category = Column(String, nullable=False, index=True)  # From products.category
    unit_of_measure = Column(String, nullable=False)  # unit_type + unit_label combined
    
    # Auto-filled from inventory table (synced via trigger)
    stock_quantity = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=False, default=10)
    
    # Manual input by owner
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    pack_size = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    dimensions = Column(String, nullable=True)
    images = Column(JSONB, nullable=True)  # Array of image URLs
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Internal reference for auto-mapping
    source_product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    
    # Relationships
    source_product = relationship("Product", backref="ecommerce_products")
    order_items = relationship("EcommerceOrderItem", back_populates="product")

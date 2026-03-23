from sqlalchemy import Column, Integer, String, DateTime, event, Enum
import enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class UnitType(str, enum.Enum):
    piece = "piece"
    volume = "volume"
    mass = "mass"


class UnitLabel(str, enum.Enum):
    pcs = "pcs"
    L = "L"
    ml = "ml"
    Kg = "Kg"


class Product(Base):
    """Product master registry"""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True, index=True)
    qr_code_value = Column(String, unique=True, nullable=False, index=True)
    unit_type = Column(Enum(UnitType), default=UnitType.piece, nullable=False)
    unit_label = Column(Enum(UnitLabel), default=UnitLabel.pcs, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    inventory = relationship("Inventory", back_populates="product", uselist=False)
    stock_logs = relationship("StockLog", back_populates="product")


# Event listener to prevent QR code modification
@event.listens_for(Product, 'before_update')
def prevent_qr_code_modification(mapper, connection, target):
    """Enforce QR code immutability"""
    state = target._sa_instance_state
    if state.committed_state.get('qr_code_value') != target.qr_code_value:
        raise ValueError("qr_code_value is immutable and cannot be modified after creation")

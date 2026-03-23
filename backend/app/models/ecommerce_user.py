"""E-commerce User Model"""
from uuid import uuid4
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class EcommerceUser(Base):
    """
    Customer account for e-commerce app.
    Contains profile, address, and verification info.
    """
    __tablename__ = "ecommerce_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=False, index=True)
    phone_number = Column(String, unique=True, nullable=True)
    
    # Address fields
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    # Account status
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_onboarding_completed = Column(Boolean, nullable=False, default=False)
    
    # Auth
    password_hash = Column(String, nullable=True)
    verification_token = Column(String, nullable=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    orders = relationship("EcommerceOrder", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    conversation = relationship("ChatConversation", back_populates="user", uselist=False)

"""Schemas for User Management endpoints"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserListItem(BaseModel):
    """User summary for list view"""
    id: UUID
    full_name: Optional[str] = None
    email: str
    phone_number: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_onboarding_completed: bool
    orders_count: int = 0
    total_spent: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserDetail(BaseModel):
    """Full user details for detail/edit view"""
    id: UUID
    full_name: Optional[str] = None
    email: str
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_onboarding_completed: bool
    orders_count: int = 0
    total_spent: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Fields admin can update on a user"""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class UserSetPassword(BaseModel):
    """Admin sets/resets a user's password"""
    new_password: str


class UserBlockAction(BaseModel):
    """Block or unblock a user"""
    blocked: bool
    reason: Optional[str] = None


class UserSendEmail(BaseModel):
    """Send a custom email to a user"""
    subject: str
    message: str


class UserStats(BaseModel):
    """Aggregated user statistics"""
    total_users: int
    active_users: int
    verified_users: int
    blocked_users: int
    new_users_this_month: int

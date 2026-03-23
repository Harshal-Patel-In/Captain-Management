"""Pydantic schemas for notifications"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


# ============= Response Schemas =============

class NotificationResponse(BaseModel):
    """Response schema for notification"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    type: str
    title: str
    message: Optional[str] = None
    order_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Response schema for notification list with unread count"""
    notifications: list[NotificationResponse]
    unread_count: int
    total_count: int


# ============= Request Schemas =============

class NotificationMarkRead(BaseModel):
    """Schema for marking notifications as read"""
    notification_ids: list[UUID]

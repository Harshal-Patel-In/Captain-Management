"""Schemas for Chat endpoints"""
from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel


class ChatMessageCreate(BaseModel):
    """Send a new message to a user"""
    content: str
    message_type: str = "text"
    metadata_json: Optional[str] = None
    reply_to_id: Optional[UUID] = None


class ReplyPreview(BaseModel):
    """Minimal preview of a replied-to message"""
    id: UUID
    content: str
    is_admin: bool


class ChatMessageResponse(BaseModel):
    """Single chat message"""
    id: UUID
    conversation_id: UUID
    is_admin: bool
    message_type: str
    content: str
    metadata_json: Optional[str] = None
    reply_to_id: Optional[UUID] = None
    reply_to: Optional[ReplyPreview] = None
    reactions: Dict[str, int] = {}
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReactionRequest(BaseModel):
    """Add or remove a reaction"""
    emoji: str


class ConversationListItem(BaseModel):
    """Conversation summary for list view"""
    id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_email: str
    user_phone: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0
    is_pinned: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AvailableUser(BaseModel):
    """User available for starting a new chat"""
    id: UUID
    full_name: Optional[str] = None
    email: str
    phone_number: Optional[str] = None
    city: Optional[str] = None
    has_conversation: bool = False

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    """Full conversation with messages"""
    id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_email: str
    messages: List[ChatMessageResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class WebSocketMessage(BaseModel):
    """Message format for WebSocket communication"""
    type: str  # "message", "typing", "read", "reaction"
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    content: Optional[str] = None
    message_type: Optional[str] = "text"
    metadata_json: Optional[str] = None
    reply_to_id: Optional[str] = None

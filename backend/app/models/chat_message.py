"""Chat Message Model - Real-time messaging between admin and customers"""
import enum
from uuid import uuid4
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class MessageType(str, enum.Enum):
    """Types of chat messages"""
    TEXT = "text"
    PRODUCT_UPDATE = "product_update"
    DISCOUNT_UPDATE = "discount_update"
    SYSTEM = "system"


class ChatConversation(Base):
    """
    One conversation per customer.
    Admin-side management of customer conversations.
    """
    __tablename__ = "chat_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("ecommerce_users.id"), nullable=False, unique=True, index=True)

    # Conversation metadata
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_preview = Column(String, nullable=True)
    unread_count = Column(Integer, nullable=False, default=0)
    is_pinned = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("EcommerceUser", back_populates="conversation")
    messages = relationship("ChatMessage", back_populates="conversation", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    """
    Individual chat message within a conversation.
    Supports text, product updates, and discount announcements.
    """
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("chat_conversations.id"), nullable=False, index=True)

    # Sender info
    is_admin = Column(Boolean, nullable=False, default=True)  # True = admin sent, False = customer sent

    # Message content
    message_type = Column(String, nullable=False, default=MessageType.TEXT.value)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON string for product/discount details

    # Reply-to (self-referential FK for quoted replies)
    reply_to_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id"), nullable=True)

    # Reactions stored as JSON: {"👍": 1, "❤️": 1, "😂": 1}
    reactions_json = Column(Text, nullable=True)

    # Status
    is_read = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")
    reply_to = relationship(
        "ChatMessage",
        remote_side="ChatMessage.id",
        foreign_keys="ChatMessage.reply_to_id",
        uselist=False,
    )

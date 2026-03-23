"""Chat Service - Manage conversations and messages"""
import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.chat_message import ChatConversation, ChatMessage, MessageType
from app.models.ecommerce_user import EcommerceUser
from app.services.email_service import send_email, _wrap


class ChatService:
    """Admin-facing chat management operations"""

    @staticmethod
    def _normalize_reactions(raw_reactions: object) -> dict[str, int]:
        """Convert legacy and current reaction payloads to a flat emoji->count mapping."""
        if not isinstance(raw_reactions, dict):
            return {}

        normalized: dict[str, int] = {}
        for emoji, value in raw_reactions.items():
            if isinstance(value, int):
                if value > 0:
                    normalized[emoji] = value
                continue

            if isinstance(value, dict):
                count = value.get("count", 0)
                if isinstance(count, int) and count > 0:
                    normalized[emoji] = count

        return normalized

    @staticmethod
    def get_available_users(db: Session, search: Optional[str] = None) -> list[dict]:
        """Get all active+verified users, indicating which already have a conversation."""
        query = db.query(EcommerceUser).filter(
            EcommerceUser.is_active == True,
            EcommerceUser.is_verified == True,
        )
        if search:
            like = f"%{search}%"
            query = query.filter(
                (EcommerceUser.full_name.ilike(like))
                | (EcommerceUser.email.ilike(like))
                | (EcommerceUser.phone_number.ilike(like))
            )

        users = query.order_by(EcommerceUser.full_name).all()

        # Get user_ids that already have conversations
        conv_user_ids = set(
            row[0] for row in db.query(ChatConversation.user_id).all()
        )

        return [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "phone_number": u.phone_number,
                "city": u.city,
                "has_conversation": u.id in conv_user_ids,
            }
            for u in users
        ]

    @staticmethod
    def get_conversations(
        db: Session,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """Get all conversations with user info, ordered by last message."""
        query = db.query(ChatConversation).options(
            joinedload(ChatConversation.user)
        )

        if search:
            like = f"%{search}%"
            query = query.join(EcommerceUser).filter(
                (EcommerceUser.full_name.ilike(like))
                | (EcommerceUser.email.ilike(like))
                | (EcommerceUser.phone_number.ilike(like))
            )

        conversations = query.order_by(
            ChatConversation.is_pinned.desc(),
            ChatConversation.last_message_at.desc(),
        ).offset(offset).limit(limit).all()

        results = []
        for conv in conversations:
            user = conv.user
            results.append({
                "id": conv.id,
                "user_id": conv.user_id,
                "user_name": user.full_name if user else None,
                "user_email": user.email if user else "",
                "user_phone": user.phone_number if user else None,
                "last_message_at": conv.last_message_at,
                "last_message_preview": conv.last_message_preview,
                "unread_count": conv.unread_count,
                "is_pinned": conv.is_pinned,
                "created_at": conv.created_at,
            })
        return results

    @staticmethod
    def get_or_create_conversation(db: Session, user_id: UUID) -> ChatConversation:
        """Get existing conversation for user, or create one."""
        conv = db.query(ChatConversation).filter(
            ChatConversation.user_id == user_id
        ).first()

        if not conv:
            conv = ChatConversation(user_id=user_id)
            db.add(conv)
            db.commit()
            db.refresh(conv)

        return conv

    @staticmethod
    def _message_to_dict(msg: ChatMessage, db: Session) -> dict:
        """Convert a ChatMessage to a response dict with reply preview + reactions."""
        reply_to = None
        if msg.reply_to_id and msg.reply_to:
            ref = msg.reply_to
            reply_to = {
                "id": str(ref.id),
                "content": ref.content[:120],
                "is_admin": ref.is_admin,
            }

        reactions: dict = {}
        if msg.reactions_json:
            try:
                reactions = ChatService._normalize_reactions(json.loads(msg.reactions_json))
            except Exception:
                pass

        return {
            "id": str(msg.id),
            "conversation_id": str(msg.conversation_id),
            "is_admin": msg.is_admin,
            "message_type": msg.message_type,
            "content": msg.content,
            "metadata_json": msg.metadata_json,
            "reply_to_id": str(msg.reply_to_id) if msg.reply_to_id else None,
            "reply_to": reply_to,
            "reactions": reactions,
            "is_read": msg.is_read,
            "created_at": msg.created_at.isoformat() if hasattr(msg.created_at, 'isoformat') else str(msg.created_at),
        }

    @staticmethod
    def get_messages(
        db: Session,
        conversation_id: UUID,
        limit: int = 100,
        before: Optional[datetime] = None,
    ) -> list[dict]:
        """Get messages for a conversation with reply previews and reactions."""
        query = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).options(joinedload(ChatMessage.reply_to))

        if before:
            query = query.filter(ChatMessage.created_at < before)

        msgs = query.order_by(ChatMessage.created_at.asc()).limit(limit).all()
        return [ChatService._message_to_dict(m, db) for m in msgs]

    @staticmethod
    def send_message(
        db: Session,
        conversation_id: UUID,
        content: str,
        message_type: str = MessageType.TEXT.value,
        is_admin: bool = True,
        metadata_json: Optional[str] = None,
        reply_to_id: Optional[UUID] = None,
    ) -> dict:
        """Send a message in a conversation."""
        msg = ChatMessage(
            conversation_id=conversation_id,
            is_admin=is_admin,
            message_type=message_type,
            content=content,
            metadata_json=metadata_json,
            reply_to_id=reply_to_id,
        )
        db.add(msg)

        # Update conversation metadata
        conv = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        if conv:
            conv.last_message_at = datetime.now(timezone.utc)
            conv.last_message_preview = content[:100] if content else None
            if not is_admin:
                conv.unread_count = (conv.unread_count or 0) + 1

        db.commit()
        db.refresh(msg)
        # Eagerly load reply_to relationship
        if msg.reply_to_id:
            db.refresh(msg, ["reply_to"])
        return ChatService._message_to_dict(msg, db)

    @staticmethod
    def send_message_to_user(
        db: Session,
        user_id: UUID,
        content: str,
        message_type: str = MessageType.TEXT.value,
        metadata_json: Optional[str] = None,
        send_email_copy: bool = False,
        reply_to_id: Optional[UUID] = None,
    ) -> dict:
        """Send a message to a user (auto-creates conversation if needed)."""
        conv = ChatService.get_or_create_conversation(db, user_id)
        msg_dict = ChatService.send_message(
            db, conv.id, content, message_type, is_admin=True,
            metadata_json=metadata_json, reply_to_id=reply_to_id,
        )

        # Optionally send email copy
        if send_email_copy:
            user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
            if user and user.email:
                ChatService._send_chat_email(user, content, message_type, metadata_json)

        return msg_dict

    @staticmethod
    def add_reaction(db: Session, message_id: UUID, emoji: str) -> dict:
        """Add or increment a reaction on a message."""
        msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        if not msg:
            return {}

        reactions: dict = {}
        if msg.reactions_json:
            try:
                reactions = ChatService._normalize_reactions(json.loads(msg.reactions_json))
            except Exception:
                pass

        reactions[emoji] = reactions.get(emoji, 0) + 1
        msg.reactions_json = json.dumps(reactions)
        db.commit()
        db.refresh(msg)
        return ChatService._message_to_dict(msg, db)

    @staticmethod
    def remove_reaction(db: Session, message_id: UUID, emoji: str) -> dict:
        """Remove or decrement a reaction on a message."""
        msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        if not msg:
            return {}

        reactions: dict = {}
        if msg.reactions_json:
            try:
                reactions = ChatService._normalize_reactions(json.loads(msg.reactions_json))
            except Exception:
                pass

        if emoji in reactions:
            reactions[emoji] -= 1
            if reactions[emoji] <= 0:
                del reactions[emoji]

        msg.reactions_json = json.dumps(reactions) if reactions else None
        db.commit()
        db.refresh(msg)
        return ChatService._message_to_dict(msg, db)

    @staticmethod
    def mark_as_read(db: Session, conversation_id: UUID) -> int:
        """Mark customer messages as read when admin opens a conversation."""
        updated_count = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.is_admin == False,
            ChatMessage.is_read == False,
        ).update({"is_read": True}, synchronize_session=False)

        conv = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        if conv:
            conv.unread_count = 0

        db.commit()
        return int(updated_count or 0)

    @staticmethod
    def mark_admin_messages_read(db: Session, conversation_id: UUID) -> int:
        """Mark admin messages as read when customer reads the conversation."""
        updated_count = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.is_admin == True,
            ChatMessage.is_read == False,
        ).update({"is_read": True}, synchronize_session=False)

        db.commit()
        return int(updated_count or 0)

    @staticmethod
    def toggle_pin(db: Session, conversation_id: UUID) -> bool:
        """Toggle pin status on a conversation. Returns new pinned state."""
        conv = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        if not conv:
            return False
        conv.is_pinned = not conv.is_pinned
        db.commit()
        return conv.is_pinned

    @staticmethod
    def _send_chat_email(user: EcommerceUser, content: str, message_type: str, metadata_json: Optional[str]):
        """Send email mirror of a chat message."""
        name = user.full_name or "Customer"

        if message_type == MessageType.PRODUCT_UPDATE.value:
            subject = "Product Update from Captain Insecticide"
            body_content = f"""
            <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">Product Update</h2>
            <p style="color:#0b1d1580;margin:0 0 16px;font-size:14px;">Hello {name},</p>
            <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:12px 0;border-left:4px solid #059669;">
                <div style="color:#0b1d15cc;font-size:14px;line-height:1.8;">{content.replace(chr(10), '<br/>')}</div>
            </div>"""
        elif message_type == MessageType.DISCOUNT_UPDATE.value:
            subject = "Special Offer from Captain Insecticide"
            body_content = f"""
            <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">🎉 Special Offer!</h2>
            <p style="color:#0b1d1580;margin:0 0 16px;font-size:14px;">Hello {name},</p>
            <div style="background:#fffbeb;border-radius:12px;padding:16px;margin:12px 0;border-left:4px solid #d97706;">
                <div style="color:#0b1d15cc;font-size:14px;line-height:1.8;font-weight:600;">{content.replace(chr(10), '<br/>')}</div>
            </div>"""
        else:
            subject = "Message from Captain Insecticide"
            body_content = f"""
            <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">New Message</h2>
            <p style="color:#0b1d1580;margin:0 0 16px;font-size:14px;">Hello {name},</p>
            <div style="color:#0b1d15cc;font-size:14px;line-height:1.8;">{content.replace(chr(10), '<br/>')}</div>"""

        html = _wrap(body_content + """
        <p style="color:#0b1d1580;font-size:13px;margin-top:24px;">
            — Captain Insecticide Team
        </p>""")
        send_email(user.email, subject, html)

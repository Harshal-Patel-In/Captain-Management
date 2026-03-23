"""Management API - Chat Routes (REST + WebSocket)"""
import json
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.services.chat_service import ChatService
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageResponse,
    ConversationListItem, ConversationDetail,
    AvailableUser, ReactionRequest,
)

router = APIRouter(prefix="/management/chat", tags=["Management - Chat"])


# ─── WebSocket Connection Manager ───

class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast to all connected admin clients"""
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)


manager = ConnectionManager()


# ─── WebSocket Endpoint ───

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket for real-time admin chat.
    Receives: {"type": "message", "user_id": "...", "content": "...", "message_type": "text", "reply_to_id": null}
    Receives: {"type": "read", "conversation_id": "...", "reader": "admin"|"user"}
    Receives: {"type": "reaction", "message_id": "...", "emoji": "👍", "action": "add"|"remove"}
    Sends:    {"type": "message", ...message_data}
    Sends:    {"type": "conversations_updated"}
    Sends:    {"type": "reaction_updated", ...message_data}
    Sends:    {"type": "read_updated", "conversation_id": "...", "reader": "admin"|"user"}
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            db = SessionLocal()
            try:
                if msg_type == "message":
                    user_id = UUID(data["user_id"])
                    content = data.get("content", "")
                    message_type = data.get("message_type", "text")
                    metadata_json = data.get("metadata_json")
                    send_email_copy = data.get("send_email_copy", False)
                    reply_to_id = UUID(data["reply_to_id"]) if data.get("reply_to_id") else None

                    msg_dict = ChatService.send_message_to_user(
                        db, user_id, content, message_type,
                        metadata_json=metadata_json,
                        send_email_copy=send_email_copy,
                        reply_to_id=reply_to_id,
                    )

                    # Broadcast to all admin connections with type field
                    msg_dict["type"] = "message"
                    msg_dict["user_id"] = str(user_id)
                    await manager.broadcast(msg_dict)

                elif msg_type == "read":
                    conversation_id = UUID(data["conversation_id"])
                    reader = data.get("reader", "admin")
                    if reader == "user":
                        updated_count = ChatService.mark_admin_messages_read(db, conversation_id)
                    else:
                        updated_count = ChatService.mark_as_read(db, conversation_id)

                    await manager.broadcast({
                        "type": "read_updated",
                        "conversation_id": str(conversation_id),
                        "reader": reader,
                        "updated_count": updated_count,
                    })
                    await manager.broadcast({
                        "type": "conversations_updated",
                    })

                elif msg_type == "reaction":
                    message_id = UUID(data["message_id"])
                    emoji = data["emoji"]
                    action = data.get("action", "add")

                    if action == "remove":
                        msg_dict = ChatService.remove_reaction(db, message_id, emoji)
                    else:
                        msg_dict = ChatService.add_reaction(db, message_id, emoji)

                    if msg_dict:
                        await manager.broadcast({
                            "type": "reaction_updated",
                            "message_id": str(message_id),
                            "reactions": msg_dict.get("reactions", {}),
                        })

            finally:
                db.close()

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ─── REST Endpoints ───

@router.get("/available-users", response_model=list[AvailableUser])
def get_available_users(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all active+verified users available for chat"""
    return ChatService.get_available_users(db, search)


@router.get("/conversations", response_model=list[ConversationListItem])
def get_conversations(
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get all conversations"""
    return ChatService.get_conversations(db, search, limit, offset)


@router.post("/conversations/{user_id}", response_model=ConversationListItem)
def start_conversation(user_id: UUID, db: Session = Depends(get_db)):
    """Start or get a conversation with a user"""
    from app.models.ecommerce_user import EcommerceUser
    user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conv = ChatService.get_or_create_conversation(db, user_id)
    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "user_name": user.full_name,
        "user_email": user.email,
        "user_phone": user.phone_number,
        "last_message_at": conv.last_message_at,
        "last_message_preview": conv.last_message_preview,
        "unread_count": conv.unread_count,
        "is_pinned": conv.is_pinned,
        "created_at": conv.created_at,
    }


@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessageResponse])
def get_messages(
    conversation_id: UUID,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    """Get messages for a conversation"""
    return ChatService.get_messages(db, conversation_id, limit)


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    conversation_id: UUID,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
):
    """Send a message via REST (fallback if WebSocket isn't connected)"""
    msg_dict = ChatService.send_message(
        db, conversation_id, data.content, data.message_type,
        is_admin=True, metadata_json=data.metadata_json,
        reply_to_id=data.reply_to_id,
    )
    # Broadcast to all connected admin WebSocket clients
    broadcast_data = {**msg_dict, "type": "message"}
    await manager.broadcast(broadcast_data)
    return msg_dict


@router.post("/send-to-user/{user_id}", response_model=ChatMessageResponse)
async def send_to_user(
    user_id: UUID,
    data: ChatMessageCreate,
    send_email_copy: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Send a message to a user by user_id (creates conversation if needed)"""
    msg_dict = ChatService.send_message_to_user(
        db, user_id, data.content, data.message_type,
        metadata_json=data.metadata_json,
        send_email_copy=send_email_copy,
        reply_to_id=data.reply_to_id,
    )
    # Broadcast to all connected admin WebSocket clients
    broadcast_data = {**msg_dict, "type": "message", "user_id": str(user_id)}
    await manager.broadcast(broadcast_data)
    return msg_dict


@router.post("/messages/{message_id}/react", response_model=ChatMessageResponse)
async def add_reaction(
    message_id: UUID,
    data: ReactionRequest,
    db: Session = Depends(get_db),
):
    """Add a reaction to a message"""
    result = ChatService.add_reaction(db, message_id, data.emoji)
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")

    await manager.broadcast({
        "type": "reaction_updated",
        "message_id": str(message_id),
        "conversation_id": result.get("conversation_id"),
        "reactions": result.get("reactions", {}),
    })
    return result


@router.delete("/messages/{message_id}/react", response_model=ChatMessageResponse)
async def remove_reaction(
    message_id: UUID,
    data: ReactionRequest,
    db: Session = Depends(get_db),
):
    """Remove a reaction from a message"""
    result = ChatService.remove_reaction(db, message_id, data.emoji)
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")

    await manager.broadcast({
        "type": "reaction_updated",
        "message_id": str(message_id),
        "conversation_id": result.get("conversation_id"),
        "reactions": result.get("reactions", {}),
    })
    return result


@router.post("/conversations/{conversation_id}/read")
async def mark_read(
    conversation_id: UUID,
    reader: str = Query("admin", pattern="^(admin|user)$"),
    db: Session = Depends(get_db),
):
    """Mark all messages in a conversation as read"""
    if reader == "user":
        updated_count = ChatService.mark_admin_messages_read(db, conversation_id)
    else:
        updated_count = ChatService.mark_as_read(db, conversation_id)

    await manager.broadcast({
        "type": "read_updated",
        "conversation_id": str(conversation_id),
        "reader": reader,
        "updated_count": updated_count,
    })
    await manager.broadcast({"type": "conversations_updated"})

    return {"success": True, "updated_count": updated_count}


@router.post("/conversations/{conversation_id}/pin")
def toggle_pin(conversation_id: UUID, db: Session = Depends(get_db)):
    """Toggle pin status on a conversation"""
    is_pinned = ChatService.toggle_pin(db, conversation_id)
    return {"success": True, "is_pinned": is_pinned}

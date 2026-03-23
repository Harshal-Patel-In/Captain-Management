"""add chat conversations and messages tables

Revision ID: f1a2b3c4d5e6
Revises: a1b2c3d4e5f6
Create Date: 2026-03-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Chat conversations table
    op.create_table(
        'chat_conversations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('ecommerce_users.id'), nullable=False, unique=True),
        sa.Column('last_message_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_message_preview', sa.String, nullable=True),
        sa.Column('unread_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('is_pinned', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_chat_conversations_user_id', 'chat_conversations', ['user_id'])

    # Chat messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('chat_conversations.id'), nullable=False),
        sa.Column('is_admin', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('message_type', sa.String, nullable=False, server_default="'text'"),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('metadata_json', sa.Text, nullable=True),
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_chat_messages_conversation_id', 'chat_messages', ['conversation_id'])


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')

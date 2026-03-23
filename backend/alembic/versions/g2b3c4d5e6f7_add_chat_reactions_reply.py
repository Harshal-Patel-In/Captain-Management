"""add reactions and reply_to to chat_messages

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-03-08 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'g2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_messages', sa.Column('reply_to_id', UUID(as_uuid=True), sa.ForeignKey('chat_messages.id'), nullable=True))
    op.add_column('chat_messages', sa.Column('reactions_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'reactions_json')
    op.drop_column('chat_messages', 'reply_to_id')

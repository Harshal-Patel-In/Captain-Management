"""create_users_profile

Revision ID: 8afca97e9cb5
Revises: c8ded19d65ad
Create Date: 2026-01-17 11:06:06.207820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8afca97e9cb5'
down_revision: Union[str, None] = 'c8ded19d65ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

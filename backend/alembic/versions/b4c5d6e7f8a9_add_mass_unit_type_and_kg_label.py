"""add_mass_unit_type_and_kg_label

Revision ID: b4c5d6e7f8a9
Revises: a1b2c3d4e5f6
Create Date: 2026-03-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    unit_type_values = [row[0] for row in bind.execute(sa.text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'unittype'::regtype"))]
    if 'mass' not in unit_type_values:
        bind.execute(sa.text("ALTER TYPE unittype ADD VALUE 'mass'"))

    unit_label_values = [row[0] for row in bind.execute(sa.text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'unitlabel'::regtype"))]
    if 'Kg' not in unit_label_values:
        bind.execute(sa.text("ALTER TYPE unitlabel ADD VALUE 'Kg'"))


def downgrade() -> None:
    raise NotImplementedError("PostgreSQL enum values cannot be removed safely in a simple downgrade.")
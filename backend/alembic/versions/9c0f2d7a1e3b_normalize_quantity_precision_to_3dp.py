"""normalize quantity precision to 3 decimals

Revision ID: 9c0f2d7a1e3b
Revises: g2b3c4d5e6f7
Create Date: 2026-04-02 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9c0f2d7a1e3b"
down_revision: Union[str, None] = "g2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Normalize inventory values: max 3 decimals and snap tiny residues to 0.
    op.execute(
        """
        UPDATE inventory
        SET quantity = CASE
            WHEN ABS(quantity) < 0.0005 THEN 0
            ELSE ROUND(quantity::numeric, 3)::double precision
        END
        """
    )

    # Normalize stock log before/after snapshots.
    op.execute(
        """
        UPDATE stock_logs
        SET previous_quantity = CASE
                WHEN ABS(previous_quantity) < 0.0005 THEN 0
                ELSE ROUND(previous_quantity::numeric, 3)::double precision
            END,
            new_quantity = CASE
                WHEN ABS(new_quantity) < 0.0005 THEN 0
                ELSE ROUND(new_quantity::numeric, 3)::double precision
            END,
            quantity = GREATEST(ROUND(quantity::numeric, 3)::double precision, 0.001)
        """
    )

    # Normalize recipe quantities and keep them valid (> 0).
    op.execute(
        """
        UPDATE recipes
        SET quantity = GREATEST(ROUND(quantity::numeric, 3)::double precision, 0.001)
        """
    )


def downgrade() -> None:
    # Irreversible data normalization.
    pass

"""add stock log archives table

Revision ID: d3e4f5a6b7c8
Revises: 9c0f2d7a1e3b
Create Date: 2026-04-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "9c0f2d7a1e3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_log_archives",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("log_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("archived_file_path", sa.String(), nullable=True),
        sa.Column("exported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("period_start", "period_end", name="uq_stock_log_archives_period"),
    )
    op.create_index(op.f("ix_stock_log_archives_id"), "stock_log_archives", ["id"], unique=False)
    op.create_index(op.f("ix_stock_log_archives_period_end"), "stock_log_archives", ["period_end"], unique=False)
    op.create_index(op.f("ix_stock_log_archives_period_start"), "stock_log_archives", ["period_start"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stock_log_archives_period_start"), table_name="stock_log_archives")
    op.drop_index(op.f("ix_stock_log_archives_period_end"), table_name="stock_log_archives")
    op.drop_index(op.f("ix_stock_log_archives_id"), table_name="stock_log_archives")
    op.drop_table("stock_log_archives")

"""add_ecommerce_audit_tables

Revision ID: a1b2c3d4e5f6
Revises: eb6703b72aa1
Create Date: 2026-02-06 09:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'eb6703b72aa1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create OrderAction enum type
    order_action_enum = postgresql.ENUM(
        'created', 'approved', 'rejected', 'partially_delivered', 
        'fully_delivered', 'payment_updated', 'cancelled',
        name='orderaction',
        create_type=False
    )
    order_action_enum.create(op.get_bind(), checkfirst=True)
    
    # Create PaymentMethod enum type
    payment_method_enum = postgresql.ENUM(
        'cash', 'upi', 'bank', 'other',
        name='paymentmethod',
        create_type=False
    )
    payment_method_enum.create(op.get_bind(), checkfirst=True)
    
    # 1. Create payment_logs table
    op.create_table(
        'payment_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ecommerce_orders.id'), nullable=False),
        sa.Column('amount_paid', sa.Numeric(12, 2), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False),
        sa.Column('remarks', sa.Text, nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('amount_paid > 0', name='positive_payment_amount')
    )
    op.create_index('ix_payment_logs_order_id', 'payment_logs', ['order_id'])
    op.create_index('ix_payment_logs_created_at', 'payment_logs', ['created_at'])
    
    # 2. Create order_logs table
    op.create_table(
        'order_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ecommerce_orders.id'), nullable=False),
        sa.Column('action', postgresql.ENUM(
            'created', 'approved', 'rejected', 'partially_delivered', 
            'fully_delivered', 'payment_updated', 'cancelled',
            name='orderaction', create_type=False
        ), nullable=False),
        sa.Column('performed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('previous_state', postgresql.JSONB, nullable=True),
        sa.Column('new_state', postgresql.JSONB, nullable=True),
        sa.Column('remarks', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_order_logs_order_id', 'order_logs', ['order_id'])
    op.create_index('ix_order_logs_created_at', 'order_logs', ['created_at'])
    
    # 3. Create delivery_logs table
    op.create_table(
        'delivery_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ecommerce_order_items.id'), nullable=False),
        sa.Column('delivered_quantity', sa.Integer, nullable=False),
        sa.Column('delivered_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('remarks', sa.Text, nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('delivered_quantity > 0', name='positive_delivery_quantity')
    )
    op.create_index('ix_delivery_logs_order_item_id', 'delivery_logs', ['order_item_id'])
    op.create_index('ix_delivery_logs_delivered_at', 'delivery_logs', ['delivered_at'])
    
    # 4. Add source_product_id to ecommerce_products (links to products.id for auto-mapping)
    op.add_column(
        'ecommerce_products',
        sa.Column('source_product_id', sa.Integer, sa.ForeignKey('products.id'), nullable=True)
    )
    op.create_index('ix_ecommerce_products_source_product_id', 'ecommerce_products', ['source_product_id'])
    
    # 5. Add reference_order_id and reference_order_item_id to stock_logs (for delivery tracking)
    op.add_column(
        'stock_logs',
        sa.Column('reference_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ecommerce_orders.id'), nullable=True)
    )
    op.add_column(
        'stock_logs',
        sa.Column('reference_order_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ecommerce_order_items.id'), nullable=True)
    )
    op.create_index('ix_stock_logs_reference_order_id', 'stock_logs', ['reference_order_id'])
    
    # 6. Add constraints for ecommerce_order_items (delivered <= ordered)
    op.create_check_constraint(
        'valid_delivery_quantity',
        'ecommerce_order_items',
        'delivered_quantity <= quantity'
    )
    
    # 7. Add constraint for ecommerce_orders (amount_paid <= total_amount)
    op.create_check_constraint(
        'valid_payment_amount',
        'ecommerce_orders',
        'amount_paid <= total_amount'
    )
    
    # 8. Create trigger function for stock sync (inventory -> ecommerce_products)
    op.execute("""
        CREATE OR REPLACE FUNCTION sync_ecommerce_stock()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE ecommerce_products 
            SET stock_quantity = NEW.quantity::integer
            WHERE source_product_id = NEW.product_id;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # 9. Create trigger on inventory table
    op.execute("""
        DROP TRIGGER IF EXISTS inventory_stock_sync ON inventory;
        CREATE TRIGGER inventory_stock_sync
        AFTER UPDATE OF quantity ON inventory
        FOR EACH ROW
        EXECUTE FUNCTION sync_ecommerce_stock();
    """)


def downgrade() -> None:
    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS inventory_stock_sync ON inventory;")
    op.execute("DROP FUNCTION IF EXISTS sync_ecommerce_stock();")
    
    # Drop constraints
    op.drop_constraint('valid_payment_amount', 'ecommerce_orders', type_='check')
    op.drop_constraint('valid_delivery_quantity', 'ecommerce_order_items', type_='check')
    
    # Drop columns from stock_logs
    op.drop_index('ix_stock_logs_reference_order_id', table_name='stock_logs')
    op.drop_column('stock_logs', 'reference_order_item_id')
    op.drop_column('stock_logs', 'reference_order_id')
    
    # Drop column from ecommerce_products
    op.drop_index('ix_ecommerce_products_source_product_id', table_name='ecommerce_products')
    op.drop_column('ecommerce_products', 'source_product_id')
    
    # Drop delivery_logs table
    op.drop_index('ix_delivery_logs_delivered_at', table_name='delivery_logs')
    op.drop_index('ix_delivery_logs_order_item_id', table_name='delivery_logs')
    op.drop_table('delivery_logs')
    
    # Drop order_logs table
    op.drop_index('ix_order_logs_created_at', table_name='order_logs')
    op.drop_index('ix_order_logs_order_id', table_name='order_logs')
    op.drop_table('order_logs')
    
    # Drop payment_logs table
    op.drop_index('ix_payment_logs_created_at', table_name='payment_logs')
    op.drop_index('ix_payment_logs_order_id', table_name='payment_logs')
    op.drop_table('payment_logs')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS paymentmethod;")
    op.execute("DROP TYPE IF EXISTS orderaction;")

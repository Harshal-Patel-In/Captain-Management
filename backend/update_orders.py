"""Update remaining order statuses"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Get orders that still need updating
    result = db.execute(text("SELECT id, total_amount FROM ecommerce_orders WHERE status = 'PENDING' LIMIT 3"))
    orders = list(result)
    
    for i, (order_id, total_amount) in enumerate(orders):
        if i == 0:
            # Make it DELIVERED with full payment
            db.execute(text("""
                UPDATE ecommerce_orders 
                SET status = 'DELIVERED', payment_status = 'PAID', amount_paid = total_amount
                WHERE id = :id
            """), {'id': str(order_id)})
            print(f'Updated {str(order_id)[:8]} to DELIVERED')
        elif i == 1:
            # Keep as PENDING
            print(f'Keeping {str(order_id)[:8]} as PENDING')
        else:
            # Make APPROVED
            db.execute(text("""
                UPDATE ecommerce_orders 
                SET status = 'APPROVED', payment_status = 'UNPAID', amount_paid = 0
                WHERE id = :id
            """), {'id': str(order_id)})
            print(f'Updated {str(order_id)[:8]} to APPROVED')
    
    db.commit()
    
    # Show final status counts
    result = db.execute(text("SELECT status, COUNT(*) FROM ecommerce_orders GROUP BY status"))
    print('\nFinal order counts:')
    for status, count in result:
        print(f'  {status}: {count}')
        
except Exception as e:
    db.rollback()
    print(f'Error: {e}')
finally:
    db.close()

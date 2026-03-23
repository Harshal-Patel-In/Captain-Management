"""Migrate legacy status values to new enum values"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("Migrating SHIPPED -> PARTIALLY_DELIVERED...")
    db.execute(text("UPDATE ecommerce_orders SET status = 'PARTIALLY_DELIVERED' WHERE status = 'SHIPPED'"))
    
    print("Migrating DELIVERED -> FULLY_DELIVERED...")
    db.execute(text("UPDATE ecommerce_orders SET status = 'FULLY_DELIVERED' WHERE status = 'DELIVERED'"))
    
    db.commit()
    print("Data migration successful!")
except Exception as e:
    db.rollback()
    print(f"Migration failed: {e}")
finally:
    db.close()

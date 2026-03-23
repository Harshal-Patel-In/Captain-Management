"""Check enum values in database"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
r = db.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'orderstatus'::regtype"))
print("Order Status values:", [row[0] for row in r])

r = db.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'paymentstatus'::regtype"))
print("Payment Status values:", [row[0] for row in r])
db.close()

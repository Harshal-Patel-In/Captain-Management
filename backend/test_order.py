from sqlalchemy import text
from app.database import get_db
from app.services.order_service import OrderService
from app.services.bill_service import generate_bill_pdf

db = next(get_db())
row = db.execute(text("SELECT id FROM ecommerce_orders LIMIT 1")).fetchone()
if row:
    oid = row[0]
    print(f"Testing order: {oid}")
    try:
        order = OrderService.get_order_detail(db, oid)
        print(f"Order loaded OK: {order.id}")
        pdf = generate_bill_pdf(order, db)
        with open("test_bill.pdf", "wb") as f:
            f.write(pdf)
        print(f"PDF generated: {len(pdf)} bytes -> test_bill.pdf")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
else:
    print("No orders found")
db.close()

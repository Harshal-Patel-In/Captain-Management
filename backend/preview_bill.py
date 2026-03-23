from sqlalchemy import text
from app.database import get_db
from app.services.order_service import OrderService
from app.services.bill_service import _build_html

db = next(get_db())
row = db.execute(text("SELECT id FROM ecommerce_orders LIMIT 1")).fetchone()
if row:
    order = OrderService.get_order_detail(db, row[0])
    html = _build_html(order, db)
    with open("test_bill.html", "w", encoding="utf-8") as f:
        f.write(html)
    print(f"HTML saved: {len(html)} chars -> test_bill.html")
db.close()

"""Seed script to populate e-commerce tables with test data"""
from datetime import datetime, timedelta
from decimal import Decimal
import random
from uuid import uuid4

from app.database import SessionLocal
from app.models import (
    Product, Inventory, EcommerceUser, EcommerceProduct, 
    EcommerceOrder, EcommerceOrderItem, OrderStatus, PaymentStatus
)

def seed_data():
    db = SessionLocal()
    
    try:
        # 1. Create test e-commerce users
        print("Creating e-commerce users...")
        users = []
        user_data = [
            ("Iron Traders", "iron@shop.com", "9876543210", "Ahmedabad", "Gujarat"),
            ("Green Farms", "green@farms.com", "9876543211", "Surat", "Gujarat"),
            ("AgriCo Ltd", "agrico@mail.com", "9876543212", "Mumbai", "Maharashtra"),
        ]
        
        for name, email, phone, city, state in user_data:
            existing = db.query(EcommerceUser).filter(EcommerceUser.email == email).first()
            if existing:
                users.append(existing)
                print(f"  User '{name}' already exists")
            else:
                user = EcommerceUser(
                    id=uuid4(),
                    email=email,
                    full_name=name,
                    phone_number=phone,
                    address_line1="123 Main St",
                    city=city,
                    state=state,
                    postal_code="380001",
                    country="India",
                    is_active=True,
                    is_verified=True,
                    is_onboarding_completed=True
                )
                db.add(user)
                users.append(user)
                print(f"  Created user: {name}")
        
        db.flush()
        
        # 2. Publish products to e-commerce (if not already published)
        print("\nPublishing products to e-commerce...")
        products = db.query(Product).join(Inventory).all()
        ecom_products = []
        
        for product in products[:5]:  # Publish first 5 products
            existing = db.query(EcommerceProduct).filter(
                EcommerceProduct.source_product_id == product.id
            ).first()
            
            if existing:
                ecom_products.append(existing)
                print(f"  Product '{product.name}' already published")
            else:
                inventory = db.query(Inventory).filter(Inventory.product_id == product.id).first()
                ecom_product = EcommerceProduct(
                    id=str(uuid4()),
                    sku=product.qr_code_value,
                    name=product.name,
                    description=f"Premium quality {product.name}",
                    category=product.category or "General",
                    price=Decimal(str(random.randint(500, 5000))),
                    stock_quantity=int(inventory.quantity) if inventory else 100,
                    unit_of_measure=product.unit_label or product.unit_type or "unit",
                    source_product_id=product.id,
                    is_active=True
                )
                db.add(ecom_product)
                ecom_products.append(ecom_product)
                print(f"  Published: {product.name} @ ₹{ecom_product.price}")
        
        db.flush()
        
        # 3. Create test orders
        print("\nCreating orders...")
        statuses = [
            (OrderStatus.PENDING, PaymentStatus.UNPAID, 0),
            (OrderStatus.APPROVED, PaymentStatus.PARTIAL, 0.5),
            (OrderStatus.PARTIALLY_DELIVERED, PaymentStatus.PARTIAL, 0.3),
            (OrderStatus.FULLY_DELIVERED, PaymentStatus.PAID, 1.0),
            (OrderStatus.PENDING, PaymentStatus.UNPAID, 0),
        ]
        
        for i, (status, payment_status, paid_ratio) in enumerate(statuses):
            user = users[i % len(users)]
            
            # Pick 2-3 random products
            order_products = random.sample(ecom_products, min(3, len(ecom_products)))
            
            # Calculate totals
            items_data = []
            total = Decimal("0")
            for prod in order_products:
                qty = random.randint(5, 20)
                line_total = prod.price * qty
                total += line_total
                items_data.append({
                    "product": prod,
                    "quantity": qty,
                    "unit_price": prod.price,
                    "delivered_quantity": qty if status == OrderStatus.FULLY_DELIVERED else (qty // 2 if status == OrderStatus.PARTIALLY_DELIVERED else 0)
                })
            
            amount_paid = total * Decimal(str(paid_ratio))
            
            order = EcommerceOrder(
                id=uuid4(),
                user_id=user.id,
                status=status,
                payment_status=payment_status,
                total_amount=total,
                amount_paid=amount_paid,
                shipping_address={
                    "address_line1": user.address_line1 or "123 Main St",
                    "city": user.city or "Ahmedabad",
                    "state": user.state or "Gujarat",
                    "postal_code": user.postal_code or "380001"
                },
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
            )
            db.add(order)
            db.flush()
            
            # Create order items
            for item_data in items_data:
                order_item = EcommerceOrderItem(
                    id=uuid4(),
                    order_id=order.id,
                    product_id=item_data["product"].id,
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    delivered_quantity=item_data["delivered_quantity"]
                )
                db.add(order_item)
            
            print(f"  Created order: {status.value} | Total: ₹{total} | Paid: ₹{amount_paid}")
        
        db.commit()
        print("\n✅ Seed data created successfully!")
        print(f"   - {len(users)} users")
        print(f"   - {len(ecom_products)} published products")
        print(f"   - {len(statuses)} orders")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

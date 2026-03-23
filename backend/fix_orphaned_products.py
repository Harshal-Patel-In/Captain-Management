from datetime import datetime
from uuid import uuid4
from decimal import Decimal

from app.database import SessionLocal
from app.models.product import Product, UnitType, UnitLabel
from app.models import EcommerceProduct, Inventory

def fix_orphaned_products():
    db = SessionLocal()
    try:
        # Get unlinked ecommerce products
        unlinked = db.query(EcommerceProduct).filter(
            EcommerceProduct.source_product_id == None
        ).all()
        
        print(f"Found {len(unlinked)} orphaned e-commerce products.")
        
        for ep in unlinked:
            print(f"Processing '{ep.name}' (SKU: {ep.sku})...")
            
            # Check if product exists by SKU (QR Check)
            product = db.query(Product).filter(Product.qr_code_value == ep.sku).first()
            
            if not product:
                # Create source product
                product = Product(
                    name=ep.name,
                    category=ep.category,
                    qr_code_value=ep.sku,
                    unit_type=UnitType.piece,
                    unit_label=UnitLabel.pcs
                )
                db.add(product)
                db.flush() # Get ID
                print(f"  Created new Product: {product.name} (ID: {product.id})")
                
                # Create default inventory
                inventory = Inventory(
                    product_id=product.id,
                    quantity=ep.stock_quantity or 100
                )
                db.add(inventory)
                print(f"  Created Inventory: {inventory.quantity} units")
            
            # Link records
            ep.source_product_id = product.id
            print(f"  Linked EcommerceProduct to Source ID: {product.id}\n")
            
        db.commit()
        print("✅ Successfully fixed all orphaned products.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_orphaned_products()

from app.database import SessionLocal
from app.models import EcommerceProduct, Product
from sqlalchemy import or_

def fix_links():
    db = SessionLocal()
    try:
        # Get unlinked ecommerce products
        unlinked = db.query(EcommerceProduct).filter(
            EcommerceProduct.source_product_id == None
        ).all()
        
        print(f"Found {len(unlinked)} unlinked e-commerce products.")
        
        count = 0
        for epub in unlinked:
            # Try to match by SKU (QR code) or Name
            source = db.query(Product).filter(
                or_(
                    Product.qr_code_value == epub.sku,
                    Product.name == epub.name
                )
            ).first()
            
            if source:
                epub.source_product_id = source.id
                print(f"Linked '{epub.name}' -> Source ID: {source.id}")
                count += 1
            else:
                print(f"WARN: Could not find source for '{epub.name}' (SKU: {epub.sku})")
        
        db.commit()
        print(f"Successfully linked {count} products.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_links()

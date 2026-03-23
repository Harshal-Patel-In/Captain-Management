from app.database import SessionLocal
from app.models import EcommerceProduct, Product

def debug_links():
    db = SessionLocal()
    with open("debug_output.txt", "w") as f:
        try:
            # Get unlinked
            unlinked = db.query(EcommerceProduct).filter(
                EcommerceProduct.source_product_id == None
            ).all()
            
            f.write(f"--- Unlinked Ecommerce Products ({len(unlinked)}) ---\n")
            for p in unlinked:
                f.write(f"ID: {p.id} | Name: '{p.name}' | SKU: '{p.sku}'\n")
                
            f.write(f"\n--- Available Source Products (First 10) ---\n")
            sources = db.query(Product).limit(10).all()
            for p in sources:
                f.write(f"ID: {p.id} | Name: '{p.name}' | QR: '{p.qr_code_value}'\n")
                
        finally:
            db.close()

if __name__ == "__main__":
    debug_links()

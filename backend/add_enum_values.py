"""Add missing enum values to database"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Disable transaction management to allow ALTER TYPE
    connection = db.connection()
    connection.connection.set_isolation_level(0)  # ISOLATION_LEVEL_AUTOCOMMIT
    
    values_to_add = ['REJECTED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED']
    
    for value in values_to_add:
        try:
            print(f"Adding {value} to orderstatus enum...")
            db.execute(text(f"ALTER TYPE orderstatus ADD VALUE '{value}'"))
            print(f"  Added {value}")
        except Exception as e:
            if "already exists" in str(e) or "DuplicateObject" in str(e):
                print(f"  {value} already exists")
            else:
                print(f"  Error adding {value}: {e}")
                
    print("Enum updates completed.")
    
except Exception as e:
    print(f"Script failed: {e}")
finally:
    db.close()

import sys
import os

# Ensure backend matches path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal, engine
from sqlalchemy import text, inspect
from app.models.recipe import Recipe
from app.models.product import Product

def check_db():
    print("Checking database...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables:", tables)

    if "recipes" not in tables:
        print("ERROR: 'recipes' table missing!")
        return

    db = SessionLocal()
    try:
        print("Querying recipes count...")
        count = db.query(Recipe).count()
        print(f"Recipe count: {count}")
        
        # Try a join to verify relationship
        print("Testing relationship query...")
        try:
            items = db.query(Recipe).all()
            for item in items:
                print(f"Item: {item.id}, Product: {item.product.name if item.product else 'None'}, Ingredient: {item.ingredient.name if item.ingredient else 'None'}")
        except Exception as e:
            print(f"Relationship Error: {e}")

    except Exception as e:
        print(f"Query Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()

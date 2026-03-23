from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.product import Product
from app.models.recipe import Recipe
from app.models.inventory import Inventory
from app.schemas.recipe import ProductionRequest, RecipeItemCreate
from app.services.stock_service import StockService
from app.schemas.stock import StockOperationRequest

class ProductionService:
    @staticmethod
    def get_recipe(db: Session, product_id: int):
        return db.query(Recipe).filter(Recipe.product_id == product_id).all()

    @staticmethod
    def update_recipe(db: Session, product_id: int, items: list[RecipeItemCreate]):
        # Clear existing recipe
        db.query(Recipe).filter(Recipe.product_id == product_id).delete()
        
        # Add new items
        new_items = []
        for item in items:
            recipe_item = Recipe(
                product_id=product_id,
                ingredient_id=item.ingredient_id,
                quantity=item.quantity
            )
            db.add(recipe_item)
            new_items.append(recipe_item)
        
        db.flush()
        return new_items

    @staticmethod
    def produce_stock(db: Session, request: ProductionRequest):
        # 1. Determine Recipe
        recipe_items = []
        
        if request.custom_recipe:
            # If custom recipe provided, update the stored recipe (Last Used logic)
            ProductionService.update_recipe(db, request.product_id, request.custom_recipe)
            # Re-fetch to get ORM objects if needed, or just use input
            # Ideally, use the objects we just created or formatted input map
            # Let's verify standard recipe now exists
            recipe_items = db.query(Recipe).filter(Recipe.product_id == request.product_id).all()
        else:
            recipe_items = db.query(Recipe).filter(Recipe.product_id == request.product_id).all()
            if not recipe_items:
                raise HTTPException(status_code=400, detail="No recipe defined for this product. Please define ingredients.")

        # 2. Calculate Requirements & Validate Stock
        consumed_log = []
        
        for item in recipe_items:
            required_qty = item.quantity * request.quantity
            
            # Check stock
            inventory = db.query(Inventory).filter(Inventory.product_id == item.ingredient_id).first()
            current_qty = inventory.quantity if inventory else 0
            
            if current_qty < required_qty:
                sub_product = db.query(Product).get(item.ingredient_id)
                name = sub_product.name if sub_product else f"ID {item.ingredient_id}"
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient stock for ingredient '{name}'. Required: {required_qty}, Available: {current_qty}"
                )
            
            consumed_log.append({
                "ingredient_id": item.ingredient_id,
                "required_qty": required_qty,
                "product": item.ingredient
            })

        # 3. Execute Deduction (Stock Out for Ingredients)
        # Fetch target product for remarks
        target_product = db.query(Product).get(request.product_id)
        product_name = target_product.name if target_product else str(request.product_id)

        try:
            for log in consumed_log:
                # We reuse StockService logic ideally, but here we need atomic commit at the end.
                # Since StockService.stock_out commits, we should ideally refactor StockService to accept a session and not commit?
                # For now, let's manually do the logic to ensure atomicity or use StockService if it supports flush-only.
                # Looking at StockService (not visible here), assume it commits. 
                # To be safe, let's replicate logic or modify StockService.
                # Valid strategy: Do all steps, if any fail, rollback.
                # Better: Use StockService but we manage the transaction? NO, nested transactions are complex.
                # SAFEST: Re-implement specific logic here for atomicity.
                
                # Deduct
                inv = db.query(Inventory).filter(Inventory.product_id == log["ingredient_id"]).first()
                inv.quantity -= log["required_qty"]
                # Log happens in StockLog? We should technically log "Production Consumption"
                # For MVP, we can treat it as Stock Out
                from app.models.stock_log import StockLog, StockAction
                log_entry = StockLog(
                    product_id=log["ingredient_id"],
                    action=StockAction.OUT,
                    quantity=log["required_qty"],
                    previous_quantity=inv.quantity + log["required_qty"],
                    new_quantity=inv.quantity,
                    remarks=f"Consumed for production of Product {product_name}"
                )
                db.add(log_entry)

            # 4. Add Finished Good (Stock In)
            prod_inv = db.query(Inventory).filter(Inventory.product_id == request.product_id).first()
            if not prod_inv:
                 # Should exist if product exists, created by signal/service
                 prod_inv = Inventory(product_id=request.product_id, quantity=0)
                 db.add(prod_inv)
            
            prev_qty = prod_inv.quantity
            prod_inv.quantity += request.quantity
            
            from app.models.stock_log import StockLog, StockAction
            prod_log = StockLog(
                product_id=request.product_id,
                action=StockAction.IN,
                quantity=request.quantity,
                previous_quantity=prev_qty,
                new_quantity=prod_inv.quantity,
                remarks="Produced via manufacturing"
            )
            db.add(prod_log)

            db.commit()
            
            return {
                "product_id": request.product_id,
                "quantity_produced": request.quantity,
                "ingredients_consumed": [
                    {"name": c["product"].name, "quantity": c["required_qty"]} for c in consumed_log
                ]
            }

        except Exception as e:
            db.rollback()
            raise e

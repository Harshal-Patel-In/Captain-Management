from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.stock_log import StockLog, StockAction
from typing import Optional


class StockService:
    """Service for transaction-safe stock operations"""
    
    @staticmethod
    def stock_in(
        db: Session,
        qr_code_value: str,
        quantity: int,
        remarks: Optional[str] = None
    ) -> dict:
        """
        Add stock (atomic transaction)
        
        Workflow:
        1. Resolve product via QR
        2. Lock and read current inventory
        3. Validate quantity > 0
        4. Insert stock log
        5. Update inventory
        6. Commit (or rollback on error)
        """
        try:
            # 1. Resolve product
            product = db.query(Product).filter(
                Product.qr_code_value == qr_code_value
            ).first()
            
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product with QR code '{qr_code_value}' not found"
                )
            
            # 2. Lock and read current inventory (SELECT FOR UPDATE)
            inventory = db.query(Inventory).filter(
                Inventory.product_id == product.id
            ).with_for_update().first()
            
            if not inventory:
                raise HTTPException(
                    status_code=500,
                    detail="Inventory record not found for product"
                )
            
            current_qty = inventory.quantity
            
            # 3. Validate quantity
            if quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Quantity must be greater than 0"
                )
            
            # Calculate new quantity
            new_qty = current_qty + quantity
            
            # 4. Insert immutable log
            log = StockLog(
                product_id=product.id,
                action=StockAction.IN,
                quantity=quantity,
                previous_quantity=current_qty,
                new_quantity=new_qty,
                remarks=remarks
            )
            db.add(log)
            
            # 5. Update inventory
            inventory.quantity = new_qty
            
            # 6. Commit transaction
            db.commit()
            db.refresh(inventory)
            
            return {
                "success": True,
                "message": "Stock added successfully",
                "product_id": product.id,
                "product_name": product.name,
                "action": StockAction.IN,
                "previous_quantity": current_qty,
                "new_quantity": new_qty,
                "quantity_changed": quantity
            }
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Stock-in failed: {str(e)}")
    
    @staticmethod
    def stock_out(
        db: Session,
        qr_code_value: str,
        quantity: int,
        remarks: Optional[str] = None
    ) -> dict:
        """
        Remove stock (atomic transaction with validation)
        
        Workflow:
        1. Resolve product via QR
        2. Lock and read current inventory
        3. Validate quantity > 0
        4. Validate sufficient stock available
        5. Insert stock log
        6. Update inventory
        7. Commit (or rollback on error)
        """
        try:
            # 1. Resolve product
            product = db.query(Product).filter(
                Product.qr_code_value == qr_code_value
            ).first()
            
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product with QR code '{qr_code_value}' not found"
                )
            
            # 2. Lock and read current inventory (SELECT FOR UPDATE)
            inventory = db.query(Inventory).filter(
                Inventory.product_id == product.id
            ).with_for_update().first()
            
            if not inventory:
                raise HTTPException(
                    status_code=500,
                    detail="Inventory record not found for product"
                )
            
            current_qty = inventory.quantity
            
            # 3. Validate quantity
            if quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Quantity must be greater than 0"
                )
            
            # Calculate new quantity
            new_qty = current_qty - quantity
            
            # 4. Validate sufficient stock
            if new_qty < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock. Available: {current_qty}, Requested: {quantity}"
                )
            
            # 5. Insert immutable log
            log = StockLog(
                product_id=product.id,
                action=StockAction.OUT,
                quantity=quantity,
                previous_quantity=current_qty,
                new_quantity=new_qty,
                remarks=remarks
            )
            db.add(log)
            
            # 6. Update inventory
            inventory.quantity = new_qty
            
            # 7. Commit transaction
            db.commit()
            db.refresh(inventory)
            
            return {
                "success": True,
                "message": "Stock removed successfully",
                "product_id": product.id,
                "product_name": product.name,
                "action": StockAction.OUT,
                "previous_quantity": current_qty,
                "new_quantity": new_qty,
                "quantity_changed": quantity
            }
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Stock-out failed: {str(e)}")

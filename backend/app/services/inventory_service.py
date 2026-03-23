from sqlalchemy.orm import Session
from sqlalchemy import join
from app.models.product import Product
from app.models.inventory import Inventory
from typing import List, Optional


class InventoryService:
    """Service for inventory queries"""
    
    @staticmethod
    def get_all_inventory(
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[dict], int]:
        """Get all inventory items with product details"""
        query = db.query(
            Inventory.product_id,
            Product.name.label('product_name'),
            Product.category,
            Product.qr_code_value,
            Inventory.quantity,
            Inventory.last_updated
        ).join(Product, Inventory.product_id == Product.id)
        
        # Apply filters
        if search:
            query = query.filter(
                (Product.name.ilike(f"%{search}%")) |
                (Product.qr_code_value.ilike(f"%{search}%"))
            )
        
        if category:
            query = query.filter(Product.category == category)
        
        total = query.count()
        results = query.offset(skip).limit(limit).all()
        
        # Convert to dict
        items = [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "category": row.category,
                "qr_code_value": row.qr_code_value,
                "quantity": row.quantity,
                "last_updated": row.last_updated
            }
            for row in results
        ]
        
        return items, total
    
    @staticmethod
    def get_product_inventory(db: Session, product_id: int) -> Optional[dict]:
        """Get inventory for a specific product"""
        result = db.query(
            Inventory.product_id,
            Product.name.label('product_name'),
            Product.category,
            Product.qr_code_value,
            Inventory.quantity,
            Inventory.last_updated
        ).join(Product, Inventory.product_id == Product.id
        ).filter(Product.id == product_id).first()
        
        if not result:
            return None
        
        return {
            "product_id": result.product_id,
            "product_name": result.product_name,
            "category": result.category,
            "qr_code_value": result.qr_code_value,
            "quantity": result.quantity,
            "last_updated": result.last_updated
        }

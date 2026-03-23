from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.stock_log import StockLog
from app.schemas.product import ProductCreate
from typing import List, Optional


class ProductService:
    """Service for product management"""
    
    @staticmethod
    def create_product(db: Session, product_data: ProductCreate) -> Product:
        """Create a new product with automatic inventory initialization"""
        try:
            # Create product
            product = Product(
                name=product_data.name,
                category=product_data.category,
                qr_code_value=product_data.qr_code_value,
                unit_type=product_data.unit_type,
                unit_label=product_data.unit_label
            )
            db.add(product)
            db.flush()  # Get product ID without committing
            
            # Initialize inventory with zero quantity
            inventory = Inventory(
                product_id=product.id,
                quantity=0
            )
            db.add(inventory)
            db.commit()
            db.refresh(product)
            
            return product
            
        except IntegrityError as e:
            db.rollback()
            if "qr_code_value" in str(e.orig):
                raise HTTPException(
                    status_code=400,
                    detail=f"QR code '{product_data.qr_code_value}' already exists"
                )
            raise HTTPException(status_code=400, detail="Database integrity error")
    
    @staticmethod
    def get_products(
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[Product], int]:
        """Get products with optional filtering"""
        query = db.query(Product)
        
        if search:
            query = query.filter(
                (Product.name.ilike(f"%{search}%")) |
                (Product.qr_code_value.ilike(f"%{search}%"))
            )
        
        if category:
            query = query.filter(Product.category == category)
        
        total = query.count()
        products = query.offset(skip).limit(limit).all()
        
        return products, total
    
    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
        """Get product by ID"""
        return db.query(Product).filter(Product.id == product_id).first()
    
    @staticmethod
    def get_product_by_qr(db: Session, qr_code_value: str) -> Optional[Product]:
        """Get product by QR code value"""
        return db.query(Product).filter(Product.qr_code_value == qr_code_value).first()
    
    @staticmethod
    def delete_product(db: Session, product_id: int) -> bool:
        """Delete product (only if no stock logs exist)"""
        product = db.query(Product).filter(Product.id == product_id).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check if stock logs exist
        log_count = db.query(StockLog).filter(StockLog.product_id == product_id).count()
        if log_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete product with existing stock logs ({log_count} logs found)"
            )
        
        # Delete associated inventory first
        db.query(Inventory).filter(Inventory.product_id == product_id).delete()
        db.delete(product)
        db.commit()
        
        return True

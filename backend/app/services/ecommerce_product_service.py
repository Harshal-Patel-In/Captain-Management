"""E-commerce Product Service - Product publishing from inventory to e-commerce"""
from typing import Optional, List
from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import Product, Inventory, EcommerceProduct
from app.schemas.ecommerce_product import (
    EcommerceProductPublish, EcommerceProductUpdate,
    PublishableProductResponse
)


class EcommerceProductService:
    """Service for product publishing and management"""
    
    @staticmethod
    def get_publishable_products(db: Session) -> List[PublishableProductResponse]:
        """
        Get products that can be published to e-commerce.
        Returns products not yet published (no matching source_product_id).
        """
        # Get all products with their inventory
        products = db.query(Product, Inventory).join(
            Inventory, Inventory.product_id == Product.id
        ).all()
        
        # Get already published source_product_ids
        published_ids = db.query(EcommerceProduct.source_product_id).filter(
            EcommerceProduct.source_product_id.isnot(None)
        ).all()
        published_ids = {pid[0] for pid in published_ids}
        
        result = []
        for product, inventory in products:
            if product.id not in published_ids:
                result.append(PublishableProductResponse(
                    id=product.id,
                    name=product.name,
                    category=product.category,
                    qr_code_value=product.qr_code_value,
                    unit_type=product.unit_type.value if product.unit_type else "piece",
                    unit_label=product.unit_label.value if product.unit_label else "pcs",
                    stock_quantity=inventory.quantity
                ))
        
        return result
    
    @staticmethod
    def publish_product(
        db: Session,
        publish_data: EcommerceProductPublish
    ) -> EcommerceProduct:
        """
        Publish a product to e-commerce.
        Auto-fills fields from products and inventory tables.
        """
        try:
            # Get source product
            product = db.query(Product).filter(
                Product.id == publish_data.source_product_id
            ).first()
            
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product with ID {publish_data.source_product_id} not found"
                )
            
            # Check if already published
            existing = db.query(EcommerceProduct).filter(
                EcommerceProduct.source_product_id == product.id
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product.name}' is already published"
                )
            
            # Get inventory
            inventory = db.query(Inventory).filter(
                Inventory.product_id == product.id
            ).first()
            
            if not inventory:
                raise HTTPException(
                    status_code=400,
                    detail=f"No inventory record found for product"
                )
            
            # Create e-commerce product with auto-filled + manual fields
            unit_of_measure = f"{product.unit_type.value if product.unit_type else 'piece'} ({product.unit_label.value if product.unit_label else 'pcs'})"
            
            ecommerce_product = EcommerceProduct(
                # Auto-filled from products table
                sku=product.qr_code_value,
                name=product.name,
                category=product.category or "Uncategorized",
                unit_of_measure=unit_of_measure,
                
                # Auto-filled from inventory
                stock_quantity=int(inventory.quantity),
                low_stock_threshold=10,  # Default
                
                # Manual input
                description=publish_data.description,
                price=publish_data.price,
                pack_size=publish_data.pack_size,
                weight=publish_data.weight,
                dimensions=publish_data.dimensions,
                images=publish_data.images,
                is_active=publish_data.is_active,
                
                # Internal reference
                source_product_id=product.id
            )
            
            db.add(ecommerce_product)
            db.commit()
            db.refresh(ecommerce_product)
            return ecommerce_product
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Publishing failed: {str(e)}")
    
    @staticmethod
    def update_product(
        db: Session,
        product_id: str,
        update_data: EcommerceProductUpdate
    ) -> EcommerceProduct:
        """Update a published e-commerce product (manual fields only)"""
        try:
            product = db.query(EcommerceProduct).filter(
                EcommerceProduct.id == product_id
            ).first()
            
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            
            # Update only provided fields
            if update_data.description is not None:
                product.description = update_data.description
            if update_data.price is not None:
                product.price = update_data.price
            if update_data.pack_size is not None:
                product.pack_size = update_data.pack_size
            if update_data.weight is not None:
                product.weight = update_data.weight
            if update_data.dimensions is not None:
                product.dimensions = update_data.dimensions
            if update_data.images is not None:
                product.images = update_data.images
            if update_data.is_active is not None:
                product.is_active = update_data.is_active
            
            db.commit()
            db.refresh(product)
            return product
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    
    @staticmethod
    def get_all_products(
        db: Session,
        is_active: Optional[bool] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[EcommerceProduct]:
        """Get all published e-commerce products"""
        query = db.query(EcommerceProduct)
        
        if is_active is not None:
            query = query.filter(EcommerceProduct.is_active == is_active)
        
        if category:
            query = query.filter(EcommerceProduct.category == category)
        
        return query.order_by(EcommerceProduct.name).offset(offset).limit(limit).all()
    
    @staticmethod
    def sync_stock(db: Session, source_product_id: int) -> Optional[int]:
        """
        Manually trigger stock sync for a product.
        (Usually handled by database trigger)
        """
        inventory = db.query(Inventory).filter(
            Inventory.product_id == source_product_id
        ).first()
        
        if not inventory:
            return None
        
        result = db.query(EcommerceProduct).filter(
            EcommerceProduct.source_product_id == source_product_id
        ).update({"stock_quantity": int(inventory.quantity)})
        
        db.commit()
        return result

"""Management API - Products Routes"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ecommerce_product_service import EcommerceProductService
from app.schemas.ecommerce_product import (
    EcommerceProductPublish, EcommerceProductUpdate,
    PublishableProductResponse, EcommerceProductResponse, EcommerceProductListResponse
)

router = APIRouter(prefix="/management/products", tags=["Management - Products"])


@router.get("/publishable", response_model=list[PublishableProductResponse])
def get_publishable_products(db: Session = Depends(get_db)):
    """Get products available for publishing to e-commerce"""
    return EcommerceProductService.get_publishable_products(db)


@router.post("/publish", response_model=EcommerceProductResponse)
def publish_product(
    request: EcommerceProductPublish,
    db: Session = Depends(get_db)
):
    """Publish a product to e-commerce with auto-mapping"""
    product = EcommerceProductService.publish_product(db, request)
    return EcommerceProductResponse.model_validate(product)


@router.get("/ecommerce", response_model=list[EcommerceProductListResponse])
def get_ecommerce_products(
    is_active: Optional[bool] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all published e-commerce products"""
    products = EcommerceProductService.get_all_products(
        db, is_active, category, limit, offset
    )
    return [EcommerceProductListResponse.model_validate(p) for p in products]


@router.get("/ecommerce/{product_id}", response_model=EcommerceProductResponse)
def get_ecommerce_product(
    product_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific e-commerce product"""
    from app.models import EcommerceProduct
    from fastapi import HTTPException
    
    product = db.query(EcommerceProduct).filter(
        EcommerceProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return EcommerceProductResponse.model_validate(product)


@router.patch("/ecommerce/{product_id}", response_model=EcommerceProductResponse)
def update_ecommerce_product(
    product_id: UUID,
    request: EcommerceProductUpdate,
    db: Session = Depends(get_db)
):
    """Update a published e-commerce product"""
    product = EcommerceProductService.update_product(db, str(product_id), request)
    return EcommerceProductResponse.model_validate(product)


@router.post("/ecommerce/{product_id}/sync-stock")
def sync_product_stock(
    product_id: UUID,
    db: Session = Depends(get_db)
):
    """Manually trigger stock sync for a product"""
    from app.models import EcommerceProduct
    from fastapi import HTTPException
    
    product = db.query(EcommerceProduct).filter(
        EcommerceProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product.source_product_id:
        raise HTTPException(
            status_code=400, 
            detail="Product not linked to inventory"
        )
    
    updated = EcommerceProductService.sync_stock(db, product.source_product_id)
    
    # Refresh to get new stock
    db.refresh(product)
    
    return {
        "success": True,
        "message": "Stock synced",
        "stock_quantity": product.stock_quantity
    }

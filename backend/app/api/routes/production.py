from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.recipe import ProductionRequest, RecipeResponse, RecipeItemResponse
from app.services.production_service import ProductionService

router = APIRouter()

@router.get("/recipes/{product_id}", response_model=RecipeResponse)
def get_recipe(product_id: int, db: Session = Depends(get_db)):
    items = ProductionService.get_recipe(db, product_id)
    return {"product_id": product_id, "items": items}

@router.post("/production/execute")
def execute_production(request: ProductionRequest, db: Session = Depends(get_db)):
    return ProductionService.produce_stock(db, request)

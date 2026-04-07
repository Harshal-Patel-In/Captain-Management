from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from .product import ProductResponse
from app.utils.precision import normalize_positive_quantity

class RecipeItemBase(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0, description="Quantity needed per 1 unit of product")

    @field_validator("quantity")
    @classmethod
    def normalize_recipe_item_quantity(cls, value: float) -> float:
        return normalize_positive_quantity(value)

class RecipeItemCreate(RecipeItemBase):
    pass

class RecipeItemResponse(RecipeItemBase):
    id: int
    product_id: int
    ingredient: ProductResponse
    
    class Config:
        from_attributes = True

class RecipeResponse(BaseModel):
    product_id: int
    items: List[RecipeItemResponse]

class ProductionRequest(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    # Optional: Allow defining/overriding recipe on the fly
    custom_recipe: Optional[List[RecipeItemCreate]] = None
    # Backward-compatible default: keep existing behavior unless client opts out.
    persist_custom_recipe: bool = True

    @field_validator("quantity")
    @classmethod
    def normalize_production_quantity(cls, value: float) -> float:
        return normalize_positive_quantity(value)

class ProductionLog(BaseModel):
    product_id: int
    quantity_produced: float
    ingredients_consumed: List[dict]
    timestamp: datetime

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from .product import ProductResponse

class RecipeItemBase(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0, description="Quantity needed per 1 unit of product")

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

class ProductionLog(BaseModel):
    product_id: int
    quantity_produced: float
    ingredients_consumed: List[dict]
    timestamp: datetime

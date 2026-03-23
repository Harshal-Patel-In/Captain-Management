from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.stock_log import StockLog, StockAction


class DashboardService:
    """Optimized service for dashboard statistics"""
    
    @staticmethod
    def get_dashboard_stats(db: Session, low_stock_threshold: int = 5) -> dict:
        """
        Get all dashboard statistics in optimized queries.
        Replaces 3 separate API calls with 1 endpoint.
        """
        # Query 1: Product count
        total_products = db.query(func.count(Product.id)).scalar() or 0
        
        # Query 2: Total inventory (sum of all quantities)
        total_inventory = db.query(func.sum(Inventory.quantity)).scalar() or 0
        
        # Query 3: Low stock count
        low_stock_count = db.query(func.count(Inventory.product_id)).filter(
            Inventory.quantity < low_stock_threshold
        ).scalar() or 0
        
        # Query 4: Active products count (products with recent stock logs)
        # Count distinct products that have stock logs
        active_products_count = db.query(
            func.count(func.distinct(StockLog.product_id))
        ).scalar() or 0
        
        return {
            "total_products": total_products,
            "total_inventory": total_inventory,
            "low_stock_count": low_stock_count,
            "active_products": active_products_count
        }

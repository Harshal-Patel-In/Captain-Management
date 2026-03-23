from sqlalchemy.orm import Session
from sqlalchemy import func,  case
from datetime import date, datetime
from app.models.stock_log import StockLog, StockAction
from app.models.product import Product
from app.models.inventory import Inventory
from typing import Optional


class AnalyticsService:
    """Service for analytics and KPI calculations"""
    
    @staticmethod
    def get_daily_stock_in(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> list[dict]:
        """KPI 1: Daily stock-in quantity (time-series)"""
        query = db.query(
            func.date(StockLog.timestamp).label('date'),
            func.sum(StockLog.quantity).label('quantity')
        ).filter(StockLog.action == StockAction.IN)
        
        if start_date:
            query = query.filter(func.date(StockLog.timestamp) >= start_date)
        if end_date:
            query = query.filter(func.date(StockLog.timestamp) <= end_date)
        
        results = query.group_by(func.date(StockLog.timestamp)
        ).order_by(func.date(StockLog.timestamp)).all()
        
        return [{"date": row.date, "quantity": row.quantity} for row in results]
    
    @staticmethod
    def get_daily_stock_out(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> list[dict]:
        """KPI 2: Daily stock-out quantity (time-series)"""
        query = db.query(
            func.date(StockLog.timestamp).label('date'),
            func.sum(StockLog.quantity).label('quantity')
        ).filter(StockLog.action == StockAction.OUT)
        
        if start_date:
            query = query.filter(func.date(StockLog.timestamp) >= start_date)
        if end_date:
            query = query.filter(func.date(StockLog.timestamp) <= end_date)
        
        results = query.group_by(func.date(StockLog.timestamp)
        ).order_by(func.date(StockLog.timestamp)).all()
        
        return [{"date": row.date, "quantity": row.quantity} for row in results]
    
    @staticmethod
    def get_net_stock_change(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> list[dict]:
        """KPI 3: Net stock change over time (daily)"""
        query = db.query(
            func.date(StockLog.timestamp).label('date'),
            func.sum(
                case(
                    (StockLog.action == StockAction.IN, StockLog.quantity),
                    else_=-StockLog.quantity
                )
            ).label('quantity')
        )
        
        if start_date:
            query = query.filter(func.date(StockLog.timestamp) >= start_date)
        if end_date:
            query = query.filter(func.date(StockLog.timestamp) <= end_date)
        
        results = query.group_by(func.date(StockLog.timestamp)
        ).order_by(func.date(StockLog.timestamp)).all()
        
        return [{"date": row.date, "quantity": row.quantity} for row in results]
    
    @staticmethod
    def get_most_active_products(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 10
    ) -> list[dict]:
        """KPI 4: Most active products (by log count)"""
        query = db.query(
            StockLog.product_id,
            Product.name.label('product_name'),
            func.count(StockLog.id).label('log_count'),
            func.sum(
                case((StockLog.action == StockAction.IN, StockLog.quantity), else_=0)
            ).label('total_in'),
            func.sum(
                case((StockLog.action == StockAction.OUT, StockLog.quantity), else_=0)
            ).label('total_out')
        ).join(Product, StockLog.product_id == Product.id)
        
        if start_date:
            query = query.filter(func.date(StockLog.timestamp) >= start_date)
        if end_date:
            query = query.filter(func.date(StockLog.timestamp) <= end_date)
        
        results = query.group_by(
            StockLog.product_id, Product.name
        ).order_by(func.count(StockLog.id).desc()).limit(limit).all()
        
        return [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "log_count": row.log_count,
                "total_in": row.total_in or 0,
                "total_out": row.total_out or 0
            }
            for row in results
        ]
    
    @staticmethod
    def get_low_stock_products(
        db: Session,
        threshold: int = 5
    ) -> list[dict]:
        """KPI 5: Low stock products (configurable threshold, default=5)"""
        results = db.query(
            Inventory.product_id,
            Product.name.label('product_name'),
            Product.category,
            Inventory.quantity
        ).join(Product, Inventory.product_id == Product.id
        ).filter(Inventory.quantity < threshold
        ).order_by(Inventory.quantity.asc()).all()
        
        return [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "category": row.category,
                "quantity": row.quantity
            }
            for row in results
        ]
    
    @staticmethod
    def get_stock_trends(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        low_stock_threshold: int = 5
    ) -> dict:
        """Get all 5 KPIs in one call"""
        return {
            "daily_stock_in": AnalyticsService.get_daily_stock_in(db, start_date, end_date),
            "daily_stock_out": AnalyticsService.get_daily_stock_out(db, start_date, end_date),
            "net_stock_change": AnalyticsService.get_net_stock_change(db, start_date, end_date),
            "most_active_products": AnalyticsService.get_most_active_products(db, start_date, end_date),
            "low_stock_products": AnalyticsService.get_low_stock_products(db, low_stock_threshold)
        }

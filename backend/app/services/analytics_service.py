from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date, datetime
from calendar import monthrange
from app.models.stock_log import StockLog, StockAction
from app.models.product import Product
from app.models.inventory import Inventory
from typing import Optional
from app.utils.precision import normalize_quantity


class AnalyticsService:
    """Service for analytics and KPI calculations"""

    @staticmethod
    def get_month_bounds(target_date: Optional[date] = None) -> tuple[date, date]:
        reference_date = target_date or datetime.utcnow().date()
        start = reference_date.replace(day=1)
        end = reference_date.replace(day=monthrange(reference_date.year, reference_date.month)[1])
        return start, end
    
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
        
        return [{"date": row.date, "quantity": normalize_quantity(row.quantity or 0)} for row in results]
    
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
        
        return [{"date": row.date, "quantity": normalize_quantity(row.quantity or 0)} for row in results]
    
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
        
        return [{"date": row.date, "quantity": normalize_quantity(row.quantity or 0)} for row in results]
    
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
                "total_in": normalize_quantity(row.total_in or 0),
                "total_out": normalize_quantity(row.total_out or 0)
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
                "quantity": normalize_quantity(row.quantity or 0)
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

    @staticmethod
    def get_product_daily_summary(
        db: Session,
        product_id: int,
        target_date: Optional[date] = None,
    ) -> dict:
        """Get stock in/out/net for a product on a specific day (defaults to today)."""
        day = target_date or datetime.utcnow().date()

        stock_in = db.query(func.coalesce(func.sum(StockLog.quantity), 0)).filter(
            StockLog.product_id == product_id,
            StockLog.action == StockAction.IN,
            func.date(StockLog.timestamp) == day,
        ).scalar() or 0

        stock_out = db.query(func.coalesce(func.sum(StockLog.quantity), 0)).filter(
            StockLog.product_id == product_id,
            StockLog.action == StockAction.OUT,
            func.date(StockLog.timestamp) == day,
        ).scalar() or 0

        stock_in_value = normalize_quantity(stock_in)
        stock_out_value = normalize_quantity(stock_out)
        net_change = normalize_quantity(stock_in_value - stock_out_value)

        return {
            "product_id": product_id,
            "date": day,
            "stock_in": stock_in_value,
            "stock_out": stock_out_value,
            "net_change": net_change,
        }

    @staticmethod
    def get_product_monthly_summary(
        db: Session,
        product_id: int,
        target_date: Optional[date] = None,
    ) -> dict:
        """Get stock in/out/net for a product for the current calendar month."""
        month_start, month_end = AnalyticsService.get_month_bounds(target_date)

        stock_in = db.query(func.coalesce(func.sum(StockLog.quantity), 0)).filter(
            StockLog.product_id == product_id,
            StockLog.action == StockAction.IN,
            func.date(StockLog.timestamp) >= month_start,
            func.date(StockLog.timestamp) <= month_end,
        ).scalar() or 0

        stock_out = db.query(func.coalesce(func.sum(StockLog.quantity), 0)).filter(
            StockLog.product_id == product_id,
            StockLog.action == StockAction.OUT,
            func.date(StockLog.timestamp) >= month_start,
            func.date(StockLog.timestamp) <= month_end,
        ).scalar() or 0

        stock_in_value = normalize_quantity(stock_in)
        stock_out_value = normalize_quantity(stock_out)
        net_change = normalize_quantity(stock_in_value - stock_out_value)

        return {
            "product_id": product_id,
            "period_start": month_start,
            "period_end": month_end,
            "stock_in": stock_in_value,
            "stock_out": stock_out_value,
            "net_change": net_change,
        }

    @staticmethod
    def get_low_stock_monthly_summary(
        db: Session,
        low_stock_threshold: int = 5,
        target_date: Optional[date] = None,
    ) -> dict:
        """Get current quantity and current-month movement for all low-stock products."""
        month_start, month_end = AnalyticsService.get_month_bounds(target_date)

        low_stock_rows = db.query(
            Inventory.product_id,
            Product.name.label("product_name"),
            Product.category,
            Product.unit_label,
            Inventory.quantity,
        ).join(
            Product,
            Inventory.product_id == Product.id,
        ).filter(
            Inventory.quantity < low_stock_threshold,
        ).order_by(
            Inventory.quantity.asc(),
        ).all()

        product_ids = [row.product_id for row in low_stock_rows]
        monthly_by_product: dict[int, dict[str, float]] = {}

        if product_ids:
            monthly_rows = db.query(
                StockLog.product_id,
                func.sum(
                    case((StockLog.action == StockAction.IN, StockLog.quantity), else_=0)
                ).label("stock_in"),
                func.sum(
                    case((StockLog.action == StockAction.OUT, StockLog.quantity), else_=0)
                ).label("stock_out"),
            ).filter(
                StockLog.product_id.in_(product_ids),
                func.date(StockLog.timestamp) >= month_start,
                func.date(StockLog.timestamp) <= month_end,
            ).group_by(
                StockLog.product_id,
            ).all()

            monthly_by_product = {
                row.product_id: {
                    "stock_in": normalize_quantity(row.stock_in or 0),
                    "stock_out": normalize_quantity(row.stock_out or 0),
                }
                for row in monthly_rows
            }

        items = []
        for row in low_stock_rows:
            movement = monthly_by_product.get(row.product_id, {"stock_in": 0.0, "stock_out": 0.0})
            net_change = normalize_quantity(movement["stock_in"] - movement["stock_out"])
            unit_label = row.unit_label.value if hasattr(row.unit_label, "value") else str(row.unit_label)

            items.append(
                {
                    "product_id": row.product_id,
                    "product_name": row.product_name,
                    "category": row.category,
                    "unit_label": unit_label,
                    "quantity": normalize_quantity(row.quantity or 0),
                    "stock_in": movement["stock_in"],
                    "stock_out": movement["stock_out"],
                    "net_change": net_change,
                }
            )

        return {
            "period_start": month_start,
            "period_end": month_end,
            "items": items,
        }

    @staticmethod
    def get_stock_consistency_report(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        tolerance: float = 1e-9,
    ) -> dict:
        """
        Validate invariant per day:
            net_change == stock_in - stock_out
        """
        daily_in = AnalyticsService.get_daily_stock_in(db, start_date, end_date)
        daily_out = AnalyticsService.get_daily_stock_out(db, start_date, end_date)
        daily_net = AnalyticsService.get_net_stock_change(db, start_date, end_date)

        by_date: dict[date, dict] = {}

        for row in daily_in:
            d = row["date"]
            by_date.setdefault(d, {"stock_in": 0.0, "stock_out": 0.0, "net_change": 0.0})
            by_date[d]["stock_in"] = normalize_quantity(row["quantity"] or 0)

        for row in daily_out:
            d = row["date"]
            by_date.setdefault(d, {"stock_in": 0.0, "stock_out": 0.0, "net_change": 0.0})
            by_date[d]["stock_out"] = normalize_quantity(row["quantity"] or 0)

        for row in daily_net:
            d = row["date"]
            by_date.setdefault(d, {"stock_in": 0.0, "stock_out": 0.0, "net_change": 0.0})
            by_date[d]["net_change"] = normalize_quantity(row["quantity"] or 0)

        rows = []
        inconsistent_days = 0

        for d in sorted(by_date.keys()):
            stock_in_value = by_date[d]["stock_in"]
            stock_out_value = by_date[d]["stock_out"]
            net_change_value = by_date[d]["net_change"]
            expected_net = normalize_quantity(stock_in_value - stock_out_value)
            difference = normalize_quantity(net_change_value - expected_net)
            is_consistent = abs(difference) <= tolerance

            if not is_consistent:
                inconsistent_days += 1

            rows.append(
                {
                    "date": d,
                    "stock_in": stock_in_value,
                    "stock_out": stock_out_value,
                    "net_change": net_change_value,
                    "expected_net_change": expected_net,
                    "difference": difference,
                    "is_consistent": is_consistent,
                }
            )

        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_days_checked": len(rows),
            "inconsistent_days": inconsistent_days,
            "is_consistent": inconsistent_days == 0,
            "rows": rows,
        }

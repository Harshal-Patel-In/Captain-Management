from sqlalchemy.orm import Session
from datetime import date
import pandas as pd
from io import BytesIO, StringIO
from typing import Optional
from app.services.inventory_service import InventoryService
from app.services.analytics_service import AnalyticsService
from app.models.stock_log import StockLog, StockAction
from app.models.product import Product
from sqlalchemy import func
from app.utils.precision import normalize_quantity


class CSVService:
    """Service for CSV export generation"""

    @staticmethod
    def _build_logs_dataframe(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> pd.DataFrame:
        query = db.query(
            StockLog.id,
            StockLog.product_id,
            Product.name.label('product_name'),
            StockLog.action,
            StockLog.quantity,
            StockLog.previous_quantity,
            StockLog.new_quantity,
            StockLog.timestamp,
            StockLog.remarks
        ).join(Product, StockLog.product_id == Product.id)

        if start_date:
            query = query.filter(func.date(StockLog.timestamp) >= start_date)
        if end_date:
            query = query.filter(func.date(StockLog.timestamp) <= end_date)

        results = query.order_by(StockLog.timestamp.desc()).all()

        if not results:
            return pd.DataFrame(
                columns=[
                    "id",
                    "product_id",
                    "product_name",
                    "action",
                    "quantity",
                    "previous_quantity",
                    "new_quantity",
                    "timestamp",
                    "remarks",
                ]
            )

        data = [
            {
                "id": row.id,
                "product_id": row.product_id,
                "product_name": row.product_name,
                "action": row.action.value,
                "quantity": normalize_quantity(row.quantity),
                "previous_quantity": normalize_quantity(row.previous_quantity),
                "new_quantity": normalize_quantity(row.new_quantity),
                "timestamp": row.timestamp,
                "remarks": row.remarks or ""
            }
            for row in results
        ]

        return pd.DataFrame(data)
    
    @staticmethod
    def export_inventory(db: Session) -> str:
        """Export current inventory state as CSV"""
        items, _ = InventoryService.get_all_inventory(db, limit=10000)
        
        if not items:
            return "product_id,product_name,category,qr_code_value,quantity,last_updated\n"
        
        df = pd.DataFrame(items)
        return df.to_csv(index=False)
    
    @staticmethod
    def export_logs(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> str:
        """Export stock logs with optional date filtering"""
        df = CSVService._build_logs_dataframe(db, start_date, end_date)
        return df.to_csv(index=False)

    @staticmethod
    def export_logs_excel(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> bytes:
        """Export stock logs as an Excel workbook (XLSX)."""
        df = CSVService._build_logs_dataframe(db, start_date, end_date)
        buffer = BytesIO()

        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="stock_logs")

        buffer.seek(0)
        return buffer.read()
    
    @staticmethod
    def export_analytics(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        low_stock_threshold: int = 5
    ) -> str:
        """Export analytics data as CSV (multi-sheet format flattened)"""
        trends = AnalyticsService.get_stock_trends(
            db, start_date, end_date, low_stock_threshold
        )
        
        output = StringIO()
        
        # Section 1: Daily Stock In
        output.write("DAILY STOCK IN\n")
        if trends["daily_stock_in"]:
            df_in = pd.DataFrame(trends["daily_stock_in"])
            output.write(df_in.to_csv(index=False))
        else:
            output.write("date,quantity\n")
        output.write("\n")
        
        # Section 2: Daily Stock Out
        output.write("DAILY STOCK OUT\n")
        if trends["daily_stock_out"]:
            df_out = pd.DataFrame(trends["daily_stock_out"])
            output.write(df_out.to_csv(index=False))
        else:
            output.write("date,quantity\n")
        output.write("\n")
        
        # Section 3: Net Stock Change
        output.write("NET STOCK CHANGE\n")
        if trends["net_stock_change"]:
            df_net = pd.DataFrame(trends["net_stock_change"])
            output.write(df_net.to_csv(index=False))
        else:
            output.write("date,quantity\n")
        output.write("\n")
        
        # Section 4: Most Active Products
        output.write("MOST ACTIVE PRODUCTS\n")
        if trends["most_active_products"]:
            df_active = pd.DataFrame(trends["most_active_products"])
            output.write(df_active.to_csv(index=False))
        else:
            output.write("product_id,product_name,log_count,total_in,total_out\n")
        output.write("\n")
        
        # Section 5: Low Stock Products
        output.write(f"LOW STOCK PRODUCTS (threshold={low_stock_threshold})\n")
        if trends["low_stock_products"]:
            df_low = pd.DataFrame(trends["low_stock_products"])
            output.write(df_low.to_csv(index=False))
        else:
            output.write("product_id,product_name,category,quantity\n")
        
        return output.getvalue()

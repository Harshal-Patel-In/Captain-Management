from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.stock_log import StockLog
from app.models.stock_log_archive import StockLogArchive
from app.services.csv_service import CSVService


class LogRetentionService:
    """Retention policy: keep monthly logs for one month, then 7-day delete grace."""

    DELETE_GRACE_DAYS = 7

    @staticmethod
    def _month_bounds(reference_date: date) -> tuple[date, date]:
        month_start = reference_date.replace(day=1)
        month_end = reference_date.replace(day=monthrange(reference_date.year, reference_date.month)[1])
        return month_start, month_end

    @staticmethod
    def get_previous_month_bounds(reference_date: date | None = None) -> tuple[date, date]:
        today = reference_date or datetime.utcnow().date()
        previous_month_reference = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        return LogRetentionService._month_bounds(previous_month_reference)

    @staticmethod
    def get_export_deadline(period_end: date) -> date:
        next_month_reference = (period_end.replace(day=1) + timedelta(days=32)).replace(day=1)
        _, next_month_end = LogRetentionService._month_bounds(next_month_reference)
        return next_month_end

    @staticmethod
    def get_delete_after(export_deadline: date) -> date:
        return export_deadline + timedelta(days=LogRetentionService.DELETE_GRACE_DAYS)

    @staticmethod
    def _archive_dir() -> Path:
        archive_dir = Path(__file__).resolve().parents[2] / "data" / "log_archives"
        archive_dir.mkdir(parents=True, exist_ok=True)
        return archive_dir

    @staticmethod
    def _normalize_sql_date(value: object) -> date | None:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                return None
        return None

    @staticmethod
    def _archive_table_available(db: Session) -> bool:
        try:
            bind = db.get_bind()
            if bind is None:
                return False
            return inspect(bind).has_table("stock_log_archives")
        except SQLAlchemyError:
            return False

    @staticmethod
    def _get_archive_record(db: Session, period_start: date, period_end: date) -> StockLogArchive | None:
        if not LogRetentionService._archive_table_available(db):
            return None

        try:
            return db.query(StockLogArchive).filter(
                StockLogArchive.period_start == period_start,
                StockLogArchive.period_end == period_end,
            ).first()
        except SQLAlchemyError:
            return None

    @staticmethod
    def _count_period_logs(db: Session, period_start: date, period_end: date) -> int:
        return db.query(func.count(StockLog.id)).filter(
            func.date(StockLog.timestamp) >= period_start,
            func.date(StockLog.timestamp) <= period_end,
        ).scalar() or 0

    @staticmethod
    def mark_period_exported(db: Session, period_start: date, period_end: date) -> None:
        if not LogRetentionService._archive_table_available(db):
            return

        now = datetime.utcnow()
        try:
            record = LogRetentionService._get_archive_record(db, period_start, period_end)

            if record:
                record.exported_at = now
            else:
                record = StockLogArchive(
                    period_start=period_start,
                    period_end=period_end,
                    exported_at=now,
                )
                db.add(record)

            db.commit()
        except SQLAlchemyError:
            db.rollback()

    @staticmethod
    def archive_and_delete_period(db: Session, period_start: date, period_end: date) -> int:
        log_count = LogRetentionService._count_period_logs(db, period_start, period_end)
        if log_count == 0:
            return 0

        csv_content = CSVService.export_logs(db, period_start, period_end)
        filename = f"{period_start}_{period_end}_stock_logs.csv"
        file_path = LogRetentionService._archive_dir() / filename
        archive_table_available = LogRetentionService._archive_table_available(db)

        try:
            file_path.write_text(csv_content, encoding="utf-8")

            now = datetime.utcnow()
            if archive_table_available:
                record = LogRetentionService._get_archive_record(db, period_start, period_end)
                if record:
                    record.log_count = log_count
                    record.archived_file_path = str(file_path)
                    record.archived_at = now
                else:
                    db.add(
                        StockLogArchive(
                            period_start=period_start,
                            period_end=period_end,
                            log_count=log_count,
                            archived_file_path=str(file_path),
                            archived_at=now,
                        )
                    )

            deleted_rows = db.query(StockLog).filter(
                func.date(StockLog.timestamp) >= period_start,
                func.date(StockLog.timestamp) <= period_end,
            ).delete(synchronize_session=False)

            db.commit()
            return deleted_rows
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def run_maintenance(db: Session, reference_date: date | None = None) -> None:
        today = reference_date or datetime.utcnow().date()

        try:
            period_rows = db.query(
                func.date(StockLog.timestamp).label("log_date")
            ).distinct().all()
        except SQLAlchemyError:
            return

        month_starts: set[date] = set()
        for row in period_rows:
            log_day = LogRetentionService._normalize_sql_date(row.log_date)
            if log_day is None:
                continue
            month_starts.add(log_day.replace(day=1))

        for period_start in sorted(month_starts):
            _, period_end = LogRetentionService._month_bounds(period_start)
            export_deadline = LogRetentionService.get_export_deadline(period_end)
            delete_after = LogRetentionService.get_delete_after(export_deadline)

            if today > delete_after:
                LogRetentionService.archive_and_delete_period(db, period_start, period_end)

    @staticmethod
    def get_previous_month_status(db: Session, reference_date: date | None = None) -> dict:
        today = reference_date or datetime.utcnow().date()
        period_start, period_end = LogRetentionService.get_previous_month_bounds(today)
        export_deadline = LogRetentionService.get_export_deadline(period_end)
        delete_after = LogRetentionService.get_delete_after(export_deadline)

        has_logs = LogRetentionService._count_period_logs(db, period_start, period_end) > 0
        archive_record = LogRetentionService._get_archive_record(db, period_start, period_end)
        exported_at = archive_record.exported_at if archive_record else None

        days_until_export_deadline = (export_deadline - today).days
        days_until_delete = (delete_after - today).days

        needs_export = has_logs and not bool(exported_at)
        is_last_export_day = needs_export and today == export_deadline
        is_delete_window = needs_export and export_deadline < today <= delete_after
        is_deletion_due = needs_export and today > delete_after

        warning_message = None
        if needs_export:
            if is_last_export_day:
                warning_message = (
                    "This is the last day to export previous month stock logs. "
                    "Please export now."
                )
            elif days_until_export_deadline >= 0:
                warning_message = (
                    f"Please export previous month stock logs within {days_until_export_deadline} day(s)."
                )
            elif is_delete_window:
                warning_message = (
                    f"Previous month stock logs will be archived and removed in {days_until_delete} day(s)."
                )

        return {
            "period_start": period_start,
            "period_end": period_end,
            "export_deadline": export_deadline,
            "delete_after": delete_after,
            "days_until_export_deadline": days_until_export_deadline,
            "days_until_delete": days_until_delete,
            "has_logs_in_main_db": has_logs,
            "has_been_exported": bool(exported_at),
            "exported_at": exported_at,
            "is_last_export_day": is_last_export_day,
            "is_delete_window": is_delete_window,
            "is_deletion_due": is_deletion_due,
            "warning_message": warning_message,
            "suggested_filename": f"{period_start}_{period_end}stock_logs.xlsx",
        }

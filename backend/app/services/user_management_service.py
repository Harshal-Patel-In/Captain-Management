"""User Management Service - Admin operations on customer accounts"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from passlib.hash import bcrypt

from app.models.ecommerce_user import EcommerceUser
from app.models.ecommerce_order import EcommerceOrder
from app.services.email_service import send_email, _wrap


class UserManagementService:
    """Admin-facing user management operations"""

    @staticmethod
    def get_users(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """Get all users with search/filter, including order stats."""
        query = db.query(EcommerceUser)

        if search:
            like = f"%{search}%"
            query = query.filter(
                (EcommerceUser.full_name.ilike(like))
                | (EcommerceUser.email.ilike(like))
                | (EcommerceUser.phone_number.ilike(like))
            )

        if status == "active":
            query = query.filter(EcommerceUser.is_active == True)
        elif status == "blocked":
            query = query.filter(EcommerceUser.is_active == False)
        elif status == "verified":
            query = query.filter(EcommerceUser.is_verified == True)
        elif status == "unverified":
            query = query.filter(EcommerceUser.is_verified == False)

        users = query.order_by(EcommerceUser.created_at.desc()).offset(offset).limit(limit).all()

        results = []
        for u in users:
            order_count = db.query(func.count(EcommerceOrder.id)).filter(EcommerceOrder.user_id == u.id).scalar() or 0
            total_spent = db.query(func.coalesce(func.sum(EcommerceOrder.amount_paid), 0)).filter(EcommerceOrder.user_id == u.id).scalar()
            results.append({
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "phone_number": u.phone_number,
                "city": u.city,
                "state": u.state,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "is_onboarding_completed": u.is_onboarding_completed,
                "orders_count": order_count,
                "total_spent": float(total_spent),
                "created_at": u.created_at,
                "updated_at": u.updated_at,
            })
        return results

    @staticmethod
    def get_user_detail(db: Session, user_id: UUID) -> Optional[dict]:
        """Get full user details."""
        u = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
        if not u:
            return None

        order_count = db.query(func.count(EcommerceOrder.id)).filter(EcommerceOrder.user_id == u.id).scalar() or 0
        total_spent = db.query(func.coalesce(func.sum(EcommerceOrder.amount_paid), 0)).filter(EcommerceOrder.user_id == u.id).scalar()

        return {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone_number": u.phone_number,
            "address_line1": u.address_line1,
            "address_line2": u.address_line2,
            "city": u.city,
            "state": u.state,
            "postal_code": u.postal_code,
            "country": u.country,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "is_onboarding_completed": u.is_onboarding_completed,
            "orders_count": order_count,
            "total_spent": float(total_spent),
            "created_at": u.created_at,
            "updated_at": u.updated_at,
        }

    @staticmethod
    def update_user(db: Session, user_id: UUID, data: dict) -> Optional[EcommerceUser]:
        """Admin updates user profile fields."""
        user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
        if not user:
            return None

        for field, value in data.items():
            if value is not None and hasattr(user, field):
                setattr(user, field, value)

        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def set_password(db: Session, user_id: UUID, new_password: str) -> bool:
        """Admin sets/resets a user's password."""
        user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
        if not user:
            return False

        user.password_hash = bcrypt.hash(new_password)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        return True

    @staticmethod
    def block_user(db: Session, user_id: UUID, blocked: bool, reason: Optional[str] = None) -> Optional[EcommerceUser]:
        """Block or unblock a user."""
        user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
        if not user:
            return None

        user.is_active = not blocked
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def send_user_email(db: Session, user_id: UUID, subject: str, message: str) -> bool:
        """Send a custom email to a user from admin."""
        user = db.query(EcommerceUser).filter(EcommerceUser.id == user_id).first()
        if not user or not user.email:
            return False

        name = user.full_name or "Customer"
        html = _wrap(f"""
        <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">{subject}</h2>
        <p style="color:#0b1d1580;margin:0 0 20px;font-size:14px;">Hello {name},</p>
        <div style="color:#0b1d15cc;font-size:14px;line-height:1.8;">
            {message.replace(chr(10), '<br/>')}
        </div>
        <p style="color:#0b1d1580;font-size:13px;margin-top:24px;">
            — Captain Insecticide Team
        </p>""")
        send_email(user.email, subject, html)
        return True

    @staticmethod
    def get_stats(db: Session) -> dict:
        """Get aggregated user statistics."""
        total = db.query(func.count(EcommerceUser.id)).scalar() or 0
        active = db.query(func.count(EcommerceUser.id)).filter(EcommerceUser.is_active == True).scalar() or 0
        verified = db.query(func.count(EcommerceUser.id)).filter(EcommerceUser.is_verified == True).scalar() or 0
        blocked = db.query(func.count(EcommerceUser.id)).filter(EcommerceUser.is_active == False).scalar() or 0

        now = datetime.now(timezone.utc)
        new_this_month = db.query(func.count(EcommerceUser.id)).filter(
            extract("year", EcommerceUser.created_at) == now.year,
            extract("month", EcommerceUser.created_at) == now.month,
        ).scalar() or 0

        return {
            "total_users": total,
            "active_users": active,
            "verified_users": verified,
            "blocked_users": blocked,
            "new_users_this_month": new_this_month,
        }

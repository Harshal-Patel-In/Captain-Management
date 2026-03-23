"""Management API - User Management Routes"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.user_management_service import UserManagementService
from app.schemas.user_management import (
    UserListItem, UserDetail, UserUpdate, UserSetPassword,
    UserBlockAction, UserSendEmail, UserStats,
)

router = APIRouter(prefix="/management/users", tags=["Management - Users"])


@router.get("/stats", response_model=UserStats)
def get_user_stats(db: Session = Depends(get_db)):
    """Get aggregated user statistics"""
    return UserManagementService.get_stats(db)


@router.get("", response_model=list[UserListItem])
def get_users(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get all users with optional search and status filter"""
    return UserManagementService.get_users(db, search, status, limit, offset)


@router.get("/{user_id}", response_model=UserDetail)
def get_user_detail(user_id: UUID, db: Session = Depends(get_db)):
    """Get full user details"""
    user = UserManagementService.get_user_detail(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserDetail)
def update_user(user_id: UUID, data: UserUpdate, db: Session = Depends(get_db)):
    """Update user profile fields"""
    updated = UserManagementService.update_user(db, user_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UserManagementService.get_user_detail(db, user_id)


@router.post("/{user_id}/set-password")
def set_password(user_id: UUID, data: UserSetPassword, db: Session = Depends(get_db)):
    """Set or reset user password"""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    success = UserManagementService.set_password(db, user_id, data.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "Password updated"}


@router.post("/{user_id}/block")
def block_user(user_id: UUID, data: UserBlockAction, db: Session = Depends(get_db)):
    """Block or unblock a user"""
    user = UserManagementService.block_user(db, user_id, data.blocked, data.reason)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    action = "blocked" if data.blocked else "unblocked"
    return {"success": True, "message": f"User {action}", "is_active": user.is_active}


@router.post("/{user_id}/send-email")
def send_email_to_user(user_id: UUID, data: UserSendEmail, db: Session = Depends(get_db)):
    """Send a custom email to a user"""
    success = UserManagementService.send_user_email(db, user_id, data.subject, data.message)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or no email")
    return {"success": True, "message": "Email sent"}

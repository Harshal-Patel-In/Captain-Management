"""Notification Service - In-app and email notifications"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models import Notification, EcommerceUser, EcommerceOrder
from app.models.notification import NotificationType


class NotificationService:
    """Service for notification management"""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        order_id: Optional[UUID] = None
    ) -> Notification:
        """Create an in-app notification"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            order_id=order_id,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: UUID,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = db.query(Notification).filter(
            Notification.user_id == user_id
        )
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    
    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> int:
        """Get unread notification count for a user"""
        return db.query(func.count(Notification.id)).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).scalar() or 0
    
    @staticmethod
    def mark_as_read(
        db: Session,
        notification_ids: List[UUID],
        user_id: UUID
    ) -> int:
        """Mark notifications as read"""
        count = db.query(Notification).filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == user_id
        ).update({"is_read": True}, synchronize_session=False)
        
        db.commit()
        return count
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: UUID) -> int:
        """Mark all notifications as read for a user"""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True}, synchronize_session=False)
        
        db.commit()
        return count
    
    # ============= Notification Triggers =============
    
    @staticmethod
    def notify_order_approved(db: Session, order: EcommerceOrder) -> Notification:
        """Send notification when order is approved"""
        return NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_APPROVED.value,
            title="Order Approved",
            message=f"Your order has been approved and is being prepared for delivery.",
            order_id=order.id
        )
    
    @staticmethod
    def notify_order_rejected(
        db: Session,
        order: EcommerceOrder,
        reason: Optional[str] = None
    ) -> Notification:
        """Send notification when order is rejected"""
        message = f"Your order has been rejected."
        if reason:
            message += f" Reason: {reason}"
        
        return NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_REJECTED.value,
            title="Order Rejected",
            message=message,
            order_id=order.id
        )
    
    @staticmethod
    def notify_delivery_update(
        db: Session,
        order: EcommerceOrder,
        is_complete: bool = False
    ) -> Notification:
        """Send notification on delivery update"""
        if is_complete:
            message = "Your order has been fully delivered."
            title = "Order Delivered"
        else:
            message = "Part of your order has been delivered."
            title = "Delivery Update"
        
        return NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.DELIVERY_UPDATE.value,
            title=title,
            message=message,
            order_id=order.id
        )
    
    @staticmethod
    def notify_payment_received(
        db: Session,
        order: EcommerceOrder,
        amount: float
    ) -> Notification:
        """Send notification when payment is received"""
        return NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.PAYMENT_RECEIVED.value,
            title="Payment Received",
            message=f"Payment of ₹{amount:.2f} received for your order.",
            order_id=order.id
        )
    
    @staticmethod
    async def send_email_notification(
        user: EcommerceUser,
        subject: str,
        body: str
    ) -> bool:
        """
        Send email notification.
        This is a placeholder - integrate with your email service 
        (SendGrid, AWS SES, etc.)
        """
        # TODO: Implement email sending
        # Example integration:
        # import sendgrid
        # sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        # message = Mail(
        #     from_email='noreply@captaininsecticide.com',
        #     to_emails=user.email,
        #     subject=subject,
        #     html_content=body
        # )
        # response = sg.send(message)
        # return response.status_code == 202
        
        print(f"[EMAIL] To: {user.email}, Subject: {subject}")
        return True

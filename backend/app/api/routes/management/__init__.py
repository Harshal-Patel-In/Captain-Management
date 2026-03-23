"""Management API package initialization"""
from .orders import router as orders_router
from .products import router as products_router
from .payments import router as payments_router
from .logs import router as logs_router
from .users import router as users_router
from .chat import router as chat_router

__all__ = ["orders_router", "products_router", "payments_router", "logs_router", "users_router", "chat_router"]

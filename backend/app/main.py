from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


def parse_cors_origins(frontend_url: str) -> list[str]:
    """Parse comma-separated frontend origins from env."""
    return [origin.strip() for origin in frontend_url.split(",") if origin.strip()]

# Create FastAPI application
app = FastAPI(
    title="Inventory Management System",
    description="QR-based inventory tracking with immutable audit logs",
    version="1.0.0"
)

# Configure CORS from FRONTEND_URL (comma-separated list)
cors_origins = parse_cors_origins(settings.FRONTEND_URL)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": "Inventory Management System",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {"status": "ok", "database": "connected"}


# Import and include routers
from app.api.routes import products, stock, inventory, logs, analytics, export, dashboard, realtime

app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(stock.router, prefix="/stock", tags=["stock"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(logs.router, prefix="/logs", tags=["logs"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(realtime.router, tags=["realtime"])
from app.api.routes import production
app.include_router(production.router, prefix="/production", tags=["production"])

# Management App routes
from app.api.routes.management import (
    orders_router, products_router, payments_router, logs_router,
    users_router, chat_router
)
app.include_router(orders_router)
app.include_router(products_router)
app.include_router(payments_router)
app.include_router(logs_router)
app.include_router(users_router)
app.include_router(chat_router)


if __name__ == "__main__":
    import uvicorn
    import os
    import sys
    
    # Ensure the backend directory is in the Python path
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    # Run uvicorn with proper configuration
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[os.path.join(backend_dir, "app")] if os.path.exists(os.path.join(backend_dir, "app")) else None,
    )

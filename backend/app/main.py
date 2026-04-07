import logging
import asyncio
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from app.config import settings
from app.database import SessionLocal
from app.services.log_retention_service import LogRetentionService


logger = logging.getLogger(__name__)

RETENTION_MAINTENANCE_INTERVAL_SECONDS = 60 * 60 * 24


async def retention_maintenance_loop() -> None:
    """Run retention archival/deletion checks once a day."""
    while True:
        db = SessionLocal()
        try:
            LogRetentionService.run_maintenance(db)
        except Exception as exc:
            logger.exception("Retention maintenance failed", exc_info=exc)
        finally:
            db.close()

        await asyncio.sleep(RETENTION_MAINTENANCE_INTERVAL_SECONDS)


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


@app.on_event("startup")
async def start_background_retention_maintenance() -> None:
    asyncio.create_task(retention_maintenance_loop())


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": "Inventory Management System",
        "version": "1.0.0"
    }


@app.head("/")
async def root_head():
    """HEAD probe support for platform health checks."""
    return Response(status_code=200)


@app.get("/health")
async def health_check():
    """Detailed health check with DB ping."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except OperationalError:
        return {"status": "degraded", "database": "unreachable"}
    finally:
        db.close()


@app.exception_handler(OperationalError)
async def database_operational_error_handler(_: Request, exc: OperationalError):
    """Return a graceful response during transient DB outages."""
    logger.exception("Database operational error", exc_info=exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Database temporarily unavailable. Please retry in a few seconds."},
    )


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

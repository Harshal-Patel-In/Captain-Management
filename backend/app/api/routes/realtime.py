"""
Real-time WebSocket endpoint for unified multi-user synchronization.
Handles stock, product, production, logs, and analytics real-time updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.realtime_service import realtime_manager

router = APIRouter(prefix="/realtime", tags=["Realtime"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Unified WebSocket for all real-time updates.
    
    Receives events from frontend (currently unused for MVP, but can extend):
    - Frontend can send acks or other messages
    
    Sends events to frontend:
    - stock_changed
    - product_changed
    - ecommerce_product_changed
    - production_changed
    - log_created
    - analytics_updated
    - inventory_updated
    
    Connection automatically receives all broadcast events.
    """
    await realtime_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive any frontend messages
            # In MVP, we just listen passively, backend broadcasts to all
            data = await websocket.receive_text()
            # Optional: Process client commands here
            # For now, we just keep the connection alive
            pass
    except WebSocketDisconnect:
        realtime_manager.disconnect(websocket)
    except Exception as e:
        print(f"[REALTIME] WebSocket error: {e}")
        realtime_manager.disconnect(websocket)


@router.get("/health")
async def realtime_health():
    """Health check for realtime service"""
    return {
        "status": "ok",
        "active_connections": realtime_manager.get_connection_count()
    }

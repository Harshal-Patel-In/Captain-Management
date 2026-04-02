"""
Real-time event broadcasting service for WebSocket connections.
Handles multi-user synchronization of stock, products, production, logs, and analytics.
"""
from fastapi import WebSocket
from typing import Optional, Dict, Any, Coroutine
import asyncio
import threading
from datetime import datetime
from app.utils.precision import normalize_quantity


class RealtimeConnectionManager:
    """
    Manages WebSocket connections and broadcasts real-time events to all connected clients.
    
    Event Types:
    - stock_changed: Stock quantity updated (in/out operations)
    - product_changed: Product details updated
    - production_changed: Production completed/started
    - log_created: New audit log entry
    - analytics_updated: Analytics refreshed
    - inventory_updated: Full inventory refresh triggered
    """
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"[REALTIME] Client connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        try:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            print(f"[REALTIME] Client disconnected. Total: {len(self.active_connections)}")
        except Exception as e:
            print(f"[REALTIME] Error during disconnect: {e}")
    
    async def broadcast(self, event: Dict[str, Any]):
        """
        Broadcast an event to all connected clients.
        
        Args:
            event: Dict with "type" and other event-specific data
        
        Example:
            await manager.broadcast({
                "type": "stock_changed",
                "product_id": 5,
                "new_quantity": 100,
                "action": "in",
                "timestamp": datetime.now().isoformat()
            })
        """
        # Add timestamp if not present
        if "timestamp" not in event:
            event["timestamp"] = datetime.now().isoformat()
        
        dead_connections = []
        
        for connection in self.active_connections:
            try:
                await connection.send_json(event)
            except Exception as e:
                # Connection died, mark for removal
                print(f"[REALTIME] Failed to send to client: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        async with self._lock:
            for conn in dead_connections:
                self.disconnect(conn)
    
    async def broadcast_stock_changed(
        self, 
        product_id: int, 
        product_name: str,
        new_quantity: float, 
        previous_quantity: float,
        action: str,  # "in" or "out"
        remarks: Optional[str] = None
    ):
        """Broadcast stock change event"""
        normalized_new = normalize_quantity(new_quantity)
        normalized_previous = normalize_quantity(previous_quantity)
        await self.broadcast({
            "type": "stock_changed",
            "product_id": product_id,
            "product_name": product_name,
            "new_quantity": normalized_new,
            "previous_quantity": normalized_previous,
            "quantity_changed": normalize_quantity(normalized_new - normalized_previous),
            "action": action,
            "remarks": remarks,
        })
    
    async def broadcast_product_changed(
        self,
        product_id: int,
        action: str,  # "created", "updated", "deleted"
        changes: Dict[str, Any]
    ):
        """Broadcast product change event"""
        await self.broadcast({
            "type": "product_changed",
            "product_id": product_id,
            "action": action,
            "changes": changes,
        })
    
    async def broadcast_ecommerce_product_changed(
        self,
        ecommerce_product_id: str,
        action: str,  # "published", "updated", "updated_status"
        changes: Dict[str, Any]
    ):
        """Broadcast e-commerce product change event"""
        await self.broadcast({
            "type": "ecommerce_product_changed",
            "ecommerce_product_id": ecommerce_product_id,
            "action": action,
            "changes": changes,
        })
    
    async def broadcast_production_changed(
        self,
        product_id: int,
        product_name: str,
        action: str,  # "started", "completed"
        quantity_produced: int,
        ingredients_consumed: dict
    ):
        """Broadcast production event"""
        await self.broadcast({
            "type": "production_changed",
            "product_id": product_id,
            "product_name": product_name,
            "action": action,
            "quantity_produced": quantity_produced,
            "ingredients_consumed": ingredients_consumed,
        })
    
    async def broadcast_log_created(
        self,
        log_type: str,  # "stock", "order", "payment", "delivery", "production"
        log_data: Dict[str, Any]
    ):
        """Broadcast new log entry"""
        await self.broadcast({
            "type": "log_created",
            "log_type": log_type,
            "log_data": log_data,
        })
    
    async def broadcast_analytics_updated(self):
        """Broadcast analytics refresh event"""
        await self.broadcast({
            "type": "analytics_updated",
        })
    
    async def broadcast_inventory_updated(self):
        """Broadcast full inventory refresh"""
        await self.broadcast({
            "type": "inventory_updated",
        })
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)


# Global instance
realtime_manager = RealtimeConnectionManager()


def schedule_realtime_task(coro: Coroutine[Any, Any, Any]) -> None:
    """
    Dispatch a realtime coroutine safely from both async and sync contexts.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        # FastAPI sync endpoints run without a running event loop in the worker thread.
        threading.Thread(target=lambda: asyncio.run(coro), daemon=True).start()

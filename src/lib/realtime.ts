/**
 * Real-time WebSocket client for receiving live updates
 * Handles: stock changes, product updates, production, logs, analytics
 */

type RealtimeEventType = 
  | 'stock_changed' 
  | 'product_changed' 
  | 'ecommerce_product_changed'
  | 'production_changed' 
  | 'log_created' 
  | 'analytics_updated'
  | 'inventory_updated';

export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: string;
  [key: string]: any;
}

export interface StockChangedEvent extends RealtimeEvent {
  type: 'stock_changed';
  product_id: number;
  product_name: string;
  new_quantity: number;
  previous_quantity: number;
  quantity_changed: number;
  action: 'in' | 'out';
  remarks?: string;
}

export interface ProductChangedEvent extends RealtimeEvent {
  type: 'product_changed';
  product_id: number;
  action: 'created' | 'updated' | 'deleted';
  changes: Record<string, any>;
}

export interface EcommerceProductChangedEvent extends RealtimeEvent {
  type: 'ecommerce_product_changed';
  ecommerce_product_id: string;
  action: 'published' | 'updated' | 'updated_status';
  changes: Record<string, any>;
}

export type RealtimeListener = (event: RealtimeEvent) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<RealtimeEventType | 'all', Set<RealtimeListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // ms
  private isClosedByUser = false;

  constructor(backendUrl: string) {
    this.url = this.getWebSocketUrl(backendUrl);
    this.ensureListenerMap();
  }

  private ensureListenerMap() {
    if (!this.listeners.has('all')) {
      this.listeners.set('all', new Set());
    }
    // Ensure specific event types exist
    const eventTypes: RealtimeEventType[] = [
      'stock_changed',
      'product_changed',
      'ecommerce_product_changed',
      'production_changed',
      'log_created',
      'analytics_updated',
      'inventory_updated',
    ];
    eventTypes.forEach(type => {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
    });
  }

  private getWebSocketUrl(backendUrl: string): string {
    let base = backendUrl.replace(/\/$/, ''); // Remove trailing slash
    base = base.replace(/^http/, 'ws'); // http -> ws, https -> wss
    return `${base}/realtime/ws`;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isClosedByUser = false;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[REALTIME] Connected to WebSocket');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: RealtimeEvent = JSON.parse(event.data);
            this.handleEvent(data);
          } catch (e) {
            console.error('[REALTIME] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[REALTIME] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[REALTIME] WebSocket closed');
          if (!this.isClosedByUser) {
            this.attemptReconnect();
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    this.isClosedByUser = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Handle incoming event and notify listeners
   */
  private handleEvent(event: RealtimeEvent): void {
    const eventType = event.type as RealtimeEventType;
    
    // Notify type-specific listeners
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (e) {
          console.error(`[REALTIME] Error in listener for ${eventType}:`, e);
        }
      });
    }

    // Notify 'all' listeners
    const allListeners = this.listeners.get('all');
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener(event);
        } catch (e) {
          console.error('[REALTIME] Error in all-events listener:', e);
        }
      });
    }
  }

  /**
   * Subscribe to specific event type
   */
  public on(eventType: RealtimeEventType | 'all', listener: RealtimeListener): void {
    this.ensureListenerMap();
    const listeners = this.listeners.get(eventType) || new Set();
    listeners.add(listener);
    this.listeners.set(eventType, listeners);
  }

  /**
   * Unsubscribe from specific event type
   */
  public off(eventType: RealtimeEventType | 'all', listener: RealtimeListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[REALTIME] Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(
      `[REALTIME] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch(e => {
        console.error('[REALTIME] Reconnection failed:', e);
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global instance
let realtimeClient: RealtimeClient | null = null;

export function initRealtimeClient(backendUrl: string): RealtimeClient {
  if (!realtimeClient) {
    realtimeClient = new RealtimeClient(backendUrl);
  }
  return realtimeClient;
}

export function getRealtimeClient(): RealtimeClient | null {
  return realtimeClient;
}

export function disconnectRealtime(): void {
  if (realtimeClient) {
    realtimeClient.disconnect();
    realtimeClient = null;
  }
}

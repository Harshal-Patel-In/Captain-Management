"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  initRealtimeClient, 
  disconnectRealtime, 
  getRealtimeClient,
  RealtimeEvent,
  StockChangedEvent,
  EcommerceProductChangedEvent,
  RealtimeListener
} from '@/lib/realtime';

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  on: (eventType: string | 'all', listener: RealtimeListener) => void;
  off: (eventType: string | 'all', listener: RealtimeListener) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const client = initRealtimeClient(backendUrl);

    // Connect
    client.connect()
      .then(() => setIsConnected(true))
      .catch(e => {
        console.error('Failed to connect to realtime:', e);
        setIsConnected(false);
      });

    // Listen to all events for debugging
    const allEventsListener = (event: RealtimeEvent) => {
      setLastEvent(event);
      console.log('[REALTIME] Event received:', event);
    };

    client.on('all', allEventsListener);

    // Cleanup
    return () => {
      client.off('all', allEventsListener);
      // Don't disconnect on unmount if app is still running
      // disconnectRealtime();
    };
  }, []);

  const on = useCallback((eventType: string | 'all', listener: RealtimeListener) => {
    const client = getRealtimeClient();
    if (client) {
      client.on(eventType as any, listener);
    }
  }, []);

  const off = useCallback((eventType: string | 'all', listener: RealtimeListener) => {
    const client = getRealtimeClient();
    if (client) {
      client.off(eventType as any, listener);
    }
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent, on, off }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

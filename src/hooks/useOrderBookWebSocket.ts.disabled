/**
 * Real-Time WebSocket Order Book Hook
 * Provides 100ms real-time order book updates via Binance WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { orderBookWebSocket } from '@/services/orderBookWebSocket';
import type { OrderBookData } from '@/services/orderBookService';

interface UseOrderBookWebSocketOptions {
  symbol: string;
  enabled?: boolean;
}

export function useOrderBookWebSocket(options: UseOrderBookWebSocketOptions) {
  const { symbol, enabled = true } = options;
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  const handleUpdate = useCallback((data: OrderBookData) => {
    if (!mountedRef.current) return;

    setOrderBook(data);
    setIsConnecting(data.status === 'connecting');
    setIsConnected(data.status === 'connected');
    setError(null);
  }, []);

  const handleError = useCallback((err: Error) => {
    if (!mountedRef.current) return;

    setError(err);
    setIsConnecting(false);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !symbol) {
      return;
    }

    console.log(`📊 Subscribing to WebSocket order book for ${symbol}`);

    // Subscribe to WebSocket updates
    const unsubscribe = orderBookWebSocket.subscribe(
      symbol,
      handleUpdate,
      handleError
    );

    // Cleanup on unmount
    return () => {
      console.log(`📊 Unsubscribing from WebSocket order book for ${symbol}`);
      mountedRef.current = false;
      unsubscribe();
    };
  }, [symbol, enabled, handleUpdate, handleError]);

  return {
    orderBook,
    isConnecting,
    isConnected,
    hasError: !!error,
    error,
    connectionStatus: orderBookWebSocket.getConnectionStatus(symbol)
  };
}

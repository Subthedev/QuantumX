/**
 * Order Book REST Hook
 * Uses Binance REST API with polling for reliable, production-grade data fetching
 * Avoids WebSocket connection limits and browser restrictions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrderBookData } from '@/services/orderBookService';
import { binanceOrderBookService } from '@/services/binanceOrderBookService';

interface UseOrderBookRESTOptions {
  symbol: string;
  limit?: number;
  pollInterval?: number; // milliseconds
  enabled?: boolean;
}

interface UseOrderBookRESTResult {
  data: OrderBookData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useOrderBookREST({
  symbol,
  limit = 20,
  pollInterval = 2000, // 2 seconds default
  enabled = true
}: UseOrderBookRESTOptions): UseOrderBookRESTResult {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      const orderBookData = await binanceOrderBookService.fetchOrderBook(symbol, limit);

      if (isMountedRef.current) {
        setData(orderBookData);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch order book'));
        setIsLoading(false);
      }
    }
  }, [symbol, limit, enabled]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchData();
  }, [fetchData, enabled]);

  // Polling
  useEffect(() => {
    if (!enabled || !pollInterval) return;

    pollIntervalRef.current = setInterval(() => {
      fetchData();
    }, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchData, pollInterval, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}

/**
 * Real-Time Order Book Hook
 * Provides real-time order book data with auto-refresh
 */

import { useQuery } from '@tanstack/react-query';
import { getOrderBook, OrderBookData } from '@/services/orderBookService';

interface UseOrderBookOptions {
  symbol: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export function useOrderBook(options: UseOrderBookOptions) {
  const { symbol, refetchInterval = 3000, enabled = true } = options;

  const query = useQuery({
    queryKey: ['orderbook', symbol.toLowerCase()],
    queryFn: () => getOrderBook(symbol),
    refetchInterval,
    staleTime: 2000,
    gcTime: 10000,
    refetchOnWindowFocus: true,
    enabled: enabled && !!symbol,
    retry: 3,
    retryDelay: 1000
  });

  return {
    ...query,
    orderBook: query.data,
    isConnecting: query.isLoading && !query.data,
    isConnected: query.data?.status === 'connected',
    hasError: query.data?.status === 'error' || query.isError
  };
}

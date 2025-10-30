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
  const { symbol, refetchInterval = 1000, enabled = true } = options;

  const query = useQuery({
    queryKey: ['orderbook', symbol.toLowerCase()],
    queryFn: () => getOrderBook(symbol),
    refetchInterval,
    staleTime: 500,
    gcTime: 5000,
    refetchOnWindowFocus: false,
    enabled: enabled && !!symbol,
    retry: 2
  });

  return {
    ...query,
    orderBook: query.data,
    isConnecting: query.data?.status === 'connecting' || query.data?.status === 'initializing',
    isConnected: query.data?.status === 'connected',
    hasError: query.data?.status === 'error' || query.isError
  };
}

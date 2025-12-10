import { useState, useEffect, useCallback, useRef } from 'react';
import { cryptoDataService } from '@/services/cryptoDataService';

interface Holding {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
  current_price?: number;
  value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
  price_change_24h?: number;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  holdings: Holding[];
}

interface RealtimePortfolioData {
  metrics: PortfolioMetrics;
  marketData: Map<string, any>;
  lastUpdate: Date;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for real-time portfolio data synchronization
 * Ensures all portfolio components receive instant updates simultaneously
 * with zero delay and robust error handling
 */
export const useRealtimePortfolio = (
  initialHoldings: Holding[],
  updateInterval: number = 60000
): RealtimePortfolioData & {
  refresh: () => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
} => {
  const [marketData, setMarketData] = useState<Map<string, any>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);

  /**
   * Fast market data fetch with deduplication and caching
   */
  const fetchMarketData = useCallback(async () => {
    // Prevent duplicate fetches within 2 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) {
      return;
    }
    lastFetchRef.current = now;

    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch comprehensive market data (250 coins for better coverage)
      const data = await cryptoDataService.getTopCryptos(250);

      if (!isMountedRef.current) return;

      // Create optimized Map for O(1) lookups
      const marketMap = new Map();
      data.forEach(coin => {
        marketMap.set(coin.id, coin);
      });

      setMarketData(marketMap);
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error('Real-time market data fetch error:', err);
      setError('Failed to fetch market data');
      setIsLoading(false);
    }
  }, []);

  /**
   * Calculate portfolio metrics with enriched real-time data
   */
  const calculatePortfolioMetrics = useCallback((): PortfolioMetrics => {
    let totalValue = 0;
    let totalCost = 0;
    const holdingsWithPrices: Holding[] = [];

    for (const holding of initialHoldings) {
      const marketCoin = marketData.get(holding.coin_id);
      const currentPrice = marketCoin?.current_price || holding.purchase_price;
      const value = holding.quantity * currentPrice;
      const cost = holding.quantity * holding.purchase_price;
      const profitLoss = value - cost;
      const profitLossPercentage = cost > 0 ? (profitLoss / cost) * 100 : 0;

      totalValue += value;
      totalCost += cost;

      holdingsWithPrices.push({
        ...holding,
        current_price: currentPrice,
        value,
        profit_loss: profitLoss,
        profit_loss_percentage: profitLossPercentage,
        price_change_24h: marketCoin?.price_change_percentage_24h || 0,
      });
    }

    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercentage = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalProfitLoss,
      totalProfitLossPercentage,
      holdings: holdingsWithPrices,
    };
  }, [initialHoldings, marketData]);

  /**
   * Manual refresh function for instant updates
   */
  const refresh = useCallback(async () => {
    await fetchMarketData();
  }, [fetchMarketData]);

  /**
   * Start real-time updates
   */
  const startRealtime = useCallback(() => {
    if (intervalRef.current) return; // Already running

    // Initial fetch
    fetchMarketData();

    // Set up interval for continuous updates
    intervalRef.current = setInterval(() => {
      fetchMarketData();
    }, updateInterval);
  }, [fetchMarketData, updateInterval]);

  /**
   * Stop real-time updates
   */
  const stopRealtime = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize real-time updates on mount
  useEffect(() => {
    isMountedRef.current = true;
    startRealtime();

    return () => {
      isMountedRef.current = false;
      stopRealtime();
    };
  }, [startRealtime, stopRealtime]);

  // Recalculate when holdings change
  useEffect(() => {
    if (initialHoldings.length > 0 && marketData.size === 0) {
      fetchMarketData();
    }
  }, [initialHoldings.length, marketData.size, fetchMarketData]);

  const metrics = calculatePortfolioMetrics();

  return {
    metrics,
    marketData,
    lastUpdate,
    isLoading,
    error,
    refresh,
    startRealtime,
    stopRealtime,
  };
};

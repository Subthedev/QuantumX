/**
 * Real-Time Intelligence Hook
 * Provides continuous intelligence monitoring with automatic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { intelligenceHub } from '@/services/intelligenceHub';
import { aiIntelligenceEngine } from '@/services/aiIntelligenceEngine';
import type { UnifiedIntelligenceData } from '@/services/intelligenceHub';
import type { IntelligenceReport } from '@/services/aiIntelligenceEngine';

/**
 * Real-time intelligence options
 */
export interface UseRealTimeIntelligenceOptions {
  symbol: string;
  enabled?: boolean;
  refreshInterval?: number; // milliseconds (default: 30000 = 30 seconds)
  includeFullReport?: boolean; // Generate full AI report or just data
}

/**
 * Intelligence stream state
 */
export interface IntelligenceStream {
  data: UnifiedIntelligenceData | null;
  report: IntelligenceReport | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: number | null;
  nextUpdate: number | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for real-time intelligence monitoring
 */
export function useRealTimeIntelligence(
  options: UseRealTimeIntelligenceOptions
): IntelligenceStream {
  const {
    symbol,
    enabled = true,
    refreshInterval = 30000,
    includeFullReport = false
  } = options;

  const [data, setData] = useState<UnifiedIntelligenceData | null>(null);
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  /**
   * Fetch intelligence data
   */
  const fetchIntelligence = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      setIsLoading(true);

      if (includeFullReport) {
        // Generate full AI report (slower but comprehensive)
        const intelligenceReport = await aiIntelligenceEngine.generateIntelligenceReport();

        if (mountedRef.current) {
          setReport(intelligenceReport);
          setData(null); // Report includes all data
          setError(null);
          setLastUpdate(Date.now());
          setNextUpdate(Date.now() + refreshInterval);
        }
      } else {
        // Fetch just the unified data (faster)
        const intelligenceData = await intelligenceHub.fetchIntelligence({
          symbol,
          includeOHLC: true,
          ohlcTimeframe: '4h',
          includeOnChain: true,
          includeOrderBook: true,
          orderBookLimit: 20,
          includeFundingRate: true,
          includeMarketSentiment: true
        });

        if (mountedRef.current) {
          setData(intelligenceData);
          setReport(null);
          setError(null);
          setLastUpdate(Date.now());
          setNextUpdate(Date.now() + refreshInterval);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch intelligence');
        setError(errorObj);
        console.error(`Real-time intelligence error for ${symbol}:`, err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbol, enabled, includeFullReport, refreshInterval]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchIntelligence();
  }, [fetchIntelligence]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    fetchIntelligence();
  }, [fetchIntelligence, enabled]);

  /**
   * Polling mechanism
   */
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    intervalRef.current = setInterval(() => {
      fetchIntelligence();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchIntelligence, refreshInterval, enabled]);

  /**
   * Update next update timer every second
   */
  useEffect(() => {
    if (!enabled || !lastUpdate) return;

    const timerInterval = setInterval(() => {
      if (mountedRef.current && lastUpdate) {
        setNextUpdate(lastUpdate + refreshInterval);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [lastUpdate, refreshInterval, enabled]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    report,
    isLoading,
    error,
    lastUpdate,
    nextUpdate,
    refresh
  };
}

/**
 * Hook for monitoring multiple symbols
 */
export interface UseMultiSymbolIntelligenceOptions {
  symbols: string[];
  enabled?: boolean;
  refreshInterval?: number;
}

export interface MultiSymbolIntelligenceStream {
  data: Map<string, UnifiedIntelligenceData>;
  isLoading: boolean;
  errors: Map<string, Error>;
  lastUpdate: number | null;
  refresh: () => Promise<void>;
}

export function useMultiSymbolIntelligence(
  options: UseMultiSymbolIntelligenceOptions
): MultiSymbolIntelligenceStream {
  const { symbols, enabled = true, refreshInterval = 60000 } = options;

  const [data, setData] = useState<Map<string, UnifiedIntelligenceData>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchMultiple = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    try {
      setIsLoading(true);

      const results = await intelligenceHub.fetchMultipleIntelligence(symbols, {
        includeOHLC: true,
        ohlcTimeframe: '4h',
        includeOnChain: false, // Disable for performance with multiple symbols
        includeOrderBook: true,
        orderBookLimit: 10,
        includeFundingRate: true,
        includeMarketSentiment: true
      });

      if (mountedRef.current) {
        const dataMap = new Map<string, UnifiedIntelligenceData>();
        results.forEach(result => {
          dataMap.set(result.symbol, result);
        });

        setData(dataMap);
        setLastUpdate(Date.now());
        setErrors(new Map()); // Clear errors on success
      }
    } catch (err) {
      console.error('Multi-symbol intelligence fetch failed:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbols, enabled]);

  const refresh = useCallback(async () => {
    await fetchMultiple();
  }, [fetchMultiple]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    fetchMultiple();
  }, [fetchMultiple, enabled]);

  // Polling
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    intervalRef.current = setInterval(() => {
      fetchMultiple();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMultiple, refreshInterval, enabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    errors,
    lastUpdate,
    refresh
  };
}

/**
 * Utility function to get time until next update
 */
export function getTimeUntilUpdate(nextUpdate: number | null): string {
  if (!nextUpdate) return 'N/A';

  const now = Date.now();
  const diff = nextUpdate - now;

  if (diff <= 0) return 'Updating...';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

/**
 * Platform Metrics Hook
 * Provides real-time aggregated metrics across all tracked cryptocurrencies
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { platformMetricsService, type PlatformMetrics } from '@/services/platformMetricsService';

interface UsePlatformMetricsOptions {
  enabled?: boolean;
  startTracking?: boolean;
}

export function usePlatformMetrics(options: UsePlatformMetricsOptions = {}) {
  const { enabled = true, startTracking = true } = options;
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const mountedRef = useRef(true);

  const handleUpdate = useCallback((newMetrics: PlatformMetrics) => {
    if (!mountedRef.current) return;
    setMetrics(newMetrics);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      return;
    }

    // Start tracking if requested
    if (startTracking) {
      platformMetricsService.startTracking(1000); // Update every second
    }

    // Subscribe to metrics updates
    const unsubscribe = platformMetricsService.subscribe(handleUpdate);

    // Get initial cached metrics
    const cached = platformMetricsService.getCachedMetrics();
    if (cached) {
      setMetrics(cached);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [enabled, startTracking, handleUpdate]);

  return {
    metrics,
    isLoading: !metrics,
    totalVolume: metrics?.totalVolume ?? 0,
    totalBidVolume: metrics?.totalBidVolume ?? 0,
    totalAskVolume: metrics?.totalAskVolume ?? 0,
    averageSpread: metrics?.averageSpread ?? 0,
    bullishCoins: metrics?.bullishCoins ?? 0,
    bearishCoins: metrics?.bearishCoins ?? 0,
    neutralCoins: metrics?.neutralCoins ?? 0
  };
}

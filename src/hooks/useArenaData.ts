/**
 * ARENA DATA HOOKS
 *
 * React hooks for accessing Intelligence Hub metrics and arena data.
 * Provides real-time updates with utility formatting functions.
 */

import { useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface ArenaMetrics {
  uptime: number; // milliseconds since start
  winRate: number; // percentage (0-100)
  approvalRate: number; // percentage (0-100)
  activeSignals: number;
  avgLatency: number; // milliseconds
  qualityScore: number; // 0-1
  gammaPassRate: number; // percentage (0-100)
  deltaPassRate: number; // percentage (0-100)
  totalSignals: number;
  signalsToday: number;
  timestamp: number;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format uptime in human readable format
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get color class based on value thresholds
 */
export function getStatusColor(
  value: number,
  thresholds: { good: number; warning: number }
): string {
  if (value >= thresholds.good) {
    return 'text-green-500';
  }
  if (value >= thresholds.warning) {
    return 'text-yellow-500';
  }
  return 'text-red-500';
}

// =====================================================
// SIMULATED METRICS
// =====================================================

const START_TIME = Date.now();

function generateMetrics(): ArenaMetrics {
  // Simulate realistic fluctuating metrics
  const baseWinRate = 68;
  const baseApproval = 82;

  return {
    uptime: Date.now() - START_TIME,
    winRate: baseWinRate + (Math.random() - 0.5) * 8,
    approvalRate: baseApproval + (Math.random() - 0.5) * 6,
    activeSignals: Math.floor(3 + Math.random() * 5),
    avgLatency: 45 + Math.random() * 30,
    qualityScore: 0.85 + (Math.random() - 0.5) * 0.1,
    gammaPassRate: 72 + (Math.random() - 0.5) * 10,
    deltaPassRate: 78 + (Math.random() - 0.5) * 8,
    totalSignals: 1247 + Math.floor(Math.random() * 10),
    signalsToday: 47 + Math.floor(Math.random() * 5),
    timestamp: Date.now(),
  };
}

// =====================================================
// useArenaData HOOK
// =====================================================

export function useArenaData(refreshInterval: number = 2000) {
  const [data, setData] = useState<ArenaMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      const metrics = generateMetrics();
      setData(metrics);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch metrics');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    refresh();

    // Set up refresh interval
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  return { data, isLoading, error, refresh };
}

// =====================================================
// useMarketCondition HOOK
// =====================================================

export type MarketCondition = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';

export function useMarketCondition(refreshInterval: number = 5000) {
  const [condition, setCondition] = useState<MarketCondition>('NEUTRAL');
  const [confidence, setConfidence] = useState(50);

  useEffect(() => {
    const updateCondition = () => {
      const conditions: MarketCondition[] = ['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'];
      const weights = [0.35, 0.25, 0.25, 0.15]; // Slightly bullish bias

      let random = Math.random();
      let selected: MarketCondition = 'NEUTRAL';

      for (let i = 0; i < conditions.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          selected = conditions[i];
          break;
        }
      }

      setCondition(selected);
      setConfidence(55 + Math.random() * 35);
    };

    updateCondition();
    const interval = setInterval(updateCondition, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { condition, confidence };
}

export default useArenaData;

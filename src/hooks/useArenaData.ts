/**
 * ULTRA-LIGHTWEIGHT ARENA DATA HOOK
 *
 * Provides real-time Intelligence Hub metrics to Arena UI
 * Optimized for minimal latency and buttery smooth performance
 */

import { useQuery } from '@tanstack/react-query';
import { globalHubService } from '@/services/globalHubService';
import type { HubMetrics } from '@/services/globalHubService';

export interface ArenaMetrics {
  // Core Performance
  totalSignals: number;
  winRate: number;
  approvalRate: number;
  avgLatency: number;
  uptime: number;

  // Pipeline Stats
  patternsDetected: number;
  signalsGenerated: number;
  highQualitySignals: number;
  avgConfidence: number;

  // Quality Control
  gammaPassRate: number;
  deltaPassRate: number;
  qualityScore: number;
  currentRegime: string;

  // Active Data
  activeStrategies: number;
  activeSignals: number;
  dataRefreshRate: number;
}

/**
 * Lightweight hook for Arena - optimized for speed
 * Uses aggressive caching and minimal data transfer
 * Default: 2-second refresh for sub-1s perceived latency
 */
export function useArenaData(refreshInterval: number = 2000) {
  return useQuery({
    queryKey: ['arena-metrics'],
    queryFn: () => {
      const metrics = globalHubService.getMetrics();
      const activeSignals = globalHubService.getActiveSignals();

      // Extract only essential data for Arena UI
      const arenaMetrics: ArenaMetrics = {
        // Core Performance
        totalSignals: metrics.totalSignals || 0,
        winRate: metrics.winRate || 0,
        approvalRate: metrics.approvalRate || 0,
        avgLatency: metrics.avgLatency || 0,
        uptime: metrics.uptime || 0,

        // Pipeline Stats
        patternsDetected: metrics.alphaPatternsDetected || 0,
        signalsGenerated: metrics.alphaSignalsGenerated || 0,
        highQualitySignals: metrics.betaHighQuality || 0,
        avgConfidence: metrics.betaAvgConfidence || 0,

        // Quality Control
        gammaPassRate: metrics.gammaPassRate || 0,
        deltaPassRate: metrics.deltaPassRate || 0,
        qualityScore: metrics.deltaQualityScore || 0,
        currentRegime: metrics.currentRegime || 'UNKNOWN',

        // Active Data
        activeStrategies: metrics.strategiesActive || 0,
        activeSignals: activeSignals.length,
        dataRefreshRate: metrics.dataRefreshRate || 0,
      };

      return arenaMetrics;
    },
    refetchInterval: refreshInterval,
    staleTime: refreshInterval - 1000, // Stay fresh
    gcTime: refreshInterval * 2, // Minimal cache
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

/**
 * Get formatted uptime string
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Get status color based on value
 */
export function getStatusColor(value: number, thresholds: { good: number; warning: number }): string {
  if (value >= thresholds.good) return 'text-green-500';
  if (value >= thresholds.warning) return 'text-yellow-500';
  return 'text-red-500';
}

/**
 * Format percentage with color
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

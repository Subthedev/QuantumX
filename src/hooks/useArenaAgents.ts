/**
 * ULTRA-LIGHTWEIGHT ARENA AGENTS HOOK
 *
 * Provides real-time agent data from Intelligence Hub with aggressive caching
 * Optimized for minimal latency and buttery smooth performance
 */

import { useState, useEffect, useRef } from 'react';
import { arenaService, type ArenaAgent, type ArenaStats } from '@/services/arenaService';
import { globalHubService } from '@/services/globalHubService';

interface UseArenaAgentsResult {
  agents: ArenaAgent[];
  stats: ArenaStats | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: number;
}

/**
 * Hook for accessing live agent data with real-time updates
 * Default: 500ms refresh for ultra-fast live experience (millisecond-level updates)
 */
export function useArenaAgents(refreshInterval: number = 500): UseArenaAgentsResult {
  const [agents, setAgents] = useState<ArenaAgent[]>(() => {
    // ✅ INSTANT LOAD FROM CACHE on component mount
    try {
      const cached = localStorage.getItem('arena_agents_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 60000) {
          console.log('[Arena Hook] 🚀 Instant load from cache on mount');
          return parsed.agents;
        }
      }
    } catch (e) {
      console.warn('[Arena Hook] Cache error:', e);
    }
    return [];
  });

  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      try {
        console.log('[Arena Hook] 🚀 Starting parallel initialization...');

        // ✅ PARALLEL INITIALIZATION: Start Hub and Arena simultaneously
        const hubPromise = !globalHubService.isRunning()
          ? globalHubService.start().then(() => console.log('[Arena Hook] ✅ Hub started'))
          : Promise.resolve();

        const arenaPromise = arenaService.initialize();

        // Wait for both
        await Promise.all([hubPromise, arenaPromise]);
        console.log('[Arena Hook] ✅ Initialization complete');

        if (!mounted) return;

        // Get fresh data from service
        const freshAgents = arenaService.getAgents();
        const freshStats = arenaService.getStats();

        console.log('[Arena Hook] 📊 Fresh data:', freshAgents.length, 'agents');

        setAgents(freshAgents);
        setStats(freshStats);
        setLastUpdate(Date.now());
        setLoading(false);

        // Subscribe to real-time updates
        unsubscribe = arenaService.subscribe((updatedAgents, updatedStats) => {
          if (!mounted) return;

          setAgents(updatedAgents);
          setStats(updatedStats);
          setLastUpdate(Date.now());

          // ✅ CACHE FOR INSTANT LOAD: Save to localStorage for next page load
          try {
            localStorage.setItem('arena_agents_cache', JSON.stringify({
              agents: updatedAgents,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('[Arena Hook] Failed to cache agents:', e);
          }
        });

      } catch (err) {
        if (!mounted) return;

        console.error('[Arena Hook] ❌ Initialization error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize arena'));
        setLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      arenaService.destroy();
    };
  }, [refreshInterval]);

  // ✅ SMART LOADING STATE: Only show loading if we have NO agents AND still initializing
  const showLoading = agents.length === 0 && loading;

  return {
    agents,
    stats,
    loading: showLoading,
    error,
    lastUpdate
  };
}

/**
 * Get agents sorted by ranking (P&L descending)
 */
export function useRankedAgents(refreshInterval?: number) {
  const { agents, ...rest } = useArenaAgents(refreshInterval);

  const rankedAgents = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);

  return {
    agents: rankedAgents,
    ...rest
  };
}

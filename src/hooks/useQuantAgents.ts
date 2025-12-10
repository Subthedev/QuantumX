/**
 * QUANT AGENTS HOOK - Strategy-Driven Arena
 *
 * Syncs with arenaQuantEngine for real-time agent data.
 * Exposes strategy and market state information.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { arenaQuantEngine, type QuantAgent, type TradeEvent } from '@/services/arenaQuantEngine';
import { MarketState } from '@/services/marketStateDetectionEngine';
import { useToast } from '@/hooks/use-toast';

// Re-export types for convenience
export type { QuantAgent, TradeEvent };
export { MarketState };

export interface QuantArenaStats {
  totalTrades: number;
  totalPnLPercent: number;
  activeAgents: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  marketState: MarketState;
  // 24h metrics
  return24h?: number;
  trades24h?: number;
  wins24h?: number;
  winRate24h?: number;
}

interface UseQuantAgentsResult {
  agents: QuantAgent[];
  stats: QuantArenaStats | null;
  marketState: MarketState;
  loading: boolean;
  error: Error | null;
  lastUpdate: number;
  restoredTrades: number;
}

/**
 * Hook for accessing strategy-driven agent data
 */
export function useQuantAgents(_refreshInterval: number = 1000): UseQuantAgentsResult {
  const { toast } = useToast();
  const [agents, setAgents] = useState<QuantAgent[]>([]);
  const [stats, setStats] = useState<QuantArenaStats | null>(null);
  const [marketState, setMarketState] = useState<MarketState>(MarketState.RANGEBOUND);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [restoredTrades, setRestoredTrades] = useState(0);

  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  const syncFromEngine = useCallback(() => {
    if (!mountedRef.current) return;

    const quantAgents = arenaQuantEngine.getAgents();
    const engineStats = arenaQuantEngine.getStats();
    const currentState = arenaQuantEngine.getCurrentMarketState();

    setAgents(quantAgents);
    setMarketState(currentState);
    setStats({
      totalTrades: engineStats.totalTrades,
      totalPnLPercent: engineStats.totalPnL,
      activeAgents: quantAgents.filter(a => a.isActive).length,
      wins: engineStats.wins,
      losses: engineStats.losses,
      winRate: engineStats.winRate,
      marketState: currentState,
      // Include 24h metrics
      return24h: engineStats.return24h,
      trades24h: engineStats.trades24h,
      wins24h: engineStats.wins24h,
      winRate24h: engineStats.winRate24h
    });
    setLastUpdate(Date.now());
    setRestoredTrades(arenaQuantEngine.getRestoredTrades());
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      console.log('[Quant Hook] Already initialized, skipping');
      return;
    }
    initializedRef.current = true;
    mountedRef.current = true;

    console.log('[Quant Hook] Initializing strategy-driven arena...');

    const initialize = async () => {
      try {
        syncFromEngine();

        const initialTrades = arenaQuantEngine.getStats().totalTrades;
        console.log(`[Quant Hook] Initial sync: ${initialTrades} trades from engine`);

        if (!arenaQuantEngine.isActive()) {
          console.log('[Quant Hook] Starting quant engine...');
          await arenaQuantEngine.start();
        }

        if (!mountedRef.current) return;

        syncFromEngine();
        setLoading(false);

        console.log('[Quant Hook] ✅ Strategy-driven arena initialized');

      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[Quant Hook] Error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setLoading(false);
      }
    };

    initialize();

    // Subscribe to state changes
    const unsubscribeState = arenaQuantEngine.onStateChange((quantAgents) => {
      if (!mountedRef.current) return;

      const engineStats = arenaQuantEngine.getStats();
      const currentState = arenaQuantEngine.getCurrentMarketState();

      setAgents(quantAgents);
      setMarketState(currentState);
      setStats({
        totalTrades: engineStats.totalTrades,
        totalPnLPercent: engineStats.totalPnL,
        activeAgents: quantAgents.filter(a => a.isActive).length,
        wins: engineStats.wins,
        losses: engineStats.losses,
        winRate: engineStats.winRate,
        marketState: currentState,
        // Include 24h metrics
        return24h: engineStats.return24h,
        trades24h: engineStats.trades24h,
        wins24h: engineStats.wins24h,
        winRate24h: engineStats.winRate24h
      });
      setLastUpdate(Date.now());
    });

    // Subscribe to trade events for notifications
    const unsubscribeTrades = arenaQuantEngine.onTradeEvent((event: TradeEvent) => {
      if (!mountedRef.current) return;

      if (event.type === 'open') {
        toast({
          title: `${event.agent.name} [${event.position.strategy}]`,
          description: `Opened ${event.position.direction} ${event.position.displaySymbol} @ $${event.position.entryPrice.toFixed(2)}`,
          duration: 3000
        });
      } else if (event.type === 'close') {
        const isWin = event.isWin;
        toast({
          title: `${event.agent.name} ${event.reason}: ${event.pnlPercent?.toFixed(2)}%`,
          description: `${event.position.displaySymbol} closed via ${event.position.strategy}`,
          duration: 3000,
          variant: isWin ? 'default' : 'destructive'
        });
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribeState();
      unsubscribeTrades();
      console.log('[Quant Hook] Cleanup');
    };
  }, [toast, syncFromEngine]);

  return {
    agents,
    stats,
    marketState,
    loading: agents.length === 0 && loading,
    error,
    lastUpdate,
    restoredTrades
  };
}

/**
 * Get agents sorted by P&L (best first)
 */
export function useRankedQuantAgents(refreshInterval?: number) {
  const { agents, ...rest } = useQuantAgents(refreshInterval);
  const rankedAgents = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);

  return {
    agents: rankedAgents,
    ...rest
  };
}

/**
 * Get market state description
 */
export function getMarketStateDescription(state: MarketState): {
  label: string;
  description: string;
  color: string;
  bgColor: string;
} {
  const descriptions: Record<MarketState, { label: string; description: string; color: string; bgColor: string }> = {
    [MarketState.BULLISH_HIGH_VOL]: {
      label: 'Bullish High Vol',
      description: 'Strong uptrend with high volatility - AlphaX & GammaX shine',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    [MarketState.BULLISH_LOW_VOL]: {
      label: 'Bullish Low Vol',
      description: 'Steady uptrend with low volatility - AlphaX optimal',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    [MarketState.BEARISH_HIGH_VOL]: {
      label: 'Bearish High Vol',
      description: 'Strong downtrend with high volatility - GammaX dominates',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    [MarketState.BEARISH_LOW_VOL]: {
      label: 'Bearish Low Vol',
      description: 'Steady downtrend with low volatility - BetaX excels',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    [MarketState.RANGEBOUND]: {
      label: 'Rangebound',
      description: 'Sideways market with no clear trend - BetaX optimal',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  };

  return descriptions[state];
}

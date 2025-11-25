/**
 * ARENA AGENTS HOOK V4 - PRODUCTION BULLETPROOF
 *
 * Syncs with arenaLiveTrading engine for real-time agent data.
 * Properly handles persistence restoration.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { arenaLiveTrading, type LiveAgent, type TradeEvent } from '@/services/arenaLiveTrading';
import { useToast } from '@/hooks/use-toast';

// Interface for Arena UI
export interface ArenaAgent {
  id: string;
  name: string;
  totalPnLPercent: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  openPositions: number;
  // Additional fields
  codename?: string;
  avatar?: string;
  color?: string;
  glowColor?: string;
  riskProfile?: string;
  description?: string;
  balance?: number;
  wins?: number;
  losses?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  isActive?: boolean;
  currentPosition?: any;
  followers?: number;
  performance?: { time: string; pnl: number }[];
  // Streak tracking
  streakCount?: number;
  streakType?: 'WIN' | 'LOSS' | null;
  // Position with progress
  progressPercent?: number;
}

export interface ArenaStats {
  totalTrades: number;
  totalPnLPercent: number;
  activeAgents: number;
  wins?: number;
  losses?: number;
  winRate?: number;
}

interface UseArenaAgentsResult {
  agents: ArenaAgent[];
  stats: ArenaStats | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: number;
  restoredTrades: number;
}

/**
 * Convert LiveAgent to ArenaAgent format
 */
function toArenaAgent(agent: LiveAgent): ArenaAgent {
  return {
    id: agent.id,
    name: agent.name,
    totalPnLPercent: agent.totalPnLPercent,
    totalPnL: agent.totalPnL,
    totalTrades: agent.totalTrades,
    winRate: agent.winRate,
    openPositions: agent.currentPosition ? 1 : 0,
    codename: agent.codename,
    avatar: agent.avatar,
    color: agent.color,
    glowColor: agent.glowColor,
    riskProfile: agent.riskProfile,
    description: agent.description,
    balance: agent.balance,
    wins: agent.wins,
    losses: agent.losses,
    sharpeRatio: agent.sharpeRatio,
    maxDrawdown: agent.maxDrawdown,
    isActive: agent.isActive,
    currentPosition: agent.currentPosition,
    followers: agent.followers,
    performance: agent.performance,
    streakCount: agent.streakCount,
    streakType: agent.streakType
  };
}

/**
 * Hook for accessing live agent data with persistence
 */
export function useArenaAgents(_refreshInterval: number = 1000): UseArenaAgentsResult {
  const { toast } = useToast();
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [restoredTrades, setRestoredTrades] = useState(0);

  // Use ref to track initialization and prevent double-init in StrictMode
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  // Update state from engine
  const syncFromEngine = useCallback(() => {
    if (!mountedRef.current) return;

    const liveAgents = arenaLiveTrading.getAgents();
    const arenaAgents = liveAgents.map(toArenaAgent);
    const liveStats = arenaLiveTrading.getStats();

    setAgents(arenaAgents);
    setStats({
      totalTrades: liveStats.totalTrades,
      totalPnLPercent: liveStats.totalPnL,
      activeAgents: arenaAgents.filter(a => a.isActive).length,
      wins: liveStats.wins,
      losses: liveStats.losses,
      winRate: liveStats.winRate
    });
    setLastUpdate(Date.now());
    setRestoredTrades(arenaLiveTrading.getRestoredTrades());
  }, []);

  useEffect(() => {
    // Skip if already initialized (prevents StrictMode double-init)
    if (initializedRef.current) {
      console.log('[Arena Hook V4] Already initialized, skipping');
      return;
    }
    initializedRef.current = true;
    mountedRef.current = true;

    console.log('[Arena Hook V4] Initializing...');

    const initialize = async () => {
      try {
        // Get initial state IMMEDIATELY from engine (includes restored data)
        syncFromEngine();

        const initialTrades = arenaLiveTrading.getStats().totalTrades;
        console.log(`[Arena Hook V4] Initial sync: ${initialTrades} trades from engine`);

        // Start engine if not already running
        if (!arenaLiveTrading.isActive()) {
          console.log('[Arena Hook V4] Starting engine...');
          await arenaLiveTrading.start();
        }

        if (!mountedRef.current) return;

        // Sync again after start (in case start triggered any changes)
        syncFromEngine();
        setLoading(false);

        console.log('[Arena Hook V4] ✅ Initialization complete');

      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[Arena Hook V4] Error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setLoading(false);
      }
    };

    initialize();

    // Subscribe to state changes
    const unsubscribeState = arenaLiveTrading.onStateChange((liveAgents) => {
      if (!mountedRef.current) return;

      const arenaAgents = liveAgents.map(toArenaAgent);
      const liveStats = arenaLiveTrading.getStats();

      setAgents(arenaAgents);
      setStats({
        totalTrades: liveStats.totalTrades,
        totalPnLPercent: liveStats.totalPnL,
        activeAgents: arenaAgents.filter(a => a.isActive).length,
        wins: liveStats.wins,
        losses: liveStats.losses,
        winRate: liveStats.winRate
      });
      setLastUpdate(Date.now());
    });

    // Subscribe to trade events for notifications
    const unsubscribeTrades = arenaLiveTrading.onTradeEvent((event: TradeEvent) => {
      if (!mountedRef.current) return;

      if (event.type === 'open') {
        toast({
          title: `${event.agent.name} opened ${event.position.direction}`,
          description: `${event.position.displaySymbol} @ $${event.position.entryPrice.toFixed(2)}`,
          duration: 3000
        });
      } else if (event.type === 'close') {
        const isWin = event.isWin;
        toast({
          title: `${event.agent.name} ${event.reason}: ${event.pnlPercent?.toFixed(2)}%`,
          description: `${event.position.displaySymbol} closed`,
          duration: 3000,
          variant: isWin ? 'default' : 'destructive'
        });
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribeState();
      unsubscribeTrades();
      console.log('[Arena Hook V4] Cleanup');
    };
  }, [toast, syncFromEngine]);

  return {
    agents,
    stats,
    loading: agents.length === 0 && loading,
    error,
    lastUpdate,
    restoredTrades
  };
}

/**
 * Get agents sorted by P&L (best first)
 */
export function useRankedAgents(refreshInterval?: number) {
  const { agents, ...rest } = useArenaAgents(refreshInterval);
  const rankedAgents = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);

  return {
    agents: rankedAgents,
    ...rest
  };
}

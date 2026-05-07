/**
 * ARENA AGENTS HOOK V5 — single source of truth: arenaQuantEngine.
 *
 * Phase 0 fix: previously read from arenaLiveTrading (localStorage-only,
 * never reached Supabase) while ArenaClean.tsx read from arenaQuantEngine
 * (Supabase-backed). Same UI, two different data sources — out-of-sync stats
 * and "phantom" trades. Unified to arenaQuantEngine.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { arenaQuantEngine, type QuantAgent, type TradeEvent } from '@/services/arenaQuantEngine';
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

function toArenaAgent(agent: QuantAgent): ArenaAgent {
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
    streakType: agent.streakType,
  };
}

function buildStats(quantAgents: QuantAgent[]): ArenaStats {
  const engineStats = arenaQuantEngine.getStats();
  return {
    totalTrades: engineStats.totalTrades,
    totalPnLPercent: engineStats.totalPnL,
    activeAgents: quantAgents.filter(a => a.isActive).length,
    wins: engineStats.wins,
    losses: engineStats.losses,
    winRate: engineStats.winRate,
  };
}

export function useArenaAgents(_refreshInterval: number = 1000): UseArenaAgentsResult {
  const { toast } = useToast();
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [restoredTrades, setRestoredTrades] = useState(0);

  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  const syncFromEngine = useCallback(() => {
    if (!mountedRef.current) return;
    const quantAgents = arenaQuantEngine.getAgents();
    setAgents(quantAgents.map(toArenaAgent));
    setStats(buildStats(quantAgents));
    setLastUpdate(Date.now());
    setRestoredTrades(arenaQuantEngine.getRestoredTrades());
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      console.log('[Arena Hook V5] Already initialized, skipping');
      return;
    }
    initializedRef.current = true;
    mountedRef.current = true;

    console.log('[Arena Hook V5] Initializing arenaQuantEngine subscription...');

    const initialize = async () => {
      try {
        // Initial render from in-memory state (cache hydrated by engine init)
        syncFromEngine();

        // Start engine if not already running. arenaQuantEngine.start() awaits
        // its own Supabase initialization with a 5s timeout, so this is safe.
        if (!arenaQuantEngine.isActive()) {
          console.log('[Arena Hook V5] Starting arenaQuantEngine...');
          await arenaQuantEngine.start();
        }

        if (!mountedRef.current) return;

        syncFromEngine();
        setLoading(false);

        console.log('[Arena Hook V5] ✅ Initialization complete');
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[Arena Hook V5] Error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setLoading(false);
      }
    };

    initialize();

    const unsubscribeState = arenaQuantEngine.onStateChange((quantAgents) => {
      if (!mountedRef.current) return;
      setAgents(quantAgents.map(toArenaAgent));
      setStats(buildStats(quantAgents));
      setLastUpdate(Date.now());
    });

    const unsubscribeTrades = arenaQuantEngine.onTradeEvent((event: TradeEvent) => {
      if (!mountedRef.current) return;
      if (event.type === 'open') {
        toast({
          title: `${event.agent.name} opened ${event.position.direction}`,
          description: `${event.position.displaySymbol} @ $${event.position.entryPrice.toFixed(2)}`,
          duration: 3000,
        });
      } else if (event.type === 'close') {
        toast({
          title: `${event.agent.name} ${event.reason}: ${event.pnlPercent?.toFixed(2)}%`,
          description: `${event.position.displaySymbol} closed`,
          duration: 3000,
          variant: event.isWin ? 'default' : 'destructive',
        });
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribeState();
      unsubscribeTrades();
      console.log('[Arena Hook V5] Cleanup');
    };
  }, [toast, syncFromEngine]);

  return {
    agents,
    stats,
    loading: agents.length === 0 && loading,
    error,
    lastUpdate,
    restoredTrades,
  };
}

export function useRankedAgents(refreshInterval?: number) {
  const { agents, ...rest } = useArenaAgents(refreshInterval);
  const rankedAgents = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
  return { agents: rankedAgents, ...rest };
}

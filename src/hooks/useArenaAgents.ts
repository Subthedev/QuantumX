/**
 * ARENA AGENTS HOOKS
 *
 * React hooks for accessing and subscribing to Arena agent data.
 * Provides real-time updates with configurable refresh intervals.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { arenaService, type ArenaAgent, type ArenaStats } from '@/services/arenaService';

// =====================================================
// useArenaAgents - Get all agents with real-time updates
// =====================================================

export function useArenaAgents(refreshInterval: number = 1000) {
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to agent updates
    const unsubscribe = arenaService.subscribe((updatedAgents) => {
      setAgents(updatedAgents);
      setLoading(false);
    });

    // Start simulation for demo
    arenaService.startSimulation();

    // Set up refresh interval
    const interval = setInterval(() => {
      setAgents(arenaService.getAgents());
    }, refreshInterval);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshInterval]);

  return { agents, loading, error };
}

// =====================================================
// useRankedAgents - Get agents sorted by P&L
// =====================================================

export function useRankedAgents(refreshInterval: number = 1000) {
  const { agents, loading, error } = useArenaAgents(refreshInterval);

  const rankedAgents = useMemo(() => {
    return [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
  }, [agents]);

  return { agents: rankedAgents, loading, error };
}

// =====================================================
// useAgent - Get a specific agent by ID
// =====================================================

export function useAgent(agentId: string, refreshInterval: number = 1000) {
  const { agents, loading, error } = useArenaAgents(refreshInterval);

  const agent = useMemo(() => {
    return agents.find(a => a.id === agentId) || null;
  }, [agents, agentId]);

  return { agent, loading, error };
}

// =====================================================
// useArenaStats - Get overall arena statistics
// =====================================================

export function useArenaStats(refreshInterval: number = 5000) {
  const [stats, setStats] = useState<ArenaStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalTrades: 0,
    totalVolume: 0,
    avgWinRate: 0,
    topPerformer: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateStats = () => {
      setStats(arenaService.getStats());
      setLoading(false);
    };

    updateStats();
    const interval = setInterval(updateStats, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { stats, loading };
}

// =====================================================
// useTopPerformer - Get the current top performing agent
// =====================================================

export function useTopPerformer(refreshInterval: number = 1000) {
  const { agents, loading } = useRankedAgents(refreshInterval);

  const topPerformer = useMemo(() => {
    return agents[0] || null;
  }, [agents]);

  return { topPerformer, loading };
}

// =====================================================
// useAgentTrade - Track a specific agent's current trade
// =====================================================

export function useAgentTrade(agentId: string, refreshInterval: number = 500) {
  const { agent, loading } = useAgent(agentId, refreshInterval);

  return {
    trade: agent?.lastTrade || null,
    agent,
    loading,
  };
}

export default useArenaAgents;

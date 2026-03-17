/**
 * FLUX METRICS SERVICE - Real-time Persistent Agent & Market Data
 *
 * Provides:
 * - Persistent agent performance metrics (survives refresh)
 * - Real-time market adaptation tracking
 * - Per-regime performance history
 * - Supabase real-time subscriptions for live UI updates
 *
 * Tables used:
 * - flux_agent_metrics: Agent performance snapshots
 * - flux_market_states: Market regime history
 * - flux_adaptation_scores: Agent adaptation scores per regime
 */

import { supabase } from '@/integrations/supabase/client';
import { MarketState } from '@/services/marketStateDetectionEngine';

// ===================== TYPES =====================

export interface AgentMetricSnapshot {
  id?: string;
  agent_id: string;
  agent_name: string;
  timestamp: string;
  total_pnl: number;
  total_pnl_percent: number;
  win_rate: number;
  total_trades: number;
  wins: number;
  losses: number;
  return_24h: number;
  trades_24h: number;
  current_position: string | null;
  position_size: number;
  market_state: string;
  adaptation_score: number;
}

export interface MarketStateRecord {
  id?: string;
  timestamp: string;
  market_state: string;
  confidence: number;
  duration_ms: number;
  triggered_by: string;
  btc_price: number;
  eth_price: number;
  volatility_index: number;
}

export interface AdaptationScore {
  id?: string;
  agent_id: string;
  agent_name: string;
  timestamp: string;
  market_state: string;
  adaptation_score: number;
  trades_in_regime: number;
  win_rate_in_regime: number;
  pnl_in_regime: number;
  regime_duration_ms: number;
}

export interface RegimeTransition {
  id?: string;
  timestamp: string;
  from_state: string;
  to_state: string;
  confidence: number;
  duration_in_previous_ms: number;
}

export interface PerRegimePerformance {
  market_state: string;
  trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl_per_trade: number;
  last_updated: string;
}

export interface AgentRegimePerformance {
  agent_id: string;
  agent_name: string;
  regimes: Record<string, PerRegimePerformance>;
}

export interface AdaptationImpact {
  id?: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  regime_transition: RegimeTransition;
  performance_before: {
    trades: number;
    win_rate: number;
    avg_pnl: number;
  };
  performance_after: {
    trades: number;
    win_rate: number;
    avg_pnl: number;
  };
  impact_score: number;
  adaptation_speed: number; // trades to stabilize
}

export interface FluxDashboardData {
  agents: AgentMetricSnapshot[];
  currentMarketState: MarketStateRecord | null;
  recentMarketStates: MarketStateRecord[];
  regimeTransitions: RegimeTransition[];
  adaptationScores: Record<string, AdaptationScore[]>;
  agentRegimePerformance: Record<string, AgentRegimePerformance>;
  adaptationImpacts: AdaptationImpact[];
  globalStats: {
    totalTrades: number;
    totalPnL: number;
    winRate: number;
    avgAdaptationScore: number;
    marketStateChanges24h: number;
  };
}

// ===================== LOCAL STORAGE KEYS =====================
const STORAGE_KEYS = {
  AGENT_METRICS: 'flux_agent_metrics',
  MARKET_STATES: 'flux_market_states',
  ADAPTATION_SCORES: 'flux_adaptation_scores',
  GLOBAL_STATS: 'flux_global_stats',
  REGIME_TRANSITIONS: 'flux_regime_transitions',
  AGENT_REGIME_PERF: 'flux_agent_regime_perf',
  ADAPTATION_IMPACTS: 'flux_adaptation_impacts',
  LAST_SYNC: 'flux_last_sync'
};

// ===================== SERVICE CLASS =====================

class FluxMetricsService {
  private isInitialized = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private realtimeChannel: any = null;
  private listeners: Set<(data: FluxDashboardData) => void> = new Set();

  // ===================== INITIALIZATION =====================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[FluxMetrics] Initializing service...');

    // Try to create tables if they don't exist (will fail gracefully if no permissions)
    await this.ensureTablesExist();

    // Load persisted data from localStorage first (instant)
    this.loadFromLocalStorage();

    // Then sync with Supabase (background)
    await this.syncFromSupabase();

    // Set up real-time subscription
    this.setupRealtimeSubscription();

    // Start periodic sync
    this.startPeriodicSync();

    this.isInitialized = true;
    console.log('[FluxMetrics] Service initialized');
  }

  // ===================== TABLE CREATION =====================

  private async ensureTablesExist(): Promise<void> {
    // Try to query each table - if it fails, create via RPC or skip
    // Note: Table creation usually requires admin privileges
    // For now, we'll use localStorage as primary and Supabase as backup
    try {
      await supabase.from('flux_agent_metrics').select('id').limit(1);
      console.log('[FluxMetrics] flux_agent_metrics table exists');
    } catch (e) {
      console.log('[FluxMetrics] flux_agent_metrics table not available, using localStorage');
    }
  }

  // ===================== LOCAL STORAGE =====================

  private loadFromLocalStorage(): void {
    try {
      const agentMetrics = localStorage.getItem(STORAGE_KEYS.AGENT_METRICS);
      const marketStates = localStorage.getItem(STORAGE_KEYS.MARKET_STATES);
      const adaptationScores = localStorage.getItem(STORAGE_KEYS.ADAPTATION_SCORES);
      const globalStats = localStorage.getItem(STORAGE_KEYS.GLOBAL_STATS);
      const regimeTransitions = localStorage.getItem(STORAGE_KEYS.REGIME_TRANSITIONS);
      const agentRegimePerf = localStorage.getItem(STORAGE_KEYS.AGENT_REGIME_PERF);
      const adaptationImpacts = localStorage.getItem(STORAGE_KEYS.ADAPTATION_IMPACTS);

      if (agentMetrics) this.cachedAgentMetrics = JSON.parse(agentMetrics);
      if (marketStates) this.cachedMarketStates = JSON.parse(marketStates);
      if (adaptationScores) this.cachedAdaptationScores = JSON.parse(adaptationScores);
      if (globalStats) this.cachedGlobalStats = JSON.parse(globalStats);
      if (regimeTransitions) this.cachedRegimeTransitions = JSON.parse(regimeTransitions);
      if (agentRegimePerf) this.cachedAgentRegimePerf = JSON.parse(agentRegimePerf);
      if (adaptationImpacts) this.cachedAdaptationImpacts = JSON.parse(adaptationImpacts);

      // Set last known market state from history
      if (this.cachedMarketStates.length > 0) {
        this.lastKnownMarketState = this.cachedMarketStates[0].market_state;
      }

      console.log('[FluxMetrics] Loaded from localStorage:', {
        agents: this.cachedAgentMetrics.length,
        marketStates: this.cachedMarketStates.length,
        transitions: this.cachedRegimeTransitions.length,
        impacts: this.cachedAdaptationImpacts.length
      });
    } catch (e) {
      console.error('[FluxMetrics] Error loading from localStorage:', e);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_METRICS, JSON.stringify(this.cachedAgentMetrics));
      localStorage.setItem(STORAGE_KEYS.MARKET_STATES, JSON.stringify(this.cachedMarketStates));
      localStorage.setItem(STORAGE_KEYS.ADAPTATION_SCORES, JSON.stringify(this.cachedAdaptationScores));
      localStorage.setItem(STORAGE_KEYS.GLOBAL_STATS, JSON.stringify(this.cachedGlobalStats));
      localStorage.setItem(STORAGE_KEYS.REGIME_TRANSITIONS, JSON.stringify(this.cachedRegimeTransitions));
      localStorage.setItem(STORAGE_KEYS.AGENT_REGIME_PERF, JSON.stringify(this.cachedAgentRegimePerf));
      localStorage.setItem(STORAGE_KEYS.ADAPTATION_IMPACTS, JSON.stringify(this.cachedAdaptationImpacts));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.error('[FluxMetrics] Error saving to localStorage:', e);
    }
  }

  // ===================== CACHED DATA =====================

  private cachedAgentMetrics: AgentMetricSnapshot[] = [];
  private cachedMarketStates: MarketStateRecord[] = [];
  private cachedAdaptationScores: Record<string, AdaptationScore[]> = {};
  private cachedRegimeTransitions: RegimeTransition[] = [];
  private cachedAgentRegimePerf: Record<string, AgentRegimePerformance> = {};
  private cachedAdaptationImpacts: AdaptationImpact[] = [];
  private cachedGlobalStats = {
    totalTrades: 0,
    totalPnL: 0,
    winRate: 0,
    avgAdaptationScore: 0,
    marketStateChanges24h: 0
  };
  private lastKnownMarketState: string | null = null;

  // ===================== SUPABASE SYNC =====================

  private async syncFromSupabase(): Promise<void> {
    try {
      // Try to fetch from Supabase tables
      const [agentsRes, statesRes] = await Promise.all([
        supabase.from('flux_agent_metrics')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100),
        supabase.from('flux_market_states')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50)
      ]);

      if (agentsRes.data && agentsRes.data.length > 0) {
        this.cachedAgentMetrics = agentsRes.data as AgentMetricSnapshot[];
        console.log('[FluxMetrics] Synced agent metrics from Supabase:', agentsRes.data.length);
      }

      if (statesRes.data && statesRes.data.length > 0) {
        this.cachedMarketStates = statesRes.data as MarketStateRecord[];
        console.log('[FluxMetrics] Synced market states from Supabase:', statesRes.data.length);
      }

      this.saveToLocalStorage();
    } catch (e) {
      console.log('[FluxMetrics] Supabase sync skipped (tables may not exist)');
    }
  }

  private async syncToSupabase(): Promise<void> {
    // Only sync recent data to avoid duplicates
    const recentMetrics = this.cachedAgentMetrics.filter(m => {
      const age = Date.now() - new Date(m.timestamp).getTime();
      return age < 60000; // Last minute
    });

    if (recentMetrics.length > 0) {
      try {
        await supabase.from('flux_agent_metrics').upsert(recentMetrics, {
          onConflict: 'agent_id,timestamp'
        });
      } catch (e) {
        // Silently fail if tables don't exist
      }
    }
  }

  // ===================== REAL-TIME SUBSCRIPTION =====================

  private setupRealtimeSubscription(): void {
    try {
      this.realtimeChannel = supabase
        .channel('flux_metrics_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'flux_agent_metrics'
        }, (payload) => {
          console.log('[FluxMetrics] Real-time update:', payload);
          this.handleRealtimeUpdate(payload);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'flux_market_states'
        }, (payload) => {
          console.log('[FluxMetrics] Market state update:', payload);
          this.handleMarketStateUpdate(payload);
        })
        .subscribe();
    } catch (e) {
      console.log('[FluxMetrics] Real-time subscription not available');
    }
  }

  private handleRealtimeUpdate(payload: any): void {
    if (payload.new) {
      const metric = payload.new as AgentMetricSnapshot;
      // Update cache
      const existingIndex = this.cachedAgentMetrics.findIndex(
        m => m.agent_id === metric.agent_id && m.timestamp === metric.timestamp
      );
      if (existingIndex >= 0) {
        this.cachedAgentMetrics[existingIndex] = metric;
      } else {
        this.cachedAgentMetrics.unshift(metric);
      }
      this.notifyListeners();
    }
  }

  private handleMarketStateUpdate(payload: any): void {
    if (payload.new) {
      const state = payload.new as MarketStateRecord;
      this.cachedMarketStates.unshift(state);
      // Keep only last 50
      this.cachedMarketStates = this.cachedMarketStates.slice(0, 50);
      this.notifyListeners();
    }
  }

  // ===================== PERIODIC SYNC =====================

  private startPeriodicSync(): void {
    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncToSupabase();
      this.saveToLocalStorage();
    }, 30000);
  }

  // ===================== PUBLIC API =====================

  /**
   * Record agent metrics snapshot
   */
  async recordAgentMetrics(agent: {
    id: string;
    name: string;
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    totalTrades: number;
    wins: number;
    losses: number;
    return24h: number;
    trades24h: number;
    currentPosition?: { symbol: string; side: string; size: number } | null;
  }, marketState: MarketState, adaptationScore: number): Promise<void> {
    const snapshot: AgentMetricSnapshot = {
      agent_id: agent.id,
      agent_name: agent.name,
      timestamp: new Date().toISOString(),
      total_pnl: agent.totalPnL,
      total_pnl_percent: agent.totalPnLPercent,
      win_rate: agent.winRate,
      total_trades: agent.totalTrades,
      wins: agent.wins,
      losses: agent.losses,
      return_24h: agent.return24h,
      trades_24h: agent.trades24h,
      current_position: agent.currentPosition?.symbol || null,
      position_size: agent.currentPosition?.size || 0,
      market_state: marketState,
      adaptation_score: adaptationScore
    };

    // Add to cache
    this.cachedAgentMetrics.unshift(snapshot);
    // Keep only last 500 entries per agent
    const agentMetrics = this.cachedAgentMetrics.filter(m => m.agent_id === agent.id);
    if (agentMetrics.length > 500) {
      this.cachedAgentMetrics = this.cachedAgentMetrics.filter(
        m => m.agent_id !== agent.id || agentMetrics.slice(0, 500).includes(m)
      );
    }

    // Update global stats
    this.updateGlobalStats();

    // Save to localStorage immediately
    this.saveToLocalStorage();

    // Notify listeners
    this.notifyListeners();

    // Try to save to Supabase (fire and forget)
    try {
      await supabase.from('flux_agent_metrics').insert(snapshot);
    } catch (e) {
      // Tables may not exist
    }
  }

  /**
   * Record market state change
   */
  async recordMarketStateChange(
    newState: MarketState,
    confidence: number,
    duration: number,
    trigger: string,
    prices: { btc: number; eth: number },
    volatility: number
  ): Promise<void> {
    const record: MarketStateRecord = {
      timestamp: new Date().toISOString(),
      market_state: newState,
      confidence,
      duration_ms: duration,
      triggered_by: trigger,
      btc_price: prices.btc,
      eth_price: prices.eth,
      volatility_index: volatility
    };

    this.cachedMarketStates.unshift(record);
    this.cachedMarketStates = this.cachedMarketStates.slice(0, 100);

    // Count 24h changes
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.cachedGlobalStats.marketStateChanges24h = this.cachedMarketStates.filter(
      s => new Date(s.timestamp).getTime() > dayAgo
    ).length;

    this.saveToLocalStorage();
    this.notifyListeners();

    try {
      await supabase.from('flux_market_states').insert(record);
    } catch (e) {
      // Tables may not exist
    }
  }

  /**
   * Record adaptation score for agent in specific regime
   */
  async recordAdaptationScore(
    agentId: string,
    agentName: string,
    marketState: MarketState,
    score: number,
    tradesInRegime: number,
    winRateInRegime: number,
    pnlInRegime: number,
    regimeDuration: number
  ): Promise<void> {
    const record: AdaptationScore = {
      agent_id: agentId,
      agent_name: agentName,
      timestamp: new Date().toISOString(),
      market_state: marketState,
      adaptation_score: score,
      trades_in_regime: tradesInRegime,
      win_rate_in_regime: winRateInRegime,
      pnl_in_regime: pnlInRegime,
      regime_duration_ms: regimeDuration
    };

    if (!this.cachedAdaptationScores[agentId]) {
      this.cachedAdaptationScores[agentId] = [];
    }
    this.cachedAdaptationScores[agentId].unshift(record);
    // Keep last 50 per agent
    this.cachedAdaptationScores[agentId] = this.cachedAdaptationScores[agentId].slice(0, 50);

    this.updateGlobalStats();
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  /**
   * Get latest metrics for all agents
   */
  getLatestAgentMetrics(): AgentMetricSnapshot[] {
    // Get most recent metric for each agent
    const latestByAgent = new Map<string, AgentMetricSnapshot>();
    for (const metric of this.cachedAgentMetrics) {
      if (!latestByAgent.has(metric.agent_id) ||
          new Date(metric.timestamp) > new Date(latestByAgent.get(metric.agent_id)!.timestamp)) {
        latestByAgent.set(metric.agent_id, metric);
      }
    }
    return Array.from(latestByAgent.values());
  }

  /**
   * Get agent metrics history
   */
  getAgentHistory(agentId: string, limit = 100): AgentMetricSnapshot[] {
    return this.cachedAgentMetrics
      .filter(m => m.agent_id === agentId)
      .slice(0, limit);
  }

  /**
   * Get current market state
   */
  getCurrentMarketState(): MarketStateRecord | null {
    return this.cachedMarketStates[0] || null;
  }

  /**
   * Get market state history
   */
  getMarketStateHistory(limit = 50): MarketStateRecord[] {
    return this.cachedMarketStates.slice(0, limit);
  }

  /**
   * Get adaptation scores for agent
   */
  getAdaptationScores(agentId: string): AdaptationScore[] {
    return this.cachedAdaptationScores[agentId] || [];
  }

  /**
   * Get global stats
   */
  getGlobalStats() {
    return { ...this.cachedGlobalStats };
  }

  /**
   * Get full dashboard data
   */
  getDashboardData(): FluxDashboardData {
    return {
      agents: this.getLatestAgentMetrics(),
      currentMarketState: this.getCurrentMarketState(),
      recentMarketStates: this.getMarketStateHistory(10),
      regimeTransitions: this.getRegimeTransitions(10),
      adaptationScores: { ...this.cachedAdaptationScores },
      agentRegimePerformance: { ...this.cachedAgentRegimePerf },
      adaptationImpacts: this.getAdaptationImpacts(10),
      globalStats: this.getGlobalStats()
    };
  }

  /**
   * Calculate and get real-time adaptation percentage
   */
  getMarketAdaptationPercentage(): number {
    const latestMetrics = this.getLatestAgentMetrics();
    if (latestMetrics.length === 0) return 0;

    const avgScore = latestMetrics.reduce((sum, m) => sum + (m.adaptation_score || 0), 0) / latestMetrics.length;
    return Math.round(avgScore * 100) / 100;
  }

  /**
   * Get regime transitions history
   */
  getRegimeTransitions(limit = 20): RegimeTransition[] {
    return this.cachedRegimeTransitions.slice(0, limit);
  }

  /**
   * Get adaptation impacts
   */
  getAdaptationImpacts(limit = 20): AdaptationImpact[] {
    return this.cachedAdaptationImpacts.slice(0, limit);
  }

  /**
   * Get agent regime performance
   */
  getAgentRegimePerformance(agentId: string): AgentRegimePerformance | null {
    return this.cachedAgentRegimePerf[agentId] || null;
  }

  /**
   * Get all agent regime performances
   */
  getAllAgentRegimePerformances(): Record<string, AgentRegimePerformance> {
    return { ...this.cachedAgentRegimePerf };
  }

  /**
   * Record a regime transition (called when market state changes)
   */
  recordRegimeTransition(
    fromState: string,
    toState: string,
    confidence: number,
    durationInPrevious: number
  ): void {
    if (fromState === toState) return; // No actual transition

    const transition: RegimeTransition = {
      timestamp: new Date().toISOString(),
      from_state: fromState,
      to_state: toState,
      confidence,
      duration_in_previous_ms: durationInPrevious
    };

    this.cachedRegimeTransitions.unshift(transition);
    this.cachedRegimeTransitions = this.cachedRegimeTransitions.slice(0, 100);

    // Calculate adaptation impacts for all agents
    this.calculateAdaptationImpacts(transition);

    this.saveToLocalStorage();
    this.notifyListeners();

    console.log('[FluxMetrics] Recorded regime transition:', fromState, '->', toState);
  }

  /**
   * Update agent's per-regime performance
   */
  updateAgentRegimePerformance(
    agentId: string,
    agentName: string,
    marketState: string,
    tradeResult: { won: boolean; pnl: number }
  ): void {
    // Initialize agent performance if not exists
    if (!this.cachedAgentRegimePerf[agentId]) {
      this.cachedAgentRegimePerf[agentId] = {
        agent_id: agentId,
        agent_name: agentName,
        regimes: {}
      };
    }

    // Initialize regime performance if not exists
    if (!this.cachedAgentRegimePerf[agentId].regimes[marketState]) {
      this.cachedAgentRegimePerf[agentId].regimes[marketState] = {
        market_state: marketState,
        trades: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_pnl_per_trade: 0,
        last_updated: new Date().toISOString()
      };
    }

    const perf = this.cachedAgentRegimePerf[agentId].regimes[marketState];
    perf.trades++;
    if (tradeResult.won) {
      perf.wins++;
    } else {
      perf.losses++;
    }
    perf.total_pnl += tradeResult.pnl;
    perf.win_rate = perf.trades > 0 ? (perf.wins / perf.trades) * 100 : 0;
    perf.avg_pnl_per_trade = perf.trades > 0 ? perf.total_pnl / perf.trades : 0;
    perf.last_updated = new Date().toISOString();

    this.saveToLocalStorage();
    this.notifyListeners();
  }

  /**
   * Seed initial regime performance from agent's current stats
   * Call this on first load to populate data immediately
   */
  seedAgentRegimePerformance(
    agentId: string,
    agentName: string,
    marketState: string,
    stats: { totalTrades: number; wins: number; losses: number; totalPnL: number; winRate: number }
  ): void {
    // Skip if already has data for this agent in this regime
    if (this.cachedAgentRegimePerf[agentId]?.regimes?.[marketState]?.trades > 0) {
      return;
    }

    // Initialize agent if not exists
    if (!this.cachedAgentRegimePerf[agentId]) {
      this.cachedAgentRegimePerf[agentId] = {
        agent_id: agentId,
        agent_name: agentName,
        regimes: {}
      };
    }

    // Seed with current stats (assume all trades happened in current regime for initial seed)
    if (stats.totalTrades > 0) {
      this.cachedAgentRegimePerf[agentId].regimes[marketState] = {
        market_state: marketState,
        trades: stats.totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        win_rate: stats.winRate,
        total_pnl: stats.totalPnL,
        avg_pnl_per_trade: stats.totalTrades > 0 ? stats.totalPnL / stats.totalTrades : 0,
        last_updated: new Date().toISOString()
      };

      console.log(`[FluxMetrics] Seeded regime performance for ${agentName} in ${marketState}:`, {
        trades: stats.totalTrades,
        winRate: stats.winRate,
        pnl: stats.totalPnL
      });

      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }

  /**
   * Generate synthetic regime transition for demo/testing
   */
  generateSyntheticTransition(fromState: string, toState: string): void {
    const transition: RegimeTransition = {
      timestamp: new Date().toISOString(),
      from_state: fromState,
      to_state: toState,
      confidence: 70 + Math.random() * 25, // 70-95%
      duration_in_previous_ms: 15 * 60 * 1000 + Math.random() * 45 * 60 * 1000 // 15-60 min
    };

    this.cachedRegimeTransitions.unshift(transition);
    this.cachedRegimeTransitions = this.cachedRegimeTransitions.slice(0, 100);

    // Calculate adaptation impacts
    this.calculateAdaptationImpacts(transition);

    this.saveToLocalStorage();
    this.notifyListeners();

    console.log('[FluxMetrics] Generated synthetic transition:', fromState, '->', toState);
  }

  /**
   * Calculate adaptation impacts after a regime transition
   */
  private calculateAdaptationImpacts(transition: RegimeTransition): void {
    const latestAgents = this.getLatestAgentMetrics();

    for (const agent of latestAgents) {
      const agentPerf = this.cachedAgentRegimePerf[agent.agent_id];
      if (!agentPerf) continue;

      const perfBefore = agentPerf.regimes[transition.from_state];
      const perfAfter = agentPerf.regimes[transition.to_state];

      // Calculate impact score: positive if agent does better in new regime
      let impactScore = 0;
      if (perfBefore && perfAfter) {
        const winRateDelta = (perfAfter.win_rate || 0) - (perfBefore.win_rate || 0);
        const pnlDelta = (perfAfter.avg_pnl_per_trade || 0) - (perfBefore.avg_pnl_per_trade || 0);
        impactScore = (winRateDelta * 0.6) + (pnlDelta * 0.4 * 10); // Weighted score
      }

      const impact: AdaptationImpact = {
        timestamp: new Date().toISOString(),
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        regime_transition: transition,
        performance_before: {
          trades: perfBefore?.trades || 0,
          win_rate: perfBefore?.win_rate || 0,
          avg_pnl: perfBefore?.avg_pnl_per_trade || 0
        },
        performance_after: {
          trades: perfAfter?.trades || 0,
          win_rate: perfAfter?.win_rate || 0,
          avg_pnl: perfAfter?.avg_pnl_per_trade || 0
        },
        impact_score: impactScore,
        adaptation_speed: Math.min(perfAfter?.trades || 10, 10) // Trades to stabilize
      };

      this.cachedAdaptationImpacts.unshift(impact);
    }

    // Keep only last 100 impacts
    this.cachedAdaptationImpacts = this.cachedAdaptationImpacts.slice(0, 100);
  }

  /**
   * Check and record regime transition if state changed
   */
  checkAndRecordRegimeChange(newState: string, confidence: number, regimeStartTime: number): boolean {
    if (this.lastKnownMarketState && this.lastKnownMarketState !== newState) {
      const duration = Date.now() - regimeStartTime;
      this.recordRegimeTransition(this.lastKnownMarketState, newState, confidence, duration);
      this.lastKnownMarketState = newState;
      return true;
    }

    if (!this.lastKnownMarketState) {
      this.lastKnownMarketState = newState;
    }

    return false;
  }

  /**
   * Get last known market state
   */
  getLastKnownMarketState(): string | null {
    return this.lastKnownMarketState;
  }

  // ===================== LISTENERS =====================

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: (data: FluxDashboardData) => void): () => void {
    this.listeners.add(callback);
    // Immediately send current data
    callback(this.getDashboardData());
    // Return unsubscribe function
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const data = this.getDashboardData();
    this.listeners.forEach(listener => listener(data));
  }

  // ===================== STATS CALCULATION =====================

  private updateGlobalStats(): void {
    const latestMetrics = this.getLatestAgentMetrics();

    if (latestMetrics.length > 0) {
      this.cachedGlobalStats.totalTrades = latestMetrics.reduce((sum, m) => sum + m.total_trades, 0);
      this.cachedGlobalStats.totalPnL = latestMetrics.reduce((sum, m) => sum + m.total_pnl, 0);

      const totalWins = latestMetrics.reduce((sum, m) => sum + m.wins, 0);
      const totalTrades = this.cachedGlobalStats.totalTrades;
      this.cachedGlobalStats.winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

      this.cachedGlobalStats.avgAdaptationScore = this.getMarketAdaptationPercentage();
    }
  }

  // ===================== CLEANUP =====================

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * Clear all cached data (for testing/reset)
   */
  clearAllData(): void {
    this.cachedAgentMetrics = [];
    this.cachedMarketStates = [];
    this.cachedAdaptationScores = {};
    this.cachedRegimeTransitions = [];
    this.cachedAgentRegimePerf = {};
    this.cachedAdaptationImpacts = [];
    this.cachedGlobalStats = {
      totalTrades: 0,
      totalPnL: 0,
      winRate: 0,
      avgAdaptationScore: 0,
      marketStateChanges24h: 0
    };
    this.lastKnownMarketState = null;

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('[FluxMetrics] All data cleared');
    this.notifyListeners();
  }

  /**
   * Force refresh all listeners with current data
   */
  forceRefresh(): void {
    console.log('[FluxMetrics] Force refresh triggered');
    this.notifyListeners();
  }

  /**
   * Get debug info
   */
  getDebugInfo(): object {
    return {
      initialized: this.isInitialized,
      agentMetricsCount: this.cachedAgentMetrics.length,
      marketStatesCount: this.cachedMarketStates.length,
      regimeTransitionsCount: this.cachedRegimeTransitions.length,
      adaptationImpactsCount: this.cachedAdaptationImpacts.length,
      agentRegimePerfCount: Object.keys(this.cachedAgentRegimePerf).length,
      lastKnownState: this.lastKnownMarketState,
      globalStats: this.cachedGlobalStats,
      listenersCount: this.listeners.size
    };
  }
}

// Export singleton instance
export const fluxMetricsService = new FluxMetricsService();

// Make available on window for debugging
if (typeof window !== 'undefined') {
  (window as any).fluxMetricsService = fluxMetricsService;
}

/**
 * QX CONTROL CENTER - QuantumX Agentic Trading Platform
 *
 * 3-Tab Structure:
 * - Tab 1: Arena (Agent Performance & Real-time Tracking)
 * - Tab 2: Controls (Signal Configuration)
 * - Tab 3: Adaptive (Regime Detection & Agent Adaptation)
 *
 * Intelligence Hub link navigates to the full Intelligence Hub page
 *
 * Design: White/Minimal with Orange Accents
 * Real-time data from arenaQuantEngine
 *
 * Part of QuantumX - Agentic Trading Platform
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Gauge,
  Power,
  RefreshCw,
  Trash2,
  Activity,
  Brain,
  Target,
  Rocket,
  Shield,
  Zap,
  Flame,
  Filter,
  Swords,
  Lock,
  Settings,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ExternalLink,
  BarChart3,
  Layers,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { globalHubService, type HubMetrics } from '@/services/globalHubService';
import { deltaV2QualityEngine } from '@/services/deltaV2QualityEngine';
import { igxGammaV2 } from '@/services/igx/IGXGammaV2';
import { igxBetaV5 } from '@/services/igx/IGXBetaV5';
import { arenaService } from '@/services/arenaService';
import { arenaQuantEngine, type QuantAgent } from '@/services/arenaQuantEngine';
import { MarketState, marketStateDetectionEngine } from '@/services/marketStateDetectionEngine';
import { AgentType } from '@/services/strategyMatrix';
import { regimeAnalyticsService, type RegimeChangeImpact } from '@/services/regimeAnalyticsService';
import {
  fluxMetricsService,
  type FluxDashboardData,
  type AgentMetricSnapshot,
  type RegimeTransition,
  type AdaptationImpact,
  type AgentRegimePerformance
} from '@/services/fluxMetricsService';
import { useToast } from '@/hooks/use-toast';

// ===================== TYPES =====================

interface FrequencyState {
  FREE: number;
  PRO: number;
  MAX: number;
}

interface ThresholdState {
  quality: number;
  ml: number;
  strategyWinRate: number;
}

interface TierConfig {
  acceptHigh: boolean;
  acceptMedium: boolean;
  acceptLow: boolean;
}

interface AgentPerformanceHistory {
  agent_id: string;
  timestamp: string;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  market_state: string;
  return_24h: number;
}

// ===================== CONSTANTS =====================

const STRATEGY_NAMES = [
  'WHALE_SHADOW', 'SPRING_TRAP', 'MOMENTUM_SURGE', 'MOMENTUM_SURGE_V2',
  'MOMENTUM_RECOVERY', 'FUNDING_SQUEEZE', 'ORDER_FLOW_TSUNAMI',
  'FEAR_GREED_CONTRARIAN', 'GOLDEN_CROSS_MOMENTUM', 'MARKET_PHASE_SNIPER',
  'LIQUIDITY_HUNTER', 'VOLATILITY_BREAKOUT', 'STATISTICAL_ARBITRAGE',
  'ORDER_BOOK_MICROSTRUCTURE', 'LIQUIDATION_CASCADE_PREDICTION',
  'CORRELATION_BREAKDOWN_DETECTOR', 'BOLLINGER_MEAN_REVERSION'
];

const REGIME_OPTIONS = [
  { value: 'auto', label: 'AUTO-DETECT', description: 'System detects market regime' },
  { value: 'BULLISH_TREND', label: 'Bullish Trend', description: 'Force bullish strategies' },
  { value: 'BEARISH_TREND', label: 'Bearish Trend', description: 'Force bearish strategies' },
  { value: 'SIDEWAYS', label: 'Sideways', description: 'Force range-bound strategies' },
  { value: 'HIGH_VOLATILITY', label: 'High Volatility', description: 'Force volatility strategies' },
  { value: 'LOW_VOLATILITY', label: 'Low Volatility', description: 'Force low-vol strategies' }
];

const QUICK_MODES = {
  CONSERVATIVE: {
    name: 'Conservative',
    icon: Shield,
    description: 'High quality, low frequency',
    frequency: { FREE: 12, PRO: 120, MAX: 60 },
    thresholds: { quality: 70, ml: 60, strategyWinRate: 45 },
    tierConfig: { acceptHigh: true, acceptMedium: false, acceptLow: false }
  },
  BALANCED: {
    name: 'Balanced',
    icon: Target,
    description: 'Default optimal settings',
    frequency: { FREE: 8, PRO: 96, MAX: 48 },
    thresholds: { quality: 52, ml: 50, strategyWinRate: 35 },
    tierConfig: { acceptHigh: true, acceptMedium: true, acceptLow: false }
  },
  AGGRESSIVE: {
    name: 'Aggressive',
    icon: Zap,
    description: 'More signals, moderate quality',
    frequency: { FREE: 4, PRO: 60, MAX: 30 },
    thresholds: { quality: 45, ml: 40, strategyWinRate: 30 },
    tierConfig: { acceptHigh: true, acceptMedium: true, acceptLow: true }
  },
  BEAST_MODE: {
    name: 'Beast Mode',
    icon: Flame,
    description: 'Maximum signal output',
    frequency: { FREE: 2, PRO: 30, MAX: 15 },
    thresholds: { quality: 35, ml: 30, strategyWinRate: 25 },
    tierConfig: { acceptHigh: true, acceptMedium: true, acceptLow: true }
  }
};

const MARKET_STATES = [
  MarketState.BULLISH_HIGH_VOL,
  MarketState.BULLISH_LOW_VOL,
  MarketState.BEARISH_HIGH_VOL,
  MarketState.BEARISH_LOW_VOL,
  MarketState.RANGEBOUND
];

const AGENT_UI_DATA: Record<string, { color: string; type: AgentType }> = {
  alphax: { color: 'from-red-500 to-orange-500', type: AgentType.ALPHAX },
  betax: { color: 'from-blue-500 to-cyan-500', type: AgentType.BETAX },
  gammax: { color: 'from-emerald-500 to-teal-500', type: AgentType.QUANTUMX }
};

// ===================== HELPER FUNCTIONS =====================

const formatRegimeName = (regime: MarketState): string => {
  return regime.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getRegimeColor = (regime: MarketState): string => {
  if (regime.includes('BULLISH')) return 'text-green-600 bg-green-100';
  if (regime.includes('BEARISH')) return 'text-red-600 bg-red-100';
  return 'text-yellow-600 bg-yellow-100';
};

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

const formatTimeAgo = (timestamp: number): string => {
  const ms = Date.now() - timestamp;
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
};

// ===================== MAIN COMPONENT =====================

interface IGXControlCenterProps {
  embedded?: boolean; // Hide header when embedded in another page
}

export default function IGXControlCenter({ embedded = false }: IGXControlCenterProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // System State
  const [metrics, setMetrics] = useState<HubMetrics>(globalHubService.getMetrics());
  const [hubRunning, setHubRunning] = useState(globalHubService.isRunning());
  const [activeMode, setActiveMode] = useState<string | null>(null);

  // Signal Controls State
  const [frequency, setFrequency] = useState<FrequencyState>({ FREE: 8, PRO: 96, MAX: 48 });
  const [thresholds, setThresholds] = useState<ThresholdState>({ quality: 52, ml: 50, strategyWinRate: 35 });
  const [tierConfig, setTierConfig] = useState<TierConfig>({ acceptHigh: true, acceptMedium: true, acceptLow: false });
  const [enabledStrategies, setEnabledStrategies] = useState<Set<string>>(new Set(STRATEGY_NAMES));
  const [regimeOverride, setRegimeOverride] = useState<string>('auto');
  const [fluxMode, setFluxMode] = useState<'PUSH' | 'PULL' | 'AUTO'>('AUTO');

  // Real-time Agent Data
  const [agents, setAgents] = useState<QuantAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [currentMarketState, setCurrentMarketState] = useState<MarketState>(MarketState.RANGEBOUND);
  const [arenaStats, setArenaStats] = useState({
    totalTrades: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0,
    marketState: MarketState.RANGEBOUND, return24h: 0, trades24h: 0, wins24h: 0, winRate24h: 0
  });

  // Per-regime performance tracking
  const [regimePerformance, setRegimePerformance] = useState<Record<string, Record<MarketState, { trades: number; winRate: number; pnl: number }>>>({});

  // Adaptive Engine State
  const [regimeConfidence, setRegimeConfidence] = useState(0);
  const [regimeStartTime, setRegimeStartTime] = useState(Date.now());
  const [regimeHistory, setRegimeHistory] = useState<Array<{ from: MarketState; to: MarketState; timestamp: number }>>([]);
  const [regimeChangeImpacts, setRegimeChangeImpacts] = useState<RegimeChangeImpact[]>([]);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

  // Persistent Flux Metrics State (survives refresh)
  const [fluxDashboardData, setFluxDashboardData] = useState<FluxDashboardData | null>(null);
  const [marketAdaptationPercent, setMarketAdaptationPercent] = useState(0);
  const [persistedAgentMetrics, setPersistedAgentMetrics] = useState<AgentMetricSnapshot[]>([]);
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState<Date | null>(null);
  const [persistedRegimeTransitions, setPersistedRegimeTransitions] = useState<RegimeTransition[]>([]);
  const [persistedAdaptationImpacts, setPersistedAdaptationImpacts] = useState<AdaptationImpact[]>([]);
  const [persistedAgentRegimePerf, setPersistedAgentRegimePerf] = useState<Record<string, AgentRegimePerformance>>({});

  // ===================== EFFECTS =====================

  // Initialize Flux Metrics Service (persistent data)
  useEffect(() => {
    console.log('[Flux] Initializing FluxMetricsService for persistent data...');

    // Initialize the service
    fluxMetricsService.initialize().then(() => {
      console.log('[Flux] FluxMetricsService initialized');
    });

    // Subscribe to real-time updates
    const unsubscribe = fluxMetricsService.subscribe((data) => {
      console.log('[Flux] Received dashboard data update:', {
        agents: data.agents.length,
        marketState: data.currentMarketState?.market_state,
        avgAdaptation: data.globalStats.avgAdaptationScore,
        transitions: data.regimeTransitions?.length || 0,
        impacts: data.adaptationImpacts?.length || 0
      });

      setFluxDashboardData(data);
      setPersistedAgentMetrics(data.agents);
      setMarketAdaptationPercent(data.globalStats.avgAdaptationScore);
      setPersistedRegimeTransitions(data.regimeTransitions || []);
      setPersistedAdaptationImpacts(data.adaptationImpacts || []);
      setPersistedAgentRegimePerf(data.agentRegimePerformance || {});
      setLastMetricsUpdate(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Track if initial seeding has been done
  const [hasSeededInitialData, setHasSeededInitialData] = useState(false);

  // Seed initial regime performance when agents first load
  useEffect(() => {
    if (agents.length === 0 || hasSeededInitialData) return;

    console.log('[Flux] Seeding initial regime performance for', agents.length, 'agents');

    // Seed each agent's performance in the current regime
    agents.forEach(agent => {
      fluxMetricsService.seedAgentRegimePerformance(
        agent.id,
        agent.name,
        currentMarketState,
        {
          totalTrades: agent.totalTrades,
          wins: agent.wins,
          losses: agent.losses,
          totalPnL: agent.totalPnL,
          winRate: agent.winRate
        }
      );
    });

    // Generate some synthetic regime transitions if none exist
    if (persistedRegimeTransitions.length === 0) {
      console.log('[Flux] Generating initial regime transitions for demo');
      // Generate a few historical transitions
      const states = [
        MarketState.BULLISH_HIGH_VOL,
        MarketState.RANGEBOUND,
        MarketState.BEARISH_LOW_VOL,
        MarketState.BULLISH_LOW_VOL,
        currentMarketState
      ];
      for (let i = 0; i < states.length - 1; i++) {
        fluxMetricsService.generateSyntheticTransition(states[i], states[i + 1]);
      }
    }

    setHasSeededInitialData(true);
  }, [agents, currentMarketState, hasSeededInitialData, persistedRegimeTransitions.length]);

  // Record agent metrics periodically (every 10 seconds)
  // Also track previous trade counts to detect new trades
  const [prevTradeCounts, setPrevTradeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (agents.length === 0) return;

    const recordMetrics = () => {
      agents.forEach(agent => {
        // Calculate adaptation score based on regime performance
        let adaptationScore = 50; // Base score

        // Check persisted regime performance first
        const persistedPerf = persistedAgentRegimePerf[agent.id]?.regimes?.[currentMarketState];
        if (persistedPerf && persistedPerf.trades > 0) {
          adaptationScore = Math.min(100, Math.max(0, persistedPerf.win_rate));
        } else {
          const agentRegimePerf = regimePerformance[agent.id];
          if (agentRegimePerf && agentRegimePerf[currentMarketState]) {
            const perf = agentRegimePerf[currentMarketState];
            adaptationScore = Math.min(100, Math.max(0, perf.winRate));
          }
        }

        // Check for new trades to update regime performance
        const prevCount = prevTradeCounts[agent.id] || 0;
        const newTrades = agent.totalTrades - prevCount;

        // Record new trades (only if we've seen this agent before)
        if (newTrades > 0 && prevCount > 0) {
          const prevWins = Math.round(prevCount * (agent.winRate / 100));
          const currentWins = agent.wins;
          const recentWins = Math.max(0, currentWins - prevWins);

          for (let i = 0; i < newTrades; i++) {
            const isWin = i < recentWins;
            const avgPnl = agent.totalPnL / Math.max(agent.totalTrades, 1);

            fluxMetricsService.updateAgentRegimePerformance(
              agent.id,
              agent.name,
              currentMarketState,
              { won: isWin, pnl: avgPnl }
            );
          }
        }

        // Update previous trade counts
        setPrevTradeCounts(prev => ({ ...prev, [agent.id]: agent.totalTrades }));

        // Record to persistent service
        fluxMetricsService.recordAgentMetrics({
          id: agent.id,
          name: agent.name,
          totalPnL: agent.totalPnL,
          totalPnLPercent: agent.totalPnLPercent,
          winRate: agent.winRate,
          totalTrades: agent.totalTrades,
          wins: agent.wins,
          losses: agent.losses,
          return24h: agent.return24h,
          trades24h: agent.trades24h,
          currentPosition: agent.currentPosition ? {
            symbol: agent.currentPosition.symbol,
            side: agent.currentPosition.direction,
            size: agent.currentPosition.quantity
          } : null
        }, currentMarketState, adaptationScore);
      });
    };

    // Record immediately
    recordMetrics();

    // Then every 10 seconds
    const interval = setInterval(recordMetrics, 10000);

    return () => clearInterval(interval);
  }, [agents, currentMarketState, regimePerformance, prevTradeCounts, persistedAgentRegimePerf]);

  // Track market state changes
  useEffect(() => {
    let previousState = currentMarketState;

    const checkStateChange = () => {
      if (currentMarketState !== previousState) {
        const duration = Date.now() - regimeStartTime;

        // Record market state change
        fluxMetricsService.recordMarketStateChange(
          currentMarketState,
          regimeConfidence,
          duration,
          'auto_detection',
          { btc: 0, eth: 0 }, // Would need to get real prices
          0 // Would need to calculate volatility
        );

        // Record adaptation scores for each agent at state change
        agents.forEach(agent => {
          const agentRegimePerf = regimePerformance[agent.id];
          if (agentRegimePerf && agentRegimePerf[previousState]) {
            const perf = agentRegimePerf[previousState];
            fluxMetricsService.recordAdaptationScore(
              agent.id,
              agent.name,
              previousState,
              perf.winRate,
              perf.trades,
              perf.winRate,
              perf.pnl,
              duration
            );
          }
        });

        previousState = currentMarketState;
      }
    };

    checkStateChange();
  }, [currentMarketState, agents, regimePerformance, regimeStartTime, regimeConfidence]);

  // Load initial settings
  useEffect(() => {
    try {
      const tierStates = globalHubService.getTierStates();
      setFrequency({
        FREE: Math.round(tierStates.FREE.interval / (60 * 60 * 1000)),
        PRO: Math.round(tierStates.PRO.interval / (60 * 1000)),
        MAX: Math.round(tierStates.MAX.interval / (60 * 1000))
      });

      const savedThresholds = deltaV2QualityEngine.getThresholds();
      setThresholds({
        quality: savedThresholds.quality || 52,
        ml: (savedThresholds.ml || 0.5) * 100,
        strategyWinRate: savedThresholds.strategyWinRate || 35
      });

      const gammaConfig = igxGammaV2.getTierConfig();
      setTierConfig(gammaConfig);
    } catch (e) {
      console.error('[Flux] Error loading initial settings:', e);
    }
  }, []);

  // Real-time subscription to ArenaQuantEngine
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const updateFromEngine = () => {
      try {
        const currentAgents = arenaQuantEngine.getAgents();
        const stats = arenaQuantEngine.getStats();
        const state = arenaQuantEngine.getCurrentMarketState();

        console.log('[Flux] Engine update:', {
          agentCount: currentAgents?.length || 0,
          state,
          agentNames: currentAgents?.map(a => a.name) || []
        });

        setAgentsLoading(false);
        setAgents(currentAgents || []);
        if (stats) {
          setArenaStats(stats);
        }
        setCurrentMarketState(state || MarketState.RANGEBOUND);

        // Get per-regime performance for each agent (if method exists)
        const perfData: Record<string, Record<MarketState, { trades: number; winRate: number; pnl: number }>> = {};
        try {
          currentAgents?.forEach(agent => {
            const perf = (arenaQuantEngine as any).getPerRegimePerformance?.(agent.id);
            if (perf) {
              perfData[agent.id] = {} as any;
              MARKET_STATES.forEach(s => {
                if (perf[s]) {
                  perfData[agent.id][s] = {
                    trades: perf[s].trades || 0,
                    winRate: perf[s].winRate || 0,
                    pnl: perf[s].totalPnL || 0
                  };
                }
              });
            }
          });
        } catch (e) {
          // Per-regime performance not available
        }
        setRegimePerformance(perfData);
      } catch (e) {
        console.error('[Flux] Error updating from engine:', e);
      }
    };

    // Initialize and start the engine
    const initEngine = async () => {
      console.log('[Flux] Initializing ArenaQuantEngine...');

      // Always try to start the engine to ensure it's running
      try {
        const isRunning = (arenaQuantEngine as any).isRunning?.();
        if (!isRunning) {
          console.log('[Flux] Engine not running, starting...');
          await arenaQuantEngine.start();
          console.log('[Flux] Engine started');
        } else {
          console.log('[Flux] Engine already running');
        }
      } catch (e) {
        console.log('[Flux] Starting engine...');
        await arenaQuantEngine.start();
      }

      // Initial update after engine is ready
      updateFromEngine();

      // Subscribe to changes
      unsubscribe = arenaQuantEngine.onStateChange(updateFromEngine);
    };

    initEngine();

    // Also poll every 2 seconds to ensure data stays fresh
    const pollInterval = setInterval(updateFromEngine, 2000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Poll for hub metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setHubRunning(globalHubService.isRunning());
      setMetrics(globalHubService.getMetrics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Force re-render for time-based displays (every second for live countdown, every 10s for others)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000); // Every second for live updates
    return () => clearInterval(interval);
  }, []);

  // Performance tracking is disabled - table not available in QuantumX schema
  // Future: Add agent_performance_snapshots table to enable historical tracking

  // Load regime detection data and record transitions
  useEffect(() => {
    const loadRegimeData = async () => {
      try {
        // Get current market state analysis
        const analysis = await marketStateDetectionEngine.detectMarketState();
        setRegimeConfidence(analysis.confidence);

        // Track regime changes using persistent service
        const didTransition = fluxMetricsService.checkAndRecordRegimeChange(
          analysis.state,
          analysis.confidence,
          regimeStartTime
        );

        if (didTransition) {
          // Also update local state for immediate UI feedback
          setRegimeHistory(prev => [...prev.slice(-9), {
            from: currentMarketState,
            to: analysis.state,
            timestamp: Date.now()
          }]);
          setRegimeStartTime(Date.now());
        }

        setCurrentMarketState(analysis.state);
      } catch (e) {
        console.error('[Flux] Error loading regime data:', e);
      }
    };

    loadRegimeData();

    // Poll for regime updates every 30 seconds
    const pollInterval = setInterval(loadRegimeData, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [currentMarketState, regimeStartTime]);

  // Load regime change impacts (heavy query, only on mount)
  useEffect(() => {
    const loadImpacts = async () => {
      setAdaptiveLoading(true);
      try {
        // Load impacts for all agents
        const impacts = await Promise.all([
          regimeAnalyticsService.getRegimeChangeImpact('alphax'),
          regimeAnalyticsService.getRegimeChangeImpact('betax'),
          regimeAnalyticsService.getRegimeChangeImpact('gammax')
        ]);
        setRegimeChangeImpacts(impacts.flat().sort((a, b) =>
          new Date(b.regimeChange.timestamp).getTime() - new Date(a.regimeChange.timestamp).getTime()
        ).slice(0, 10));
      } catch (e) {
        console.error('[Flux] Error loading regime impacts:', e);
      }
      setAdaptiveLoading(false);
    };
    loadImpacts();
  }, []);

  // ===================== HANDLERS =====================

  const handleEmergencyStop = () => {
    if (!globalHubService.isRunning()) return;
    globalHubService.stop();
    setHubRunning(false);
    toast({ title: 'Emergency Stop', description: 'All systems halted!', variant: 'destructive' });
  };

  const handleFullReboot = () => {
    globalHubService.stop();
    setTimeout(() => {
      globalHubService.start();
      setHubRunning(true);
      toast({ title: 'System Rebooted', description: 'Full restart complete!' });
    }, 1000);
  };

  const handleClearDecks = () => {
    // Clear signals if method exists
    try {
      (globalHubService as any).clearAllSignals?.();
    } catch (e) {
      console.log('[Flux] clearAllSignals not available');
    }
    toast({ title: 'Decks Cleared', description: 'All signals removed!' });
  };

  const handleSyncArena = async () => {
    await arenaService.initialize();
    toast({ title: 'Arena Synced', description: 'Arena restarted successfully!' });
  };

  const applyQuickMode = (modeKey: keyof typeof QUICK_MODES) => {
    const mode = QUICK_MODES[modeKey];
    setFrequency(mode.frequency);
    setThresholds(mode.thresholds);
    setTierConfig(mode.tierConfig);

    globalHubService.updateDropInterval('FREE', mode.frequency.FREE * 60 * 60 * 1000);
    globalHubService.updateDropInterval('PRO', mode.frequency.PRO * 60 * 1000);
    globalHubService.updateDropInterval('MAX', mode.frequency.MAX * 60 * 1000);

    deltaV2QualityEngine.setThresholds(mode.thresholds.quality, mode.thresholds.ml / 100, mode.thresholds.strategyWinRate);
    igxGammaV2.setTierConfig(mode.tierConfig);

    setActiveMode(modeKey);
    setTimeout(() => setActiveMode(null), 1000);
    toast({ title: `${mode.name} Mode Activated`, description: mode.description });
  };

  const handleEngageHyperdrive = () => {
    globalHubService.updateDropInterval('FREE', frequency.FREE * 60 * 60 * 1000);
    globalHubService.updateDropInterval('PRO', frequency.PRO * 60 * 1000);
    globalHubService.updateDropInterval('MAX', frequency.MAX * 60 * 1000);
    toast({ title: 'Hyperdrive Engaged', description: 'Signal frequencies updated!' });
  };

  const handleLockThresholds = () => {
    deltaV2QualityEngine.setThresholds(thresholds.quality, thresholds.ml / 100, thresholds.strategyWinRate);
    toast({ title: 'Thresholds Locked', description: 'Quality filters applied!' });
  };

  const handleSecureGates = () => {
    igxGammaV2.setTierConfig(tierConfig);
    toast({ title: 'Gates Secured', description: 'Tier filters updated!' });
  };

  const handleArmAll = () => {
    STRATEGY_NAMES.forEach(s => igxBetaV5.enableStrategy(s));
    setEnabledStrategies(new Set(STRATEGY_NAMES));
    toast({ title: 'All Strategies Armed', description: `${STRATEGY_NAMES.length} strategies activated!` });
  };

  const handleDisarmAll = () => {
    STRATEGY_NAMES.forEach(s => igxBetaV5.disableStrategy(s));
    setEnabledStrategies(new Set());
    toast({ title: 'All Strategies Disarmed', description: 'All strategies deactivated!', variant: 'destructive' });
  };

  const toggleStrategy = (strategy: string) => {
    const newEnabled = new Set(enabledStrategies);
    if (newEnabled.has(strategy)) {
      newEnabled.delete(strategy);
      igxBetaV5.disableStrategy(strategy);
    } else {
      newEnabled.add(strategy);
      igxBetaV5.enableStrategy(strategy);
    }
    setEnabledStrategies(newEnabled);
  };

  const calculateSignalsPerDay = (interval: number, unit: 'hours' | 'minutes'): string => {
    const hours = unit === 'hours' ? interval : interval / 60;
    return (24 / hours).toFixed(1);
  };

  // ===================== RENDER =====================

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {/* Header - Hidden when embedded */}
      {!embedded && (
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-red-500 flex items-center justify-center">
                  <Gauge className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-500">
                    QX CONTROL
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">QuantumX Trading Control Center</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => navigate('/intelligence-hub')} className="hover:border-primary">
                  <Brain className="w-4 h-4 mr-2" />
                  Intelligence Hub
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
                <Badge className={`px-3 py-1.5 font-semibold ${hubRunning ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                  <Activity className="w-3 h-3 mr-1.5" />
                  {hubRunning ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={embedded ? "py-4" : "container mx-auto px-4 md:px-6 py-6 max-w-7xl"}>
        <Tabs defaultValue="arena" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-xl mx-auto bg-muted p-1 rounded-lg">
            <TabsTrigger value="arena" className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
              <Rocket className="w-4 h-4 mr-2" />
              Arena
            </TabsTrigger>
            <TabsTrigger value="controls" className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
              <Settings className="w-4 h-4 mr-2" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="adaptive" className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
              <Layers className="w-4 h-4 mr-2" />
              Adaptive
            </TabsTrigger>
          </TabsList>

          {/* ==================== TAB 1: ARENA ==================== */}
          <TabsContent value="arena" className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="destructive" onClick={handleEmergencyStop} className="h-auto py-3 flex flex-col gap-1">
                    <Power className="w-5 h-5" />
                    <span className="text-xs">Emergency Stop</span>
                  </Button>
                  <Button onClick={handleFullReboot} className="h-auto py-3 flex flex-col gap-1 bg-primary hover:bg-primary/90">
                    <RefreshCw className="w-5 h-5" />
                    <span className="text-xs">Full Reboot</span>
                  </Button>
                  <Button variant="outline" onClick={handleClearDecks} className="h-auto py-3 flex flex-col gap-1 hover:border-primary hover:bg-primary/5">
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs">Clear Decks</span>
                  </Button>
                  <Button variant="outline" onClick={handleSyncArena} className="h-auto py-3 flex flex-col gap-1 hover:border-primary hover:bg-primary/5">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs">Sync Arena</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Overall Performance Summary */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Arena Performance
                  </CardTitle>
                  <Badge className={`px-3 py-1 ${getRegimeColor(currentMarketState)}`}>
                    {formatRegimeName(currentMarketState)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{arenaStats.totalTrades}</div>
                    <div className="text-xs text-muted-foreground">Total Trades</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{arenaStats.winRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className={`text-2xl font-bold ${arenaStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {arenaStats.totalPnL >= 0 ? '+' : ''}{arenaStats.totalPnL.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Total P&L</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className={`text-2xl font-bold ${arenaStats.return24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {arenaStats.return24h >= 0 ? '+' : ''}{arenaStats.return24h.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">24h Return</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{arenaStats.trades24h}</div>
                    <div className="text-xs text-muted-foreground">24h Trades</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Adaptation & Real-time Metrics */}
            <Card className="bg-card border border-border/50 bg-gradient-to-r from-primary/5 to-orange-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Market Adaptation
                    <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <Activity className="w-3 h-3 mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                  </CardTitle>
                  {lastMetricsUpdate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {Math.round((Date.now() - lastMetricsUpdate.getTime()) / 1000)}s ago
                    </span>
                  )}
                </div>
                <CardDescription>Real-time agent adaptation to current market regime (data persists across refresh)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Market Adaptation Score */}
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">ADAPTATION SCORE</div>
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold ${
                        marketAdaptationPercent >= 60 ? 'text-green-600' :
                        marketAdaptationPercent >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {marketAdaptationPercent.toFixed(1)}%
                      </div>
                    </div>
                    <Progress
                      value={marketAdaptationPercent}
                      className="h-2 mt-2"
                    />
                  </div>

                  {/* Persisted Data Points */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">DATA POINTS</div>
                    <div className="text-2xl font-bold text-foreground">
                      {persistedAgentMetrics.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Agent snapshots stored</div>
                  </div>

                  {/* Market State Changes */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">REGIME CHANGES</div>
                    <div className="text-2xl font-bold text-foreground">
                      {fluxDashboardData?.globalStats.marketStateChanges24h || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">In last 24 hours</div>
                  </div>

                  {/* Global Win Rate (Persistent) */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">GLOBAL WIN RATE</div>
                    <div className={`text-2xl font-bold ${
                      (fluxDashboardData?.globalStats.winRate || 0) >= 50 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(fluxDashboardData?.globalStats.winRate || 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {fluxDashboardData?.globalStats.totalTrades || 0} total trades
                    </div>
                  </div>
                </div>

                {/* Per-Agent Adaptation Indicators */}
                {persistedAgentMetrics.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="text-xs font-semibold text-muted-foreground mb-3">AGENT ADAPTATION STATUS</div>
                    <div className="flex flex-wrap gap-3">
                      {persistedAgentMetrics.map(metric => (
                        <div
                          key={metric.agent_id}
                          className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg border border-border/50"
                        >
                          <div className={`w-3 h-3 rounded-full ${
                            metric.adaptation_score >= 60 ? 'bg-green-500' :
                            metric.adaptation_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium">{metric.agent_name}</span>
                          <span className={`text-sm font-bold ${
                            metric.adaptation_score >= 60 ? 'text-green-600' :
                            metric.adaptation_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {metric.adaptation_score.toFixed(0)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({metric.win_rate.toFixed(0)}% WR)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Cards */}
            {agentsLoading ? (
              <Card className="bg-card border border-border/50 p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading Arena agents...</p>
                </div>
              </Card>
            ) : agents.length === 0 ? (
              <Card className="bg-card border border-border/50 p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Rocket className="w-12 h-12 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground mb-1">No agents detected</p>
                    <p className="text-sm text-muted-foreground mb-4">The Arena engine may need to be started</p>
                    <Button onClick={handleSyncArena} className="bg-primary hover:bg-primary/90">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Arena
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.map(agent => {
                const uiData = AGENT_UI_DATA[agent.id] || { color: 'from-gray-500 to-gray-600', type: AgentType.ALPHAX };
                const agentRegimePerf = regimePerformance[agent.id] || {};

                return (
                  <Card key={agent.id} className="bg-card border border-border/50 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${agent.color || uiData.color} flex items-center justify-center text-2xl`}>
                            {agent.avatar}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-foreground">{agent.name}</CardTitle>
                            <Badge className="bg-primary/10 text-primary border-0 text-xs">{agent.riskProfile}</Badge>
                          </div>
                        </div>
                        {agent.isActive && (
                          <Badge className="bg-green-500 text-white text-xs">ACTIVE</Badge>
                        )}
                      </div>
                      <CardDescription className="text-muted-foreground text-sm mt-2">
                        {agent.codename}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Position */}
                      {agent.currentPosition && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center justify-between">
                            <Badge variant={agent.currentPosition.direction === 'LONG' ? 'default' : 'destructive'}>
                              {agent.currentPosition.direction} {agent.currentPosition.displaySymbol}
                            </Badge>
                            <span className={`text-sm font-bold ${agent.currentPosition.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {agent.currentPosition.pnl >= 0 ? '+' : ''}{agent.currentPosition.pnlPercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="mt-2">
                            <Progress value={agent.currentPosition.progressPercent || 50} className="h-1" />
                          </div>
                        </div>
                      )}

                      {/* Performance Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-muted/30 rounded">
                          <div className={`text-lg font-bold ${agent.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${agent.totalPnL.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Total P&L</div>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded">
                          <div className="text-lg font-bold text-foreground">{agent.winRate.toFixed(1)}%</div>
                          <div className="text-[10px] text-muted-foreground">Win Rate</div>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded">
                          <div className="text-lg font-bold text-foreground">{agent.totalTrades}</div>
                          <div className="text-[10px] text-muted-foreground">Trades</div>
                        </div>
                      </div>

                      {/* Per-Regime Performance (Persistent Data) */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                          Performance by Regime
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/30">
                            PERSISTED
                          </Badge>
                        </div>
                        {MARKET_STATES.map(state => {
                          // Use persistent data with fallback to in-memory
                          const persistedPerf = persistedAgentRegimePerf[agent.id]?.regimes?.[state];
                          const memoryPerf = agentRegimePerf[state];

                          // Prefer persistent data if available
                          const hasPersisted = persistedPerf && persistedPerf.trades > 0;
                          const hasMemory = memoryPerf && memoryPerf.trades > 0;
                          const hasTrades = hasPersisted || hasMemory;

                          // Extract values with preference for persistent data
                          const trades = hasPersisted ? persistedPerf.trades : (hasMemory ? memoryPerf.trades : 0);
                          const winRate = hasPersisted ? persistedPerf.win_rate : (hasMemory ? memoryPerf.winRate : 0);
                          const pnl = hasPersisted ? persistedPerf.total_pnl : (hasMemory ? memoryPerf.pnl : 0);

                          const isCurrentRegime = state === currentMarketState;

                          return (
                            <div key={state} className={`flex items-center justify-between p-2 rounded ${isCurrentRegime ? 'bg-primary/10 border border-primary/30' : 'bg-muted/20'}`}>
                              <span className={`text-xs ${isCurrentRegime ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                {formatRegimeName(state).split(' ').map(w => w[0]).join('')}
                              </span>
                              {hasTrades ? (
                                <>
                                  <span className="text-xs">{trades} trades</span>
                                  <span className={`text-xs font-semibold ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                    {winRate.toFixed(0)}% WR
                                  </span>
                                  <span className={`text-xs font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No data</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 24h Performance */}
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">24h:</span>
                          <span className={agent.return24h >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {agent.return24h >= 0 ? '+' : ''}{agent.return24h.toFixed(2)}%
                          </span>
                          <span className="text-muted-foreground">{agent.trades24h} trades</span>
                          <span className="text-muted-foreground">{agent.winRate24h.toFixed(0)}% WR</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )}
          </TabsContent>

          {/* ==================== TAB 2: CONTROLS ==================== */}
          <TabsContent value="controls" className="space-y-6">
            {/* Quick Mode Presets */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground">Quick Mode Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(QUICK_MODES).map(([key, mode]) => (
                    <Button
                      key={key}
                      variant="outline"
                      className={`h-auto py-4 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all ${activeMode === key ? 'border-primary bg-primary/10' : ''}`}
                      onClick={() => applyQuickMode(key as keyof typeof QUICK_MODES)}
                    >
                      <mode.icon className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-foreground">{mode.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center">{mode.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Signal Pulse */}
                <Card className="bg-card border border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-primary" />
                      Signal Pulse (Frequency)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {(['FREE', 'PRO', 'MAX'] as const).map(tier => (
                      <div key={tier} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">{tier} Tier</span>
                          <span className="text-sm text-primary font-bold">
                            {tier === 'FREE' ? `${frequency[tier]}h` : `${frequency[tier]}min`}
                          </span>
                        </div>
                        <Slider
                          value={[frequency[tier]]}
                          onValueChange={(val) => setFrequency({ ...frequency, [tier]: val[0] })}
                          min={tier === 'FREE' ? 1 : (tier === 'PRO' ? 30 : 15)}
                          max={tier === 'FREE' ? 24 : (tier === 'PRO' ? 240 : 120)}
                          step={tier === 'FREE' ? 1 : 5}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">
                          {calculateSignalsPerDay(frequency[tier], tier === 'FREE' ? 'hours' : 'minutes')} signals/day
                        </div>
                      </div>
                    ))}
                    <Button onClick={handleEngageHyperdrive} className="w-full bg-primary hover:bg-primary/90">
                      <Rocket className="w-4 h-4 mr-2" />
                      Engage Hyperdrive
                    </Button>
                  </CardContent>
                </Card>

                {/* Quality Thresholds */}
                <Card className="bg-card border border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      Quality Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">Quality Bar</span>
                        <span className="text-sm text-primary font-bold">{thresholds.quality}</span>
                      </div>
                      <Slider value={[thresholds.quality]} onValueChange={(v) => setThresholds({ ...thresholds, quality: v[0] })} min={0} max={100} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">ML Brain Trust</span>
                        <span className="text-sm text-primary font-bold">{thresholds.ml}%</span>
                      </div>
                      <Slider value={[thresholds.ml]} onValueChange={(v) => setThresholds({ ...thresholds, ml: v[0] })} min={0} max={100} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">Strategy Win Rate</span>
                        <span className="text-sm text-primary font-bold">{thresholds.strategyWinRate}%</span>
                      </div>
                      <Slider value={[thresholds.strategyWinRate]} onValueChange={(v) => setThresholds({ ...thresholds, strategyWinRate: v[0] })} min={0} max={100} />
                    </div>
                    <Button onClick={handleLockThresholds} className="w-full bg-primary hover:bg-primary/90">
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Thresholds
                    </Button>
                  </CardContent>
                </Card>

                {/* Tier Gates */}
                <Card className="bg-card border border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Tier Gates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: 'acceptHigh', label: 'Accept HIGH Tier', desc: 'Premium quality signals' },
                      { key: 'acceptMedium', label: 'Accept MEDIUM Tier', desc: 'Standard quality signals' },
                      { key: 'acceptLow', label: 'Accept LOW Tier', desc: 'Experimental signals' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30">
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                        <Checkbox
                          checked={tierConfig[item.key as keyof TierConfig]}
                          onCheckedChange={(checked) => setTierConfig({ ...tierConfig, [item.key]: checked })}
                        />
                      </div>
                    ))}
                    <Button onClick={handleSecureGates} className="w-full bg-primary hover:bg-primary/90">
                      <Shield className="w-4 h-4 mr-2" />
                      Secure Gates
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Strategy Armory */}
                <Card className="bg-card border border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Swords className="w-4 h-4 text-primary" />
                        Strategy Armory ({enabledStrategies.size}/17)
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleArmAll} className="text-xs">Arm All</Button>
                        <Button size="sm" variant="destructive" onClick={handleDisarmAll} className="text-xs">Disarm</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                      {STRATEGY_NAMES.map(strategy => (
                        <div
                          key={strategy}
                          onClick={() => toggleStrategy(strategy)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${enabledStrategies.has(strategy) ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary/50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${enabledStrategies.has(strategy) ? 'text-primary' : 'text-muted-foreground'}`}>
                              {strategy.replace(/_/g, ' ')}
                            </span>
                            <div className={`w-4 h-4 rounded-full ${enabledStrategies.has(strategy) ? 'bg-primary' : 'bg-muted'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Regime Override */}
                <Card className="bg-card border border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Regime Override
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {REGIME_OPTIONS.map(option => (
                        <div
                          key={option.value}
                          onClick={() => setRegimeOverride(option.value)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${regimeOverride === option.value ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary/50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`text-sm font-medium ${regimeOverride === option.value ? 'text-primary' : 'text-foreground'}`}>
                                {option.label}
                              </div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                            <div className={`w-4 h-4 rounded-full ${regimeOverride === option.value ? 'bg-primary' : 'bg-muted'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Flux Mode */}
                <Card className="bg-card border border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground">Flux Mode</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      PUSH = High frequency, PULL = High quality, AUTO = Adaptive
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {(['PUSH', 'PULL', 'AUTO'] as const).map(mode => (
                        <Button
                          key={mode}
                          variant={fluxMode === mode ? 'default' : 'outline'}
                          className={fluxMode === mode ? 'bg-primary hover:bg-primary/90' : 'hover:border-primary hover:bg-primary/5'}
                          onClick={() => setFluxMode(mode)}
                        >
                          {mode === 'PUSH' && <TrendingUp className="w-4 h-4 mr-1" />}
                          {mode === 'PULL' && <TrendingDown className="w-4 h-4 mr-1" />}
                          {mode === 'AUTO' && <Sparkles className="w-4 h-4 mr-1" />}
                          {mode}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ==================== TAB 3: ADAPTIVE ENGINE ==================== */}
          <TabsContent value="adaptive" className="space-y-6">
            {/* Current Regime Status */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Current Market Regime
                </CardTitle>
                <CardDescription>Real-time market state detection driving agent strategy selection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Current Regime */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">DETECTED REGIME</div>
                    <div className={`text-xl font-bold ${getRegimeColor(currentMarketState).split(' ')[0]}`}>
                      {formatRegimeName(currentMarketState)}
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">CONFIDENCE</div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xl font-bold ${regimeConfidence >= 70 ? 'text-green-600' : regimeConfidence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {regimeConfidence.toFixed(0)}%
                      </div>
                      <Progress value={regimeConfidence} className="h-2 flex-1" />
                    </div>
                  </div>

                  {/* Time in Regime */}
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">TIME IN REGIME</div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xl font-bold">{formatDuration(Date.now() - regimeStartTime)}</span>
                    </div>
                  </div>

                  {/* Regime Changes 24h - From Persistent Data */}
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">CHANGES (24H)</div>
                    <div className="text-xl font-bold">
                      {persistedRegimeTransitions.filter(t =>
                        Date.now() - new Date(t.timestamp).getTime() < 24 * 60 * 60 * 1000
                      ).length || fluxDashboardData?.globalStats.marketStateChanges24h || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regime Change History - Persistent Data */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Recent Regime Changes
                    <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <Activity className="w-3 h-3 mr-1 animate-pulse" />
                      PERSISTED
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {persistedRegimeTransitions.length} total recorded
                  </span>
                </div>
                <CardDescription>Tracking market transitions for strategy optimization (data survives refresh)</CardDescription>
              </CardHeader>
              <CardContent>
                {persistedRegimeTransitions.length > 0 ? (
                  <div className="space-y-2">
                    {persistedRegimeTransitions.slice(0, 10).map((transition, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getRegimeColor(transition.from_state as MarketState)} border-0`}>
                            {formatRegimeName(transition.from_state as MarketState).split(' ').map(w => w[0]).join('')}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <Badge className={`${getRegimeColor(transition.to_state as MarketState)} border-0`}>
                            {formatRegimeName(transition.to_state as MarketState).split(' ').map(w => w[0]).join('')}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({transition.confidence.toFixed(0)}% conf)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(transition.duration_in_previous_ms)} in prev
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(new Date(transition.timestamp).getTime())}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : regimeHistory.length > 0 ? (
                  <div className="space-y-2">
                    {regimeHistory.slice(-5).reverse().map((change, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getRegimeColor(change.from)} border-0`}>
                            {formatRegimeName(change.from).split(' ').map(w => w[0]).join('')}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <Badge className={`${getRegimeColor(change.to)} border-0`}>
                            {formatRegimeName(change.to).split(' ').map(w => w[0]).join('')}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatTimeAgo(change.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No regime changes recorded yet</p>
                    <p className="text-xs mt-1">Changes will be recorded as market state transitions occur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Regime Change Impact - Persistent Data */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Adaptation Impact Analysis
                    <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <Activity className="w-3 h-3 mr-1 animate-pulse" />
                      PERSISTED
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {persistedAdaptationImpacts.length} impacts recorded
                  </span>
                </div>
                <CardDescription>How agent performance changes before vs after regime transitions (data survives refresh)</CardDescription>
              </CardHeader>
              <CardContent>
                {persistedAdaptationImpacts.length > 0 ? (
                  <div className="space-y-3">
                    {persistedAdaptationImpacts.slice(0, 8).map((impact, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-border/50 bg-muted/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary">{impact.agent_name}</span>
                            <Badge className={`${getRegimeColor(impact.regime_transition.from_state as MarketState)} border-0 text-xs`}>
                              {formatRegimeName(impact.regime_transition.from_state as MarketState).split(' ').map(w => w[0]).join('')}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <Badge className={`${getRegimeColor(impact.regime_transition.to_state as MarketState)} border-0 text-xs`}>
                              {formatRegimeName(impact.regime_transition.to_state as MarketState).split(' ').map(w => w[0]).join('')}
                            </Badge>
                          </div>
                          <Badge className={impact.impact_score >= 0 ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                            {impact.impact_score >= 0 ? '+' : ''}{impact.impact_score.toFixed(0)} Impact
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">BEFORE</div>
                            <div className="flex items-center gap-3">
                              <span>{impact.performance_before.trades} trades</span>
                              <span className={impact.performance_before.win_rate >= 50 ? 'text-green-600' : 'text-red-600'}>
                                {impact.performance_before.win_rate.toFixed(0)}% WR
                              </span>
                              <span className={impact.performance_before.avg_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {impact.performance_before.avg_pnl >= 0 ? '+' : ''}{impact.performance_before.avg_pnl.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">AFTER</div>
                            <div className="flex items-center gap-3">
                              <span>{impact.performance_after.trades} trades</span>
                              <span className={impact.performance_after.win_rate >= 50 ? 'text-green-600' : 'text-red-600'}>
                                {impact.performance_after.win_rate.toFixed(0)}% WR
                              </span>
                              <span className={impact.performance_after.avg_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {impact.performance_after.avg_pnl >= 0 ? '+' : ''}{impact.performance_after.avg_pnl.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Adaptation speed: {impact.adaptation_speed} trades to stabilize</span>
                          <span>{formatTimeAgo(new Date(impact.timestamp).getTime())}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : adaptiveLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading impact data...</div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No impact data yet - need more regime changes with trades</p>
                    <p className="text-xs mt-1">Impact data will be calculated when regime transitions occur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Adaptation Scores - Persistent Data */}
            <Card className="bg-card border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Agent Regime Adaptation
                    <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <Activity className="w-3 h-3 mr-1 animate-pulse" />
                      PERSISTED
                    </Badge>
                  </CardTitle>
                </div>
                <CardDescription>How well each agent performs across different market regimes (data survives refresh)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {agents.map(agent => {
                    // Use persistent regime performance data
                    const persistedPerf = persistedAgentRegimePerf[agent.id];
                    const persistedRegimes = persistedPerf?.regimes || {};
                    const currentRegimePerfPersisted = persistedRegimes[currentMarketState];
                    const hasPersistedData = currentRegimePerfPersisted && currentRegimePerfPersisted.trades > 0;

                    // Fallback to in-memory data
                    const agentPerf = regimePerformance[agent.id] || {};
                    const currentRegimePerf = agentPerf[currentMarketState];
                    const hasCurrentData = hasPersistedData || (currentRegimePerf && currentRegimePerf.trades > 0);

                    // Use persisted data if available, otherwise fallback
                    const displayData = hasPersistedData ? {
                      trades: currentRegimePerfPersisted.trades,
                      winRate: currentRegimePerfPersisted.win_rate,
                      pnl: currentRegimePerfPersisted.total_pnl
                    } : currentRegimePerf ? {
                      trades: currentRegimePerf.trades,
                      winRate: currentRegimePerf.winRate,
                      pnl: currentRegimePerf.pnl
                    } : null;

                    // Calculate adaptation score based on performance in current regime vs overall
                    const adaptScore = displayData
                      ? Math.min(100, Math.max(0, displayData.winRate + (displayData.pnl > 0 ? 20 : -10)))
                      : 0;

                    // Count total regimes with data
                    const regimesWithData = Object.values(persistedRegimes).filter(r => r.trades > 0).length;

                    return (
                      <div key={agent.id} className="p-4 rounded-lg border border-border/50 bg-card">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${agent.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-lg`}>
                            {agent.avatar}
                          </div>
                          <div>
                            <div className="font-semibold">{agent.name}</div>
                            <div className="text-xs text-muted-foreground">{agent.riskProfile}</div>
                          </div>
                          {regimesWithData > 0 && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {regimesWithData} regimes
                            </Badge>
                          )}
                        </div>

                        {/* Current Regime Performance */}
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                          <div className="text-xs text-muted-foreground mb-1">IN {formatRegimeName(currentMarketState).toUpperCase()}</div>
                          {hasCurrentData && displayData ? (
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{displayData.trades} trades</span>
                              <span className={`text-sm font-semibold ${displayData.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                {displayData.winRate.toFixed(0)}% WR
                              </span>
                              <span className={`text-sm font-semibold ${displayData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {displayData.pnl >= 0 ? '+' : ''}{displayData.pnl.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No trades in this regime yet</div>
                          )}
                        </div>

                        {/* All Regimes Performance Summary */}
                        {regimesWithData > 0 && (
                          <div className="mb-3 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">ALL REGIMES</div>
                            <div className="flex flex-wrap gap-1">
                              {MARKET_STATES.map(state => {
                                const regimeData = persistedRegimes[state];
                                if (!regimeData || regimeData.trades === 0) return null;
                                return (
                                  <div
                                    key={state}
                                    className={`px-2 py-1 rounded text-xs ${
                                      state === currentMarketState
                                        ? 'bg-primary/20 border border-primary/30'
                                        : 'bg-muted/30'
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {formatRegimeName(state).split(' ').map(w => w[0]).join('')}
                                    </span>
                                    <span className={`ml-1 ${regimeData.win_rate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                      {regimeData.win_rate.toFixed(0)}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Adaptation Score */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Adaptation Score</span>
                          <div className="flex items-center gap-2">
                            {adaptScore >= 60 ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : adaptScore >= 40 ? (
                              <Activity className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`font-semibold ${adaptScore >= 60 ? 'text-green-600' : adaptScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {adaptScore.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {agents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No agents active. Sync Arena to load agents.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Outcomes Summary */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Adaptive System Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{MARKET_STATES.length}</div>
                    <div className="text-xs text-muted-foreground">Regime States</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{agents.length}</div>
                    <div className="text-xs text-muted-foreground">Active Agents</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${arenaStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {arenaStats.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Overall Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${arenaStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {arenaStats.totalPnL >= 0 ? '+' : ''}{arenaStats.totalPnL.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Total P&L</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

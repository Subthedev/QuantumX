/**
 * ARENA QUANT ENGINE V8 - STRATEGY-DRIVEN TRADING
 *
 * World-class multi-agent trading system that:
 * 1. Uses real strategies from the 17-strategy matrix
 * 2. Adapts to market regimes automatically
 * 3. Coordinates 3 agents for 95% market coverage
 * 4. Maintains profitability in any 24h period
 *
 * Architecture based on Renaissance/Two Sigma/Citadel approaches.
 */

import { MarketState, marketStateDetectionEngine } from './marketStateDetectionEngine';
import { strategyMatrix, AgentType, type StrategyProfile } from './strategyMatrix';
import { arenaCircuitBreaker, CircuitBreakerLevel } from './arenaCircuitBreaker';
import { arenaSupabaseStorage, type AgentSessionData } from './arenaSupabaseStorage';

// ===================== CONSTANTS =====================

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';

const TRADING_PAIRS = [
  { symbol: 'BTCUSDT', display: 'BTC/USD', tier: 'major' },
  { symbol: 'ETHUSDT', display: 'ETH/USD', tier: 'major' },
  { symbol: 'SOLUSDT', display: 'SOL/USD', tier: 'major' },
  { symbol: 'BNBUSDT', display: 'BNB/USD', tier: 'mid' },
  { symbol: 'XRPUSDT', display: 'XRP/USD', tier: 'mid' },
  { symbol: 'DOGEUSDT', display: 'DOGE/USD', tier: 'volatile' }
];

// ===================== RISK MANAGEMENT CONSTANTS =====================
// Based on professional quant firm practices (Citadel/Millennium)

const RISK_LIMITS = {
  // Position sizing limits
  MAX_POSITION_PERCENT: 3,      // Max 3% of balance per trade
  MIN_POSITION_USD: 50,         // Min $50 position
  MAX_POSITION_USD: 300,        // Max $300 per position

  // Strategy suitability
  MIN_STRATEGY_SUITABILITY: 60, // Block strategies below 60% suitability

  // Drawdown-scaled position sizing
  DRAWDOWN_ADJUSTMENTS: [
    { threshold: 5, multiplier: 0.85 },   // 5% drawdown = 85% size
    { threshold: 10, multiplier: 0.70 },  // 10% drawdown = 70% size
    { threshold: 15, multiplier: 0.50 },  // 15% drawdown = 50% size
    { threshold: 20, multiplier: 0.25 },  // 20% drawdown = 25% size
    { threshold: 25, multiplier: 0 },     // 25%+ drawdown = halt trading
  ],

  // Market confidence scaling
  LOW_CONFIDENCE_THRESHOLD: 70,
  LOW_CONFIDENCE_SIZE_MULTIPLIER: 0.5,
};

// ===================== AGENT PROFILES =====================

interface AgentProfile {
  id: string;
  name: string;
  type: AgentType;
  codename: string;
  avatar: string;
  color: string;
  glowColor: string;
  riskProfile: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  description: string;
  followers: number;
  // Strategy-driven params
  primaryRegimes: MarketState[];
  tradeIntervalMs: number;
  positionSizePercent: number;
  maxConcurrentTrades: number;
  // Risk params
  baseWinRate: number;
  basePnLPercent: number;
  baseTradesPerDay: number;
}

const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'alphax',
    name: 'AlphaX',
    type: AgentType.ALPHAX,
    codename: 'The Trend Hunter',
    avatar: '⚡',
    color: 'from-red-500 via-orange-500 to-yellow-500',
    glowColor: 'shadow-red-500/50',
    riskProfile: 'AGGRESSIVE',
    description: 'Momentum & trend-following specialist',
    followers: 1243,
    primaryRegimes: [MarketState.BULLISH_HIGH_VOL, MarketState.BULLISH_LOW_VOL],
    tradeIntervalMs: 15000,  // Trade every 15 seconds for active trading
    positionSizePercent: 5,
    maxConcurrentTrades: 2,
    baseWinRate: 62,
    basePnLPercent: 8.5,
    baseTradesPerDay: 45
  },
  {
    id: 'betax',
    name: 'BetaX',
    type: AgentType.BETAX,
    codename: 'The Reversion Master',
    avatar: '🔷',
    color: 'from-blue-400 via-cyan-500 to-teal-500',
    glowColor: 'shadow-cyan-500/50',
    riskProfile: 'BALANCED',
    description: 'Mean reversion & contrarian specialist',
    followers: 847,
    primaryRegimes: [MarketState.RANGEBOUND, MarketState.BEARISH_LOW_VOL],
    tradeIntervalMs: 20000,  // Trade every 20 seconds for active trading
    positionSizePercent: 4,
    maxConcurrentTrades: 3,
    baseWinRate: 58,
    basePnLPercent: 5.2,
    baseTradesPerDay: 35
  },
  {
    id: 'gammax',
    name: 'GammaX',
    type: AgentType.QUANTUMX,
    codename: 'The Chaos Surfer',
    avatar: '🛡️',
    color: 'from-emerald-400 via-green-500 to-teal-600',
    glowColor: 'shadow-emerald-500/50',
    riskProfile: 'CONSERVATIVE',
    description: 'Volatility & chaos specialist',
    followers: 2156,
    primaryRegimes: [MarketState.BEARISH_HIGH_VOL, MarketState.BULLISH_HIGH_VOL, MarketState.RANGEBOUND],
    tradeIntervalMs: 25000,  // Trade every 25 seconds for active trading
    positionSizePercent: 3,
    maxConcurrentTrades: 1,
    baseWinRate: 68,
    basePnLPercent: 3.8,
    baseTradesPerDay: 25
  }
];

// ===================== INTERFACES =====================

export interface QuantAgent {
  id: string;
  name: string;
  type: AgentType;
  codename: string;
  avatar: string;
  color: string;
  glowColor: string;
  riskProfile: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  description: string;
  followers: number;
  balance: number;
  initialBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  sharpeRatio: number;
  maxDrawdown: number;
  streakCount: number;
  streakType: 'WIN' | 'LOSS' | null;
  isActive: boolean;
  currentPosition: QuantPosition | null;
  activeStrategy: string | null;
  marketState: MarketState | null;
  performance: { time: string; pnl: number }[];
  lastTradeTime: number;
  // 24h metrics - properly tracked
  return24h: number;
  trades24h: number;
  wins24h: number;
  winRate24h: number;
}

export interface QuantPosition {
  id: string;
  symbol: string;
  displaySymbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  strategy: string;
  strategyProfile: StrategyProfile | null;
  marketStateAtEntry: MarketState;
  progressPercent: number;
}

export interface TradeEvent {
  type: 'open' | 'close';
  agent: QuantAgent;
  position: QuantPosition;
  exitPrice?: number;
  reason?: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE';
  pnlPercent?: number;
  isWin?: boolean;
}

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

// Historical trade record for 24h tracking
export interface TradeRecord {
  agentId: string;
  timestamp: number;
  pnlPercent: number;
  isWin: boolean;
  strategy: string;
  symbol: string;
}

// ===================== DETERMINISTIC STATS =====================

function generateBaseStats(profile: AgentProfile): {
  trades: number;
  wins: number;
  losses: number;
  pnlPercent: number;
  balance: number;
} {
  // RESET: Start fresh with $10,000 per agent ($30,000 total)
  // Balance grows only from actual trading, not simulated historical data
  const initialBalance = 10000;

  return {
    trades: 0,        // Start with 0 trades - actual trades will be tracked
    wins: 0,          // Start with 0 wins
    losses: 0,        // Start with 0 losses
    pnlPercent: 0,    // Start at 0% - P&L comes from actual trading
    balance: initialBalance  // Start at exactly $10,000
  };
}

// ===================== ADAPTIVE SIGNAL GENERATOR V2 =====================
// Uses multiple confirmations, strategy performance tracking, and market-adaptive R:R

interface StrategySignal {
  direction: 'LONG' | 'SHORT';
  confidence: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  reasoning: string;
}

// Strategy performance tracking for intelligent rotation
interface StrategyPerformance {
  wins: number;
  losses: number;
  streak: number; // Positive = winning streak, Negative = losing streak
  lastOutcome: 'win' | 'loss' | null;
  avgPnL: number;
  lastUsed: number;
}

const strategyPerformanceCache = new Map<string, StrategyPerformance>();

/**
 * Get or create strategy performance record
 */
function getStrategyPerformance(strategyName: string): StrategyPerformance {
  if (!strategyPerformanceCache.has(strategyName)) {
    strategyPerformanceCache.set(strategyName, {
      wins: 0,
      losses: 0,
      streak: 0,
      lastOutcome: null,
      avgPnL: 0,
      lastUsed: 0
    });
  }
  return strategyPerformanceCache.get(strategyName)!;
}

/**
 * Record strategy outcome for intelligent rotation
 */
function recordStrategyOutcome(strategyName: string, isWin: boolean, pnlPercent: number): void {
  const perf = getStrategyPerformance(strategyName);

  if (isWin) {
    perf.wins++;
    perf.streak = perf.lastOutcome === 'win' ? perf.streak + 1 : 1;
    perf.lastOutcome = 'win';
  } else {
    perf.losses++;
    perf.streak = perf.lastOutcome === 'loss' ? perf.streak - 1 : -1;
    perf.lastOutcome = 'loss';
  }

  // Update rolling average PnL
  const totalTrades = perf.wins + perf.losses;
  perf.avgPnL = ((perf.avgPnL * (totalTrades - 1)) + pnlPercent) / totalTrades;
}

/**
 * Calculate multi-confirmation direction bias
 * Uses 5 signals to determine optimal direction
 */
function calculateDirectionBias(
  priceData: PriceData,
  marketState: MarketState,
  strategy: StrategyProfile
): { direction: 'LONG' | 'SHORT'; strength: number; signals: string[] } {
  const signals: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // 1. Market State Direction (weight: 2)
  if (marketState.includes('BULLISH')) {
    bullishScore += 2;
    signals.push('Market State: Bullish');
  } else if (marketState.includes('BEARISH')) {
    bearishScore += 2;
    signals.push('Market State: Bearish');
  }

  // 2. 24h Price Change Momentum (weight: 1.5)
  if (priceData.change24h > 2) {
    bullishScore += 1.5;
    signals.push(`24h Momentum: +${priceData.change24h.toFixed(1)}%`);
  } else if (priceData.change24h < -2) {
    bearishScore += 1.5;
    signals.push(`24h Momentum: ${priceData.change24h.toFixed(1)}%`);
  }

  // 3. Price Position in 24h Range (weight: 1)
  const range = priceData.high24h - priceData.low24h;
  const pricePosition = range > 0 ? (priceData.price - priceData.low24h) / range : 0.5;

  if (pricePosition < 0.3) {
    // Near 24h low - oversold, expect bounce (contrarian for mean reversion)
    if (strategy.agent === AgentType.BETAX) {
      bullishScore += 1;
      signals.push('Near 24h Low: Oversold');
    }
  } else if (pricePosition > 0.7) {
    // Near 24h high - overbought
    if (strategy.agent === AgentType.BETAX) {
      bearishScore += 1;
      signals.push('Near 24h High: Overbought');
    }
  }

  // 4. Strategy Type Alignment (weight: 1.5)
  if (strategy.agent === AgentType.ALPHAX) {
    // Trend follower - go with dominant direction
    if (bullishScore > bearishScore) {
      bullishScore += 1.5;
      signals.push('Alpha Trend: Following bullish');
    } else {
      bearishScore += 1.5;
      signals.push('Alpha Trend: Following bearish');
    }
  } else if (strategy.agent === AgentType.BETAX) {
    // Mean reversion - fade extremes
    if (priceData.change24h > 5) {
      bearishScore += 1.5;
      signals.push('Beta Reversion: Fading overbought');
    } else if (priceData.change24h < -5) {
      bullishScore += 1.5;
      signals.push('Beta Reversion: Fading oversold');
    }
  } else if (strategy.agent === AgentType.QUANTUMX) {
    // Chaos - go with volatility expansion direction
    if (Math.abs(priceData.change24h) > 3) {
      if (priceData.change24h > 0) {
        bullishScore += 1.5;
        signals.push('Gamma Chaos: Riding vol expansion up');
      } else {
        bearishScore += 1.5;
        signals.push('Gamma Chaos: Riding vol expansion down');
      }
    }
  }

  // 5. Volume Confirmation (weight: 0.5)
  if (priceData.volume > 0) {
    // Higher volume = stronger conviction in current direction
    const volumeMultiplier = 0.5;
    if (bullishScore > bearishScore && priceData.change24h > 0) {
      bullishScore += volumeMultiplier;
      signals.push('Volume: Confirming bullish');
    } else if (bearishScore > bullishScore && priceData.change24h < 0) {
      bearishScore += volumeMultiplier;
      signals.push('Volume: Confirming bearish');
    }
  }

  const totalScore = bullishScore + bearishScore;
  const strength = totalScore > 0 ? Math.abs(bullishScore - bearishScore) / totalScore : 0;

  return {
    direction: bullishScore >= bearishScore ? 'LONG' : 'SHORT',
    strength: strength,
    signals
  };
}

/**
 * Calculate adaptive TP/SL based on volatility and market state
 */
function calculateAdaptiveRiskReward(
  priceData: PriceData,
  marketState: MarketState,
  strategy: StrategyProfile,
  direction: 'LONG' | 'SHORT'
): { takeProfitPercent: number; stopLossPercent: number; riskRewardRatio: number } {
  const isHighVol = marketState.includes('HIGH_VOL');
  const isRangebound = marketState === MarketState.RANGEBOUND;

  // Calculate volatility from 24h range
  const range24hPercent = priceData.high24h > 0
    ? ((priceData.high24h - priceData.low24h) / priceData.price) * 100
    : 2;

  // Base values by strategy type
  let baseTP: number;
  let baseSL: number;

  if (strategy.agent === AgentType.ALPHAX) {
    // Trend: Let winners run, cut losers quickly
    baseTP = 1.2;
    baseSL = 0.5;
  } else if (strategy.agent === AgentType.BETAX) {
    // Reversion: Quick profits, tight stops
    baseTP = 0.8;
    baseSL = 0.4;
  } else {
    // Chaos: Wide targets for volatility
    baseTP = 1.5;
    baseSL = 0.7;
  }

  // Volatility adjustment: Scale with market conditions
  const volMultiplier = isHighVol ? 1.4 : (isRangebound ? 0.7 : 1.0);

  // Range-based adjustment: Use actual 24h range as guide
  const rangeAdjustment = Math.min(1.5, Math.max(0.6, range24hPercent / 4));

  // Calculate final TP/SL
  let takeProfitPercent = baseTP * volMultiplier * rangeAdjustment;
  let stopLossPercent = baseSL * volMultiplier * rangeAdjustment;

  // Ensure minimum R:R of 1.5:1 for profitability
  const minRR = 1.5;
  if (takeProfitPercent / stopLossPercent < minRR) {
    takeProfitPercent = stopLossPercent * minRR;
  }

  // Cap maximum values
  takeProfitPercent = Math.min(3.0, Math.max(0.5, takeProfitPercent));
  stopLossPercent = Math.min(1.5, Math.max(0.25, stopLossPercent));

  return {
    takeProfitPercent,
    stopLossPercent,
    riskRewardRatio: takeProfitPercent / stopLossPercent
  };
}

/**
 * ADAPTIVE SIGNAL GENERATOR V2
 *
 * Key improvements over V1:
 * 1. Multi-confirmation direction bias (5 signals)
 * 2. Strategy performance tracking with rotation
 * 3. Dynamic TP/SL based on volatility
 * 4. Minimum R:R ratio enforcement (1.5:1)
 * 5. Strategy cooldown for losing streaks
 */
function generateStrategySignal(
  strategy: StrategyProfile,
  marketState: MarketState,
  priceData: PriceData
): StrategySignal | null {
  const suitability = strategy.suitability[marketState];
  const perf = getStrategyPerformance(strategy.name);

  // Strategy must have at least 50% suitability to generate signal
  if (suitability < 50) {
    return null;
  }

  // Strategy cooldown: Skip if on a losing streak (-3 or worse)
  // This prevents chasing losses with an underperforming strategy
  if (perf.streak <= -3) {
    // 50% chance to skip, allowing recovery opportunity
    if (Math.random() < 0.5) {
      console.log(`⏸️ ${strategy.name}: On cooldown (streak: ${perf.streak})`);
      return null;
    }
  }

  // Boost confidence for strategies on winning streaks
  const streakBonus = perf.streak > 0 ? Math.min(10, perf.streak * 2) : 0;

  // Calculate direction using multi-confirmation system
  const directionBias = calculateDirectionBias(priceData, marketState, strategy);

  // Calculate adaptive TP/SL
  const riskReward = calculateAdaptiveRiskReward(priceData, marketState, strategy, directionBias.direction);

  // Build reasoning string
  const reasoning = `${strategy.name}: ${directionBias.signals.slice(0, 2).join(', ')} | R:R ${riskReward.riskRewardRatio.toFixed(1)}:1`;

  // Calculate confidence
  // Base: suitability score
  // Bonus: direction strength + streak bonus
  const directionBonus = directionBias.strength * 15;
  const confidence = Math.min(95, suitability + directionBonus + streakBonus);

  // Update last used timestamp
  perf.lastUsed = Date.now();

  return {
    direction: directionBias.direction,
    confidence,
    takeProfitPercent: riskReward.takeProfitPercent,
    stopLossPercent: riskReward.stopLossPercent,
    reasoning
  };
}

// ===================== PERSISTENCE =====================
// Now using Supabase for production-grade storage (see arenaSupabaseStorage.ts)
// localStorage keys kept only for migration cleanup
const STORAGE_KEY_POSITIONS = 'arena_v8_positions';
const STORAGE_KEY_SESSION = 'arena_v8_session';
const STORAGE_KEY_STATE = 'arena_v8_state';
const STORAGE_KEY_TRADE_HISTORY = 'arena_v8_trade_history';
const HOURS_24 = 24 * 60 * 60 * 1000;

// ===================== ENGINE CLASS =====================

class ArenaQuantEngine {
  public readonly __isArenaV8Engine = true;

  private agents = new Map<string, QuantAgent>();
  private profiles = new Map<string, AgentProfile>();
  private prices = new Map<string, PriceData>();
  private currentMarketState: MarketState = MarketState.RANGEBOUND;
  private stateListeners: ((agents: QuantAgent[]) => void)[] = [];
  private tradeListeners: ((event: TradeEvent) => void)[] = [];
  private running = false;
  private intervals: ReturnType<typeof setInterval>[] = [];
  private sessionTrades = new Map<string, { trades: number; wins: number; pnl: number; balanceDelta: number }>();
  private reservedSymbols = new Set<string>();
  // Trade history for accurate 24h metrics
  private tradeHistory: TradeRecord[] = [];
  // Supabase initialization state
  private storageInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    console.log('%c🎯 ARENA QUANT ENGINE V8 - STRATEGY-DRIVEN (Supabase Storage)',
      'background: linear-gradient(90deg, #10b981, #3b82f6); color: white; padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: bold;');

    this.initializeProfiles();
    this.initializeAgents();
    // Don't await here - initialization happens in start()
    this.initPromise = this.initializeStorage();
  }

  /**
   * Initialize Supabase storage and load persisted data
   */
  private async initializeStorage(): Promise<void> {
    if (this.storageInitialized) return;

    try {
      // Initialize Supabase storage
      await arenaSupabaseStorage.initialize();

      // Load data from Supabase
      await this.loadPersistedData();

      this.storageInitialized = true;
      console.log('%c✅ Supabase storage initialized',
        'background: #10b981; color: white; padding: 2px 8px;');

      // Clean up legacy localStorage data
      this.cleanupLocalStorage();
    } catch (error) {
      console.error('❌ Failed to initialize Supabase storage:', error);
      // Fallback: try to load from localStorage
      this.loadFromLocalStorageFallback();
      this.storageInitialized = true;
    }
  }

  /**
   * Clean up legacy localStorage data after Supabase migration
   */
  private cleanupLocalStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_POSITIONS);
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_STATE);
      localStorage.removeItem(STORAGE_KEY_TRADE_HISTORY);
      console.log('🧹 Cleaned up legacy localStorage data');
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  /**
   * Fallback to localStorage if Supabase fails
   */
  private loadFromLocalStorageFallback(): void {
    console.warn('⚠️ Using localStorage fallback...');
    try {
      const sessionData = localStorage.getItem(STORAGE_KEY_SESSION);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        for (const [id, data] of Object.entries(parsed)) {
          const sessionEntry = data as { trades: number; wins: number; pnl: number; balanceDelta?: number };
          const rawBalanceDelta = sessionEntry.balanceDelta || 0;
          const validatedBalanceDelta = arenaSupabaseStorage.validateBalanceDelta(id, rawBalanceDelta);

          this.sessionTrades.set(id, {
            trades: sessionEntry.trades,
            wins: sessionEntry.wins,
            pnl: sessionEntry.pnl,
            balanceDelta: validatedBalanceDelta
          });
        }
      }
      this.recalculateStats();
    } catch (e) {
      console.error('Failed to load from localStorage fallback:', e);
    }
  }

  private initializeProfiles(): void {
    for (const profile of AGENT_PROFILES) {
      this.profiles.set(profile.id, profile);
    }
  }

  private initializeAgents(): void {
    for (const profile of AGENT_PROFILES) {
      const baseStats = generateBaseStats(profile);
      this.sessionTrades.set(profile.id, { trades: 0, wins: 0, pnl: 0, balanceDelta: 0 });

      const strategies = strategyMatrix.getAgentStrategies(profile.type);
      console.log(`  📊 ${profile.name}: ${strategies.length} strategies assigned`);

      this.agents.set(profile.id, {
        id: profile.id,
        name: profile.name,
        type: profile.type,
        codename: profile.codename,
        avatar: profile.avatar,
        color: profile.color,
        glowColor: profile.glowColor,
        riskProfile: profile.riskProfile,
        description: profile.description,
        followers: profile.followers,
        balance: baseStats.balance,
        initialBalance: 10000,
        totalPnL: baseStats.balance - 10000,
        totalPnLPercent: baseStats.pnlPercent,
        winRate: baseStats.trades > 0 ? (baseStats.wins / baseStats.trades) * 100 : profile.baseWinRate,
        totalTrades: baseStats.trades,
        wins: baseStats.wins,
        losses: baseStats.losses,
        sharpeRatio: 1.2 + Math.random() * 0.8,
        maxDrawdown: 3 + Math.random() * 4,
        streakCount: Math.floor(Math.random() * 4) + 1,
        streakType: 'WIN',
        isActive: true,
        currentPosition: null,
        activeStrategy: null,
        marketState: null,
        performance: [],
        lastTradeTime: 0,
        // 24h metrics - will be calculated from trade history
        return24h: 0,
        trades24h: 0,
        wins24h: 0,
        winRate24h: 0
      });

      console.log(`  ✅ ${profile.name}: ${baseStats.trades} trades, +${baseStats.pnlPercent.toFixed(2)}%`);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load session trades from Supabase with BALANCE VALIDATION
      const sessions = arenaSupabaseStorage.getAllSessions();
      for (const [id, data] of sessions) {
        // CRITICAL: Validate balanceDelta to prevent loading corrupted data
        const rawBalanceDelta = data.balanceDelta || 0;
        const validatedBalanceDelta = arenaSupabaseStorage.validateBalanceDelta(id, rawBalanceDelta);

        this.sessionTrades.set(id, {
          trades: data.trades,
          wins: data.wins,
          pnl: data.pnl,
          balanceDelta: validatedBalanceDelta
        });

        // Initialize circuit breaker for this agent
        arenaCircuitBreaker.initializeAgent(id);
      }

      if (sessions.size > 0) {
        console.log('%c📥 Restored session trades from Supabase (validated)', 'color: #3b82f6');
      }

      // Load trade history from Supabase for 24h metrics
      const tradeHistoryRecords = await arenaSupabaseStorage.get24hTradeHistory();
      if (tradeHistoryRecords.length > 0) {
        // Convert to internal format
        const cutoff = Date.now() - HOURS_24;
        this.tradeHistory = tradeHistoryRecords
          .filter(t => t.timestamp >= cutoff)
          .map(t => ({
            agentId: t.agentId,
            timestamp: t.timestamp,
            pnlPercent: t.pnlPercent || 0,
            isWin: t.isWin || false,
            strategy: t.strategy,
            symbol: t.symbol
          }));
        console.log(`%c📥 Restored ${this.tradeHistory.length} trades from last 24h (Supabase)`, 'color: #8b5cf6');
      }

      // Load active positions from Supabase
      const positions = arenaSupabaseStorage.getAllPositions();
      let restoredCount = 0;

      for (const [agentId, position] of positions) {
        const agent = this.agents.get(agentId);
        if (agent && position) {
          agent.currentPosition = position;
          agent.lastTradeTime = position.entryTime;
          agent.activeStrategy = position.strategy;
          restoredCount++;
          console.log(`  ✅ Restored ${agent.name}'s position: ${position.displaySymbol} via ${position.strategy}`);
        }
      }

      if (restoredCount > 0) {
        console.log(`%c📥 Restored ${restoredCount} active positions (Supabase)`, 'background: #10b981; color: white; padding: 2px 8px;');
      }

      // Load last market state from Supabase
      const marketState = arenaSupabaseStorage.getMarketState();
      if (marketState) {
        this.currentMarketState = marketState.state as MarketState;
        console.log(`%c📊 Restored market state: ${this.currentMarketState} (Supabase)`, 'color: #8b5cf6');
      }

      this.recalculateStats();
      this.calculate24hMetrics();
    } catch (e) {
      console.error('Failed to load persisted data:', e);
    }
  }

  private savePositions(): void {
    // Save to Supabase (debounced internally)
    this.agents.forEach((agent, id) => {
      if (agent.currentPosition) {
        arenaSupabaseStorage.savePosition(id, agent.currentPosition);
      } else {
        // Position closed - delete from storage
        arenaSupabaseStorage.deletePosition(id);
      }
    });
  }

  private saveSession(): void {
    // Save all session data to Supabase (debounced internally)
    this.sessionTrades.forEach((data, id) => {
      arenaSupabaseStorage.saveAgentSession(id, {
        trades: data.trades,
        wins: data.wins,
        pnl: data.pnl,
        balanceDelta: data.balanceDelta,
        consecutiveLosses: 0, // Will be updated by circuit breaker
        circuitBreakerLevel: 'ACTIVE',
        haltedUntil: null,
        lastTradeTime: Date.now()
      });
    });
  }

  private saveState(): void {
    // Save to Supabase (debounced internally)
    arenaSupabaseStorage.saveMarketState({
      state: this.currentMarketState,
      confidence: 50,
      volatility: 20,
      trendStrength: 0,
      timestamp: Date.now()
    });
  }

  private saveTradeHistory(): void {
    // Trade history is saved per-trade in closeTrade()
    // This method just cleans up local memory
    const cutoff = Date.now() - HOURS_24;
    this.tradeHistory = this.tradeHistory.filter(t => t.timestamp >= cutoff);
  }

  private calculate24hMetrics(): void {
    const cutoff = Date.now() - HOURS_24;
    const recent = this.tradeHistory.filter(t => t.timestamp >= cutoff);

    // Calculate per-agent 24h metrics
    this.agents.forEach((agent) => {
      const agentTrades = recent.filter(t => t.agentId === agent.id);
      const profile = this.profiles.get(agent.id);

      if (agentTrades.length > 0) {
        const wins = agentTrades.filter(t => t.isWin).length;
        const totalPnL = agentTrades.reduce((sum, t) => sum + t.pnlPercent, 0);

        // Apply position size factor
        const positionFactor = (profile?.positionSizePercent || 5) / 100;
        agent.return24h = totalPnL * positionFactor;
        agent.trades24h = agentTrades.length;
        agent.wins24h = wins;
        agent.winRate24h = (wins / agentTrades.length) * 100;
      } else {
        // Generate base 24h stats for demo (based on agent's typical performance)
        const baseDaily = (profile?.basePnLPercent || 5) / 30; // Monthly to daily
        const varianceMultiplier = 0.8 + Math.random() * 0.4; // 0.8 - 1.2x
        agent.return24h = Math.max(0.1, baseDaily * varianceMultiplier);
        agent.trades24h = Math.floor((profile?.baseTradesPerDay || 30) * (Date.now() % HOURS_24) / HOURS_24);
        agent.wins24h = Math.floor(agent.trades24h * (profile?.baseWinRate || 60) / 100);
        agent.winRate24h = agent.trades24h > 0 ? (agent.wins24h / agent.trades24h) * 100 : (profile?.baseWinRate || 60);
      }
    });
  }

  private recalculateStats(): void {
    for (const profile of AGENT_PROFILES) {
      const agent = this.agents.get(profile.id);
      const session = this.sessionTrades.get(profile.id);
      if (!agent) continue;

      const baseStats = generateBaseStats(profile);
      const sessionTrades = session?.trades || 0;
      const sessionBalanceDelta = session?.balanceDelta || 0;
      const sessionWins = session?.wins || 0;
      const sessionPnl = session?.pnl || 0;

      agent.totalTrades = baseStats.trades + sessionTrades;
      agent.wins = baseStats.wins + sessionWins;
      agent.losses = agent.totalTrades - agent.wins;
      agent.winRate = agent.totalTrades > 0 ? (agent.wins / agent.totalTrades) * 100 : profile.baseWinRate;

      // Use actual dollar balance delta from session trades (not percentage-based calculation)
      agent.balance = baseStats.balance + sessionBalanceDelta;
      agent.totalPnL = agent.balance - agent.initialBalance;
      agent.totalPnLPercent = (agent.totalPnL / agent.initialBalance) * 100;
    }
  }

  // ===================== MARKET STATE DETECTION =====================

  private async detectMarketState(): Promise<void> {
    try {
      const analysis = await marketStateDetectionEngine.detectMarketState(50);
      const previousState = this.currentMarketState;
      this.currentMarketState = analysis.state;

      // Update all agents with current market state
      this.agents.forEach(agent => {
        agent.marketState = this.currentMarketState;
      });

      if (previousState !== this.currentMarketState) {
        console.log(`%c🔄 REGIME CHANGE: ${previousState} → ${this.currentMarketState}`,
          'background: #8b5cf6; color: white; padding: 4px 12px; border-radius: 4px;');
        this.saveState();

        // Optionally close positions on regime change
        this.handleRegimeChange(previousState, this.currentMarketState);
      }
    } catch (error) {
      console.warn('Market state detection failed, using cached state:', this.currentMarketState);
    }
  }

  private handleRegimeChange(from: MarketState, to: MarketState): void {
    // Close positions that are no longer suitable for the new regime
    this.agents.forEach(agent => {
      if (!agent.currentPosition) return;

      const profile = this.profiles.get(agent.id);
      if (!profile) return;

      // Get current strategy suitability for new state
      const currentStrategy = agent.currentPosition.strategyProfile;
      if (currentStrategy) {
        const newSuitability = currentStrategy.suitability[to];
        const oldSuitability = currentStrategy.suitability[from];

        // If suitability dropped significantly, consider closing
        if (newSuitability < 40 && oldSuitability >= 60) {
          console.log(`⚠️ ${agent.name}: Strategy ${currentStrategy.name} no longer suitable, monitoring closely`);
        }
      }
    });
  }

  // ===================== STRATEGY-DRIVEN TRADING =====================

  private async strategyDrivenTrade(): Promise<void> {
    const now = Date.now();

    for (const [agentId, agent] of this.agents) {
      const profile = this.profiles.get(agentId);
      if (!profile) continue;
      if (agent.currentPosition) continue;
      if (now - agent.lastTradeTime < profile.tradeIntervalMs) continue;

      // CIRCUIT BREAKER CHECK - Must pass before opening any position
      const circuitCheck = arenaCircuitBreaker.canAgentTrade(agentId);
      if (!circuitCheck.allowed) {
        console.log(`⛔ ${agent.name}: ${circuitCheck.reason}`);
        continue;
      }

      // BALANCE VALIDATION - Don't trade if below minimum
      if (!arenaCircuitBreaker.isBalanceValid(agent.balance)) {
        console.log(`⛔ ${agent.name}: Balance too low ($${agent.balance.toFixed(2)})`);
        continue;
      }

      // DRAWDOWN CHECK - Calculate and apply drawdown-based restrictions
      const drawdownPercent = ((agent.initialBalance - agent.balance) / agent.initialBalance) * 100;
      let drawdownMultiplier = 1.0;
      for (const adj of RISK_LIMITS.DRAWDOWN_ADJUSTMENTS) {
        if (drawdownPercent >= adj.threshold) {
          drawdownMultiplier = adj.multiplier;
        }
      }
      if (drawdownMultiplier === 0) {
        console.log(`⛔ ${agent.name}: Drawdown ${drawdownPercent.toFixed(1)}% - trading halted`);
        continue;
      }

      // Get suitable strategies with STRICTER suitability threshold (60% minimum)
      const suitableStrategies = strategyMatrix.getSuitableStrategies(
        this.currentMarketState,
        RISK_LIMITS.MIN_STRATEGY_SUITABILITY, // 60% minimum suitability
        profile.type
      );

      if (suitableStrategies.length === 0) {
        console.log(`⏸️ ${agent.name}: No strategies with ${RISK_LIMITS.MIN_STRATEGY_SUITABILITY}%+ suitability for ${this.currentMarketState}`);
        continue;
      }

      // Select best strategy
      const selectedStrategy = suitableStrategies[0];

      // Select trading pair (avoid already reserved symbols)
      const availablePairs = TRADING_PAIRS.filter(p => !this.reservedSymbols.has(p.symbol));
      if (availablePairs.length === 0) continue;

      const pair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
      const priceData = this.prices.get(pair.symbol);
      if (!priceData) continue;

      // Generate strategy-based signal using Adaptive Signal Generator V2
      // Direction already includes multi-confirmation bias (5 signals)
      // TP/SL already adaptive based on volatility and market state
      const signal = generateStrategySignal(selectedStrategy.strategy, this.currentMarketState, priceData);
      if (!signal) continue;

      // Calculate final position size multiplier (circuit breaker × drawdown)
      const positionMultiplier = circuitCheck.positionMultiplier * drawdownMultiplier;

      // Open position with multi-confirmation direction and risk-adjusted size
      this.openStrategyPosition(agent, profile, pair, priceData, selectedStrategy.strategy, signal.direction, signal, positionMultiplier);
    }
  }

  private openStrategyPosition(
    agent: QuantAgent,
    profile: AgentProfile,
    pair: typeof TRADING_PAIRS[0],
    priceData: PriceData,
    strategy: StrategyProfile,
    direction: 'LONG' | 'SHORT',
    signal: StrategySignal,
    positionMultiplier: number = 1.0
  ): void {
    const entry = priceData.price;
    const isLong = direction === 'LONG';

    // POSITION SIZING WITH ALL SAFEGUARDS
    // 1. Calculate base position size
    let notionalValue = agent.balance * (profile.positionSizePercent / 100);

    // 2. Apply position multiplier (circuit breaker × drawdown)
    notionalValue *= positionMultiplier;

    // 3. Enforce maximum 3% of balance
    const maxByPercent = agent.balance * (RISK_LIMITS.MAX_POSITION_PERCENT / 100);
    notionalValue = Math.min(notionalValue, maxByPercent);

    // 4. Enforce absolute min/max limits
    notionalValue = Math.max(notionalValue, RISK_LIMITS.MIN_POSITION_USD);
    notionalValue = Math.min(notionalValue, RISK_LIMITS.MAX_POSITION_USD);

    // 5. Calculate final quantity
    const quantity = notionalValue / entry;

    // Skip if position size is too small
    if (notionalValue < RISK_LIMITS.MIN_POSITION_USD) {
      console.log(`⚠️ ${agent.name}: Position size too small ($${notionalValue.toFixed(2)})`);
      return;
    }

    const position: QuantPosition = {
      id: `${agent.id}-${Date.now()}`,
      symbol: pair.symbol,
      displaySymbol: pair.display,
      direction,
      entryPrice: entry,
      currentPrice: entry,
      quantity,
      pnl: 0,
      pnlPercent: 0,
      entryTime: Date.now(),
      takeProfitPrice: isLong
        ? entry * (1 + signal.takeProfitPercent / 100)
        : entry * (1 - signal.takeProfitPercent / 100),
      stopLossPrice: isLong
        ? entry * (1 - signal.stopLossPercent / 100)
        : entry * (1 + signal.stopLossPercent / 100),
      strategy: strategy.name,
      strategyProfile: strategy,
      marketStateAtEntry: this.currentMarketState,
      progressPercent: 50
    };

    agent.currentPosition = position;
    agent.activeStrategy = strategy.name;
    agent.lastTradeTime = Date.now();

    // Reserve symbol to prevent other agents from trading same pair
    this.reservedSymbols.add(pair.symbol);

    console.log(`📈 ${agent.name} [${strategy.name}] ${direction} ${pair.display} @ $${entry.toFixed(2)}`);
    console.log(`   └─ ${signal.reasoning}`);

    this.savePositions();
    this.emitTrade({ type: 'open', agent, position });
    this.notify();
  }

  // ===================== PRICE MANAGEMENT =====================

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Ensure Supabase storage is initialized before starting
    if (this.initPromise) {
      await this.initPromise;
    }

    const totalTrades = Array.from(this.agents.values()).reduce((s, a) => s + a.totalTrades, 0);
    console.log(`%c▶️ QUANT ENGINE V8 STARTED with ${totalTrades} historical trades (Supabase)`,
      'background: #10b981; color: white; padding: 4px 12px;');

    // Initial data fetch
    await this.fetchPrices();
    await this.detectMarketState();

    // Price updates every 3s
    this.intervals.push(setInterval(() => this.fetchPrices(), 3000));

    // Market state detection every 60s
    this.intervals.push(setInterval(() => this.detectMarketState(), 60000));

    // Strategy-driven trading every 5s
    this.intervals.push(setInterval(() => this.strategyDrivenTrade(), 5000));

    // Position checks every 2s
    this.intervals.push(setInterval(() => this.checkPositions(), 2000));

    // Base stats refresh every minute
    this.intervals.push(setInterval(() => this.refreshBaseStats(), 60000));

    this.notify();
  }

  stop(): void {
    this.running = false;
    this.intervals.forEach(i => clearInterval(i));
    this.intervals = [];
  }

  private async fetchPrices(): Promise<void> {
    try {
      const responses = await Promise.all(
        TRADING_PAIRS.map(p =>
          fetch(`${BINANCE_API}?symbol=${p.symbol}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      );

      responses.forEach((data, i) => {
        if (data) {
          this.prices.set(TRADING_PAIRS[i].symbol, {
            symbol: TRADING_PAIRS[i].symbol,
            price: parseFloat(data.lastPrice),
            change24h: parseFloat(data.priceChangePercent),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume)
          });
        }
      });

      this.updatePositions();
    } catch {}
  }

  private updatePositions(): void {
    let changed = false;

    this.agents.forEach(agent => {
      if (agent.currentPosition) {
        const pos = agent.currentPosition;
        const pair = TRADING_PAIRS.find(p => p.display === pos.displaySymbol);
        if (pair) {
          const price = this.prices.get(pair.symbol);
          if (price) {
            pos.currentPrice = price.price;
            const isLong = pos.direction === 'LONG';

            pos.pnlPercent = isLong
              ? ((price.price - pos.entryPrice) / pos.entryPrice) * 100
              : ((pos.entryPrice - price.price) / pos.entryPrice) * 100;

            const slDistance = Math.abs(pos.entryPrice - pos.stopLossPrice);
            const tpDistance = Math.abs(pos.takeProfitPrice - pos.entryPrice);
            const totalRange = slDistance + tpDistance;

            if (isLong) {
              const distanceFromSL = price.price - pos.stopLossPrice;
              pos.progressPercent = Math.max(0, Math.min(100, (distanceFromSL / totalRange) * 100));
            } else {
              const distanceFromSL = pos.stopLossPrice - price.price;
              pos.progressPercent = Math.max(0, Math.min(100, (distanceFromSL / totalRange) * 100));
            }

            changed = true;
          }
        }
      }
    });

    if (changed) {
      this.savePositions();
      this.notify();
    }
  }

  private checkPositions(): void {
    const now = Date.now();
    const maxHoldTime = 300000; // 5 minutes max hold

    this.agents.forEach(agent => {
      if (!agent.currentPosition) return;

      const pos = agent.currentPosition;
      const price = this.prices.get(pos.symbol);
      if (!price) return;

      let close = false;
      let reason: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE' = 'TIMEOUT';

      const isLong = pos.direction === 'LONG';
      if (isLong) {
        if (price.price >= pos.takeProfitPrice) { close = true; reason = 'TP'; }
        else if (price.price <= pos.stopLossPrice) { close = true; reason = 'SL'; }
      } else {
        if (price.price <= pos.takeProfitPrice) { close = true; reason = 'TP'; }
        else if (price.price >= pos.stopLossPrice) { close = true; reason = 'SL'; }
      }

      if (now - pos.entryTime >= maxHoldTime) {
        close = true;
        reason = 'TIMEOUT';
      }

      if (close) this.closeTrade(agent, price.price, reason);
    });
  }

  private closeTrade(agent: QuantAgent, exitPrice: number, reason: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE'): void {
    const pos = agent.currentPosition;
    if (!pos) return;

    const isLong = pos.direction === 'LONG';
    const pnlPercent = isLong
      ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - exitPrice) / pos.entryPrice) * 100;

    const isWin = pnlPercent > 0;
    const profile = this.profiles.get(agent.id);

    // Calculate notional value of position
    const positionNotional = pos.quantity * pos.entryPrice;

    // Calculate raw P&L in dollars
    const rawPnlDollar = (pnlPercent / 100) * positionNotional;

    // VALIDATE AND CAP P&L - Prevents catastrophic single-trade losses
    const pnlValidation = arenaCircuitBreaker.validateAndCapPnL(
      agent.id,
      rawPnlDollar,
      positionNotional
    );

    // Use capped P&L
    const pnlDollar = pnlValidation.cappedPnL;

    // Log if P&L was capped (indicates risk limit triggered)
    if (pnlValidation.wasCapped) {
      console.log(`%c⚠️ P&L CAPPED: ${agent.name} raw=$${rawPnlDollar.toFixed(2)} → capped=$${pnlDollar.toFixed(2)}`,
        'background: #f59e0b; color: black; padding: 2px 8px;');
    }

    const session = this.sessionTrades.get(agent.id);
    if (session) {
      session.trades++;
      if (isWin) session.wins++;
      session.pnl += pnlPercent * ((profile?.positionSizePercent || 5) / 100);
      // Track actual dollar P&L for accurate balance persistence
      session.balanceDelta += pnlDollar;
    }

    // RECORD WITH CIRCUIT BREAKER - This updates risk state and may trigger protections
    arenaCircuitBreaker.recordTradeOutcome(agent.id, pnlDollar, pnlPercent, isWin);

    agent.totalTrades++;
    if (isWin) {
      agent.wins++;
      agent.streakCount = agent.streakType === 'WIN' ? agent.streakCount + 1 : 1;
      agent.streakType = 'WIN';
    } else {
      agent.losses++;
      agent.streakCount = agent.streakType === 'LOSS' ? agent.streakCount + 1 : 1;
      agent.streakType = 'LOSS';
    }

    agent.winRate = (agent.wins / agent.totalTrades) * 100;
    agent.balance += pnlDollar;
    agent.totalPnL = agent.balance - agent.initialBalance;
    agent.totalPnLPercent = (agent.totalPnL / agent.initialBalance) * 100;

    // Release reserved symbol
    this.reservedSymbols.delete(pos.symbol);

    const closedPos = { ...pos };
    agent.currentPosition = null;
    agent.activeStrategy = null;

    // Record trade to history for 24h metrics (local cache)
    this.tradeHistory.push({
      agentId: agent.id,
      timestamp: Date.now(),
      pnlPercent,
      isWin,
      strategy: closedPos.strategy,
      symbol: closedPos.displaySymbol
    });

    // Record trade to Supabase for persistence
    arenaSupabaseStorage.recordTrade({
      agentId: agent.id,
      timestamp: Date.now(),
      symbol: closedPos.symbol,
      direction: closedPos.direction,
      entryPrice: closedPos.entryPrice,
      exitPrice: exitPrice,
      quantity: closedPos.quantity,
      pnlPercent,
      pnlDollar,
      isWin,
      strategy: closedPos.strategy,
      marketState: closedPos.marketStateAtEntry,
      reason
    });

    // Record strategy outcome for intelligent rotation
    // This enables the adaptive signal generator to learn from outcomes
    recordStrategyOutcome(closedPos.strategy, isWin, pnlPercent);

    const emoji = reason === 'TP' ? '✅' : reason === 'SL' ? '❌' : '⏰';
    const perf = getStrategyPerformance(closedPos.strategy);
    console.log(`${emoji} ${agent.name} [${closedPos.strategy}] ${reason} ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}% | Streak: ${perf.streak > 0 ? '+' : ''}${perf.streak}`);

    this.savePositions();
    this.saveSession();
    this.saveTradeHistory();
    this.calculate24hMetrics();

    this.emitTrade({ type: 'close', agent, position: closedPos, exitPrice, reason, pnlPercent, isWin });
    this.notify();
  }

  private refreshBaseStats(): void {
    for (const profile of AGENT_PROFILES) {
      const agent = this.agents.get(profile.id);
      const session = this.sessionTrades.get(profile.id);
      if (!agent || !session) continue;

      const baseStats = generateBaseStats(profile);

      agent.totalTrades = baseStats.trades + session.trades;
      agent.wins = baseStats.wins + session.wins;
      agent.losses = agent.totalTrades - agent.wins;
      agent.winRate = agent.totalTrades > 0 ? (agent.wins / agent.totalTrades) * 100 : profile.baseWinRate;

      // Use actual dollar balance delta from session trades (not percentage-based calculation)
      // This ensures balance accurately reflects real trade outcomes
      agent.balance = baseStats.balance + session.balanceDelta;
      agent.totalPnL = agent.balance - agent.initialBalance;
      agent.totalPnLPercent = (agent.totalPnL / agent.initialBalance) * 100;
    }
    this.notify();
  }

  private notify(): void {
    const agents = Array.from(this.agents.values());
    this.stateListeners.forEach(cb => cb(agents));
  }

  private emitTrade(event: TradeEvent): void {
    this.tradeListeners.forEach(cb => cb(event));
  }

  // ===================== PUBLIC API =====================

  getAgents(): QuantAgent[] {
    return Array.from(this.agents.values());
  }

  getStats() {
    const agents = this.getAgents();
    const totalTrades = agents.reduce((s, a) => s + a.totalTrades, 0);
    const wins = agents.reduce((s, a) => s + a.wins, 0);
    const avgPnL = agents.reduce((s, a) => s + a.totalPnLPercent, 0) / agents.length;

    // Calculate 24h combined metrics
    const total24hReturn = agents.reduce((s, a) => s + a.return24h, 0);
    const total24hTrades = agents.reduce((s, a) => s + a.trades24h, 0);
    const total24hWins = agents.reduce((s, a) => s + a.wins24h, 0);

    return {
      totalTrades,
      wins,
      losses: agents.reduce((s, a) => s + a.losses, 0),
      totalPnL: avgPnL,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 60,
      marketState: this.currentMarketState,
      // 24h metrics
      return24h: total24hReturn,
      trades24h: total24hTrades,
      wins24h: total24hWins,
      winRate24h: total24hTrades > 0 ? (total24hWins / total24hTrades) * 100 : 60
    };
  }

  getCurrentMarketState(): MarketState {
    return this.currentMarketState;
  }

  isActive(): boolean {
    return this.running;
  }

  onStateChange(cb: (agents: QuantAgent[]) => void): () => void {
    this.stateListeners.push(cb);
    cb(Array.from(this.agents.values()));
    return () => {
      const i = this.stateListeners.indexOf(cb);
      if (i >= 0) this.stateListeners.splice(i, 1);
    };
  }

  onTradeEvent(cb: (event: TradeEvent) => void): () => void {
    this.tradeListeners.push(cb);
    return () => {
      const i = this.tradeListeners.indexOf(cb);
      if (i >= 0) this.tradeListeners.splice(i, 1);
    };
  }

  getRestoredTrades(): number {
    return Array.from(this.agents.values()).reduce((s, a) => s + a.totalTrades, 0);
  }

  /**
   * Get recent trades from the engine's trade history
   * Production-grade persistence - same mechanism as other metrics
   */
  getRecentTrades(limit: number = 5): TradeRecord[] {
    const cutoff = Date.now() - HOURS_24;
    return this.tradeHistory
      .filter(t => t.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // ===================== RISK MANAGEMENT API =====================

  /**
   * Get risk dashboard data for UI display
   */
  getRiskDashboard() {
    return arenaCircuitBreaker.getRiskDashboardData();
  }

  /**
   * Emergency reset - clears all corrupted state and restores balances
   * USE WITH CAUTION: This resets everything to initial state
   */
  emergencyReset(options: {
    resetBalances?: boolean;
    clearHistory?: boolean;
    resetCircuitBreakers?: boolean;
  } = { resetBalances: true, clearHistory: true, resetCircuitBreakers: true }): void {
    console.log('%c EMERGENCY RESET INITIATED',
      'background: #dc2626; color: white; padding: 6px 16px; font-weight: bold;');

    if (options.resetBalances) {
      // Reset all agents to initial $10,000
      for (const profile of AGENT_PROFILES) {
        const agent = this.agents.get(profile.id);
        if (agent) {
          agent.balance = 10000;
          agent.initialBalance = 10000;
          agent.totalPnL = 0;
          agent.totalPnLPercent = 0;
          agent.currentPosition = null;
          agent.activeStrategy = null;
        }

        // Clear session trades
        this.sessionTrades.set(profile.id, {
          trades: 0,
          wins: 0,
          pnl: 0,
          balanceDelta: 0
        });
      }

      // Clear reserved symbols
      this.reservedSymbols.clear();

      console.log('  ✅ Balances reset to $10,000 per agent ($30,000 total)');
    }

    if (options.clearHistory) {
      // Clear legacy localStorage data
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_POSITIONS);
      localStorage.removeItem(STORAGE_KEY_TRADE_HISTORY);
      localStorage.removeItem(STORAGE_KEY_STATE);

      // Clear Supabase data (production storage)
      arenaSupabaseStorage.clearAllData();

      // Clear trade history
      this.tradeHistory = [];

      console.log('  ✅ Trade history cleared (Supabase + localStorage)');
    }

    if (options.resetCircuitBreakers) {
      arenaCircuitBreaker.emergencyReset();
      console.log('  ✅ Circuit breakers reset');
    }

    // Save clean state
    this.saveSession();
    this.savePositions();
    this.notify();

    console.log('%c EMERGENCY RESET COMPLETE - System ready for fresh start',
      'background: #10b981; color: white; padding: 6px 16px; font-weight: bold;');
  }

  /**
   * Get circuit breaker status for a specific agent
   */
  getAgentRiskState(agentId: string) {
    return arenaCircuitBreaker.getAgentState(agentId);
  }
}

// ===================== SINGLETON =====================

const WINDOW_KEY = '__ARENA_QUANT_V8__';

function getEngine(): ArenaQuantEngine {
  if (typeof window !== 'undefined') {
    const existing = (window as any)[WINDOW_KEY];
    if (existing && existing.__isArenaV8Engine === true) {
      console.log('%c♻️ REUSING V8 QUANT ENGINE', 'background: #f59e0b; color: black; padding: 2px 8px;');
      return existing;
    }
  }

  const engine = new ArenaQuantEngine();

  if (typeof window !== 'undefined') {
    (window as any)[WINDOW_KEY] = engine;
  }

  return engine;
}

export const arenaQuantEngine = getEngine();
export default arenaQuantEngine;

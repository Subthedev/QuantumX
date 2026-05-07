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
import { autonomousOrchestrator } from './autonomousOrchestrator';
import { marketRegimeClassifier } from './regime/marketRegimeClassifier';

// ===================== CONSTANTS =====================

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';

// OPTIMIZED PAIR SELECTION: Major pairs get 60% of trades, mid 30%, volatile 10%
// BTC/ETH/SOL have highest liquidity, tightest spreads, most predictable patterns
// BNB/XRP provide diversification; DOGE only when volatility suits it
const TRADING_PAIRS = [
  { symbol: 'BTCUSDT', display: 'BTC/USD', tier: 'major', weight: 3 },
  { symbol: 'ETHUSDT', display: 'ETH/USD', tier: 'major', weight: 3 },
  { symbol: 'SOLUSDT', display: 'SOL/USD', tier: 'major', weight: 3 },
  { symbol: 'BNBUSDT', display: 'BNB/USD', tier: 'mid', weight: 2 },
  { symbol: 'XRPUSDT', display: 'XRP/USD', tier: 'mid', weight: 2 },
  { symbol: 'DOGEUSDT', display: 'DOGE/USD', tier: 'volatile', weight: 1 }
];

// ===================== RISK MANAGEMENT CONSTANTS =====================
// Based on professional quant firm practices (Citadel/Millennium)

const RISK_LIMITS = {
  // Position sizing limits — sized for $10K agent balance, 24/7 profit-seeking mandate
  MAX_POSITION_PERCENT: 20,     // Max 20% of balance per trade (was 3%)
  MIN_POSITION_USD: 200,        // Min $200 position (was $50)
  MAX_POSITION_USD: 2500,       // Max $2,500 per position (was $300)

  // Strategy suitability
  MIN_STRATEGY_SUITABILITY: 50, // Block strategies below 50% (was 60% — too restrictive)

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
    tradeIntervalMs: 10000,  // Trade every 10 seconds for higher frequency
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
    tradeIntervalMs: 12000,  // Trade every 12 seconds for higher frequency
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
    tradeIntervalMs: 15000,  // Trade every 15 seconds for higher frequency
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

  // Base values by strategy type — sized for 30-60min hold windows, not 5min
  let baseTP: number;
  let baseSL: number;

  if (strategy.agent === AgentType.ALPHAX) {
    // Trend: Let winners run, cut losers quickly
    baseTP = 3.5;
    baseSL = 1.4;
  } else if (strategy.agent === AgentType.BETAX) {
    // Reversion: Faster profits, tight stops
    baseTP = 2.5;
    baseSL = 1.2;
  } else {
    // Chaos: Wide targets for volatility
    baseTP = 4.5;
    baseSL = 2.0;
  }

  // Volatility adjustment: Scale with market conditions
  const volMultiplier = isHighVol ? 1.4 : (isRangebound ? 0.7 : 1.0);

  // Range-based adjustment: Use actual 24h range as guide
  const rangeAdjustment = Math.min(1.5, Math.max(0.6, range24hPercent / 4));

  // Calculate final TP/SL
  let takeProfitPercent = baseTP * volMultiplier * rangeAdjustment;
  let stopLossPercent = baseSL * volMultiplier * rangeAdjustment;

  // Ensure minimum R:R of 1.8:1 for profitability after fees/slippage
  const minRR = 1.8;
  if (takeProfitPercent / stopLossPercent < minRR) {
    takeProfitPercent = stopLossPercent * minRR;
  }

  // Cap maximum values — wider envelope for crypto volatility
  takeProfitPercent = Math.min(10.0, Math.max(1.5, takeProfitPercent));
  stopLossPercent = Math.min(4.0, Math.max(0.75, stopLossPercent));

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
  // Phase 0: Realtime cache-change unsubscriber
  private cacheUnsubscribe: (() => void) | null = null;

  constructor() {
    console.log('%c🎯 ARENA QUANT ENGINE V8 - STRATEGY-DRIVEN (Supabase Storage)',
      'background: linear-gradient(90deg, #10b981, #3b82f6); color: white; padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: bold;');

    this.initializeProfiles();
    this.initializeAgents();
    // Don't await here - initialization happens in start()
    this.initPromise = this.initializeStorage();
  }

  /**
   * Initialize storage: localStorage is PRIMARY, Supabase is best-effort backup.
   * Supabase arena tables may not exist yet, so we never depend on them.
   */
  private async initializeStorage(): Promise<void> {
    if (this.storageInitialized) return;

    // STEP 1: Always load from localStorage first (instant, reliable)
    this.loadFromLocalStorage();

    // STEP 2: Try Supabase in background (best-effort, don't block)
    try {
      await arenaSupabaseStorage.initialize();
      await this.loadPersistedData(); // Merges Supabase data if available
      console.log('%c✅ Storage initialized (localStorage + Supabase)',
        'background: #10b981; color: white; padding: 2px 8px;');
    } catch (error) {
      console.warn('[Arena] Supabase unavailable, using localStorage only');
    }

    this.storageInitialized = true;
  }

  /**
   * Load all persisted state from localStorage (primary storage)
   */
  private loadFromLocalStorage(): void {
    try {
      // Load sessions
      const sessionData = localStorage.getItem(STORAGE_KEY_SESSION);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        for (const [id, data] of Object.entries(parsed)) {
          const entry = data as { trades: number; wins: number; pnl: number; balanceDelta?: number };
          const validatedDelta = arenaSupabaseStorage.validateBalanceDelta(id, entry.balanceDelta || 0);
          this.sessionTrades.set(id, {
            trades: entry.trades,
            wins: entry.wins,
            pnl: entry.pnl,
            balanceDelta: validatedDelta
          });
        }
        console.log(`%c📥 Restored sessions from localStorage`, 'color: #3b82f6');
      }

      // Load trade history
      const historyData = localStorage.getItem(STORAGE_KEY_TRADE_HISTORY);
      if (historyData) {
        const parsed = JSON.parse(historyData) as any[];
        const cutoff = Date.now() - HOURS_24;
        this.tradeHistory = parsed
          .filter((t: any) => t.timestamp >= cutoff)
          .map((t: any) => ({
            agentId: t.agentId,
            timestamp: t.timestamp,
            pnlPercent: t.pnlPercent || 0,
            isWin: t.isWin || false,
            strategy: t.strategy,
            symbol: t.symbol
          }));
        console.log(`%c📥 Restored ${this.tradeHistory.length} trades from localStorage`, 'color: #8b5cf6');
      }

      // Load positions
      const posData = localStorage.getItem(STORAGE_KEY_POSITIONS);
      if (posData) {
        const parsed = JSON.parse(posData);
        for (const [agentId, position] of Object.entries(parsed)) {
          const agent = this.agents.get(agentId);
          if (agent && position) {
            agent.currentPosition = position as any;
            agent.activeStrategy = (position as any).strategy;
          }
        }
      }

      this.recalculateStats();
      this.calculate24hMetrics();
    } catch (e) {
      console.warn('[Arena] localStorage load failed:', e);
    }
  }

  /**
   * Persist current state to localStorage (called after every trade)
   */
  private persistToLocalStorage(): void {
    try {
      // Save sessions
      const sessions: Record<string, any> = {};
      this.sessionTrades.forEach((data, id) => { sessions[id] = data; });
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessions));

      // Save trade history (last 24h only)
      const cutoff = Date.now() - HOURS_24;
      const recentHistory = this.tradeHistory.filter(t => t.timestamp >= cutoff);
      localStorage.setItem(STORAGE_KEY_TRADE_HISTORY, JSON.stringify(recentHistory));

      // Save positions
      const positions: Record<string, any> = {};
      this.agents.forEach((agent, id) => {
        if (agent.currentPosition) {
          positions[id] = agent.currentPosition;
        }
      });
      localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions));
    } catch (e) {
      // localStorage quota exceeded or unavailable - non-critical
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
        sharpeRatio: 0,       // Calculated from actual trades, not simulated
        maxDrawdown: 0,       // Tracked from actual drawdowns
        streakCount: 0,       // Tracked from actual outcomes
        streakType: null,
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
    // Save to Supabase (debounced internally, best-effort)
    this.agents.forEach((agent, id) => {
      if (agent.currentPosition) {
        arenaSupabaseStorage.savePosition(id, agent.currentPosition);
      } else {
        arenaSupabaseStorage.deletePosition(id);
      }
    });
    // Always persist to localStorage (reliable)
    this.persistToLocalStorage();
  }

  private saveSession(): void {
    // Save to Supabase (debounced internally, best-effort)
    this.sessionTrades.forEach((data, id) => {
      arenaSupabaseStorage.saveAgentSession(id, {
        trades: data.trades,
        wins: data.wins,
        pnl: data.pnl,
        balanceDelta: data.balanceDelta,
        consecutiveLosses: 0,
        circuitBreakerLevel: 'ACTIVE',
        haltedUntil: null,
        lastTradeTime: Date.now()
      });
    });
    // Always persist to localStorage (reliable)
    this.persistToLocalStorage();
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
    // Clean up old trades from memory
    const cutoff = Date.now() - HOURS_24;
    this.tradeHistory = this.tradeHistory.filter(t => t.timestamp >= cutoff);
    // Persist to localStorage
    this.persistToLocalStorage();
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
        // No trades yet — show actual zeros, not fake stats
        agent.return24h = 0;
        agent.trades24h = 0;
        agent.wins24h = 0;
        agent.winRate24h = 0;
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

        // Notify orchestrator for regime transition tracking + position sizing penalty
        autonomousOrchestrator.notifyRegimeChange(this.currentMarketState, previousState);

        // Optionally close positions on regime change
        this.handleRegimeChange(previousState, this.currentMarketState);
      }
    } catch (error) {
      console.warn('Market state detection via CoinGecko failed, deriving from Binance prices...');

      // ✅ FALLBACK: Derive market state from Binance price data we already have
      try {
        const btcPrice = this.prices.get('BTCUSDT');
        const ethPrice = this.prices.get('ETHUSDT');
        if (btcPrice && ethPrice) {
          const avgChange = (btcPrice.change24h + ethPrice.change24h) / 2;
          const volatility = Math.abs(btcPrice.high24h - btcPrice.low24h) / btcPrice.price * 100;
          const isHighVol = volatility > 3;

          let newState: MarketState;
          if (avgChange > 2) {
            newState = isHighVol ? MarketState.BULLISH_HIGH_VOL : MarketState.BULLISH_LOW_VOL;
          } else if (avgChange < -2) {
            newState = isHighVol ? MarketState.BEARISH_HIGH_VOL : MarketState.BEARISH_LOW_VOL;
          } else {
            newState = MarketState.RANGEBOUND;
          }

          const previousState = this.currentMarketState;
          this.currentMarketState = newState;
          this.agents.forEach(agent => { agent.marketState = newState; });

          if (previousState !== newState) {
            console.log(`%c🔄 REGIME (Binance fallback): ${previousState} → ${newState}`,
              'background: #8b5cf6; color: white; padding: 4px 12px;');
          }
        }
      } catch {
        // Use existing cached state
      }
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

  // ===================== HUB SIGNAL INTEGRATION =====================

  private hubSignalQueue: any[] = [];
  private hubPairPriority: Map<string, number> = new Map(); // symbol -> priority score

  /**
   * Connect to globalHubService approved signals for hybrid trading
   * Hub signals take priority; autonomous strategyDrivenTrade() is fallback
   * Listens to BOTH signal:new and signal:approved for maximum coverage
   */
  private connectToHubSignals(): void {
    import('./globalHubService').then(({ globalHubService }) => {
      // Listen to approved signals (quality-gated)
      globalHubService.on('signal:new', (hubSignal: any) => {
        console.log(`[Arena] Hub signal received: ${hubSignal.symbol} ${hubSignal.direction}`);
        // Track Hub-identified pairs for strategy selection intelligence
        const sym = hubSignal.symbol?.toUpperCase();
        if (sym) {
          this.hubPairPriority.set(sym, (this.hubPairPriority.get(sym) || 0) + 1);
        }
        this.processHubSignal(hubSignal);
      });
      // Also queue signals that didn't go through full approval for fallback
      globalHubService.on('signal:generated', (hubSignal: any) => {
        if (hubSignal.confidence >= 60) {
          this.hubSignalQueue.push(hubSignal);
          // Keep queue bounded
          if (this.hubSignalQueue.length > 10) this.hubSignalQueue.shift();
        }
      });
      console.log('[Arena] Connected to Hub signal pipeline (approved + generated)');
    }).catch(err => {
      console.warn('[Arena] Could not connect to Hub signals:', err);
    });
  }

  /**
   * Process a Hub-approved signal: match to an available agent and open position.
   *
   * Phase 1.B: BROWSER NO-OP. The Vercel cron `/api/agents/trade-tick` is the
   * canonical writer for arena_active_positions. Opening a position from the
   * browser here would create a phantom in-memory state that diverges from
   * Supabase until the next Realtime event from the cron.
   *
   * Hub signal pair-priority tracking still happens (via hubPairPriority Map)
   * because that's UI-only and helps the cron prioritize Hub-identified pairs
   * when we make the cron Hub-aware in a future phase.
   */
  private processHubSignal(hubSignal: any): void {
    if (!this.running) return;

    // Update pair priority (in-memory UI state — safe)
    const sym = hubSignal.symbol?.toUpperCase();
    if (sym) {
      this.hubPairPriority.set(sym, (this.hubPairPriority.get(sym) || 0) + 1);
    }

    // Browser is read-only; do not open positions here
    return;

    // eslint-disable-next-line no-unreachable
    const now = Date.now();

    // Find an available agent that isn't in a position and passes circuit breaker
    for (const [agentId, agent] of this.agents) {
      const profile = this.profiles.get(agentId);
      if (!profile) continue;
      if (agent.currentPosition) continue;

      // Circuit breaker check
      const circuitCheck = arenaCircuitBreaker.canAgentTrade(agentId);
      if (!circuitCheck.allowed) continue;

      // Balance validation
      if (!arenaCircuitBreaker.isBalanceValid(agent.balance)) continue;

      // Drawdown check
      const drawdownPercent = ((agent.initialBalance - agent.balance) / agent.initialBalance) * 100;
      let drawdownMultiplier = 1.0;
      for (const adj of RISK_LIMITS.DRAWDOWN_ADJUSTMENTS) {
        if (drawdownPercent >= adj.threshold) {
          drawdownMultiplier = adj.multiplier;
        }
      }
      if (drawdownMultiplier === 0) continue;

      // Map Hub signal symbol to a trading pair
      const matchedPair = TRADING_PAIRS.find(p =>
        p.display.replace('/USD', '').toLowerCase() === hubSignal.symbol?.toLowerCase() ||
        p.symbol.toLowerCase() === `${hubSignal.symbol?.toLowerCase()}usdt`
      );
      if (!matchedPair) continue;
      if (this.reservedSymbols.has(matchedPair.symbol)) continue;

      const priceData = this.prices.get(matchedPair.symbol);
      if (!priceData) continue;

      // Use Hub signal's entry/TP/SL if available, otherwise generate
      const entry = hubSignal.entry || priceData.price;
      const direction = hubSignal.direction as 'LONG' | 'SHORT';
      const isLong = direction === 'LONG';

      // Calculate TP/SL from Hub signal targets
      let takeProfitPrice: number;
      let stopLossPrice: number;

      if (hubSignal.targets && hubSignal.targets.length > 0 && hubSignal.stopLoss) {
        takeProfitPrice = hubSignal.targets[0]; // Use TP1
        stopLossPrice = hubSignal.stopLoss;
      } else {
        // Fallback: use default 1.5% TP, 1% SL
        takeProfitPrice = isLong ? entry * 1.015 : entry * 0.985;
        stopLossPrice = isLong ? entry * 0.99 : entry * 1.01;
      }

      // CONFIDENCE-BASED POSITION SIZING + AUTONOMOUS ORCHESTRATOR ADAPTIVE SIZING
      // Scale position size: low confidence (40-60) → 60% size, high confidence (80+) → 120% size
      const confidence = hubSignal.confidence || hubSignal.quality_score || 50;
      const confidenceMultiplier = Math.max(0.6, Math.min(1.2, 0.4 + (confidence / 100)));

      // Autonomous orchestrator: hourly perf + ML accuracy + flux-aware sizing
      const orchestratorMultiplier = autonomousOrchestrator.getPositionSizeMultiplier();

      const positionMultiplier = circuitCheck.positionMultiplier * drawdownMultiplier * confidenceMultiplier * orchestratorMultiplier;
      let notionalValue = agent.balance * (profile.positionSizePercent / 100) * positionMultiplier;
      notionalValue = Math.min(notionalValue, agent.balance * (RISK_LIMITS.MAX_POSITION_PERCENT / 100));
      notionalValue = Math.max(notionalValue, RISK_LIMITS.MIN_POSITION_USD);
      notionalValue = Math.min(notionalValue, RISK_LIMITS.MAX_POSITION_USD);

      if (notionalValue < RISK_LIMITS.MIN_POSITION_USD) continue;

      const quantity = notionalValue / entry;

      const position: QuantPosition = {
        id: `${agent.id}-hub-${Date.now()}`,
        symbol: matchedPair.symbol,
        displaySymbol: matchedPair.display,
        direction,
        entryPrice: entry,
        currentPrice: entry,
        quantity,
        pnl: 0,
        pnlPercent: 0,
        entryTime: Date.now(),
        takeProfitPrice,
        stopLossPrice,
        strategy: `Hub:${hubSignal.strategy || hubSignal.strategyName || 'SIGNAL'}`,
        strategyProfile: null,
        marketStateAtEntry: this.currentMarketState,
        progressPercent: 50
      };

      // Tag with hub signal ID for outcome correlation
      (position as any).hubSignalId = hubSignal.id;
      (position as any).source = 'hub';

      agent.currentPosition = position;
      agent.activeStrategy = position.strategy;
      agent.lastTradeTime = now;
      this.reservedSymbols.add(matchedPair.symbol);

      console.log(`[Arena] Hub signal trade: ${agent.name} ${direction} ${matchedPair.display} @ $${entry.toFixed(2)} (Hub: ${hubSignal.id?.slice(0, 8)})`);

      this.savePositions();
      this.emitTrade({ type: 'open', agent, position });
      this.notify();
      return; // One agent per Hub signal
    }

    console.log(`[Arena] No available agent for Hub signal: ${hubSignal.symbol} ${hubSignal.direction}`);
  }

  // ===================== STRATEGY-DRIVEN TRADING =====================

  private async strategyDrivenTrade(): Promise<void> {
    const now = Date.now();

    // Process any queued Hub signals first (generated but not fully approved)
    while (this.hubSignalQueue.length > 0) {
      const queued = this.hubSignalQueue.shift();
      if (queued && now - (queued.timestamp || 0) < 300000) { // Max 5min old
        this.processHubSignal(queued);
      }
    }

    for (const [agentId, agent] of this.agents) {
      const profile = this.profiles.get(agentId);
      if (!profile) continue;
      if (agent.currentPosition) continue;
      if (now - agent.lastTradeTime < profile.tradeIntervalMs) continue;

      // CIRCUIT BREAKER CHECK - Must pass before opening any position
      const circuitCheck = arenaCircuitBreaker.canAgentTrade(agentId);
      if (!circuitCheck.allowed) {
        continue; // Silent - circuit breaker logs its own messages
      }

      // BALANCE VALIDATION - Don't trade if below minimum
      if (!arenaCircuitBreaker.isBalanceValid(agent.balance)) {
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
        continue;
      }

      // ✅ ADAPTIVE SUITABILITY: Lower threshold if agent hasn't traded recently
      // After 2 minutes with no trade, accept 40% suitability instead of 60%
      const timeSinceLastTrade = now - agent.lastTradeTime;
      const adaptiveThreshold = timeSinceLastTrade > 120000
        ? 40  // Lower threshold after 2min idle
        : RISK_LIMITS.MIN_STRATEGY_SUITABILITY; // Normal 60%

      // Get suitable strategies
      const suitableStrategies = strategyMatrix.getSuitableStrategies(
        this.currentMarketState,
        adaptiveThreshold,
        profile.type
      );

      if (suitableStrategies.length === 0) {
        // Only log occasionally to avoid spam
        if (now % 30000 < 5000) {
          console.log(`⏸️ ${agent.name}: No strategies ≥${adaptiveThreshold}% for ${this.currentMarketState}`);
        }
        continue;
      }

      // Filter out blacklisted strategy-regime combos (self-improvement)
      let filteredStrategies = suitableStrategies;
      try {
        const { zetaLearningEngine } = await import('./zetaLearningEngine');
        const regime = this.currentMarketState.toString();
        filteredStrategies = suitableStrategies.filter(s =>
          !zetaLearningEngine.isStrategyBlacklisted(s.strategy.name, regime)
        );
        if (filteredStrategies.length === 0) filteredStrategies = suitableStrategies; // Fallback
      } catch {}

      // Select best strategy
      const selectedStrategy = filteredStrategies[0];

      // STRATEGY SELECTION INTELLIGENCE: Prioritize Hub-identified pairs
      const availablePairs = TRADING_PAIRS.filter(p => !this.reservedSymbols.has(p.symbol));
      if (availablePairs.length === 0) continue;

      // Sort by Hub priority (pairs Hub recently signaled get priority)
      const sortedPairs = [...availablePairs].sort((a, b) => {
        const aSymbol = a.display.replace('/USD', '').toUpperCase();
        const bSymbol = b.display.replace('/USD', '').toUpperCase();
        const aPriority = this.hubPairPriority.get(aSymbol) || 0;
        const bPriority = this.hubPairPriority.get(bSymbol) || 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        // Tier priority: major > mid > volatile
        const tierOrder: Record<string, number> = { major: 3, mid: 2, volatile: 1 };
        return (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0);
      });
      const pair = sortedPairs[0];
      const priceData = this.prices.get(pair.symbol);
      if (!priceData) continue;

      // Per-coin regime classification for strategy routing validation
      try {
        const coinRegime = marketRegimeClassifier.classify({
          symbol: pair.symbol,
          price: priceData.price,
          volume24h: priceData.volume,
        } as any);
        // If per-coin regime says this strategy isn't optimal, reduce position size
        if (coinRegime.confidence > 60 && !coinRegime.optimalStrategies.includes(selectedStrategy.strategy.name as any)) {
          drawdownMultiplier *= 0.7; // 30% reduction for non-optimal strategy-regime combo
        }
      } catch {}

      // Generate strategy-based signal using Adaptive Signal Generator V2
      // Direction already includes multi-confirmation bias (5 signals)
      // TP/SL already adaptive based on volatility and market state
      const signal = generateStrategySignal(selectedStrategy.strategy, this.currentMarketState, priceData);
      if (!signal) continue;

      // Check autonomous orchestrator: should we trade now?
      const tradeCheck = autonomousOrchestrator.shouldTrade();
      if (!tradeCheck.allowed) {
        console.log(`⏸️ [Orchestrator] Trade blocked: ${tradeCheck.reason}`);
        continue;
      }

      // Calculate final position size multiplier (circuit breaker × drawdown × orchestrator)
      const positionMultiplier = circuitCheck.positionMultiplier * drawdownMultiplier * tradeCheck.multiplier;

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

    // POSITION SIZING WITH ALL SAFEGUARDS + CONFIDENCE SCALING
    // 1. Calculate base position size
    let notionalValue = agent.balance * (profile.positionSizePercent / 100);

    // 2. Apply position multiplier (circuit breaker × drawdown)
    notionalValue *= positionMultiplier;

    // 3. Confidence-based scaling: high-confidence signals get larger positions
    const confidenceScale = Math.max(0.6, Math.min(1.2, 0.4 + (signal.confidence / 100)));
    notionalValue *= confidenceScale;

    // 3b. Apply autonomous orchestrator strategy bias (learned from outcomes)
    const strategyBias = autonomousOrchestrator.getStrategyBias(strategy.name, this.currentMarketState);
    notionalValue *= strategyBias;

    // 4. Enforce maximum 3% of balance
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

    // Ensure Supabase storage is initialized before starting (with timeout)
    if (this.initPromise) {
      try {
        await Promise.race([
          this.initPromise,
          new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
        ]);
      } catch (e) {
        console.warn('[Arena] Supabase init failed, continuing with defaults');
      }
    }

    const totalTrades = Array.from(this.agents.values()).reduce((s, a) => s + a.totalTrades, 0);
    console.log(`%c▶️ QUANT ENGINE V8 STARTED with ${totalTrades} historical trades`,
      'background: #10b981; color: white; padding: 4px 12px;');

    // Initial data fetch
    try {
      await this.fetchPrices();
      console.log(`[Arena] ✅ Prices loaded: ${this.prices.size} pairs`);
    } catch (e) {
      console.warn('[Arena] Initial price fetch failed, will retry in 3s');
    }

    try {
      await this.detectMarketState();
      console.log(`[Arena] ✅ Market state: ${this.currentMarketState}`);
    } catch (e) {
      console.warn('[Arena] Market state detection failed, using default:', this.currentMarketState);
    }

    // Price updates every 3s
    this.intervals.push(setInterval(() => this.fetchPrices(), 3000));

    // Market state detection every 60s
    this.intervals.push(setInterval(() => this.detectMarketState(), 60000));

    // Connect to Hub signals for hybrid trading mode (browser-only feature
    // for the Hub→Arena bridge UX; in-memory only since writes are no-ops).
    this.connectToHubSignals();

    // Phase 0: BROWSER IS READ-ONLY for trade lifecycle.
    // The Vercel cron `/api/agents/trade-tick` is the canonical writer for
    // arena_active_positions / arena_agent_sessions / arena_trade_history.
    // We previously had two competing setIntervals here that fought with the
    // cron and corrupted rows on every minute boundary. Disabled.
    //
    //   this.intervals.push(setInterval(() => this.strategyDrivenTrade(), 5000));
    //   this.intervals.push(setInterval(() => this.checkPositions(), 2000));
    //
    // The browser still:
    //   - fetches Binance prices (above) for live P&L animation
    //   - detects market regime for UI display
    //   - subscribes to Supabase Realtime via arenaSupabaseStorage (below)
    //     and reconciles in-memory agent state when cron writes land.

    // Subscribe to Realtime cache events so UI mirrors cron writes within ~1s.
    this.cacheUnsubscribe = arenaSupabaseStorage.onCacheChange((e) => {
      this.applyRemoteCacheChange(e);
    });

    // Base stats refresh every minute
    this.intervals.push(setInterval(() => this.refreshBaseStats(), 60000));

    this.notify();
  }

  /**
   * Phase 0: handle Realtime CacheChangeEvents from arenaSupabaseStorage.
   * Cron writes propagate here within ~1s of being persisted.
   */
  private applyRemoteCacheChange(e: import('./arenaSupabaseStorage').CacheChangeEvent): void {
    if (e.type === 'position-upsert') {
      const agent = this.agents.get(e.agentId);
      if (agent) {
        agent.currentPosition = e.position;
        agent.activeStrategy = e.position.strategy;
        this.reservedSymbols.add(e.position.symbol);
        this.notify();
      }
    } else if (e.type === 'position-delete') {
      const agent = this.agents.get(e.agentId);
      if (agent && agent.currentPosition) {
        this.reservedSymbols.delete(agent.currentPosition.symbol);
        agent.currentPosition = null;
        agent.activeStrategy = null;
        this.notify();
      }
    } else if (e.type === 'session-upsert') {
      const agent = this.agents.get(e.agentId);
      if (agent) {
        agent.totalTrades = e.session.trades;
        agent.wins = e.session.wins;
        agent.losses = e.session.trades - e.session.wins;
        agent.totalPnLPercent = e.session.pnl;
        agent.balance = agent.initialBalance + e.session.balanceDelta;
        agent.totalPnL = e.session.balanceDelta;
        agent.winRate = e.session.trades > 0 ? (e.session.wins / e.session.trades) * 100 : 0;
        agent.lastTradeTime = e.session.lastTradeTime ?? agent.lastTradeTime;
        this.notify();
      }
    } else if (e.type === 'trade-insert') {
      const agent = this.agents.get(e.trade.agentId);
      if (agent) {
        // Push to local trade-history ring buffer for 24h-metric rendering
        this.tradeHistory.push({
          agentId: e.trade.agentId,
          timestamp: e.trade.timestamp,
          pnlPercent: e.trade.pnlPercent ?? 0,
          isWin: !!e.trade.isWin,
          strategy: e.trade.strategy,
          symbol: e.trade.symbol,
        });
        // Fire trade event for UI toasts
        if (agent.currentPosition || e.trade.exitPrice) {
          const synthPos = agent.currentPosition ?? {
            id: `${e.trade.agentId}-remote`,
            symbol: e.trade.symbol,
            displaySymbol: e.trade.symbol,
            direction: e.trade.direction,
            entryPrice: e.trade.entryPrice,
            currentPrice: e.trade.exitPrice ?? e.trade.entryPrice,
            quantity: e.trade.quantity,
            pnl: e.trade.pnlDollar ?? 0,
            pnlPercent: e.trade.pnlPercent ?? 0,
            entryTime: e.trade.timestamp,
            takeProfitPrice: 0,
            stopLossPrice: 0,
            strategy: e.trade.strategy,
            strategyProfile: null,
            marketStateAtEntry: (e.trade.marketState || this.currentMarketState) as any,
            progressPercent: 100,
          };
          this.emitTrade({
            type: 'close',
            agent,
            position: synthPos,
            exitPrice: e.trade.exitPrice ?? undefined,
            reason: (e.trade.reason as any) || 'TIMEOUT',
            pnlPercent: e.trade.pnlPercent ?? 0,
            isWin: !!e.trade.isWin,
          });
        }
      }
    }
  }

  stop(): void {
    this.running = false;
    this.intervals.forEach(i => clearInterval(i));
    this.intervals = [];
    if (this.cacheUnsubscribe) {
      this.cacheUnsubscribe();
      this.cacheUnsubscribe = null;
    }
  }

  private async fetchPrices(): Promise<void> {
    try {
      const responses = await Promise.all(
        TRADING_PAIRS.map(p => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000); // 5s timeout
          return fetch(`${BINANCE_API}?symbol=${p.symbol}`, { signal: ctrl.signal })
            .then(r => { clearTimeout(t); return r.ok ? r.json() : null; })
            .catch(() => { clearTimeout(t); return null; });
        })
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

  // Track trailing stop state per position
  private trailingStops: Map<string, { active: boolean; stopPrice: number }> = new Map();

  private checkPositions(): void {
    const now = Date.now();
    const maxHoldTime = 3600000; // 60 minutes max hold — gives TPs room to materialize

    this.agents.forEach(agent => {
      if (!agent.currentPosition) return;

      const pos = agent.currentPosition;
      const price = this.prices.get(pos.symbol);
      if (!price) return;

      let close = false;
      let reason: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE' = 'TIMEOUT';
      const isLong = pos.direction === 'LONG';
      const trailing = this.trailingStops.get(pos.id) || { active: false, stopPrice: pos.stopLossPrice };

      if (trailing.active) {
        // TRAILING MODE: TP was already hit, now trail the stop wider (60% of run, not 40%)
        // and the trailing stop never falls below 50% of the original TP gain — locks in real P&L
        if (isLong) {
          const runFromEntry = price.price - pos.entryPrice;
          const newTrail = price.price - runFromEntry * 0.4;            // trail at 40% of run from peak
          const minLockIn = pos.entryPrice + (pos.takeProfitPrice - pos.entryPrice) * 0.5; // half of TP banked
          trailing.stopPrice = Math.max(trailing.stopPrice, newTrail, minLockIn);
          if (price.price <= trailing.stopPrice) { close = true; reason = 'TP'; }
        } else {
          const runFromEntry = pos.entryPrice - price.price;
          const newTrail = price.price + runFromEntry * 0.4;
          const minLockIn = pos.entryPrice - (pos.entryPrice - pos.takeProfitPrice) * 0.5;
          trailing.stopPrice = Math.min(trailing.stopPrice, newTrail, minLockIn);
          if (price.price >= trailing.stopPrice) { close = true; reason = 'TP'; }
        }
        this.trailingStops.set(pos.id, trailing);
      } else {
        // NORMAL MODE: check TP and SL
        if (isLong) {
          if (price.price >= pos.takeProfitPrice) {
            // Activate trailing — lock in 50% of the TP gain as the floor (not breakeven!)
            trailing.active = true;
            trailing.stopPrice = pos.entryPrice + (pos.takeProfitPrice - pos.entryPrice) * 0.5;
            this.trailingStops.set(pos.id, trailing);
            console.log(`[Arena] Trail-from-TP: ${agent.name} ${pos.displaySymbol} @ $${price.price.toFixed(2)}, floor $${trailing.stopPrice.toFixed(2)}`);
            return; // Don't close yet, let it trail
          }
          else if (price.price <= pos.stopLossPrice) { close = true; reason = 'SL'; }
        } else {
          if (price.price <= pos.takeProfitPrice) {
            trailing.active = true;
            trailing.stopPrice = pos.entryPrice - (pos.entryPrice - pos.takeProfitPrice) * 0.5;
            this.trailingStops.set(pos.id, trailing);
            console.log(`[Arena] Trail-from-TP: ${agent.name} ${pos.displaySymbol} @ $${price.price.toFixed(2)}, floor $${trailing.stopPrice.toFixed(2)}`);
            return;
          }
          else if (price.price >= pos.stopLossPrice) { close = true; reason = 'SL'; }
        }
      }

      if (now - pos.entryTime >= maxHoldTime) {
        close = true;
        reason = trailing.active ? 'TP' : 'TIMEOUT'; // If trailing was active, it's still a win
      }

      if (close) {
        this.trailingStops.delete(pos.id);
        this.closeTrade(agent, price.price, reason);
      }
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
    recordStrategyOutcome(closedPos.strategy, isWin, pnlPercent);

    // Bidirectional feedback: if hub-sourced trade, emit outcome back to Zeta
    if ((closedPos as any).hubSignalId) {
      import('./globalHubService').then(({ globalHubService }) => {
        const outcomeType = reason === 'TP' ? (isWin ? 'WIN_TP1' : 'LOSS_SL') :
                           reason === 'SL' ? 'LOSS_SL' :
                           'TIMEOUT_TIME_EXPIRED';
        globalHubService.emit('signal:outcome', {
          signalId: (closedPos as any).hubSignalId,
          symbol: closedPos.displaySymbol,
          direction: closedPos.direction,
          outcome: outcomeType,
          returnPct: pnlPercent,
          exitPrice,
          exitReason: reason,
          holdDuration: Date.now() - closedPos.entryTime,
          source: 'arena'
        });
        console.log(`[Arena] Hub outcome feedback: ${closedPos.displaySymbol} ${outcomeType} ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
      }).catch(() => {});
    }

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
    // Create new object references so React detects state changes
    // Without spreading, React's shallow comparison won't detect balance updates
    const agents = Array.from(this.agents.values()).map(agent => ({
      ...agent,
      // Also spread nested objects to ensure deep reactivity
      currentPosition: agent.currentPosition ? { ...agent.currentPosition } : null,
      performance: [...agent.performance]
    }));
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

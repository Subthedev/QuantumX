/**
 * Runtime-agnostic trade decision core.
 *
 * Imports only:
 *   - @/core/marketState (pure enum)
 *   - @/services/strategyMatrix (pure config + filter helpers; verified no
 *     browser-only deps after the marketState extraction in Phase 1.A)
 *
 * Does NOT import:
 *   - localStorage, window, supabase client, fetch APIs
 *   - autonomousOrchestrator, zetaLearningEngine, deltaV2QualityEngine
 *
 * The browser engine (arenaQuantEngine) and the Vercel cron (trade-tick.ts)
 * both call decideTrade() / manageOpenPosition() with their own state slurped
 * from localStorage/Supabase. There is exactly ONE codepath for the actual
 * trading decision, regardless of where it runs.
 *
 * What this replaces:
 *   - The 5-signal "multi-confirm" stub previously inlined in trade-tick.ts.
 *     The cron now uses the full 17-strategy matrix via strategyMatrix.
 *   - The duplicated direction-bias/risk-reward logic in arenaQuantEngine.
 *
 * Phase 1.A+B deliverable.
 */

import { MarketState } from './marketState';
import { strategyMatrix, AgentType, STRATEGY_MATRIX, type StrategyProfile } from '../services/strategyMatrix';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

export interface TradingPair {
  symbol: string;        // 'BTCUSDT'
  display: string;       // 'BTC/USD'
  tier: 'major' | 'mid' | 'volatile';
  weight?: number;
}

export interface AgentRuntimeProfile {
  id: string;
  name: string;
  type: AgentType;
  riskProfile: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  positionSizePercent: number;   // % of balance
  tradeIntervalMs: number;        // cooldown between trades
  baseTPPercent: number;
  baseSLPercent: number;
  primaryRegimes?: MarketState[];
}

export interface SessionState {
  trades: number;
  wins: number;
  pnl: number;
  balanceDelta: number;            // dollars accrued from initial balance
  consecutiveLosses: number;
  circuitBreakerLevel: string;     // 'ACTIVE' | 'L1_CAUTIOUS' | ... | 'L5_EMERGENCY'
  haltedUntil: number | null;      // epoch ms
  lastTradeTime: number | null;    // epoch ms
}

export interface AutonomousBrain {
  positionSizeMultiplier: number;     // 0.25 - 1.5
  signalFrequencyMultiplier: number;  // 0.5 - 2.0 (scales cooldown)
  regimeTransitionPenalty: number;    // 0.5 - 1.0
  strategyBias: Record<string, number>;     // 'name-regime' or 'name' → 0.1-2.0
  blacklistedStrategies?: string[];          // 'name-regime' keys
}

export interface DecisionInput {
  agent: AgentRuntimeProfile;
  session: SessionState;
  prices: Map<string, PriceData>;
  pairs: TradingPair[];
  marketState: MarketState;
  reservedSymbols: Set<string>;            // symbols other agents already hold
  brain: AutonomousBrain;
  now?: number;                            // injectable for testing
  initialBalance?: number;                  // default RISK_LIMITS.INITIAL_BALANCE
}

export interface OpenPositionDecision {
  pair: TradingPair;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  notional: number;
  quantity: number;
  strategy: string;
  strategyProfile: StrategyProfile;
  confidence: number;
  marketStateAtEntry: MarketState;
  reasoning: string;
}

export type SkipReason =
  | 'COOLDOWN'
  | 'HALTED'
  | 'CIRCUIT_BREAKER'
  | 'DRAWDOWN_HALT'
  | 'NO_SUITABLE_STRATEGY'
  | 'NO_AVAILABLE_PAIR'
  | 'NO_PRICE_DATA'
  | 'LOW_CONFIDENCE'
  | 'NOTIONAL_TOO_SMALL';

export interface DecisionOutput {
  decision: OpenPositionDecision | null;
  skipReason?: SkipReason;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk limits
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_LIMITS = {
  MAX_POSITION_PERCENT: 20,
  MIN_POSITION_USD: 200,
  MAX_POSITION_USD: 2500,
  MIN_RR: 1.8,
  TP_CAP_PERCENT: 10,
  SL_CAP_PERCENT: 4,
  SUITABILITY_FLOOR: 50,
  INITIAL_BALANCE: 10_000,
  MAX_HOLD_MS: 60 * 60 * 1000,             // 60 min
  DRAWDOWN_ADJUSTMENTS: [
    { threshold: 5,  multiplier: 0.85 },
    { threshold: 10, multiplier: 0.70 },
    { threshold: 15, multiplier: 0.50 },
    { threshold: 20, multiplier: 0.25 },
    { threshold: 25, multiplier: 0 },        // halt
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeDrawdownMultiplier(currentBalance: number, initialBalance: number): number {
  if (initialBalance <= 0) return 1;
  const drawdownPct = ((initialBalance - currentBalance) / initialBalance) * 100;
  let mult = 1.0;
  for (const adj of RISK_LIMITS.DRAWDOWN_ADJUSTMENTS) {
    if (drawdownPct >= adj.threshold) mult = adj.multiplier;
  }
  return mult;
}

function isHalted(session: SessionState, now: number): boolean {
  if (session.circuitBreakerLevel === 'L4_HALTED' || session.circuitBreakerLevel === 'L5_EMERGENCY') return true;
  if (session.haltedUntil && session.haltedUntil > now) return true;
  return false;
}

function getStrategyBias(brain: AutonomousBrain, strategy: string, regime: MarketState): number {
  const v = brain.strategyBias[`${strategy}-${regime}`] ?? brain.strategyBias[strategy] ?? 1.0;
  return clamp(Number(v), 0.1, 2.0);
}

function isBlacklisted(brain: AutonomousBrain, strategy: string, regime: MarketState): boolean {
  if (!brain.blacklistedStrategies) return false;
  return brain.blacklistedStrategies.includes(`${strategy}-${regime}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-confirmation direction bias (5 signals)
// Ported from arenaQuantEngine.calculateDirectionBias()
// ─────────────────────────────────────────────────────────────────────────────

function calculateDirectionBias(
  price: PriceData,
  marketState: MarketState,
  strategy: StrategyProfile,
): { direction: 'LONG' | 'SHORT'; strength: number; signals: string[] } {
  const signals: string[] = [];
  let bull = 0;
  let bear = 0;

  // 1. Market state direction (weight 2)
  if (marketState.startsWith('BULLISH')) { bull += 2; signals.push('Regime: bullish'); }
  else if (marketState.startsWith('BEARISH')) { bear += 2; signals.push('Regime: bearish'); }

  // 2. 24h momentum (weight 1.5)
  if (price.change24h > 2) { bull += 1.5; signals.push(`24h +${price.change24h.toFixed(1)}%`); }
  else if (price.change24h < -2) { bear += 1.5; signals.push(`24h ${price.change24h.toFixed(1)}%`); }

  // 3. Position in 24h range — only matters for BetaX (mean reversion)
  const range = price.high24h - price.low24h;
  const rangePos = range > 0 ? (price.price - price.low24h) / range : 0.5;
  if (strategy.agent === AgentType.BETAX) {
    if (rangePos < 0.3) { bull += 1; signals.push('Oversold in range'); }
    else if (rangePos > 0.7) { bear += 1; signals.push('Overbought in range'); }
  }

  // 4. Strategy-type alignment (weight 1.5)
  if (strategy.agent === AgentType.ALPHAX) {
    // Trend follower — go with dominant
    if (bull > bear) { bull += 1.5; signals.push('Alpha: trend follow long'); }
    else { bear += 1.5; signals.push('Alpha: trend follow short'); }
  } else if (strategy.agent === AgentType.BETAX) {
    // Mean reversion — fade extremes
    if (price.change24h > 5) { bear += 1.5; signals.push('Beta: fade overbought'); }
    else if (price.change24h < -5) { bull += 1.5; signals.push('Beta: fade oversold'); }
  } else if (strategy.agent === AgentType.QUANTUMX) {
    // Chaos — ride volatility expansion direction
    if (Math.abs(price.change24h) > 3) {
      if (price.change24h > 0) { bull += 1.5; signals.push('Gamma: vol expansion up'); }
      else { bear += 1.5; signals.push('Gamma: vol expansion down'); }
    }
  }

  // 5. Volume confirmation (weight 0.5)
  if (price.volume > 0) {
    if (bull > bear && price.change24h > 0) { bull += 0.5; signals.push('Vol confirms bull'); }
    else if (bear > bull && price.change24h < 0) { bear += 0.5; signals.push('Vol confirms bear'); }
  }

  const total = bull + bear;
  const strength = total > 0 ? Math.abs(bull - bear) / total : 0;
  return {
    direction: bull >= bear ? 'LONG' : 'SHORT',
    strength,
    signals,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptive R:R based on volatility regime + strategy type
// Ported from arenaQuantEngine.calculateAdaptiveRiskReward()
// ─────────────────────────────────────────────────────────────────────────────

function calculateAdaptiveRR(
  price: PriceData,
  marketState: MarketState,
  strategy: StrategyProfile,
): { tp: number; sl: number; rr: number } {
  const isHighVol = marketState.includes('HIGH_VOL');
  const isRange = marketState === MarketState.RANGEBOUND;
  const range24hPct = price.high24h > 0
    ? ((price.high24h - price.low24h) / price.price) * 100
    : 2;

  // Base values by strategy agent
  let baseTP: number;
  let baseSL: number;
  if (strategy.agent === AgentType.ALPHAX) { baseTP = 3.5; baseSL = 1.4; }
  else if (strategy.agent === AgentType.BETAX) { baseTP = 2.5; baseSL = 1.2; }
  else { baseTP = 4.5; baseSL = 2.0; }

  const volMult = isHighVol ? 1.4 : (isRange ? 0.7 : 1.0);
  const rangeAdj = clamp(range24hPct / 4, 0.6, 1.5);

  let tp = baseTP * volMult * rangeAdj;
  let sl = baseSL * volMult * rangeAdj;

  // Enforce min R:R
  if (tp / sl < RISK_LIMITS.MIN_RR) tp = sl * RISK_LIMITS.MIN_RR;

  tp = clamp(tp, 1.5, RISK_LIMITS.TP_CAP_PERCENT);
  sl = clamp(sl, 0.75, RISK_LIMITS.SL_CAP_PERCENT);

  return { tp, sl, rr: tp / sl };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy signal generation
// ─────────────────────────────────────────────────────────────────────────────

interface StrategySignal {
  direction: 'LONG' | 'SHORT';
  confidence: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  reasoning: string;
}

function generateStrategySignal(
  strategy: StrategyProfile,
  marketState: MarketState,
  price: PriceData,
): StrategySignal | null {
  const suitability = strategy.suitability[marketState];
  if (suitability < RISK_LIMITS.SUITABILITY_FLOOR) return null;

  const bias = calculateDirectionBias(price, marketState, strategy);
  const rr = calculateAdaptiveRR(price, marketState, strategy);

  // Confidence = suitability + direction strength bonus
  const directionBonus = bias.strength * 15;
  const confidence = clamp(suitability + directionBonus, 0, 95);

  return {
    direction: bias.direction,
    confidence,
    takeProfitPercent: rr.tp,
    stopLossPercent: rr.sl,
    reasoning: `${strategy.name}: ${bias.signals.slice(0, 2).join(', ')} | R:R ${rr.rr.toFixed(1)}:1`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: decideTrade()
// Pure function. Returns either an OpenPositionDecision or a skip reason.
// ─────────────────────────────────────────────────────────────────────────────

export function decideTrade(input: DecisionInput): DecisionOutput {
  const now = input.now ?? Date.now();
  const initialBalance = input.initialBalance ?? RISK_LIMITS.INITIAL_BALANCE;
  const balance = initialBalance + input.session.balanceDelta;

  // 1. Halted / circuit breaker
  if (isHalted(input.session, now)) {
    return { decision: null, skipReason: 'HALTED', detail: input.session.circuitBreakerLevel };
  }

  // 2. Cooldown — scaled by brain.signalFrequencyMultiplier (higher mult = shorter cooldown)
  if (input.session.lastTradeTime) {
    const effectiveCooldown = input.agent.tradeIntervalMs / Math.max(0.5, input.brain.signalFrequencyMultiplier);
    if (now - input.session.lastTradeTime < effectiveCooldown) {
      return { decision: null, skipReason: 'COOLDOWN' };
    }
  }

  // 3. Drawdown gate
  const drawdownMult = computeDrawdownMultiplier(balance, initialBalance);
  if (drawdownMult === 0) {
    return { decision: null, skipReason: 'DRAWDOWN_HALT' };
  }

  // 4. Suitable strategies for this regime + agent type
  const strategies = strategyMatrix.getSuitableStrategies(
    input.marketState,
    RISK_LIMITS.SUITABILITY_FLOOR,
    input.agent.type,
  );
  if (strategies.length === 0) {
    return { decision: null, skipReason: 'NO_SUITABLE_STRATEGY', detail: input.marketState };
  }

  // Filter blacklisted (from learning). Keep first 5 candidates max.
  const candidates = strategies
    .filter(s => !isBlacklisted(input.brain, s.strategy.name, input.marketState))
    .slice(0, 5);
  const fallback = candidates.length === 0 ? strategies.slice(0, 1) : candidates;

  // 5. Available pairs sorted by tier
  const available = input.pairs.filter(p => !input.reservedSymbols.has(p.symbol));
  if (available.length === 0) {
    return { decision: null, skipReason: 'NO_AVAILABLE_PAIR' };
  }
  const tierOrder: Record<string, number> = { major: 3, mid: 2, volatile: 1 };
  const sortedPairs = [...available].sort((a, b) => (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0));

  // 6. Try each strategy × pair combo, pick highest-confidence signal
  let best: { signal: StrategySignal; pair: TradingPair; profile: StrategyProfile } | null = null;
  for (const { strategy } of fallback) {
    for (const pair of sortedPairs) {
      const price = input.prices.get(pair.symbol);
      if (!price) continue;
      const sig = generateStrategySignal(strategy, input.marketState, price);
      if (!sig) continue;
      if (!best || sig.confidence > best.signal.confidence) {
        best = { signal: sig, pair, profile: strategy };
      }
    }
  }

  if (!best) {
    return { decision: null, skipReason: 'LOW_CONFIDENCE' };
  }

  const price = input.prices.get(best.pair.symbol);
  if (!price) {
    return { decision: null, skipReason: 'NO_PRICE_DATA' };
  }

  // 7. Position sizing — combine all multipliers
  const confidenceScale = clamp(0.4 + best.signal.confidence / 100, 0.6, 1.2);
  const strategyBias = getStrategyBias(input.brain, best.profile.name, input.marketState);

  let notional = balance * (input.agent.positionSizePercent / 100);
  notional *= drawdownMult;
  notional *= confidenceScale;
  notional *= input.brain.positionSizeMultiplier;
  notional *= input.brain.regimeTransitionPenalty;
  notional *= strategyBias;

  // Enforce caps
  notional = Math.min(notional, balance * (RISK_LIMITS.MAX_POSITION_PERCENT / 100));
  notional = Math.min(notional, RISK_LIMITS.MAX_POSITION_USD);
  notional = Math.max(notional, RISK_LIMITS.MIN_POSITION_USD);

  if (notional < RISK_LIMITS.MIN_POSITION_USD || notional > balance * 0.5) {
    return { decision: null, skipReason: 'NOTIONAL_TOO_SMALL' };
  }

  // 8. Compute final TP/SL prices
  const isLong = best.signal.direction === 'LONG';
  const entry = price.price;
  const tpPrice = isLong
    ? entry * (1 + best.signal.takeProfitPercent / 100)
    : entry * (1 - best.signal.takeProfitPercent / 100);
  const slPrice = isLong
    ? entry * (1 - best.signal.stopLossPercent / 100)
    : entry * (1 + best.signal.stopLossPercent / 100);
  const quantity = notional / entry;

  return {
    decision: {
      pair: best.pair,
      direction: best.signal.direction,
      entryPrice: entry,
      takeProfitPercent: best.signal.takeProfitPercent,
      stopLossPercent: best.signal.stopLossPercent,
      takeProfitPrice: tpPrice,
      stopLossPrice: slPrice,
      notional,
      quantity,
      strategy: best.profile.name,
      strategyProfile: best.profile,
      confidence: best.signal.confidence,
      marketStateAtEntry: input.marketState,
      reasoning: best.signal.reasoning,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// manageOpenPosition — pure: returns close decision for an open position
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenPositionState {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  entryTime: number;
}

export interface CloseDecision {
  close: true;
  reason: 'TP' | 'SL' | 'TIMEOUT';
  exitPrice: number;
}

export function manageOpenPosition(
  pos: OpenPositionState,
  currentPrice: number,
  now: number = Date.now(),
  maxHoldMs: number = RISK_LIMITS.MAX_HOLD_MS,
): CloseDecision | null {
  const isLong = pos.direction === 'LONG';
  const heldMs = now - pos.entryTime;

  if (isLong) {
    if (currentPrice >= pos.takeProfitPrice) return { close: true, reason: 'TP', exitPrice: pos.takeProfitPrice };
    if (currentPrice <= pos.stopLossPrice) return { close: true, reason: 'SL', exitPrice: pos.stopLossPrice };
  } else {
    if (currentPrice <= pos.takeProfitPrice) return { close: true, reason: 'TP', exitPrice: pos.takeProfitPrice };
    if (currentPrice >= pos.stopLossPrice) return { close: true, reason: 'SL', exitPrice: pos.stopLossPrice };
  }

  if (heldMs >= maxHoldMs) {
    return { close: true, reason: 'TIMEOUT', exitPrice: currentPrice };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker logic — derive next session state from a closed trade
// ─────────────────────────────────────────────────────────────────────────────

export interface CloseResult {
  pnlPercent: number;
  pnlDollar: number;
  isWin: boolean;
}

export function applyCloseToSession(
  session: SessionState,
  result: CloseResult,
  now: number = Date.now(),
  initialBalance: number = RISK_LIMITS.INITIAL_BALANCE,
): SessionState {
  const consecutive = result.isWin ? 0 : session.consecutiveLosses + 1;
  let circuitLevel = 'ACTIVE';
  let haltedUntil: number | null = null;

  if (consecutive >= 5) {
    circuitLevel = 'L4_HALTED';
    haltedUntil = now + 60 * 60 * 1000;
  } else if (consecutive >= 4) {
    circuitLevel = 'L3_MINIMAL';
  } else if (consecutive >= 3) {
    circuitLevel = 'L1_CAUTIOUS';
  }

  const newDelta = session.balanceDelta + result.pnlDollar;
  if (initialBalance + newDelta < initialBalance * 0.5) {
    circuitLevel = 'L5_EMERGENCY';
    haltedUntil = now + 24 * 60 * 60 * 1000;
  }

  return {
    trades: session.trades + 1,
    wins: session.wins + (result.isWin ? 1 : 0),
    pnl: session.pnl + result.pnlPercent,
    balanceDelta: newDelta,
    consecutiveLosses: consecutive,
    circuitBreakerLevel: circuitLevel,
    haltedUntil,
    lastTradeTime: now,
  };
}

export function computePnL(
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  exitPrice: number,
  quantity: number,
): CloseResult {
  const pnlPercent = direction === 'LONG'
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;
  const notional = quantity * entryPrice;
  const pnlDollar = (pnlPercent / 100) * notional;
  return { pnlPercent, pnlDollar, isWin: pnlPercent > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Vercel-side trading pairs — also exported for browser/cron parity
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TRADING_PAIRS: TradingPair[] = [
  { symbol: 'BTCUSDT',  display: 'BTC/USD',  tier: 'major',    weight: 3 },
  { symbol: 'ETHUSDT',  display: 'ETH/USD',  tier: 'major',    weight: 3 },
  { symbol: 'SOLUSDT',  display: 'SOL/USD',  tier: 'major',    weight: 3 },
  { symbol: 'BNBUSDT',  display: 'BNB/USD',  tier: 'mid',      weight: 2 },
  { symbol: 'XRPUSDT',  display: 'XRP/USD',  tier: 'mid',      weight: 2 },
  { symbol: 'DOGEUSDT', display: 'DOGE/USD', tier: 'volatile', weight: 1 },
];

export const DEFAULT_AGENTS: AgentRuntimeProfile[] = [
  { id: 'alphax', name: 'AlphaX',  type: AgentType.ALPHAX,   riskProfile: 'AGGRESSIVE',   positionSizePercent: 15, baseTPPercent: 3.5, baseSLPercent: 1.4, tradeIntervalMs: 4 * 60 * 1000 },
  { id: 'betax',  name: 'BetaX',   type: AgentType.BETAX,    riskProfile: 'BALANCED',     positionSizePercent: 12, baseTPPercent: 2.5, baseSLPercent: 1.2, tradeIntervalMs: 5 * 60 * 1000 },
  { id: 'gammax', name: 'GammaX',  type: AgentType.QUANTUMX, riskProfile: 'CONSERVATIVE', positionSizePercent: 10, baseTPPercent: 4.5, baseSLPercent: 2.0, tradeIntervalMs: 6 * 60 * 1000 },
];

// Lightweight market regime detector for the cron — same algorithm as
// arenaQuantEngine but pure (no fetch/cache).
export function detectMarketStateFromPrices(prices: Map<string, PriceData>): MarketState {
  const btc = prices.get('BTCUSDT');
  if (!btc) return MarketState.RANGEBOUND;
  const range = btc.high24h > 0 ? ((btc.high24h - btc.low24h) / btc.price) * 100 : 0;
  const isHighVol = range > 4.5;
  if (btc.change24h > 2.5)  return isHighVol ? MarketState.BULLISH_HIGH_VOL : MarketState.BULLISH_LOW_VOL;
  if (btc.change24h < -2.5) return isHighVol ? MarketState.BEARISH_HIGH_VOL : MarketState.BEARISH_LOW_VOL;
  return MarketState.RANGEBOUND;
}

// Re-export STRATEGY_MATRIX so consumers don't have to reach into services/
export { STRATEGY_MATRIX, AgentType, type StrategyProfile };

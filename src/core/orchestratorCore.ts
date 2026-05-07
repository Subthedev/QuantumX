/**
 * Runtime-agnostic autonomous orchestrator core.
 *
 * Pure state machine for the brain. No localStorage, no fetch, no Supabase, no
 * EventEmitter. Browser and cron both wrap this with their own persistence
 * adapter; the actual learning logic lives here exactly once.
 *
 * What it does:
 *   - applyOutcome()         — every closed trade updates position-size mult,
 *                              recent accuracy window, per-strategy bias map
 *   - applyOptimizationReport — bulk Zeta updates threshold/frequency tuning
 *   - applyStrategyBlacklist — instant strategy bias zero-out
 *   - applyRegimeChange      — track transitions, apply instability penalty
 *   - applyFluxModeChange    — adapt to system-wide mode shifts
 *
 * Browser shell (src/services/autonomousOrchestrator.ts) is preserved and
 * delegates to this core. The cron (api/agents/trade-tick.ts) imports the
 * core directly, processes outcomes from this tick's trades, then writes
 * back to autonomous_state.
 */

import { MarketState } from './marketState';

// ─────────────────────────────────────────────────────────────────────────────
// Types — exported so both shell + cron can stay in sync
// ─────────────────────────────────────────────────────────────────────────────

export type AutonomyLevel = 'BOOTSTRAPPING' | 'LEARNING' | 'CALIBRATED' | 'AUTONOMOUS';

export type DecisionType =
  | 'POSITION_SIZE'
  | 'SIGNAL_FREQUENCY'
  | 'STRATEGY_WEIGHT'
  | 'THRESHOLD_ADJUST'
  | 'REGIME_SWITCH'
  | 'CIRCUIT_BREAK';

export interface AdaptiveDecision {
  type: DecisionType;
  reason: string;
  oldValue: number;
  newValue: number;
  confidence: number;
  timestamp: number;
}

export interface BrainState {
  // Adaptive parameters
  positionSizeMultiplier: number;     // 0.25 - 1.5
  signalFrequencyMultiplier: number;  // 0.5 - 2.0
  strategyBias: Record<string, number>; // strategy-regime → 0.1-2.0
  blacklistedStrategies: string[];
  regimeConfidence: number;           // 0-100
  regimeTransitionPenalty: number;    // 0.5 - 1.0

  // Learning state
  recentAccuracy: number[];           // last N outcomes (0/1 wins)
  regimeHistory: { state: MarketState; timestamp: number }[];

  // Counters
  totalAdaptations: number;
  outcomesProcessed: number;
  thresholdAdjustments: number;
  lastOptimizationPass: number;

  // Diagnostics
  feedbackLoopsActive: number;
  adaptationScore: number;
  autonomyLevel: AutonomyLevel;
}

export interface OutcomeInput {
  isWin: boolean;
  pnlPercent: number;
  strategy: string;
  regime: MarketState;
  hourlyMultiplier?: number;          // from zetaLearningEngine if available
}

export interface OptimizationReportInput {
  totalOutcomes: number;
  confidenceDrift: number;
  bestTradingHour?: string;
  worstTradingHour?: string;
  blacklistedStrategies: number;
  overallHealth: 'OPTIMAL' | 'DEGRADED' | 'NORMAL';
  mlAccuracy: number;                 // 0-1
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACCURACY_WINDOW = 50;
const REGIME_HISTORY_SIZE = 10;
const POSITION_MIN = 0.25;
const POSITION_MAX = 1.5;
const FREQUENCY_MIN = 0.5;
const FREQUENCY_MAX = 2.0;
const STRATEGY_BIAS_MIN = 0.1;
const STRATEGY_BIAS_MAX = 2.0;
const STRATEGY_EMA_ALPHA = 0.1;
const ONE_HOUR_MS = 3600_000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function defaultBrainState(): BrainState {
  return {
    positionSizeMultiplier: 1.0,
    signalFrequencyMultiplier: 1.0,
    strategyBias: {},
    blacklistedStrategies: [],
    regimeConfidence: 50,
    regimeTransitionPenalty: 1.0,
    recentAccuracy: [],
    regimeHistory: [],
    totalAdaptations: 0,
    outcomesProcessed: 0,
    thresholdAdjustments: 0,
    lastOptimizationPass: 0,
    feedbackLoopsActive: 0,
    adaptationScore: 0,
    autonomyLevel: 'BOOTSTRAPPING',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyOutcome — main learning loop, runs once per closed trade
// ─────────────────────────────────────────────────────────────────────────────

export function applyOutcome(
  brain: BrainState,
  outcome: OutcomeInput,
  now: number = Date.now(),
): { brain: BrainState; decisions: AdaptiveDecision[] } {
  const decisions: AdaptiveDecision[] = [];
  const next = { ...brain, strategyBias: { ...brain.strategyBias } };

  next.outcomesProcessed += 1;

  // 1. Position-size adaptation: hourly perf × recent accuracy
  const hourlyMult = outcome.hourlyMultiplier ?? 1.0;
  const recentAcc = next.recentAccuracy.length > 0
    ? next.recentAccuracy.slice(-10).reduce((a, b) => a + b, 0) / Math.min(next.recentAccuracy.length, 10)
    : 0.5;

  let newPosMult = hourlyMult;
  if (recentAcc < 0.4) newPosMult *= 0.6;
  else if (recentAcc > 0.65) newPosMult *= 1.2;
  newPosMult = clamp(newPosMult, POSITION_MIN, POSITION_MAX);

  if (Math.abs(newPosMult - next.positionSizeMultiplier) > 0.05) {
    decisions.push({
      type: 'POSITION_SIZE',
      reason: `Hourly: ${hourlyMult.toFixed(2)}, Accuracy: ${(recentAcc * 100).toFixed(0)}%`,
      oldValue: next.positionSizeMultiplier,
      newValue: newPosMult,
      confidence: 75,
      timestamp: now,
    });
    next.totalAdaptations += 1;
  }
  next.positionSizeMultiplier = newPosMult;

  // 2. Strategy bias EMA — outcome-driven
  if (outcome.strategy && outcome.regime) {
    const key = `${outcome.strategy}-${outcome.regime}`;
    const current = next.strategyBias[key] ?? 1.0;
    const target = outcome.isWin ? 1.3 : 0.7;
    const updated = clamp(
      current * (1 - STRATEGY_EMA_ALPHA) + target * STRATEGY_EMA_ALPHA,
      STRATEGY_BIAS_MIN,
      STRATEGY_BIAS_MAX,
    );
    next.strategyBias[key] = updated;
  }

  // 3. Recent accuracy window (binary win/loss for now; ML accuracy comes from reports)
  next.recentAccuracy.push(outcome.isWin ? 1 : 0);
  if (next.recentAccuracy.length > ACCURACY_WINDOW) {
    next.recentAccuracy = next.recentAccuracy.slice(-ACCURACY_WINDOW);
  }

  // 4. Bump autonomy level
  next.autonomyLevel = computeAutonomyLevel(next);
  next.adaptationScore = computeAdaptationScore(next);

  return { brain: next, decisions };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyOptimizationReport — bulk insight from Zeta
// ─────────────────────────────────────────────────────────────────────────────

export function applyOptimizationReport(
  brain: BrainState,
  report: OptimizationReportInput,
  now: number = Date.now(),
): { brain: BrainState; decisions: AdaptiveDecision[] } {
  const decisions: AdaptiveDecision[] = [];
  const next = { ...brain };

  // 1. Adjust signal frequency based on health
  const oldFreq = next.signalFrequencyMultiplier;
  if (report.overallHealth === 'DEGRADED') {
    next.signalFrequencyMultiplier = Math.max(FREQUENCY_MIN, oldFreq * 0.85);
  } else if (report.overallHealth === 'OPTIMAL' && report.mlAccuracy > 0.6) {
    next.signalFrequencyMultiplier = Math.min(FREQUENCY_MAX, oldFreq * 1.05);
  } else {
    next.signalFrequencyMultiplier = oldFreq * 0.95 + 1.0 * 0.05;
  }
  if (Math.abs(oldFreq - next.signalFrequencyMultiplier) > 0.01) {
    decisions.push({
      type: 'SIGNAL_FREQUENCY',
      reason: `Health: ${report.overallHealth}, ML: ${(report.mlAccuracy * 100).toFixed(0)}%`,
      oldValue: oldFreq,
      newValue: next.signalFrequencyMultiplier,
      confidence: 70,
      timestamp: now,
    });
  }

  // 2. Track ML accuracy in window
  next.recentAccuracy = [...next.recentAccuracy, report.mlAccuracy];
  if (next.recentAccuracy.length > ACCURACY_WINDOW) {
    next.recentAccuracy = next.recentAccuracy.slice(-ACCURACY_WINDOW);
  }

  next.lastOptimizationPass = now;
  next.totalAdaptations += 1;
  next.autonomyLevel = computeAutonomyLevel(next);
  next.adaptationScore = computeAdaptationScore(next);

  return { brain: next, decisions };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyStrategyBlacklist — instant zero-out
// ─────────────────────────────────────────────────────────────────────────────

export function applyStrategyBlacklist(
  brain: BrainState,
  data: { strategy: string; regime: string; winRate: number },
  now: number = Date.now(),
): { brain: BrainState; decisions: AdaptiveDecision[] } {
  const next = { ...brain, strategyBias: { ...brain.strategyBias } };
  const key = `${data.strategy}-${data.regime}`;
  const oldBias = next.strategyBias[key] ?? 1.0;
  next.strategyBias[key] = 0.1;
  if (!next.blacklistedStrategies.includes(key)) {
    next.blacklistedStrategies = [...next.blacklistedStrategies, key];
  }
  next.totalAdaptations += 1;

  return {
    brain: next,
    decisions: [
      {
        type: 'STRATEGY_WEIGHT',
        reason: `Blacklisted ${data.strategy} in ${data.regime} (${(data.winRate * 100).toFixed(0)}% WR)`,
        oldValue: oldBias,
        newValue: 0.1,
        confidence: 90,
        timestamp: now,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyRegimeChange — transition tracking + instability penalty
// ─────────────────────────────────────────────────────────────────────────────

export function applyRegimeChange(
  brain: BrainState,
  newState: MarketState,
  previousState: MarketState | null,
  now: number = Date.now(),
): { brain: BrainState; decisions: AdaptiveDecision[] } {
  const next = { ...brain };
  // Skip noop — same regime, no transition to record
  if (previousState !== null && previousState === newState) {
    return { brain: next, decisions: [] };
  }

  next.regimeHistory = [...next.regimeHistory, { state: newState, timestamp: now }];
  if (next.regimeHistory.length > REGIME_HISTORY_SIZE) {
    next.regimeHistory = next.regimeHistory.slice(-REGIME_HISTORY_SIZE);
  }

  const oneHourAgo = now - ONE_HOUR_MS;
  const recentTransitions = next.regimeHistory.filter(r => r.timestamp > oneHourAgo).length - 1;

  let oldPenalty = next.regimeTransitionPenalty;
  if (recentTransitions > 3) {
    next.regimeTransitionPenalty = 0.5;
    next.regimeConfidence = 30;
  } else if (recentTransitions > 1) {
    next.regimeTransitionPenalty = 0.7;
    next.regimeConfidence = 50;
  } else {
    // Stable: 3+ same-regime readings → recover
    const lastThree = next.regimeHistory.slice(-3);
    if (lastThree.length >= 3 && lastThree.every(r => r.state === newState)) {
      next.regimeTransitionPenalty = 1.0;
      next.regimeConfidence = 85;
    }
  }

  next.totalAdaptations += 1;

  return {
    brain: next,
    decisions: [
      {
        type: 'REGIME_SWITCH',
        reason: `${previousState ?? 'unknown'} → ${newState} (transitions/hr: ${recentTransitions})`,
        oldValue: oldPenalty,
        newValue: next.regimeTransitionPenalty,
        confidence: next.regimeConfidence,
        timestamp: now,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers consumed by both shells
// ─────────────────────────────────────────────────────────────────────────────

export function getStrategyBias(brain: BrainState, strategy: string, regime: string): number {
  const v = brain.strategyBias[`${strategy}-${regime}`] ?? brain.strategyBias[strategy] ?? 1.0;
  return clamp(v, STRATEGY_BIAS_MIN, STRATEGY_BIAS_MAX);
}

export function isBlacklisted(brain: BrainState, strategy: string, regime: string): boolean {
  return brain.blacklistedStrategies.includes(`${strategy}-${regime}`);
}

function computeAutonomyLevel(brain: BrainState): AutonomyLevel {
  const { outcomesProcessed, totalAdaptations, feedbackLoopsActive } = brain;
  if (outcomesProcessed >= 200 && totalAdaptations >= 20 && feedbackLoopsActive >= 3) {
    return 'AUTONOMOUS';
  }
  if (outcomesProcessed >= 50 && totalAdaptations >= 5) return 'CALIBRATED';
  if (outcomesProcessed >= 10) return 'LEARNING';
  return 'BOOTSTRAPPING';
}

function computeAdaptationScore(brain: BrainState): number {
  const { outcomesProcessed, totalAdaptations, autonomyLevel } = brain;
  switch (autonomyLevel) {
    case 'AUTONOMOUS': return Math.min(100, 60 + totalAdaptations * 0.5);
    case 'CALIBRATED': return Math.min(80, 30 + outcomesProcessed * 0.3);
    case 'LEARNING':   return Math.min(50, outcomesProcessed * 2);
    default:           return Math.min(20, outcomesProcessed * 5);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialization — same shape as autonomousOrchestrator.serialize() so
// existing autonomous_state rows continue to work without migration.
// ─────────────────────────────────────────────────────────────────────────────

export interface SerializedBrain {
  state: {
    positionSizeMultiplier: number;
    signalFrequencyMultiplier: number;
    strategyBias: Record<string, number>;
    blacklistedStrategies?: string[];
    regimeConfidence: number;
    feedbackLoopsActive: number;
    lastOptimizationPass: number;
    adaptationScore: number;
    autonomyLevel: AutonomyLevel;
    totalAdaptations: number;
    outcomesProcessed: number;
    thresholdAdjustments: number;
    recentAccuracy: number[];
    regimeHistory: { state: MarketState; timestamp: number }[];
    regimeTransitionPenalty: number;
  };
  decisions: AdaptiveDecision[];
}

export function serializeBrain(brain: BrainState, decisions: AdaptiveDecision[]): SerializedBrain {
  return {
    state: {
      positionSizeMultiplier: brain.positionSizeMultiplier,
      signalFrequencyMultiplier: brain.signalFrequencyMultiplier,
      strategyBias: { ...brain.strategyBias },
      blacklistedStrategies: [...brain.blacklistedStrategies],
      regimeConfidence: brain.regimeConfidence,
      feedbackLoopsActive: brain.feedbackLoopsActive,
      lastOptimizationPass: brain.lastOptimizationPass,
      adaptationScore: brain.adaptationScore,
      autonomyLevel: brain.autonomyLevel,
      totalAdaptations: brain.totalAdaptations,
      outcomesProcessed: brain.outcomesProcessed,
      thresholdAdjustments: brain.thresholdAdjustments,
      recentAccuracy: [...brain.recentAccuracy],
      regimeHistory: [...brain.regimeHistory],
      regimeTransitionPenalty: brain.regimeTransitionPenalty,
    },
    decisions: decisions.slice(-50),
  };
}

export function hydrateBrain(payload: Partial<SerializedBrain> | null | undefined): BrainState {
  const base = defaultBrainState();
  if (!payload || !payload.state) return base;
  const s = payload.state;
  return {
    positionSizeMultiplier: clamp(s.positionSizeMultiplier ?? 1.0, POSITION_MIN, POSITION_MAX),
    signalFrequencyMultiplier: clamp(s.signalFrequencyMultiplier ?? 1.0, FREQUENCY_MIN, FREQUENCY_MAX),
    strategyBias: { ...(s.strategyBias ?? {}) },
    blacklistedStrategies: [...(s.blacklistedStrategies ?? [])],
    regimeConfidence: s.regimeConfidence ?? 50,
    regimeTransitionPenalty: clamp(s.regimeTransitionPenalty ?? 1.0, 0.5, 1.0),
    recentAccuracy: [...(s.recentAccuracy ?? [])],
    regimeHistory: [...(s.regimeHistory ?? [])],
    totalAdaptations: s.totalAdaptations ?? 0,
    outcomesProcessed: s.outcomesProcessed ?? 0,
    thresholdAdjustments: s.thresholdAdjustments ?? 0,
    lastOptimizationPass: s.lastOptimizationPass ?? 0,
    feedbackLoopsActive: s.feedbackLoopsActive ?? 0,
    adaptationScore: s.adaptationScore ?? 0,
    autonomyLevel: (s.autonomyLevel as AutonomyLevel) ?? 'BOOTSTRAPPING',
  };
}

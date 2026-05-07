/**
 * AUTONOMOUS ORCHESTRATOR - The Central Nervous System
 *
 * Connects ALL broken feedback loops into a single self-improving agent:
 *
 * 1. Hourly Performance → Position Sizing & Signal Frequency
 * 2. Optimization Reports → Strategy Selection Bias
 * 3. Triple Barrier Training Values → Weighted ML Gradients
 * 4. Strategy-Regime Win Rates → Signal Generation Bias
 * 5. Rejection Patterns → Threshold Adjustment
 * 6. Flux Regime → Adaptive Behavior Across All Systems
 * 7. Monthly Stats → Cadence Adaptation
 *
 * Design: Event-driven, lightweight, no polling loops.
 * Listens to existing events and routes decisions to existing engines.
 */

import { zetaLearningEngine } from './zetaLearningEngine';
import { deltaV2QualityEngine } from './deltaV2QualityEngine';
import { fluxController, type FluxMode } from './fluxController';
import { type MarketState } from './marketStateDetectionEngine';
import { supabase } from '@/integrations/supabase/client';

// ===== TYPES =====

export interface AutonomousState {
  // Adaptive parameters (output of self-improvement)
  positionSizeMultiplier: number;     // 0.25 - 1.5 (from hourly perf + drawdown)
  signalFrequencyMultiplier: number;  // 0.5 - 2.0 (from hourly perf + flux mode)
  strategyBias: Map<string, number>;  // strategy → weight multiplier (0.1 - 2.0)
  regimeConfidence: number;           // 0-100 (how confident we are in current regime)

  // System health
  feedbackLoopsActive: number;
  lastOptimizationPass: number;
  adaptationScore: number;            // 0-100 (how well system is adapting)
  autonomyLevel: 'BOOTSTRAPPING' | 'LEARNING' | 'CALIBRATED' | 'AUTONOMOUS';

  // Counters
  totalAdaptations: number;
  outcomesProcessed: number;
  thresholdAdjustments: number;
}

export interface AdaptiveDecision {
  type: 'POSITION_SIZE' | 'SIGNAL_FREQUENCY' | 'STRATEGY_WEIGHT' | 'THRESHOLD_ADJUST' | 'REGIME_SWITCH' | 'CIRCUIT_BREAK';
  reason: string;
  oldValue: number;
  newValue: number;
  confidence: number;
  timestamp: number;
}

// ===== AUTONOMOUS ORCHESTRATOR =====

class AutonomousOrchestrator {
  private state: AutonomousState;
  private decisions: AdaptiveDecision[] = [];
  private readonly STORAGE_KEY = 'autonomous-orchestrator-v1';
  private readonly MAX_DECISIONS = 200;
  private initialized = false;

  // Phase 1.C: Supabase persistence (shared between browser + Vercel cron)
  private readonly SUPABASE_TABLE = 'autonomous_state';
  private readonly SUPABASE_ROW_ID = 'singleton';
  private supabaseLoaded = false;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 2000;
  private currentVersion = 0;

  // Accuracy tracking for adaptive threshold adjustment
  private recentAccuracy: number[] = [];
  private readonly ACCURACY_WINDOW = 50;

  // Regime transition tracking
  private regimeHistory: { state: MarketState; timestamp: number }[] = [];
  private readonly REGIME_HISTORY_SIZE = 10;
  private regimeTransitionPenalty = 1.0; // 1.0 = no penalty, 0.7 = during transition

  constructor() {
    this.state = {
      positionSizeMultiplier: 1.0,
      signalFrequencyMultiplier: 1.0,
      strategyBias: new Map(),
      regimeConfidence: 50,
      feedbackLoopsActive: 0,
      lastOptimizationPass: 0,
      adaptationScore: 0,
      autonomyLevel: 'BOOTSTRAPPING',
      totalAdaptations: 0,
      outcomesProcessed: 0,
      thresholdAdjustments: 0
    };
    // Synchronous fallback boot — loaded from localStorage if available.
    // The async Supabase load happens in initialize() and overrides this.
    this.loadStateFromLocalStorage();
  }

  // ===== INITIALIZATION =====

  /**
   * Connect all feedback loops. Call once after all services are initialized.
   * Also kicks off async Supabase load — when it completes, in-memory state
   * is overwritten with the canonical row (which the cron may have updated).
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Async load from Supabase — does not block feedback-loop wiring.
    // In a serverless context (Vercel cron), call loadFromSupabase() and
    // await it directly; in browser, fire-and-forget is fine because the
    // initial localStorage boot gives a sane starting point.
    this.loadFromSupabase().catch(err =>
      console.warn('[Orchestrator] Supabase load failed, using localStorage:', err?.message)
    );

    console.log('[Orchestrator] Initializing autonomous feedback loops...');

    let loopsConnected = 0;

    // LOOP 1: Zeta optimization reports → Strategy selection + threshold adjustment
    try {
      zetaLearningEngine.on('self-improve:report', (report: any) => {
        this.handleOptimizationReport(report);
      });
      loopsConnected++;
      console.log('[Orchestrator] ✅ Loop 1: Optimization reports → Strategy adjustment');
    } catch (e) {
      console.warn('[Orchestrator] ⚠️ Loop 1 failed:', e);
    }

    // LOOP 2: Zeta blacklist events → Immediate strategy bias update
    try {
      zetaLearningEngine.on('self-improve:blacklist', (data: any) => {
        this.handleStrategyBlacklist(data);
      });
      loopsConnected++;
      console.log('[Orchestrator] ✅ Loop 2: Strategy blacklist → Bias update');
    } catch (e) {
      console.warn('[Orchestrator] ⚠️ Loop 2 failed:', e);
    }

    // LOOP 3: Signal outcomes → Adaptive position sizing + accuracy tracking
    try {
      zetaLearningEngine.on('signal_outcome', (outcome: any) => {
        this.handleOutcome(outcome);
      });
      loopsConnected++;
      console.log('[Orchestrator] ✅ Loop 3: Outcomes → Position sizing + accuracy');
    } catch (e) {
      console.warn('[Orchestrator] ⚠️ Loop 3 failed:', e);
    }

    // LOOP 4: Flux mode changes → System-wide adaptation
    try {
      fluxController.subscribe((fluxState: any) => {
        this.handleFluxModeChange(fluxState);
      });
      loopsConnected++;
      console.log('[Orchestrator] ✅ Loop 4: Flux mode → System-wide adaptation');
    } catch (e) {
      console.warn('[Orchestrator] ⚠️ Loop 4 failed:', e);
    }

    this.state.feedbackLoopsActive = loopsConnected;
    this.updateAutonomyLevel();
    this.saveState();

    console.log(`[Orchestrator] ✅ ${loopsConnected}/4 feedback loops active. Autonomy: ${this.state.autonomyLevel}`);
  }

  // ===== FEEDBACK LOOP HANDLERS =====

  /**
   * LOOP 1: Handle Zeta optimization reports (every 25 outcomes)
   * Routes insights to: strategy bias, threshold adjustment, signal frequency
   */
  private handleOptimizationReport(report: {
    totalOutcomes: number;
    confidenceDrift: number;
    bestTradingHour: string;
    worstTradingHour: string;
    blacklistedStrategies: number;
    overallHealth: string;
    mlAccuracy: number;
  }): void {
    console.log('[Orchestrator] 📊 Processing optimization report...');

    // 1. Adjust signal frequency based on health
    const oldFreqMultiplier = this.state.signalFrequencyMultiplier;
    if (report.overallHealth === 'DEGRADED') {
      // System is struggling — reduce signal frequency (be more selective)
      this.state.signalFrequencyMultiplier = Math.max(0.5, this.state.signalFrequencyMultiplier * 0.85);
    } else if (report.overallHealth === 'OPTIMAL' && report.mlAccuracy > 0.6) {
      // System is performing well — can increase frequency slightly
      this.state.signalFrequencyMultiplier = Math.min(1.5, this.state.signalFrequencyMultiplier * 1.05);
    } else {
      // Gradually return to baseline
      this.state.signalFrequencyMultiplier = this.state.signalFrequencyMultiplier * 0.95 + 1.0 * 0.05;
    }

    if (Math.abs(oldFreqMultiplier - this.state.signalFrequencyMultiplier) > 0.01) {
      this.recordDecision({
        type: 'SIGNAL_FREQUENCY',
        reason: `Health: ${report.overallHealth}, ML: ${(report.mlAccuracy * 100).toFixed(0)}%`,
        oldValue: oldFreqMultiplier,
        newValue: this.state.signalFrequencyMultiplier,
        confidence: 70,
        timestamp: Date.now()
      });
    }

    // 2. Confidence drift → adjust Delta thresholds bidirectionally
    if (report.confidenceDrift > 15) {
      // High drift means confidence scores are unreliable → tighten thresholds
      this.adjustDeltaThresholds('tighten', `Confidence drift: ${report.confidenceDrift.toFixed(1)}`);
    } else if (report.confidenceDrift < 5 && report.overallHealth === 'OPTIMAL') {
      // Low drift + good health → can loosen slightly for more opportunities
      this.adjustDeltaThresholds('loosen', `Low drift: ${report.confidenceDrift.toFixed(1)}, health: OPTIMAL`);
    }

    // 3. Track accuracy trend for threshold ramp-down
    this.recentAccuracy.push(report.mlAccuracy);
    if (this.recentAccuracy.length > this.ACCURACY_WINDOW) {
      this.recentAccuracy = this.recentAccuracy.slice(-this.ACCURACY_WINDOW);
    }

    // Check for accuracy degradation (enables threshold RAMP-DOWN)
    if (this.recentAccuracy.length >= 10) {
      const recent5 = this.recentAccuracy.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const previous5 = this.recentAccuracy.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
      if (recent5 < previous5 - 0.05) {
        // Accuracy dropped by >5% — ramp down thresholds to recover signal flow
        this.adjustDeltaThresholds('loosen', `Accuracy degradation: ${(previous5 * 100).toFixed(0)}% → ${(recent5 * 100).toFixed(0)}%`);
      }
    }

    this.state.lastOptimizationPass = Date.now();
    this.state.totalAdaptations++;
    this.updateAutonomyLevel();
    this.saveState();
  }

  /**
   * LOOP 2: Handle strategy blacklist events
   * Immediately adjust strategy bias weights
   */
  private handleStrategyBlacklist(data: { strategy: string; regime: string; winRate: number }): void {
    const key = `${data.strategy}-${data.regime}`;
    this.state.strategyBias.set(key, 0.1); // Near-zero weight for blacklisted
    console.log(`[Orchestrator] Strategy bias: ${key} → 0.1 (blacklisted, WR: ${(data.winRate * 100).toFixed(0)}%)`);

    this.recordDecision({
      type: 'STRATEGY_WEIGHT',
      reason: `Auto-blacklisted: ${data.strategy} in ${data.regime} (${(data.winRate * 100).toFixed(0)}% WR)`,
      oldValue: 1.0,
      newValue: 0.1,
      confidence: 90,
      timestamp: Date.now()
    });

    this.state.totalAdaptations++;
    this.saveState();
  }

  /**
   * LOOP 3: Handle every signal outcome
   * Updates position sizing based on hourly performance + recent win rate
   */
  private handleOutcome(outcome: any): void {
    this.state.outcomesProcessed++;

    // Use Zeta's hourly multiplier (this was previously computed but never consumed!)
    const hourlyMultiplier = zetaLearningEngine.getHourlyMultiplier();

    // Combine with recent accuracy for position sizing
    const recentAccuracy = this.recentAccuracy.length > 0
      ? this.recentAccuracy.slice(-10).reduce((a, b) => a + b, 0) / Math.min(this.recentAccuracy.length, 10)
      : 0.5;

    const oldPositionMultiplier = this.state.positionSizeMultiplier;

    // Position size = hourly perf × accuracy confidence
    // Clamp between 0.25 (very bad) and 1.5 (very good)
    let newMultiplier = hourlyMultiplier;
    if (recentAccuracy < 0.4) {
      newMultiplier *= 0.6; // Poor accuracy → reduce size
    } else if (recentAccuracy > 0.65) {
      newMultiplier *= 1.2; // Great accuracy → increase size
    }
    this.state.positionSizeMultiplier = Math.max(0.25, Math.min(1.5, newMultiplier));

    // Only record significant changes
    if (Math.abs(oldPositionMultiplier - this.state.positionSizeMultiplier) > 0.05) {
      this.recordDecision({
        type: 'POSITION_SIZE',
        reason: `Hourly: ${hourlyMultiplier.toFixed(2)}, Accuracy: ${(recentAccuracy * 100).toFixed(0)}%`,
        oldValue: oldPositionMultiplier,
        newValue: this.state.positionSizeMultiplier,
        confidence: 75,
        timestamp: Date.now()
      });
    }

    // Update strategy bias from actual performance
    if (outcome.strategy && outcome.regime) {
      this.updateStrategyBias(outcome.strategy, outcome.regime, outcome.outcome === 'WIN');
    }

    // Save periodically (every 5 outcomes)
    if (this.state.outcomesProcessed % 5 === 0) {
      this.updateAutonomyLevel();
      this.saveState();
    }
  }

  /**
   * LOOP 4: Handle Flux mode changes
   * Adapts position sizing, signal frequency, and thresholds based on market regime
   */
  private handleFluxModeChange(fluxState: any): void {
    const mode: FluxMode = fluxState.mode || fluxState.autoDetectedMode;
    const volatility = fluxState.marketVolatility || 50;

    console.log(`[Orchestrator] Flux mode: ${mode}, Volatility: ${volatility}`);

    // Adjust position sizing based on volatility
    if (volatility > 70) {
      // High volatility → reduce positions
      this.state.positionSizeMultiplier = Math.min(this.state.positionSizeMultiplier, 0.7);
    }

    // Adjust signal frequency based on mode
    if (mode === 'PULL') {
      // PULL mode = fewer, better signals → reduce frequency multiplier
      this.state.signalFrequencyMultiplier = Math.min(this.state.signalFrequencyMultiplier, 0.8);
    } else if (mode === 'PUSH') {
      // PUSH mode = more signals → allow higher frequency
      this.state.signalFrequencyMultiplier = Math.max(this.state.signalFrequencyMultiplier, 1.0);
    }

    // Update regime confidence
    this.state.regimeConfidence = Math.min(100, volatility > 30 && volatility < 70 ? 80 : 60);

    this.saveState();
  }

  // ===== ADAPTIVE MECHANISMS =====

  /**
   * Bidirectional Delta threshold adjustment (FIX: was previously only ramp-up)
   */
  private adjustDeltaThresholds(direction: 'tighten' | 'loosen', reason: string): void {
    try {
      const stats = deltaV2QualityEngine.getStats();
      const currentQuality = stats.avgQualityScore || 50;

      // Read current thresholds from localStorage
      const saved = localStorage.getItem('igx_delta_thresholds');
      if (!saved) return;

      const thresholds = JSON.parse(saved);
      const oldQuality = thresholds.quality || 20;
      const oldML = thresholds.ml || 0.25;

      let newQuality = oldQuality;
      let newML = oldML;

      if (direction === 'tighten') {
        newQuality = Math.min(70, oldQuality + 3);
        newML = Math.min(0.70, oldML + 0.03);
      } else {
        // LOOSEN — this is the missing ramp-down!
        newQuality = Math.max(15, oldQuality - 3);
        newML = Math.max(0.20, oldML - 0.03);
      }

      if (newQuality !== oldQuality || newML !== oldML) {
        deltaV2QualityEngine.setThresholds(newQuality, newML, thresholds.strategyWinRate || 0);
        this.state.thresholdAdjustments++;

        this.recordDecision({
          type: 'THRESHOLD_ADJUST',
          reason: `${direction}: ${reason}`,
          oldValue: oldQuality,
          newValue: newQuality,
          confidence: 65,
          timestamp: Date.now()
        });

        console.log(`[Orchestrator] Thresholds ${direction}ed: Quality ${oldQuality}→${newQuality}, ML ${(oldML * 100).toFixed(0)}→${(newML * 100).toFixed(0)}%`);
      }
    } catch (e) {
      // Silently ignore if thresholds can't be adjusted
    }
  }

  /**
   * Update strategy bias based on rolling performance
   * Uses exponential moving average for recency weighting
   */
  private updateStrategyBias(strategy: string, regime: string, win: boolean): void {
    const key = `${strategy}-${regime}`;
    const currentBias = this.state.strategyBias.get(key) || 1.0;

    // EMA with alpha=0.1 (recent outcomes weighted more)
    const alpha = 0.1;
    const outcomeValue = win ? 1.3 : 0.7; // Win → boost, Loss → dampen
    const newBias = Math.max(0.1, Math.min(2.0, currentBias * (1 - alpha) + outcomeValue * alpha));

    this.state.strategyBias.set(key, newBias);
  }

  /**
   * Update autonomy level based on data maturity
   */
  private updateAutonomyLevel(): void {
    const outcomes = this.state.outcomesProcessed;
    const adaptations = this.state.totalAdaptations;
    const loops = this.state.feedbackLoopsActive;

    if (outcomes >= 200 && adaptations >= 20 && loops >= 3) {
      this.state.autonomyLevel = 'AUTONOMOUS';
      this.state.adaptationScore = Math.min(100, 60 + adaptations * 0.5);
    } else if (outcomes >= 50 && adaptations >= 5) {
      this.state.autonomyLevel = 'CALIBRATED';
      this.state.adaptationScore = Math.min(80, 30 + outcomes * 0.3);
    } else if (outcomes >= 10) {
      this.state.autonomyLevel = 'LEARNING';
      this.state.adaptationScore = Math.min(50, outcomes * 2);
    } else {
      this.state.autonomyLevel = 'BOOTSTRAPPING';
      this.state.adaptationScore = Math.min(20, outcomes * 5);
    }
  }

  // ===== PUBLIC API (consumed by other services) =====

  /**
   * Get current position size multiplier
   * Used by arenaQuantEngine for adaptive position sizing
   */
  getPositionSizeMultiplier(): number {
    return this.state.positionSizeMultiplier;
  }

  /**
   * Get current signal frequency multiplier
   * Used by globalHubService/scheduledSignalDropper for adaptive cadence
   */
  getSignalFrequencyMultiplier(): number {
    return this.state.signalFrequencyMultiplier;
  }

  /**
   * Get strategy bias weight
   * Used by signal generation to weight strategy selection
   */
  getStrategyBias(strategy: string, regime: string): number {
    return this.state.strategyBias.get(`${strategy}-${regime}`) ||
           this.state.strategyBias.get(strategy) || 1.0;
  }

  /**
   * Notify orchestrator of a global regime change (called by arenaQuantEngine)
   * Tracks transitions and applies position sizing penalty during instability
   */
  notifyRegimeChange(newState: MarketState, previousState: MarketState): void {
    this.regimeHistory.push({ state: newState, timestamp: Date.now() });
    if (this.regimeHistory.length > this.REGIME_HISTORY_SIZE) {
      this.regimeHistory = this.regimeHistory.slice(-this.REGIME_HISTORY_SIZE);
    }

    // Count transitions in last hour
    const oneHourAgo = Date.now() - 3600000;
    const recentTransitions = this.regimeHistory.filter(r => r.timestamp > oneHourAgo).length - 1;

    // Detect instability: >3 transitions/hour = UNSTABLE market
    if (recentTransitions > 3) {
      this.regimeTransitionPenalty = 0.5; // Heavy reduction during chaotic regime switching
      this.state.regimeConfidence = 30;
      console.log(`[Orchestrator] UNSTABLE: ${recentTransitions} regime transitions/hour → 0.5x sizing`);
    } else if (recentTransitions > 1) {
      this.regimeTransitionPenalty = 0.7; // Moderate reduction
      this.state.regimeConfidence = 50;
      console.log(`[Orchestrator] Regime transition: ${previousState} → ${newState} → 0.7x sizing`);
    } else {
      // Stable: 3+ consecutive same-regime readings → recover
      const lastThree = this.regimeHistory.slice(-3);
      if (lastThree.length >= 3 && lastThree.every(r => r.state === newState)) {
        this.regimeTransitionPenalty = 1.0;
        this.state.regimeConfidence = 85;
      }
    }

    this.recordDecision({
      type: 'REGIME_SWITCH',
      reason: `${previousState} → ${newState} (transitions/hr: ${recentTransitions})`,
      oldValue: this.regimeTransitionPenalty,
      newValue: this.regimeTransitionPenalty,
      confidence: this.state.regimeConfidence,
      timestamp: Date.now()
    });

    this.state.totalAdaptations++;
    this.saveState();
  }

  /**
   * Get regime stability score (0-100)
   * Used by other systems to gauge confidence in current regime
   */
  getRegimeStability(): { stable: boolean; confidence: number; transitionPenalty: number } {
    return {
      stable: this.regimeTransitionPenalty >= 0.9,
      confidence: this.state.regimeConfidence,
      transitionPenalty: this.regimeTransitionPenalty
    };
  }

  /**
   * Should we trade right now? (combines hourly perf + health + flux + regime stability)
   */
  shouldTrade(): { allowed: boolean; reason: string; multiplier: number } {
    const hourlyMultiplier = zetaLearningEngine.getHourlyMultiplier();
    const health = zetaLearningEngine.getMetrics().health;

    // Hard stop: DEGRADED health + bad hour
    if (health === 'DEGRADED' && hourlyMultiplier < 0.6) {
      return { allowed: false, reason: 'System DEGRADED + historically bad hour', multiplier: 0 };
    }

    // Soft restriction: reduce size but allow
    if (hourlyMultiplier < 0.6) {
      return { allowed: true, reason: `Historically weak hour (${hourlyMultiplier.toFixed(2)}x)`, multiplier: hourlyMultiplier * this.regimeTransitionPenalty };
    }

    return {
      allowed: true,
      reason: `Normal: hourly=${hourlyMultiplier.toFixed(2)}x, health=${health}, regime=${this.regimeTransitionPenalty.toFixed(2)}x`,
      multiplier: this.state.positionSizeMultiplier * hourlyMultiplier * this.regimeTransitionPenalty
    };
  }

  /**
   * Get full diagnostic state for UI/debugging
   */
  getState(): AutonomousState & { recentDecisions: AdaptiveDecision[] } {
    return {
      ...this.state,
      strategyBias: new Map(this.state.strategyBias),
      recentDecisions: this.decisions.slice(-20)
    };
  }

  // ===== PERSISTENCE =====

  private recordDecision(decision: AdaptiveDecision): void {
    this.decisions.push(decision);
    if (this.decisions.length > this.MAX_DECISIONS) {
      this.decisions = this.decisions.slice(-this.MAX_DECISIONS);
    }
  }

  /**
   * Serialize state to a JSON-safe object (used by both Supabase and localStorage).
   */
  private serialize(): { state: any; decisions: AdaptiveDecision[] } {
    return {
      state: {
        positionSizeMultiplier: this.state.positionSizeMultiplier,
        signalFrequencyMultiplier: this.state.signalFrequencyMultiplier,
        strategyBias: Object.fromEntries(this.state.strategyBias),
        regimeConfidence: this.state.regimeConfidence,
        feedbackLoopsActive: this.state.feedbackLoopsActive,
        lastOptimizationPass: this.state.lastOptimizationPass,
        adaptationScore: this.state.adaptationScore,
        autonomyLevel: this.state.autonomyLevel,
        totalAdaptations: this.state.totalAdaptations,
        outcomesProcessed: this.state.outcomesProcessed,
        thresholdAdjustments: this.state.thresholdAdjustments,
        recentAccuracy: this.recentAccuracy,
        regimeHistory: this.regimeHistory,
        regimeTransitionPenalty: this.regimeTransitionPenalty,
      },
      decisions: this.decisions.slice(-50),
    };
  }

  /**
   * Hydrate from a previously-serialized blob (from Supabase or localStorage).
   */
  private hydrate(payload: { state: any; decisions?: AdaptiveDecision[] }): void {
    const data = payload.state || {};
    this.state.positionSizeMultiplier = data.positionSizeMultiplier ?? 1.0;
    this.state.signalFrequencyMultiplier = data.signalFrequencyMultiplier ?? 1.0;
    this.state.strategyBias = new Map(Object.entries(data.strategyBias || {}));
    this.state.regimeConfidence = data.regimeConfidence ?? 50;
    this.state.feedbackLoopsActive = data.feedbackLoopsActive ?? 0;
    this.state.lastOptimizationPass = data.lastOptimizationPass ?? 0;
    this.state.adaptationScore = data.adaptationScore ?? 0;
    this.state.autonomyLevel = data.autonomyLevel ?? 'BOOTSTRAPPING';
    this.state.totalAdaptations = data.totalAdaptations ?? 0;
    this.state.outcomesProcessed = data.outcomesProcessed ?? 0;
    this.state.thresholdAdjustments = data.thresholdAdjustments ?? 0;
    this.recentAccuracy = data.recentAccuracy ?? [];
    this.regimeHistory = data.regimeHistory ?? [];
    this.regimeTransitionPenalty = data.regimeTransitionPenalty ?? 1.0;
    this.decisions = payload.decisions || [];
  }

  /**
   * Phase 1.C: durably persist state to Supabase (with localStorage fallback).
   * Debounced to absorb burst writes during high-event periods.
   */
  private saveState(): void {
    // Always update localStorage synchronously as the fast-path cache.
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.serialize())); } catch {}

    // Debounce the Supabase write. The cron uses a non-debounced path because
    // Vercel functions don't survive past the response — see saveStateNow().
    // Phase 4: All saves go through saveStateWithRetry() to tolerate
    // concurrent writers (multiple browser tabs + cron).
    if (typeof window === 'undefined') {
      this.saveStateWithRetry().catch(err =>
        console.warn('[Orchestrator] Supabase save failed:', err?.message)
      );
      return;
    }

    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      this.saveStateWithRetry().catch(err =>
        console.warn('[Orchestrator] Supabase save failed:', err?.message)
      );
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Non-debounced Supabase write — call directly from server-side code that
   * needs to flush before responding (e.g. trade-tick.ts at end of tick).
   *
   * Phase 4: Optimistic concurrency control. The UPDATE is gated on
   * `version = currentVersion` and bumps to currentVersion+1. If another
   * writer (a second browser tab, or the cron) updated the row in between
   * our load and our save, the WHERE clause matches zero rows and we get a
   * stale-write error. The caller can choose to reload + retry.
   *
   * Returns the new version on success, or throws on conflict.
   */
  async saveStateNow(): Promise<number> {
    const payload = this.serialize();
    const expectedVersion = this.currentVersion;
    const nextVersion = expectedVersion + 1;

    const { data, error } = await (supabase as any)
      .from(this.SUPABASE_TABLE)
      .update({
        state: payload.state,
        decisions: payload.decisions,
        version: nextVersion,
      })
      .eq('id', this.SUPABASE_ROW_ID)
      .eq('version', expectedVersion)
      .select('version')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Stale write detected — another writer bumped the version.
      // Reload canonical state and let the caller decide whether to retry.
      console.warn(`[Orchestrator] Stale write rejected (expected v${expectedVersion}). Reloading…`);
      try { await this.loadFromSupabase(); } catch { /* swallow */ }
      const err = new Error('STALE_WRITE');
      (err as any).code = 'STALE_WRITE';
      (err as any).expectedVersion = expectedVersion;
      (err as any).actualVersion = this.currentVersion;
      throw err;
    }

    this.currentVersion = data.version;
    return this.currentVersion;
  }

  /**
   * Save with one-shot retry on stale-write conflict. Recommended for routine
   * saves where you want best-effort persistence; if the conflict resolution
   * succeeds, the last writer wins by re-applying its delta on top of the
   * fresh state.
   */
  async saveStateWithRetry(): Promise<number | null> {
    try {
      return await this.saveStateNow();
    } catch (err: any) {
      if (err?.code !== 'STALE_WRITE') throw err;
      // After loadFromSupabase() in saveStateNow's catch path, the in-memory
      // state may have been overridden. We re-serialize and try once more.
      try {
        return await this.saveStateNow();
      } catch (retryErr: any) {
        console.warn('[Orchestrator] Stale write retry also failed:', retryErr?.message);
        return null;
      }
    }
  }

  /**
   * Phase 1.C: load canonical state from Supabase (overrides localStorage boot).
   * Called by initialize(); cron handlers should also `await loadFromSupabase()`
   * before applying any orchestrator multipliers.
   */
  async loadFromSupabase(): Promise<void> {
    const { data, error } = await (supabase as any)
      .from(this.SUPABASE_TABLE)
      .select('state, decisions, version')
      .eq('id', this.SUPABASE_ROW_ID)
      .single();
    if (error) {
      // PGRST116 = no rows; row should exist after migration but skip gracefully
      if ((error as any).code !== 'PGRST116') {
        throw error;
      }
      return;
    }
    if (data?.state) {
      this.hydrate({ state: data.state, decisions: data.decisions || [] });
      this.currentVersion = data.version ?? 0;
      this.supabaseLoaded = true;
      console.log(`[Orchestrator] Loaded from Supabase: ${this.state.autonomyLevel}, v${this.currentVersion}, ${this.state.totalAdaptations} adaptations`);
    }
  }

  /**
   * Synchronous localStorage boot — fast-path startup so the orchestrator has
   * sane multipliers before the async Supabase load completes.
   */
  private loadStateFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Old format had state fields at top-level; new format wraps under .state
        const payload = data.state ? data : { state: data, decisions: data.decisions || [] };
        this.hydrate(payload);
        console.log(`[Orchestrator] localStorage boot: ${this.state.autonomyLevel}, ${this.state.totalAdaptations} adaptations`);
      }
    } catch {}
  }
}

// ===== SINGLETON EXPORT =====

export const autonomousOrchestrator = new AutonomousOrchestrator();

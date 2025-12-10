/**
 * CONTINUOUS LEARNING INTEGRATOR
 * Central hub for processing signal outcomes and feeding all learning engines
 *
 * CRITICAL COMPONENT: This is the feedback loop that enables the system to learn and improve
 *
 * RESPONSIBILITIES:
 * - Receive signal outcomes from Signal Lifecycle Manager
 * - Feed outcomes to Beta V5 ML Engine (strategy weights)
 * - Feed outcomes to Alpha V3 Continuous Learning Engine (regime/risk learning)
 * - Feed outcomes to Confidence Calibrator (when implemented)
 * - Track overall system learning progress
 * - Emit learning update events for UI
 *
 * This is the BRIDGE that connects signal generation to continuous improvement
 */

import type { SignalOutcome } from './SignalLifecycleManager';
import { igxBetaV5 } from './IGXBetaV5';
import { continuousLearningEngine } from './ContinuousLearningEngine';
import { confidenceCalibrator } from './ConfidenceCalibrator';
import type { MarketRegime } from './AdaptiveFrequencyController';

/**
 * Learning metrics for UI display
 */
export interface LearningMetrics {
  // Overall performance
  totalOutcomes: number;
  totalWins: number;
  totalLosses: number;
  overallWinRate: number;
  overallAvgProfit: number;
  overallProfitFactor: number;
  overallSharpeRatio: number;

  // Recent performance (last 50)
  recentWinRate: number;
  recentAvgProfit: number;
  recentProfitFactor: number;

  // Per regime performance
  regimePerformance: Map<MarketRegime, {
    signals: number;
    winRate: number;
    avgProfit: number;
  }>;

  // Per strategy performance
  strategyPerformance: Map<string, {
    signals: number;
    winRate: number;
    currentWeight: number;
  }>;

  // Learning progress
  learningUpdates: number;
  lastUpdate: number;
  learningRate: number;

  // Confidence calibration metrics
  calibrationError: number; // Expected Calibration Error (ECE)
  calibrationQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  calibrationStatus: 'NOT_READY' | 'LEARNING' | 'CALIBRATED' | 'NEEDS_IMPROVEMENT';
  calibrationProgress: number; // 0-100

  timestamp: number;
}

/**
 * Learning update event detail
 */
export interface LearningUpdate {
  type: 'OUTCOME_PROCESSED' | 'WEIGHTS_UPDATED' | 'CALIBRATION_UPDATED' | 'REGIME_UPDATED';
  metrics: LearningMetrics;
  timestamp: number;
}

export class ContinuousLearningIntegrator {
  // Outcome history (for metrics calculation)
  private outcomes: SignalOutcome[] = [];
  private readonly MAX_OUTCOMES = 1000;

  // Learning statistics
  private stats = {
    totalOutcomesProcessed: 0,
    totalWins: 0,
    totalLosses: 0,
    learningUpdates: 0,
    lastUpdate: 0,
    startTime: Date.now()
  };

  // Per-regime tracking
  private regimeOutcomes = new Map<MarketRegime, SignalOutcome[]>();

  // Per-strategy tracking
  private strategyOutcomes = new Map<string, SignalOutcome[]>();

  // Running state
  private isRunning = false;

  constructor() {
    console.log('[Learning Integrator] Initialized - Ready to process outcomes');
  }

  /**
   * Start the integrator (listen for outcome events)
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Learning Integrator] Already running');
      return;
    }

    this.isRunning = true;

    // Listen for signal outcome events
    window.addEventListener('igx-signal-outcome', this.handleOutcomeEvent.bind(this));

    console.log('[Learning Integrator] ✅ Started - Listening for signal outcomes');
  }

  /**
   * Stop the integrator
   */
  stop(): void {
    this.isRunning = false;
    window.removeEventListener('igx-signal-outcome', this.handleOutcomeEvent.bind(this));
    console.log('[Learning Integrator] ⏹️ Stopped');
  }

  /**
   * Handle signal outcome event
   */
  private handleOutcomeEvent(event: CustomEvent): void {
    const outcome: SignalOutcome = event.detail;
    this.processSignalOutcome(outcome);
  }

  /**
   * Main method: Process signal outcome and feed all learning engines
   */
  async processSignalOutcome(outcome: SignalOutcome): Promise<void> {
    console.log(
      `[Learning Integrator] 📊 Processing outcome: ${outcome.symbol} ${outcome.direction} → ` +
      `${outcome.success ? 'WIN' : 'LOSS'} (${outcome.actualProfit > 0 ? '+' : ''}${outcome.actualProfit.toFixed(2)}%)`
    );

    // Store outcome
    this.outcomes.push(outcome);
    if (this.outcomes.length > this.MAX_OUTCOMES) {
      this.outcomes = this.outcomes.slice(-this.MAX_OUTCOMES);
    }

    // Update stats
    this.stats.totalOutcomesProcessed++;
    if (outcome.success) {
      this.stats.totalWins++;
    } else {
      this.stats.totalLosses++;
    }

    // Track by regime
    this.trackByRegime(outcome);

    // Track by strategy
    this.trackByStrategy(outcome);

    // Feed to learning engines
    await this.feedToLearningEngines(outcome);

    // Update stats
    this.stats.learningUpdates++;
    this.stats.lastUpdate = Date.now();

    // Emit learning update event
    this.emitLearningUpdate('OUTCOME_PROCESSED');

    console.log(
      `[Learning Integrator] ✅ Outcome processed. Total: ${this.stats.totalOutcomesProcessed}, ` +
      `Win Rate: ${this.getOverallWinRate().toFixed(1)}%`
    );
  }

  /**
   * Feed outcome to all learning engines
   */
  private async feedToLearningEngines(outcome: SignalOutcome): Promise<void> {
    try {
      // 1. Feed to Alpha V3's Continuous Learning Engine
      // This updates regime weights, thresholds, and risk models
      continuousLearningEngine.recordOutcome({
        signalId: outcome.signalId,
        symbol: outcome.symbol,
        direction: outcome.direction,
        entryPrice: outcome.entryPrice,
        exitPrice: outcome.exitPrice,
        actualProfit: outcome.actualProfit,
        actualDrawdown: outcome.actualDrawdown,
        duration: outcome.duration,
        regime: outcome.regime as MarketRegime,
        patternStrength: 70, // TODO: Get from signal metadata
        confidence: outcome.originalConfidence,
        timestamp: outcome.timestamp
      });

      console.log('  ↳ Fed to Alpha V3 Continuous Learning Engine');

      // 2. Feed to Beta V5's ML Engine
      // This updates strategy weights
      const betaStats = igxBetaV5.getStats();
      if (betaStats.isRunning) {
        // Beta V5's ML engine updates via the Strategy ML Engine
        // We access it through the performance metrics update
        // TODO: Add direct method to update ML weights
        console.log('  ↳ Beta V5 ML Engine will update on next analysis');
      }

      // 3. Feed to Confidence Calibrator
      confidenceCalibrator.recordOutcome(
        outcome.originalConfidence,
        outcome.success
      );

      console.log('  ↳ Fed to Confidence Calibrator');

      // 4. Feed to Risk Models (when implemented)
      // riskModel.updateFromOutcome(outcome);

    } catch (error) {
      console.error('[Learning Integrator] ❌ Error feeding learning engines:', error);
    }
  }

  /**
   * Track outcome by regime
   */
  private trackByRegime(outcome: SignalOutcome): void {
    const regime = outcome.regime as MarketRegime;
    const regimeOutcomes = this.regimeOutcomes.get(regime) || [];
    regimeOutcomes.push(outcome);

    // Keep last 100 per regime
    if (regimeOutcomes.length > 100) {
      regimeOutcomes.shift();
    }

    this.regimeOutcomes.set(regime, regimeOutcomes);
  }

  /**
   * Track outcome by strategy
   */
  private trackByStrategy(outcome: SignalOutcome): void {
    const strategy = outcome.strategy;
    const strategyOutcomes = this.strategyOutcomes.get(strategy) || [];
    strategyOutcomes.push(outcome);

    // Keep last 100 per strategy
    if (strategyOutcomes.length > 100) {
      strategyOutcomes.shift();
    }

    this.strategyOutcomes.set(strategy, strategyOutcomes);
  }

  /**
   * Get overall win rate
   */
  private getOverallWinRate(): number {
    if (this.stats.totalOutcomesProcessed === 0) return 0;
    return (this.stats.totalWins / this.stats.totalOutcomesProcessed) * 100;
  }

  /**
   * Get learning metrics for UI
   */
  getLearningMetrics(): LearningMetrics {
    // Overall metrics
    const totalOutcomes = this.outcomes.length;
    const wins = this.outcomes.filter(o => o.success).length;
    const losses = this.outcomes.filter(o => !o.success).length;
    const overallWinRate = totalOutcomes > 0 ? wins / totalOutcomes : 0;

    // Calculate overall profit metrics
    const winningOutcomes = this.outcomes.filter(o => o.success);
    const losingOutcomes = this.outcomes.filter(o => !o.success);

    const totalProfit = winningOutcomes.reduce((sum, o) => sum + o.actualProfit, 0);
    const totalLoss = Math.abs(losingOutcomes.reduce((sum, o) => sum + o.actualProfit, 0));
    const overallAvgProfit = totalOutcomes > 0
      ? this.outcomes.reduce((sum, o) => sum + o.actualProfit, 0) / totalOutcomes
      : 0;
    const overallProfitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Calculate Sharpe ratio (simplified: avg return / std dev)
    let overallSharpeRatio = 0;
    if (totalOutcomes >= 10) {
      const returns = this.outcomes.map(o => o.actualProfit);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      overallSharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }

    // Recent performance (last 50)
    const recentOutcomes = this.outcomes.slice(-50);
    const recentWins = recentOutcomes.filter(o => o.success).length;
    const recentWinRate = recentOutcomes.length > 0 ? recentWins / recentOutcomes.length : 0;
    const recentAvgProfit = recentOutcomes.length > 0
      ? recentOutcomes.reduce((sum, o) => sum + o.actualProfit, 0) / recentOutcomes.length
      : 0;

    const recentWinningOutcomes = recentOutcomes.filter(o => o.success);
    const recentLosingOutcomes = recentOutcomes.filter(o => !o.success);
    const recentTotalProfit = recentWinningOutcomes.reduce((sum, o) => sum + o.actualProfit, 0);
    const recentTotalLoss = Math.abs(recentLosingOutcomes.reduce((sum, o) => sum + o.actualProfit, 0));
    const recentProfitFactor = recentTotalLoss > 0 ? recentTotalProfit / recentTotalLoss : 0;

    // Per regime performance
    const regimePerformance = new Map<MarketRegime, { signals: number; winRate: number; avgProfit: number }>();
    for (const [regime, outcomes] of this.regimeOutcomes.entries()) {
      const regimeWins = outcomes.filter(o => o.success).length;
      const regimeAvgProfit = outcomes.length > 0
        ? outcomes.reduce((sum, o) => sum + o.actualProfit, 0) / outcomes.length
        : 0;

      regimePerformance.set(regime, {
        signals: outcomes.length,
        winRate: outcomes.length > 0 ? regimeWins / outcomes.length : 0,
        avgProfit: regimeAvgProfit
      });
    }

    // Per strategy performance
    const strategyPerformance = new Map<string, { signals: number; winRate: number; currentWeight: number }>();
    const betaStats = igxBetaV5.getStats();
    const currentWeights = betaStats.currentWeights;

    for (const [strategy, outcomes] of this.strategyOutcomes.entries()) {
      const strategyWins = outcomes.filter(o => o.success).length;
      const currentWeight = currentWeights.get(strategy) || 0.1;

      strategyPerformance.set(strategy, {
        signals: outcomes.length,
        winRate: outcomes.length > 0 ? strategyWins / outcomes.length : 0,
        currentWeight
      });
    }

    // Get calibration metrics from Confidence Calibrator
    const calibrationMetrics = confidenceCalibrator.getCalibrationMetrics();
    const calibrationStatus = confidenceCalibrator.getCalibrationStatus();

    return {
      totalOutcomes,
      totalWins: wins,
      totalLosses: losses,
      overallWinRate,
      overallAvgProfit,
      overallProfitFactor,
      overallSharpeRatio,
      recentWinRate,
      recentAvgProfit,
      recentProfitFactor,
      regimePerformance,
      strategyPerformance,
      learningUpdates: this.stats.learningUpdates,
      lastUpdate: this.stats.lastUpdate,
      learningRate: 0.1, // From ML engine
      calibrationError: calibrationMetrics.expectedCalibrationError,
      calibrationQuality: calibrationMetrics.calibrationQuality,
      calibrationStatus: calibrationStatus.status,
      calibrationProgress: calibrationStatus.progress,
      timestamp: Date.now()
    };
  }

  /**
   * Emit learning update event for UI
   */
  private emitLearningUpdate(type: LearningUpdate['type']): void {
    const metrics = this.getLearningMetrics();

    const update: LearningUpdate = {
      type,
      metrics,
      timestamp: Date.now()
    };

    const event = new CustomEvent('igx-learning-update', { detail: update });
    window.dispatchEvent(event);
  }

  /**
   * Get statistics for monitoring
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      totalOutcomesProcessed: this.stats.totalOutcomesProcessed,
      totalWins: this.stats.totalWins,
      totalLosses: this.stats.totalLosses,
      winRate: this.getOverallWinRate(),
      learningUpdates: this.stats.learningUpdates,
      lastUpdate: this.stats.lastUpdate,
      uptime: Date.now() - this.stats.startTime,
      regimesTracked: this.regimeOutcomes.size,
      strategiesTracked: this.strategyOutcomes.size
    };
  }

  /**
   * Manually feed outcome (for testing)
   */
  manualFeedOutcome(outcome: SignalOutcome): void {
    this.processSignalOutcome(outcome);
  }

  /**
   * Reset (for testing)
   */
  reset(): void {
    this.outcomes = [];
    this.regimeOutcomes.clear();
    this.strategyOutcomes.clear();
    this.stats = {
      totalOutcomesProcessed: 0,
      totalWins: 0,
      totalLosses: 0,
      learningUpdates: 0,
      lastUpdate: 0,
      startTime: Date.now()
    };
    console.log('[Learning Integrator] Reset complete');
  }
}

// Singleton instance
export const continuousLearningIntegrator = new ContinuousLearningIntegrator();

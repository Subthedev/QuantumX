/**
 * STRATEGY ML ENGINE
 * Machine learning system for Delta Engine strategy weights
 *
 * Algorithm: Gradient Descent with Momentum
 * Updates strategy weights based on actual trading outcomes
 *
 * Production-grade quant trading implementation
 */

import type { StrategyPerformance } from '../interfaces/StrategyConsensus';

interface SignalOutcome {
  strategy: string;
  success: boolean; // Win or loss
  profit: number; // Actual profit percentage
  confidence: number; // Original prediction confidence
  timestamp: number;
}

interface MLWeights {
  [strategyName: string]: number;
}

interface MomentumTerms {
  [strategyName: string]: number;
}

export class StrategyMLEngine {
  // ML Hyperparameters (tuned for production)
  private readonly LEARNING_RATE = 0.1; // How fast to adapt
  private readonly MOMENTUM = 0.9; // Smooth gradient descent
  private readonly WEIGHT_DECAY = 0.01; // Regularization (prevent overfitting)
  private readonly MIN_WEIGHT = 0.05; // Minimum 5% weight
  private readonly MAX_WEIGHT = 0.3; // Maximum 30% weight
  private readonly MIN_SIGNALS_FOR_UPDATE = 5; // Need 5 signals before updating

  // Strategy weights (start equal at ~10% each for 10 strategies)
  private weights: MLWeights = {};

  // Momentum terms (for smooth gradient descent)
  private momentum: MomentumTerms = {};

  // Outcome history (for learning)
  private outcomes: SignalOutcome[] = [];

  // Performance tracking per strategy
  private performance: Map<string, StrategyPerformance> = new Map();

  // Update counter
  private updateCount = 0;

  constructor(strategies: string[]) {
    // Initialize with equal weights
    const initialWeight = 1.0 / strategies.length;

    for (const strategy of strategies) {
      this.weights[strategy] = initialWeight;
      this.momentum[strategy] = 0;

      // Initialize performance tracking
      this.performance.set(strategy, {
        name: strategy,
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        currentWeight: initialWeight,
        lastUpdated: Date.now()
      });
    }

    console.log('[Strategy ML] Initialized with equal weights:', initialWeight.toFixed(3));
  }

  /**
   * Get current ML weights
   */
  getWeights(): MLWeights {
    return { ...this.weights };
  }

  /**
   * Get weight for specific strategy
   */
  getWeight(strategy: string): number {
    return this.weights[strategy] || this.MIN_WEIGHT;
  }

  /**
   * Get all performance metrics
   */
  getPerformanceMetrics(): StrategyPerformance[] {
    return Array.from(this.performance.values());
  }

  /**
   * Get performance for specific strategy
   */
  getStrategyPerformance(strategy: string): StrategyPerformance | undefined {
    return this.performance.get(strategy);
  }

  /**
   * Record signal outcome and update ML weights
   */
  recordOutcome(outcome: SignalOutcome): void {
    // Store outcome
    this.outcomes.push(outcome);

    // Keep last 500 outcomes (prevent memory issues)
    if (this.outcomes.length > 500) {
      this.outcomes = this.outcomes.slice(-500);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(outcome);

    // Update ML weights if we have enough data
    const strategyOutcomes = this.outcomes.filter(o => o.strategy === outcome.strategy);
    if (strategyOutcomes.length >= this.MIN_SIGNALS_FOR_UPDATE) {
      this.updateWeights(outcome);
    }

    console.log(
      `[Strategy ML] Outcome recorded: ${outcome.strategy} → ${outcome.success ? 'WIN' : 'LOSS'} ` +
      `(${outcome.profit > 0 ? '+' : ''}${outcome.profit.toFixed(2)}%)`
    );
  }

  /**
   * Update performance metrics for strategy
   */
  private updatePerformanceMetrics(outcome: SignalOutcome): void {
    const perf = this.performance.get(outcome.strategy);
    if (!perf) return;

    // Update counts
    perf.totalSignals++;
    if (outcome.success) {
      perf.winningSignals++;
    } else {
      perf.losingSignals++;
    }

    // Calculate win rate
    perf.winRate = perf.winningSignals / perf.totalSignals;

    // Get recent outcomes for this strategy (last 30)
    const recentOutcomes = this.outcomes
      .filter(o => o.strategy === outcome.strategy)
      .slice(-30);

    // Calculate avg profit/loss
    const profits = recentOutcomes.filter(o => o.success);
    const losses = recentOutcomes.filter(o => !o.success);

    perf.avgProfit = profits.length > 0
      ? profits.reduce((sum, o) => sum + o.profit, 0) / profits.length
      : 0;

    perf.avgLoss = losses.length > 0
      ? Math.abs(losses.reduce((sum, o) => sum + o.profit, 0) / losses.length)
      : 0;

    // Calculate profit factor
    const totalProfit = profits.reduce((sum, o) => sum + o.profit, 0);
    const totalLoss = Math.abs(losses.reduce((sum, o) => sum + o.profit, 0));
    perf.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Calculate Sharpe ratio (simplified: avg return / std dev)
    if (recentOutcomes.length >= 10) {
      const returns = recentOutcomes.map(o => o.profit);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      perf.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }

    perf.currentWeight = this.weights[outcome.strategy];
    perf.lastUpdated = Date.now();

    this.performance.set(outcome.strategy, perf);
  }

  /**
   * Update ML weights using gradient descent with momentum
   */
  private updateWeights(outcome: SignalOutcome): void {
    this.updateCount++;

    // Adaptive learning rate (decreases over time for stability)
    const adaptiveLR = this.LEARNING_RATE / (1 + this.updateCount / 1000);

    const strategy = outcome.strategy;
    const perf = this.performance.get(strategy);
    if (!perf) return;

    // Calculate gradient
    // Positive profit = increase weight, negative = decrease
    // Normalize by expected profit (assume 3% target)
    // Adjust by Sharpe ratio (high Sharpe = more trust)
    const gradient = (outcome.profit / 3.0) * (perf.sharpeRatio > 0 ? 1 : 0.5);

    // Update momentum term
    this.momentum[strategy] =
      this.MOMENTUM * this.momentum[strategy] +
      (1 - this.MOMENTUM) * gradient;

    // Calculate weight update
    const weightUpdate =
      adaptiveLR * this.momentum[strategy] -
      this.WEIGHT_DECAY * (this.weights[strategy] - (1.0 / Object.keys(this.weights).length));

    // Apply update
    this.weights[strategy] += weightUpdate;

    // Clamp weights
    this.weights[strategy] = Math.max(
      this.MIN_WEIGHT,
      Math.min(this.MAX_WEIGHT, this.weights[strategy])
    );

    // Normalize all weights to sum to 1.0
    this.normalizeWeights();

    console.log(
      `[Strategy ML] ${strategy} weight updated: ${this.weights[strategy].toFixed(3)} ` +
      `(WR: ${(perf.winRate * 100).toFixed(1)}%, Sharpe: ${perf.sharpeRatio.toFixed(2)})`
    );
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(): void {
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);

    if (sum > 0) {
      for (const strategy in this.weights) {
        this.weights[strategy] /= sum;
      }
    }
  }

  /**
   * Reset weights to equal (for testing/debugging)
   */
  reset(): void {
    const strategies = Object.keys(this.weights);
    const equalWeight = 1.0 / strategies.length;

    for (const strategy of strategies) {
      this.weights[strategy] = equalWeight;
      this.momentum[strategy] = 0;
    }

    this.outcomes = [];
    this.updateCount = 0;

    console.log('[Strategy ML] Reset to equal weights:', equalWeight.toFixed(3));
  }

  /**
   * Manually set weight for strategy (admin override)
   */
  setWeight(strategy: string, weight: number): void {
    if (!this.weights[strategy]) {
      console.warn(`[Strategy ML] Strategy ${strategy} not found`);
      return;
    }

    // Clamp to valid range
    this.weights[strategy] = Math.max(this.MIN_WEIGHT, Math.min(this.MAX_WEIGHT, weight));

    // Normalize
    this.normalizeWeights();

    console.log(`[Strategy ML] ${strategy} weight manually set to ${this.weights[strategy].toFixed(3)}`);
  }

  /**
   * Get ML statistics (for monitoring)
   */
  getStats() {
    const recentOutcomes = this.outcomes.slice(-50);
    const winningOutcomes = recentOutcomes.filter(o => o.success);

    return {
      updateCount: this.updateCount,
      totalOutcomes: this.outcomes.length,
      currentLearningRate: this.LEARNING_RATE / (1 + this.updateCount / 1000),
      recentWinRate: recentOutcomes.length > 0
        ? winningOutcomes.length / recentOutcomes.length
        : 0,
      recentAvgProfit: recentOutcomes.length > 0
        ? recentOutcomes.reduce((sum, o) => sum + o.profit, 0) / recentOutcomes.length
        : 0,
      weights: this.weights,
      performance: Array.from(this.performance.values())
    };
  }
}

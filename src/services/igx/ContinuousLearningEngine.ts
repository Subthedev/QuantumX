/**
 * CONTINUOUS LEARNING ENGINE
 *
 * Online learning system that improves Alpha model over time
 * Updates weights based on actual signal outcomes
 *
 * Learning Targets:
 * 1. Regime Classification Accuracy - Did regime prediction match outcome?
 * 2. Threshold Effectiveness - Did thresholds produce profitable signals?
 * 3. Risk Model Accuracy - Did risk predictions match actual drawdown?
 *
 * Algorithm: Online Gradient Descent with Momentum
 */

import type { MarketRegime } from './AdaptiveFrequencyController';

interface SignalOutcome {
  signalId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  actualProfit: number; // Percentage
  actualDrawdown: number; // Max drawdown during trade
  duration: number; // ms
  regime: MarketRegime;
  patternStrength: number;
  confidence: number;
  timestamp: number;
}

interface PerformanceMetrics {
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
}

interface RegimePerformance extends PerformanceMetrics {
  regime: MarketRegime;
}

interface LearningWeights {
  regime: {
    [K in MarketRegime]: number; // Weight multiplier for each regime
  };
  thresholds: {
    patternStrength: number; // Multiplier for pattern strength threshold
    consensus: number; // Multiplier for consensus threshold
    riskReward: number; // Multiplier for risk/reward threshold
  };
  risk: {
    drawdownSensitivity: number; // How quickly to react to drawdown
    winRateSensitivity: number; // How much to trust win rate
  };
}

export class ContinuousLearningEngine {
  // Learning parameters
  private readonly LEARNING_RATE = 0.05; // Slower than typical (stability)
  private readonly MOMENTUM = 0.9; // High momentum for smooth updates
  private readonly WEIGHT_DECAY = 0.01; // Prevent overfitting
  private readonly MIN_WEIGHT = 0.5; // Don't go below 50%
  private readonly MAX_WEIGHT = 2.0; // Don't go above 200%

  // Learning weights (start at neutral 1.0)
  private weights: LearningWeights = {
    regime: {
      BULL_TRENDING: 1.0,
      BEAR_TRENDING: 1.0,
      RANGING: 1.0,
      HIGH_VOLATILITY: 1.0,
      LOW_VOLATILITY: 1.0,
      UNKNOWN: 1.0
    },
    thresholds: {
      patternStrength: 1.0,
      consensus: 1.0,
      riskReward: 1.0
    },
    risk: {
      drawdownSensitivity: 1.0,
      winRateSensitivity: 1.0
    }
  };

  // Momentum terms (for smooth gradient descent)
  private momentum: {
    regime: { [K in MarketRegime]: number };
    thresholds: { patternStrength: number; consensus: number; riskReward: number };
  } = {
    regime: {
      BULL_TRENDING: 0,
      BEAR_TRENDING: 0,
      RANGING: 0,
      HIGH_VOLATILITY: 0,
      LOW_VOLATILITY: 0,
      UNKNOWN: 0
    },
    thresholds: {
      patternStrength: 0,
      consensus: 0,
      riskReward: 0
    }
  };

  // Signal outcomes history
  private outcomes: SignalOutcome[] = [];

  // Performance tracking by regime
  private regimePerformance: Map<MarketRegime, RegimePerformance> = new Map();

  // Total update count (for adaptive learning rate)
  private updateCount = 0;

  constructor() {
    // Initialize regime performance tracking
    const regimes: MarketRegime[] = [
      'BULL_TRENDING',
      'BEAR_TRENDING',
      'RANGING',
      'HIGH_VOLATILITY',
      'LOW_VOLATILITY',
      'UNKNOWN'
    ];

    for (const regime of regimes) {
      this.regimePerformance.set(regime, {
        regime,
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0
      });
    }
  }

  /**
   * Record signal outcome and update weights
   */
  recordOutcome(outcome: SignalOutcome) {
    // Store outcome
    this.outcomes.push(outcome);

    // Keep last 1000 outcomes (prevent memory issues)
    if (this.outcomes.length > 1000) {
      this.outcomes = this.outcomes.slice(-1000);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(outcome);

    // Update learning weights
    this.updateWeights(outcome);

    console.log(
      `[Learning Engine] Outcome recorded: ${outcome.symbol} ${outcome.direction} ` +
      `${outcome.actualProfit > 0 ? '+' : ''}${outcome.actualProfit.toFixed(2)}% ` +
      `(${outcome.regime})`
    );
  }

  /**
   * Update performance metrics for regime
   */
  private updatePerformanceMetrics(outcome: SignalOutcome) {
    const metrics = this.regimePerformance.get(outcome.regime)!;

    // Update counts
    metrics.totalSignals++;
    if (outcome.actualProfit > 0) {
      metrics.winningSignals++;
    } else {
      metrics.losingSignals++;
    }

    // Calculate win rate
    metrics.winRate = metrics.winningSignals / metrics.totalSignals;

    // Get recent outcomes for this regime (last 50)
    const recentOutcomes = this.outcomes
      .filter(o => o.regime === outcome.regime)
      .slice(-50);

    // Calculate avg profit/loss
    const profits = recentOutcomes.filter(o => o.actualProfit > 0);
    const losses = recentOutcomes.filter(o => o.actualProfit <= 0);

    metrics.avgProfit = profits.length > 0
      ? profits.reduce((sum, o) => sum + o.actualProfit, 0) / profits.length
      : 0;

    metrics.avgLoss = losses.length > 0
      ? Math.abs(losses.reduce((sum, o) => sum + o.actualProfit, 0) / losses.length)
      : 0;

    // Calculate profit factor
    const totalProfit = profits.reduce((sum, o) => sum + o.actualProfit, 0);
    const totalLoss = Math.abs(losses.reduce((sum, o) => sum + o.actualProfit, 0));
    metrics.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Calculate Sharpe ratio (simplified: avg return / std dev)
    if (recentOutcomes.length >= 10) {
      const returns = recentOutcomes.map(o => o.actualProfit);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      metrics.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }

    // Update max drawdown
    metrics.maxDrawdown = Math.max(metrics.maxDrawdown, outcome.actualDrawdown);
  }

  /**
   * Update learning weights based on outcome
   */
  private updateWeights(outcome: SignalOutcome) {
    this.updateCount++;

    // Adaptive learning rate (decreases over time for stability)
    const adaptiveLR = this.LEARNING_RATE / (1 + this.updateCount / 1000);

    // Update regime weight
    this.updateRegimeWeight(outcome, adaptiveLR);

    // Update threshold weights
    this.updateThresholdWeights(outcome, adaptiveLR);
  }

  /**
   * Update regime weight based on outcome
   */
  private updateRegimeWeight(outcome: SignalOutcome, lr: number) {
    const metrics = this.regimePerformance.get(outcome.regime)!;

    // Calculate gradient (positive profit = increase weight, negative = decrease)
    // Normalize by expected profit (assume 3% target)
    const gradient = (outcome.actualProfit / 3.0) * (metrics.sharpeRatio > 0 ? 1 : 0.5);

    // Update momentum
    this.momentum.regime[outcome.regime] =
      this.MOMENTUM * this.momentum.regime[outcome.regime] +
      (1 - this.MOMENTUM) * gradient;

    // Update weight with momentum and weight decay
    const weightUpdate =
      lr * this.momentum.regime[outcome.regime] -
      this.WEIGHT_DECAY * (this.weights.regime[outcome.regime] - 1.0);

    this.weights.regime[outcome.regime] += weightUpdate;

    // Clamp weight
    this.weights.regime[outcome.regime] = Math.max(
      this.MIN_WEIGHT,
      Math.min(this.MAX_WEIGHT, this.weights.regime[outcome.regime])
    );

    console.log(
      `[Learning Engine] ${outcome.regime} weight: ${this.weights.regime[outcome.regime].toFixed(3)} ` +
      `(win rate: ${(metrics.winRate * 100).toFixed(1)}%, Sharpe: ${metrics.sharpeRatio.toFixed(2)})`
    );
  }

  /**
   * Update threshold weights based on outcome
   */
  private updateThresholdWeights(outcome: SignalOutcome, lr: number) {
    // Pattern strength feedback
    // If high strength pattern failed, increase threshold (be more selective)
    // If low strength pattern succeeded, decrease threshold (be less selective)
    if (outcome.patternStrength > 70 && outcome.actualProfit < 0) {
      const gradient = -0.1; // Increase threshold (make it harder)
      this.momentum.thresholds.patternStrength =
        this.MOMENTUM * this.momentum.thresholds.patternStrength +
        (1 - this.MOMENTUM) * gradient;
      this.weights.thresholds.patternStrength += lr * this.momentum.thresholds.patternStrength;
    } else if (outcome.patternStrength < 50 && outcome.actualProfit > 0) {
      const gradient = 0.1; // Decrease threshold (be less strict)
      this.momentum.thresholds.patternStrength =
        this.MOMENTUM * this.momentum.thresholds.patternStrength +
        (1 - this.MOMENTUM) * gradient;
      this.weights.thresholds.patternStrength += lr * this.momentum.thresholds.patternStrength;
    }

    // Clamp threshold weights
    this.weights.thresholds.patternStrength = Math.max(
      this.MIN_WEIGHT,
      Math.min(this.MAX_WEIGHT, this.weights.thresholds.patternStrength)
    );
  }

  /**
   * Get current learning weights
   */
  getWeights(): LearningWeights {
    return { ...this.weights };
  }

  /**
   * Get performance metrics for regime
   */
  getRegimePerformance(regime: MarketRegime): RegimePerformance | undefined {
    return this.regimePerformance.get(regime);
  }

  /**
   * Get overall performance metrics
   */
  getOverallPerformance(): PerformanceMetrics {
    const allOutcomes = this.outcomes.slice(-100); // Last 100 signals

    if (allOutcomes.length === 0) {
      return {
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0
      };
    }

    const winning = allOutcomes.filter(o => o.actualProfit > 0);
    const losing = allOutcomes.filter(o => o.actualProfit <= 0);

    const avgProfit = winning.length > 0
      ? winning.reduce((sum, o) => sum + o.actualProfit, 0) / winning.length
      : 0;

    const avgLoss = losing.length > 0
      ? Math.abs(losing.reduce((sum, o) => sum + o.actualProfit, 0) / losing.length)
      : 0;

    const totalProfit = winning.reduce((sum, o) => sum + o.actualProfit, 0);
    const totalLoss = Math.abs(losing.reduce((sum, o) => sum + o.actualProfit, 0));

    // Sharpe ratio
    const returns = allOutcomes.map(o => o.actualProfit);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      totalSignals: allOutcomes.length,
      winningSignals: winning.length,
      losingSignals: losing.length,
      winRate: winning.length / allOutcomes.length,
      avgProfit,
      avgLoss,
      sharpeRatio,
      maxDrawdown: Math.max(...allOutcomes.map(o => o.actualDrawdown)),
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0
    };
  }

  /**
   * Get learning statistics
   */
  getStats() {
    return {
      updateCount: this.updateCount,
      totalOutcomes: this.outcomes.length,
      currentLearningRate: this.LEARNING_RATE / (1 + this.updateCount / 1000),
      weights: this.weights,
      overall: this.getOverallPerformance(),
      byRegime: Array.from(this.regimePerformance.values())
    };
  }

  /**
   * Reset learning (for testing/debugging)
   */
  reset() {
    this.outcomes = [];
    this.updateCount = 0;
    this.weights = {
      regime: {
        BULL_TRENDING: 1.0,
        BEAR_TRENDING: 1.0,
        RANGING: 1.0,
        HIGH_VOLATILITY: 1.0,
        LOW_VOLATILITY: 1.0,
        UNKNOWN: 1.0
      },
      thresholds: {
        patternStrength: 1.0,
        consensus: 1.0,
        riskReward: 1.0
      },
      risk: {
        drawdownSensitivity: 1.0,
        winRateSensitivity: 1.0
      }
    };
    this.momentum = {
      regime: {
        BULL_TRENDING: 0,
        BEAR_TRENDING: 0,
        RANGING: 0,
        HIGH_VOLATILITY: 0,
        LOW_VOLATILITY: 0,
        UNKNOWN: 0
      },
      thresholds: {
        patternStrength: 0,
        consensus: 0,
        riskReward: 0
      }
    };
  }
}

// Singleton instance
export const continuousLearningEngine = new ContinuousLearningEngine();

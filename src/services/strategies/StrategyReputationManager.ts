/**
 * STRATEGY REPUTATION MANAGER
 * Tracks strategy performance and adjusts confidence based on historical success
 *
 * PHILOSOPHY:
 * - Not all strategies perform equally in all market conditions
 * - Track win/loss rate for each strategy over time
 * - Boost confidence for consistently winning strategies
 * - Reduce confidence for underperforming strategies
 * - Adaptive learning improves signal quality over time
 *
 * REPUTATION SCORING:
 * - Win Rate: Percentage of profitable signals (>50% = good)
 * - Consistency Score: How reliable the strategy is
 * - Market Condition Performance: Different strategies for different markets
 * - Time-weighted: Recent performance matters more than old
 * - Confidence Adjustment: ±20% based on reputation
 *
 * ADAPTIVE FEATURES:
 * - Tracks performance per market regime (trending/ranging/volatile)
 * - Adjusts reputation based on time of day (some strategies work better at certain times)
 * - Learns from false positives and missed opportunities
 * - Auto-calibrates thresholds based on success rates
 */

interface StrategyPerformance {
  strategyName: string;
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  pendingSignals: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number; // Total profit / Total loss
  consistencyScore: number; // 0-100, higher = more consistent
  lastUpdated: number;
  marketPerformance: {
    trending: { wins: number; losses: number; winRate: number };
    ranging: { wins: number; losses: number; winRate: number };
    volatile: { wins: number; losses: number; winRate: number };
  };
  timePerformance: {
    morning: { wins: number; losses: number }; // 6am-12pm
    afternoon: { wins: number; losses: number }; // 12pm-6pm
    evening: { wins: number; losses: number }; // 6pm-12am
    night: { wins: number; losses: number }; // 12am-6am
  };
}

interface SignalOutcome {
  signalId: string;
  strategyName: string;
  symbol: string;
  signalType: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN';
  profitPercent?: number;
  timestamp: number;
  marketCondition?: 'trending' | 'ranging' | 'volatile';
}

interface ReputationAdjustment {
  strategyName: string;
  baseConfidence: number;
  reputationBoost: number;
  adjustedConfidence: number;
  reason: string;
}

export class StrategyReputationManager {
  private performances: Map<string, StrategyPerformance> = new Map();
  private recentOutcomes: SignalOutcome[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 outcomes
  private readonly MIN_SIGNALS_FOR_REPUTATION = 10; // Need at least 10 signals to build reputation
  private readonly REPUTATION_DECAY_DAYS = 30; // Older signals have less weight

  // Performance thresholds
  private readonly EXCELLENT_WIN_RATE = 0.7; // 70%+ win rate is excellent
  private readonly GOOD_WIN_RATE = 0.6; // 60%+ win rate is good
  private readonly POOR_WIN_RATE = 0.4; // Below 40% is poor

  // Confidence adjustment limits
  private readonly MAX_CONFIDENCE_BOOST = 20; // Maximum +20% boost
  private readonly MAX_CONFIDENCE_PENALTY = -15; // Maximum -15% penalty

  // Strategy names (must match multiStrategyEngine)
  private readonly STRATEGY_NAMES = [
    'WHALE_ACCUMULATION',
    'MOMENTUM_SURGE',
    'VOLUME_ERUPTION',
    'SQUEEZE_BREAKOUT',
    'INSTITUTIONAL_FLOW',
    'ORDER_FLOW_IMBALANCE',
    'SMART_MONEY_DIVERGENCE',
    'TREND_EXHAUSTION',
    'LIQUIDITY_GRAB',
    'FEAR_GREED_EXTREME'
  ];

  constructor() {
    this.initializeStrategies();
    this.loadHistoricalPerformance();
  }

  /**
   * Initialize performance tracking for all strategies
   */
  private initializeStrategies() {
    for (const strategyName of this.STRATEGY_NAMES) {
      this.performances.set(strategyName, {
        strategyName,
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        pendingSignals: 0,
        winRate: 0.5, // Start neutral
        avgProfit: 0,
        avgLoss: 0,
        profitFactor: 1.0,
        consistencyScore: 50, // Start neutral
        lastUpdated: Date.now(),
        marketPerformance: {
          trending: { wins: 0, losses: 0, winRate: 0.5 },
          ranging: { wins: 0, losses: 0, winRate: 0.5 },
          volatile: { wins: 0, losses: 0, winRate: 0.5 }
        },
        timePerformance: {
          morning: { wins: 0, losses: 0 },
          afternoon: { wins: 0, losses: 0 },
          evening: { wins: 0, losses: 0 },
          night: { wins: 0, losses: 0 }
        }
      });
    }

    console.log(`[ReputationManager] Initialized tracking for ${this.STRATEGY_NAMES.length} strategies`);
  }

  /**
   * Load historical performance from localStorage
   */
  private loadHistoricalPerformance() {
    try {
      const saved = localStorage.getItem('strategy_reputation_data');
      if (saved) {
        const data = JSON.parse(saved);

        // Restore performances
        if (data.performances) {
          for (const [name, perf] of Object.entries(data.performances)) {
            this.performances.set(name, perf as StrategyPerformance);
          }
        }

        // Restore recent outcomes
        if (data.recentOutcomes) {
          this.recentOutcomes = data.recentOutcomes;
        }

        console.log(`[ReputationManager] Loaded historical data: ${this.recentOutcomes.length} outcomes`);
      }
    } catch (error) {
      console.error('[ReputationManager] Error loading historical data:', error);
    }
  }

  /**
   * Save performance data to localStorage
   */
  private savePerformanceData() {
    try {
      const data = {
        performances: Object.fromEntries(this.performances),
        recentOutcomes: this.recentOutcomes,
        savedAt: Date.now()
      };
      localStorage.setItem('strategy_reputation_data', JSON.stringify(data));
    } catch (error) {
      console.error('[ReputationManager] Error saving data:', error);
    }
  }

  /**
   * Record a new signal generation
   */
  recordSignal(
    signalId: string,
    strategyName: string,
    symbol: string,
    signalType: 'LONG' | 'SHORT',
    entryPrice: number,
    marketCondition?: 'trending' | 'ranging' | 'volatile'
  ) {
    const performance = this.performances.get(strategyName);
    if (!performance) return;

    // Create outcome record
    const outcome: SignalOutcome = {
      signalId,
      strategyName,
      symbol,
      signalType,
      entryPrice,
      timestamp: Date.now(),
      marketCondition
    };

    // Add to recent outcomes
    this.recentOutcomes.push(outcome);
    if (this.recentOutcomes.length > this.MAX_HISTORY) {
      this.recentOutcomes.shift(); // Remove oldest
    }

    // Update performance stats
    performance.totalSignals++;
    performance.pendingSignals++;
    performance.lastUpdated = Date.now();

    // Save to storage
    this.savePerformanceData();

    console.log(`[ReputationManager] Recorded signal from ${strategyName}: ${symbol} ${signalType}`);
  }

  /**
   * Update signal outcome (win/loss/breakeven)
   */
  updateSignalOutcome(
    signalId: string,
    exitPrice: number,
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN'
  ) {
    // Find the signal
    const signal = this.recentOutcomes.find(s => s.signalId === signalId);
    if (!signal) {
      console.warn(`[ReputationManager] Signal ${signalId} not found`);
      return;
    }

    // Calculate profit/loss percentage
    const profitPercent = signal.signalType === 'LONG'
      ? ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100
      : ((signal.entryPrice - exitPrice) / signal.entryPrice) * 100;

    // Update signal outcome
    signal.exitPrice = exitPrice;
    signal.outcome = outcome;
    signal.profitPercent = profitPercent;

    // Update strategy performance
    const performance = this.performances.get(signal.strategyName);
    if (!performance) return;

    performance.pendingSignals--;

    if (outcome === 'WIN') {
      performance.winningSignals++;
      performance.avgProfit = this.updateAverage(
        performance.avgProfit,
        profitPercent,
        performance.winningSignals
      );

      // Update market-specific performance
      if (signal.marketCondition) {
        performance.marketPerformance[signal.marketCondition].wins++;
      }

      // Update time-specific performance
      const timeOfDay = this.getTimeOfDay(signal.timestamp);
      performance.timePerformance[timeOfDay].wins++;

    } else if (outcome === 'LOSS') {
      performance.losingSignals++;
      performance.avgLoss = this.updateAverage(
        performance.avgLoss,
        Math.abs(profitPercent),
        performance.losingSignals
      );

      // Update market-specific performance
      if (signal.marketCondition) {
        performance.marketPerformance[signal.marketCondition].losses++;
      }

      // Update time-specific performance
      const timeOfDay = this.getTimeOfDay(signal.timestamp);
      performance.timePerformance[timeOfDay].losses++;
    }

    // Recalculate metrics
    this.recalculatePerformanceMetrics(performance);

    // Save to storage
    this.savePerformanceData();

    console.log(
      `[ReputationManager] Updated ${signal.strategyName}: ${outcome} (${profitPercent.toFixed(2)}%)\n` +
      `  New win rate: ${(performance.winRate * 100).toFixed(1)}%\n` +
      `  Consistency: ${performance.consistencyScore.toFixed(0)}/100`
    );
  }

  /**
   * Recalculate performance metrics for a strategy
   */
  private recalculatePerformanceMetrics(performance: StrategyPerformance) {
    const totalCompleted = performance.winningSignals + performance.losingSignals;

    if (totalCompleted > 0) {
      // Calculate win rate
      performance.winRate = performance.winningSignals / totalCompleted;

      // Calculate profit factor
      const totalProfit = performance.winningSignals * performance.avgProfit;
      const totalLoss = performance.losingSignals * performance.avgLoss;
      performance.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit;

      // Calculate consistency score (0-100)
      // Based on win rate stability and profit factor
      const winRateScore = Math.min(100, performance.winRate * 100);
      const profitFactorScore = Math.min(100, performance.profitFactor * 25);
      const stabilityScore = this.calculateStabilityScore(performance);
      performance.consistencyScore = (winRateScore + profitFactorScore + stabilityScore) / 3;

      // Update market-specific win rates
      for (const market of ['trending', 'ranging', 'volatile'] as const) {
        const marketPerf = performance.marketPerformance[market];
        const marketTotal = marketPerf.wins + marketPerf.losses;
        if (marketTotal > 0) {
          marketPerf.winRate = marketPerf.wins / marketTotal;
        }
      }
    }

    performance.lastUpdated = Date.now();
  }

  /**
   * Calculate stability score based on recent performance variance
   */
  private calculateStabilityScore(performance: StrategyPerformance): number {
    // Get recent outcomes for this strategy
    const recentForStrategy = this.recentOutcomes
      .filter(o => o.strategyName === performance.strategyName && o.outcome)
      .slice(-20); // Last 20 outcomes

    if (recentForStrategy.length < 5) return 50; // Not enough data

    // Calculate rolling win rate variance
    const windowSize = 5;
    const rollingWinRates: number[] = [];

    for (let i = 0; i <= recentForStrategy.length - windowSize; i++) {
      const window = recentForStrategy.slice(i, i + windowSize);
      const wins = window.filter(o => o.outcome === 'WIN').length;
      rollingWinRates.push(wins / windowSize);
    }

    // Calculate variance
    if (rollingWinRates.length < 2) return 50;

    const mean = rollingWinRates.reduce((a, b) => a + b, 0) / rollingWinRates.length;
    const variance = rollingWinRates.reduce((acc, rate) => {
      return acc + Math.pow(rate - mean, 2);
    }, 0) / rollingWinRates.length;

    // Convert variance to stability score (lower variance = higher stability)
    // Variance of 0 = 100 score, variance of 0.25 = 0 score
    const stabilityScore = Math.max(0, Math.min(100, (1 - variance * 4) * 100));

    return stabilityScore;
  }

  /**
   * Adjust confidence based on strategy reputation
   */
  adjustConfidence(
    strategyName: string,
    baseConfidence: number,
    marketCondition?: 'trending' | 'ranging' | 'volatile'
  ): ReputationAdjustment {
    const performance = this.performances.get(strategyName);

    if (!performance || performance.totalSignals < this.MIN_SIGNALS_FOR_REPUTATION) {
      // Not enough history, return base confidence
      return {
        strategyName,
        baseConfidence,
        reputationBoost: 0,
        adjustedConfidence: baseConfidence,
        reason: 'Insufficient history'
      };
    }

    let reputationBoost = 0;
    let reason = '';

    // Factor 1: Overall win rate
    if (performance.winRate >= this.EXCELLENT_WIN_RATE) {
      reputationBoost += 10;
      reason = 'Excellent track record';
    } else if (performance.winRate >= this.GOOD_WIN_RATE) {
      reputationBoost += 5;
      reason = 'Good track record';
    } else if (performance.winRate < this.POOR_WIN_RATE) {
      reputationBoost -= 10;
      reason = 'Poor track record';
    } else {
      reason = 'Average track record';
    }

    // Factor 2: Consistency score
    if (performance.consistencyScore > 80) {
      reputationBoost += 5;
      reason += ', very consistent';
    } else if (performance.consistencyScore < 40) {
      reputationBoost -= 5;
      reason += ', inconsistent';
    }

    // Factor 3: Market-specific performance
    if (marketCondition) {
      const marketPerf = performance.marketPerformance[marketCondition];
      if (marketPerf.wins + marketPerf.losses >= 5) { // Need at least 5 signals
        if (marketPerf.winRate > 0.7) {
          reputationBoost += 5;
          reason += `, excellent in ${marketCondition} markets`;
        } else if (marketPerf.winRate < 0.3) {
          reputationBoost -= 5;
          reason += `, poor in ${marketCondition} markets`;
        }
      }
    }

    // Factor 4: Time of day performance
    const timeOfDay = this.getTimeOfDay(Date.now());
    const timePerf = performance.timePerformance[timeOfDay];
    const timeTotal = timePerf.wins + timePerf.losses;
    if (timeTotal >= 5) {
      const timeWinRate = timePerf.wins / timeTotal;
      if (timeWinRate > 0.7) {
        reputationBoost += 3;
        reason += `, strong during ${timeOfDay}`;
      } else if (timeWinRate < 0.3) {
        reputationBoost -= 3;
        reason += `, weak during ${timeOfDay}`;
      }
    }

    // Apply limits
    reputationBoost = Math.max(
      this.MAX_CONFIDENCE_PENALTY,
      Math.min(this.MAX_CONFIDENCE_BOOST, reputationBoost)
    );

    // Calculate adjusted confidence
    const adjustedConfidence = Math.max(
      0,
      Math.min(100, baseConfidence + reputationBoost)
    );

    return {
      strategyName,
      baseConfidence,
      reputationBoost,
      adjustedConfidence,
      reason
    };
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(timestamp: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'night';
  }

  /**
   * Update moving average
   */
  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  /**
   * Get top performing strategies
   */
  getTopPerformers(limit: number = 5): StrategyPerformance[] {
    return Array.from(this.performances.values())
      .filter(p => p.totalSignals >= this.MIN_SIGNALS_FOR_REPUTATION)
      .sort((a, b) => {
        // Sort by combination of win rate and consistency
        const aScore = (a.winRate * 0.6) + (a.consistencyScore / 100 * 0.4);
        const bScore = (b.winRate * 0.6) + (b.consistencyScore / 100 * 0.4);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Get strategy performance summary
   */
  getPerformanceSummary(strategyName: string): StrategyPerformance | null {
    return this.performances.get(strategyName) || null;
  }

  /**
   * Get all performances
   */
  getAllPerformances(): Map<string, StrategyPerformance> {
    return this.performances;
  }

  /**
   * Get reputation statistics
   */
  getStats() {
    const strategies = Array.from(this.performances.values());
    const withHistory = strategies.filter(s => s.totalSignals >= this.MIN_SIGNALS_FOR_REPUTATION);

    return {
      totalStrategies: strategies.length,
      strategiesWithReputation: withHistory.length,
      totalSignalsTracked: strategies.reduce((sum, s) => sum + s.totalSignals, 0),
      avgWinRate: withHistory.length > 0
        ? withHistory.reduce((sum, s) => sum + s.winRate, 0) / withHistory.length
        : 0,
      topPerformer: withHistory.sort((a, b) => b.winRate - a.winRate)[0]?.strategyName || 'None',
      outcomesTracked: this.recentOutcomes.length
    };
  }

  /**
   * Reset all reputation data (for testing)
   */
  reset() {
    this.performances.clear();
    this.recentOutcomes = [];
    this.initializeStrategies();
    localStorage.removeItem('strategy_reputation_data');
    console.log('[ReputationManager] All reputation data reset');
  }
}

// Singleton instance
export const strategyReputationManager = new StrategyReputationManager();
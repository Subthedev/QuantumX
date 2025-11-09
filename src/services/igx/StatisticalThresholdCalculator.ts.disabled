/**
 * Statistical Threshold Calculator
 * Advanced mathematical models for dynamic threshold calculation
 */

import { marketConditionAnalyzer } from './MarketConditionAnalyzer';
import type {
  DynamicThreshold,
  ThresholdSet,
  ThresholdWindow,
  MarketRegime,
  TimeSeriesDataPoint
} from '@/types/igx-enhanced';

export class StatisticalThresholdCalculator {
  // Historical data storage for rolling windows
  private patternStrengthHistory: TimeSeriesDataPoint[] = [];
  private consensusHistory: TimeSeriesDataPoint[] = [];
  private riskRewardHistory: TimeSeriesDataPoint[] = [];
  private liquidityHistory: TimeSeriesDataPoint[] = [];
  private qualityHistory: TimeSeriesDataPoint[] = [];

  // Base thresholds (starting point before adjustments)
  private readonly BASE_THRESHOLDS = {
    patternStrength: 60,
    consensusThreshold: 0.55,
    riskReward: 2.0,
    liquidityMin: 50,
    dataQualityMin: 60
  };

  /**
   * Calculate dynamic thresholds based on market conditions and goal progress
   */
  calculateThresholds(params: {
    marketCompositeScore: number;
    regime: MarketRegime;
    goalProgressPercent: number;      // How far behind/ahead of monthly goal (-50 to +50)
    daysRemainingInMonth: number;
  }): ThresholdSet {
    const { marketCompositeScore, regime, goalProgressPercent, daysRemainingInMonth } = params;

    // Calculate each threshold dynamically
    const patternStrength = this.calculateDynamicThreshold(
      'patternStrength',
      this.BASE_THRESHOLDS.patternStrength,
      this.patternStrengthHistory,
      marketCompositeScore,
      regime,
      goalProgressPercent,
      daysRemainingInMonth
    );

    const consensusThreshold = this.calculateDynamicThreshold(
      'consensusThreshold',
      this.BASE_THRESHOLDS.consensusThreshold * 100, // Scale to 0-100 for calculation
      this.consensusHistory,
      marketCompositeScore,
      regime,
      goalProgressPercent,
      daysRemainingInMonth
    );

    const riskReward = this.calculateDynamicThreshold(
      'riskReward',
      this.BASE_THRESHOLDS.riskReward * 50, // Scale to 0-100 for calculation
      this.riskRewardHistory,
      marketCompositeScore,
      regime,
      goalProgressPercent,
      daysRemainingInMonth
    );

    const liquidityMin = this.calculateDynamicThreshold(
      'liquidityMin',
      this.BASE_THRESHOLDS.liquidityMin,
      this.liquidityHistory,
      marketCompositeScore,
      regime,
      goalProgressPercent,
      daysRemainingInMonth
    );

    const dataQualityMin = this.calculateDynamicThreshold(
      'dataQualityMin',
      this.BASE_THRESHOLDS.dataQualityMin,
      this.qualityHistory,
      marketCompositeScore,
      regime,
      goalProgressPercent,
      daysRemainingInMonth
    );

    const thresholdSet: ThresholdSet = {
      patternStrength,
      consensusThreshold,
      riskReward,
      liquidityMin,
      dataQualityMin,
      timestamp: Date.now()
    };

    // Store current values in history for future calculations
    this.storeInHistory(thresholdSet);

    return thresholdSet;
  }

  /**
   * Calculate a single dynamic threshold with all adjustment factors
   */
  private calculateDynamicThreshold(
    metricName: string,
    baseValue: number,
    history: TimeSeriesDataPoint[],
    marketScore: number,
    regime: MarketRegime,
    goalProgress: number,
    daysRemaining: number
  ): DynamicThreshold {
    // Calculate rolling window statistics
    const windows = this.calculateWindows(history);

    // Calculate adjustment multipliers
    const marketMultiplier = this.calculateMarketMultiplier(marketScore, regime);
    const regimeMultiplier = this.calculateRegimeMultiplier(regime);
    const goalMultiplier = this.calculateGoalMultiplier(goalProgress, daysRemaining);

    // Z-Score based adjustment using medium-term window (30 days)
    const stdDevMultiplier = windows.medium.sampleSize > 10
      ? this.calculateStdDevAdjustment(baseValue, windows.medium)
      : 0;

    // Calculate adjusted value
    const adjustedValue = baseValue * marketMultiplier;
    const finalValue = adjustedValue * regimeMultiplier * goalMultiplier * (1 + stdDevMultiplier);

    return {
      metric: metricName,
      baseValue,
      adjustedValue,
      stdDevMultiplier,
      marketConditionMultiplier: marketMultiplier,
      regimeMultiplier,
      goalProgressMultiplier: goalMultiplier,
      finalValue: Math.round(finalValue * 100) / 100,
      windows,
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate market condition multiplier
   * Higher market score = loosen thresholds (more opportunities)
   * Lower market score = tighten thresholds (be selective)
   */
  private calculateMarketMultiplier(marketScore: number, regime: MarketRegime): number {
    // Market score 0-100, normalize around 50
    const deviation = (marketScore - 50) / 50; // -1 to +1

    // Favorable markets (>60): reduce thresholds by up to 15%
    // Unfavorable markets (<40): increase thresholds by up to 15%
    const multiplier = 1 - (deviation * 0.15);

    return Math.max(0.80, Math.min(1.20, multiplier));
  }

  /**
   * Calculate regime-specific multiplier
   */
  private calculateRegimeMultiplier(regime: MarketRegime): number {
    switch (regime) {
      case 'BULL_TRENDING':
        return 0.90; // Lower thresholds in bull markets (more signals)
      case 'BEAR_TRENDING':
        return 1.10; // Higher thresholds in bear markets (be selective)
      case 'HIGH_VOLATILITY':
        return 1.15; // Much higher thresholds in volatility (risk management)
      case 'LOW_VOLATILITY':
        return 0.95; // Slightly lower in low vol (safe to take more trades)
      case 'RANGING':
        return 1.00; // Neutral in ranging markets
      default:
        return 1.00;
    }
  }

  /**
   * Calculate goal progress multiplier
   * Behind goal = lower thresholds (generate more signals)
   * Ahead of goal = higher thresholds (lock in profits)
   */
  private calculateGoalMultiplier(goalProgress: number, daysRemaining: number): number {
    // goalProgress: negative = behind, positive = ahead
    // Normalize to multiplier

    // Behind by >10% with <15 days left = AGGRESSIVE (0.75x thresholds)
    if (goalProgress < -10 && daysRemaining < 15) {
      return 0.75;
    }

    // Behind by >5% = MODERATE (0.85x thresholds)
    if (goalProgress < -5) {
      return 0.85;
    }

    // Behind by <5% = SLIGHT (0.95x thresholds)
    if (goalProgress < 0) {
      return 0.95;
    }

    // Ahead by >15% = VERY CONSERVATIVE (1.20x thresholds)
    if (goalProgress > 15) {
      return 1.20;
    }

    // Ahead by >5% = CONSERVATIVE (1.10x thresholds)
    if (goalProgress > 5) {
      return 1.10;
    }

    // On track = NEUTRAL (1.0x thresholds)
    return 1.00;
  }

  /**
   * Calculate standard deviation adjustment
   * Uses Bollinger Band-style logic
   */
  private calculateStdDevAdjustment(currentValue: number, window: ThresholdWindow): number {
    if (window.sampleSize < 10) return 0;

    // Z-score: how many std devs from mean
    const zScore = (currentValue - window.mean) / window.stdDev;

    // If current value is >2 std devs above mean, we're being too strict
    // If current value is >2 std devs below mean, we're being too loose

    // Return adjustment factor
    if (Math.abs(zScore) < 1) {
      return 0; // Within normal range
    }

    // Gradually adjust back toward mean
    return -zScore * 0.1; // -20% to +20% max adjustment
  }

  /**
   * Calculate rolling window statistics
   */
  private calculateWindows(history: TimeSeriesDataPoint[]): {
    short: ThresholdWindow;
    medium: ThresholdWindow;
    long: ThresholdWindow;
  } {
    const now = Date.now();
    const DAY = 86400000;

    return {
      short: this.calculateWindow(history, now - 7 * DAY, '7d'),
      medium: this.calculateWindow(history, now - 30 * DAY, '30d'),
      long: this.calculateWindow(history, now - 90 * DAY, '90d')
    };
  }

  /**
   * Calculate statistics for a specific time window
   */
  private calculateWindow(
    history: TimeSeriesDataPoint[],
    startTime: number,
    period: '7d' | '30d' | '90d'
  ): ThresholdWindow {
    const data = history.filter(d => d.timestamp >= startTime).map(d => d.value);

    if (data.length === 0) {
      return {
        period,
        mean: 0,
        median: 0,
        stdDev: 0,
        percentile25: 0,
        percentile50: 0,
        percentile75: 0,
        percentile90: 0,
        sampleSize: 0
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      period,
      mean,
      median: this.percentile(sorted, 50),
      stdDev,
      percentile25: this.percentile(sorted, 25),
      percentile50: this.percentile(sorted, 50),
      percentile75: this.percentile(sorted, 75),
      percentile90: this.percentile(sorted, 90),
      sampleSize: data.length
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;

    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sorted.length) return sorted[sorted.length - 1];

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Store current threshold values in history
   */
  private storeInHistory(thresholds: ThresholdSet) {
    const now = Date.now();

    this.patternStrengthHistory.push({ timestamp: now, value: thresholds.patternStrength.finalValue });
    this.consensusHistory.push({ timestamp: now, value: thresholds.consensusThreshold.finalValue });
    this.riskRewardHistory.push({ timestamp: now, value: thresholds.riskReward.finalValue });
    this.liquidityHistory.push({ timestamp: now, value: thresholds.liquidityMin.finalValue });
    this.qualityHistory.push({ timestamp: now, value: thresholds.dataQualityMin.finalValue });

    // Keep only last 90 days of history
    const cutoff = now - (90 * 86400000);
    this.patternStrengthHistory = this.patternStrengthHistory.filter(d => d.timestamp >= cutoff);
    this.consensusHistory = this.consensusHistory.filter(d => d.timestamp >= cutoff);
    this.riskRewardHistory = this.riskRewardHistory.filter(d => d.timestamp >= cutoff);
    this.liquidityHistory = this.liquidityHistory.filter(d => d.timestamp >= cutoff);
    this.qualityHistory = this.qualityHistory.filter(d => d.timestamp >= cutoff);
  }

  /**
   * Get detailed threshold breakdown for logging
   */
  getThresholdBreakdown(thresholdSet: ThresholdSet): string {
    const breakdown = (dt: DynamicThreshold) => `
    ${dt.metric}:
      Base:         ${dt.baseValue.toFixed(2)}
      Market Adj:   ${dt.baseValue.toFixed(2)} × ${dt.marketConditionMultiplier.toFixed(3)} = ${dt.adjustedValue.toFixed(2)}
      Regime Adj:   × ${dt.regimeMultiplier.toFixed(3)}
      Goal Adj:     × ${dt.goalProgressMultiplier.toFixed(3)}
      StdDev Adj:   × ${(1 + dt.stdDevMultiplier).toFixed(3)}
      ───────────────────────────────
      FINAL:        ${dt.finalValue.toFixed(2)}

      Windows:
        7d:  μ=${dt.windows.short.mean.toFixed(2)} σ=${dt.windows.short.stdDev.toFixed(2)} n=${dt.windows.short.sampleSize}
        30d: μ=${dt.windows.medium.mean.toFixed(2)} σ=${dt.windows.medium.stdDev.toFixed(2)} n=${dt.windows.medium.sampleSize}
        90d: μ=${dt.windows.long.mean.toFixed(2)} σ=${dt.windows.long.stdDev.toFixed(2)} n=${dt.windows.long.sampleSize}
    `;

    return `
Statistical Threshold Calculation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${breakdown(thresholdSet.patternStrength)}
${breakdown(thresholdSet.consensusThreshold)}
${breakdown(thresholdSet.riskReward)}
${breakdown(thresholdSet.liquidityMin)}
${breakdown(thresholdSet.dataQualityMin)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Clear all historical data (for testing or reset)
   */
  clearHistory() {
    this.patternStrengthHistory = [];
    this.consensusHistory = [];
    this.riskRewardHistory = [];
    this.liquidityHistory = [];
    this.qualityHistory = [];
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const statisticalThresholdCalculator = new StatisticalThresholdCalculator();

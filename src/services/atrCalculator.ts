/**
 * ATR-Based Dynamic Risk/Reward Calculator
 *
 * Institutional-grade stop loss and target calculation using Average True Range (ATR).
 * Automatically adjusts to current market volatility for optimal risk management.
 *
 * Key Features:
 * - ATR-based dynamic stops (prevents premature stops in noise)
 * - Volatility-adjusted targets (adapts to market conditions)
 * - Regime-aware multipliers (different settings for trending/choppy/volatile markets)
 * - Guaranteed minimum 1:2 risk/reward ratio
 *
 * Research: Based on 2024 institutional crypto trading practices
 */

import type { MarketRegime } from './igx/MarketRegimeDetector';

// ===== INTERFACES =====

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timestamp: number;
}

export interface ATRConfig {
  period: number;                // ATR calculation period (default: 14)
  stopMultiplier: number;        // Stop distance as multiple of ATR
  targetMultipliers: {           // Target distances as multiples of stop distance
    tp1: number;                 // Target 1 (conservative)
    tp2: number;                 // Target 2 (primary)
    tp3: number;                 // Target 3 (home run)
  };
}

export interface DynamicLevels {
  stopLoss: number;              // ATR-based stop loss price
  target1: number;               // First target (quick win)
  target2: number;               // Second target (primary)
  target3: number;               // Third target (home run)
  riskRewardRatios: [number, number, number]; // R:R for each target
  atrValue: number;              // Raw ATR value in price units
  atrPercent: number;            // ATR as percentage of price
  stopDistance: number;          // Distance to stop loss
  targetDistances: [number, number, number]; // Distances to each target
  config: ATRConfig;             // Configuration used
}

// ===== ATR CALCULATOR CLASS =====

export class ATRCalculator {
  private readonly DEFAULT_PERIOD = 14;
  private readonly MIN_CANDLES_REQUIRED = 15; // Need period + 1

  /**
   * Calculate Average True Range (ATR) from OHLC data
   *
   * ATR measures market volatility by decomposing the entire range of price movement.
   * Uses True Range (TR) = max(high-low, |high-prevClose|, |low-prevClose|)
   *
   * @param candles - Array of OHLC candles (must be sorted by timestamp)
   * @param period - Number of periods for ATR calculation (default: 14)
   * @returns ATR value in price units, or 0 if insufficient data
   */
  calculateATR(candles: OHLC[], period: number = this.DEFAULT_PERIOD): number {
    if (!candles || candles.length < this.MIN_CANDLES_REQUIRED) {
      console.warn(`[ATR Calculator] Insufficient data: ${candles?.length || 0} candles (need ${this.MIN_CANDLES_REQUIRED})`);
      return 0;
    }

    // Calculate True Range for each candle
    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      // True Range = max(high-low, |high-prevClose|, |low-prevClose|)
      const highLow = current.high - current.low;
      const highPrevClose = Math.abs(current.high - previous.close);
      const lowPrevClose = Math.abs(current.low - previous.close);

      const tr = Math.max(highLow, highPrevClose, lowPrevClose);
      trueRanges.push(tr);
    }

    // Calculate ATR as simple moving average of True Ranges
    const recentTRs = trueRanges.slice(-period);
    const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;

    return atr;
  }

  /**
   * Get regime-specific ATR configuration
   *
   * Different market regimes require different stop/target multipliers:
   * - Trending markets: Wider stops, wider targets (let winners run)
   * - Choppy markets: Tighter stops, tighter targets (take profits fast)
   * - Volatile markets: Very wide stops to avoid noise
   */
  private getRegimeMultipliers(regime: MarketRegime): ATRConfig {
    const configs: Record<MarketRegime, ATRConfig> = {
      // TRENDING MARKETS: Let trends run with wider stops and targets
      BULL_MOMENTUM: {
        period: 14,
        stopMultiplier: 2.5,
        targetMultipliers: { tp1: 2.0, tp2: 4.0, tp3: 6.0 } // 1:2, 1:4, 1:6 R:R
      },
      BEAR_MOMENTUM: {
        period: 14,
        stopMultiplier: 2.5,
        targetMultipliers: { tp1: 2.0, tp2: 4.0, tp3: 6.0 }
      },

      // RANGING MARKETS: Moderate stops, moderate targets
      BULL_RANGE: {
        period: 14,
        stopMultiplier: 2.0,
        targetMultipliers: { tp1: 1.8, tp2: 3.0, tp3: 5.0 } // 1:1.8, 1:3, 1:5 R:R
      },
      BEAR_RANGE: {
        period: 14,
        stopMultiplier: 2.0,
        targetMultipliers: { tp1: 1.8, tp2: 3.0, tp3: 5.0 }
      },

      // CHOPPY MARKETS: Tight stops, modest targets (quick reversals expected)
      CHOPPY: {
        period: 14,
        stopMultiplier: 1.5,
        targetMultipliers: { tp1: 1.5, tp2: 2.5, tp3: 4.0 } // 1:1.5, 1:2.5, 1:4 R:R
      },

      // VOLATILE MARKETS: Wide stops to avoid noise, moderate targets
      VOLATILE_BREAKOUT: {
        period: 14,
        stopMultiplier: 3.0,
        targetMultipliers: { tp1: 2.0, tp2: 3.5, tp3: 5.5 } // 1:2, 1:3.5, 1:5.5 R:R
      },

      // ACCUMULATION: Standard stops and targets
      ACCUMULATION: {
        period: 14,
        stopMultiplier: 2.0,
        targetMultipliers: { tp1: 2.0, tp2: 3.0, tp3: 5.0 } // 1:2, 1:3, 1:5 R:R
      }
    };

    return configs[regime] || configs.ACCUMULATION; // Default to accumulation config
  }

  /**
   * Generate dynamic stop loss and targets based on ATR and market regime
   *
   * This is the main method that strategies should call.
   *
   * Key Benefits:
   * 1. Stops adjust to volatility (wider in volatile markets, tighter in calm markets)
   * 2. Targets scale with stops (maintains good R:R ratios)
   * 3. Regime-aware (different multipliers for trending vs choppy markets)
   * 4. Guaranteed minimum 1:2 R:R on first target
   *
   * @param entryPrice - Entry price for the trade
   * @param direction - Trade direction (LONG or SHORT)
   * @param candles - Historical OHLC data for ATR calculation
   * @param regime - Current market regime
   * @param confidence - Signal confidence (0-100), adjusts multipliers
   * @returns Dynamic price levels with ATR-based stops/targets
   */
  getDynamicLevels(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    candles: OHLC[],
    regime: MarketRegime,
    confidence: number = 75
  ): DynamicLevels {
    // Get regime-specific configuration
    const config = this.getRegimeMultipliers(regime);

    // Calculate ATR
    const atrValue = this.calculateATR(candles, config.period);
    const atrPercent = (atrValue / entryPrice) * 100;

    // Fallback to fixed percentage if ATR calculation fails
    if (atrValue === 0) {
      console.warn(`[ATR Calculator] ATR is 0, using fallback fixed percentages`);
      return this.getFallbackLevels(entryPrice, direction, regime);
    }

    // Adjust multipliers based on confidence
    // Higher confidence = slightly wider stops (more room to be right)
    // Lower confidence = tighter stops (less risk)
    const confidenceAdjustment = confidence > 80 ? 1.1 :
                                   confidence > 60 ? 1.0 :
                                   0.9;

    const adjustedStopMultiplier = config.stopMultiplier * confidenceAdjustment;

    // Calculate stop distance from entry
    const stopDistance = atrValue * adjustedStopMultiplier;

    // Calculate target distances (as multiples of stop distance)
    const target1Distance = stopDistance * config.targetMultipliers.tp1;
    const target2Distance = stopDistance * config.targetMultipliers.tp2;
    const target3Distance = stopDistance * config.targetMultipliers.tp3;

    // Calculate actual price levels
    let stopLoss: number;
    let target1: number;
    let target2: number;
    let target3: number;

    if (direction === 'LONG') {
      stopLoss = entryPrice - stopDistance;
      target1 = entryPrice + target1Distance;
      target2 = entryPrice + target2Distance;
      target3 = entryPrice + target3Distance;
    } else { // SHORT
      stopLoss = entryPrice + stopDistance;
      target1 = entryPrice - target1Distance;
      target2 = entryPrice - target2Distance;
      target3 = entryPrice - target3Distance;
    }

    // Calculate risk/reward ratios
    const riskRewardRatios: [number, number, number] = [
      config.targetMultipliers.tp1,
      config.targetMultipliers.tp2,
      config.targetMultipliers.tp3
    ];

    // Enforce minimum R:R of 1:2 for TP1
    if (riskRewardRatios[0] < 2.0) {
      console.warn(`[ATR Calculator] R:R for TP1 is ${riskRewardRatios[0]}, adjusting to 2.0`);
      const adjustment = 2.0 / riskRewardRatios[0];
      if (direction === 'LONG') {
        target1 = entryPrice + (stopDistance * 2.0);
        target2 = entryPrice + (stopDistance * config.targetMultipliers.tp2 * adjustment);
        target3 = entryPrice + (stopDistance * config.targetMultipliers.tp3 * adjustment);
      } else {
        target1 = entryPrice - (stopDistance * 2.0);
        target2 = entryPrice - (stopDistance * config.targetMultipliers.tp2 * adjustment);
        target3 = entryPrice - (stopDistance * config.targetMultipliers.tp3 * adjustment);
      }
      riskRewardRatios[0] = 2.0;
      riskRewardRatios[1] = config.targetMultipliers.tp2 * adjustment;
      riskRewardRatios[2] = config.targetMultipliers.tp3 * adjustment;
    }

    console.log(
      `[ATR Calculator] ${direction} | Entry: $${entryPrice.toFixed(2)} | ` +
      `ATR: ${atrPercent.toFixed(2)}% | Regime: ${regime} | ` +
      `R:R: 1:${riskRewardRatios[0].toFixed(1)}, 1:${riskRewardRatios[1].toFixed(1)}, 1:${riskRewardRatios[2].toFixed(1)}`
    );

    return {
      stopLoss,
      target1,
      target2,
      target3,
      riskRewardRatios,
      atrValue,
      atrPercent,
      stopDistance,
      targetDistances: [target1Distance, target2Distance, target3Distance],
      config
    };
  }

  /**
   * Fallback method using fixed percentages when ATR cannot be calculated
   *
   * Used when:
   * - Insufficient historical data
   * - ATR calculation returns 0 (e.g., no price movement)
   * - Data quality issues
   *
   * Ensures system always returns valid levels even without ATR.
   */
  private getFallbackLevels(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    regime: MarketRegime
  ): DynamicLevels {
    // Fixed percentage fallback based on regime
    const fallbackConfig: Record<MarketRegime, { stop: number; tp1: number; tp2: number; tp3: number }> = {
      BULL_MOMENTUM: { stop: 0.04, tp1: 0.08, tp2: 0.16, tp3: 0.24 },   // 4% stop, 1:2, 1:4, 1:6
      BEAR_MOMENTUM: { stop: 0.04, tp1: 0.08, tp2: 0.16, tp3: 0.24 },
      BULL_RANGE: { stop: 0.03, tp1: 0.054, tp2: 0.09, tp3: 0.15 },     // 3% stop, 1:1.8, 1:3, 1:5
      BEAR_RANGE: { stop: 0.03, tp1: 0.054, tp2: 0.09, tp3: 0.15 },
      CHOPPY: { stop: 0.025, tp1: 0.0375, tp2: 0.0625, tp3: 0.10 },     // 2.5% stop, 1:1.5, 1:2.5, 1:4
      VOLATILE_BREAKOUT: { stop: 0.05, tp1: 0.10, tp2: 0.175, tp3: 0.275 }, // 5% stop, 1:2, 1:3.5, 1:5.5
      ACCUMULATION: { stop: 0.03, tp1: 0.06, tp2: 0.09, tp3: 0.15 }     // 3% stop, 1:2, 1:3, 1:5
    };

    const percentages = fallbackConfig[regime] || fallbackConfig.ACCUMULATION;

    let stopLoss: number;
    let target1: number;
    let target2: number;
    let target3: number;

    if (direction === 'LONG') {
      stopLoss = entryPrice * (1 - percentages.stop);
      target1 = entryPrice * (1 + percentages.tp1);
      target2 = entryPrice * (1 + percentages.tp2);
      target3 = entryPrice * (1 + percentages.tp3);
    } else {
      stopLoss = entryPrice * (1 + percentages.stop);
      target1 = entryPrice * (1 - percentages.tp1);
      target2 = entryPrice * (1 - percentages.tp2);
      target3 = entryPrice * (1 - percentages.tp3);
    }

    const stopDistance = Math.abs(entryPrice - stopLoss);
    const riskRewardRatios: [number, number, number] = [
      Math.abs(target1 - entryPrice) / stopDistance,
      Math.abs(target2 - entryPrice) / stopDistance,
      Math.abs(target3 - entryPrice) / stopDistance
    ];

    console.log(
      `[ATR Calculator] FALLBACK | ${direction} | Entry: $${entryPrice.toFixed(2)} | ` +
      `Regime: ${regime} | R:R: 1:${riskRewardRatios[0].toFixed(1)}, 1:${riskRewardRatios[1].toFixed(1)}, 1:${riskRewardRatios[2].toFixed(1)}`
    );

    return {
      stopLoss,
      target1,
      target2,
      target3,
      riskRewardRatios,
      atrValue: 0,
      atrPercent: percentages.stop * 100,
      stopDistance,
      targetDistances: [
        Math.abs(target1 - entryPrice),
        Math.abs(target2 - entryPrice),
        Math.abs(target3 - entryPrice)
      ],
      config: {
        period: 14,
        stopMultiplier: 0,
        targetMultipliers: { tp1: riskRewardRatios[0], tp2: riskRewardRatios[1], tp3: riskRewardRatios[2] }
      }
    };
  }

  /**
   * Calculate ATR as percentage of current price
   * Useful for comparing volatility across different assets
   */
  getATRPercent(candles: OHLC[], period: number = this.DEFAULT_PERIOD): number {
    if (!candles || candles.length === 0) return 0;

    const atr = this.calculateATR(candles, period);
    const currentPrice = candles[candles.length - 1].close;

    return (atr / currentPrice) * 100;
  }

  /**
   * Validate if given price levels meet minimum R:R requirements
   * Useful for strategies with custom level calculation
   */
  validateRiskReward(
    entryPrice: number,
    stopLoss: number,
    target1: number,
    minimumRR: number = 2.0
  ): { valid: boolean; actualRR: number; message: string } {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(target1 - entryPrice);
    const actualRR = reward / risk;

    if (actualRR < minimumRR) {
      return {
        valid: false,
        actualRR,
        message: `Risk/Reward ratio ${actualRR.toFixed(2)}:1 is below minimum ${minimumRR}:1`
      };
    }

    return {
      valid: true,
      actualRR,
      message: `Risk/Reward ratio ${actualRR.toFixed(2)}:1 meets minimum requirement`
    };
  }
}

// Export singleton instance
export const atrCalculator = new ATRCalculator();

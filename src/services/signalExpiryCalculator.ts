/**
 * Intelligent Signal Expiry Calculator
 *
 * Calculates dynamic signal validity windows based on multiple market factors.
 * Addresses the problem of signals timing out before reaching targets.
 *
 * Key Innovation: Signal expiry is calculated from expected time to reach target,
 * not arbitrary fixed durations. This dramatically reduces TIMEOUT outcomes.
 *
 * Factors Considered:
 * 1. Target Distance - How far price needs to move
 * 2. Current Volatility (ATR) - How fast price typically moves
 * 3. Market Regime - Trending (slower) vs Choppy (faster)
 * 4. Signal Confidence - Higher confidence gets more time
 * 5. Liquidity/Volume - Higher volume = faster price discovery
 *
 * Research: Based on 2024 institutional adaptive signal management practices
 */

import type { MarketRegime } from './igx/MarketRegimeDetector';

// ===== INTERFACES =====

export interface ExpiryFactors {
  baseExpiry: number;              // Base expiry in milliseconds (calculated from target distance)
  regimeMultiplier: number;        // Regime-based adjustment (0.5-2.0x)
  volatilityMultiplier: number;    // Volatility-based adjustment (0.5-1.5x)
  confidenceMultiplier: number;    // Confidence-based adjustment (0.8-1.2x)
  liquidityMultiplier: number;     // Volume/liquidity adjustment (0.8-1.2x)
  finalExpiry: number;             // Final calculated expiry in milliseconds
  expiryMinutes: number;           // Final expiry in minutes (for display)
  explanation: string;             // Human-readable explanation
}

export interface ExpiryInput {
  entryPrice: number;
  target1: number;                 // First target price
  stopLoss: number;
  regime: MarketRegime;
  atrPercent: number;              // ATR as percentage of price
  confidence: number;              // 0-100
  recentVolume: number;            // Recent volume
  avgVolume: number;               // Average volume
  direction: 'LONG' | 'SHORT';
}

// ===== CONSTANTS =====

// ✅ AGGRESSIVE EXPIRY: Signals must resolve within 24h for highest probability
const MIN_EXPIRY_MS = 4 * 60 * 60 * 1000;  // Minimum: 4 hours (crypto moves fast!)
const MAX_EXPIRY_MS = 24 * 60 * 60 * 1000; // Maximum: 24 hours (HARD CAP)
const AVG_DAY_MINUTES = 24 * 60;           // Minutes in a day
const MS_PER_MINUTE = 60 * 1000;

// ===== SIGNAL EXPIRY CALCULATOR =====

export class SignalExpiryCalculator {
  /**
   * Calculate intelligent signal expiry time
   *
   * Core Logic:
   * 1. Calculate how long it typically takes price to move to target
   * 2. Apply regime multiplier (trends need more time, chop needs less)
   * 3. Apply volatility multiplier (low vol needs more time)
   * 4. Apply confidence multiplier (high confidence gets more time)
   * 5. Apply liquidity multiplier (high volume = faster moves)
   * 6. Enforce min/max bounds
   *
   * @param input - All factors needed for expiry calculation
   * @returns Detailed breakdown of expiry calculation
   */
  calculateExpiry(input: ExpiryInput): ExpiryFactors {
    // Step 1: Calculate base expiry from target distance and volatility
    const baseExpiry = this.estimateTimeToTarget(
      input.entryPrice,
      input.target1,
      input.atrPercent,
      input.regime
    );

    // Step 2: Apply regime multiplier
    const regimeMultiplier = this.getRegimeMultiplier(input.regime);

    // Step 3: Apply volatility multiplier
    const volatilityMultiplier = this.getVolatilityMultiplier(input.atrPercent);

    // Step 4: Apply confidence multiplier
    const confidenceMultiplier = this.getConfidenceMultiplier(input.confidence);

    // Step 5: Apply liquidity multiplier
    const liquidityMultiplier = this.getLiquidityMultiplier(
      input.recentVolume,
      input.avgVolume
    );

    // Step 6: Calculate final expiry
    let finalExpiry = baseExpiry *
                       regimeMultiplier *
                       volatilityMultiplier *
                       confidenceMultiplier *
                       liquidityMultiplier;

    // Step 7: Enforce bounds
    const unboundedExpiry = finalExpiry;
    finalExpiry = Math.max(MIN_EXPIRY_MS, Math.min(finalExpiry, MAX_EXPIRY_MS));

    const expiryMinutes = Math.round(finalExpiry / MS_PER_MINUTE);

    // Build explanation
    const explanation = this.buildExplanation({
      baseExpiry,
      regimeMultiplier,
      volatilityMultiplier,
      confidenceMultiplier,
      liquidityMultiplier,
      unboundedExpiry,
      finalExpiry,
      regime: input.regime,
      atrPercent: input.atrPercent,
      confidence: input.confidence
    });

    console.log(
      `[Expiry Calculator] ${expiryMinutes} min | ` +
      `Base: ${Math.round(baseExpiry / MS_PER_MINUTE)}m × ` +
      `Regime: ${regimeMultiplier.toFixed(2)} × ` +
      `Vol: ${volatilityMultiplier.toFixed(2)} × ` +
      `Conf: ${confidenceMultiplier.toFixed(2)} × ` +
      `Liq: ${liquidityMultiplier.toFixed(2)} = ${expiryMinutes}m`
    );

    return {
      baseExpiry,
      regimeMultiplier,
      volatilityMultiplier,
      confidenceMultiplier,
      liquidityMultiplier,
      finalExpiry,
      expiryMinutes,
      explanation
    };
  }

  /**
   * Estimate time to reach target based on historical movement rates
   *
   * Logic: "In this volatility regime, price moves X% per Y minutes on average"
   *
   * Example:
   *   ATR = 3% per day
   *   Target distance = 2%
   *   Expected time = (2% / 3%) × 1 day = 0.67 days = 16 hours
   *
   * We then adjust this base estimate with regime-specific knowledge.
   */
  private estimateTimeToTarget(
    entryPrice: number,
    target: number,
    atrPercent: number,
    regime: MarketRegime
  ): number {
    // Calculate target distance as percentage
    const targetDistancePct = Math.abs(target - entryPrice) / entryPrice * 100;

    // If ATR is too small, use fallback
    if (atrPercent < 0.1) {
      console.warn(`[Expiry Calculator] ATR too small (${atrPercent}%), using fallback`);
      return this.getFallbackExpiry(regime);
    }

    // Calculate average movement per minute based on ATR
    // ATR represents typical daily range, so we divide by minutes in a day
    const avgMovementPerMinute = atrPercent / AVG_DAY_MINUTES;

    // Estimate minutes to target
    const estimatedMinutesToTarget = targetDistancePct / avgMovementPerMinute;

    // Convert to milliseconds
    const baseExpiry = estimatedMinutesToTarget * MS_PER_MINUTE;

    // Apply regime-specific adjustment to base estimate
    // Some regimes move more directionally, others chop around
    const regimeAdjustment = this.getBaseRegimeAdjustment(regime);

    return baseExpiry * regimeAdjustment;
  }

  /**
   * Get base regime adjustment for time-to-target calculation
   *
   * ✅ AGGRESSIVE: Favor faster outcomes to maximize hit rate within 24h
   * This adjusts the base calculation for regime-specific movement characteristics.
   */
  private getBaseRegimeAdjustment(regime: MarketRegime): number {
    const adjustments: Record<MarketRegime, number> = {
      BULL_MOMENTUM: 0.6,        // ✅ Trends move efficiently - expect fast TP
      BEAR_MOMENTUM: 0.6,        // ✅ Momentum moves directionally
      BULL_RANGE: 0.9,           // ✅ Range-bound slower but still reasonable
      BEAR_RANGE: 0.9,
      CHOPPY: 1.0,               // ✅ Choppy means back-and-forth (medium time)
      VOLATILE_BREAKOUT: 0.5,    // ✅ Breakouts move VERY fast - shortest time
      ACCUMULATION: 0.8          // ✅ Accumulation medium-fast
    };

    return adjustments[regime] || 0.8;
  }

  /**
   * Get regime multiplier for final expiry adjustment
   *
   * ✅ AGGRESSIVE: All multipliers reduced for faster outcomes within 24h
   * Focus on high-probability short-term moves rather than extended plays
   */
  private getRegimeMultiplier(regime: MarketRegime): number {
    const multipliers: Record<MarketRegime, number> = {
      BULL_MOMENTUM: 1.1,        // ✅ Reduced from 1.5 - momentum should move fast
      BEAR_MOMENTUM: 1.1,        // ✅ Same for bearish momentum
      BULL_RANGE: 0.8,           // ✅ Range-bound = tight validity window
      BEAR_RANGE: 0.8,
      CHOPPY: 0.7,               // ✅ Choppy = short validity (noise invalidates signals)
      VOLATILE_BREAKOUT: 0.9,    // ✅ Breakouts move fast, don't need long time
      ACCUMULATION: 0.9          // ✅ Reduced from 1.2 - accumulation still reasonable
    };

    return multipliers[regime] || 0.9;
  }

  /**
   * Get volatility multiplier
   *
   * ✅ AGGRESSIVE: Even low vol should resolve within 24h
   * High volatility = faster moves = shorter expiry
   */
  private getVolatilityMultiplier(atrPercent: number): number {
    if (atrPercent < 1.5) return 1.2;      // ✅ Reduced from 1.4 - low vol still needs to move
    if (atrPercent < 2.5) return 1.0;      // ✅ Reduced from 1.2 - standard time
    if (atrPercent < 4.0) return 0.9;      // ✅ Medium volatility = slightly faster
    if (atrPercent < 6.0) return 0.7;      // ✅ High volatility = fast moves
    return 0.6;                             // ✅ Extreme volatility = very fast
  }

  /**
   * Get confidence multiplier
   *
   * ✅ AGGRESSIVE: Even high confidence should resolve quickly
   * Focus on near-term high-probability moves
   */
  private getConfidenceMultiplier(confidence: number): number {
    if (confidence >= 85) return 1.1;      // ✅ Reduced from 1.2 - very high confidence
    if (confidence >= 75) return 1.0;      // ✅ Reduced from 1.1 - standard time
    if (confidence >= 65) return 0.9;      // ✅ Medium confidence = slightly shorter
    if (confidence >= 55) return 0.8;      // ✅ Low confidence = short leash
    return 0.7;                             // ✅ Very low confidence = very short
  }

  /**
   * Get liquidity multiplier based on volume
   *
   * High volume: Price discovery happens faster
   * Low volume: Price moves more slowly
   */
  private getLiquidityMultiplier(recentVolume: number, avgVolume: number): number {
    if (avgVolume === 0) return 1.0;

    const volumeRatio = recentVolume / avgVolume;

    if (volumeRatio > 2.0) return 0.8;     // Very high volume = faster
    if (volumeRatio > 1.5) return 0.9;     // High volume
    if (volumeRatio > 0.8) return 1.0;     // Normal volume
    if (volumeRatio > 0.5) return 1.1;     // Low volume
    return 1.2;                             // Very low volume = slower
  }

  /**
   * Get fallback expiry when ATR is unavailable or too small
   *
   * ✅ AGGRESSIVE: Short fallback times for fast resolution
   * All values designed to resolve within 24h with high probability
   */
  private getFallbackExpiry(regime: MarketRegime): number {
    const fallbackHours: Record<MarketRegime, number> = {
      BULL_MOMENTUM: 12,         // ✅ 12 hours for momentum trends
      BEAR_MOMENTUM: 12,
      BULL_RANGE: 8,             // ✅ 8 hours for range-bound
      BEAR_RANGE: 8,
      CHOPPY: 6,                 // ✅ 6 hours for choppy (invalidates quickly)
      VOLATILE_BREAKOUT: 8,      // ✅ 8 hours for breakouts
      ACCUMULATION: 10           // ✅ 10 hours for accumulation
    };

    return (fallbackHours[regime] || 8) * 60 * MS_PER_MINUTE;
  }

  /**
   * Build human-readable explanation of expiry calculation
   */
  private buildExplanation(data: {
    baseExpiry: number;
    regimeMultiplier: number;
    volatilityMultiplier: number;
    confidenceMultiplier: number;
    liquidityMultiplier: number;
    unboundedExpiry: number;
    finalExpiry: number;
    regime: MarketRegime;
    atrPercent: number;
    confidence: number;
  }): string {
    const baseMin = Math.round(data.baseExpiry / MS_PER_MINUTE);
    const finalMin = Math.round(data.finalExpiry / MS_PER_MINUTE);
    const unboundedMin = Math.round(data.unboundedExpiry / MS_PER_MINUTE);

    let explanation = `Signal valid for ${finalMin} minutes. `;
    explanation += `Base estimate: ${baseMin}m (based on ${data.atrPercent.toFixed(1)}% ATR). `;

    // Explain each adjustment
    if (data.regimeMultiplier !== 1.0) {
      const change = data.regimeMultiplier > 1.0 ? 'Extended' : 'Reduced';
      explanation += `${change} for ${data.regime} regime (×${data.regimeMultiplier.toFixed(2)}). `;
    }

    if (data.volatilityMultiplier !== 1.0) {
      const volLevel = data.atrPercent < 2.5 ? 'low' : 'high';
      const change = data.volatilityMultiplier > 1.0 ? 'Extended' : 'Reduced';
      explanation += `${change} due to ${volLevel} volatility (×${data.volatilityMultiplier.toFixed(2)}). `;
    }

    if (data.confidenceMultiplier !== 1.0) {
      const confLevel = data.confidence > 75 ? 'high' : 'low';
      const change = data.confidenceMultiplier > 1.0 ? 'Extended' : 'Reduced';
      explanation += `${change} for ${confLevel} confidence (×${data.confidenceMultiplier.toFixed(2)}). `;
    }

    // Note if bounded
    if (data.finalExpiry !== data.unboundedExpiry) {
      if (data.finalExpiry === MIN_EXPIRY_MS) {
        explanation += `Minimum enforced (calculated ${unboundedMin}m).`;
      } else if (data.finalExpiry === MAX_EXPIRY_MS) {
        explanation += `Maximum enforced (calculated ${unboundedMin}m).`;
      }
    }

    return explanation;
  }

  /**
   * Calculate expiry for a simple case (no detailed factors)
   * Useful for quick estimates
   */
  calculateSimpleExpiry(
    targetDistancePct: number,
    regime: MarketRegime,
    atrPercent: number
  ): number {
    const input: ExpiryInput = {
      entryPrice: 100,
      target1: 100 * (1 + targetDistancePct / 100),
      stopLoss: 100 * (1 - targetDistancePct / (2 * 100)), // Assume 1:2 R:R
      regime,
      atrPercent,
      confidence: 70,
      recentVolume: 1000000,
      avgVolume: 1000000,
      direction: 'LONG'
    };

    const factors = this.calculateExpiry(input);
    return factors.finalExpiry;
  }

  /**
   * Validate if current expiry is appropriate
   * Can be used to adjust existing signals
   */
  validateExpiry(
    currentExpiry: number,
    recommendedExpiry: number
  ): { valid: boolean; recommendation: string } {
    const currentMin = Math.round(currentExpiry / MS_PER_MINUTE);
    const recommendedMin = Math.round(recommendedExpiry / MS_PER_MINUTE);
    const difference = Math.abs(currentMin - recommendedMin);
    const percentDiff = (difference / recommendedMin) * 100;

    if (percentDiff < 20) {
      return {
        valid: true,
        recommendation: `Current expiry (${currentMin}m) is appropriate`
      };
    } else if (currentMin < recommendedMin) {
      return {
        valid: false,
        recommendation: `Current expiry (${currentMin}m) is too short, recommend ${recommendedMin}m (${difference}m more)`
      };
    } else {
      return {
        valid: false,
        recommendation: `Current expiry (${currentMin}m) is too long, recommend ${recommendedMin}m (${difference}m less)`
      };
    }
  }
}

// Export singleton instance
export const signalExpiryCalculator = new SignalExpiryCalculator();

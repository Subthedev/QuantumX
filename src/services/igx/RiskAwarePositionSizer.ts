/**
 * RISK-AWARE POSITION SIZER
 * Calculates optimal position sizes based on risk management principles
 *
 * PURPOSE: Position sizing is the #1 factor in long-term profitability
 * This component determines how much capital to risk per signal
 *
 * METHODOLOGIES:
 * 1. Fixed Fractional (risk N% of account per trade)
 * 2. Kelly Criterion (optimal bet sizing for maximum growth)
 * 3. Volatility-Adjusted (larger positions in low volatility)
 * 4. Confidence-Scaled (larger positions in high confidence signals)
 * 5. Drawdown-Aware (reduce size after losses)
 *
 * RISK LEVELS:
 * - CONSERVATIVE: 1-2% risk per trade
 * - MODERATE: 2-3% risk per trade
 * - AGGRESSIVE: 3-5% risk per trade
 * - VERY_AGGRESSIVE: 5-8% risk per trade
 *
 * CRITICAL SAFEGUARDS:
 * - Never risk more than 10% per trade (absolute maximum)
 * - Scale down after consecutive losses
 * - Scale up after consecutive wins (but capped)
 * - Consider correlation (reduce if correlated positions exist)
 */

/**
 * Risk profile configuration
 */
export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';

/**
 * Position size recommendation
 */
export interface PositionSizeRecommendation {
  // Position sizes (as % of account)
  minimumSize: number; // Conservative size
  recommendedSize: number; // Optimal size
  maximumSize: number; // Aggressive size

  // Position sizes (in USD if account size provided)
  minimumUSD?: number;
  recommendedUSD?: number;
  maximumUSD?: number;

  // Risk metrics
  riskAmount: number; // $ at risk (stop loss distance)
  riskPercentage: number; // % of account at risk
  expectedReturn: number; // Expected $ return
  expectedReturnPercentage: number; // Expected % return

  // Reasoning
  reasoning: string[];
  riskFactors: string[];
  adjustments: string[];

  // Sizing methodology used
  methodology: 'FIXED_FRACTIONAL' | 'KELLY_CRITERION' | 'VOLATILITY_ADJUSTED' | 'HYBRID';

  // Confidence in recommendation
  confidence: number; // 0-100

  timestamp: number;
}

/**
 * Signal parameters for sizing
 */
interface SignalParameters {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  confidence: number; // 0-100
  expectedProfit: number; // Expected % gain
  riskRewardRatio: number;
  volatility: number; // 0-100
  marketFitScore?: number; // 0-100 (from Market Fit Scorer)
}

/**
 * Account parameters
 */
interface AccountParameters {
  accountSize: number; // Total account USD
  riskProfile: RiskProfile;
  maxRiskPerTrade: number; // Max % of account to risk per trade
  currentDrawdown: number; // Current % drawdown from peak
  consecutiveWins: number;
  consecutiveLosses: number;
  openPositions: number;
  correlatedPositions: number; // # of positions correlated with this one
}

export class RiskAwarePositionSizer {
  // Risk profile settings
  private readonly RISK_PROFILES = {
    CONSERVATIVE: {
      baseRisk: 1.5, // 1.5% per trade
      maxRisk: 3.0,
      kellyFraction: 0.25 // Use 1/4 Kelly
    },
    MODERATE: {
      baseRisk: 2.5, // 2.5% per trade
      maxRisk: 5.0,
      kellyFraction: 0.33 // Use 1/3 Kelly
    },
    AGGRESSIVE: {
      baseRisk: 4.0, // 4% per trade
      maxRisk: 8.0,
      kellyFraction: 0.5 // Use 1/2 Kelly
    },
    VERY_AGGRESSIVE: {
      baseRisk: 6.0, // 6% per trade
      maxRisk: 10.0,
      kellyFraction: 0.75 // Use 3/4 Kelly
    }
  };

  // Absolute maximum risk per trade (safeguard)
  private readonly ABSOLUTE_MAX_RISK = 10.0; // 10%

  // Drawdown adjustment factors
  private readonly DRAWDOWN_THRESHOLDS = {
    MINOR: 10, // 10% drawdown → reduce size 20%
    MODERATE: 20, // 20% drawdown → reduce size 40%
    SEVERE: 30, // 30% drawdown → reduce size 60%
    CRITICAL: 40 // 40% drawdown → reduce size 80%
  };

  constructor() {
    console.log('[Risk-Aware Position Sizer] Initialized');
  }

  /**
   * Main method: Calculate position size
   */
  calculatePositionSize(
    signal: SignalParameters,
    account: AccountParameters
  ): PositionSizeRecommendation {
    console.log(`[Position Sizer] 📊 Calculating position size for ${signal.symbol}...`);

    const reasoning: string[] = [];
    const riskFactors: string[] = [];
    const adjustments: string[] = [];

    // Get base risk from profile
    const profile = this.RISK_PROFILES[account.riskProfile];
    let baseRisk = profile.baseRisk;

    reasoning.push(`Base risk: ${baseRisk}% (${account.riskProfile} profile)`);

    // Calculate Kelly-optimal size
    const kellySize = this.calculateKellySize(signal, profile.kellyFraction);
    reasoning.push(`Kelly Criterion suggests ${kellySize.toFixed(2)}% position`);

    // Apply confidence adjustment
    const confidenceMultiplier = this.calculateConfidenceMultiplier(signal.confidence);
    const confidenceAdjustedRisk = baseRisk * confidenceMultiplier;
    if (confidenceMultiplier !== 1.0) {
      adjustments.push(
        `Confidence (${signal.confidence}%) adjusts size by ${((confidenceMultiplier - 1) * 100).toFixed(0)}%`
      );
    }

    // Apply volatility adjustment
    const volatilityMultiplier = this.calculateVolatilityMultiplier(signal.volatility);
    const volatilityAdjustedRisk = confidenceAdjustedRisk * volatilityMultiplier;
    if (volatilityMultiplier !== 1.0) {
      adjustments.push(
        `Volatility (${signal.volatility}) adjusts size by ${((volatilityMultiplier - 1) * 100).toFixed(0)}%`
      );
    }

    // Apply market fit adjustment (if provided)
    let marketFitMultiplier = 1.0;
    if (signal.marketFitScore !== undefined) {
      marketFitMultiplier = this.calculateMarketFitMultiplier(signal.marketFitScore);
      if (marketFitMultiplier !== 1.0) {
        adjustments.push(
          `Market fit (${signal.marketFitScore}) adjusts size by ${((marketFitMultiplier - 1) * 100).toFixed(0)}%`
        );
      }
    }
    const marketAdjustedRisk = volatilityAdjustedRisk * marketFitMultiplier;

    // Apply drawdown adjustment
    const drawdownMultiplier = this.calculateDrawdownMultiplier(account.currentDrawdown);
    const drawdownAdjustedRisk = marketAdjustedRisk * drawdownMultiplier;
    if (drawdownMultiplier !== 1.0) {
      adjustments.push(
        `Drawdown (${account.currentDrawdown.toFixed(1)}%) reduces size by ${((1 - drawdownMultiplier) * 100).toFixed(0)}%`
      );
      riskFactors.push('Account in drawdown - reducing position size');
    }

    // Apply win/loss streak adjustment
    const streakMultiplier = this.calculateStreakMultiplier(
      account.consecutiveWins,
      account.consecutiveLosses
    );
    const streakAdjustedRisk = drawdownAdjustedRisk * streakMultiplier;
    if (streakMultiplier !== 1.0) {
      if (streakMultiplier > 1.0) {
        adjustments.push(`Win streak (${account.consecutiveWins}) increases size by ${((streakMultiplier - 1) * 100).toFixed(0)}%`);
      } else {
        adjustments.push(`Loss streak (${account.consecutiveLosses}) reduces size by ${((1 - streakMultiplier) * 100).toFixed(0)}%`);
        riskFactors.push('Recent losses - reducing position size');
      }
    }

    // Apply correlation adjustment
    const correlationMultiplier = this.calculateCorrelationMultiplier(account.correlatedPositions);
    const correlationAdjustedRisk = streakAdjustedRisk * correlationMultiplier;
    if (correlationMultiplier !== 1.0) {
      adjustments.push(
        `Correlation (${account.correlatedPositions} positions) reduces size by ${((1 - correlationMultiplier) * 100).toFixed(0)}%`
      );
      riskFactors.push('Correlated positions exist - reducing to manage portfolio risk');
    }

    // Final recommended risk percentage
    let recommendedRisk = correlationAdjustedRisk;

    // Cap at max risk for profile
    if (recommendedRisk > profile.maxRisk) {
      recommendedRisk = profile.maxRisk;
      riskFactors.push(`Capped at maximum risk (${profile.maxRisk}%) for ${account.riskProfile} profile`);
    }

    // Cap at absolute maximum
    if (recommendedRisk > this.ABSOLUTE_MAX_RISK) {
      recommendedRisk = this.ABSOLUTE_MAX_RISK;
      riskFactors.push(`Capped at absolute maximum risk (${this.ABSOLUTE_MAX_RISK}%)`);
    }

    // Calculate position sizes
    const stopLossDistance = Math.abs((signal.entryPrice - signal.stopLoss) / signal.entryPrice);

    // Recommended size
    const recommendedSize = (recommendedRisk / 100) / stopLossDistance;

    // Minimum size (conservative)
    const minimumSize = recommendedSize * 0.5;

    // Maximum size (aggressive)
    const maximumSize = Math.min(recommendedSize * 1.5, (this.ABSOLUTE_MAX_RISK / 100) / stopLossDistance);

    // Calculate USD amounts if account size provided
    const minimumUSD = account.accountSize * minimumSize;
    const recommendedUSD = account.accountSize * recommendedSize;
    const maximumUSD = account.accountSize * maximumSize;

    // Calculate risk amounts
    const riskAmount = account.accountSize * (recommendedRisk / 100);
    const riskPercentage = recommendedRisk;

    // Calculate expected returns
    const expectedReturn = recommendedUSD * (signal.expectedProfit / 100);
    const expectedReturnPercentage = signal.expectedProfit;

    // Determine methodology
    const methodology = this.determineMethodology(signal, kellySize, recommendedRisk);

    // Confidence in recommendation
    const confidence = this.calculateRecommendationConfidence(
      signal,
      account,
      adjustments.length
    );

    // Final reasoning
    if (riskFactors.length === 0) {
      reasoning.push('No significant risk factors identified');
    }
    if (adjustments.length > 0) {
      reasoning.push(`Applied ${adjustments.length} adjustment(s) to base size`);
    }

    const recommendation: PositionSizeRecommendation = {
      minimumSize: Math.round(minimumSize * 10000) / 100, // As percentage
      recommendedSize: Math.round(recommendedSize * 10000) / 100,
      maximumSize: Math.round(maximumSize * 10000) / 100,
      minimumUSD: Math.round(minimumUSD),
      recommendedUSD: Math.round(recommendedUSD),
      maximumUSD: Math.round(maximumUSD),
      riskAmount: Math.round(riskAmount),
      riskPercentage: Math.round(riskPercentage * 10) / 10,
      expectedReturn: Math.round(expectedReturn),
      expectedReturnPercentage: Math.round(expectedReturnPercentage * 10) / 10,
      reasoning,
      riskFactors,
      adjustments,
      methodology,
      confidence,
      timestamp: Date.now()
    };

    console.log(
      `[Position Sizer] ✅ Recommended: ${recommendation.recommendedSize}% ` +
      `($${recommendation.recommendedUSD}) - Risk: ${recommendation.riskPercentage}%`
    );

    return recommendation;
  }

  /**
   * Calculate Kelly Criterion size
   * Kelly % = (P × R - (1 - P)) / R
   * Where P = win probability, R = risk-reward ratio
   */
  private calculateKellySize(signal: SignalParameters, kellyFraction: number): number {
    const winProbability = signal.confidence / 100;
    const riskRewardRatio = signal.riskRewardRatio;

    // Kelly formula
    const fullKelly = (winProbability * riskRewardRatio - (1 - winProbability)) / riskRewardRatio;

    // Use fractional Kelly for safety
    const fractionalKelly = fullKelly * kellyFraction;

    // Convert to percentage and clamp
    return Math.max(0, Math.min(fractionalKelly * 100, 20));
  }

  /**
   * Calculate confidence multiplier (0.5-1.5)
   */
  private calculateConfidenceMultiplier(confidence: number): number {
    // 90-100 confidence → 1.3-1.5x
    // 70-90 confidence → 1.0-1.3x
    // 50-70 confidence → 0.7-1.0x
    // 0-50 confidence → 0.5-0.7x

    if (confidence >= 90) {
      return 1.3 + (confidence - 90) * 0.02;
    } else if (confidence >= 70) {
      return 1.0 + (confidence - 70) * 0.015;
    } else if (confidence >= 50) {
      return 0.7 + (confidence - 50) * 0.015;
    } else {
      return 0.5 + confidence * 0.004;
    }
  }

  /**
   * Calculate volatility multiplier (0.6-1.2)
   */
  private calculateVolatilityMultiplier(volatility: number): number {
    // Low volatility (0-30) → 1.1-1.2x (increase size)
    // Moderate volatility (30-60) → 0.9-1.1x (neutral)
    // High volatility (60-100) → 0.6-0.9x (reduce size)

    if (volatility < 30) {
      return 1.1 + (30 - volatility) * 0.003; // 1.1-1.2
    } else if (volatility < 60) {
      return 0.9 + (60 - volatility) * 0.007; // 0.9-1.1
    } else {
      return 0.6 + (100 - volatility) * 0.0075; // 0.6-0.9
    }
  }

  /**
   * Calculate market fit multiplier (0.5-1.5)
   */
  private calculateMarketFitMultiplier(marketFitScore: number): number {
    // A (90-100) → 1.3-1.5x
    // B (80-90) → 1.1-1.3x
    // C (70-80) → 0.9-1.1x
    // D (60-70) → 0.7-0.9x
    // F (0-60) → 0.5-0.7x

    if (marketFitScore >= 90) {
      return 1.3 + (marketFitScore - 90) * 0.02;
    } else if (marketFitScore >= 80) {
      return 1.1 + (marketFitScore - 80) * 0.02;
    } else if (marketFitScore >= 70) {
      return 0.9 + (marketFitScore - 70) * 0.02;
    } else if (marketFitScore >= 60) {
      return 0.7 + (marketFitScore - 60) * 0.02;
    } else {
      return 0.5 + marketFitScore * 0.003;
    }
  }

  /**
   * Calculate drawdown multiplier (0.2-1.0)
   */
  private calculateDrawdownMultiplier(drawdown: number): number {
    if (drawdown < this.DRAWDOWN_THRESHOLDS.MINOR) {
      return 1.0; // No adjustment
    } else if (drawdown < this.DRAWDOWN_THRESHOLDS.MODERATE) {
      return 0.8; // Reduce 20%
    } else if (drawdown < this.DRAWDOWN_THRESHOLDS.SEVERE) {
      return 0.6; // Reduce 40%
    } else if (drawdown < this.DRAWDOWN_THRESHOLDS.CRITICAL) {
      return 0.4; // Reduce 60%
    } else {
      return 0.2; // Reduce 80%
    }
  }

  /**
   * Calculate streak multiplier (0.5-1.3)
   */
  private calculateStreakMultiplier(wins: number, losses: number): number {
    // Winning streak → increase size (but capped)
    if (wins >= 5) {
      return 1.3; // Max 30% increase
    } else if (wins >= 3) {
      return 1.15; // 15% increase
    } else if (wins >= 2) {
      return 1.05; // 5% increase
    }

    // Losing streak → reduce size
    if (losses >= 5) {
      return 0.5; // 50% reduction
    } else if (losses >= 3) {
      return 0.7; // 30% reduction
    } else if (losses >= 2) {
      return 0.85; // 15% reduction
    }

    return 1.0; // No adjustment
  }

  /**
   * Calculate correlation multiplier (0.5-1.0)
   */
  private calculateCorrelationMultiplier(correlatedPositions: number): number {
    // Each correlated position reduces size by 15%
    // Max reduction: 50% (if 4+ correlated positions)

    const reduction = Math.min(correlatedPositions * 0.15, 0.5);
    return 1.0 - reduction;
  }

  /**
   * Determine methodology used
   */
  private determineMethodology(
    signal: SignalParameters,
    kellySize: number,
    finalRisk: number
  ): PositionSizeRecommendation['methodology'] {
    if (Math.abs(kellySize - finalRisk) < 0.5) {
      return 'KELLY_CRITERION';
    } else if (signal.volatility > 60) {
      return 'VOLATILITY_ADJUSTED';
    } else if (signal.marketFitScore !== undefined) {
      return 'HYBRID';
    } else {
      return 'FIXED_FRACTIONAL';
    }
  }

  /**
   * Calculate confidence in recommendation (0-100)
   */
  private calculateRecommendationConfidence(
    signal: SignalParameters,
    account: AccountParameters,
    adjustmentsCount: number
  ): number {
    let confidence = 80; // Base confidence

    // High signal confidence → higher recommendation confidence
    if (signal.confidence >= 80) {
      confidence += 10;
    } else if (signal.confidence < 60) {
      confidence -= 10;
    }

    // Good R:R → higher confidence
    if (signal.riskRewardRatio >= 2.5) {
      confidence += 5;
    } else if (signal.riskRewardRatio < 1.5) {
      confidence -= 10;
    }

    // Many adjustments → lower confidence
    confidence -= adjustmentsCount * 3;

    // Drawdown → lower confidence
    if (account.currentDrawdown > 20) {
      confidence -= 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }
}

// Singleton instance
export const riskAwarePositionSizer = new RiskAwarePositionSizer();

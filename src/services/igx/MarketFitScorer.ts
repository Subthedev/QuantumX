/**
 * MARKET FIT SCORER
 * Scores how well signals align with current market conditions
 *
 * PURPOSE: Not all signals are equal - a LONG signal in a bear market is risky
 * This component evaluates signal-market alignment and assigns A/B/C/D/F grades
 *
 * EVALUATION FACTORS:
 * 1. Regime Alignment - Does signal direction match regime bias?
 * 2. Volatility Fit - Is volatility suitable for signal type?
 * 3. Liquidity Check - Sufficient liquidity for signal execution?
 * 4. Momentum Alignment - Does signal direction match momentum?
 * 5. Volume Profile - Is volume supportive or divergent?
 * 6. Market Phase - Accumulation/Markup/Distribution/Markdown fit
 * 7. Correlation Check - How correlated is asset with BTC?
 * 8. Trend Strength - Strong trend vs choppy sideways
 *
 * GRADING:
 * A (90-100): Excellent market fit - high probability setup
 * B (80-89): Good market fit - favorable conditions
 * C (70-79): Fair market fit - mixed signals
 * D (60-69): Poor market fit - challenging conditions
 * F (0-59): Bad market fit - avoid or reduce position
 */

import type { AlphaInsights } from './EventDrivenAlphaV3';

/**
 * Market fit score components
 */
interface MarketFitComponents {
  regimeAlignment: number; // 0-100
  volatilityFit: number; // 0-100
  liquidityCheck: number; // 0-100
  momentumAlignment: number; // 0-100
  volumeFit: number; // 0-100
  phaseFit: number; // 0-100
  correlationCheck: number; // 0-100
  trendStrength: number; // 0-100
}

/**
 * Market fit score with reasoning
 */
export interface MarketFitScore {
  // Overall score
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: 'EXCELLENT_FIT' | 'GOOD_FIT' | 'FAIR_FIT' | 'POOR_FIT' | 'BAD_FIT';

  // Component scores
  components: MarketFitComponents;

  // Detailed reasoning
  reasoning: string[];
  positiveFactors: string[];
  negativeFactors: string[];
  warnings: string[];

  // Confidence adjustment
  confidenceMultiplier: number; // 0.5-1.5 (multiply signal confidence by this)

  // Position size recommendation
  positionSizeMultiplier: number; // 0.25-1.5 (multiply position size by this)

  timestamp: number;
}

/**
 * Signal direction
 */
type SignalDirection = 'LONG' | 'SHORT';

export class MarketFitScorer {
  // Component weights (must sum to 1.0)
  private readonly WEIGHTS = {
    regimeAlignment: 0.25, // Most important
    volatilityFit: 0.15,
    liquidityCheck: 0.15,
    momentumAlignment: 0.15,
    volumeFit: 0.10,
    phaseFit: 0.10,
    correlationCheck: 0.05,
    trendStrength: 0.05
  };

  constructor() {
    console.log('[Market Fit Scorer] Initialized');
  }

  /**
   * Main method: Score signal's market fit
   */
  scoreMarketFit(
    symbol: string,
    direction: SignalDirection,
    alphaInsights: AlphaInsights
  ): MarketFitScore {
    console.log(`[Market Fit Scorer] 📊 Scoring ${symbol} ${direction} signal...`);

    // Calculate component scores
    const components: MarketFitComponents = {
      regimeAlignment: this.scoreRegimeAlignment(direction, alphaInsights),
      volatilityFit: this.scoreVolatilityFit(direction, alphaInsights),
      liquidityCheck: this.scoreLiquidityCheck(alphaInsights),
      momentumAlignment: this.scoreMomentumAlignment(direction, alphaInsights),
      volumeFit: this.scoreVolumeFit(direction, alphaInsights),
      phaseFit: this.scorePhaseFit(direction, alphaInsights),
      correlationCheck: this.scoreCorrelationCheck(symbol, alphaInsights),
      trendStrength: this.scoreTrendStrength(direction, alphaInsights)
    };

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(components);

    // Determine grade
    const grade = this.determineGrade(overallScore);

    // Get recommendation
    const recommendation = this.getRecommendation(grade);

    // Generate reasoning
    const { reasoning, positiveFactors, negativeFactors, warnings } = this.generateReasoning(
      direction,
      components,
      alphaInsights
    );

    // Calculate confidence multiplier (0.5-1.5)
    const confidenceMultiplier = this.calculateConfidenceMultiplier(overallScore);

    // Calculate position size multiplier (0.25-1.5)
    const positionSizeMultiplier = this.calculatePositionSizeMultiplier(overallScore, grade);

    const marketFitScore: MarketFitScore = {
      overallScore,
      grade,
      recommendation,
      components,
      reasoning,
      positiveFactors,
      negativeFactors,
      warnings,
      confidenceMultiplier,
      positionSizeMultiplier,
      timestamp: Date.now()
    };

    console.log(
      `[Market Fit Scorer] ✅ Score: ${overallScore.toFixed(0)}/100 (${grade}) - ${recommendation}`
    );

    return marketFitScore;
  }

  /**
   * Score regime alignment
   */
  private scoreRegimeAlignment(direction: SignalDirection, insights: AlphaInsights): number {
    const regime = insights.regime;
    let score = 50; // Neutral

    // Bull regime
    if (regime === 'BULL') {
      score = direction === 'LONG' ? 95 : 30; // LONG excellent, SHORT poor
    }
    // Bear regime
    else if (regime === 'BEAR') {
      score = direction === 'SHORT' ? 95 : 30; // SHORT excellent, LONG poor
    }
    // Sideways regime
    else if (regime === 'SIDEWAYS' || regime === 'RANGING') {
      score = 60; // Both directions fair (but range-bound)
    }
    // Volatile regime
    else if (regime === 'VOLATILE') {
      score = 50; // Neutral - can go either way
    }
    // Accumulation
    else if (regime === 'ACCUMULATION') {
      score = direction === 'LONG' ? 85 : 40; // LONG strong, SHORT weak
    }
    // Distribution
    else if (regime === 'DISTRIBUTION') {
      score = direction === 'SHORT' ? 85 : 40; // SHORT strong, LONG weak
    }

    return score;
  }

  /**
   * Score volatility fit
   */
  private scoreVolatilityFit(direction: SignalDirection, insights: AlphaInsights): number {
    const volatility = insights.volatility;
    let score = 70; // Default

    // Low volatility (0-30)
    if (volatility < 30) {
      score = 85; // Good for swing trades
    }
    // Moderate volatility (30-50)
    else if (volatility < 50) {
      score = 90; // Optimal
    }
    // High volatility (50-70)
    else if (volatility < 70) {
      score = 75; // OK but risky
    }
    // Extreme volatility (70-100)
    else {
      score = 50; // Very risky
    }

    return score;
  }

  /**
   * Score liquidity check
   */
  private scoreLiquidityCheck(insights: AlphaInsights): number {
    const liquidity = insights.liquidity;

    // Liquidity directly affects score
    // High liquidity (80-100) → 90-100 score
    // Medium liquidity (50-80) → 70-90 score
    // Low liquidity (0-50) → 30-70 score

    if (liquidity >= 80) {
      return 90 + (liquidity - 80) / 2; // 90-100
    } else if (liquidity >= 50) {
      return 70 + (liquidity - 50) * 0.67; // 70-90
    } else {
      return 30 + liquidity * 0.8; // 30-70
    }
  }

  /**
   * Score momentum alignment
   */
  private scoreMomentumAlignment(direction: SignalDirection, insights: AlphaInsights): number {
    const momentum = insights.momentum;
    const momentumStrength = insights.momentumStrength;

    let score = 50; // Neutral

    // Strong bullish momentum
    if (momentum === 'BULLISH' && momentumStrength > 60) {
      score = direction === 'LONG' ? 95 : 25; // LONG excellent, SHORT bad
    }
    // Moderate bullish momentum
    else if (momentum === 'BULLISH') {
      score = direction === 'LONG' ? 80 : 40; // LONG good, SHORT poor
    }
    // Strong bearish momentum
    else if (momentum === 'BEARISH' && momentumStrength > 60) {
      score = direction === 'SHORT' ? 95 : 25; // SHORT excellent, LONG bad
    }
    // Moderate bearish momentum
    else if (momentum === 'BEARISH') {
      score = direction === 'SHORT' ? 80 : 40; // SHORT good, LONG poor
    }
    // Neutral momentum
    else {
      score = 60; // Both OK
    }

    return score;
  }

  /**
   * Score volume fit
   */
  private scoreVolumeFit(direction: SignalDirection, insights: AlphaInsights): number {
    const volume = insights.volumeTrend;
    let score = 70; // Default

    // Rising volume
    if (volume === 'RISING' || volume === 'INCREASING') {
      score = 90; // Good for any direction
    }
    // Falling volume
    else if (volume === 'FALLING' || volume === 'DECREASING') {
      score = 50; // Concerning
    }
    // Stable volume
    else {
      score = 70; // OK
    }

    return score;
  }

  /**
   * Score phase fit
   */
  private scorePhaseFit(direction: SignalDirection, insights: AlphaInsights): number {
    const phase = insights.phase;
    let score = 60; // Default

    // Accumulation phase
    if (phase === 'ACCUMULATION') {
      score = direction === 'LONG' ? 90 : 35; // LONG great, SHORT poor
    }
    // Markup phase (bull run)
    else if (phase === 'MARKUP') {
      score = direction === 'LONG' ? 95 : 25; // LONG excellent, SHORT bad
    }
    // Distribution phase
    else if (phase === 'DISTRIBUTION') {
      score = direction === 'SHORT' ? 90 : 35; // SHORT great, LONG poor
    }
    // Markdown phase (bear market)
    else if (phase === 'MARKDOWN') {
      score = direction === 'SHORT' ? 95 : 25; // SHORT excellent, LONG bad
    }

    return score;
  }

  /**
   * Score correlation check (with BTC)
   */
  private scoreCorrelationCheck(symbol: string, insights: AlphaInsights): number {
    // For now, use a simple heuristic
    // In production, calculate actual correlation with BTC

    // BTC itself
    if (symbol === 'BTCUSDT' || symbol === 'BTC') {
      return 100;
    }

    // Major alts (usually 0.7-0.9 correlation with BTC)
    const majorAlts = ['ETH', 'BNB', 'SOL', 'ADA', 'AVAX', 'DOT', 'MATIC'];
    if (majorAlts.some(alt => symbol.includes(alt))) {
      return 85;
    }

    // Other alts (usually 0.5-0.7 correlation)
    return 70;
  }

  /**
   * Score trend strength
   */
  private scoreTrendStrength(direction: SignalDirection, insights: AlphaInsights): number {
    const trendStrength = insights.trendStrength;
    const trend = insights.trend;

    // Strong trend
    if (trendStrength > 70) {
      if (trend === 'BULLISH' && direction === 'LONG') return 95;
      if (trend === 'BEARISH' && direction === 'SHORT') return 95;
      if (trend === 'BULLISH' && direction === 'SHORT') return 20;
      if (trend === 'BEARISH' && direction === 'LONG') return 20;
    }
    // Moderate trend
    else if (trendStrength > 40) {
      if (trend === 'BULLISH' && direction === 'LONG') return 80;
      if (trend === 'BEARISH' && direction === 'SHORT') return 80;
      if (trend === 'BULLISH' && direction === 'SHORT') return 35;
      if (trend === 'BEARISH' && direction === 'LONG') return 35;
    }
    // Weak/no trend
    else {
      return 50; // Neutral
    }

    return 60; // Default
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(components: MarketFitComponents): number {
    const score =
      components.regimeAlignment * this.WEIGHTS.regimeAlignment +
      components.volatilityFit * this.WEIGHTS.volatilityFit +
      components.liquidityCheck * this.WEIGHTS.liquidityCheck +
      components.momentumAlignment * this.WEIGHTS.momentumAlignment +
      components.volumeFit * this.WEIGHTS.volumeFit +
      components.phaseFit * this.WEIGHTS.phaseFit +
      components.correlationCheck * this.WEIGHTS.correlationCheck +
      components.trendStrength * this.WEIGHTS.trendStrength;

    return Math.round(score);
  }

  /**
   * Determine grade from score
   */
  private determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get recommendation from grade
   */
  private getRecommendation(grade: 'A' | 'B' | 'C' | 'D' | 'F'): MarketFitScore['recommendation'] {
    switch (grade) {
      case 'A': return 'EXCELLENT_FIT';
      case 'B': return 'GOOD_FIT';
      case 'C': return 'FAIR_FIT';
      case 'D': return 'POOR_FIT';
      case 'F': return 'BAD_FIT';
    }
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    direction: SignalDirection,
    components: MarketFitComponents,
    insights: AlphaInsights
  ): {
    reasoning: string[];
    positiveFactors: string[];
    negativeFactors: string[];
    warnings: string[];
  } {
    const reasoning: string[] = [];
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];
    const warnings: string[] = [];

    // Regime alignment
    if (components.regimeAlignment >= 85) {
      positiveFactors.push(`${direction} signal aligns perfectly with ${insights.regime} regime`);
    } else if (components.regimeAlignment < 40) {
      negativeFactors.push(`${direction} signal conflicts with ${insights.regime} regime`);
      warnings.push('Signal direction opposes current market regime');
    }

    // Volatility
    if (components.volatilityFit >= 85) {
      positiveFactors.push(`Volatility level (${insights.volatility}) is optimal for swing trading`);
    } else if (components.volatilityFit < 60) {
      negativeFactors.push(`High volatility (${insights.volatility}) increases risk`);
      warnings.push('Extreme volatility - consider reducing position size');
    }

    // Liquidity
    if (components.liquidityCheck >= 80) {
      positiveFactors.push(`Strong liquidity (${insights.liquidity}) enables clean execution`);
    } else if (components.liquidityCheck < 60) {
      negativeFactors.push(`Low liquidity (${insights.liquidity}) may cause slippage`);
      warnings.push('Low liquidity - be cautious with large positions');
    }

    // Momentum
    if (components.momentumAlignment >= 85) {
      positiveFactors.push(`${direction} aligned with ${insights.momentum} momentum`);
    } else if (components.momentumAlignment < 40) {
      negativeFactors.push(`${direction} opposes ${insights.momentum} momentum`);
      warnings.push('Fighting momentum - higher risk trade');
    }

    // Volume
    if (components.volumeFit >= 85) {
      positiveFactors.push(`Volume trend (${insights.volumeTrend}) supports the move`);
    } else if (components.volumeFit < 60) {
      negativeFactors.push(`Weak volume (${insights.volumeTrend}) - lack of conviction`);
    }

    // Overall summary
    const positiveCount = positiveFactors.length;
    const negativeCount = negativeFactors.length;

    if (positiveCount > negativeCount + 1) {
      reasoning.push('Market conditions strongly favor this signal');
    } else if (positiveCount > negativeCount) {
      reasoning.push('Market conditions moderately favor this signal');
    } else if (positiveCount === negativeCount) {
      reasoning.push('Market conditions are mixed for this signal');
    } else {
      reasoning.push('Market conditions do not favor this signal');
    }

    return { reasoning, positiveFactors, negativeFactors, warnings };
  }

  /**
   * Calculate confidence multiplier (0.5-1.5)
   */
  private calculateConfidenceMultiplier(score: number): number {
    // Score 90-100 → multiplier 1.3-1.5 (boost confidence)
    // Score 80-90 → multiplier 1.1-1.3
    // Score 70-80 → multiplier 0.9-1.1 (neutral)
    // Score 60-70 → multiplier 0.7-0.9 (reduce confidence)
    // Score 0-60 → multiplier 0.5-0.7 (significantly reduce)

    if (score >= 90) {
      return 1.3 + (score - 90) * 0.02; // 1.3-1.5
    } else if (score >= 80) {
      return 1.1 + (score - 80) * 0.02; // 1.1-1.3
    } else if (score >= 70) {
      return 0.9 + (score - 70) * 0.02; // 0.9-1.1
    } else if (score >= 60) {
      return 0.7 + (score - 60) * 0.02; // 0.7-0.9
    } else {
      return 0.5 + score * 0.003; // 0.5-0.7
    }
  }

  /**
   * Calculate position size multiplier (0.25-1.5)
   */
  private calculatePositionSizeMultiplier(score: number, grade: 'A' | 'B' | 'C' | 'D' | 'F'): number {
    switch (grade) {
      case 'A': return 1.5; // Increase position size 50%
      case 'B': return 1.2; // Increase position size 20%
      case 'C': return 1.0; // Standard position size
      case 'D': return 0.5; // Reduce position size 50%
      case 'F': return 0.25; // Reduce position size 75%
    }
  }
}

// Singleton instance
export const marketFitScorer = new MarketFitScorer();

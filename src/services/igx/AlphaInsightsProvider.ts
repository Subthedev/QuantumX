/**
 * ALPHA INSIGHTS PROVIDER
 *
 * Generates rich context for Beta Model and Opportunity Scorer
 * Provides market intelligence, risk state, quality expectations, and strategic guidance
 */

import type { MarketRegime } from './AdaptiveFrequencyController';

export interface RegimeCharacteristics {
  regime: MarketRegime;
  confidence: number; // 0-100
  duration: number; // ms in current regime
  expectedDuration: number; // ms expected remaining
  description: string;
}

export interface MarketMetrics {
  volatilityScore: number; // 0-100
  volumeScore: number; // 0-100
  sentimentScore: number; // 0-100
  whaleScore: number; // 0-100
  fundingScore: number; // 0-100
  orderbookScore: number; // 0-100
  qualityScore: number; // 0-100
  compositeScore: number; // Weighted average
  timestamp: number;
}

export interface ThresholdSet {
  patternStrength: number;
  consensusThreshold: number;
  riskReward: number;
  liquidityMin: number;
  dataQualityMin: number;
}

export interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  avgRiskReward: number;
  opportunitiesCaptured: number;
  opportunitiesMissed: number;
}

export interface AlphaInsights {
  // Regime context
  currentRegime: RegimeCharacteristics;
  regimeDuration: number;
  regimeConfidence: number;
  expectedRegimeDuration: number;

  // Market intelligence
  marketCondition: 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE';
  volatilityLevel: 'EXTREME' | 'HIGH' | 'NORMAL' | 'LOW';
  liquidityLevel: 'ABUNDANT' | 'NORMAL' | 'THIN';
  sentimentBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH';

  // Risk state
  currentDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  riskLevel: 'SAFE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

  // Quality expectations
  minPatternStrength: number;
  minConsensus: number;
  minRiskReward: number;
  minDataQuality: number;

  // Frequency guidance
  targetSignalRate: number;
  currentSignalRate: number;
  signalBudgetRemaining: number;

  // Strategic guidance
  preferredStrategies: string[];
  avoidStrategies: string[];
  reasoning: string[];

  // Metadata
  timestamp: number;
  confidence: number;
}

export class AlphaInsightsProvider {
  /**
   * Generate comprehensive insights from Alpha's hot cache
   */
  generateInsights(
    regime: RegimeCharacteristics,
    marketMetrics: MarketMetrics,
    riskMetrics: RiskMetrics,
    thresholds: ThresholdSet
  ): AlphaInsights {
    // Determine market condition
    const marketCondition = this.classifyMarketCondition(marketMetrics);

    // Determine volatility level
    const volatilityLevel = this.classifyVolatility(marketMetrics.volatilityScore);

    // Determine liquidity level
    const liquidityLevel = this.classifyLiquidity(marketMetrics.orderbookScore);

    // Determine sentiment bias
    const sentimentBias = this.classifySentiment(marketMetrics.sentimentScore);

    // Determine risk level
    const riskLevel = this.classifyRiskLevel(riskMetrics);

    // Calculate signal rate metrics
    const targetSignalRate = this.getTargetSignalRate(regime.regime);
    const currentSignalRate = 0; // Will be updated by frequency controller
    const signalBudgetRemaining = Math.max(0, targetSignalRate - currentSignalRate);

    // Get strategic guidance
    const { preferredStrategies, avoidStrategies } = this.getStrategicGuidance(
      regime.regime,
      marketCondition,
      riskLevel
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      regime,
      marketCondition,
      riskLevel,
      volatilityLevel
    );

    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      regime.confidence,
      marketMetrics.qualityScore,
      riskMetrics
    );

    return {
      // Regime context
      currentRegime: regime,
      regimeDuration: regime.duration,
      regimeConfidence: regime.confidence,
      expectedRegimeDuration: regime.expectedDuration,

      // Market intelligence
      marketCondition,
      volatilityLevel,
      liquidityLevel,
      sentimentBias,

      // Risk state
      currentDrawdown: riskMetrics.currentDrawdown,
      sharpeRatio: riskMetrics.sharpeRatio,
      winRate: riskMetrics.winRate,
      riskLevel,

      // Quality expectations
      minPatternStrength: thresholds.patternStrength,
      minConsensus: thresholds.consensusThreshold,
      minRiskReward: thresholds.riskReward,
      minDataQuality: thresholds.dataQualityMin,

      // Frequency guidance
      targetSignalRate,
      currentSignalRate,
      signalBudgetRemaining,

      // Strategic guidance
      preferredStrategies,
      avoidStrategies,
      reasoning,

      // Metadata
      timestamp: Date.now(),
      confidence
    };
  }

  /**
   * Classify overall market condition
   */
  private classifyMarketCondition(metrics: MarketMetrics): 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE' {
    if (metrics.compositeScore >= 70) return 'FAVORABLE';
    if (metrics.compositeScore <= 40) return 'UNFAVORABLE';
    return 'NEUTRAL';
  }

  /**
   * Classify volatility level
   */
  private classifyVolatility(score: number): 'EXTREME' | 'HIGH' | 'NORMAL' | 'LOW' {
    if (score >= 80) return 'EXTREME';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'NORMAL';
    return 'LOW';
  }

  /**
   * Classify liquidity level
   */
  private classifyLiquidity(score: number): 'ABUNDANT' | 'NORMAL' | 'THIN' {
    if (score >= 70) return 'ABUNDANT';
    if (score >= 40) return 'NORMAL';
    return 'THIN';
  }

  /**
   * Classify sentiment bias
   */
  private classifySentiment(score: number): 'BULLISH' | 'NEUTRAL' | 'BEARISH' {
    if (score >= 60) return 'BULLISH';
    if (score <= 40) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Classify risk level
   */
  private classifyRiskLevel(metrics: RiskMetrics): 'SAFE' | 'ELEVATED' | 'HIGH' | 'CRITICAL' {
    const drawdownPercent = Math.abs(metrics.currentDrawdown);

    if (drawdownPercent >= 10) return 'CRITICAL';
    if (drawdownPercent >= 5) return 'HIGH';
    if (drawdownPercent >= 3) return 'ELEVATED';
    return 'SAFE';
  }

  /**
   * Get target signal rate for regime
   */
  private getTargetSignalRate(regime: MarketRegime): number {
    const rateMap: Record<MarketRegime, number> = {
      BULL_TRENDING: 6, // 3-10 signals/hour → target 6
      BEAR_TRENDING: 3.5, // 2-5 signals/hour → target 3.5
      RANGING: 1.5, // 0.5-3 signals/hour → target 1.5
      HIGH_VOLATILITY: 2.5, // 1-4 signals/hour → target 2.5
      LOW_VOLATILITY: 1, // 0.5-2 signals/hour → target 1
      UNKNOWN: 2 // 1-3 signals/hour → target 2
    };

    return rateMap[regime];
  }

  /**
   * Get strategic guidance (which strategies to use/avoid)
   */
  private getStrategicGuidance(
    regime: MarketRegime,
    marketCondition: string,
    riskLevel: string
  ): { preferredStrategies: string[]; avoidStrategies: string[] } {
    const preferred: string[] = [];
    const avoid: string[] = [];

    // Regime-based preferences
    switch (regime) {
      case 'BULL_TRENDING':
        preferred.push('MOMENTUM_SURGE', 'GOLDEN_CROSS_MOMENTUM', 'WHALE_SHADOW');
        avoid.push('FEAR_GREED_CONTRARIAN', 'SPRING_TRAP');
        break;

      case 'BEAR_TRENDING':
        preferred.push('FUNDING_SQUEEZE', 'FEAR_GREED_CONTRARIAN', 'ORDER_FLOW_TSUNAMI');
        avoid.push('MOMENTUM_SURGE', 'GOLDEN_CROSS_MOMENTUM');
        break;

      case 'RANGING':
        preferred.push('SPRING_TRAP', 'LIQUIDITY_HUNTER', 'MARKET_PHASE_SNIPER');
        avoid.push('MOMENTUM_SURGE', 'VOLATILITY_BREAKOUT');
        break;

      case 'HIGH_VOLATILITY':
        preferred.push('VOLATILITY_BREAKOUT', 'ORDER_FLOW_TSUNAMI', 'WHALE_SHADOW');
        avoid.push('SPRING_TRAP', 'MARKET_PHASE_SNIPER');
        break;

      case 'LOW_VOLATILITY':
        preferred.push('SPRING_TRAP', 'LIQUIDITY_HUNTER', 'ACCUMULATION_DETECTOR');
        avoid.push('VOLATILITY_BREAKOUT', 'MOMENTUM_SURGE');
        break;

      default:
        preferred.push('MARKET_PHASE_SNIPER', 'WHALE_SHADOW');
        break;
    }

    // Risk-based adjustments
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      avoid.push('VOLATILITY_BREAKOUT', 'MOMENTUM_SURGE');
      preferred.push('LIQUIDITY_HUNTER'); // Safer strategy
    }

    // Market condition adjustments
    if (marketCondition === 'UNFAVORABLE') {
      avoid.push('MOMENTUM_SURGE', 'GOLDEN_CROSS_MOMENTUM');
    }

    return { preferredStrategies: preferred, avoidStrategies: avoid };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    regime: RegimeCharacteristics,
    marketCondition: string,
    riskLevel: string,
    volatilityLevel: string
  ): string[] {
    const reasoning: string[] = [];

    // Regime reasoning
    reasoning.push(`Market regime: ${regime.regime} (${regime.confidence}% confidence)`);
    reasoning.push(regime.description);

    // Market condition reasoning
    if (marketCondition === 'FAVORABLE') {
      reasoning.push('Market conditions are favorable for signal generation');
    } else if (marketCondition === 'UNFAVORABLE') {
      reasoning.push('Market conditions are challenging - increased selectivity recommended');
    }

    // Volatility reasoning
    if (volatilityLevel === 'EXTREME') {
      reasoning.push('Extreme volatility detected - exercise caution');
    } else if (volatilityLevel === 'LOW') {
      reasoning.push('Low volatility - wait for clearer setups');
    }

    // Risk reasoning
    if (riskLevel === 'CRITICAL') {
      reasoning.push('CRITICAL: Maximum drawdown reached - pausing signal generation');
    } else if (riskLevel === 'HIGH') {
      reasoning.push('High risk level - reducing signal generation rate');
    } else if (riskLevel === 'SAFE') {
      reasoning.push('Risk metrics healthy - normal operation');
    }

    return reasoning;
  }

  /**
   * Calculate overall confidence in insights
   */
  private calculateConfidence(
    regimeConfidence: number,
    dataQuality: number,
    riskMetrics: RiskMetrics
  ): number {
    // Weighted combination
    const regimeWeight = 0.4;
    const dataQualityWeight = 0.4;
    const performanceWeight = 0.2;

    // Performance score based on Sharpe ratio
    const performanceScore = Math.min(100, Math.max(0, (riskMetrics.sharpeRatio / 3.0) * 100));

    const confidence =
      regimeConfidence * regimeWeight +
      dataQuality * dataQualityWeight +
      performanceScore * performanceWeight;

    return Math.round(confidence);
  }

  /**
   * Get human-readable market intelligence summary
   */
  getMarketIntelligenceSummary(insights: AlphaInsights): string {
    const parts: string[] = [];

    // Regime
    parts.push(`${insights.currentRegime.regime} market`);

    // Condition
    parts.push(`${insights.marketCondition.toLowerCase()} conditions`);

    // Volatility
    if (insights.volatilityLevel !== 'NORMAL') {
      parts.push(`${insights.volatilityLevel.toLowerCase()} volatility`);
    }

    // Risk
    if (insights.riskLevel !== 'SAFE') {
      parts.push(`${insights.riskLevel.toLowerCase()} risk`);
    }

    return parts.join(', ');
  }
}

// Singleton instance
export const alphaInsightsProvider = new AlphaInsightsProvider();

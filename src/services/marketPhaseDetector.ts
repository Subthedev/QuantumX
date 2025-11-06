/**
 * Market Phase Detection Engine
 * Identifies market cycles: Accumulation, Markup, Distribution, Markdown
 * This is CRITICAL for adaptive signal weighting
 */

export type MarketPhase = 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN';

export interface PhaseDetectionResult {
  phase: MarketPhase;
  confidence: number; // 0-100
  characteristics: string[];
  reasoning: string;
  weights: PhaseWeights;
}

export interface PhaseWeights {
  onChain: number;
  orderBook: number;
  fundingRates: number;
  sentiment: number;
  marketData: number;
  technical: number;
}

interface PhaseIndicators {
  fearGreedIndex: number;
  exchangeFlowRatio: number; // positive = inflows, negative = outflows
  fundingRate: number;
  priceVolatility: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  priceMomentum: number; // 24h price change
  orderBookImbalance: number; // bid/ask ratio
}

class MarketPhaseDetector {
  /**
   * Detect current market phase based on multi-factor analysis
   */
  detectPhase(indicators: PhaseIndicators): PhaseDetectionResult {
    console.log('[PhaseDetector] Analyzing market phase with indicators:', indicators);

    const {
      fearGreedIndex,
      exchangeFlowRatio,
      fundingRate,
      priceVolatility,
      volumeTrend,
      priceMomentum,
      orderBookImbalance
    } = indicators;

    // ACCUMULATION DETECTION
    const accumulationScore = this.calculateAccumulationScore(indicators);

    // DISTRIBUTION DETECTION
    const distributionScore = this.calculateDistributionScore(indicators);

    // MARKUP DETECTION (Trending up)
    const markupScore = this.calculateMarkupScore(indicators);

    // MARKDOWN DETECTION (Trending down)
    const markdownScore = this.calculateMarkdownScore(indicators);

    // Find dominant phase
    const scores = [
      { phase: 'ACCUMULATION' as MarketPhase, score: accumulationScore },
      { phase: 'DISTRIBUTION' as MarketPhase, score: distributionScore },
      { phase: 'MARKUP' as MarketPhase, score: markupScore },
      { phase: 'MARKDOWN' as MarketPhase, score: markdownScore }
    ];

    scores.sort((a, b) => b.score - a.score);
    const detectedPhase = scores[0];

    console.log('[PhaseDetector] Phase scores:', scores);
    console.log(`[PhaseDetector] Detected phase: ${detectedPhase.phase} (${detectedPhase.score}% confidence)`);

    const characteristics = this.getPhaseCharacteristics(detectedPhase.phase, indicators);
    const reasoning = this.getPhaseReasoning(detectedPhase.phase, indicators);
    const weights = this.getPhaseWeights(detectedPhase.phase);

    return {
      phase: detectedPhase.phase,
      confidence: Math.round(detectedPhase.score),
      characteristics,
      reasoning,
      weights
    };
  }

  /**
   * Calculate ACCUMULATION phase score
   * Whales buying during fear
   */
  private calculateAccumulationScore(indicators: PhaseIndicators): number {
    let score = 0;
    const {
      fearGreedIndex,
      exchangeFlowRatio,
      fundingRate,
      priceMomentum,
      orderBookImbalance,
      volumeTrend
    } = indicators;

    // 1. Extreme Fear (retail capitulation)
    if (fearGreedIndex < 25) score += 30; // Extreme fear
    else if (fearGreedIndex < 40) score += 15; // Fear

    // 2. Exchange OUTFLOWS (whales withdrawing = accumulation)
    if (exchangeFlowRatio < -1.5) score += 35; // Strong outflows
    else if (exchangeFlowRatio < -0.5) score += 20; // Moderate outflows

    // 3. Negative Funding (shorts dominating = squeeze potential)
    if (fundingRate < -0.05) score += 20; // Negative funding
    else if (fundingRate < 0) score += 10; // Slightly negative

    // 4. Price consolidation or slight decline
    if (priceMomentum >= -5 && priceMomentum <= 2) score += 10; // Consolidating

    // 5. Hidden buying pressure (order book)
    if (orderBookImbalance > 1.2) score += 5; // Bids building

    return Math.min(100, score);
  }

  /**
   * Calculate DISTRIBUTION phase score
   * Whales selling during greed
   */
  private calculateDistributionScore(indicators: PhaseIndicators): number {
    let score = 0;
    const {
      fearGreedIndex,
      exchangeFlowRatio,
      fundingRate,
      priceMomentum,
      orderBookImbalance,
      volumeTrend
    } = indicators;

    // 1. Extreme Greed (retail euphoria)
    if (fearGreedIndex > 75) score += 30; // Extreme greed
    else if (fearGreedIndex > 60) score += 15; // Greed

    // 2. Exchange INFLOWS (whales depositing = distribution)
    if (exchangeFlowRatio > 1.5) score += 35; // Strong inflows
    else if (exchangeFlowRatio > 0.5) score += 20; // Moderate inflows

    // 3. Extreme Positive Funding (overleveraged longs)
    if (fundingRate > 0.10) score += 20; // Extreme positive
    else if (fundingRate > 0.05) score += 10; // Elevated

    // 4. Price momentum slowing (exhaustion)
    if (priceMomentum > 0 && priceMomentum < 3) score += 10; // Slowing gains

    // 5. Sell pressure building (order book)
    if (orderBookImbalance < 0.9) score += 5; // Asks building

    return Math.min(100, score);
  }

  /**
   * Calculate MARKUP phase score
   * Trending upward
   */
  private calculateMarkupScore(indicators: PhaseIndicators): number {
    let score = 0;
    const {
      fearGreedIndex,
      priceMomentum,
      volumeTrend,
      fundingRate,
      orderBookImbalance
    } = indicators;

    // 1. Neutral to positive sentiment (not extreme)
    if (fearGreedIndex >= 45 && fearGreedIndex <= 65) score += 20; // Neutral/balanced

    // 2. Strong positive momentum
    if (priceMomentum > 5) score += 30; // Strong uptrend
    else if (priceMomentum > 2) score += 15; // Moderate uptrend

    // 3. Increasing volume
    if (volumeTrend === 'increasing') score += 20;

    // 4. Healthy positive funding (not extreme)
    if (fundingRate > 0 && fundingRate < 0.08) score += 15; // Healthy

    // 5. Buy pressure
    if (orderBookImbalance > 1.1) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculate MARKDOWN phase score
   * Trending downward
   */
  private calculateMarkdownScore(indicators: PhaseIndicators): number {
    let score = 0;
    const {
      fearGreedIndex,
      priceMomentum,
      volumeTrend,
      fundingRate,
      orderBookImbalance
    } = indicators;

    // 1. Neutral to fearful sentiment (not extreme panic)
    if (fearGreedIndex >= 30 && fearGreedIndex <= 50) score += 15;

    // 2. Negative momentum
    if (priceMomentum < -5) score += 30; // Strong downtrend
    else if (priceMomentum < -2) score += 15; // Moderate downtrend

    // 3. Decreasing volume
    if (volumeTrend === 'decreasing') score += 20;

    // 4. Negative or neutral funding
    if (fundingRate < 0 && fundingRate > -0.08) score += 15;

    // 5. Sell pressure
    if (orderBookImbalance < 0.95) score += 20;

    return Math.min(100, score);
  }

  /**
   * Get phase-specific characteristics
   */
  private getPhaseCharacteristics(phase: MarketPhase, indicators: PhaseIndicators): string[] {
    const characteristics: string[] = [];

    switch (phase) {
      case 'ACCUMULATION':
        if (indicators.fearGreedIndex < 25) characteristics.push('Extreme Fear');
        if (indicators.exchangeFlowRatio < -1.0) characteristics.push('Large Exchange Outflows');
        if (indicators.fundingRate < -0.05) characteristics.push('Negative Funding Rate');
        characteristics.push('Smart Money Accumulation Pattern');
        break;

      case 'DISTRIBUTION':
        if (indicators.fearGreedIndex > 75) characteristics.push('Extreme Greed');
        if (indicators.exchangeFlowRatio > 1.0) characteristics.push('Large Exchange Inflows');
        if (indicators.fundingRate > 0.10) characteristics.push('Overleveraged Longs');
        characteristics.push('Institutional Distribution Pattern');
        break;

      case 'MARKUP':
        characteristics.push('Uptrend Confirmed');
        if (indicators.volumeTrend === 'increasing') characteristics.push('Volume Increasing');
        characteristics.push('Trend Following Opportunity');
        break;

      case 'MARKDOWN':
        characteristics.push('Downtrend Confirmed');
        characteristics.push('Avoid Long Positions');
        break;
    }

    return characteristics;
  }

  /**
   * Get phase reasoning explanation
   */
  private getPhaseReasoning(phase: MarketPhase, indicators: PhaseIndicators): string {
    const exchangeFlow = indicators.exchangeFlowRatio?.toFixed(2) ?? 'N/A';
    const fundingRate = indicators.fundingRate !== undefined ? (indicators.fundingRate * 100).toFixed(3) : 'N/A';
    const priceMomentum = indicators.priceMomentum?.toFixed(2) ?? 'N/A';

    switch (phase) {
      case 'ACCUMULATION':
        return `Accumulation phase detected: Fear Index ${indicators.fearGreedIndex}, ` +
               `Exchange Flow Ratio ${exchangeFlow} (outflows), ` +
               `Funding Rate ${fundingRate}%. ` +
               `Whales are likely accumulating during retail fear.`;

      case 'DISTRIBUTION':
        return `Distribution phase detected: Greed Index ${indicators.fearGreedIndex}, ` +
               `Exchange Flow Ratio ${exchangeFlow} (inflows), ` +
               `Funding Rate ${fundingRate}%. ` +
               `Institutions may be distributing to euphoric retail.`;

      case 'MARKUP':
        return `Markup phase detected: Price momentum ${priceMomentum}%, ` +
               `Volume trend ${indicators.volumeTrend}. ` +
               `Clear uptrend in progress - trend following recommended.`;

      case 'MARKDOWN':
        return `Markdown phase detected: Price momentum ${priceMomentum}%, ` +
               `Downtrend confirmed. Risk management critical.`;

      default:
        return 'Phase analysis complete.';
    }
  }

  /**
   * Get adaptive weights for each phase
   * CRITICAL: This is what makes the system professional-grade
   */
  private getPhaseWeights(phase: MarketPhase): PhaseWeights {
    switch (phase) {
      case 'ACCUMULATION':
        // Hard data dominates, sentiment is INVERSE
        return {
          onChain: 0.35,      // PRIMARY - Whale accumulation
          orderBook: 0.30,    // Secondary - Buy pressure
          fundingRates: 0.20, // Tertiary - Short squeeze potential
          sentiment: 0.10,    // INVERSE - Fear = Buy
          marketData: 0.05,   // Context only
          technical: 0.00     // Ignored in accumulation
        };

      case 'DISTRIBUTION':
        // Hard data dominates, sentiment is INVERSE
        return {
          onChain: 0.40,      // PRIMARY - Whale distribution
          fundingRates: 0.25, // Secondary - Overleveraged longs
          orderBook: 0.20,    // Tertiary - Sell pressure
          sentiment: 0.10,    // INVERSE - Greed = Sell
          marketData: 0.05,   // Context only
          technical: 0.00     // Ignored in distribution
        };

      case 'MARKUP':
        // Technical matters now, trend following
        return {
          technical: 0.35,    // PRIMARY - Trend indicators
          orderBook: 0.25,    // Secondary - Flow confirmation
          marketData: 0.20,   // Tertiary - Momentum
          fundingRates: 0.10, // Check for extremes
          onChain: 0.05,      // Background context
          sentiment: 0.05     // Minor confirmation
        };

      case 'MARKDOWN':
        // Defensive - avoid trades
        return {
          technical: 0.30,
          orderBook: 0.25,
          fundingRates: 0.20,
          marketData: 0.15,
          onChain: 0.05,
          sentiment: 0.05
        };

      default:
        // Fallback to balanced weights
        return {
          onChain: 0.20,
          orderBook: 0.20,
          fundingRates: 0.20,
          sentiment: 0.15,
          marketData: 0.15,
          technical: 0.10
        };
    }
  }
}

export const marketPhaseDetector = new MarketPhaseDetector();

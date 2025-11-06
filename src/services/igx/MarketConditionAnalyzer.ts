/**
 * Market Condition Analyzer
 * Analyzes 7 key metrics to produce composite market score
 * NOW: Event-driven - emits regime changes and market updates
 */

import { igxDataEngineV4Enhanced } from './IGXDataEngineV4Enhanced';
import { alphaGammaCommunicator } from './AlphaGammaCommunicator';
import type { IGXTicker } from './IGXDataEngineV4Enhanced';
import type {
  MarketMetrics,
  MarketRegime,
  RegimeCharacteristics
} from '@/types/igx-enhanced';

export class MarketConditionAnalyzer {
  private lastAnalysis: MarketMetrics | null = null;
  private regimeHistory: Array<{ regime: MarketRegime; timestamp: number }> = [];
  private currentRegime: RegimeCharacteristics | null = null;
  private readonly MAX_HISTORY = 100;
  private readonly REGIME_CHANGE_CONFIDENCE_THRESHOLD = 80;

  // Metric weights for composite score
  private readonly WEIGHTS = {
    volatility: 0.20,
    volume: 0.15,
    sentiment: 0.15,
    whale: 0.20,
    funding: 0.10,
    orderbook: 0.10,
    quality: 0.10
  };

  /**
   * Analyze current market conditions for a symbol
   */
  analyzeMarket(symbol: string = 'BTCUSDT'): MarketMetrics {
    const ticker = igxDataEngineV4Enhanced.getTicker(symbol);

    if (!ticker) {
      console.warn(`[Market Analyzer] No ticker data for ${symbol}, using defaults`);
      return this.getDefaultMetrics();
    }

    const volatilityScore = this.calculateVolatilityScore(ticker);
    const volumeScore = this.calculateVolumeScore(ticker);
    const sentimentScore = this.calculateSentimentScore();
    const whaleScore = this.calculateWhaleScore(symbol);
    const fundingScore = this.calculateFundingScore(symbol);
    const orderbookScore = this.calculateOrderbookScore(symbol);
    const qualityScore = this.calculateQualityScore();

    const compositeScore =
      volatilityScore * this.WEIGHTS.volatility +
      volumeScore * this.WEIGHTS.volume +
      sentimentScore * this.WEIGHTS.sentiment +
      whaleScore * this.WEIGHTS.whale +
      fundingScore * this.WEIGHTS.funding +
      orderbookScore * this.WEIGHTS.orderbook +
      qualityScore * this.WEIGHTS.quality;

    const metrics: MarketMetrics = {
      volatilityScore,
      volumeScore,
      sentimentScore,
      whaleScore,
      fundingScore,
      orderbookScore,
      qualityScore,
      compositeScore: Math.round(compositeScore * 100) / 100,
      timestamp: Date.now()
    };

    this.lastAnalysis = metrics;

    // 🔥 EVENT EMISSION: Publish market update for event-driven consumers
    alphaGammaCommunicator.publishMarketUpdate(metrics);

    return metrics;
  }

  /**
   * Calculate volatility score (0-100)
   * Higher = more volatile
   */
  private calculateVolatilityScore(ticker: IGXTicker): number {
    // Calculate price velocity (% change per second)
    const now = Date.now();
    const timeDelta = (now - ticker.timestamp) / 1000; // seconds
    const priceVelocity = Math.abs(ticker.change24h / timeDelta);

    // Calculate 24h range as % of price
    const range24h = ((ticker.high24h - ticker.low24h) / ticker.price) * 100;

    // Normalize to 0-100 scale
    const velocityScore = Math.min(priceVelocity * 1000, 100); // 0.1%/s = 100
    const rangeScore = Math.min(range24h * 2, 100); // 50% range = 100

    // Weighted average
    return (velocityScore * 0.4 + rangeScore * 0.6);
  }

  /**
   * Calculate volume score (0-100)
   * Higher = more volume activity
   */
  private calculateVolumeScore(ticker: IGXTicker): number {
    // Normalize volume (assuming typical 24h volume is $10M-$1B)
    const volumeNormalized = Math.log10(ticker.volume24h + 1) / Math.log10(1e9);
    const volumeScore = Math.min(volumeNormalized * 100, 100);

    // Use volume distribution as quality indicator
    const distributionScore = Math.min(ticker.exchangeSources.length * 10, 100);

    // Smart money flow indicator
    const smartMoneyScore = ((ticker.smartMoneyFlow + 1) / 2) * 100; // -1 to 1 → 0 to 100

    // Weighted average
    return (
      volumeScore * 0.5 +
      distributionScore * 0.25 +
      smartMoneyScore * 0.25
    );
  }

  /**
   * Calculate sentiment score (0-100)
   * Uses Fear & Greed Index
   */
  private calculateSentimentScore(): number {
    const sentiment = igxDataEngineV4Enhanced.getSentiment();

    if (!sentiment) {
      return 50; // Neutral default
    }

    // Fear & Greed Index is already 0-100
    return sentiment.fearGreedIndex;
  }

  /**
   * Calculate whale activity score (0-100)
   * Higher = more whale accumulation (bullish)
   * Lower = more whale distribution (bearish)
   */
  private calculateWhaleScore(symbol: string): number {
    const whaleActivity = igxDataEngineV4Enhanced.getWhaleActivity(symbol);

    if (!whaleActivity) {
      return 50; // Neutral default
    }

    // Accumulation score is already 0-100
    const accumulation = whaleActivity.whaleAccumulationScore;
    const distribution = whaleActivity.whaleDistributionScore;

    // Net whale sentiment: accumulation minus distribution
    // High accumulation + low distribution = bullish = high score
    // Low accumulation + high distribution = bearish = low score
    const netScore = (accumulation - distribution + 100) / 2;

    return Math.max(0, Math.min(100, netScore));
  }

  /**
   * Calculate funding rate score (0-100)
   * 50 = neutral (0% funding)
   * >50 = positive funding (longs pay shorts, bullish pressure)
   * <50 = negative funding (shorts pay longs, bearish pressure)
   */
  private calculateFundingScore(symbol: string): number {
    const funding = igxDataEngineV4Enhanced.getFundingRate(symbol);

    if (!funding) {
      return 50; // Neutral default
    }

    // Funding rates typically range from -0.5% to +0.5%
    // Normalize to 0-100 scale
    const normalizedRate = (funding.fundingRate / 0.005) * 50 + 50;

    return Math.max(0, Math.min(100, normalizedRate));
  }

  /**
   * Calculate orderbook imbalance score (0-100)
   * 50 = balanced
   * >50 = more buy pressure
   * <50 = more sell pressure
   */
  private calculateOrderbookScore(symbol: string): number {
    const orderbook = igxDataEngineV4Enhanced.getOrderBook(symbol);

    if (!orderbook || !orderbook.bids?.length || !orderbook.asks?.length) {
      return 50; // Neutral default
    }

    // Calculate bid depth (top 20 bids)
    const bidDepth = orderbook.bids
      .slice(0, 20)
      .reduce((sum, [price, qty]) => sum + (price * qty), 0);

    // Calculate ask depth (top 20 asks)
    const askDepth = orderbook.asks
      .slice(0, 20)
      .reduce((sum, [price, qty]) => sum + (price * qty), 0);

    // Calculate imbalance: (bid - ask) / (bid + ask)
    const totalDepth = bidDepth + askDepth;
    if (totalDepth === 0) return 50;

    const imbalance = (bidDepth - askDepth) / totalDepth;

    // Normalize to 0-100 scale (-1 to 1 → 0 to 100)
    const score = (imbalance + 1) * 50;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate data quality score (0-100)
   */
  private calculateQualityScore(): number {
    const stats = igxDataEngineV4Enhanced.getStats();

    if (!stats) {
      return 0;
    }

    // Data quality is already 0-100 from the engine
    return stats.dataQuality;
  }

  /**
   * Detect current market regime
   */
  detectRegime(): RegimeCharacteristics {
    if (!this.lastAnalysis) {
      this.lastAnalysis = this.analyzeMarket();
    }

    const metrics = this.lastAnalysis;
    let regime: MarketRegime = 'UNKNOWN';
    let confidence = 0;
    let description = '';

    // HIGH VOLATILITY: Volatility > 70
    if (metrics.volatilityScore > 70) {
      regime = 'HIGH_VOLATILITY';
      confidence = Math.min(metrics.volatilityScore, 100);
      description = 'Extreme price swings, high risk environment';
    }
    // LOW VOLATILITY: Volatility < 30
    else if (metrics.volatilityScore < 30) {
      regime = 'LOW_VOLATILITY';
      confidence = Math.min(100 - metrics.volatilityScore, 100);
      description = 'Stable prices, low movement, accumulation phase';
    }
    // BULL TRENDING: Composite > 60, whale accumulation, positive sentiment
    else if (
      metrics.compositeScore > 60 &&
      metrics.whaleScore > 55 &&
      metrics.sentimentScore > 55
    ) {
      regime = 'BULL_TRENDING';
      confidence = Math.min((metrics.compositeScore + metrics.whaleScore + metrics.sentimentScore) / 3, 100);
      description = 'Strong uptrend with whale accumulation';
    }
    // BEAR TRENDING: Composite < 40, whale distribution, negative sentiment
    else if (
      metrics.compositeScore < 40 &&
      metrics.whaleScore < 45 &&
      metrics.sentimentScore < 45
    ) {
      regime = 'BEAR_TRENDING';
      confidence = Math.min((100 - metrics.compositeScore + 100 - metrics.whaleScore + 100 - metrics.sentimentScore) / 3, 100);
      description = 'Strong downtrend with whale distribution';
    }
    // RANGING: Composite near 50, low volatility
    else {
      regime = 'RANGING';
      confidence = Math.min(100 - Math.abs(metrics.compositeScore - 50) * 2, 100);
      description = 'Sideways movement, no clear trend';
    }

    // Track regime history
    const now = Date.now();
    this.regimeHistory.push({ regime, timestamp: now });
    if (this.regimeHistory.length > this.MAX_HISTORY) {
      this.regimeHistory.shift();
    }

    // Calculate regime duration
    const duration = this.calculateRegimeDuration(regime);

    const characteristics: RegimeCharacteristics = {
      regime,
      confidence,
      duration,
      expectedDuration: this.estimateRegimeDuration(regime),
      description
    };

    // 🔥 EVENT EMISSION: Detect regime changes and emit events
    const hasRegimeChanged = this.currentRegime && this.currentRegime.regime !== regime;
    const meetsConfidenceThreshold = confidence >= this.REGIME_CHANGE_CONFIDENCE_THRESHOLD;

    if (hasRegimeChanged && meetsConfidenceThreshold) {
      console.log(`\n[Market Analyzer] ⚡ REGIME CHANGE DETECTED!`);
      console.log(`  Previous: ${this.currentRegime?.regime} (${this.currentRegime?.confidence.toFixed(0)}%)`);
      console.log(`  New:      ${regime} (${confidence.toFixed(0)}%)`);
      console.log(`  Reason:   ${description}`);

      // Emit regime change event
      alphaGammaCommunicator.publishRegimeChange(characteristics);
    }

    // Update current regime
    this.currentRegime = characteristics;

    return characteristics;
  }

  /**
   * Calculate how long we've been in current regime
   */
  private calculateRegimeDuration(currentRegime: MarketRegime): number {
    if (this.regimeHistory.length === 0) return 0;

    const now = Date.now();
    let durationStart = now;

    // Work backwards from most recent
    for (let i = this.regimeHistory.length - 1; i >= 0; i--) {
      if (this.regimeHistory[i].regime !== currentRegime) {
        break;
      }
      durationStart = this.regimeHistory[i].timestamp;
    }

    return now - durationStart;
  }

  /**
   * Estimate expected duration of regime (based on typical patterns)
   */
  private estimateRegimeDuration(regime: MarketRegime): number {
    const HOUR = 3600000;
    const DAY = 86400000;

    switch (regime) {
      case 'HIGH_VOLATILITY':
        return 4 * HOUR; // Volatility spikes are usually short-lived
      case 'LOW_VOLATILITY':
        return 2 * DAY; // Accumulation phases can last days
      case 'BULL_TRENDING':
        return 7 * DAY; // Trends can last weeks
      case 'BEAR_TRENDING':
        return 5 * DAY; // Bear trends often faster
      case 'RANGING':
        return 3 * DAY; // Ranges vary widely
      default:
        return 1 * DAY;
    }
  }

  /**
   * Get last analysis results
   */
  getLastAnalysis(): MarketMetrics | null {
    return this.lastAnalysis;
  }

  /**
   * Get default metrics when data is unavailable
   */
  private getDefaultMetrics(): MarketMetrics {
    return {
      volatilityScore: 50,
      volumeScore: 50,
      sentimentScore: 50,
      whaleScore: 50,
      fundingScore: 50,
      orderbookScore: 50,
      qualityScore: 0,
      compositeScore: 50,
      timestamp: Date.now()
    };
  }

  /**
   * Get detailed breakdown for logging/debugging
   */
  getDetailedBreakdown(): string {
    if (!this.lastAnalysis) {
      return 'No analysis available';
    }

    const m = this.lastAnalysis;
    const regime = this.detectRegime();

    return `
Market Condition Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Volatility:     ${m.volatilityScore.toFixed(1)}/100 (${this.WEIGHTS.volatility * 100}% weight)
Volume:         ${m.volumeScore.toFixed(1)}/100 (${this.WEIGHTS.volume * 100}% weight)
Sentiment:      ${m.sentimentScore.toFixed(1)}/100 (${this.WEIGHTS.sentiment * 100}% weight)
Whale Activity: ${m.whaleScore.toFixed(1)}/100 (${this.WEIGHTS.whale * 100}% weight)
Funding:        ${m.fundingScore.toFixed(1)}/100 (${this.WEIGHTS.funding * 100}% weight)
Orderbook:      ${m.orderbookScore.toFixed(1)}/100 (${this.WEIGHTS.orderbook * 100}% weight)
Data Quality:   ${m.qualityScore.toFixed(1)}/100 (${this.WEIGHTS.quality * 100}% weight)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPOSITE:      ${m.compositeScore.toFixed(1)}/100

Regime:         ${regime.regime} (${regime.confidence.toFixed(0)}% confidence)
Description:    ${regime.description}
Duration:       ${(regime.duration / 60000).toFixed(0)} minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const marketConditionAnalyzer = new MarketConditionAnalyzer();

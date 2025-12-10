/**
 * V4 MARKET REGIME CLASSIFIER
 * Identifies market condition per coin to route to optimal strategies
 *
 * REGIMES:
 * 1. TRENDING - Directional movement (use trend-following strategies)
 * 2. RANGING - Sideways, mean-reverting (use support/resistance strategies)
 * 3. VOLATILE - High movement any direction (use scalping strategies)
 * 4. ACCUMULATION - Smart money loading (use whale-tracking strategies)
 *
 * STRATEGY ROUTING:
 * - Run ONLY strategies optimal for current regime
 * - 3-5 strategies per regime (not all 10)
 * - Faster execution, better quality
 */

import type { StrategyName } from '../strategies/strategyTypes';
import type { EnrichedCanonicalTicker } from '../dataStreams/multiExchangeAggregatorV4';

export type MarketRegime =
  | 'TRENDING'
  | 'RANGING'
  | 'VOLATILE'
  | 'ACCUMULATION';

export interface RegimeClassification {
  regime: MarketRegime;
  confidence: number;      // 0-100 how confident in this classification
  volatility: number;      // Current volatility %
  adx: number | null;      // Average Directional Index (trend strength)
  volumeProfile: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  priceAction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  optimalStrategies: StrategyName[]; // Strategies to run for this regime
  reasoning: string;
}

export class MarketRegimeClassifier {
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private currentRegimes: Map<string, RegimeClassification> = new Map();

  private readonly HISTORY_SIZE = 50; // Keep last 50 data points for analysis
  private readonly MIN_SAMPLES = 20;  // Minimum samples before classification

  /**
   * Classify market regime for a coin
   */
  classify(ticker: EnrichedCanonicalTicker): RegimeClassification {
    const symbol = ticker.symbol;

    // Update price and volume history
    this.updateHistory(symbol, ticker.price, ticker.volume24h || 0);

    // Get history
    const priceHistory = this.priceHistory.get(symbol) || [];
    const volumeHistory = this.volumeHistory.get(symbol) || [];

    // Need minimum samples
    if (priceHistory.length < this.MIN_SAMPLES) {
      return this.getDefaultRegime(symbol);
    }

    // Calculate metrics
    const volatility = this.calculateVolatility(priceHistory);
    const adx = this.calculateADX(priceHistory);
    const volumeProfile = this.classifyVolumeProfile(volumeHistory);
    const priceAction = this.classifyPriceAction(priceHistory);

    // Determine regime
    const classification = this.determineRegime(
      volatility,
      adx,
      volumeProfile,
      priceAction,
      ticker
    );

    // Store classification
    this.currentRegimes.set(symbol, classification);

    return classification;
  }

  /**
   * Update price and volume history
   */
  private updateHistory(symbol: string, price: number, volume: number) {
    // Update price history
    let priceHist = this.priceHistory.get(symbol) || [];
    priceHist.push(price);
    if (priceHist.length > this.HISTORY_SIZE) {
      priceHist = priceHist.slice(-this.HISTORY_SIZE);
    }
    this.priceHistory.set(symbol, priceHist);

    // Update volume history
    let volumeHist = this.volumeHistory.get(symbol) || [];
    volumeHist.push(volume);
    if (volumeHist.length > this.HISTORY_SIZE) {
      volumeHist = volumeHist.slice(-this.HISTORY_SIZE);
    }
    this.volumeHistory.set(symbol, volumeHist);
  }

  /**
   * Calculate rolling volatility (standard deviation of returns)
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
      returns.push(ret);
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / squaredDiffs.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate ADX (Average Directional Index)
   * Simplified version: measures trend strength
   */
  private calculateADX(prices: number[]): number | null {
    if (prices.length < 14) return null;

    const period = 14;
    const recent = prices.slice(-period);

    // Calculate directional movement
    let upMoves = 0;
    let downMoves = 0;

    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1];
      if (diff > 0) upMoves++;
      else if (diff < 0) downMoves++;
    }

    // ADX approximation: ratio of directional moves
    const totalMoves = upMoves + downMoves;
    if (totalMoves === 0) return 0;

    const directionalStrength = Math.abs(upMoves - downMoves) / totalMoves;
    return directionalStrength * 100; // 0-100 scale
  }

  /**
   * Classify volume profile
   */
  private classifyVolumeProfile(volumes: number[]): 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' {
    if (volumes.length < 10) return 'NORMAL';

    const recent = volumes.slice(-10);
    const avg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const current = volumes[volumes.length - 1];

    if (current > avg * 2.5) return 'EXTREME';
    if (current > avg * 1.5) return 'HIGH';
    if (current < avg * 0.6) return 'LOW';
    return 'NORMAL';
  }

  /**
   * Classify price action
   */
  private classifyPriceAction(prices: number[]): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
    if (prices.length < 20) return 'SIDEWAYS';

    const recent20 = prices.slice(-20);
    const first10Avg = recent20.slice(0, 10).reduce((sum, p) => sum + p, 0) / 10;
    const last10Avg = recent20.slice(-10).reduce((sum, p) => sum + p, 0) / 10;

    const change = ((last10Avg - first10Avg) / first10Avg) * 100;

    if (change > 0.5) return 'UPTREND';
    if (change < -0.5) return 'DOWNTREND';
    return 'SIDEWAYS';
  }

  /**
   * Determine regime based on metrics
   */
  private determineRegime(
    volatility: number,
    adx: number | null,
    volumeProfile: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME',
    priceAction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS',
    ticker: EnrichedCanonicalTicker
  ): RegimeClassification {
    // VOLATILE REGIME: High volatility regardless of direction
    if (volatility > 3.0) {
      return {
        regime: 'VOLATILE',
        confidence: 85,
        volatility,
        adx,
        volumeProfile,
        priceAction,
        optimalStrategies: ['VOLATILITY_BREAKOUT', 'FUNDING_SQUEEZE'],
        reasoning: `High volatility (${volatility.toFixed(2)}%) - use breakout and squeeze strategies`
      };
    }

    // TRENDING REGIME: Strong directional movement
    if (adx !== null && adx > 25 && priceAction !== 'SIDEWAYS') {
      return {
        regime: 'TRENDING',
        confidence: 80,
        volatility,
        adx,
        volumeProfile,
        priceAction,
        optimalStrategies: ['MOMENTUM_SURGE', 'GOLDEN_CROSS_MOMENTUM', 'MARKET_PHASE_SNIPER'],
        reasoning: `Strong trend detected (ADX: ${adx.toFixed(0)}, ${priceAction}) - use trend-following strategies`
      };
    }

    // ACCUMULATION REGIME: Volume high but price stable (smart money loading)
    if ((volumeProfile === 'HIGH' || volumeProfile === 'EXTREME') &&
        priceAction === 'SIDEWAYS' &&
        volatility < 1.5) {
      return {
        regime: 'ACCUMULATION',
        confidence: 75,
        volatility,
        adx,
        volumeProfile,
        priceAction,
        optimalStrategies: ['WHALE_SHADOW', 'LIQUIDITY_HUNTER', 'ORDER_FLOW_TSUNAMI'],
        reasoning: `High volume (${volumeProfile}) with stable price - potential accumulation phase`
      };
    }

    // RANGING REGIME: Low volatility, sideways movement
    if (volatility < 1.5 && priceAction === 'SIDEWAYS') {
      return {
        regime: 'RANGING',
        confidence: 70,
        volatility,
        adx,
        volumeProfile,
        priceAction,
        optimalStrategies: ['SPRING_TRAP', 'FEAR_GREED_CONTRARIAN'],
        reasoning: `Low volatility (${volatility.toFixed(2)}%) sideways action - use reversal strategies`
      };
    }

    // DEFAULT: Moderate trending if some direction
    if (priceAction !== 'SIDEWAYS') {
      return {
        regime: 'TRENDING',
        confidence: 60,
        volatility,
        adx,
        volumeProfile,
        priceAction,
        optimalStrategies: ['MOMENTUM_SURGE', 'MARKET_PHASE_SNIPER'],
        reasoning: `Moderate ${priceAction.toLowerCase()} - use momentum strategies`
      };
    }

    // FALLBACK: Ranging
    return {
      regime: 'RANGING',
      confidence: 50,
      volatility,
      adx,
      volumeProfile,
      priceAction,
      optimalStrategies: ['FEAR_GREED_CONTRARIAN', 'SPRING_TRAP'],
      reasoning: 'Unclear regime - defaulting to reversal strategies'
    };
  }

  /**
   * Get default regime (when not enough data)
   */
  private getDefaultRegime(symbol: string): RegimeClassification {
    return {
      regime: 'RANGING',
      confidence: 30,
      volatility: 0,
      adx: null,
      volumeProfile: 'NORMAL',
      priceAction: 'SIDEWAYS',
      optimalStrategies: ['MARKET_PHASE_SNIPER'], // Adaptive strategy for uncertain conditions
      reasoning: 'Insufficient data - using adaptive strategy'
    };
  }

  /**
   * Get current regime for coin
   */
  getCurrentRegime(symbol: string): RegimeClassification | null {
    return this.currentRegimes.get(symbol) || null;
  }

  /**
   * Get statistics
   */
  getStats() {
    const regimes = Array.from(this.currentRegimes.values());

    return {
      totalCoins: regimes.length,
      trending: regimes.filter(r => r.regime === 'TRENDING').length,
      ranging: regimes.filter(r => r.regime === 'RANGING').length,
      volatile: regimes.filter(r => r.regime === 'VOLATILE').length,
      accumulation: regimes.filter(r => r.regime === 'ACCUMULATION').length,
      avgVolatility: regimes.length > 0
        ? regimes.reduce((sum, r) => sum + r.volatility, 0) / regimes.length
        : 0
    };
  }

  /**
   * Reset state
   */
  reset() {
    this.priceHistory.clear();
    this.volumeHistory.clear();
    this.currentRegimes.clear();
  }
}

// Singleton instance
export const marketRegimeClassifier = new MarketRegimeClassifier();

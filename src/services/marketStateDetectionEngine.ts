/**
 * 5-Market-State Detection Engine
 *
 * Classifies current market conditions into one of 5 distinct states:
 * 1. BULLISH_HIGH_VOL - Strong uptrend with high volatility
 * 2. BULLISH_LOW_VOL - Steady uptrend with low volatility
 * 3. BEARISH_HIGH_VOL - Strong downtrend with high volatility
 * 4. BEARISH_LOW_VOL - Steady downtrend with low volatility
 * 5. RANGEBOUND - Sideways price action
 *
 * This is the foundation for the 5×17 Strategy Matrix system.
 */

import { cryptoDataService, type CryptoData } from './cryptoDataService';

export enum MarketState {
  BULLISH_HIGH_VOL = 'BULLISH_HIGH_VOL',
  BULLISH_LOW_VOL = 'BULLISH_LOW_VOL',
  BEARISH_HIGH_VOL = 'BEARISH_HIGH_VOL',
  BEARISH_LOW_VOL = 'BEARISH_LOW_VOL',
  RANGEBOUND = 'RANGEBOUND',
}

export interface MarketStateAnalysis {
  state: MarketState;
  confidence: number; // 0-100
  volatility: number; // Normalized 0-100
  trendStrength: number; // -100 to +100 (negative = bearish, positive = bullish)
  volume24hChange: number; // Percentage change
  marketCapChange24h: number; // Percentage change
  timestamp: number;
  metadata: {
    priceChange24h: number;
    avgPriceChange: number;
    volatilityScore: number;
    trendScore: number;
    rangeScore: number;
  };
}

export interface SymbolMarketState {
  symbol: string;
  state: MarketState;
  confidence: number;
  volatility: number;
  trendStrength: number;
  timestamp: number;
}

class MarketStateDetectionEngine {
  private cache: Map<string, { analysis: MarketStateAnalysis; timestamp: number }> = new Map();
  private symbolCache: Map<string, { state: SymbolMarketState; timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache

  /**
   * Analyzes the overall market state based on top cryptocurrencies
   */
  async detectMarketState(topN: number = 50): Promise<MarketStateAnalysis> {
    const cacheKey = `market-state-${topN}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📊 Market State (cached):', cached.analysis.state);
      return cached.analysis;
    }

    console.log('🔍 Detecting market state from top', topN, 'cryptos...');

    try {
      // Fetch top cryptos with real market data
      const cryptos = await cryptoDataService.getTopCryptos(topN);

      if (!cryptos || cryptos.length === 0) {
        throw new Error('No crypto data available');
      }

      // Calculate market-wide metrics
      const metrics = this.calculateMarketMetrics(cryptos);

      // Classify market state
      const state = this.classifyMarketState(metrics);

      const analysis: MarketStateAnalysis = {
        state: state.state,
        confidence: state.confidence,
        volatility: metrics.volatilityScore,
        trendStrength: metrics.trendScore,
        volume24hChange: metrics.avgVolumeChange,
        marketCapChange24h: metrics.avgMarketCapChange,
        timestamp: Date.now(),
        metadata: {
          priceChange24h: metrics.avgPriceChange,
          avgPriceChange: metrics.avgPriceChange,
          volatilityScore: metrics.volatilityScore,
          trendScore: metrics.trendScore,
          rangeScore: metrics.rangeScore,
        },
      };

      // Cache the result
      this.cache.set(cacheKey, { analysis, timestamp: Date.now() });

      console.log('✅ Market State:', analysis.state, `(confidence: ${analysis.confidence.toFixed(1)}%)`);
      console.log('   Volatility:', metrics.volatilityScore.toFixed(1), '| Trend:', metrics.trendScore.toFixed(1));

      return analysis;
    } catch (error) {
      console.error('❌ Market state detection failed:', error);
      throw error;
    }
  }

  /**
   * Detects market state for a specific symbol
   */
  async detectSymbolMarketState(symbol: string): Promise<SymbolMarketState> {
    const cacheKey = `symbol-${symbol.toLowerCase()}`;
    const cached = this.symbolCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.state;
    }

    try {
      // Get detailed crypto data
      const cryptos = await cryptoDataService.getTopCryptos(200);
      const crypto = cryptos.find(c =>
        c.symbol.toLowerCase() === symbol.toLowerCase() ||
        c.id.toLowerCase() === symbol.toLowerCase()
      );

      if (!crypto) {
        throw new Error(`Symbol ${symbol} not found`);
      }

      const metrics = this.calculateSymbolMetrics(crypto);
      const state = this.classifyMarketState(metrics);

      const symbolState: SymbolMarketState = {
        symbol: crypto.symbol.toUpperCase(),
        state: state.state,
        confidence: state.confidence,
        volatility: metrics.volatilityScore,
        trendStrength: metrics.trendScore,
        timestamp: Date.now(),
      };

      this.symbolCache.set(cacheKey, { state: symbolState, timestamp: Date.now() });

      return symbolState;
    } catch (error) {
      console.error(`❌ Symbol state detection failed for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Calculates market-wide metrics from top cryptos
   */
  private calculateMarketMetrics(cryptos: CryptoData[]): MarketMetrics {
    // Calculate average price change (trend direction)
    const avgPriceChange = cryptos.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / cryptos.length;

    // Calculate price change standard deviation (volatility proxy)
    const priceChanges = cryptos.map(c => c.price_change_percentage_24h || 0);
    const stdDev = this.calculateStdDev(priceChanges);

    // Calculate average volume change
    const avgVolumeChange = cryptos.reduce((sum, c) => {
      const volumeChange = ((c.total_volume || 0) / (c.market_cap || 1)) * 100;
      return sum + volumeChange;
    }, 0) / cryptos.length;

    // Calculate average market cap change
    const avgMarketCapChange = cryptos.reduce((sum, c) => sum + (c.market_cap_change_percentage_24h || 0), 0) / cryptos.length;

    // Calculate 7-day trend if available
    const avg7dChange = cryptos.reduce((sum, c) => sum + (c.price_change_percentage_7d_in_currency || 0), 0) / cryptos.length;

    // Normalize volatility score (0-100)
    const volatilityScore = Math.min(100, stdDev * 5); // Scale stdDev to 0-100

    // Calculate trend score (-100 to +100)
    const trendScore = Math.max(-100, Math.min(100, avgPriceChange * 2));

    // Calculate range score (higher = more rangebound)
    const rangeScore = 100 - Math.abs(trendScore);

    // Count coins in uptrend vs downtrend
    const bullishCount = cryptos.filter(c => (c.price_change_percentage_24h || 0) > 0).length;
    const bearishCount = cryptos.length - bullishCount;
    const bullishRatio = bullishCount / cryptos.length;

    return {
      avgPriceChange,
      stdDev,
      volatilityScore,
      trendScore,
      rangeScore,
      avgVolumeChange,
      avgMarketCapChange,
      avg7dChange,
      bullishRatio,
      bullishCount,
      bearishCount,
    };
  }

  /**
   * Calculates metrics for a specific symbol
   */
  private calculateSymbolMetrics(crypto: CryptoData): MarketMetrics {
    const priceChange24h = crypto.price_change_percentage_24h || 0;
    const priceChange7d = crypto.price_change_percentage_7d_in_currency || 0;

    // Calculate volatility from 24h high/low range
    const priceRange = ((crypto.high_24h - crypto.low_24h) / crypto.current_price) * 100;
    const volatilityScore = Math.min(100, priceRange * 2);

    // Calculate trend score
    const trendScore = Math.max(-100, Math.min(100, priceChange24h * 2));

    // Calculate range score
    const rangeScore = 100 - Math.abs(trendScore);

    // Volume to market cap ratio (higher = more active trading)
    const volumeRatio = (crypto.total_volume / crypto.market_cap) * 100;

    return {
      avgPriceChange: priceChange24h,
      stdDev: priceRange,
      volatilityScore,
      trendScore,
      rangeScore,
      avgVolumeChange: volumeRatio,
      avgMarketCapChange: crypto.market_cap_change_percentage_24h || 0,
      avg7dChange: priceChange7d,
      bullishRatio: priceChange24h > 0 ? 1 : 0,
      bullishCount: priceChange24h > 0 ? 1 : 0,
      bearishCount: priceChange24h > 0 ? 0 : 1,
    };
  }

  /**
   * Classifies market state based on calculated metrics
   */
  private classifyMarketState(metrics: MarketMetrics): { state: MarketState; confidence: number } {
    const { volatilityScore, trendScore, rangeScore, bullishRatio } = metrics;

    // Thresholds for classification
    const HIGH_VOL_THRESHOLD = 40;
    const LOW_VOL_THRESHOLD = 20;
    const BULLISH_THRESHOLD = 15;
    const BEARISH_THRESHOLD = -15;
    const RANGE_THRESHOLD = 60;

    let state: MarketState;
    let confidence: number;

    // Decision tree for market state classification
    if (rangeScore > RANGE_THRESHOLD && volatilityScore < LOW_VOL_THRESHOLD) {
      // Low volatility + no clear trend = RANGEBOUND
      state = MarketState.RANGEBOUND;
      confidence = rangeScore;
    } else if (trendScore > BULLISH_THRESHOLD) {
      // Bullish trend detected
      if (volatilityScore > HIGH_VOL_THRESHOLD) {
        state = MarketState.BULLISH_HIGH_VOL;
        confidence = Math.min(95, (trendScore + volatilityScore) / 2);
      } else {
        state = MarketState.BULLISH_LOW_VOL;
        confidence = Math.min(95, trendScore + (100 - volatilityScore) / 2);
      }
    } else if (trendScore < BEARISH_THRESHOLD) {
      // Bearish trend detected
      if (volatilityScore > HIGH_VOL_THRESHOLD) {
        state = MarketState.BEARISH_HIGH_VOL;
        confidence = Math.min(95, (Math.abs(trendScore) + volatilityScore) / 2);
      } else {
        state = MarketState.BEARISH_LOW_VOL;
        confidence = Math.min(95, Math.abs(trendScore) + (100 - volatilityScore) / 2);
      }
    } else {
      // Unclear/transitional state - default to rangebound
      state = MarketState.RANGEBOUND;
      confidence = 50 + rangeScore / 4;
    }

    // Adjust confidence based on bullish ratio alignment
    if (state.includes('BULLISH') && bullishRatio < 0.4) {
      confidence *= 0.8; // Reduce confidence if few coins are bullish
    } else if (state.includes('BEARISH') && bullishRatio > 0.6) {
      confidence *= 0.8; // Reduce confidence if many coins are bullish
    }

    return { state, confidence: Math.max(40, Math.min(95, confidence)) };
  }

  /**
   * Helper: Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get human-readable description of market state
   */
  getStateDescription(state: MarketState): string {
    const descriptions = {
      [MarketState.BULLISH_HIGH_VOL]: 'Strong bullish momentum with high volatility - ideal for trend-following strategies',
      [MarketState.BULLISH_LOW_VOL]: 'Steady bullish trend with low volatility - good for momentum continuation strategies',
      [MarketState.BEARISH_HIGH_VOL]: 'Strong bearish momentum with high volatility - opportunities for short positions',
      [MarketState.BEARISH_LOW_VOL]: 'Steady bearish trend with low volatility - cautious short opportunities',
      [MarketState.RANGEBOUND]: 'Sideways market with no clear trend - ideal for mean reversion and contrarian strategies',
    };
    return descriptions[state];
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.symbolCache.clear();
  }
}

interface MarketMetrics {
  avgPriceChange: number;
  stdDev: number;
  volatilityScore: number;
  trendScore: number;
  rangeScore: number;
  avgVolumeChange: number;
  avgMarketCapChange: number;
  avg7dChange: number;
  bullishRatio: number;
  bullishCount: number;
  bearishCount: number;
}

export const marketStateDetectionEngine = new MarketStateDetectionEngine();
export default marketStateDetectionEngine;

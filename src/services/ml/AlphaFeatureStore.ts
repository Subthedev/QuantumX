/**
 * ALPHA FEATURE STORE
 * Centralized feature computation and caching for ML models
 *
 * PURPOSE:
 * - Compute features once, cache, reuse across all ML models
 * - Consistent feature engineering across strategy predictors
 * - <1s latency with in-memory caching
 * - Production-grade: Inspired by Uber's Michelangelo feature store
 */

interface CachedFeature {
  features: AlphaFeatures;
  timestamp: number;
  ttl: number;
}

export interface AlphaFeatures {
  // Price features
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;

  // Volatility features
  volatility1h: number;
  volatility24h: number;
  volatilityTrend: number; // -1 to 1 (increasing/decreasing)

  // Volume features
  volume24h: number;
  volumeChange24h: number;
  volumeTrend: number; // -1 to 1

  // Order book features
  bidAskSpread: number;
  orderBookImbalance: number; // -1 to 1 (bid/ask pressure)
  buyPressure: number; // 0-100

  // Derivatives features (if available)
  fundingRate: number | null;
  openInterest: number | null;

  // Technical indicators
  rsi: number; // 0-100
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  bollingerWidth: number; // Squeeze indicator

  // Regime features
  regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'CONSOLIDATION' | 'VOLATILE' | 'UNKNOWN';
  regimeConfidence: number; // 0-1
  trend: number; // -1 to 1

  // Time features (crypto has time-of-day patterns)
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0-6

  // Market structure
  support: number | null;
  resistance: number | null;

  // Metadata
  timestamp: number;
  symbol: string;
}

export class AlphaFeatureStore {
  private cache: Map<string, CachedFeature> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Get features for a symbol (with caching)
   */
  async getFeatures(symbol: string): Promise<AlphaFeatures> {
    const now = Date.now();
    const cacheKey = `${symbol}-${Math.floor(now / this.CACHE_TTL)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp < cached.ttl) {
      console.log(`[AlphaFeatureStore] Cache HIT: ${symbol}`);
      return cached.features;
    }

    // Cache miss - compute features
    console.log(`[AlphaFeatureStore] Cache MISS: ${symbol} - computing features...`);
    const features = await this.computeFeatures(symbol);

    // Store in cache
    this.cache.set(cacheKey, {
      features,
      timestamp: now,
      ttl: this.CACHE_TTL
    });

    // Cleanup old cache entries
    this.cleanupCache();

    return features;
  }

  /**
   * Compute all features for a symbol
   */
  private async computeFeatures(symbol: string): Promise<AlphaFeatures> {
    const startTime = performance.now();

    try {
      // Fetch raw data in parallel (all data sources)
      const [marketData, ohlcData, orderBookData, fundingData] = await Promise.all([
        this.getMarketData(symbol),
        this.getOHLCData(symbol),
        this.getOrderBookData(symbol),
        this.getFundingData(symbol).catch(() => null) // Optional for non-perpetual
      ]);

      // Extract features
      const priceFeatures = this.extractPriceFeatures(marketData, ohlcData);
      const volatilityFeatures = this.extractVolatilityFeatures(ohlcData);
      const volumeFeatures = this.extractVolumeFeatures(ohlcData);
      const orderBookFeatures = this.extractOrderBookFeatures(orderBookData);
      const technicalFeatures = this.extractTechnicalIndicators(ohlcData);
      const regimeFeatures = this.extractRegimeFeatures(ohlcData);
      const timeFeatures = this.extractTimeFeatures();
      const structureFeatures = this.extractMarketStructure(ohlcData);

      const features: AlphaFeatures = {
        ...priceFeatures,
        ...volatilityFeatures,
        ...volumeFeatures,
        ...orderBookFeatures,
        ...technicalFeatures,
        ...regimeFeatures,
        ...timeFeatures,
        ...structureFeatures,
        fundingRate: fundingData?.fundingRate || null,
        openInterest: fundingData?.openInterest || null,
        timestamp: Date.now(),
        symbol
      };

      const elapsed = performance.now() - startTime;
      console.log(`[AlphaFeatureStore] Features computed in ${elapsed.toFixed(2)}ms`);

      return features;

    } catch (error) {
      console.error(`[AlphaFeatureStore] Error computing features for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Extract price features
   */
  private extractPriceFeatures(marketData: any, ohlcData: any[]): Partial<AlphaFeatures> {
    const currentPrice = marketData.last || marketData.current_price || 0;

    // Calculate price changes
    const priceChange1h = this.calculatePriceChange(ohlcData, 1);
    const priceChange24h = marketData.change24h || this.calculatePriceChange(ohlcData, 24);
    const priceChange7d = marketData.change7d || this.calculatePriceChange(ohlcData, 168);

    return {
      price: currentPrice,
      priceChange1h,
      priceChange24h,
      priceChange7d
    };
  }

  /**
   * Extract volatility features
   */
  private extractVolatilityFeatures(ohlcData: any[]): Partial<AlphaFeatures> {
    const volatility1h = this.calculateVolatility(ohlcData, 24); // Last 24 candles (1h each)
    const volatility24h = this.calculateVolatility(ohlcData, 100);

    // Volatility trend (is volatility increasing or decreasing?)
    const recentVol = this.calculateVolatility(ohlcData.slice(-12), 12); // Last 12h
    const olderVol = this.calculateVolatility(ohlcData.slice(-24, -12), 12); // 12-24h ago
    const volatilityTrend = olderVol > 0 ? (recentVol - olderVol) / olderVol : 0;

    return {
      volatility1h,
      volatility24h,
      volatilityTrend: this.clamp(volatilityTrend, -1, 1)
    };
  }

  /**
   * Extract volume features
   */
  private extractVolumeFeatures(ohlcData: any[]): Partial<AlphaFeatures> {
    const volume24h = ohlcData.reduce((sum, candle) => sum + (candle.volume || 0), 0);

    // Volume change
    const recentVolume = ohlcData.slice(-24).reduce((sum, c) => sum + (c.volume || 0), 0);
    const olderVolume = ohlcData.slice(-48, -24).reduce((sum, c) => sum + (c.volume || 0), 0);
    const volumeChange24h = olderVolume > 0 ? (recentVolume - olderVolume) / olderVolume : 0;

    // Volume trend
    const last12h = ohlcData.slice(-12).reduce((sum, c) => sum + (c.volume || 0), 0);
    const prev12h = ohlcData.slice(-24, -12).reduce((sum, c) => sum + (c.volume || 0), 0);
    const volumeTrend = prev12h > 0 ? (last12h - prev12h) / prev12h : 0;

    return {
      volume24h,
      volumeChange24h,
      volumeTrend: this.clamp(volumeTrend, -1, 1)
    };
  }

  /**
   * Extract order book features
   */
  private extractOrderBookFeatures(orderBookData: any): Partial<AlphaFeatures> {
    if (!orderBookData) {
      return {
        bidAskSpread: 0,
        orderBookImbalance: 0,
        buyPressure: 50
      };
    }

    const bidAskSpread = orderBookData.spread || 0;
    const buyPressure = orderBookData.buyPressure || 50;
    const orderBookImbalance = (buyPressure - 50) / 50; // Normalize to -1 to 1

    return {
      bidAskSpread,
      orderBookImbalance,
      buyPressure
    };
  }

  /**
   * Extract technical indicators
   */
  private extractTechnicalIndicators(ohlcData: any[]): Partial<AlphaFeatures> {
    const closes = ohlcData.map(c => c.close);

    // RSI
    const rsi = this.calculateRSI(closes, 14);

    // MACD
    const { macd, signal } = this.calculateMACD(closes);

    // Bollinger Bands
    const { upper, middle, lower, width } = this.calculateBollingerBands(closes, 20, 2);

    return {
      rsi,
      macd,
      macdSignal: signal,
      bollingerUpper: upper,
      bollingerMiddle: middle,
      bollingerLower: lower,
      bollingerWidth: width
    };
  }

  /**
   * Extract regime features
   */
  private extractRegimeFeatures(ohlcData: any[]): Partial<AlphaFeatures> {
    // Simple regime detection based on price action
    const closes = ohlcData.map(c => c.close);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const currentPrice = closes[closes.length - 1];
    const volatility = this.calculateVolatility(ohlcData, 24);

    let regime: AlphaFeatures['regime'] = 'UNKNOWN';
    let regimeConfidence = 0.5;
    let trend = 0;

    // Determine regime
    if (sma20 > sma50 * 1.02) {
      regime = 'TRENDING_UP';
      regimeConfidence = Math.min((sma20 / sma50 - 1) * 10, 1);
      trend = 1;
    } else if (sma20 < sma50 * 0.98) {
      regime = 'TRENDING_DOWN';
      regimeConfidence = Math.min((1 - sma20 / sma50) * 10, 1);
      trend = -1;
    } else if (volatility > 0.05) {
      regime = 'VOLATILE';
      regimeConfidence = Math.min(volatility * 10, 1);
      trend = 0;
    } else {
      regime = 'CONSOLIDATION';
      regimeConfidence = Math.min((1 - volatility * 20), 1);
      trend = 0;
    }

    return {
      regime,
      regimeConfidence: this.clamp(regimeConfidence, 0, 1),
      trend: this.clamp(trend, -1, 1)
    };
  }

  /**
   * Extract time features (crypto has time-of-day patterns)
   */
  private extractTimeFeatures(): Partial<AlphaFeatures> {
    const now = new Date();
    return {
      hourOfDay: now.getUTCHours(),
      dayOfWeek: now.getUTCDay()
    };
  }

  /**
   * Extract market structure (support/resistance)
   */
  private extractMarketStructure(ohlcData: any[]): Partial<AlphaFeatures> {
    const closes = ohlcData.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // Simple support/resistance (recent swing lows/highs)
    const lows = ohlcData.map(c => c.low);
    const highs = ohlcData.map(c => c.high);

    const support = Math.min(...lows.slice(-24));
    const resistance = Math.max(...highs.slice(-24));

    return {
      support,
      resistance
    };
  }

  // ===== HELPER FUNCTIONS =====

  private calculatePriceChange(ohlcData: any[], periods: number): number {
    if (ohlcData.length < periods) return 0;
    const current = ohlcData[ohlcData.length - 1].close;
    const past = ohlcData[ohlcData.length - periods].close;
    return past > 0 ? ((current - past) / past) * 100 : 0;
  }

  private calculateVolatility(ohlcData: any[], periods: number): number {
    if (ohlcData.length < periods) return 0;
    const returns = [];
    for (let i = ohlcData.length - periods; i < ohlcData.length - 1; i++) {
      const ret = (ohlcData[i + 1].close - ohlcData[i].close) / ohlcData[i].close;
      returns.push(ret);
    }
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number } {
    if (prices.length < 26) return { macd: 0, signal: 0 };

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // Signal line (9-period EMA of MACD) - simplified
    const signal = macd * 0.9; // Approximation

    return { macd, signal };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[prices.length - period];
    for (let i = prices.length - period + 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / period;
  }

  private calculateBollingerBands(prices: number[], period: number, stdDev: number): {
    upper: number;
    middle: number;
    lower: number;
    width: number;
  } {
    const middle = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const sd = Math.sqrt(variance);

    const upper = middle + (sd * stdDev);
    const lower = middle - (sd * stdDev);
    const width = middle > 0 ? ((upper - lower) / middle) * 100 : 0;

    return { upper, middle, lower, width };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  // ===== DATA FETCHING (Placeholder - integrate with existing services) =====

  private async getMarketData(symbol: string): Promise<any> {
    // TODO: Integrate with cryptoDataService or multiExchangeAggregatorV4
    return {
      last: 0,
      current_price: 0,
      change24h: 0,
      change7d: 0
    };
  }

  private async getOHLCData(symbol: string): Promise<any[]> {
    // TODO: Integrate with ohlcDataService
    return [];
  }

  private async getOrderBookData(symbol: string): Promise<any> {
    // TODO: Integrate with order book service
    return null;
  }

  private async getFundingData(symbol: string): Promise<any> {
    // TODO: Integrate with fundingRateService
    return null;
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > value.ttl * 2) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`[AlphaFeatureStore] Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Clear all cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[AlphaFeatureStore] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Track hits/misses
    };
  }
}

// Singleton export
export const alphaFeatureStore = new AlphaFeatureStore();

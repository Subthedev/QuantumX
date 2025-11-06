/**
 * TECHNICAL INDICATOR CACHE SERVICE
 * Eliminates redundant calculations across strategies
 *
 * Performance Impact:
 * - RSI: Calculated once instead of 7 times
 * - EMAs: Calculated once instead of 5 times
 * - Bollinger Bands: Calculated once instead of 3 times
 * - MACD: Calculated once instead of 4 times
 *
 * Expected Improvement: 50-100ms saved per analysis
 */

interface CachedIndicator<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

interface TechnicalIndicators {
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  ema?: { ema20: number; ema50: number; ema100: number; ema200: number };
  bollingerBands?: { upper: number; middle: number; lower: number; width: number };
  volume?: { avg24h: number; current: number; ratio: number };
  atr?: number;
  stochastic?: { k: number; d: number };
  momentum?: number;
  volumeProfile?: any;
  vwap?: number;
}

export class TechnicalIndicatorCache {
  private cache: Map<string, CachedIndicator<any>> = new Map();
  private readonly DEFAULT_TTL = 5000; // 5 seconds default TTL
  private computationCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Get or compute a technical indicator
   * @param key Unique key for the indicator (e.g., "BTC:RSI:14")
   * @param calculator Function to calculate the indicator if not cached
   * @param ttl Time to live in milliseconds (default: 5000ms)
   */
  async getOrCompute<T>(
    key: string,
    calculator: () => Promise<T> | T,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Check if cached and still valid
    if (cached && now < cached.timestamp + cached.ttl) {
      this.cacheHits++;
      console.log(`[TechnicalCache] ✅ Cache HIT: ${key} (${this.getCacheHitRate()}% hit rate)`);
      return cached.value;
    }

    // Cache miss - compute the indicator
    this.cacheMisses++;
    console.log(`[TechnicalCache] ❌ Cache MISS: ${key} - Computing...`);

    const startTime = Date.now();
    const value = await calculator();
    const computeTime = Date.now() - startTime;

    this.computationCount++;
    console.log(`[TechnicalCache] 🔧 Computed ${key} in ${computeTime}ms`);

    // Store in cache
    this.cache.set(key, {
      value,
      timestamp: now,
      ttl
    });

    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanupExpired();
    }

    return value;
  }

  /**
   * Pre-compute and cache all common indicators for a symbol
   * This is called when data arrives to pre-populate the cache
   */
  async preComputeIndicators(
    symbol: string,
    prices: number[],
    volumes: number[],
    ohlcData?: any
  ): Promise<TechnicalIndicators> {
    console.log(`[TechnicalCache] 📊 Pre-computing indicators for ${symbol}...`);
    const startTime = Date.now();

    const indicators: TechnicalIndicators = {};

    // Pre-compute all indicators in parallel
    const computations = [
      // RSI
      this.getOrCompute(`${symbol}:RSI:14`, () => this.calculateRSI(prices, 14), 5000)
        .then(rsi => { indicators.rsi = rsi; }),

      // MACD
      this.getOrCompute(`${symbol}:MACD:12:26:9`, () => this.calculateMACD(prices), 5000)
        .then(macd => { indicators.macd = macd; }),

      // EMAs
      this.getOrCompute(`${symbol}:EMAs`, () => this.calculateEMAs(prices), 5000)
        .then(emas => { indicators.ema = emas; }),

      // Bollinger Bands
      this.getOrCompute(`${symbol}:BB:20:2`, () => this.calculateBollingerBands(prices), 5000)
        .then(bb => { indicators.bollingerBands = bb; }),

      // Volume Analysis
      this.getOrCompute(`${symbol}:Volume`, () => this.calculateVolumeMetrics(volumes), 5000)
        .then(vol => { indicators.volume = vol; }),
    ];

    await Promise.all(computations);

    const computeTime = Date.now() - startTime;
    console.log(`[TechnicalCache] ✅ Pre-computed all indicators in ${computeTime}ms`);

    return indicators;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Default neutral

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI using smoothed averages for remaining prices
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    if (prices.length < 26) {
      return { value: 0, signal: 0, histogram: 0 };
    }

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Signal line is 9-period EMA of MACD
    const macdValues = [];
    for (let i = 26; i < prices.length; i++) {
      const ema12Val = this.calculateEMA(prices.slice(0, i + 1), 12);
      const ema26Val = this.calculateEMA(prices.slice(0, i + 1), 26);
      macdValues.push(ema12Val - ema26Val);
    }

    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;

    return { value: macdLine, signal: signalLine, histogram };
  }

  /**
   * Calculate multiple EMAs
   */
  private calculateEMAs(prices: number[]): { ema20: number; ema50: number; ema100: number; ema200: number } {
    return {
      ema20: this.calculateEMA(prices, 20),
      ema50: this.calculateEMA(prices, 50),
      ema100: this.calculateEMA(prices, 100),
      ema200: this.calculateEMA(prices, 200)
    };
  }

  /**
   * Calculate single EMA
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
    width: number;
  } {
    if (prices.length < period) {
      const lastPrice = prices[prices.length - 1] || 0;
      return { upper: lastPrice, middle: lastPrice, lower: lastPrice, width: 0 };
    }

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;

    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    const upper = sma + (standardDeviation * stdDev);
    const lower = sma - (standardDeviation * stdDev);
    const width = ((upper - lower) / sma) * 100;

    return { upper, middle: sma, lower, width };
  }

  /**
   * Calculate Volume metrics
   */
  private calculateVolumeMetrics(volumes: number[]): {
    avg24h: number;
    current: number;
    ratio: number;
  } {
    if (volumes.length === 0) {
      return { avg24h: 0, current: 0, ratio: 1 };
    }

    const current = volumes[volumes.length - 1] || 0;
    const avg24h = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const ratio = avg24h > 0 ? current / avg24h : 1;

    return { avg24h, current, ratio };
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.timestamp + cached.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[TechnicalCache] 🧹 Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    computations: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      computations: this.computationCount,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getCacheHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? Math.round((this.cacheHits / total) * 100) : 0;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    console.log('[TechnicalCache] 🗑️ Cache cleared');
  }

  /**
   * Clear cache for specific symbol
   */
  clearSymbol(symbol: string): void {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(symbol + ':')) {
        this.cache.delete(key);
        cleared++;
      }
    }
    console.log(`[TechnicalCache] 🗑️ Cleared ${cleared} entries for ${symbol}`);
  }
}

// Singleton instance
export const technicalIndicatorCache = new TechnicalIndicatorCache();
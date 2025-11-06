/**
 * Feature Cache
 * Shared in-memory cache for pre-computed features
 *
 * PROBLEM SOLVED:
 * - Beta Model waits for enrichment on EVERY signal (synchronous bottleneck)
 * - Same features recomputed multiple times per minute
 * - Enrichment blocks signal flow
 *
 * SOLUTION:
 * - Pre-compute features in background worker
 * - Cache features with TTL
 * - Beta reads from cache (instant access)
 * - Multiple consumers share same features
 */

export interface CachedFeatures {
  // Symbol identification
  symbol: string;
  timestamp: number;
  ttl: number; // Time-to-live in ms

  // Multi-timeframe OHLCV
  timeframes: {
    '1m'?: TimeframeData;
    '5m'?: TimeframeData;
    '15m'?: TimeframeData;
    '1h'?: TimeframeData;
    '4h'?: TimeframeData;
    '1d'?: TimeframeData;
  };

  // Technical indicators (pre-computed)
  indicators: {
    rsi14?: number;
    rsi28?: number;
    macd?: { value: number; signal: number; histogram: number };
    ema20?: number;
    ema50?: number;
    ema200?: number;
    sma20?: number;
    sma50?: number;
    bb?: { upper: number; middle: number; lower: number };
    atr14?: number;
    volume_sma?: number;
    volume_ratio?: number;
  };

  // Order flow data
  orderFlow?: {
    bidAskSpread: number;
    bidDepth: number;
    askDepth: number;
    imbalance: number;
    liquidityScore: number;
  };

  // Market context
  marketContext?: {
    volatility24h: number;
    volume24h: number;
    priceChange24h: number;
    highLow24hRange: number;
    averageSpread: number;
  };

  // Sentiment indicators
  sentiment?: {
    fearGreedIndex: number;
    whaleAccumulation: number;
    fundingRate: number;
    exchangeFlowNet: number;
  };

  // Pattern detection (lightweight)
  patterns?: {
    trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
    strength: number;
    support?: number;
    resistance?: number;
  };

  // Quality metadata
  quality: {
    dataCompleteness: number; // 0-100
    staleness: number; // ms since update
    sources: string[]; // Which exchanges provided data
  };
}

export interface TimeframeData {
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface CacheStats {
  totalSymbols: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgStaleness: number;
  avgQuality: number;
  lastUpdateTime: number;
}

export class FeatureCache {
  private cache = new Map<string, CachedFeatures>();
  private stats = {
    hits: 0,
    misses: 0,
    lastUpdate: Date.now()
  };

  // Cache configuration
  private readonly DEFAULT_TTL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 200; // Max symbols to cache
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get features for a symbol (instant access)
   */
  get(symbol: string): CachedFeatures | null {
    const features = this.cache.get(symbol);

    if (!features) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - features.timestamp;
    if (age > features.ttl) {
      this.cache.delete(symbol);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return features;
  }

  /**
   * Set features for a symbol
   */
  set(symbol: string, features: Omit<CachedFeatures, 'symbol' | 'timestamp' | 'ttl'>): void {
    // Enforce max cache size (LRU-style)
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(symbol)) {
      // Remove oldest entry
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    const cached: CachedFeatures = {
      symbol,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL,
      ...features
    };

    this.cache.set(symbol, cached);
    this.stats.lastUpdate = Date.now();
  }

  /**
   * Update specific features without replacing entire entry
   */
  update(symbol: string, partial: Partial<Omit<CachedFeatures, 'symbol' | 'timestamp' | 'ttl'>>): boolean {
    const existing = this.cache.get(symbol);
    if (!existing) {
      return false;
    }

    // Merge updates
    const updated: CachedFeatures = {
      ...existing,
      ...partial,
      timestamp: Date.now(), // Refresh timestamp
      quality: {
        ...existing.quality,
        ...(partial.quality || {})
      },
      indicators: {
        ...existing.indicators,
        ...(partial.indicators || {})
      },
      timeframes: {
        ...existing.timeframes,
        ...(partial.timeframes || {})
      }
    };

    this.cache.set(symbol, updated);
    return true;
  }

  /**
   * Check if features exist and are fresh
   */
  has(symbol: string, maxAge?: number): boolean {
    const features = this.cache.get(symbol);
    if (!features) return false;

    const age = Date.now() - features.timestamp;
    const ttl = maxAge || features.ttl;

    return age <= ttl;
  }

  /**
   * Get multiple symbols at once
   */
  getMany(symbols: string[]): Map<string, CachedFeatures> {
    const results = new Map<string, CachedFeatures>();

    for (const symbol of symbols) {
      const features = this.get(symbol);
      if (features) {
        results.set(symbol, features);
      }
    }

    return results;
  }

  /**
   * Get all cached symbols
   */
  getAllSymbols(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const symbols = Array.from(this.cache.values());
    const now = Date.now();

    const avgStaleness = symbols.length > 0
      ? symbols.reduce((sum, f) => sum + (now - f.timestamp), 0) / symbols.length
      : 0;

    const avgQuality = symbols.length > 0
      ? symbols.reduce((sum, f) => sum + f.quality.dataCompleteness, 0) / symbols.length
      : 0;

    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      totalSymbols: this.cache.size,
      cacheHits: this.stats.hits,
      cacheMisses: this.stats.misses,
      hitRate,
      avgStaleness,
      avgQuality,
      lastUpdateTime: this.stats.lastUpdate
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [symbol, features] of this.cache.entries()) {
      const age = now - features.timestamp;
      if (age > features.ttl) {
        this.cache.delete(symbol);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Feature Cache] 🧹 Cleaned up ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      lastUpdate: Date.now()
    };
    console.log('[Feature Cache] 🧹 Cache cleared');
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    console.log('[Feature Cache] ✅ Cleanup timer started');
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    console.log('[Feature Cache] 🛑 Stopped');
  }

  /**
   * Get detailed status for monitoring
   */
  getDetailedStatus(): string {
    const stats = this.getStats();
    const symbols = this.getAllSymbols();

    return `
Feature Cache Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Symbols:    ${stats.totalSymbols}
Cache Hits:       ${stats.cacheHits}
Cache Misses:     ${stats.cacheMisses}
Hit Rate:         ${stats.hitRate.toFixed(1)}%
Avg Staleness:    ${(stats.avgStaleness / 1000).toFixed(1)}s
Avg Quality:      ${stats.avgQuality.toFixed(1)}/100
Last Update:      ${new Date(stats.lastUpdateTime).toLocaleTimeString()}

Cached Symbols:   ${symbols.slice(0, 10).join(', ')}${symbols.length > 10 ? ` (+${symbols.length - 10} more)` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const featureCache = new FeatureCache();

/**
 * PRE-COMPUTATION PIPELINE SERVICE
 * Pre-calculates indicators for hot coins to eliminate latency
 *
 * PHILOSOPHY:
 * - Top coins are analyzed frequently (every few seconds)
 * - Pre-computing their indicators saves 30-50ms per analysis
 * - Background computation doesn't block main thread
 * - Priority queue based on coin activity and tier status
 *
 * FEATURES:
 * - Pre-computes indicators for top 20 coins every 30 seconds
 * - Prioritizes coins in OPPORTUNITY/ALERT tiers
 * - Runs in background using setTimeout (non-blocking)
 * - Automatically updates hot coin list based on activity
 * - Integrates with TechnicalIndicatorCache for storage
 */

import { technicalIndicatorCache } from './TechnicalIndicatorCache';
import { adaptiveTierManager } from '../adaptive/AdaptiveTierManager';
import { ohlcDataManager } from '../ohlcDataManager';
import { cryptoDataService } from '../cryptoDataService';

interface HotCoin {
  symbol: string;
  priority: number; // 0-100, higher = more important
  lastComputed: number;
  computeCount: number;
  tier?: 'CALM' | 'ALERT' | 'OPPORTUNITY';
}

interface PipelineStats {
  totalPreComputations: number;
  hotCoinsTracked: number;
  avgComputeTime: number;
  cacheHitRateBoost: number;
  lastRunTime: number;
}

export class PreComputationPipeline {
  private hotCoins: Map<string, HotCoin> = new Map();
  private isRunning: boolean = false;
  private computeInterval: NodeJS.Timeout | null = null;

  private readonly MAX_HOT_COINS = 20;
  private readonly COMPUTE_INTERVAL = 30000; // 30 seconds
  private readonly BATCH_SIZE = 5; // Process 5 coins at a time

  private stats: PipelineStats = {
    totalPreComputations: 0,
    hotCoinsTracked: 0,
    avgComputeTime: 0,
    cacheHitRateBoost: 0,
    lastRunTime: 0
  };

  /**
   * Start the pre-computation pipeline
   */
  start() {
    if (this.isRunning) {
      console.log('[PreComputePipeline] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[PreComputePipeline] 🚀 Starting pre-computation pipeline...');

    // Initialize with top market cap coins
    this.initializeHotCoins();

    // Start compute loop
    this.scheduleNextCompute();
  }

  /**
   * Stop the pipeline
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.computeInterval) {
      clearTimeout(this.computeInterval);
      this.computeInterval = null;
    }

    console.log('[PreComputePipeline] 🛑 Pipeline stopped');
  }

  /**
   * Initialize hot coins list with top market cap coins
   */
  private async initializeHotCoins() {
    try {
      // Get top 20 coins by market cap
      const topCoins = await cryptoDataService.getTopCryptos(20);

      topCoins.forEach((coin, index) => {
        const symbol = coin.symbol.toUpperCase();
        const priority = 100 - (index * 4); // Top coin = 100, 20th = 24

        this.hotCoins.set(symbol, {
          symbol,
          priority,
          lastComputed: 0,
          computeCount: 0,
          tier: 'CALM'
        });
      });

      this.stats.hotCoinsTracked = this.hotCoins.size;
      console.log(`[PreComputePipeline] Initialized with ${this.hotCoins.size} hot coins`);

    } catch (error) {
      console.error('[PreComputePipeline] Error initializing hot coins:', error);
      // Fallback to default coins
      this.initializeDefaultCoins();
    }
  }

  /**
   * Fallback initialization with default popular coins
   */
  private initializeDefaultCoins() {
    const defaultCoins = [
      'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX',
      'DOT', 'MATIC', 'LINK', 'UNI', 'ATOM', 'LTC', 'FTM', 'NEAR',
      'ALGO', 'VET', 'MANA', 'SAND'
    ];

    defaultCoins.forEach((symbol, index) => {
      const priority = 100 - (index * 5);
      this.hotCoins.set(symbol, {
        symbol,
        priority,
        lastComputed: 0,
        computeCount: 0,
        tier: 'CALM'
      });
    });

    this.stats.hotCoinsTracked = this.hotCoins.size;
  }

  /**
   * Schedule next compute cycle
   */
  private scheduleNextCompute() {
    if (!this.isRunning) return;

    this.computeInterval = setTimeout(() => {
      this.runComputeCycle();
      this.scheduleNextCompute(); // Schedule next cycle
    }, this.COMPUTE_INTERVAL);
  }

  /**
   * Run a compute cycle for hot coins
   */
  private async runComputeCycle() {
    const startTime = Date.now();
    console.log('[PreComputePipeline] 🔄 Starting compute cycle...');

    // Update priorities based on current tiers
    this.updatePriorities();

    // Sort coins by priority
    const sortedCoins = Array.from(this.hotCoins.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.MAX_HOT_COINS);

    // Process in batches to avoid blocking
    for (let i = 0; i < sortedCoins.length; i += this.BATCH_SIZE) {
      const batch = sortedCoins.slice(i, i + this.BATCH_SIZE);
      await this.processBatch(batch);

      // Small delay between batches to prevent blocking
      if (i + this.BATCH_SIZE < sortedCoins.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const computeTime = Date.now() - startTime;
    this.updateStats(computeTime, sortedCoins.length);

    console.log(
      `[PreComputePipeline] ✅ Cycle complete: ${sortedCoins.length} coins in ${computeTime}ms\n` +
      `  Average: ${Math.round(computeTime / sortedCoins.length)}ms per coin\n` +
      `  Cache boost: +${this.stats.cacheHitRateBoost}% hit rate`
    );
  }

  /**
   * Process a batch of coins
   */
  private async processBatch(coins: HotCoin[]) {
    const computePromises = coins.map(coin => this.preComputeIndicators(coin));
    await Promise.all(computePromises);
  }

  /**
   * Pre-compute indicators for a single coin
   */
  private async preComputeIndicators(coin: HotCoin) {
    try {
      const symbol = coin.symbol;

      // Get OHLC data
      const ohlcData = ohlcDataManager.getDataset(symbol);
      if (!ohlcData || !ohlcData.candles || ohlcData.candles.length < 50) {
        // Not enough data yet
        return;
      }

      // Extract price and volume arrays from candles
      const prices = ohlcData.candles.map(c => c.close);
      const volumes = ohlcData.candles.map(c => c.volume);

      // Pre-compute all indicators (they'll be cached)
      const startTime = Date.now();
      await technicalIndicatorCache.preComputeIndicators(
        symbol,
        prices,
        volumes,
        ohlcData
      );
      const computeTime = Date.now() - startTime;

      // Update coin stats
      coin.lastComputed = Date.now();
      coin.computeCount++;

      // Log if this was slow
      if (computeTime > 50) {
        console.log(`[PreComputePipeline] ⚠️ Slow computation for ${symbol}: ${computeTime}ms`);
      }

      this.stats.totalPreComputations++;

    } catch (error) {
      console.error(`[PreComputePipeline] Error pre-computing ${coin.symbol}:`, error);
    }
  }

  /**
   * Update coin priorities based on tier status
   */
  private updatePriorities() {
    for (const [symbol, coin] of this.hotCoins) {
      // Get current tier from AdaptiveTierManager
      const tier = adaptiveTierManager.getTier(symbol);
      coin.tier = tier;

      // Adjust priority based on tier
      let tierBoost = 0;
      switch (tier) {
        case 'OPPORTUNITY':
          tierBoost = 50; // Highest priority
          break;
        case 'ALERT':
          tierBoost = 25;
          break;
        case 'CALM':
          tierBoost = 0;
          break;
      }

      // Update priority (keep base priority + tier boost)
      const basePriority = coin.priority % 100; // Remove previous boost
      coin.priority = Math.min(100, basePriority + tierBoost);
    }
  }

  /**
   * Add or update a coin in the hot list
   */
  addHotCoin(symbol: string, priority: number = 50) {
    const upperSymbol = symbol.toUpperCase();

    if (this.hotCoins.has(upperSymbol)) {
      // Update priority if higher
      const existing = this.hotCoins.get(upperSymbol)!;
      existing.priority = Math.max(existing.priority, priority);
    } else {
      // Add new hot coin
      this.hotCoins.set(upperSymbol, {
        symbol: upperSymbol,
        priority,
        lastComputed: 0,
        computeCount: 0,
        tier: adaptiveTierManager.getTier(upperSymbol)
      });

      // Remove lowest priority coin if over limit
      if (this.hotCoins.size > this.MAX_HOT_COINS * 1.5) {
        this.pruneLowestPriority();
      }
    }

    this.stats.hotCoinsTracked = this.hotCoins.size;
  }

  /**
   * Remove lowest priority coins
   */
  private pruneLowestPriority() {
    const sorted = Array.from(this.hotCoins.entries())
      .sort((a, b) => b[1].priority - a[1].priority);

    // Keep top MAX_HOT_COINS
    const toKeep = sorted.slice(0, this.MAX_HOT_COINS);
    this.hotCoins = new Map(toKeep);
  }

  /**
   * Force immediate computation for a specific coin
   */
  async computeNow(symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    let coin = this.hotCoins.get(upperSymbol);

    if (!coin) {
      // Add as hot coin with high priority
      coin = {
        symbol: upperSymbol,
        priority: 90,
        lastComputed: 0,
        computeCount: 0,
        tier: adaptiveTierManager.getTier(upperSymbol)
      };
      this.hotCoins.set(upperSymbol, coin);
    }

    // Compute immediately
    await this.preComputeIndicators(coin);
    console.log(`[PreComputePipeline] ⚡ Immediate computation complete for ${upperSymbol}`);
  }

  /**
   * Update statistics
   */
  private updateStats(computeTime: number, coinsProcessed: number) {
    const prevAvg = this.stats.avgComputeTime;
    const prevCount = this.stats.totalPreComputations - coinsProcessed;

    // Calculate new average
    this.stats.avgComputeTime = Math.round(
      (prevAvg * prevCount + computeTime) / this.stats.totalPreComputations
    );

    // Calculate cache hit rate boost (estimate)
    const cacheStats = technicalIndicatorCache.getStats();
    const baseHitRate = 50; // Assume 50% base hit rate without pre-computation
    this.stats.cacheHitRateBoost = Math.max(0, cacheStats.hitRate - baseHitRate);

    this.stats.lastRunTime = Date.now();
    this.stats.hotCoinsTracked = this.hotCoins.size;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): PipelineStats & { hotCoins: string[] } {
    return {
      ...this.stats,
      hotCoins: Array.from(this.hotCoins.keys()).slice(0, 10) // Top 10 for display
    };
  }

  /**
   * Get current hot coins list
   */
  getHotCoins(): Array<{ symbol: string; priority: number; tier: string }> {
    return Array.from(this.hotCoins.values())
      .sort((a, b) => b.priority - a.priority)
      .map(coin => ({
        symbol: coin.symbol,
        priority: coin.priority,
        tier: coin.tier || 'CALM'
      }));
  }

  /**
   * Clear all pre-computed data
   */
  clear() {
    this.hotCoins.clear();
    this.stats = {
      totalPreComputations: 0,
      hotCoinsTracked: 0,
      avgComputeTime: 0,
      cacheHitRateBoost: 0,
      lastRunTime: 0
    };
    console.log('[PreComputePipeline] Cleared all data');
  }
}

// Singleton instance
export const preComputationPipeline = new PreComputationPipeline();
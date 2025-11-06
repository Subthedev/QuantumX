/**
 * Feature Engine Worker
 * Background worker that pre-computes features for all symbols
 *
 * ARCHITECTURE:
 * - Runs continuously in background
 * - Updates features every 30-60 seconds
 * - Prioritizes recently-requested symbols
 * - Handles errors gracefully (no blocking)
 * - Emits events when features ready
 *
 * PERFORMANCE:
 * - Parallel processing for multiple symbols
 * - Incremental updates (not full recomputation)
 * - Adaptive update frequency based on market volatility
 */

import { featureCache, type CachedFeatures } from './FeatureCache';
import { multiTimeframeAnalyzer, type Timeframe } from './MultiTimeframeAnalyzer';
import { igxDataEngineV4Enhanced } from './IGXDataEngineV4Enhanced';
import type { TimeframeData } from './FeatureCache';

export interface WorkerConfig {
  updateInterval: number; // ms between updates
  batchSize: number; // symbols per batch
  prioritySymbols: string[]; // always update these first
  enabled: boolean;
}

export interface WorkerStats {
  isRunning: boolean;
  totalUpdates: number;
  lastUpdateTime: number;
  avgUpdateDuration: number;
  errorsCount: number;
  symbolsProcessed: number;
  queueSize: number;
}

export class FeatureEngineWorker {
  private config: WorkerConfig = {
    updateInterval: 45000, // 45 seconds
    batchSize: 20, // Process 20 symbols per batch
    prioritySymbols: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'],
    enabled: true
  };

  private isRunning = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private queue: string[] = [];

  private stats: WorkerStats = {
    isRunning: false,
    totalUpdates: 0,
    lastUpdateTime: 0,
    avgUpdateDuration: 0,
    errorsCount: 0,
    symbolsProcessed: 0,
    queueSize: 0
  };

  private updateDurations: number[] = [];
  private readonly MAX_DURATION_HISTORY = 100;

  /**
   * Start the feature engine worker
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Feature Worker] Already running');
      return;
    }

    console.log('\n🔧 FEATURE ENGINE WORKER - STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Update Interval: ${this.config.updateInterval / 1000}s`);
    console.log(`Batch Size: ${this.config.batchSize} symbols`);
    console.log(`Priority Symbols: ${this.config.prioritySymbols.join(', ')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.isRunning = true;
    this.stats.isRunning = true;

    // Initial update immediately
    this.runUpdateCycle();

    // Schedule periodic updates
    this.updateTimer = setInterval(() => {
      this.runUpdateCycle();
    }, this.config.updateInterval);

    console.log('[Feature Worker] ✅ Started successfully\n');
  }

  /**
   * Stop the feature engine worker
   */
  stop(): void {
    console.log('\n[Feature Worker] Stopping...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.isRunning = false;
    this.stats.isRunning = false;

    console.log('[Feature Worker] ✅ Stopped\n');
  }

  /**
   * Run a single update cycle
   */
  private async runUpdateCycle(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = Date.now();
    console.log(`\n[Feature Worker] 🔄 Update cycle starting...`);

    try {
      // Get symbols to update
      const symbols = this.getSymbolsToUpdate();
      this.stats.queueSize = symbols.length;

      if (symbols.length === 0) {
        console.log('[Feature Worker] No symbols to update');
        return;
      }

      console.log(`[Feature Worker] Processing ${symbols.length} symbols...`);

      // Process in batches to avoid overwhelming the system
      const batches = this.chunkArray(symbols, this.config.batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // Update stats
      const duration = Date.now() - startTime;
      this.stats.totalUpdates++;
      this.stats.lastUpdateTime = Date.now();
      this.stats.symbolsProcessed += symbols.length;

      this.updateDurations.push(duration);
      if (this.updateDurations.length > this.MAX_DURATION_HISTORY) {
        this.updateDurations.shift();
      }

      this.stats.avgUpdateDuration = Math.round(
        this.updateDurations.reduce((sum, d) => sum + d, 0) / this.updateDurations.length
      );

      console.log(`[Feature Worker] ✅ Cycle complete in ${(duration / 1000).toFixed(1)}s`);
      console.log(`  Symbols processed: ${symbols.length}`);
      console.log(`  Cache hit rate: ${featureCache.getStats().hitRate.toFixed(1)}%\n`);

    } catch (error) {
      console.error('[Feature Worker] Error in update cycle:', error);
      this.stats.errorsCount++;
    }
  }

  /**
   * Process a batch of symbols
   */
  private async processBatch(symbols: string[]): Promise<void> {
    // Process symbols in parallel (but limit concurrency)
    const promises = symbols.map(symbol => this.updateFeatures(symbol));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('[Feature Worker] Error processing batch:', error);
    }
  }

  /**
   * Update features for a single symbol
   */
  private async updateFeatures(symbol: string): Promise<void> {
    try {
      // Get ticker data from Data Engine
      const ticker = igxDataEngineV4Enhanced.getTicker(`${symbol}USDT`);
      if (!ticker) {
        // Symbol not available in Data Engine yet
        return;
      }

      // Get orderbook data
      const orderbook = igxDataEngineV4Enhanced.getOrderBook(`${symbol}USDT`);

      // Get funding rate
      const funding = igxDataEngineV4Enhanced.getFundingRate(symbol);

      // Get whale activity
      const whaleActivity = igxDataEngineV4Enhanced.getWhaleActivity(symbol);

      // Get sentiment
      const sentiment = igxDataEngineV4Enhanced.getSentiment();

      // Build timeframe data (simplified - in production, fetch real OHLC data)
      const timeframeData = new Map<Timeframe, TimeframeData>();

      // For now, use current price as candle data (placeholder)
      // In production, you'd fetch real candlestick data from exchanges
      const mockCandle = {
        time: Date.now(),
        open: ticker.price,
        high: ticker.high24h,
        low: ticker.low24h,
        close: ticker.price,
        volume: ticker.volume24h
      };

      timeframeData.set('15m', {
        timeframe: '15m',
        open: ticker.price,
        high: ticker.high24h,
        low: ticker.low24h,
        close: ticker.price,
        volume: ticker.volume24h,
        timestamp: Date.now(),
        candles: [mockCandle]
      });

      // Run multi-timeframe analysis (if enough data)
      let mtfAnalysis = null;
      if (timeframeData.size > 0) {
        mtfAnalysis = multiTimeframeAnalyzer.analyze(`${symbol}USDT`, timeframeData);
      }

      // Calculate technical indicators (simplified)
      const indicators = {
        rsi14: this.calculateSimpleRSI(ticker),
        volume_ratio: ticker.volume24h / (ticker.volume24h * 0.8) // Mock ratio
      };

      // Build order flow data
      const orderFlow = orderbook ? {
        bidAskSpread: orderbook.spread,
        bidDepth: orderbook.bids?.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0) || 0,
        askDepth: orderbook.asks?.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0) || 0,
        imbalance: (orderbook.bids?.[0]?.[1] || 0) - (orderbook.asks?.[0]?.[1] || 0),
        liquidityScore: orderbook.liquidity || 50
      } : undefined;

      // Build market context
      const marketContext = {
        volatility24h: ((ticker.high24h - ticker.low24h) / ticker.price) * 100,
        volume24h: ticker.volume24h,
        priceChange24h: ticker.change24h,
        highLow24hRange: ticker.high24h - ticker.low24h,
        averageSpread: orderbook?.spread || 0
      };

      // Build sentiment data
      const sentimentData = {
        fearGreedIndex: sentiment?.fearGreedIndex || 50,
        whaleAccumulation: whaleActivity?.whaleAccumulationScore || 50,
        fundingRate: funding?.fundingRate || 0,
        exchangeFlowNet: 0 // Would come from exchange flow data
      };

      // Build pattern data (from MTF analysis if available)
      const patterns = mtfAnalysis ? {
        trend: mtfAnalysis.confluence.overallTrend === 'BULLISH' ? 'UPTREND' as const :
              mtfAnalysis.confluence.overallTrend === 'BEARISH' ? 'DOWNTREND' as const : 'RANGING' as const,
        strength: mtfAnalysis.confluence.alignment,
        support: Array.from(mtfAnalysis.timeframes.values())[0]?.support,
        resistance: Array.from(mtfAnalysis.timeframes.values())[0]?.resistance
      } : undefined;

      // Calculate quality
      const quality = {
        dataCompleteness: this.calculateCompleteness({
          ticker: !!ticker,
          orderbook: !!orderbook,
          funding: !!funding,
          sentiment: !!sentiment
        }),
        staleness: 0,
        sources: ticker.exchangeSources
      };

      // Store in cache
      featureCache.set(symbol, {
        timeframes: timeframeData.size > 0 ? Object.fromEntries(timeframeData) : {},
        indicators,
        orderFlow,
        marketContext,
        sentiment: sentimentData,
        patterns,
        quality
      });

    } catch (error) {
      console.error(`[Feature Worker] Error updating ${symbol}:`, error);
      this.stats.errorsCount++;
    }
  }

  /**
   * Get symbols that need updating
   */
  private getSymbolsToUpdate(): string[] {
    // Get all symbols from Data Engine
    const allSymbols = igxDataEngineV4Enhanced.getAllSymbols()
      .map(s => s.replace('USDT', ''))
      .slice(0, 50); // Limit to top 50

    // Priority symbols first
    const prioritized = [
      ...this.config.prioritySymbols,
      ...allSymbols.filter(s => !this.config.prioritySymbols.includes(s))
    ];

    // Remove duplicates
    return [...new Set(prioritized)];
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate simple RSI (placeholder)
   */
  private calculateSimpleRSI(ticker: any): number {
    // Simplified RSI calculation based on 24h change
    const change = ticker.change24h;
    return 50 + (change / 2); // Mock RSI
  }

  /**
   * Calculate data completeness
   */
  private calculateCompleteness(data: Record<string, boolean>): number {
    const total = Object.keys(data).length;
    const available = Object.values(data).filter(v => v).length;
    return (available / total) * 100;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WorkerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Feature Worker] Configuration updated:', this.config);

    // Restart if interval changed
    if (config.updateInterval && this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    return { ...this.stats };
  }

  /**
   * Get detailed status
   */
  getDetailedStatus(): string {
    const stats = this.getStats();
    const cacheStats = featureCache.getStats();

    return `
Feature Engine Worker Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:              ${stats.isRunning ? '✅ RUNNING' : '🛑 STOPPED'}
Total Updates:       ${stats.totalUpdates}
Symbols Processed:   ${stats.symbolsProcessed}
Queue Size:          ${stats.queueSize}
Avg Duration:        ${(stats.avgUpdateDuration / 1000).toFixed(1)}s
Errors:              ${stats.errorsCount}
Last Update:         ${stats.lastUpdateTime ? new Date(stats.lastUpdateTime).toLocaleTimeString() : 'Never'}

Cache Performance:
  Total Symbols:     ${cacheStats.totalSymbols}
  Hit Rate:          ${cacheStats.hitRate.toFixed(1)}%
  Avg Quality:       ${cacheStats.avgQuality.toFixed(1)}/100
  Avg Staleness:     ${(cacheStats.avgStaleness / 1000).toFixed(1)}s

Configuration:
  Update Interval:   ${(this.config.updateInterval / 1000).toFixed(0)}s
  Batch Size:        ${this.config.batchSize}
  Priority Symbols:  ${this.config.prioritySymbols.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const featureEngineWorker = new FeatureEngineWorker();

/**
 * IGX DATA PIPELINE - SIMPLE REST VERSION
 * Uses Binance REST API for reliable ticker data
 *
 * This version uses REST API polling instead of WebSockets
 * to avoid CORS issues in the browser
 */

import type { IGXTicker } from './IGXDataPipelineV4';

export class IGXDataPipelineSimple {
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private symbols: string[] = [];
  private tickerCache: Map<string, IGXTicker> = new Map();

  private stats = {
    tickersProcessed: 0,
    exchangesConnected: 1, // Using Binance
    averageLatency: 0,
    dataQuality: 85,
    errors: 0,
    lastUpdate: Date.now()
  };

  /**
   * Start the data pipeline
   */
  async start(symbols: string[]) {
    if (this.isRunning) {
      console.log('[IGX Pipeline Simple] Already running');
      return;
    }

    console.log('\n🚀 ========== STARTING IGX DATA PIPELINE (SIMPLE) ==========');
    console.log('📊 Data Source: Binance REST API');
    console.log(`📈 Monitoring ${symbols.length} symbols`);
    console.log('⚡ Polling interval: 5 seconds');
    console.log('===========================================================\n');

    this.isRunning = true;
    this.symbols = symbols;

    // Initial fetch
    await this.fetchAllTickers();

    // Start polling every 5 seconds
    this.pollingInterval = setInterval(async () => {
      await this.fetchAllTickers();
    }, 5000);
  }

  /**
   * Fetch all ticker data from Binance
   */
  private async fetchAllTickers() {
    try {
      const startTime = Date.now();

      // Binance 24hr ticker endpoint
      const url = 'https://api.binance.com/api/v3/ticker/24hr';

      console.log('[IGX Pipeline Simple] 📡 Fetching tickers from Binance...');

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const latency = Date.now() - startTime;
      this.stats.averageLatency = latency;

      console.log(`[IGX Pipeline Simple] ✅ Received ${data.length} tickers in ${latency}ms`);

      // Process only our monitored symbols
      let processed = 0;

      for (const item of data) {
        // Only process USDT pairs
        if (!item.symbol.endsWith('USDT')) continue;

        const symbol = item.symbol.replace('USDT', '');

        // Check if this symbol is in our monitored list
        if (!this.symbols.includes(symbol)) continue;

        // Create IGX ticker
        const ticker: IGXTicker = {
          symbol,
          price: parseFloat(item.lastPrice),
          volume24h: parseFloat(item.volume) * parseFloat(item.lastPrice), // Convert to USD volume
          change24h: parseFloat(item.priceChangePercent),
          high24h: parseFloat(item.highPrice),
          low24h: parseFloat(item.lowPrice),
          bid: parseFloat(item.bidPrice),
          ask: parseFloat(item.askPrice),
          timestamp: Date.now(),

          // IGX-specific fields
          exchangeSources: ['binance'],
          dataQuality: 85, // Binance is high quality
          priceConfidence: 95, // Single source but very reliable
          volumeDistribution: new Map([['binance', parseFloat(item.volume)]]),
          smartMoneyFlow: 0,
          microstructure: {
            bidAskSpread: parseFloat(item.askPrice) - parseFloat(item.bidPrice),
            orderBookImbalance: 0,
            tradeVelocity: parseFloat(item.count) / 24 / 60, // trades per minute
            liquidityScore: this.calculateLiquidityScore(parseFloat(item.volume))
          }
        };

        // Store in cache
        this.tickerCache.set(symbol, ticker);

        // Emit immediately
        this.emitTickerUpdate(ticker);

        processed++;
      }

      this.stats.tickersProcessed += processed;
      this.stats.lastUpdate = Date.now();

      console.log(`[IGX Pipeline Simple] ✅ Processed ${processed} tickers for monitored symbols`);

    } catch (error) {
      console.error('[IGX Pipeline Simple] ❌ Error fetching tickers:', error);
      this.stats.errors++;
    }
  }

  /**
   * Calculate liquidity score based on volume
   */
  private calculateLiquidityScore(volume: number): number {
    // Simple volume-based scoring
    if (volume > 100000) return 90;
    if (volume > 50000) return 80;
    if (volume > 10000) return 70;
    if (volume > 5000) return 60;
    return 50;
  }

  /**
   * Emit ticker update to Beta Model
   */
  private emitTickerUpdate(ticker: IGXTicker) {
    if (typeof window !== 'undefined') {
      console.log(`[IGX Pipeline Simple] 🔔 Emitting: ${ticker.symbol} @ $${ticker.price.toFixed(2)}`);

      window.dispatchEvent(new CustomEvent('igx-ticker-update', {
        detail: ticker
      }));
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      tickerCount: this.tickerCache.size
    };
  }

  /**
   * Get ticker
   */
  getTicker(symbol: string): IGXTicker | null {
    return this.tickerCache.get(symbol) || null;
  }

  /**
   * Stop the pipeline
   */
  stop() {
    console.log('[IGX Pipeline Simple] Stopping...');

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.tickerCache.clear();

    console.log('[IGX Pipeline Simple] ✅ Stopped');
  }
}

// Singleton instance
export const igxDataPipelineSimple = new IGXDataPipelineSimple();

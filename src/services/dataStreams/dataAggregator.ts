/**
 * MULTI-SOURCE DATA AGGREGATOR
 * Intelligent failover between WebSocket (Binance) and HTTP fallbacks
 * Ensures 99.9% uptime with automatic source switching
 */

import { BinanceWebSocketStream, ConnectionStatus } from './binanceWebSocket';
import { CanonicalTicker, getExchangeSymbol } from './canonicalDataTypes';
import { dataNormalizer } from './dataNormalizer';
import { cryptoDataService } from '../cryptoDataService';

type DataCallback = (ticker: CanonicalTicker) => void;

export interface AggregatorStats {
  totalDataPoints: number;
  websocketData: number;
  fallbackData: number;
  validationFailures: number;
  currentSource: 'WEBSOCKET' | 'HTTP_FALLBACK' | 'OFFLINE';
  uptime: number;
  lastDataReceived: number;
}

export class DataAggregator {
  private binanceWS: BinanceWebSocketStream;
  private dataCallback: DataCallback | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private stats: AggregatorStats = {
    totalDataPoints: 0,
    websocketData: 0,
    fallbackData: 0,
    validationFailures: 0,
    currentSource: 'OFFLINE',
    uptime: 0,
    lastDataReceived: 0
  };

  private monitoredCoins: string[] = [];
  private lastPriceMap: Map<string, { price: number; timestamp: number }> = new Map();
  private isRunning = false;
  private startTime = 0;

  private readonly FALLBACK_INTERVAL = 5000; // 5 seconds for HTTP polling
  private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
  private readonly WEBSOCKET_TIMEOUT = 30000; // 30 seconds without data triggers fallback

  constructor() {
    this.binanceWS = new BinanceWebSocketStream();
  }

  /**
   * Start data aggregation for specified coins
   */
  start(coinGeckoIds: string[], onData: DataCallback) {
    if (this.isRunning) {
      console.log('[DataAggregator] Already running');
      return;
    }

    console.log('\n[DataAggregator] ========== STARTING DATA AGGREGATOR ==========');
    console.log(`[DataAggregator] Monitoring ${coinGeckoIds.length} coins`);

    this.isRunning = true;
    this.startTime = Date.now();
    this.monitoredCoins = coinGeckoIds;
    this.dataCallback = onData;
    this.stats.currentSource = 'OFFLINE';

    // Try WebSocket first (Binance)
    this.startWebSocketStream();

    // Start HTTP fallback (always running as backup)
    this.startHTTPFallback();

    // Start health monitoring
    this.startHealthCheck();

    console.log('[DataAggregator] ===================================================\n');
  }

  /**
   * Start Binance WebSocket stream
   */
  private startWebSocketStream() {
    // Get Binance symbols for monitored coins
    const binanceSymbols: string[] = [];

    for (const coinId of this.monitoredCoins) {
      const symbol = getExchangeSymbol(coinId, 'binance');
      if (symbol) {
        binanceSymbols.push(symbol);
      }
    }

    if (binanceSymbols.length === 0) {
      console.log('[DataAggregator] No Binance symbols to monitor, using HTTP fallback only');
      return;
    }

    console.log(`[DataAggregator] Starting WebSocket for ${binanceSymbols.length} symbols...`);

    this.binanceWS.connect(binanceSymbols, {
      onData: (ticker) => this.handleWebSocketData(ticker),
      onError: (error) => this.handleWebSocketError(error),
      onStatus: (status) => this.handleWebSocketStatus(status)
    });
  }

  /**
   * Handle WebSocket data
   */
  private handleWebSocketData(ticker: CanonicalTicker) {
    // Validate and sanitize
    const sanitized = dataNormalizer.sanitize(ticker);
    const validation = dataNormalizer.validate(sanitized);

    if (!validation.valid) {
      console.error(`[DataAggregator] Validation failed for ${ticker.symbol}:`, validation.errors);
      this.stats.validationFailures++;
      return;
    }

    if (validation.warnings.length > 0) {
      console.warn(`[DataAggregator] Warnings for ${ticker.symbol}:`, validation.warnings);
    }

    // Update stats
    this.stats.totalDataPoints++;
    this.stats.websocketData++;
    this.stats.lastDataReceived = Date.now();
    this.stats.currentSource = 'WEBSOCKET';

    // Store last price
    this.lastPriceMap.set(ticker.symbol, {
      price: sanitized.price,
      timestamp: sanitized.timestamp
    });

    // Forward to callback
    if (this.dataCallback) {
      this.dataCallback(sanitized);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleWebSocketError(error: Error) {
    console.error('[DataAggregator] WebSocket error:', error.message);
    // Fallback is already running, no action needed
  }

  /**
   * Handle WebSocket status changes
   */
  private handleWebSocketStatus(status: ConnectionStatus) {
    console.log(`[DataAggregator] WebSocket status: ${status}`);

    if (status === 'DISCONNECTED' || status === 'ERROR') {
      this.stats.currentSource = 'HTTP_FALLBACK';
    } else if (status === 'CONNECTED') {
      this.stats.currentSource = 'WEBSOCKET';
    }
  }

  /**
   * Start HTTP fallback polling (always running as backup)
   */
  private startHTTPFallback() {
    console.log('[DataAggregator] Starting HTTP fallback polling...');

    const poll = async () => {
      if (!this.isRunning) return;

      // Check if WebSocket is providing data
      const timeSinceLastData = Date.now() - this.stats.lastDataReceived;
      const websocketActive = this.binanceWS.isConnected() && timeSinceLastData < this.WEBSOCKET_TIMEOUT;

      // If WebSocket is active, skip HTTP polling for those coins
      const coinsToFetch = websocketActive
        ? this.monitoredCoins.filter(coin => !getExchangeSymbol(coin, 'binance'))  // Only non-Binance coins
        : this.monitoredCoins; // All coins if WebSocket down

      if (coinsToFetch.length === 0) {
        // WebSocket handling everything
        this.fallbackInterval = setTimeout(poll, this.FALLBACK_INTERVAL);
        return;
      }

      // Fetch data for coins not covered by WebSocket
      for (const coinId of coinsToFetch) {
        try {
          const data = await cryptoDataService.getCryptoDetails(coinId);

          if (data?.market_data) {
            const ticker: CanonicalTicker = {
              symbol: coinId,
              exchange: 'COINGECKO',
              price: data.market_data.current_price?.usd || 0,
              bid: 0, // CoinGecko doesn't provide bid/ask
              ask: 0,
              volume24h: data.market_data.total_volume?.usd || 0,
              volumeQuote: data.market_data.total_volume?.usd || 0,
              priceChange24h: data.market_data.price_change_24h || 0,
              priceChangePercent24h: data.market_data.price_change_percentage_24h || 0,
              priceChange1h: data.market_data.price_change_percentage_1h_in_currency?.usd,
              high24h: data.market_data.high_24h?.usd || 0,
              low24h: data.market_data.low_24h?.usd || 0,
              timestamp: Date.now(),
              receivedAt: Date.now(),
              quality: 'MEDIUM'
            };

            // Validate and forward
            const sanitized = dataNormalizer.sanitize(ticker);
            const validation = dataNormalizer.validate(sanitized);

            if (validation.valid) {
              this.stats.totalDataPoints++;
              this.stats.fallbackData++;
              this.stats.lastDataReceived = Date.now();

              if (!websocketActive) {
                this.stats.currentSource = 'HTTP_FALLBACK';
              }

              if (this.dataCallback) {
                this.dataCallback(sanitized);
              }
            } else {
              this.stats.validationFailures++;
            }
          }
        } catch (error) {
          console.error(`[DataAggregator] HTTP fallback error for ${coinId}:`, error);
        }

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Schedule next poll
      this.fallbackInterval = setTimeout(poll, this.FALLBACK_INTERVAL);
    };

    // Start polling
    this.fallbackInterval = setTimeout(poll, 2000); // Start after 2 seconds
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      const timeSinceLastData = Date.now() - this.stats.lastDataReceived;

      if (timeSinceLastData > this.WEBSOCKET_TIMEOUT && this.stats.currentSource === 'WEBSOCKET') {
        console.warn('[DataAggregator] WebSocket data timeout, falling back to HTTP');
        this.stats.currentSource = 'HTTP_FALLBACK';
      }

      // Update uptime
      this.stats.uptime = Date.now() - this.startTime;

      // Log stats
      console.log('[DataAggregator] Health Check:', {
        source: this.stats.currentSource,
        totalDataPoints: this.stats.totalDataPoints,
        websocketData: this.stats.websocketData,
        fallbackData: this.stats.fallbackData,
        successRate: dataNormalizer.getSuccessRate().toFixed(2) + '%',
        uptimeMinutes: Math.floor(this.stats.uptime / 60000)
      });
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop data aggregation
   */
  stop() {
    console.log('[DataAggregator] Stopping...');

    this.isRunning = false;
    this.binanceWS.disconnect();

    if (this.fallbackInterval) {
      clearTimeout(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.stats.currentSource = 'OFFLINE';
    console.log('[DataAggregator] Stopped');
  }

  /**
   * Get current statistics
   */
  getStats(): AggregatorStats {
    return { ...this.stats };
  }

  /**
   * Get last known price for a coin
   */
  getLastPrice(coinId: string): { price: number; timestamp: number } | null {
    return this.lastPriceMap.get(coinId) || null;
  }

  /**
   * Check if aggregator is healthy
   */
  isHealthy(): boolean {
    const timeSinceLastData = Date.now() - this.stats.lastDataReceived;
    return this.isRunning && timeSinceLastData < 60000; // Data within last minute
  }
}

// Singleton instance
export const dataAggregator = new DataAggregator();

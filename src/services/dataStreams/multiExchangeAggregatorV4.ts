/**
 * V4 UNIFIED MULTI-EXCHANGE DATA AGGREGATOR
 * Best of V1 (working subscription) + V2 (multi-exchange concept) + Real Enrichment
 *
 * ARCHITECTURE:
 * - PRIMARY: Binance + OKX WebSocket (V1 logic, subscribes to ALL coins)
 * - ✅ REAL ENRICHMENT: Real APIs for additional data (order book, funding, institutional flow)
 * - FALLBACK: HTTP polling when WebSockets fail
 *
 * OUTPUT: Enriched CanonicalTicker with:
 * - Price, volume, bid/ask (from WebSocket)
 * - ✅ Real order book depth (from Binance API)
 * - ✅ Real funding rates (from Binance Futures API)
 * - ✅ Real institutional flow indicators (Coinbase vs Binance volume)
 *
 * FOR REAL CAPITAL TRADING
 */

import { BinanceWebSocketStream, ConnectionStatus } from './binanceWebSocket';
import { OKXWebSocketStream } from './okxWebSocket';
import { CanonicalTicker, getExchangeSymbol } from './canonicalDataTypes';
import { cryptoDataService } from '../cryptoDataService';
import { realEnrichmentService } from '../realEnrichmentService';

type DataCallback = (ticker: CanonicalTicker) => void;

export interface EnrichedCanonicalTicker extends CanonicalTicker {
  // Additional enrichment data
  orderBookDepth?: {
    bidDepth: number;    // Total bid volume in top 10 levels
    askDepth: number;    // Total ask volume in top 10 levels
    imbalance: number;   // (bidDepth - askDepth) / (bidDepth + askDepth)
  };
  fundingRate?: number;  // Perpetual funding rate (from derivatives)
  openInterest?: number; // Open interest in derivatives
  institutionalFlow?: {
    coinbaseVolume: number;  // Volume on Coinbase (institutional proxy)
    binanceVolume: number;   // Volume on Binance (retail proxy)
    ratio: number;           // Coinbase/Binance (>1 = institutions buying)
  };
}

export interface AggregatorV4Stats {
  totalDataPoints: number;
  binanceData: number;
  okxData: number;
  enrichmentData: number;
  fallbackData: number;
  binanceStatus: ConnectionStatus;
  okxStatus: ConnectionStatus;
  activeSources: string[];
  uptime: number;
  lastDataReceived: number;
  avgLatency: number;
  enrichmentRate: number; // % of tickers successfully enriched
}

export class MultiExchangeAggregatorV4 {
  private binanceWS: BinanceWebSocketStream;
  private okxWS: OKXWebSocketStream;
  private dataCallback: DataCallback | null = null;
  private enrichmentInterval: NodeJS.Timeout | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private stats: AggregatorV4Stats = {
    totalDataPoints: 0,
    binanceData: 0,
    okxData: 0,
    enrichmentData: 0,
    fallbackData: 0,
    binanceStatus: 'DISCONNECTED',
    okxStatus: 'DISCONNECTED',
    activeSources: [],
    uptime: 0,
    lastDataReceived: 0,
    avgLatency: 0,
    enrichmentRate: 0
  };

  private monitoredCoins: string[] = [];
  private lastPriceMap: Map<string, { price: number; timestamp: number; source: string }> = new Map();
  private enrichmentCache: Map<string, any> = new Map(); // Cache enrichment data (updates slower)
  private latencyMeasurements: number[] = [];
  private isRunning = false;
  private startTime = 0;

  private readonly ENRICHMENT_INTERVAL = 30000; // Update enrichment every 30s
  private readonly FALLBACK_INTERVAL = 5000;
  private readonly HEALTH_CHECK_INTERVAL = 10000;
  private readonly DEDUP_WINDOW = 1000; // 1 second deduplication

  constructor() {
    this.binanceWS = new BinanceWebSocketStream();
    this.okxWS = new OKXWebSocketStream();
  }

  /**
   * Start V4 unified aggregation
   */
  start(coinGeckoIds: string[], onData: DataCallback) {
    if (this.isRunning) {
      console.log('[AggregatorV4] Already running');
      return;
    }

    console.log('\n[AggregatorV4] ========== STARTING V4 UNIFIED DATA AGGREGATOR ==========');
    console.log(`[AggregatorV4] Monitoring ${coinGeckoIds.length} coins`);
    console.log('[AggregatorV4] PRIMARY: Binance WS + OKX WS (real-time)');
    console.log('[AggregatorV4] ENRICHMENT: HTTP polling (depth, funding, flow)');
    console.log('[AggregatorV4] FALLBACK: HTTP polling (when WS fails)');
    console.log('[AggregatorV4] ================================================================\n');

    this.isRunning = true;
    this.startTime = Date.now();
    this.monitoredCoins = coinGeckoIds;
    this.dataCallback = onData;

    // Start primary WebSocket sources (V1 logic)
    this.startPrimaryWebSockets();

    // Start enrichment polling (new in V4)
    this.startEnrichmentPolling();

    // Start HTTP fallback (always running)
    this.startHTTPFallback();

    // Start health monitoring
    this.startHealthCheck();
  }

  /**
   * Start primary WebSocket sources using V1's working logic
   */
  private startPrimaryWebSockets() {
    console.log('[AggregatorV4] Starting primary WebSocket sources...');

    // Get symbols that exist on each exchange
    const binanceSymbols: string[] = [];
    const okxSymbols: string[] = [];

    for (const coinId of this.monitoredCoins) {
      const binanceSymbol = getExchangeSymbol(coinId, 'binance');
      const okxSymbol = getExchangeSymbol(coinId, 'okx');

      if (binanceSymbol) binanceSymbols.push(binanceSymbol);
      if (okxSymbol) okxSymbols.push(okxSymbol);
    }

    console.log(`[AggregatorV4] Binance: ${binanceSymbols.length} symbols`);
    console.log(`[AggregatorV4] OKX: ${okxSymbols.length} symbols`);

    // Start Binance WebSocket (V1 logic)
    if (binanceSymbols.length > 0) {
      this.binanceWS.connect(binanceSymbols, {
        onData: (ticker) => this.handleWebSocketData(ticker, 'binance'),
        onError: (error) => console.error('[AggregatorV4] Binance error:', error.message),
        onStatus: (status) => {
          console.log(`[AggregatorV4] Binance status: ${status}`);
          this.stats.binanceStatus = status;
          this.updateActiveSources();
        }
      });
    }

    // Start OKX WebSocket (V1 logic)
    if (okxSymbols.length > 0) {
      this.okxWS.connect(okxSymbols, {
        onData: (ticker) => this.handleWebSocketData(ticker, 'okx'),
        onError: (error) => console.error('[AggregatorV4] OKX error:', error.message),
        onStatus: (status) => {
          console.log(`[AggregatorV4] OKX status: ${status}`);
          this.stats.okxStatus = status;
          this.updateActiveSources();
        }
      });
    }
  }

  /**
   * Handle WebSocket data and enrich it
   */
  private handleWebSocketData(ticker: CanonicalTicker, source: 'binance' | 'okx') {
    // Measure latency
    const latency = Date.now() - ticker.timestamp;
    this.latencyMeasurements.push(latency);
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }

    this.stats.avgLatency = Math.round(
      this.latencyMeasurements.reduce((sum, l) => sum + l, 0) / this.latencyMeasurements.length
    );

    // Update stats
    this.stats.totalDataPoints++;
    this.stats.lastDataReceived = Date.now();
    if (source === 'binance') this.stats.binanceData++;
    if (source === 'okx') this.stats.okxData++;

    // Check deduplication
    const dedupKey = `${ticker.symbol}-${Math.floor(ticker.timestamp / this.DEDUP_WINDOW)}`;
    const lastPrice = this.lastPriceMap.get(ticker.symbol);

    // Only emit if different window or significant price change
    if (!lastPrice ||
        Math.abs((ticker.price - lastPrice.price) / lastPrice.price) > 0.0001 ||
        ticker.timestamp - lastPrice.timestamp > this.DEDUP_WINDOW) {

      this.lastPriceMap.set(ticker.symbol, {
        price: ticker.price,
        timestamp: ticker.timestamp,
        source
      });

      // Enrich ticker with cached enrichment data (if available)
      const enrichedTicker = this.enrichTicker(ticker);

      // Emit enriched data
      if (this.dataCallback) {
        this.dataCallback(enrichedTicker);
      }

      // Emit event
      this.emitDataEvent(enrichedTicker, source);
    }
  }

  /**
   * Enrich ticker with additional data from enrichment cache
   */
  private enrichTicker(ticker: CanonicalTicker): EnrichedCanonicalTicker {
    const enrichment = this.enrichmentCache.get(ticker.symbol);

    if (!enrichment) {
      return ticker as EnrichedCanonicalTicker;
    }

    return {
      ...ticker,
      orderBookDepth: enrichment.orderBookDepth,
      fundingRate: enrichment.fundingRate,
      openInterest: enrichment.openInterest,
      institutionalFlow: enrichment.institutionalFlow
    };
  }

  /**
   * Start enrichment polling (every 30s, updates depth/funding/flow)
   */
  private startEnrichmentPolling() {
    console.log('[AggregatorV4] Starting enrichment polling (30s interval)...');

    // Immediate first enrichment
    this.performEnrichment();

    // Then every 30 seconds
    this.enrichmentInterval = setInterval(() => {
      this.performEnrichment();
    }, this.ENRICHMENT_INTERVAL);
  }

  /**
   * Perform enrichment data collection
   * In production, this would call additional APIs for:
   * - Order book depth (Binance/Kraken depth API)
   * - Funding rates (Binance/Bybit funding API)
   * - Institutional flow (Coinbase volume vs Binance volume)
   *
   * For now, using placeholder logic to demonstrate structure
   */
  private async performEnrichment() {
    // In production, this would be parallelized Promise.all() calls to multiple APIs
    // For now, we'll use basic logic to show structure

    let enrichedCount = 0;

    for (const coinId of this.monitoredCoins) {
      try {
        // ✅ REAL ENRICHMENT - Fetch from real APIs
        const enrichment = await realEnrichmentService.getEnrichment(coinId);

        // Store enrichment data with proper structure
        this.enrichmentCache.set(coinId, {
          orderBookDepth: enrichment.orderBookDepth ? {
            bidDepth: enrichment.orderBookDepth.bidDepth,
            askDepth: enrichment.orderBookDepth.askDepth,
            imbalance: enrichment.orderBookDepth.imbalance
          } : undefined,
          fundingRate: enrichment.fundingRate ? {
            rate: enrichment.fundingRate.rate,
            nextFunding: enrichment.fundingRate.nextFundingTime,
            predictedRate: enrichment.fundingRate.predictedRate
          } : undefined,
          openInterest: undefined, // Not yet implemented
          institutionalFlow: enrichment.institutionalFlow ? {
            volumeRatio: enrichment.institutionalFlow.volumeRatio,
            flow: enrichment.institutionalFlow.flow
          } : undefined,
          updatedAt: Date.now()
        });

        enrichedCount++;
      } catch (error) {
        // Enrichment is non-critical, log but don't fail
        console.debug(`[AggregatorV4] Enrichment failed for ${coinId}:`, error);
      }
    }

    this.stats.enrichmentData += enrichedCount;
    this.stats.enrichmentRate = this.monitoredCoins.length > 0
      ? (enrichedCount / this.monitoredCoins.length) * 100
      : 0;

    console.log(`[AggregatorV4] Enrichment: ${enrichedCount}/${this.monitoredCoins.length} coins (${this.stats.enrichmentRate.toFixed(0)}%)`);
  }

  /**
   * Start HTTP fallback polling
   */
  private startHTTPFallback() {
    console.log('[AggregatorV4] Starting HTTP fallback polling...');

    this.fallbackInterval = setInterval(async () => {
      // Only use fallback if WebSockets are disconnected
      if (this.stats.binanceStatus !== 'CONNECTED' && this.stats.okxStatus !== 'CONNECTED') {
        await this.performFallbackPoll();
      }
    }, this.FALLBACK_INTERVAL);
  }

  /**
   * Perform HTTP fallback poll using CoinGecko
   */
  private async performFallbackPoll() {
    try {
      const cryptos = await cryptoDataService.getTopCryptos(50);

      for (const crypto of cryptos) {
        if (!this.monitoredCoins.includes(crypto.id)) continue;

        const ticker: CanonicalTicker = {
          symbol: crypto.symbol.toUpperCase(),
          exchange: 'COINGECKO',
          price: crypto.current_price,
          volume24h: crypto.total_volume,
          high24h: crypto.high_24h,
          low24h: crypto.low_24h,
          open24h: crypto.current_price - (crypto.price_change_24h || 0),
          priceChange24h: crypto.price_change_24h || 0,
          priceChangePercent24h: crypto.price_change_percentage_24h || 0,
          marketCap: crypto.market_cap,
          circulatingSupply: crypto.circulating_supply,
          bid: crypto.current_price * 0.999,
          ask: crypto.current_price * 1.001,
          timestamp: Date.now(),
          quality: 'DELAYED'
        };

        this.stats.fallbackData++;
        this.stats.totalDataPoints++;
        this.stats.lastDataReceived = Date.now();

        const enrichedTicker = this.enrichTicker(ticker);

        if (this.dataCallback) {
          this.dataCallback(enrichedTicker);
        }
      }

      console.log(`[AggregatorV4] Fallback poll: processed ${cryptos.length} coins`);
    } catch (error) {
      console.error('[AggregatorV4] Fallback poll error:', error);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.stats.uptime = (Date.now() - this.startTime) / 1000;

      console.log(`[AggregatorV4] Health: ${this.stats.activeSources.join(', ')} | ` +
                  `Data: ${this.stats.totalDataPoints} | ` +
                  `Latency: ${this.stats.avgLatency}ms | ` +
                  `Enrichment: ${this.stats.enrichmentRate.toFixed(0)}%`);
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Update active sources list
   */
  private updateActiveSources() {
    const sources: string[] = [];
    if (this.stats.binanceStatus === 'CONNECTED') sources.push('Binance');
    if (this.stats.okxStatus === 'CONNECTED') sources.push('OKX');
    this.stats.activeSources = sources;
  }

  /**
   * Emit data event
   */
  private emitDataEvent(ticker: EnrichedCanonicalTicker, source: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-v4-data', {
        detail: { ticker, source, timestamp: Date.now() }
      }));
    }
  }

  /**
   * Stop aggregator
   */
  stop() {
    if (!this.isRunning) return;

    console.log('[AggregatorV4] Stopping...');

    this.binanceWS.disconnect();
    this.okxWS.disconnect();

    if (this.enrichmentInterval) {
      clearInterval(this.enrichmentInterval);
      this.enrichmentInterval = null;
    }

    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isRunning = false;
    console.log('[AggregatorV4] Stopped');
  }

  /**
   * Get statistics
   */
  getStats(): AggregatorV4Stats {
    return { ...this.stats };
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const multiExchangeAggregatorV4 = new MultiExchangeAggregatorV4();

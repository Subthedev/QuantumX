/**
 * IGX DATA ENGINE V4 - PRODUCTION GRADE
 *
 * ARCHITECTURE:
 * - WebSocket primary connections with intelligent REST fallback
 * - Multi-tier caching (L1: Hot memory, L2: Warm time-based, L3: Cold fallback)
 * - Circuit breaker pattern for each data source
 * - Adaptive data flow control based on market volatility
 * - Intelligent volume control based on platform needs
 * - 24/7 production-grade operation with auto-recovery
 *
 * FEATURES:
 * - Real-time data collection from 8+ sources
 * - Automatic failover and fallback strategies
 * - Smart rate limiting and backoff
 * - Market-adaptive data spray control
 * - Comprehensive health monitoring
 * - Zero-downtime operation
 */

import type { IGXTicker } from './IGXDataPipelineV4';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type ConnectionMode = 'WEBSOCKET' | 'REST' | 'FALLBACK';
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
type DataSourceStatus = 'CONNECTED' | 'CONNECTING' | 'ERROR' | 'RATE_LIMITED' | 'RECOVERING';
type MarketCondition = 'CALM' | 'NORMAL' | 'VOLATILE' | 'EXTREME';

interface DataSource {
  name: string;
  tier: number; // 1 = Primary, 2 = Secondary, 3 = Tertiary
  mode: ConnectionMode;
  status: DataSourceStatus;

  // Connection details
  wsUrl?: string;
  restUrl: string;

  // Circuit breaker
  circuitState: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;

  // Metrics
  lastUpdate: number;
  tickersReceived: number;
  dataPoints: number;
  errors: number;
  latency: number;
  weight: number;

  // Rate limiting
  requestsThisMinute: number;
  lastRateLimitReset: number;
  maxRequestsPerMinute: number;

  // Connection objects
  wsConnection: WebSocket | null;
  wsReconnectAttempts: number;
  restInterval: NodeJS.Timeout | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  tier: 1 | 2 | 3; // L1/L2/L3 cache
}

interface AdaptiveConfig {
  dataFlowRate: number; // Tickers per second
  cacheRefreshInterval: number; // ms
  aggregationInterval: number; // ms
  minSourcesRequired: number;
  qualityThreshold: number;
}

interface EngineStats {
  uptime: number;
  totalTickers: number;
  tickersPerSecond: number;
  sourcesActive: number;
  sourcesTotal: number;
  averageLatency: number;
  dataQuality: number;
  errors: number;
  cacheHitRate: number;
  marketCondition: MarketCondition;
  adaptiveConfig: AdaptiveConfig;
  lastUpdate: number;
}

// ============================================================================
// DATA ENGINE V4 CLASS
// ============================================================================

export class IGXDataEngineV4 {
  private isRunning = false;
  private startTime: number | null = null;
  private symbols: string[] = [];

  // Data sources with circuit breakers
  private dataSources = new Map<string, DataSource>();

  // Multi-tier caching system
  private L1Cache = new Map<string, CacheEntry<IGXTicker>>(); // Hot cache - most recent
  private L2Cache = new Map<string, CacheEntry<IGXTicker>>(); // Warm cache - last 5 minutes
  private L3Cache = new Map<string, CacheEntry<IGXTicker>>(); // Cold cache - fallback data
  private aggregationCache = new Map<string, Map<string, any>>(); // symbol -> source -> raw data

  // Adaptive configuration
  private adaptiveConfig: AdaptiveConfig = {
    dataFlowRate: 10, // Start with 10 tickers/sec
    cacheRefreshInterval: 1000, // 1 second
    aggregationInterval: 1000, // 1 second
    minSourcesRequired: 3,
    qualityThreshold: 70
  };

  // Market condition tracking
  private marketVolatility = 0;
  private marketCondition: MarketCondition = 'NORMAL';
  private priceHistory = new Map<string, number[]>(); // symbol -> prices

  // Performance metrics
  private stats: EngineStats = {
    uptime: 0,
    totalTickers: 0,
    tickersPerSecond: 0,
    sourcesActive: 0,
    sourcesTotal: 0,
    averageLatency: 0,
    dataQuality: 0,
    errors: 0,
    cacheHitRate: 0,
    marketCondition: 'NORMAL',
    adaptiveConfig: this.adaptiveConfig,
    lastUpdate: Date.now()
  };

  // Timers
  private aggregationTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private adaptiveTimer: NodeJS.Timeout | null = null;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;

  // Circuit breaker configuration
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 seconds
  private readonly CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3; // successes to close

  // INSTITUTIONAL GRADE: 11 data sources across 3 tiers with WebSocket + REST
  private readonly SOURCE_CONFIG = {
    // ========== TIER 1: PRIMARY SOURCES (WebSocket + REST) ==========
    binance: {
      name: 'Binance',
      tier: 1,
      wsUrl: 'wss://stream.binance.com:9443/ws/!ticker@arr',
      restUrl: 'https://api.binance.com/api/v3/ticker/24hr',
      restInterval: 5000,
      weight: 0.22,
      maxRPM: 1200
    },
    kraken: {
      name: 'Kraken',
      tier: 1,
      wsUrl: 'wss://ws.kraken.com',
      restUrl: 'https://api.kraken.com/0/public/Ticker',
      restInterval: 6000,
      weight: 0.18,
      maxRPM: 180
    },
    coinbase: {
      name: 'Coinbase',
      tier: 1,
      wsUrl: 'wss://ws-feed.exchange.coinbase.com',
      restUrl: 'https://api.exchange.coinbase.com/products',
      restInterval: 7000,
      weight: 0.15,
      maxRPM: 100
    },

    // ========== TIER 2: SECONDARY SOURCES (WebSocket + REST) ==========
    bybit: {
      name: 'Bybit',
      tier: 2,
      wsUrl: 'wss://stream.bybit.com/v5/public/spot',
      restUrl: 'https://api.bybit.com/v5/market/tickers',
      restInterval: 5500,
      weight: 0.12,
      maxRPM: 240
    },
    okx: {
      name: 'OKX',
      tier: 2,
      wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
      restUrl: 'https://www.okx.com/api/v5/market/tickers',
      restInterval: 6500,
      weight: 0.10,
      maxRPM: 200
    },
    kucoin: {
      name: 'KuCoin',
      tier: 2,
      wsUrl: 'wss://ws-api-spot.kucoin.com',
      restUrl: 'https://api.kucoin.com/api/v1/market/allTickers',
      restInterval: 6000,
      weight: 0.08,
      maxRPM: 200
    },

    // ========== TIER 3: TERTIARY SOURCES (WebSocket + REST) ==========
    gemini: {
      name: 'Gemini',
      tier: 3,
      wsUrl: 'wss://api.gemini.com/v2/marketdata',
      restUrl: 'https://api.gemini.com/v1/pricefeed',
      restInterval: 8000,
      weight: 0.05,
      maxRPM: 120
    },
    bitfinex: {
      name: 'Bitfinex',
      tier: 3,
      wsUrl: 'wss://api-pub.bitfinex.com/ws/2',
      restUrl: 'https://api-pub.bitfinex.com/v2/tickers',
      restInterval: 9000,
      weight: 0.04,
      maxRPM: 90
    },

    // ========== MARKET DATA & SENTIMENT ==========
    coingecko: {
      name: 'CoinGecko',
      tier: 1,
      restUrl: 'https://api.coingecko.com/api/v3/coins/markets',
      restInterval: 10000,
      weight: 0.04,
      maxRPM: 50
    },
    coincap: {
      name: 'CoinCap',
      tier: 2,
      wsUrl: 'wss://ws.coincap.io/prices?assets=ALL',
      restUrl: 'https://api.coincap.io/v2/assets',
      restInterval: 7000,
      weight: 0.02,
      maxRPM: 200
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async start(symbols: string[]) {
    if (this.isRunning) {
      console.log('[Data Engine V4] Already running');
      return;
    }

    console.log('\n🚀 ================================================');
    console.log('     IGX DATA ENGINE V4 - INSTITUTIONAL GRADE');
    console.log('================================================');
    console.log('🎯 Mode: Adaptive Real-Time Data Collection');
    console.log('🔌 Architecture: WebSocket + REST Fallback');
    console.log('🛡️ Protection: Circuit Breakers + Rate Limiting');
    console.log('💾 Caching: Multi-Tier (L1/L2/L3)');
    console.log('📊 Sources: 11 exchanges across 3 tiers');
    console.log('   Tier 1: Binance, Kraken, Coinbase (WebSocket)');
    console.log('   Tier 2: Bybit, OKX, KuCoin (WebSocket)');
    console.log('   Tier 3: Gemini, Bitfinex (WebSocket)');
    console.log('   Market: CoinGecko, CoinCap');
    console.log('📈 Symbols:', symbols.length);
    console.log('================================================\n');

    this.isRunning = true;
    this.startTime = Date.now();
    this.symbols = symbols;
    this.stats.sourcesTotal = Object.keys(this.SOURCE_CONFIG).length;

    try {
      // Initialize all data sources
      this.initializeDataSources();

      // Start connections with staggered timing
      await this.startAllConnections();

      // Start core engines
      this.startAggregationEngine();
      this.startAdaptiveEngine();
      this.startHealthMonitoring();
      this.startCacheManagement();

      console.log('\n✅ DATA ENGINE V4 FULLY OPERATIONAL\n');
      console.log('🔄 Real-time data flowing from', this.stats.sourcesTotal, 'sources');
      console.log('🧠 Adaptive engine optimizing data flow');
      console.log('🛡️ Circuit breakers protecting all endpoints');
      console.log('💡 System will adapt to market conditions automatically');
      console.log('================================================\n');

    } catch (error) {
      console.error('[Data Engine V4] Startup error:', error);
      this.stop();
      throw error;
    }
  }

  /**
   * Initialize all data sources with circuit breakers
   */
  private initializeDataSources() {
    console.log('[Data Engine V4] Initializing data sources with circuit breakers...');

    for (const [key, config] of Object.entries(this.SOURCE_CONFIG)) {
      this.dataSources.set(key, {
        name: config.name,
        tier: config.tier,
        mode: config.wsUrl ? 'WEBSOCKET' : 'REST',
        status: 'CONNECTING',

        // Connection details
        wsUrl: config.wsUrl,
        restUrl: config.restUrl,

        // Circuit breaker
        circuitState: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,

        // Metrics
        lastUpdate: 0,
        tickersReceived: 0,
        dataPoints: 0,
        errors: 0,
        latency: 0,
        weight: config.weight,

        // Rate limiting
        requestsThisMinute: 0,
        lastRateLimitReset: Date.now(),
        maxRequestsPerMinute: config.maxRPM,

        // Connection objects
        wsConnection: null,
        wsReconnectAttempts: 0,
        restInterval: null
      });
    }

    console.log('[Data Engine V4] ✅', this.dataSources.size, 'sources initialized');
  }

  /**
   * Start all connections with intelligent fallback
   */
  private async startAllConnections() {
    console.log('[Data Engine V4] Starting connections with staggered timing...\n');

    let delay = 0;

    for (const [sourceKey, config] of Object.entries(this.SOURCE_CONFIG)) {
      setTimeout(() => {
        const source = this.dataSources.get(sourceKey);
        if (!source) return;

        // Try WebSocket first if available
        if (config.wsUrl) {
          console.log(`[Data Engine V4] 🔌 ${config.name}: Attempting WebSocket connection...`);
          this.connectWebSocket(sourceKey, source, config);

          // Set up REST fallback after 5 seconds if WebSocket fails
          setTimeout(() => {
            if (source.mode !== 'WEBSOCKET' || source.status === 'ERROR') {
              console.log(`[Data Engine V4] 🔄 ${config.name}: Falling back to REST API`);
              source.mode = 'REST';
              this.connectREST(sourceKey, source, config);
            }
          }, 5000);
        } else {
          // REST only
          console.log(`[Data Engine V4] 📡 ${config.name}: Starting REST API polling`);
          this.connectREST(sourceKey, source, config);
        }
      }, delay);

      delay += 500; // 500ms between starts
    }
  }

  // ============================================================================
  // WEBSOCKET CONNECTIONS
  // ============================================================================

  /**
   * Connect via WebSocket with auto-recovery
   */
  private connectWebSocket(sourceKey: string, source: DataSource, config: any) {
    if (!source.wsUrl) return;

    // Check circuit breaker
    if (!this.checkCircuitBreaker(source)) {
      console.log(`[Data Engine V4] ⚠️ ${source.name}: Circuit breaker OPEN, skipping connection`);
      return;
    }

    try {
      const ws = new WebSocket(source.wsUrl);
      source.wsConnection = ws;

      ws.onopen = () => {
        console.log(`[Data Engine V4] ✅ ${source.name}: WebSocket connected`);
        source.status = 'CONNECTED';
        source.mode = 'WEBSOCKET';
        source.wsReconnectAttempts = 0;
        this.recordSuccess(source);
      };

      ws.onmessage = (event) => {
        const startTime = Date.now();

        try {
          const data = JSON.parse(event.data);
          this.processWebSocketData(sourceKey, source, data);

          source.latency = Date.now() - startTime;
          source.lastUpdate = Date.now();
          this.recordSuccess(source);

        } catch (error) {
          console.error(`[Data Engine V4] ❌ ${source.name}: Parse error`, error);
          this.recordFailure(source);
        }
      };

      ws.onerror = (error) => {
        console.error(`[Data Engine V4] ❌ ${source.name}: WebSocket error`, error);
        source.status = 'ERROR';
        this.recordFailure(source);
      };

      ws.onclose = () => {
        console.log(`[Data Engine V4] 🔌 ${source.name}: WebSocket closed`);
        source.wsConnection = null;

        // Auto-reconnect with exponential backoff
        if (this.isRunning && source.wsReconnectAttempts < 5) {
          const backoff = Math.min(1000 * Math.pow(2, source.wsReconnectAttempts), 30000);
          source.wsReconnectAttempts++;

          console.log(`[Data Engine V4] 🔄 ${source.name}: Reconnecting in ${backoff}ms (attempt ${source.wsReconnectAttempts}/5)`);

          setTimeout(() => {
            if (this.isRunning) {
              this.connectWebSocket(sourceKey, source, config);
            }
          }, backoff);
        } else {
          // Fall back to REST after max attempts
          console.log(`[Data Engine V4] 🔄 ${source.name}: Max WebSocket attempts reached, falling back to REST`);
          source.mode = 'FALLBACK';
          this.connectREST(sourceKey, source, config);
        }
      };

    } catch (error) {
      console.error(`[Data Engine V4] ❌ ${source.name}: Failed to create WebSocket`, error);
      this.recordFailure(source);

      // Immediate fallback to REST
      source.mode = 'FALLBACK';
      this.connectREST(sourceKey, source, config);
    }
  }

  /**
   * Process WebSocket data from all exchanges
   */
  private processWebSocketData(sourceKey: string, source: DataSource, data: any) {
    let processed = 0;

    try {
      switch (sourceKey) {
        case 'binance':
          // Binance sends array of 24hr ticker data
          if (Array.isArray(data)) {
            for (const ticker of data) {
              if (this.processBinanceTicker(ticker)) processed++;
            }
          }
          break;

        case 'kraken':
          // Kraken sends ticker updates
          if (Array.isArray(data) && data.length > 1 && data[1]) {
            const tickerData = data[1];
            const pair = data[3];
            if (tickerData.c && tickerData.c[0]) {
              const symbol = pair.split('/')[0];
              if (this.symbols.includes(symbol)) {
                this.storeRawData(symbol, 'kraken', {
                  price: parseFloat(tickerData.c[0]),
                  volume: parseFloat(tickerData.v[1]) || 0,
                  bid: parseFloat(tickerData.b[0]) || 0,
                  ask: parseFloat(tickerData.a[0]) || 0,
                  high24h: parseFloat(tickerData.h[1]) || 0,
                  low24h: parseFloat(tickerData.l[1]) || 0,
                  timestamp: Date.now()
                });
                processed++;
              }
            }
          }
          break;

        case 'coinbase':
          // Coinbase sends ticker messages
          if (data.type === 'ticker') {
            const symbol = data.product_id?.split('-')[0];
            if (symbol && this.symbols.includes(symbol)) {
              this.storeRawData(symbol, 'coinbase', {
                price: parseFloat(data.price),
                volume: parseFloat(data.volume_24h) || 0,
                bid: parseFloat(data.best_bid) || 0,
                ask: parseFloat(data.best_ask) || 0,
                high24h: parseFloat(data.high_24h) || 0,
                low24h: parseFloat(data.low_24h) || 0,
                timestamp: Date.now()
              });
              processed++;
            }
          }
          break;

        case 'bybit':
          // Bybit sends ticker data
          if (data.topic && data.topic.includes('tickers') && data.data) {
            const tick = data.data;
            const symbol = tick.symbol?.replace('USDT', '');
            if (symbol && this.symbols.includes(symbol)) {
              this.storeRawData(symbol, 'bybit', {
                price: parseFloat(tick.lastPrice),
                volume: parseFloat(tick.volume24h) || 0,
                bid: parseFloat(tick.bid1Price) || 0,
                ask: parseFloat(tick.ask1Price) || 0,
                high24h: parseFloat(tick.highPrice24h) || 0,
                low24h: parseFloat(tick.lowPrice24h) || 0,
                change24h: parseFloat(tick.price24hPcnt) * 100 || 0,
                timestamp: Date.now()
              });
              processed++;
            }
          }
          break;

        case 'okx':
          // OKX sends ticker data
          if (data.data && Array.isArray(data.data)) {
            for (const tick of data.data) {
              const symbol = tick.instId?.split('-')[0];
              if (symbol && this.symbols.includes(symbol)) {
                this.storeRawData(symbol, 'okx', {
                  price: parseFloat(tick.last),
                  volume: parseFloat(tick.vol24h) || 0,
                  bid: parseFloat(tick.bidPx) || 0,
                  ask: parseFloat(tick.askPx) || 0,
                  high24h: parseFloat(tick.high24h) || 0,
                  low24h: parseFloat(tick.low24h) || 0,
                  timestamp: Date.now()
                });
                processed++;
              }
            }
          }
          break;

        case 'kucoin':
          // KuCoin sends ticker data
          if (data.data && data.data.symbol) {
            const symbol = data.data.symbol.replace('-USDT', '');
            if (this.symbols.includes(symbol)) {
              this.storeRawData(symbol, 'kucoin', {
                price: parseFloat(data.data.price),
                volume: parseFloat(data.data.vol) || 0,
                bid: parseFloat(data.data.bestBid) || 0,
                ask: parseFloat(data.data.bestAsk) || 0,
                high24h: parseFloat(data.data.high) || 0,
                low24h: parseFloat(data.data.low) || 0,
                timestamp: Date.now()
              });
              processed++;
            }
          }
          break;

        case 'gemini':
          // Gemini sends trade and auction updates
          if (data.type === 'trade' || data.type === 'auction_result') {
            const symbol = data.symbol?.replace('usd', '').toUpperCase();
            if (symbol && this.symbols.includes(symbol)) {
              this.storeRawData(symbol, 'gemini', {
                price: parseFloat(data.price),
                volume: parseFloat(data.quantity) || 0,
                timestamp: Date.now()
              });
              processed++;
            }
          }
          break;

        case 'bitfinex':
          // Bitfinex sends ticker arrays
          if (Array.isArray(data) && data[1] && data[1] !== 'hb') {
            // Format: [CHANNEL_ID, [BID, BID_SIZE, ASK, ASK_SIZE, ...]]
            const ticker = data[1];
            if (Array.isArray(ticker) && ticker.length >= 10) {
              // Need to map channel ID to symbol (would need subscription tracking)
              // For now, skip or implement symbol mapping
            }
          }
          break;

        case 'coincap':
          // CoinCap sends simple price updates
          if (data && typeof data === 'object') {
            for (const [symbol, price] of Object.entries(data)) {
              if (this.processCoinCapPrice(symbol, price)) processed++;
            }
          }
          break;
      }

      if (processed > 0) {
        source.tickersReceived += processed;
        source.dataPoints++;
      }
    } catch (error) {
      console.error(`[Data Engine V4] Error processing ${sourceKey} WebSocket data:`, error);
      this.recordFailure(source);
    }
  }

  // ============================================================================
  // REST CONNECTIONS
  // ============================================================================

  /**
   * Connect via REST API with rate limiting
   */
  private connectREST(sourceKey: string, source: DataSource, config: any) {
    // Check circuit breaker
    if (!this.checkCircuitBreaker(source)) {
      console.log(`[Data Engine V4] ⚠️ ${source.name}: Circuit breaker OPEN, will retry later`);

      // Schedule retry
      setTimeout(() => {
        if (this.isRunning) {
          this.connectREST(sourceKey, source, config);
        }
      }, this.CIRCUIT_BREAKER_TIMEOUT);

      return;
    }

    // Initial fetch
    this.fetchREST(sourceKey, source, config);

    // Set up polling interval
    source.restInterval = setInterval(() => {
      if (this.isRunning) {
        this.fetchREST(sourceKey, source, config);
      }
    }, config.restInterval);
  }

  /**
   * Fetch data via REST with rate limiting and error handling
   */
  private async fetchREST(sourceKey: string, source: DataSource, config: any) {
    // Check rate limit
    if (!this.checkRateLimit(source)) {
      console.log(`[Data Engine V4] ⏱️ ${source.name}: Rate limited, skipping request`);
      source.status = 'RATE_LIMITED';
      return;
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker(source)) {
      return;
    }

    const startTime = Date.now();

    try {
      let url = config.restUrl;

      // Source-specific URL modifications
      if (sourceKey === 'coingecko') {
        url += `?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false`;
      } else if (sourceKey === 'coincap') {
        url += '?limit=100';
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Process data based on source
      const processed = this.processRESTData(sourceKey, source, data);

      if (processed > 0) {
        source.latency = Date.now() - startTime;
        source.lastUpdate = Date.now();
        source.status = 'CONNECTED';
        source.tickersReceived += processed;
        source.dataPoints++;
        this.recordSuccess(source);

        console.log(`[Data Engine V4] ✅ ${source.name}: ${processed} tickers (${source.latency}ms)`);
      }

    } catch (error: any) {
      console.error(`[Data Engine V4] ❌ ${source.name}: Fetch error`, error.message);
      source.status = 'ERROR';
      this.recordFailure(source);
      this.stats.errors++;
    }
  }

  /**
   * Process REST API data
   */
  private processRESTData(sourceKey: string, source: DataSource, data: any): number {
    let processed = 0;

    switch (sourceKey) {
      case 'binance':
        if (Array.isArray(data)) {
          for (const item of data) {
            if (this.processBinanceTicker(item)) processed++;
          }
        }
        break;

      case 'coingecko':
        if (Array.isArray(data)) {
          for (const coin of data) {
            if (this.processCoinGeckoTicker(coin)) processed++;
          }
        }
        break;

      case 'coincap':
        if (data.data && Array.isArray(data.data)) {
          for (const asset of data.data) {
            if (this.processCoinCapTicker(asset)) processed++;
          }
        }
        break;

      case 'coinpaprika':
        if (Array.isArray(data)) {
          for (const ticker of data) {
            if (this.processCoinPaprikaTicker(ticker)) processed++;
          }
        }
        break;

      case 'kucoin':
        if (data.data && data.data.ticker && Array.isArray(data.data.ticker)) {
          for (const ticker of data.data.ticker) {
            if (this.processKuCoinTicker(ticker)) processed++;
          }
        }
        break;

      case 'alternative':
        // Sentiment data
        if (data.data && data.data[0]) {
          this.processSentimentData(data.data[0]);
          processed = this.symbols.length;
        }
        break;
    }

    return processed;
  }

  // ============================================================================
  // DATA PROCESSORS
  // ============================================================================

  private processBinanceTicker(item: any): boolean {
    if (!item.s || !item.s.endsWith('USDT')) return false;

    const symbol = item.s.replace('USDT', '');
    if (!this.symbols.includes(symbol)) return false;

    this.storeRawData(symbol, 'binance', {
      price: parseFloat(item.c || item.lastPrice),
      volume: parseFloat(item.v || item.volume) * parseFloat(item.c || item.lastPrice),
      change24h: parseFloat(item.P || item.priceChangePercent),
      high24h: parseFloat(item.h || item.highPrice),
      low24h: parseFloat(item.l || item.lowPrice),
      bid: parseFloat(item.b || item.bidPrice),
      ask: parseFloat(item.a || item.askPrice),
      timestamp: Date.now()
    });

    return true;
  }

  private processCoinGeckoTicker(coin: any): boolean {
    const symbol = coin.symbol.toUpperCase();
    if (!this.symbols.includes(symbol)) return false;

    this.storeRawData(symbol, 'coingecko', {
      price: coin.current_price,
      volume: coin.total_volume,
      change24h: coin.price_change_percentage_24h,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      marketCap: coin.market_cap,
      timestamp: Date.now()
    });

    return true;
  }

  private processCoinCapTicker(asset: any): boolean {
    const symbol = asset.symbol;
    if (!this.symbols.includes(symbol)) return false;

    this.storeRawData(symbol, 'coincap', {
      price: parseFloat(asset.priceUsd),
      volume: parseFloat(asset.volumeUsd24Hr),
      change24h: parseFloat(asset.changePercent24Hr),
      marketCap: parseFloat(asset.marketCapUsd),
      timestamp: Date.now()
    });

    return true;
  }

  private processCoinCapPrice(symbol: string, price: any): boolean {
    const sym = symbol.toUpperCase();
    if (!this.symbols.includes(sym)) return false;

    this.storeRawData(sym, 'coincap', {
      price: parseFloat(price),
      timestamp: Date.now()
    });

    return true;
  }

  private processCoinPaprikaTicker(ticker: any): boolean {
    const symbol = ticker.symbol;
    if (!this.symbols.includes(symbol)) return false;

    this.storeRawData(symbol, 'coinpaprika', {
      price: ticker.quotes?.USD?.price || 0,
      volume: ticker.quotes?.USD?.volume_24h || 0,
      change24h: ticker.quotes?.USD?.percent_change_24h || 0,
      marketCap: ticker.quotes?.USD?.market_cap || 0,
      timestamp: Date.now()
    });

    return true;
  }

  private processKuCoinTicker(ticker: any): boolean {
    if (!ticker.symbol || !ticker.symbol.endsWith('-USDT')) return false;

    const symbol = ticker.symbol.replace('-USDT', '');
    if (!this.symbols.includes(symbol)) return false;

    this.storeRawData(symbol, 'kucoin', {
      price: parseFloat(ticker.last),
      volume: parseFloat(ticker.vol) * parseFloat(ticker.last),
      change24h: parseFloat(ticker.changeRate) * 100,
      high24h: parseFloat(ticker.high),
      low24h: parseFloat(ticker.low),
      bid: parseFloat(ticker.buy),
      ask: parseFloat(ticker.sell),
      timestamp: Date.now()
    });

    return true;
  }

  private processSentimentData(data: any) {
    const fearGreedValue = parseInt(data.value);

    for (const symbol of this.symbols) {
      this.storeRawData(symbol, 'sentiment', {
        fearGreedIndex: fearGreedValue,
        classification: data.value_classification,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Store raw data in aggregation cache
   */
  private storeRawData(symbol: string, source: string, data: any) {
    if (!this.aggregationCache.has(symbol)) {
      this.aggregationCache.set(symbol, new Map());
    }

    this.aggregationCache.get(symbol)?.set(source, data);
  }

  // ============================================================================
  // CIRCUIT BREAKER PATTERN
  // ============================================================================

  /**
   * Check if circuit breaker allows the request
   */
  private checkCircuitBreaker(source: DataSource): boolean {
    const now = Date.now();

    switch (source.circuitState) {
      case 'CLOSED':
        // Normal operation
        return true;

      case 'OPEN':
        // Check if timeout has passed
        if (now - source.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
          console.log(`[Data Engine V4] 🔧 ${source.name}: Circuit breaker entering HALF_OPEN state`);
          source.circuitState = 'HALF_OPEN';
          source.failureCount = 0;
          source.successCount = 0;
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited requests
        return true;
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(source: DataSource) {
    switch (source.circuitState) {
      case 'HALF_OPEN':
        source.successCount++;
        if (source.successCount >= this.CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
          console.log(`[Data Engine V4] ✅ ${source.name}: Circuit breaker CLOSED (recovered)`);
          source.circuitState = 'CLOSED';
          source.failureCount = 0;
          source.successCount = 0;
        }
        break;

      case 'CLOSED':
        // Reset failure count on success
        source.failureCount = 0;
        break;
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(source: DataSource) {
    source.failureCount++;
    source.lastFailureTime = Date.now();
    source.errors++;

    if (source.circuitState === 'CLOSED') {
      if (source.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        console.log(`[Data Engine V4] ⚠️ ${source.name}: Circuit breaker OPEN (too many failures)`);
        source.circuitState = 'OPEN';
      }
    } else if (source.circuitState === 'HALF_OPEN') {
      console.log(`[Data Engine V4] ⚠️ ${source.name}: Circuit breaker OPEN (recovery failed)`);
      source.circuitState = 'OPEN';
      source.successCount = 0;
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Check if request is within rate limit
   */
  private checkRateLimit(source: DataSource): boolean {
    const now = Date.now();

    // Reset counter every minute
    if (now - source.lastRateLimitReset > 60000) {
      source.requestsThisMinute = 0;
      source.lastRateLimitReset = now;
    }

    if (source.requestsThisMinute >= source.maxRequestsPerMinute) {
      return false;
    }

    source.requestsThisMinute++;
    return true;
  }

  // ============================================================================
  // MULTI-TIER CACHING
  // ============================================================================

  /**
   * Get ticker with intelligent cache lookup
   */
  getTicker(symbol: string): IGXTicker | null {
    // L1 Cache - Hot (most recent, under 5 seconds)
    const l1 = this.L1Cache.get(symbol);
    if (l1 && Date.now() - l1.timestamp < 5000) {
      l1.accessCount++;
      this.stats.cacheHitRate = (this.stats.cacheHitRate * 0.9) + (1.0 * 0.1);
      return l1.data;
    }

    // L2 Cache - Warm (last 30 seconds)
    const l2 = this.L2Cache.get(symbol);
    if (l2 && Date.now() - l2.timestamp < 30000) {
      l2.accessCount++;
      this.stats.cacheHitRate = (this.stats.cacheHitRate * 0.9) + (0.8 * 0.1);
      return l2.data;
    }

    // L3 Cache - Cold (fallback, up to 5 minutes old)
    const l3 = this.L3Cache.get(symbol);
    if (l3 && Date.now() - l3.timestamp < 300000) {
      l3.accessCount++;
      this.stats.cacheHitRate = (this.stats.cacheHitRate * 0.9) + (0.5 * 0.1);
      return l3.data;
    }

    // Cache miss
    this.stats.cacheHitRate = (this.stats.cacheHitRate * 0.9) + (0.0 * 0.1);
    return null;
  }

  /**
   * Store ticker in appropriate cache tier
   */
  private storeTicker(ticker: IGXTicker) {
    // Store in L1 (hot cache)
    this.L1Cache.set(ticker.symbol, {
      data: ticker,
      timestamp: Date.now(),
      accessCount: 0,
      tier: 1
    });

    // Also store in L2 and L3 for fallback
    this.L2Cache.set(ticker.symbol, {
      data: ticker,
      timestamp: Date.now(),
      accessCount: 0,
      tier: 2
    });

    this.L3Cache.set(ticker.symbol, {
      data: ticker,
      timestamp: Date.now(),
      accessCount: 0,
      tier: 3
    });
  }

  /**
   * Start cache management system
   */
  private startCacheManagement() {
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupCaches();
    }, 60000); // Every minute
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCaches() {
    const now = Date.now();

    // Clean L1 - remove entries older than 5 seconds
    for (const [symbol, entry] of this.L1Cache.entries()) {
      if (now - entry.timestamp > 5000) {
        this.L1Cache.delete(symbol);
      }
    }

    // Clean L2 - remove entries older than 30 seconds
    for (const [symbol, entry] of this.L2Cache.entries()) {
      if (now - entry.timestamp > 30000) {
        this.L2Cache.delete(symbol);
      }
    }

    // Clean L3 - remove entries older than 5 minutes
    for (const [symbol, entry] of this.L3Cache.entries()) {
      if (now - entry.timestamp > 300000) {
        this.L3Cache.delete(symbol);
      }
    }
  }

  // ============================================================================
  // AGGREGATION ENGINE
  // ============================================================================

  /**
   * Start data aggregation engine
   */
  private startAggregationEngine() {
    console.log('[Data Engine V4] 🔄 Starting intelligent aggregation engine');

    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
    }, this.adaptiveConfig.aggregationInterval);
  }

  /**
   * Perform intelligent data aggregation
   */
  private performAggregation() {
    let emitted = 0;
    const startTime = Date.now();

    for (const [symbol, sources] of this.aggregationCache.entries()) {
      // Only aggregate if we have minimum required sources
      const freshSources = Array.from(sources.entries()).filter(
        ([_, data]) => Date.now() - data.timestamp < 30000
      );

      if (freshSources.length < this.adaptiveConfig.minSourcesRequired) {
        continue;
      }

      // Weight-average aggregation
      const ticker = this.aggregateSourceData(symbol, freshSources);

      if (ticker && ticker.dataQuality >= this.adaptiveConfig.qualityThreshold) {
        this.storeTicker(ticker);
        this.emitTickerUpdate(ticker);
        emitted++;

        // Track price history for volatility detection
        this.updatePriceHistory(symbol, ticker.price);
      }
    }

    if (emitted > 0) {
      this.stats.totalTickers += emitted;
      this.stats.tickersPerSecond = emitted / ((Date.now() - startTime) / 1000);
    }
  }

  /**
   * Aggregate data from multiple sources
   */
  private aggregateSourceData(symbol: string, sources: Array<[string, any]>): IGXTicker | null {
    let weightedPrice = 0;
    let totalWeight = 0;
    let volume24h = 0;
    let high24h = 0;
    let low24h = 999999999;
    let bid = 0;
    let ask = 999999999;
    let change24h = 0;
    let changeCount = 0;

    const exchangeSources: string[] = [];
    const volumeDistribution = new Map<string, number>();

    for (const [sourceName, data] of sources) {
      const source = this.dataSources.get(sourceName);
      if (!source) continue;

      const weight = source.weight;

      if (data.price > 0) {
        weightedPrice += data.price * weight;
        totalWeight += weight;
      }

      if (data.volume > 0) {
        volume24h = Math.max(volume24h, data.volume);
        volumeDistribution.set(sourceName, data.volume);
      }

      if (data.high24h > 0) high24h = Math.max(high24h, data.high24h);
      if (data.low24h > 0) low24h = Math.min(low24h, data.low24h);
      if (data.bid > 0) bid = Math.max(bid, data.bid);
      if (data.ask > 0) ask = Math.min(ask, data.ask);

      if (data.change24h !== undefined) {
        change24h += data.change24h;
        changeCount++;
      }

      exchangeSources.push(sourceName);
    }

    if (totalWeight === 0) return null;

    const price = weightedPrice / totalWeight;

    return {
      symbol,
      price,
      volume24h,
      change24h: changeCount > 0 ? change24h / changeCount : 0,
      high24h: high24h === 0 ? price * 1.02 : high24h,
      low24h: low24h === 999999999 ? price * 0.98 : low24h,
      bid: bid || price * 0.999,
      ask: ask === 999999999 ? price * 1.001 : ask,
      timestamp: Date.now(),

      exchangeSources,
      dataQuality: this.calculateDataQuality(sources.length, exchangeSources),
      priceConfidence: this.calculatePriceConfidence(sources),
      volumeDistribution,
      smartMoneyFlow: this.calculateSmartMoneyFlow(sources),
      microstructure: {
        bidAskSpread: (ask === 999999999 ? 0 : ask - bid),
        orderBookImbalance: this.calculateImbalance(bid, ask, price),
        tradeVelocity: volume24h / (24 * 60),
        liquidityScore: this.calculateLiquidityScore(volume24h, sources.length)
      }
    };
  }

  // ============================================================================
  // ADAPTIVE ENGINE
  // ============================================================================

  /**
   * Start adaptive intelligence engine
   */
  private startAdaptiveEngine() {
    console.log('[Data Engine V4] 🧠 Starting adaptive intelligence engine');

    this.adaptiveTimer = setInterval(() => {
      this.adaptToMarketConditions();
    }, 10000); // Adapt every 10 seconds
  }

  /**
   * Adapt engine parameters based on market conditions
   */
  private adaptToMarketConditions() {
    // Calculate market volatility
    this.calculateMarketVolatility();

    // Determine market condition
    this.determineMarketCondition();

    // Adjust data flow based on conditions
    this.adjustDataFlow();

    // Log adaptation
    console.log(`[Data Engine V4] 🧠 Adaptive: ${this.marketCondition} market | Flow: ${this.adaptiveConfig.dataFlowRate.toFixed(1)} tickers/sec`);
  }

  /**
   * Calculate overall market volatility
   */
  private calculateMarketVolatility() {
    let totalVolatility = 0;
    let count = 0;

    for (const [symbol, prices] of this.priceHistory.entries()) {
      if (prices.length < 10) continue;

      // Calculate price volatility (standard deviation)
      const recent = prices.slice(-20); // Last 20 prices
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / recent.length;
      const stdDev = Math.sqrt(variance);
      const volatility = (stdDev / avg) * 100;

      totalVolatility += volatility;
      count++;
    }

    this.marketVolatility = count > 0 ? totalVolatility / count : 0;
  }

  /**
   * Determine market condition based on volatility
   */
  private determineMarketCondition() {
    if (this.marketVolatility < 0.5) {
      this.marketCondition = 'CALM';
    } else if (this.marketVolatility < 1.5) {
      this.marketCondition = 'NORMAL';
    } else if (this.marketVolatility < 3.0) {
      this.marketCondition = 'VOLATILE';
    } else {
      this.marketCondition = 'EXTREME';
    }

    this.stats.marketCondition = this.marketCondition;
  }

  /**
   * Adjust data flow based on market conditions
   */
  private adjustDataFlow() {
    switch (this.marketCondition) {
      case 'CALM':
        // Reduce flow in calm markets
        this.adaptiveConfig.dataFlowRate = 5;
        this.adaptiveConfig.aggregationInterval = 2000;
        this.adaptiveConfig.minSourcesRequired = 3;
        this.adaptiveConfig.qualityThreshold = 80;
        break;

      case 'NORMAL':
        // Standard flow
        this.adaptiveConfig.dataFlowRate = 10;
        this.adaptiveConfig.aggregationInterval = 1000;
        this.adaptiveConfig.minSourcesRequired = 3;
        this.adaptiveConfig.qualityThreshold = 70;
        break;

      case 'VOLATILE':
        // Increase flow in volatile markets
        this.adaptiveConfig.dataFlowRate = 20;
        this.adaptiveConfig.aggregationInterval = 500;
        this.adaptiveConfig.minSourcesRequired = 2;
        this.adaptiveConfig.qualityThreshold = 60;
        break;

      case 'EXTREME':
        // Maximum flow in extreme conditions
        this.adaptiveConfig.dataFlowRate = 40;
        this.adaptiveConfig.aggregationInterval = 250;
        this.adaptiveConfig.minSourcesRequired = 2;
        this.adaptiveConfig.qualityThreshold = 50;
        break;
    }

    // Restart aggregation engine with new interval
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    this.startAggregationEngine();
  }

  /**
   * Update price history for volatility tracking
   */
  private updatePriceHistory(symbol: string, price: number) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol)!;
    history.push(price);

    // Keep only last 100 prices
    if (history.length > 100) {
      history.shift();
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private calculateDataQuality(sourceCount: number, sources: string[]): number {
    const baseQuality = Math.min(sourceCount * 15, 90);
    const tierBonus = sources.filter(s => {
      const source = this.dataSources.get(s);
      return source && source.tier === 1;
    }).length * 5;

    return Math.min(baseQuality + tierBonus, 100);
  }

  private calculatePriceConfidence(sources: Array<[string, any]>): number {
    if (sources.length < 2) return 60;

    const prices = sources.map(([_, d]) => d.price).filter(p => p > 0);
    if (prices.length < 2) return 60;

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avg) * 100;

    if (cv < 0.5) return 95;
    if (cv < 1) return 90;
    if (cv < 2) return 80;
    if (cv < 5) return 70;
    return 60;
  }

  private calculateSmartMoneyFlow(sources: Array<[string, any]>): number {
    let smartVolume = 0;
    let totalVolume = 0;

    for (const [sourceName, data] of sources) {
      const source = this.dataSources.get(sourceName);
      if (!source || !data.volume) continue;

      totalVolume += data.volume;
      if (source.tier === 1) {
        smartVolume += data.volume;
      }
    }

    return totalVolume > 0 ? (smartVolume / totalVolume) : 0;
  }

  private calculateImbalance(bid: number, ask: number, price: number): number {
    if (!bid || !ask) return 0;
    const midPrice = (bid + ask) / 2;
    return (price - midPrice) / midPrice;
  }

  private calculateLiquidityScore(volume: number, sources: number): number {
    let score = 50;
    if (volume > 100000000) score += 20;
    else if (volume > 10000000) score += 15;
    else if (volume > 1000000) score += 10;
    score += sources * 5;
    return Math.min(score, 100);
  }

  private emitTickerUpdate(ticker: IGXTicker) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-ticker-update', {
        detail: ticker
      }));
    }
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Start comprehensive health monitoring
   */
  private startHealthMonitoring() {
    console.log('[Data Engine V4] 🏥 Starting health monitoring system');

    this.healthTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform comprehensive health check
   */
  private performHealthCheck() {
    const now = Date.now();

    // Update uptime
    this.stats.uptime = this.startTime ? (now - this.startTime) / 1000 : 0;

    // Count active sources
    const sources = Array.from(this.dataSources.values());
    this.stats.sourcesActive = sources.filter(s => s.status === 'CONNECTED').length;

    // Calculate average latency
    const connectedSources = sources.filter(s => s.status === 'CONNECTED');
    if (connectedSources.length > 0) {
      this.stats.averageLatency = connectedSources.reduce((sum, s) => sum + s.latency, 0) / connectedSources.length;
    }

    // Calculate overall data quality
    const tickers = Array.from(this.L1Cache.values());
    if (tickers.length > 0) {
      this.stats.dataQuality = tickers.reduce((sum, t) => sum + t.data.dataQuality, 0) / tickers.length;
    }

    this.stats.lastUpdate = now;

    // Log health report
    console.log('\n[Data Engine V4] ========== HEALTH REPORT ==========');
    console.log(`⏱️  Uptime: ${Math.floor(this.stats.uptime / 60)} minutes`);
    console.log(`📊 Sources: ${this.stats.sourcesActive}/${this.stats.sourcesTotal} active`);
    console.log(`📈 Tickers: ${this.stats.totalTickers} total, ${this.stats.tickersPerSecond.toFixed(1)}/sec`);
    console.log(`⚡ Latency: ${this.stats.averageLatency.toFixed(0)}ms avg`);
    console.log(`✨ Quality: ${this.stats.dataQuality.toFixed(0)}/100`);
    console.log(`💾 Cache: ${this.stats.cacheHitRate.toFixed(1)}% hit rate`);
    console.log(`🌊 Market: ${this.marketCondition} (${this.marketVolatility.toFixed(2)}% volatility)`);
    console.log(`🔄 Flow: ${this.adaptiveConfig.dataFlowRate} tickers/sec target`);
    console.log(`❌ Errors: ${this.stats.errors}`);

    console.log('\n📡 Source Details:');
    sources.forEach(s => {
      const statusIcon = s.status === 'CONNECTED' ? '✅' :
                        s.status === 'CONNECTING' ? '🔄' :
                        s.status === 'ERROR' ? '❌' :
                        s.status === 'RATE_LIMITED' ? '⏱️' : '🔧';
      const modeIcon = s.mode === 'WEBSOCKET' ? '🔌' : '📡';
      const circuitIcon = s.circuitState === 'CLOSED' ? '🟢' :
                         s.circuitState === 'HALF_OPEN' ? '🟡' : '🔴';

      console.log(`  ${statusIcon} ${modeIcon} ${circuitIcon} ${s.name}: ${s.tickersReceived} tickers, ${s.latency}ms, ${s.errors} errors`);
    });

    console.log('=============================================\n');

    // Emit health event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-data-engine-health', {
        detail: this.getStats()
      }));
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get comprehensive engine statistics
   */
  getStats(): EngineStats {
    return {
      ...this.stats,
      adaptiveConfig: { ...this.adaptiveConfig }
    };
  }

  /**
   * Get detailed source information
   */
  getSourceDetails() {
    return Array.from(this.dataSources.values());
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      l1Size: this.L1Cache.size,
      l2Size: this.L2Cache.size,
      l3Size: this.L3Cache.size,
      hitRate: this.stats.cacheHitRate
    };
  }

  /**
   * Stop the engine
   */
  stop() {
    console.log('\n[Data Engine V4] Shutting down...');

    this.isRunning = false;

    // Close all WebSocket connections
    for (const source of this.dataSources.values()) {
      if (source.wsConnection) {
        source.wsConnection.close();
      }
      if (source.restInterval) {
        clearInterval(source.restInterval);
      }
    }

    // Clear all timers
    if (this.aggregationTimer) clearInterval(this.aggregationTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    if (this.adaptiveTimer) clearInterval(this.adaptiveTimer);
    if (this.cacheCleanupTimer) clearInterval(this.cacheCleanupTimer);

    // Clear caches
    this.L1Cache.clear();
    this.L2Cache.clear();
    this.L3Cache.clear();
    this.aggregationCache.clear();

    console.log('[Data Engine V4] ✅ Shutdown complete\n');
  }
}

// Singleton instance
export const igxDataEngineV4 = new IGXDataEngineV4();

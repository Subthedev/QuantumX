/**
 * OHLC DATA MANAGER
 * Fetches and maintains historical OHLC candlestick data for all strategies
 *
 * CRITICAL FOR SIGNAL GENERATION:
 * - Strategies need historical candle arrays to analyze patterns
 * - SPRING_TRAP needs 50+ candles for Wyckoff pattern detection
 * - MOMENTUM_SURGE needs 50+ candles for trend analysis
 * - GOLDEN_CROSS_MOMENTUM needs 100+ candles for MA crossovers
 * - Other strategies need various amounts of historical data
 *
 * DATA SOURCES:
 * 1. Binance API (free, no auth, 1000 requests/min limit)
 * 2. Real-time updates from WebSocket ticks
 *
 * ARCHITECTURE:
 * - Fetches 200 candles per coin on initialization (15min interval)
 * - Updates candles in real-time from WebSocket ticks
 * - Maintains rolling window per coin (max 200 candles)
 * - Provides instant access via in-memory cache
 */

export interface OHLCCandle {
  timestamp: number;      // Unix timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCDataset {
  symbol: string;
  candles: OHLCCandle[];
  lastUpdate: number;
  interval: string;       // '15m', '1h', etc.
}

class OHLCDataManager {
  private candleCache: Map<string, OHLCDataset> = new Map();
  private readonly MAX_CANDLES = 200;
  private readonly CANDLE_INTERVAL = '15m';
  private readonly BINANCE_API_BASE = 'https://api.binance.com/api/v3';
  private fetchPromises: Map<string, Promise<void>> = new Map();
  private isInitialized = false;

  /**
   * Initialize OHLC data for all coins
   * Fetches 200 historical candles per coin
   */
  async initializeCoins(coinGeckoIds: string[]): Promise<void> {
    console.log(`\n[OHLCManager] 🕯️ Initializing OHLC data for ${coinGeckoIds.length} coins...`);
    console.log(`[OHLCManager] Interval: ${this.CANDLE_INTERVAL}, Candles per coin: ${this.MAX_CANDLES}`);

    const binanceSymbolMap = this.mapCoinGeckoToBinance(coinGeckoIds);

    // Fetch all coins in parallel (Binance allows 1000 req/min)
    const fetchPromises = Array.from(binanceSymbolMap.entries()).map(([coinGeckoId, binanceSymbol]) =>
      this.fetchHistoricalCandles(coinGeckoId, binanceSymbol)
    );

    const results = await Promise.allSettled(fetchPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[OHLCManager] ✅ Initialization complete: ${successful} successful, ${failed} failed`);
    console.log(`[OHLCManager] Cache size: ${this.candleCache.size} coins`);

    this.isInitialized = true;
  }

  /**
   * Fetch historical candles from Binance
   */
  private async fetchHistoricalCandles(coinGeckoId: string, binanceSymbol: string): Promise<void> {
    try {
      // Construct Binance klines API URL
      // Endpoint: GET /api/v3/klines
      // Params: symbol, interval, limit
      const url = `${this.BINANCE_API_BASE}/klines?symbol=${binanceSymbol}&interval=${this.CANDLE_INTERVAL}&limit=${this.MAX_CANDLES}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[OHLCManager] ⚠️ ${coinGeckoId}: Binance API error ${response.status}`);
        return;
      }

      const rawCandles = await response.json();

      // Binance returns: [timestamp, open, high, low, close, volume, ...]
      const candles: OHLCCandle[] = rawCandles.map((c: any) => ({
        timestamp: c[0],                    // Unix timestamp (ms)
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
      }));

      // Store in cache
      this.candleCache.set(coinGeckoId, {
        symbol: coinGeckoId,
        candles,
        lastUpdate: Date.now(),
        interval: this.CANDLE_INTERVAL
      });

      console.log(`[OHLCManager] ✅ ${coinGeckoId.toUpperCase()}: Fetched ${candles.length} candles`);

    } catch (error) {
      console.error(`[OHLCManager] ❌ ${coinGeckoId}: Fetch error:`, error);
    }
  }

  /**
   * Update candles in real-time from WebSocket tick
   * Creates new candle or updates current candle based on timestamp
   */
  updateFromTick(symbol: string, price: number, volume: number, timestamp: number): void {
    const dataset = this.candleCache.get(symbol);

    if (!dataset || dataset.candles.length === 0) {
      // No historical data yet - create first candle
      this.candleCache.set(symbol, {
        symbol,
        candles: [{
          timestamp,
          open: price,
          high: price,
          low: price,
          close: price,
          volume
        }],
        lastUpdate: Date.now(),
        interval: this.CANDLE_INTERVAL
      });
      return;
    }

    const candles = dataset.candles;
    const lastCandle = candles[candles.length - 1];

    // Calculate candle interval in ms (15m = 900000ms)
    const intervalMs = this.parseInterval(this.CANDLE_INTERVAL);
    const currentCandleStart = Math.floor(timestamp / intervalMs) * intervalMs;
    const lastCandleStart = Math.floor(lastCandle.timestamp / intervalMs) * intervalMs;

    if (currentCandleStart === lastCandleStart) {
      // Update current candle
      lastCandle.high = Math.max(lastCandle.high, price);
      lastCandle.low = Math.min(lastCandle.low, price);
      lastCandle.close = price;
      lastCandle.volume += volume;
    } else {
      // New candle period - create new candle
      const newCandle: OHLCCandle = {
        timestamp: currentCandleStart,
        open: price,
        high: price,
        low: price,
        close: price,
        volume
      };

      candles.push(newCandle);

      // Maintain rolling window
      if (candles.length > this.MAX_CANDLES) {
        candles.shift();
      }
    }

    dataset.lastUpdate = Date.now();
  }

  /**
   * Get OHLC candles for a symbol
   */
  getCandles(symbol: string): OHLCCandle[] {
    const dataset = this.candleCache.get(symbol);
    return dataset ? [...dataset.candles] : [];
  }

  /**
   * Get OHLC dataset (includes metadata)
   */
  getDataset(symbol: string): OHLCDataset | null {
    const dataset = this.candleCache.get(symbol);
    return dataset ? { ...dataset } : null;
  }

  /**
   * Check if symbol has sufficient candles
   */
  hasSufficientData(symbol: string, minCandles: number = 50): boolean {
    const candles = this.getCandles(symbol);
    return candles.length >= minCandles;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = {
      totalCoins: this.candleCache.size,
      isInitialized: this.isInitialized,
      coinsWithData: 0,
      avgCandlesPerCoin: 0,
      minCandles: Infinity,
      maxCandles: 0,
      coinDetails: [] as { symbol: string; candles: number; lastUpdate: string }[]
    };

    let totalCandles = 0;

    this.candleCache.forEach((dataset, symbol) => {
      if (dataset.candles.length > 0) {
        stats.coinsWithData++;
        totalCandles += dataset.candles.length;
        stats.minCandles = Math.min(stats.minCandles, dataset.candles.length);
        stats.maxCandles = Math.max(stats.maxCandles, dataset.candles.length);

        stats.coinDetails.push({
          symbol,
          candles: dataset.candles.length,
          lastUpdate: new Date(dataset.lastUpdate).toISOString()
        });
      }
    });

    stats.avgCandlesPerCoin = stats.coinsWithData > 0 ? totalCandles / stats.coinsWithData : 0;
    if (stats.minCandles === Infinity) stats.minCandles = 0;

    return stats;
  }

  /**
   * Map CoinGecko IDs to Binance trading symbols
   */
  private mapCoinGeckoToBinance(coinGeckoIds: string[]): Map<string, string> {
    const map = new Map<string, string>();

    // Common mappings (CoinGecko ID → Binance Symbol)
    const mappings: Record<string, string> = {
      'bitcoin': 'BTCUSDT',
      'ethereum': 'ETHUSDT',
      'binancecoin': 'BNBUSDT',
      'solana': 'SOLUSDT',
      'ripple': 'XRPUSDT',
      'cardano': 'ADAUSDT',
      'avalanche-2': 'AVAXUSDT',
      'dogecoin': 'DOGEUSDT',
      'polkadot': 'DOTUSDT',
      'chainlink': 'LINKUSDT',
      'matic-network': 'MATICUSDT',
      'polygon': 'MATICUSDT',
      'uniswap': 'UNIUSDT',
      'litecoin': 'LTCUSDT',
      'bitcoin-cash': 'BCHUSDT',
      'ethereum-classic': 'ETCUSDT',
      'stellar': 'XLMUSDT',
      'monero': 'XMRUSDT',
      'cosmos': 'ATOMUSDT',
      'filecoin': 'FILUSDT',
      'tron': 'TRXUSDT',
      'vechain': 'VETUSDT',
      'algorand': 'ALGOUSDT',
      'tezos': 'XTZUSDT',
      'aptos': 'APTUSDT',
      'arbitrum': 'ARBUSDT',
      'optimism': 'OPUSDT',
      'near': 'NEARUSDT',
      'immutable-x': 'IMXUSDT',
      'the-graph': 'GRTUSDT',
      'fantom': 'FTMUSDT',
      'aave': 'AAVEUSDT',
      'maker': 'MKRUSDT',
      'curve-dao-token': 'CRVUSDT',
      'synthetix-network-token': 'SNXUSDT',
      'compound-governance-token': 'COMPUSDT',
      'sushi': 'SUSHIUSDT',
      'decentraland': 'MANAUSDT',
      'the-sandbox': 'SANDUSDT',
      'axie-infinity': 'AXSUSDT',
      'gala': 'GALAUSDT',
      'enjincoin': 'ENJUSDT',
      'flow': 'FLOWUSDT',
      'basic-attention-token': 'BATUSDT',
      'zilliqa': 'ZILUSDT',
      'iota': 'IOTAUSDT',
      'neo': 'NEOUSDT',
      'qtum': 'QTUMUSDT',
      'waves': 'WAVESUSDT',
      '0x': 'ZRXUSDT',
      'omisego': 'OMGUSDT',
      'bancor': 'BNTUSDT',
      'loopring': 'LRCUSDT',
      'render-token': 'RNNDRUSDT',
      'injective-protocol': 'INJUSDT'
    };

    coinGeckoIds.forEach(id => {
      if (mappings[id]) {
        map.set(id, mappings[id]);
      } else {
        // Fallback: uppercase first 3 letters + USDT
        const fallbackSymbol = id.substring(0, 3).toUpperCase() + 'USDT';
        map.set(id, fallbackSymbol);
        console.warn(`[OHLCManager] No mapping for ${id}, using fallback: ${fallbackSymbol}`);
      }
    });

    return map;
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // Default 15m
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.candleCache.clear();
    this.fetchPromises.clear();
    this.isInitialized = false;
    console.log('[OHLCManager] Cache cleared');
  }
}

// Singleton instance
export const ohlcDataManager = new OHLCDataManager();

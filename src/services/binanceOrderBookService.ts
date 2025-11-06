/**
 * Binance REST API Order Book Service
 * Fetches real-time order book data directly from Binance REST API
 * Provides production-grade performance without WebSocket connection limits
 */

import type { OrderBookData, OrderBookLevel, OrderBookMetrics } from './orderBookService';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const CACHE_DURATION_MS = 1000; // 1 second cache

interface BinanceOrderBookResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

class BinanceOrderBookService {
  private cache: Map<string, { data: OrderBookData; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<OrderBookData>> = new Map();

  /**
   * Fetch order book data from Binance REST API
   */
  async fetchOrderBook(symbol: string, limit: number = 20): Promise<OrderBookData> {
    const normalizedSymbol = symbol.toLowerCase();
    const cacheKey = `${normalizedSymbol}-${limit}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.data;
    }

    // Deduplicate concurrent requests
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = this.fetchFromBinance(normalizedSymbol, limit);
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal method to fetch from Binance API
   */
  private async fetchFromBinance(symbol: string, limit: number): Promise<OrderBookData> {
    const startTime = Date.now();

    try {
      const url = `${BINANCE_API_BASE}/depth?symbol=${symbol.toUpperCase()}USDT&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const data: BinanceOrderBookResponse = await response.json();

      // Process bids
      const bids: OrderBookLevel[] = data.bids.map((bid, index) => {
        const price = parseFloat(bid[0]);
        const quantity = parseFloat(bid[1]);
        const total = data.bids
          .slice(0, index + 1)
          .reduce((sum, b) => sum + parseFloat(b[1]), 0);

        return { price, quantity, total };
      });

      // Process asks
      const asks: OrderBookLevel[] = data.asks.map((ask, index) => {
        const price = parseFloat(ask[0]);
        const quantity = parseFloat(ask[1]);
        const total = data.asks
          .slice(0, index + 1)
          .reduce((sum, a) => sum + parseFloat(a[1]), 0);

        return { price, quantity, total };
      });

      const metrics = this.calculateMetrics(bids, asks);
      const latency = Date.now() - startTime;

      return {
        symbol: symbol.toUpperCase(),
        bids,
        asks,
        lastUpdateId: data.lastUpdateId,
        timestamp: Date.now(),
        metrics,
        status: 'connected',
        latency_ms: `${latency}`
      };
    } catch (error) {
      console.error(`Failed to fetch order book for ${symbol}:`, error);

      return {
        symbol: symbol.toUpperCase(),
        bids: [],
        asks: [],
        lastUpdateId: 0,
        timestamp: Date.now(),
        metrics: this.getEmptyMetrics(),
        status: 'error',
        latency_ms: `${Date.now() - startTime}`,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate order book metrics
   */
  private calculateMetrics(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[]
  ): OrderBookMetrics {
    if (bids.length === 0 || asks.length === 0) {
      return this.getEmptyMetrics();
    }

    const bestBid = bids[0].price;
    const bestAsk = asks[0].price;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = (spread / midPrice) * 100;

    const totalBidVolume = bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = asks.reduce((sum, ask) => sum + ask.quantity, 0);
    const totalVolume = totalBidVolume + totalAskVolume;

    const buyPressure = totalVolume > 0 ? (totalBidVolume / totalVolume) * 100 : 0;
    const sellPressure = totalVolume > 0 ? (totalAskVolume / totalVolume) * 100 : 0;
    const bidAskRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 0;

    return {
      totalBidVolume,
      totalAskVolume,
      spread,
      spreadPercent,
      midPrice,
      buyPressure,
      sellPressure,
      bidAskRatio
    };
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): OrderBookMetrics {
    return {
      totalBidVolume: 0,
      totalAskVolume: 0,
      spread: 0,
      spreadPercent: 0,
      midPrice: 0,
      buyPressure: 0,
      sellPressure: 0,
      bidAskRatio: 0
    };
  }

  /**
   * Clear cache for a symbol
   */
  clearCache(symbol?: string) {
    if (symbol) {
      const normalizedSymbol = symbol.toLowerCase();
      for (const key of this.cache.keys()) {
        if (key.startsWith(normalizedSymbol)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      symbols: Array.from(this.cache.keys()).map(key => key.split('-')[0])
    };
  }

  // ============================================
  // ADVANCED ORDER BOOK ANALYSIS
  // ============================================

  /**
   * Detect hidden whale orders (large orders appearing suddenly)
   * This detects institutional activity
   */
  async detectWhaleBuyWalls(symbol: string): Promise<{ detected: boolean; strength: number; price: number | null }> {
    const orderBook = await this.fetchOrderBook(symbol, 50);

    if (orderBook.bids.length === 0) {
      return { detected: false, strength: 0, price: null };
    }

    // Find abnormally large bid orders
    const avgBidSize = orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0) / orderBook.bids.length;

    // Look for bids 3x larger than average
    const whaleBids = orderBook.bids.filter(bid => bid.quantity > avgBidSize * 3);

    if (whaleBids.length > 0) {
      const largestBid = whaleBids.reduce((max, bid) => bid.quantity > max.quantity ? bid : max);
      const strength = Math.min(100, (largestBid.quantity / avgBidSize) * 20);

      return {
        detected: true,
        strength: Math.round(strength),
        price: largestBid.price
      };
    }

    return { detected: false, strength: 0, price: null };
  }

  /**
   * Calculate order book imbalance for smart money detection
   * > 1.5 = Strong buying pressure
   * < 0.7 = Strong selling pressure
   */
  async getOrderBookImbalance(symbol: string): Promise<number> {
    const orderBook = await this.fetchOrderBook(symbol, 20);

    if (!orderBook.metrics) return 1.0; // Neutral

    return orderBook.metrics.bidAskRatio;
  }

  /**
   * Detect absorption pattern (whales absorbing sells)
   * This requires comparing order book over time
   */
  private previousOrderBooks: Map<string, OrderBookData> = new Map();

  async detectAbsorptionPattern(symbol: string): Promise<{ detected: boolean; strength: number; interpretation: string }> {
    const current = await this.fetchOrderBook(symbol, 20);
    const previous = this.previousOrderBooks.get(symbol);

    // Store current for next comparison
    this.previousOrderBooks.set(symbol, current);

    if (!previous || !current.metrics || !previous.metrics) {
      return { detected: false, strength: 0, interpretation: 'Insufficient data' };
    }

    // Check if bid volume is increasing while price is stable or decreasing
    const bidVolumeIncrease = current.metrics.totalBidVolume > previous.metrics.totalBidVolume * 1.1;
    const priceStable = Math.abs(current.metrics.midPrice - previous.metrics.midPrice) / previous.metrics.midPrice < 0.005; // < 0.5% change

    if (bidVolumeIncrease && priceStable) {
      const strength = ((current.metrics.totalBidVolume / previous.metrics.totalBidVolume) - 1) * 100;

      return {
        detected: true,
        strength: Math.min(100, Math.round(strength * 5)),
        interpretation: 'Whale absorption detected - bids building while price stable. Bullish accumulation.'
      };
    }

    // Check if ask volume is increasing (distribution)
    const askVolumeIncrease = current.metrics.totalAskVolume > previous.metrics.totalAskVolume * 1.1;

    if (askVolumeIncrease && priceStable) {
      const strength = ((current.metrics.totalAskVolume / previous.metrics.totalAskVolume) - 1) * 100;

      return {
        detected: true,
        strength: Math.min(100, Math.round(strength * 5)),
        interpretation: 'Distribution detected - asks building while price stable. Bearish selling pressure.'
      };
    }

    return { detected: false, strength: 0, interpretation: 'No clear pattern' };
  }

  /**
   * Get volume-weighted average price from order book
   * This shows where the "real" support/resistance is
   */
  async getVWAP(symbol: string): Promise<{ bidVWAP: number; askVWAP: number }> {
    const orderBook = await this.fetchOrderBook(symbol, 20);

    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return { bidVWAP: 0, askVWAP: 0 };
    }

    // Calculate VWAP for bids
    const bidTotalValue = orderBook.bids.reduce((sum, bid) => sum + (bid.price * bid.quantity), 0);
    const bidTotalVolume = orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const bidVWAP = bidTotalVolume > 0 ? bidTotalValue / bidTotalVolume : 0;

    // Calculate VWAP for asks
    const askTotalValue = orderBook.asks.reduce((sum, ask) => sum + (ask.price * ask.quantity), 0);
    const askTotalVolume = orderBook.asks.reduce((sum, ask) => sum + ask.quantity, 0);
    const askVWAP = askTotalVolume > 0 ? askTotalValue / askTotalVolume : 0;

    return { bidVWAP, askVWAP };
  }
}

// Export singleton instance
export const binanceOrderBookService = new BinanceOrderBookService();

/**
 * WebSocket Order Book Service
 * Provides real-time order book updates with 100ms refresh rate via Binance WebSocket
 */

import type { OrderBookData, OrderBookLevel, OrderBookMetrics } from './orderBookService';
import { dataHealthMonitor } from './dataHealthMonitor';

type OrderBookCallback = (data: OrderBookData) => void;
type ErrorCallback = (error: Error) => void;

// Binance Partial Book Depth Stream format
interface BinanceDepthUpdate {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

class OrderBookWebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, Set<OrderBookCallback>> = new Map();
  private errorHandlers: Map<string, Set<ErrorCallback>> = new Map();
  private orderBookCache: Map<string, OrderBookData> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 3; // Reduced for faster fallback to demo data
  private baseReconnectDelay = 1000;

  /**
   * Subscribe to real-time order book updates for a symbol
   */
  subscribe(
    symbol: string,
    callback: OrderBookCallback,
    onError?: ErrorCallback
  ): () => void {
    const normalizedSymbol = symbol.toLowerCase();

    // Add callback to subscribers
    if (!this.subscribers.has(normalizedSymbol)) {
      this.subscribers.set(normalizedSymbol, new Set());
    }
    this.subscribers.get(normalizedSymbol)!.add(callback);

    // Add error handler
    if (onError) {
      if (!this.errorHandlers.has(normalizedSymbol)) {
        this.errorHandlers.set(normalizedSymbol, new Set());
      }
      this.errorHandlers.get(normalizedSymbol)!.add(onError);
    }

    // Create WebSocket connection if not exists
    if (!this.connections.has(normalizedSymbol)) {
      this.connect(normalizedSymbol);
    } else if (this.orderBookCache.has(normalizedSymbol)) {
      // Immediately send cached data to new subscriber
      callback(this.orderBookCache.get(normalizedSymbol)!);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(normalizedSymbol, callback, onError);
    };
  }

  /**
   * Unsubscribe from order book updates
   */
  private unsubscribe(
    symbol: string,
    callback: OrderBookCallback,
    onError?: ErrorCallback
  ) {
    const subscribers = this.subscribers.get(symbol);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.disconnect(symbol);
      }
    }

    if (onError) {
      const errorHandlers = this.errorHandlers.get(symbol);
      if (errorHandlers) {
        errorHandlers.delete(onError);
      }
    }
  }

  /**
   * Connect to Binance WebSocket for a symbol
   */
  private connect(symbol: string) {
    console.log(`🔌 Connecting WebSocket for ${symbol}...`);

    // Use combined streams endpoint (more reliable for browser connections)
    const stream = `${symbol}usdt@depth20@100ms`;
    const wsUrl = `wss://stream.binance.com:443/ws/${stream}`;

    console.log(`📡 WebSocket URL: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`✅ WebSocket connected for ${symbol}`);
      this.reconnectAttempts.set(symbol, 0);

      // Notify subscribers with connecting status
      this.notifySubscribers(symbol, {
        symbol: symbol.toUpperCase(),
        bids: [],
        asks: [],
        lastUpdateId: 0,
        timestamp: Date.now(),
        metrics: this.getEmptyMetrics(),
        status: 'connecting'
      });
    };

    ws.onmessage = (event) => {
      try {
        const data: BinanceDepthUpdate = JSON.parse(event.data);

        const orderBookData = this.processDepthUpdate(data, symbol);

        // Note: Partial depth stream doesn't include timestamp, so we can't calculate latency
        // Just record that we received data
        dataHealthMonitor.recordLatency(symbol, 0);

        // Cache the data
        this.orderBookCache.set(symbol, orderBookData);

        // Notify all subscribers
        this.notifySubscribers(symbol, orderBookData);
      } catch (error) {
        console.error(`Error processing WebSocket message for ${symbol}:`, error);
        dataHealthMonitor.recordError(symbol);
        this.notifyErrors(symbol, error as Error);
      }
    };

    ws.onerror = (error) => {
      console.error(`❌ WebSocket error for ${symbol}:`, error);
      dataHealthMonitor.recordError(symbol);
      this.notifyErrors(symbol, new Error(`WebSocket error for ${symbol}`));
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket closed for ${symbol}`, event.code, event.reason);
      this.connections.delete(symbol);

      // Attempt reconnection if there are still subscribers
      if (this.subscribers.get(symbol)?.size ?? 0 > 0) {
        this.scheduleReconnect(symbol);
      }
    };

    this.connections.set(symbol, ws);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(symbol: string) {
    const attempts = this.reconnectAttempts.get(symbol) ?? 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.warn(`⚠️ Max reconnection attempts reached for ${symbol}, falling back to demo data`);

      // Instead of failing completely, use demo data as fallback
      this.startDemoDataStream(symbol);

      this.notifyErrors(
        symbol,
        new Error(`WebSocket unavailable - using demo data for ${symbol}`)
      );
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, attempts),
      30000 // Max 30 seconds
    );

    console.log(`🔄 Reconnecting ${symbol} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

    const timeout = setTimeout(() => {
      this.reconnectAttempts.set(symbol, attempts + 1);
      this.connect(symbol);
    }, delay);

    this.reconnectTimeouts.set(symbol, timeout);
  }

  /**
   * Disconnect WebSocket for a symbol
   */
  private disconnect(symbol: string) {
    console.log(`🔌 Disconnecting WebSocket for ${symbol}...`);

    const ws = this.connections.get(symbol);
    if (ws) {
      ws.close();
      this.connections.delete(symbol);
    }

    const timeout = this.reconnectTimeouts.get(symbol);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(symbol);
    }

    this.subscribers.delete(symbol);
    this.errorHandlers.delete(symbol);
    this.orderBookCache.delete(symbol);
    this.reconnectAttempts.delete(symbol);
  }

  /**
   * Process Binance depth update into OrderBookData
   */
  private processDepthUpdate(data: BinanceDepthUpdate, symbol: string): OrderBookData {
    // Safety check: ensure data.bids and data.asks are arrays (using correct field names from Binance API)
    const safeBids = Array.isArray(data?.bids) ? data.bids : [];
    const safeAsks = Array.isArray(data?.asks) ? data.asks : [];

    const bids: OrderBookLevel[] = safeBids.map((bid, index) => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const total = safeBids
        .slice(0, index + 1)
        .reduce((sum, b) => sum + parseFloat(b[1]), 0);

      return { price, quantity, total };
    });

    const asks: OrderBookLevel[] = safeAsks.map((ask, index) => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const total = safeAsks
        .slice(0, index + 1)
        .reduce((sum, a) => sum + parseFloat(a[1]), 0);

      return { price, quantity, total };
    });

    const metrics = this.calculateMetrics(bids, asks);

    // Use symbol from parameter and current timestamp
    // Partial depth stream provides lastUpdateId but not event timestamp
    const timestamp = Date.now();

    return {
      symbol: symbol.toUpperCase(),
      bids,
      asks,
      lastUpdateId: data?.lastUpdateId || 0,
      timestamp,
      metrics,
      status: 'connected',
      latency_ms: '0' // Can't calculate latency without event timestamp from API
    };
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
   * Get empty metrics for initialization
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
   * Notify all subscribers with new data
   */
  private notifySubscribers(symbol: string, data: OrderBookData) {
    const subscribers = this.subscribers.get(symbol);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in subscriber callback for ${symbol}:`, error);
        }
      });
    }
  }

  /**
   * Notify all error handlers
   */
  private notifyErrors(symbol: string, error: Error) {
    const errorHandlers = this.errorHandlers.get(symbol);
    if (errorHandlers) {
      errorHandlers.forEach(handler => {
        try {
          handler(error);
        } catch (err) {
          console.error(`Error in error handler for ${symbol}:`, err);
        }
      });
    }
  }

  /**
   * Disconnect all WebSockets (for cleanup)
   */
  disconnectAll() {
    console.log('🔌 Disconnecting all WebSockets...');
    this.connections.forEach((_, symbol) => {
      this.disconnect(symbol);
    });
  }

  /**
   * Get current connection status for a symbol
   */
  getConnectionStatus(symbol: string): 'connected' | 'connecting' | 'disconnected' {
    const normalizedSymbol = symbol.toLowerCase();
    const ws = this.connections.get(normalizedSymbol);

    if (!ws) return 'disconnected';

    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Get cached order book data
   */
  getCachedData(symbol: string): OrderBookData | undefined {
    return this.orderBookCache.get(symbol.toLowerCase());
  }

  /**
   * Generate realistic demo order book data for development/fallback
   */
  private generateDemoOrderBook(symbol: string): OrderBookData {
    // Base prices for different cryptocurrencies
    const basePrices: Record<string, number> = {
      btc: 109000,
      eth: 3400,
      bnb: 620,
      sol: 215,
      xrp: 2.45,
      ada: 0.95,
      doge: 0.35,
      avax: 38,
      dot: 7.2,
      matic: 0.85,
      link: 18.5,
      uni: 13.2,
      atom: 9.8,
      ltc: 105,
      etc: 28,
      fil: 5.6,
      near: 6.3,
      apt: 11.2,
      arb: 1.15,
      op: 2.35
    };

    const basePrice = basePrices[symbol] || 100;
    const midPrice = basePrice + (Math.random() - 0.5) * (basePrice * 0.002); // ±0.2% variation

    // Generate bids (buy orders) - decreasing prices
    const bids: OrderBookLevel[] = [];
    for (let i = 0; i < 20; i++) {
      const priceOffset = (i + 1) * (midPrice * 0.0001); // 0.01% steps
      const price = midPrice - priceOffset;
      const quantity = (Math.random() * 10 + 1) * (1 + i * 0.1); // Increasing quantity at lower prices
      const total = bids.reduce((sum, b) => sum + b.quantity, 0) + quantity;
      bids.push({ price, quantity, total });
    }

    // Generate asks (sell orders) - increasing prices
    const asks: OrderBookLevel[] = [];
    for (let i = 0; i < 20; i++) {
      const priceOffset = (i + 1) * (midPrice * 0.0001); // 0.01% steps
      const price = midPrice + priceOffset;
      const quantity = (Math.random() * 10 + 1) * (1 + i * 0.1); // Increasing quantity at higher prices
      const total = asks.reduce((sum, a) => sum + a.quantity, 0) + quantity;
      asks.push({ price, quantity, total });
    }

    const metrics = this.calculateMetrics(bids, asks);

    return {
      symbol: symbol.toUpperCase(),
      bids,
      asks,
      lastUpdateId: Date.now(),
      timestamp: Date.now(),
      metrics,
      status: 'demo', // Mark as demo data
      latency_ms: '0'
    };
  }

  /**
   * Start demo data stream (fallback when WebSocket fails)
   */
  private startDemoDataStream(symbol: string) {
    console.log(`🎭 Starting demo data stream for ${symbol}...`);

    // Generate and emit demo data every 500ms
    const interval = setInterval(() => {
      const demoData = this.generateDemoOrderBook(symbol);
      this.orderBookCache.set(symbol, demoData);
      this.notifySubscribers(symbol, demoData);
    }, 500);

    // Store interval for cleanup
    this.reconnectTimeouts.set(symbol, interval as any);
  }

  /**
   * Get health metrics for a symbol
   */
  getHealthMetrics(symbol: string) {
    return dataHealthMonitor.getHealth(symbol.toLowerCase());
  }

  /**
   * Get overall system health
   */
  getOverallHealth() {
    return dataHealthMonitor.getOverallHealth();
  }
}

// Export singleton instance
export const orderBookWebSocket = new OrderBookWebSocketManager();

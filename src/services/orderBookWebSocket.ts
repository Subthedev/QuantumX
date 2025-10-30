/**
 * WebSocket Order Book Service
 * Provides real-time order book updates with 100ms refresh rate via Binance WebSocket
 */

import type { OrderBookData, OrderBookLevel, OrderBookMetrics } from './orderBookService';
import { dataHealthMonitor } from './dataHealthMonitor';

type OrderBookCallback = (data: OrderBookData) => void;
type ErrorCallback = (error: Error) => void;

interface BinanceDepthUpdate {
  e: string; // event type
  E: number; // event time
  s: string; // symbol
  U: number; // first update ID
  u: number; // final update ID
  b: [string, string][]; // bids
  a: [string, string][]; // asks
}

class OrderBookWebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, Set<OrderBookCallback>> = new Map();
  private errorHandlers: Map<string, Set<ErrorCallback>> = new Map();
  private orderBookCache: Map<string, OrderBookData> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 10;
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

    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol}usdt@depth20@100ms`;
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
        const orderBookData = this.processDepthUpdate(data);

        // Record latency for health monitoring
        const latency = Date.now() - data.E;
        dataHealthMonitor.recordLatency(symbol, latency);

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
      console.error(`❌ Max reconnection attempts reached for ${symbol}`);
      this.notifyErrors(
        symbol,
        new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`)
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
  private processDepthUpdate(data: BinanceDepthUpdate): OrderBookData {
    const bids: OrderBookLevel[] = data.b.map((bid, index) => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      const total = data.b
        .slice(0, index + 1)
        .reduce((sum, b) => sum + parseFloat(b[1]), 0);

      return { price, quantity, total };
    });

    const asks: OrderBookLevel[] = data.a.map((ask, index) => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      const total = data.a
        .slice(0, index + 1)
        .reduce((sum, a) => sum + parseFloat(a[1]), 0);

      return { price, quantity, total };
    });

    const metrics = this.calculateMetrics(bids, asks);

    return {
      symbol: data.s.replace('USDT', ''),
      bids,
      asks,
      lastUpdateId: data.u,
      timestamp: data.E,
      metrics,
      status: 'connected',
      latency_ms: `${Date.now() - data.E}`
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

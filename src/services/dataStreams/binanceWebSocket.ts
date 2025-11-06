/**
 * BINANCE WEBSOCKET STREAM HANDLER
 * Real-time data streaming from Binance with auto-reconnection
 * Sub-second latency for price, volume, and trades
 */

import { CanonicalTicker, ExchangeSource, DataQuality, getCoinGeckoId } from './canonicalDataTypes';

interface BinanceTickerMessage {
  e: string;      // Event type
  E: number;      // Event time
  s: string;      // Symbol
  c: string;      // Current price
  o: string;      // Open price
  h: string;      // High price
  l: string;      // Low price
  v: string;      // Base asset volume
  q: string;      // Quote asset volume
  p: string;      // Price change
  P: string;      // Price change percent
  b: string;      // Best bid price
  a: string;      // Best ask price
}

type DataCallback = (data: CanonicalTicker) => void;
type ErrorCallback = (error: Error) => void;
type StatusCallback = (status: ConnectionStatus) => void;
type FallbackCallback = () => void; // ✅ FIX #5: Callback to trigger HTTP polling fallback

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export class BinanceWebSocketStream {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAY = 3000; // 3 seconds
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  private status: ConnectionStatus = 'DISCONNECTED';
  private subscribedSymbols: Set<string> = new Set();
  private dataCallback: DataCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private statusCallback: StatusCallback | null = null;
  private fallbackCallback: FallbackCallback | null = null; // ✅ FIX #5: Store fallback callback

  /**
   * Subscribe to multiple symbols
   * ✅ FIX #5: Added onFallback callback to trigger HTTP polling when WebSocket fails permanently
   */
  connect(symbols: string[], callbacks: {
    onData: DataCallback;
    onError?: ErrorCallback;
    onStatus?: StatusCallback;
    onFallback?: FallbackCallback; // ✅ FIX #5: Optional fallback to HTTP polling
  }) {
    this.dataCallback = callbacks.onData;
    this.errorCallback = callbacks.onError || null;
    this.statusCallback = callbacks.onStatus || null;
    this.fallbackCallback = callbacks.onFallback || null; // ✅ FIX #5: Store fallback callback
    this.subscribedSymbols = new Set(symbols);
    this.isIntentionallyClosed = false;

    this.createConnection();
  }

  /**
   * Create WebSocket connection
   */
  private createConnection() {
    try {
      this.updateStatus('CONNECTING');

      // Build stream URL for multiple symbols
      // Format: wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/...
      const streams = Array.from(this.subscribedSymbols)
        .map(s => `${s.toLowerCase()}@ticker`)
        .join('/');

      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

      console.log(`[BinanceWS] Connecting to Binance WebSocket...`);
      console.log(`[BinanceWS] Subscribed symbols: ${Array.from(this.subscribedSymbols).join(', ')}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

    } catch (error) {
      console.error('[BinanceWS] Connection error:', error);
      this.updateStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen() {
    console.log('[BinanceWS] ✅ Connected to Binance WebSocket');
    this.reconnectAttempts = 0;
    this.updateStatus('CONNECTED');
    this.startPingInterval();
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);

      // Binance multi-stream format: { stream: "btcusdt@ticker", data: {...} }
      if (message.stream && message.data) {
        const ticker = message.data as BinanceTickerMessage;

        // Normalize to canonical format
        const canonical = this.normalizeToCanonical(ticker);

        // Send to callback
        if (this.dataCallback) {
          this.dataCallback(canonical);
        }
      }

    } catch (error) {
      console.error('[BinanceWS] Message parsing error:', error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }
  }

  /**
   * Normalize Binance ticker to canonical format
   */
  private normalizeToCanonical(ticker: BinanceTickerMessage): CanonicalTicker {
    const symbol = ticker.s; // BTCUSDT
    const coinGeckoId = getCoinGeckoId(symbol, 'binance') || symbol.toLowerCase();

    const price = parseFloat(ticker.c);
    const open = parseFloat(ticker.o);
    const priceChange24h = parseFloat(ticker.p);
    const priceChangePercent24h = parseFloat(ticker.P);

    return {
      symbol: coinGeckoId,
      exchange: 'BINANCE' as ExchangeSource,
      price: price,
      bid: parseFloat(ticker.b),
      ask: parseFloat(ticker.a),
      volume24h: parseFloat(ticker.q), // Quote asset volume (USDT)
      volumeQuote: parseFloat(ticker.q),
      priceChange24h: priceChange24h,
      priceChangePercent24h: priceChangePercent24h,
      high24h: parseFloat(ticker.h),
      low24h: parseFloat(ticker.l),
      timestamp: ticker.E, // Event time
      receivedAt: Date.now(),
      quality: 'HIGH' as DataQuality
    };
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event) {
    console.error('[BinanceWS] WebSocket error:', event);
    this.updateStatus('ERROR');

    if (this.errorCallback) {
      this.errorCallback(new Error('WebSocket error occurred'));
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent) {
    console.log(`[BinanceWS] WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
    this.stopPingInterval();
    this.updateStatus('DISCONNECTED');

    // Reconnect if not intentionally closed
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   * ✅ FIX #5: Triggers HTTP polling fallback when max reconnects reached
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[BinanceWS] ❌ Max reconnection attempts reached.');
      console.log('[BinanceWS] 🔄 Triggering HTTP polling fallback mode...');

      this.updateStatus('ERROR');

      // ✅ FIX #5: Trigger fallback to HTTP polling instead of giving up
      if (this.fallbackCallback) {
        this.fallbackCallback();
        console.log('[BinanceWS] ✅ HTTP polling fallback activated');
      } else {
        console.warn('[BinanceWS] ⚠️ No fallback callback provided - data flow stopped');
      }

      return;
    }

    this.reconnectAttempts++;
    this.updateStatus('RECONNECTING');

    const delay = this.RECONNECT_DELAY * this.reconnectAttempts; // Exponential backoff
    console.log(`[BinanceWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval() {
    this.stopPingInterval();

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Binance doesn't require explicit ping, but we check connection state
        console.log('[BinanceWS] Connection alive check');
      } else {
        console.warn('[BinanceWS] Connection not open, attempting reconnect...');
        this.scheduleReconnect();
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Update connection status
   */
  private updateStatus(status: ConnectionStatus) {
    this.status = status;
    console.log(`[BinanceWS] Status: ${status}`);

    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    console.log('[BinanceWS] Disconnecting...');
    this.isIntentionallyClosed = true;
    this.stopPingInterval();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus('DISCONNECTED');
  }

  /**
   * Get current status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN;
  }
}

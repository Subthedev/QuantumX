/**
 * OKX WEBSOCKET STREAM HANDLER
 * Redundant data source for coins not on Binance or as backup
 */

import { CanonicalTicker, ExchangeSource, DataQuality, getCoinGeckoId } from './canonicalDataTypes';

interface OKXTickerMessage {
  arg: {
    channel: string;
    instId: string;
  };
  data: Array<{
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    volCcy24h: string;
    vol24h: string;
    ts: string;
  }>;
}

type DataCallback = (data: CanonicalTicker) => void;
type ErrorCallback = (error: Error) => void;
type StatusCallback = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export class OKXWebSocketStream {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAY = 3000;
  private readonly PING_INTERVAL = 20000; // OKX requires ping every 30s
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  private status: ConnectionStatus = 'DISCONNECTED';
  private subscribedSymbols: Set<string> = new Set();
  private dataCallback: DataCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private statusCallback: StatusCallback | null = null;

  connect(symbols: string[], callbacks: {
    onData: DataCallback;
    onError?: ErrorCallback;
    onStatus?: StatusCallback;
  }) {
    this.dataCallback = callbacks.onData;
    this.errorCallback = callbacks.onError || null;
    this.statusCallback = callbacks.onStatus || null;
    this.subscribedSymbols = new Set(symbols);
    this.isIntentionallyClosed = false;

    this.createConnection();
  }

  private createConnection() {
    try {
      this.updateStatus('CONNECTING');

      const wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
      console.log('[OKX_WS] Connecting to OKX WebSocket...');

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

    } catch (error) {
      console.error('[OKX_WS] Connection error:', error);
      this.updateStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log('[OKX_WS] ✅ Connected to OKX WebSocket');
    this.reconnectAttempts = 0;
    this.updateStatus('CONNECTED');

    // Subscribe to tickers
    const subscriptions = Array.from(this.subscribedSymbols).map(symbol => ({
      channel: 'tickers',
      instId: symbol
    }));

    const subscribeMessage = {
      op: 'subscribe',
      args: subscriptions
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(subscribeMessage));
      console.log(`[OKX_WS] Subscribed to ${subscriptions.length} tickers`);
    }

    this.startPingInterval();
  }

  private handleMessage(event: MessageEvent) {
    try {
      // OKX sends "pong" as plain text for keep-alive responses
      if (event.data === 'pong') {
        return; // Silently ignore pong responses
      }

      const message = JSON.parse(event.data);

      // Handle subscription confirmation
      if (message.event === 'subscribe') {
        console.log('[OKX_WS] Subscription confirmed:', message.arg);
        return;
      }

      // Handle ticker data
      if (message.arg?.channel === 'tickers' && message.data) {
        for (const ticker of message.data) {
          const canonical = this.normalizeToCanonical(ticker, message.arg.instId);
          if (this.dataCallback) {
            this.dataCallback(canonical);
          }
        }
      }

    } catch (error) {
      console.error('[OKX_WS] Message parsing error:', error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }
  }

  private normalizeToCanonical(ticker: any, instId: string): CanonicalTicker {
    const coinGeckoId = getCoinGeckoId(instId, 'okx') || instId.toLowerCase();

    const last = parseFloat(ticker.last);
    const open = parseFloat(ticker.open24h);
    const priceChange24h = last - open;
    const priceChangePercent24h = open > 0 ? (priceChange24h / open) * 100 : 0;

    return {
      symbol: coinGeckoId,
      exchange: 'OKX' as ExchangeSource,
      price: last,
      bid: parseFloat(ticker.bidPx),
      ask: parseFloat(ticker.askPx),
      volume24h: parseFloat(ticker.volCcy24h), // Quote currency volume
      volumeQuote: parseFloat(ticker.volCcy24h),
      priceChange24h: priceChange24h,
      priceChangePercent24h: priceChangePercent24h,
      high24h: parseFloat(ticker.high24h),
      low24h: parseFloat(ticker.low24h),
      timestamp: parseInt(ticker.ts),
      receivedAt: Date.now(),
      quality: 'HIGH' as DataQuality
    };
  }

  private handleError(event: Event) {
    console.error('[OKX_WS] WebSocket error:', event);
    this.updateStatus('ERROR');

    if (this.errorCallback) {
      this.errorCallback(new Error('OKX WebSocket error occurred'));
    }
  }

  private handleClose(event: CloseEvent) {
    console.log(`[OKX_WS] WebSocket closed (code: ${event.code})`);
    this.stopPingInterval();
    this.updateStatus('DISCONNECTED');

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[OKX_WS] ❌ Max reconnection attempts reached');
      this.updateStatus('ERROR');
      return;
    }

    this.reconnectAttempts++;
    this.updateStatus('RECONNECTING');

    const delay = this.RECONNECT_DELAY * this.reconnectAttempts;
    console.log(`[OKX_WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  private startPingInterval() {
    this.stopPingInterval();

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      } else {
        console.warn('[OKX_WS] Connection not open, reconnecting...');
        this.scheduleReconnect();
      }
    }, this.PING_INTERVAL);
  }

  private stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private updateStatus(status: ConnectionStatus) {
    this.status = status;
    console.log(`[OKX_WS] Status: ${status}`);

    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  disconnect() {
    console.log('[OKX_WS] Disconnecting...');
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

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN;
  }
}

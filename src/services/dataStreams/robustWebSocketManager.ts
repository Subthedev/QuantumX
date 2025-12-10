/**
 * ROBUST WEBSOCKET MANAGER
 * Production-grade WebSocket management with automatic recovery
 *
 * FEATURES:
 * - Browser environment detection
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Graceful degradation to HTTP polling
 * - Error recovery
 * - Memory leak prevention
 */

import { CanonicalTicker } from './canonicalDataTypes';
import { cryptoDataService } from '../cryptoDataService';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableFallback?: boolean;
}

export interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onReconnect?: (attempt: number) => void;
}

export class RobustWebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private intentionallyClosed = false;
  private lastMessageTime = Date.now();
  private fallbackInterval: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig, callbacks: WebSocketCallbacks = {}) {
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      enableFallback: config.enableFallback !== false
    };
    this.callbacks = callbacks;
  }

  /**
   * Connect to WebSocket
   */
  connect(): boolean {
    // Check if WebSocket is available
    if (!this.isWebSocketAvailable()) {
      console.warn('[WebSocketManager] WebSocket not available, using fallback');
      this.startFallback();
      return false;
    }

    // Prevent multiple connections
    if (this.isConnected || this.isConnecting) {
      console.log('[WebSocketManager] Already connected or connecting');
      return true;
    }

    this.intentionallyClosed = false;
    this.isConnecting = true;

    try {
      console.log(`[WebSocketManager] Connecting to ${this.config.url}`);

      // Create WebSocket with proper error handling
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      // Set up event handlers
      this.setupEventHandlers();

      return true;
    } catch (error) {
      console.error('[WebSocketManager] Connection failed:', error);
      this.isConnecting = false;
      this.handleConnectionError(error as Error);
      return false;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocketManager] ✅ Connected');
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.lastMessageTime = Date.now();

      // Start heartbeat monitoring
      this.startHeartbeat();

      // Call callback
      this.callbacks.onOpen?.();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.lastMessageTime = Date.now();

      try {
        const data = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data;

        this.callbacks.onMessage?.(data);
      } catch (error) {
        console.error('[WebSocketManager] Message parse error:', error);
        this.callbacks.onError?.(error as Error);
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error('[WebSocketManager] WebSocket error:', event);
      this.callbacks.onError?.(new Error('WebSocket error'));
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`[WebSocketManager] Disconnected (code: ${event.code}, reason: ${event.reason})`);

      this.isConnected = false;
      this.isConnecting = false;

      // Stop heartbeat
      this.stopHeartbeat();

      // Call callback
      this.callbacks.onClose?.(event.code, event.reason);

      // Reconnect if not intentionally closed
      if (!this.intentionallyClosed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else if (this.config.enableFallback) {
        console.log('[WebSocketManager] Starting fallback mode');
        this.startFallback();
      }
    };
  }

  /**
   * Check if WebSocket is available in current environment
   */
  private isWebSocketAvailable(): boolean {
    if (typeof window === 'undefined') {
      console.warn('[WebSocketManager] Not in browser environment');
      return false;
    }

    if (typeof WebSocket === 'undefined') {
      console.warn('[WebSocketManager] WebSocket API not available');
      return false;
    }

    return true;
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    console.error('[WebSocketManager] Connection error:', error);
    this.callbacks.onError?.(error);

    if (this.config.enableFallback) {
      this.startFallback();
    } else if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      60000 // Max 60 seconds
    );

    console.log(`[WebSocketManager] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.callbacks.onReconnect?.(this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;

      if (timeSinceLastMessage > this.config.heartbeatInterval * 2) {
        console.warn('[WebSocketManager] Connection appears dead, reconnecting...');
        this.reconnect();
      } else if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping if WebSocket supports it
        try {
          // Some WebSocket servers expect a ping frame
          // For browsers that don't support ping(), we can send a custom message
          if (this.ws.send) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        } catch (error) {
          console.error('[WebSocketManager] Ping error:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start fallback HTTP polling
   */
  private startFallback(): void {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }

    console.log('[WebSocketManager] Starting HTTP polling fallback');

    // Poll every 5 seconds using existing crypto data service
    this.fallbackInterval = setInterval(async () => {
      try {
        // Get top cryptos as fallback data
        const cryptos = await cryptoDataService.getTopCryptos(50);

        // Convert to ticker format and send to callback
        cryptos.forEach(crypto => {
          const ticker: Partial<CanonicalTicker> = {
            symbol: crypto.symbol,
            price: crypto.current_price,
            volume24h: crypto.total_volume,
            high24h: crypto.high_24h,
            low24h: crypto.low_24h,
            priceChange24h: crypto.price_change_24h,
            priceChangePercent24h: crypto.price_change_percentage_24h,
            timestamp: Date.now()
          };

          this.callbacks.onMessage?.(ticker);
        });
      } catch (error) {
        console.error('[WebSocketManager] Fallback polling error:', error);
        this.callbacks.onError?.(error as Error);
      }
    }, 5000);
  }

  /**
   * Stop fallback polling
   */
  private stopFallback(): void {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(data: any): boolean {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketManager] Cannot send: not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('[WebSocketManager] Send error:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    console.log('[WebSocketManager] Disconnecting...');
    this.intentionallyClosed = true;

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Stop fallback
    this.stopFallback();

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch (error) {
        console.error('[WebSocketManager] Close error:', error);
      }
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Reconnect WebSocket
   */
  reconnect(): void {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempts: number;
    lastMessageTime: number;
    readyState: number | null;
  } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastMessageTime: this.lastMessageTime,
      readyState: this.ws?.readyState ?? null
    };
  }
}

// Export factory function for easy creation
export function createRobustWebSocket(
  config: WebSocketConfig,
  callbacks: WebSocketCallbacks
): RobustWebSocketManager {
  return new RobustWebSocketManager(config, callbacks);
}
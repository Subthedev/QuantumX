/**
 * LIQUIDATION CASCADE DETECTOR
 *
 * Connects to Binance Futures WebSocket for real-time liquidation data.
 * Detects cascades (rapid, large liquidations) that precede major moves.
 *
 * FREE DATA SOURCE - No API key required
 * WebSocket: wss://fstream.binance.com/ws/!forceOrder@arr
 * REST fallback: https://fapi.binance.com/fapi/v1/allForceOrders
 *
 * Signal value:
 * - Large long liquidations = bearish cascade (price dumping)
 * - Large short liquidations = bullish cascade (short squeeze)
 * - Cascade intensity feeds into ML as a feature (0-1 scale)
 */

export interface LiquidationEvent {
  symbol: string;
  side: 'BUY' | 'SELL'; // BUY = short liquidated (bullish), SELL = long liquidated (bearish)
  quantity: number;
  price: number;
  usdValue: number;
  timestamp: number;
}

export interface CascadeState {
  // Rolling windows
  longLiquidations1m: number;   // USD value of longs liquidated in last 1 min
  shortLiquidations1m: number;  // USD value of shorts liquidated in last 1 min
  longLiquidations5m: number;   // 5-min window
  shortLiquidations5m: number;

  // Derived signals
  cascadeIntensity: number;     // 0-1 scale (0 = calm, 1 = extreme cascade)
  cascadeDirection: 'LONG_SQUEEZE' | 'SHORT_SQUEEZE' | 'NEUTRAL';
  imbalanceRatio: number;       // -1 to +1 (negative = long pain, positive = short pain)

  // Meta
  totalEvents24h: number;
  lastUpdate: number;
  connected: boolean;
}

class LiquidationCascadeService {
  private ws: WebSocket | null = null;
  private events: LiquidationEvent[] = [];
  private state: CascadeState;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MAX_EVENTS = 5000; // Keep last 5000 events
  private readonly WS_URL = 'wss://fstream.binance.com/ws/!forceOrder@arr';
  private readonly REST_URL = 'https://fapi.binance.com/fapi/v1/allForceOrders';
  private subscribers: ((state: CascadeState) => void)[] = [];

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): CascadeState {
    return {
      longLiquidations1m: 0,
      shortLiquidations1m: 0,
      longLiquidations5m: 0,
      shortLiquidations5m: 0,
      cascadeIntensity: 0,
      cascadeDirection: 'NEUTRAL',
      imbalanceRatio: 0,
      totalEvents24h: 0,
      lastUpdate: Date.now(),
      connected: false
    };
  }

  /**
   * Start real-time liquidation monitoring via WebSocket
   */
  start(): void {
    if (typeof WebSocket === 'undefined') {
      console.warn('[LiquidationCascade] WebSocket not available, using REST fallback');
      this.startRESTPolling();
      return;
    }

    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        this.state.connected = true;
        console.log('[LiquidationCascade] Connected to Binance Futures liquidation stream');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processLiquidation(data.o || data);
        } catch {}
      };

      this.ws.onclose = () => {
        this.state.connected = false;
        console.log('[LiquidationCascade] WebSocket closed, reconnecting in 5s...');
        this.reconnectTimer = setTimeout(() => this.start(), 5000);
      };

      this.ws.onerror = () => {
        this.state.connected = false;
      };
    } catch {
      this.startRESTPolling();
    }
  }

  /**
   * REST fallback: poll every 30 seconds
   */
  private restInterval: ReturnType<typeof setInterval> | null = null;

  private startRESTPolling(): void {
    this.fetchRESTLiquidations();
    this.restInterval = setInterval(() => this.fetchRESTLiquidations(), 30000);
  }

  private async fetchRESTLiquidations(): Promise<void> {
    try {
      const response = await fetch(`${this.REST_URL}?limit=50`);
      if (!response.ok) return;
      const data = await response.json();
      data.forEach((item: any) => this.processLiquidation(item));
      this.state.connected = true;
    } catch {
      this.state.connected = false;
    }
  }

  /**
   * Process a single liquidation event
   */
  private processLiquidation(data: any): void {
    const event: LiquidationEvent = {
      symbol: data.s || data.symbol,
      side: data.S || data.side,
      quantity: parseFloat(data.q || data.origQty || '0'),
      price: parseFloat(data.p || data.price || '0'),
      usdValue: parseFloat(data.q || data.origQty || '0') * parseFloat(data.p || data.price || '0'),
      timestamp: data.T || data.time || Date.now()
    };

    this.events.push(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    this.updateState();
  }

  /**
   * Recalculate cascade state from recent events
   */
  private updateState(): void {
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const fiveMinAgo = now - 300000;
    const oneDayAgo = now - 86400000;

    // Calculate rolling windows
    const recent1m = this.events.filter(e => e.timestamp > oneMinAgo);
    const recent5m = this.events.filter(e => e.timestamp > fiveMinAgo);
    const recent24h = this.events.filter(e => e.timestamp > oneDayAgo);

    this.state.longLiquidations1m = recent1m.filter(e => e.side === 'SELL').reduce((sum, e) => sum + e.usdValue, 0);
    this.state.shortLiquidations1m = recent1m.filter(e => e.side === 'BUY').reduce((sum, e) => sum + e.usdValue, 0);
    this.state.longLiquidations5m = recent5m.filter(e => e.side === 'SELL').reduce((sum, e) => sum + e.usdValue, 0);
    this.state.shortLiquidations5m = recent5m.filter(e => e.side === 'BUY').reduce((sum, e) => sum + e.usdValue, 0);
    this.state.totalEvents24h = recent24h.length;

    // Cascade intensity: normalized 0-1 based on 5-min total volume
    // $1M in 5 min = moderate (0.5), $5M+ = extreme (1.0)
    const total5m = this.state.longLiquidations5m + this.state.shortLiquidations5m;
    this.state.cascadeIntensity = Math.min(1.0, total5m / 5000000);

    // Imbalance ratio: -1 (all longs liquidated) to +1 (all shorts liquidated)
    const totalLiq = this.state.longLiquidations5m + this.state.shortLiquidations5m;
    if (totalLiq > 0) {
      this.state.imbalanceRatio = (this.state.shortLiquidations5m - this.state.longLiquidations5m) / totalLiq;
    } else {
      this.state.imbalanceRatio = 0;
    }

    // Direction
    if (this.state.cascadeIntensity > 0.3) {
      this.state.cascadeDirection = this.state.imbalanceRatio > 0.3 ? 'SHORT_SQUEEZE' :
                                     this.state.imbalanceRatio < -0.3 ? 'LONG_SQUEEZE' : 'NEUTRAL';
    } else {
      this.state.cascadeDirection = 'NEUTRAL';
    }

    this.state.lastUpdate = now;

    // Notify subscribers
    this.subscribers.forEach(fn => fn(this.state));
  }

  /**
   * Get current cascade state (sync, no API call)
   */
  getState(): CascadeState {
    return { ...this.state };
  }

  /**
   * Get cascade intensity as ML feature (0-1)
   * Combines intensity with directional bias
   */
  getMLFeature(): { intensity: number; direction: number } {
    return {
      intensity: this.state.cascadeIntensity,
      direction: this.state.imbalanceRatio // -1 to +1
    };
  }

  /**
   * Subscribe to cascade state changes
   */
  subscribe(fn: (state: CascadeState) => void): void {
    this.subscribers.push(fn);
  }

  stop(): void {
    if (this.ws) { try { this.ws.close(); } catch {} }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.restInterval) clearInterval(this.restInterval);
  }
}

export const liquidationCascadeService = new LiquidationCascadeService();

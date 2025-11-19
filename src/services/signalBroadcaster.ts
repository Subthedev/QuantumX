/**
 * SIGNAL BROADCASTER - Ultra-Low-Latency Cross-Tab Communication
 *
 * Broadcasts signals to all open tabs using BroadcastChannel API
 * Enables instant signal delivery across browser tabs with <10ms latency
 *
 * Features:
 * - Broadcast signals to all tabs instantly
 * - Listen for signals from other tabs
 * - Prevent duplicate signal generation
 * - Coordinate state across tabs
 * - Ultra-low latency (<10ms)
 */

export interface BroadcastMessage {
  type: 'NEW_SIGNAL' | 'SIGNAL_UPDATE' | 'SERVICE_STATUS' | 'METRICS_UPDATE';
  timestamp: number;
  payload: any;
}

class SignalBroadcaster {
  private channel: BroadcastChannel | null = null;
  private channelName = 'ignitex-signals-v1';
  private messageHandlers: Map<string, Set<(payload: any) => void>> = new Map();
  private messageCount = 0;
  private lastMessageTime = 0;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize BroadcastChannel
   */
  private initialize() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      console.warn('[Broadcaster] BroadcastChannel API not available');
      return;
    }

    try {
      this.channel = new BroadcastChannel(this.channelName);

      // Listen for messages from other tabs
      this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        this.handleMessage(event.data);
      };

      // Handle errors
      this.channel.onmessageerror = (event) => {
        console.error('[Broadcaster] Message error:', event);
      };

      console.log(`[Broadcaster] ✅ Initialized on channel: ${this.channelName}`);
      console.log('[Broadcaster] 📡 Ready for ultra-low-latency cross-tab sync');
    } catch (error) {
      console.error('[Broadcaster] Failed to initialize:', error);
    }
  }

  /**
   * Broadcast a new signal to all tabs
   */
  broadcastSignal(signal: any) {
    if (!this.channel) return;

    const message: BroadcastMessage = {
      type: 'NEW_SIGNAL',
      timestamp: Date.now(),
      payload: signal
    };

    try {
      this.channel.postMessage(message);
      this.messageCount++;
      this.lastMessageTime = Date.now();

      console.log(`[Broadcaster] ⚡ Broadcast signal: ${signal.symbol} ${signal.direction}`);
      console.log(`[Broadcaster] 📊 Total broadcasts: ${this.messageCount}`);
    } catch (error) {
      console.error('[Broadcaster] Failed to broadcast signal:', error);
    }
  }

  /**
   * Broadcast signal update
   */
  broadcastSignalUpdate(signalId: string, updates: any) {
    if (!this.channel) return;

    const message: BroadcastMessage = {
      type: 'SIGNAL_UPDATE',
      timestamp: Date.now(),
      payload: {
        signalId,
        updates
      }
    };

    try {
      this.channel.postMessage(message);
      console.log(`[Broadcaster] 📝 Broadcast update for signal: ${signalId}`);
    } catch (error) {
      console.error('[Broadcaster] Failed to broadcast update:', error);
    }
  }

  /**
   * Broadcast service status
   */
  broadcastServiceStatus(status: { isRunning: boolean; uptime: number }) {
    if (!this.channel) return;

    const message: BroadcastMessage = {
      type: 'SERVICE_STATUS',
      timestamp: Date.now(),
      payload: status
    };

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('[Broadcaster] Failed to broadcast status:', error);
    }
  }

  /**
   * Broadcast metrics update
   */
  broadcastMetrics(metrics: any) {
    if (!this.channel) return;

    const message: BroadcastMessage = {
      type: 'METRICS_UPDATE',
      timestamp: Date.now(),
      payload: metrics
    };

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('[Broadcaster] Failed to broadcast metrics:', error);
    }
  }

  /**
   * Handle incoming message from other tabs
   */
  private handleMessage(message: BroadcastMessage) {
    const latency = Date.now() - message.timestamp;

    console.log(`[Broadcaster] 📨 Received: ${message.type}`);
    console.log(`[Broadcaster] ⚡ Latency: ${latency}ms`);

    // Emit to registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error(`[Broadcaster] Handler error for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Listen for specific message types
   */
  on(type: BroadcastMessage['type'], handler: (payload: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    console.log(`[Broadcaster] 👂 Listening for: ${type}`);

    // Return unsubscribe function
    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Stop listening for specific message types
   */
  off(type: BroadcastMessage['type'], handler: (payload: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }

      console.log(`[Broadcaster] 🔇 Stopped listening for: ${type}`);
    }
  }

  /**
   * Close the broadcast channel
   */
  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
      this.messageHandlers.clear();
      console.log('[Broadcaster] 🔌 Channel closed');
    }
  }

  /**
   * Get broadcast statistics
   */
  getStats() {
    return {
      isActive: this.channel !== null,
      channelName: this.channelName,
      messageCount: this.messageCount,
      lastMessageTime: this.lastMessageTime,
      lastMessageFormatted: this.lastMessageTime
        ? new Date(this.lastMessageTime).toLocaleTimeString()
        : 'Never',
      activeHandlers: Array.from(this.messageHandlers.keys()),
      handlerCount: Array.from(this.messageHandlers.values())
        .reduce((sum, set) => sum + set.size, 0)
    };
  }

  /**
   * Check if BroadcastChannel is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined';
  }
}

// Singleton instance
export const signalBroadcaster = new SignalBroadcaster();

// Expose on window for debugging
if (typeof window !== 'undefined') {
  (window as any).signalBroadcaster = signalBroadcaster;
  console.log('[Broadcaster] 🔧 Exposed on window.signalBroadcaster');
}

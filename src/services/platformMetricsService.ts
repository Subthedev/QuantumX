/**
 * Platform-Wide Metrics Service
 * Calculates aggregated metrics across all listed cryptocurrencies
 */

import { orderBookWebSocket } from './orderBookWebSocket';

export interface PlatformMetrics {
  totalCoins: number;
  totalBidVolume: number; // Total USD value of all bids
  totalAskVolume: number; // Total USD value of all asks
  totalVolume: number; // Total order book volume
  averageSpread: number; // Average spread percentage
  averageBuyPressure: number; // Average buy pressure percentage
  averageSellPressure: number; // Average sell pressure percentage
  bullishCoins: number; // Coins with buy pressure > 60%
  bearishCoins: number; // Coins with sell pressure > 60%
  neutralCoins: number; // Coins with balanced order book
  lastUpdate: number;
}

const TRACKED_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'ETC', 'FIL', 'NEAR', 'APT', 'ARB', 'OP'
];

class PlatformMetricsService {
  private metricsCache: PlatformMetrics | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(metrics: PlatformMetrics) => void> = new Set();

  /**
   * Start tracking platform-wide metrics
   */
  startTracking(updateIntervalMs: number = 1000) {
    if (this.updateInterval) {
      return; // Already tracking
    }

    console.log('📊 Starting platform metrics tracking...');

    // Subscribe to all tracked symbols
    TRACKED_SYMBOLS.forEach(symbol => {
      orderBookWebSocket.subscribe(
        symbol,
        () => {
          // Data is cached in the WebSocket manager
          // We'll calculate metrics on interval
        },
        (error) => {
          console.warn(`Error tracking ${symbol}:`, error.message);
        }
      );
    });

    // Calculate and broadcast metrics at regular intervals
    this.updateInterval = setInterval(() => {
      this.calculateAndBroadcastMetrics();
    }, updateIntervalMs);

    // Initial calculation
    this.calculateAndBroadcastMetrics();
  }

  /**
   * Stop tracking platform-wide metrics
   */
  stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('📊 Stopped platform metrics tracking');
  }

  /**
   * Subscribe to platform metrics updates
   */
  subscribe(callback: (metrics: PlatformMetrics) => void): () => void {
    this.subscribers.add(callback);

    // Send cached metrics immediately if available
    if (this.metricsCache) {
      callback(this.metricsCache);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Calculate platform-wide metrics from cached order book data
   */
  private calculateAndBroadcastMetrics() {
    let totalBidVolume = 0;
    let totalAskVolume = 0;
    let totalSpread = 0;
    let totalBuyPressure = 0;
    let totalSellPressure = 0;
    let bullishCoins = 0;
    let bearishCoins = 0;
    let neutralCoins = 0;
    let activeCoins = 0;

    TRACKED_SYMBOLS.forEach(symbol => {
      const data = orderBookWebSocket.getCachedData(symbol);
      if (data && data.status === 'connected') {
        activeCoins++;

        // Calculate USD volume (mid price * quantity)
        const bidVolumeUSD = data.metrics.totalBidVolume * data.metrics.midPrice;
        const askVolumeUSD = data.metrics.totalAskVolume * data.metrics.midPrice;

        totalBidVolume += bidVolumeUSD;
        totalAskVolume += askVolumeUSD;
        totalSpread += data.metrics.spreadPercent;
        totalBuyPressure += data.metrics.buyPressure;
        totalSellPressure += data.metrics.sellPressure;

        // Classify market sentiment
        if (data.metrics.buyPressure > 60) {
          bullishCoins++;
        } else if (data.metrics.sellPressure > 60) {
          bearishCoins++;
        } else {
          neutralCoins++;
        }
      }
    });

    if (activeCoins === 0) {
      return; // No data yet
    }

    const metrics: PlatformMetrics = {
      totalCoins: activeCoins,
      totalBidVolume,
      totalAskVolume,
      totalVolume: totalBidVolume + totalAskVolume,
      averageSpread: totalSpread / activeCoins,
      averageBuyPressure: totalBuyPressure / activeCoins,
      averageSellPressure: totalSellPressure / activeCoins,
      bullishCoins,
      bearishCoins,
      neutralCoins,
      lastUpdate: Date.now()
    };

    this.metricsCache = metrics;

    // Broadcast to all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in platform metrics subscriber:', error);
      }
    });
  }

  /**
   * Get current cached metrics
   */
  getCachedMetrics(): PlatformMetrics | null {
    return this.metricsCache;
  }
}

// Export singleton instance
export const platformMetricsService = new PlatformMetricsService();

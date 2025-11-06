/**
 * MICRO-PATTERN DETECTOR
 * Ultra-fast, lightweight anomaly detection that runs on EVERY WebSocket tick
 * Performance requirement: <1ms execution time
 * Purpose: Detect market anomalies to trigger adaptive tier upgrades
 */

import { CanonicalTicker } from '../dataStreams/canonicalDataTypes';

export type AnomalySeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnomalyDetection {
  hasAnomaly: boolean;
  severity: AnomalySeverity;
  reasons: string[];
  metrics: {
    priceVelocity: number;
    spreadChange: number;
    priceGap: number;
    acceleration: boolean;
  };
}

export class MicroPatternDetector {
  // Performance optimization: Keep track of previous calculations
  private priceHistory: Map<string, { price: number; timestamp: number }[]> = new Map();
  private readonly MAX_HISTORY = 5; // Only keep last 5 ticks for velocity calculation

  /**
   * Detect anomalies in market data (MUST execute in <1ms)
   * This runs on EVERY WebSocket tick, so it must be extremely efficient
   */
  detectAnomalies(current: CanonicalTicker, previous: CanonicalTicker): AnomalyDetection {
    const startTime = performance.now();

    const reasons: string[] = [];
    let severity: AnomalySeverity = 'NONE';

    // OPTIMIZATION: Early exit if no previous data
    if (!previous || previous.price === 0) {
      return {
        hasAnomaly: false,
        severity: 'NONE',
        reasons: [],
        metrics: { priceVelocity: 0, spreadChange: 0, priceGap: 0, acceleration: false }
      };
    }

    const timeDelta = (current.timestamp - previous.timestamp) / 1000; // seconds
    if (timeDelta <= 0) {
      return {
        hasAnomaly: false,
        severity: 'NONE',
        reasons: [],
        metrics: { priceVelocity: 0, spreadChange: 0, priceGap: 0, acceleration: false }
      };
    }

    // DETECTION 1: Price gap (immediate, significant price change)
    const priceChangePercent = Math.abs((current.price - previous.price) / previous.price * 100);

    if (priceChangePercent > 2.0) {
      reasons.push('critical_price_gap');
      severity = 'CRITICAL';
    } else if (priceChangePercent > 1.0) {
      reasons.push('high_price_gap');
      severity = 'HIGH';
    } else if (priceChangePercent > 0.5) {
      reasons.push('medium_price_gap');
      severity = severity === 'NONE' ? 'MEDIUM' : severity;
    }

    // DETECTION 2: Price velocity (speed of price change)
    const priceVelocity = priceChangePercent / timeDelta; // % per second

    if (priceVelocity > 2.0) { // >2% per second = flash crash/pump
      reasons.push('extreme_velocity');
      severity = 'CRITICAL';
    } else if (priceVelocity > 1.0) {
      reasons.push('high_velocity');
      severity = severity === 'NONE' ? 'HIGH' : severity;
    } else if (priceVelocity > 0.5) {
      reasons.push('elevated_velocity');
      severity = severity === 'NONE' ? 'MEDIUM' : severity;
    }

    // DETECTION 3: Bid-ask spread changes (liquidity indicator)
    let spreadChange = 0;
    if (current.bid > 0 && current.ask > 0 && previous.bid > 0 && previous.ask > 0) {
      const currentSpread = (current.ask - current.bid) / current.bid * 100;
      const previousSpread = (previous.ask - previous.bid) / previous.bid * 100;
      spreadChange = Math.abs(currentSpread - previousSpread);

      if (spreadChange > 1.0) { // Spread widened >1% = liquidity evaporation
        reasons.push('liquidity_drain');
        severity = severity === 'NONE' ? 'HIGH' : severity;
      } else if (spreadChange > 0.5) {
        reasons.push('spread_widening');
        severity = severity === 'NONE' ? 'MEDIUM' : severity;
      }
    }

    // DETECTION 4: Price acceleration (derivative of velocity)
    let acceleration = false;
    const history = this.priceHistory.get(current.symbol) || [];
    history.push({ price: current.price, timestamp: current.timestamp });

    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }
    this.priceHistory.set(current.symbol, history);

    // Calculate acceleration if we have enough history
    if (history.length >= 3) {
      const recentVelocities: number[] = [];
      for (let i = 1; i < history.length; i++) {
        const deltaPrice = Math.abs((history[i].price - history[i-1].price) / history[i-1].price * 100);
        const deltaTime = (history[i].timestamp - history[i-1].timestamp) / 1000;
        if (deltaTime > 0) {
          recentVelocities.push(deltaPrice / deltaTime);
        }
      }

      if (recentVelocities.length >= 2) {
        const velocityIncrease = recentVelocities[recentVelocities.length - 1] - recentVelocities[0];
        if (velocityIncrease > 1.0) { // Velocity increasing = acceleration
          acceleration = true;
          reasons.push('accelerating');
          severity = 'HIGH';
        }
      }
    }

    // DETECTION 5: Volume anomaly (if available)
    if (current.volume24h > 0 && previous.volume24h > 0) {
      // Note: 24h volume is cumulative, so this only works for significant changes
      const volumeChangePercent = Math.abs((current.volume24h - previous.volume24h) / previous.volume24h * 100);
      if (volumeChangePercent > 20 && timeDelta < 5) { // 20% change in <5 seconds
        reasons.push('volume_surge');
        severity = severity === 'NONE' ? 'MEDIUM' : severity;
      }
    }

    const executionTime = performance.now() - startTime;

    // Performance warning if we're too slow
    if (executionTime > 1.0) {
      console.warn(`[MicroPatternDetector] Slow execution: ${executionTime.toFixed(2)}ms for ${current.symbol}`);
    }

    return {
      hasAnomaly: reasons.length > 0,
      severity,
      reasons,
      metrics: {
        priceVelocity,
        spreadChange,
        priceGap: priceChangePercent,
        acceleration
      }
    };
  }

  /**
   * Get severity score (0-100) for prioritization
   */
  getSeverityScore(severity: AnomalySeverity): number {
    switch (severity) {
      case 'CRITICAL': return 100;
      case 'HIGH': return 75;
      case 'MEDIUM': return 50;
      case 'LOW': return 25;
      case 'NONE': return 0;
    }
  }

  /**
   * Clear history for a symbol (memory management)
   */
  clearHistory(symbol: string) {
    this.priceHistory.delete(symbol);
  }

  /**
   * Get memory usage stats
   */
  getStats() {
    return {
      trackedCoins: this.priceHistory.size,
      totalDataPoints: Array.from(this.priceHistory.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

// Singleton instance for global use
export const microPatternDetector = new MicroPatternDetector();

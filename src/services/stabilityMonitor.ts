/**
 * IGX STABILITY MONITOR
 *
 * Continuous monitoring for production stability:
 * - WebSocket connection health
 * - Rejected signals real-time updates
 * - Memory usage tracking
 * - API rate limit monitoring
 * - Pipeline throughput
 *
 * FOR INSTITUTIONAL-GRADE 24/7 OPERATION
 */

import { supabase } from '@/integrations/supabase/client';

export interface StabilityMetrics {
  // WebSocket Health
  wsConnectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  wsDataRate: number; // Updates per second
  wsLatency: number; // Average latency in ms

  // Rejected Signals Tracking
  rejectedSignalsCount: number;
  rejectedSignalsLastUpdate: number;
  rejectedSignalsUpdateRate: number; // Updates per second

  // Memory & Performance
  memoryUsageMB: number;
  memoryGrowthRate: number; // MB per hour
  cpuUsage: number;

  // API Rate Limits
  binanceCallsPerMin: number;
  coinGeckoCallsPerMin: number;
  rateLimitWarnings: number;

  // Pipeline Throughput
  signalsPerMinute: number;
  alphaRejectionRate: number;
  betaRejectionRate: number;
  gammaRejectionRate: number;
  deltaRejectionRate: number;

  // System Health
  uptime: number;
  lastHealthCheck: number;
  errors: string[];
  warnings: string[];
}

export class StabilityMonitor {
  private metrics: StabilityMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private rejectedSignalsCheckInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private lastRejectedCount: number = 0;
  private lastRejectedCheck: number = 0;
  private binanceCalls: number[] = [];
  private coinGeckoCalls: number[] = [];

  constructor() {
    this.metrics = this.getInitialMetrics();
  }

  private getInitialMetrics(): StabilityMetrics {
    return {
      wsConnectionStatus: 'DISCONNECTED',
      wsDataRate: 0,
      wsLatency: 0,
      rejectedSignalsCount: 0,
      rejectedSignalsLastUpdate: 0,
      rejectedSignalsUpdateRate: 0,
      memoryUsageMB: 0,
      memoryGrowthRate: 0,
      cpuUsage: 0,
      binanceCallsPerMin: 0,
      coinGeckoCallsPerMin: 0,
      rateLimitWarnings: 0,
      signalsPerMinute: 0,
      alphaRejectionRate: 0,
      betaRejectionRate: 0,
      gammaRejectionRate: 0,
      deltaRejectionRate: 0,
      uptime: 0,
      lastHealthCheck: Date.now(),
      errors: [],
      warnings: []
    };
  }

  /**
   * Start stability monitoring
   */
  start() {
    if (this.monitoringInterval) {
      console.log('[StabilityMonitor] Already running');
      return;
    }

    console.log('\n[StabilityMonitor] ========== STARTING STABILITY MONITORING ==========');
    console.log('[StabilityMonitor] Monitoring: WebSocket, Rejected Signals, Memory, Rate Limits');
    console.log('[StabilityMonitor] Check Interval: 10 seconds');
    console.log('[StabilityMonitor] ================================================================\n');

    this.startTime = Date.now();

    // Main monitoring loop (every 10 seconds)
    this.monitoringInterval = setInterval(() => {
      this.runHealthCheck();
    }, 10000);

    // Rejected signals real-time monitoring (every 1 second)
    this.rejectedSignalsCheckInterval = setInterval(() => {
      this.checkRejectedSignalsUpdate();
    }, 1000);

    console.log('[StabilityMonitor] ✅ Stability monitoring active');
  }

  /**
   * Stop stability monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.rejectedSignalsCheckInterval) {
      clearInterval(this.rejectedSignalsCheckInterval);
      this.rejectedSignalsCheckInterval = null;
    }
    console.log('[StabilityMonitor] Stopped');
  }

  /**
   * Run comprehensive health check
   */
  private async runHealthCheck() {
    try {
      // Update uptime
      this.metrics.uptime = Date.now() - this.startTime;

      // Check memory usage
      if (performance && (performance as any).memory) {
        const memInfo = (performance as any).memory;
        this.metrics.memoryUsageMB = memInfo.usedJSHeapSize / 1024 / 1024;

        // Calculate memory growth rate (MB per hour)
        const uptimeHours = this.metrics.uptime / 3600000;
        if (uptimeHours > 0) {
          this.metrics.memoryGrowthRate = this.metrics.memoryUsageMB / uptimeHours;
        }

        // Memory warning if > 500MB or growth > 50MB/hour
        if (this.metrics.memoryUsageMB > 500) {
          this.addWarning(`High memory usage: ${this.metrics.memoryUsageMB.toFixed(0)}MB`);
        }
        if (this.metrics.memoryGrowthRate > 50) {
          this.addWarning(`Memory leak suspected: ${this.metrics.memoryGrowthRate.toFixed(1)}MB/hour growth`);
        }
      }

      // Check API rate limits
      this.updateRateLimits();

      // Check rejected signals table health
      await this.checkRejectedSignalsHealth();

      // Update last check time
      this.metrics.lastHealthCheck = Date.now();

      // Log health status every 10 checks (100 seconds)
      if (Math.floor(this.metrics.uptime / 10000) % 10 === 0) {
        this.logHealthStatus();
      }
    } catch (error) {
      this.addError(`Health check failed: ${error}`);
      console.error('[StabilityMonitor] Health check error:', error);
    }
  }

  /**
   * Check rejected signals are updating in real-time
   */
  private async checkRejectedSignalsUpdate() {
    try {
      const { count, error } = await supabase
        .from('rejected_signals')
        .select('*', { count: 'exact', head: true });

      if (error) {
        this.addWarning(`Rejected signals query failed: ${error.message}`);
        return;
      }

      const currentCount = count || 0;
      const now = Date.now();

      // Calculate update rate
      if (this.lastRejectedCheck > 0) {
        const timeDiff = (now - this.lastRejectedCheck) / 1000; // seconds
        const countDiff = currentCount - this.lastRejectedCount;

        if (timeDiff > 0) {
          this.metrics.rejectedSignalsUpdateRate = countDiff / timeDiff;
        }
      }

      this.metrics.rejectedSignalsCount = currentCount;
      this.metrics.rejectedSignalsLastUpdate = now;
      this.lastRejectedCount = currentCount;
      this.lastRejectedCheck = now;

      // Warning if no updates for 60 seconds (system might be stalled)
      const timeSinceUpdate = now - this.metrics.rejectedSignalsLastUpdate;
      if (timeSinceUpdate > 60000 && currentCount === 0) {
        this.addWarning('No rejected signals in 60s - system might be stalled');
      }
    } catch (error) {
      this.addError(`Rejected signals check failed: ${error}`);
    }
  }

  /**
   * Check rejected signals database health
   */
  private async checkRejectedSignalsHealth() {
    try {
      // Query rejection breakdown by stage
      const { data, error } = await supabase
        .from('rejected_signals')
        .select('rejection_stage');

      if (error) {
        this.addWarning(`Database query failed: ${error.message}`);
        return;
      }

      if (data) {
        const alphaCount = data.filter(r => r.rejection_stage === 'ALPHA').length;
        const betaCount = data.filter(r => r.rejection_stage === 'BETA').length;
        const gammaCount = data.filter(r => r.rejection_stage === 'GAMMA').length;
        const deltaCount = data.filter(r => r.rejection_stage === 'DELTA').length;
        const total = data.length;

        if (total > 0) {
          this.metrics.alphaRejectionRate = (alphaCount / total) * 100;
          this.metrics.betaRejectionRate = (betaCount / total) * 100;
          this.metrics.gammaRejectionRate = (gammaCount / total) * 100;
          this.metrics.deltaRejectionRate = (deltaCount / total) * 100;
        }

        // Warning if 100% rejection at any stage (might indicate a problem)
        if (this.metrics.alphaRejectionRate === 100 && total > 50) {
          this.addWarning('100% Alpha rejection - check Alpha strategies');
        }
        if (this.metrics.betaRejectionRate === 100 && total > 50) {
          this.addWarning('100% Beta rejection - check consensus threshold');
        }
      }
    } catch (error) {
      this.addError(`Rejected signals health check failed: ${error}`);
    }
  }

  /**
   * Update API rate limit tracking
   */
  private updateRateLimits() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old calls
    this.binanceCalls = this.binanceCalls.filter(t => t > oneMinuteAgo);
    this.coinGeckoCalls = this.coinGeckoCalls.filter(t => t > oneMinuteAgo);

    this.metrics.binanceCallsPerMin = this.binanceCalls.length;
    this.metrics.coinGeckoCallsPerMin = this.coinGeckoCalls.length;

    // Rate limit warnings
    // Binance: 1200/min weight limit, ~240 requests/min safe
    if (this.metrics.binanceCallsPerMin > 200) {
      this.addWarning(`Binance rate limit approaching: ${this.metrics.binanceCallsPerMin}/min`);
      this.metrics.rateLimitWarnings++;
    }

    // CoinGecko: 10-50 calls/min depending on plan
    if (this.metrics.coinGeckoCallsPerMin > 40) {
      this.addWarning(`CoinGecko rate limit approaching: ${this.metrics.coinGeckoCallsPerMin}/min`);
      this.metrics.rateLimitWarnings++;
    }
  }

  /**
   * Track Binance API call
   */
  trackBinanceCall() {
    this.binanceCalls.push(Date.now());
  }

  /**
   * Track CoinGecko API call
   */
  trackCoinGeckoCall() {
    this.coinGeckoCalls.push(Date.now());
  }

  /**
   * Add error
   */
  private addError(message: string) {
    this.metrics.errors.push(`[${new Date().toISOString()}] ${message}`);
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
  }

  /**
   * Add warning
   */
  private addWarning(message: string) {
    const warningMessage = `[${new Date().toISOString()}] ${message}`;

    // Avoid duplicate consecutive warnings
    if (this.metrics.warnings[this.metrics.warnings.length - 1] !== warningMessage) {
      this.metrics.warnings.push(warningMessage);
      console.warn(`[StabilityMonitor] ⚠️ ${message}`);
    }

    // Keep only last 50 warnings
    if (this.metrics.warnings.length > 50) {
      this.metrics.warnings = this.metrics.warnings.slice(-50);
    }
  }

  /**
   * Log health status
   */
  private logHealthStatus() {
    const uptimeHours = (this.metrics.uptime / 3600000).toFixed(1);

    console.log('\n[StabilityMonitor] ========== HEALTH STATUS ==========');
    console.log(`[StabilityMonitor] Uptime: ${uptimeHours}h`);
    console.log(`[StabilityMonitor] Memory: ${this.metrics.memoryUsageMB.toFixed(0)}MB (${this.metrics.memoryGrowthRate.toFixed(1)}MB/h growth)`);
    console.log(`[StabilityMonitor] Rejected Signals: ${this.metrics.rejectedSignalsCount} total (${this.metrics.rejectedSignalsUpdateRate.toFixed(2)}/s)`);
    console.log(`[StabilityMonitor] API Calls/min: Binance=${this.metrics.binanceCallsPerMin}, CoinGecko=${this.metrics.coinGeckoCallsPerMin}`);
    console.log(`[StabilityMonitor] Rejection Rates: Alpha=${this.metrics.alphaRejectionRate.toFixed(1)}%, Beta=${this.metrics.betaRejectionRate.toFixed(1)}%, Gamma=${this.metrics.gammaRejectionRate.toFixed(1)}%, Delta=${this.metrics.deltaRejectionRate.toFixed(1)}%`);
    console.log(`[StabilityMonitor] Warnings: ${this.metrics.warnings.length}, Errors: ${this.metrics.errors.length}`);
    console.log('[StabilityMonitor] ================================================\n');

    // Log recent warnings and errors
    if (this.metrics.warnings.length > 0) {
      console.log('[StabilityMonitor] Recent Warnings:');
      this.metrics.warnings.slice(-5).forEach(w => console.warn(w));
    }
    if (this.metrics.errors.length > 0) {
      console.log('[StabilityMonitor] Recent Errors:');
      this.metrics.errors.slice(-5).forEach(e => console.error(e));
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): StabilityMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate stability report
   */
  generateReport(): string {
    const uptimeHours = (this.metrics.uptime / 3600000).toFixed(1);
    const uptimeDays = (this.metrics.uptime / 86400000).toFixed(1);

    return `
# IGX Stability Report

**Generated**: ${new Date().toISOString()}
**Uptime**: ${uptimeHours}h (${uptimeDays} days)

## System Health

- **Memory Usage**: ${this.metrics.memoryUsageMB.toFixed(0)}MB
- **Memory Growth Rate**: ${this.metrics.memoryGrowthRate.toFixed(1)}MB/hour
- **WebSocket Status**: ${this.metrics.wsConnectionStatus}
- **WebSocket Latency**: ${this.metrics.wsLatency}ms

## Rejected Signals

- **Total Count**: ${this.metrics.rejectedSignalsCount}
- **Update Rate**: ${this.metrics.rejectedSignalsUpdateRate.toFixed(2)}/second
- **Last Update**: ${new Date(this.metrics.rejectedSignalsLastUpdate).toLocaleString()}

### Rejection Breakdown:
- **Alpha**: ${this.metrics.alphaRejectionRate.toFixed(1)}%
- **Beta**: ${this.metrics.betaRejectionRate.toFixed(1)}%
- **Gamma**: ${this.metrics.gammaRejectionRate.toFixed(1)}%
- **Delta**: ${this.metrics.deltaRejectionRate.toFixed(1)}%

## API Rate Limits

- **Binance**: ${this.metrics.binanceCallsPerMin}/min
- **CoinGecko**: ${this.metrics.coinGeckoCallsPerMin}/min
- **Rate Limit Warnings**: ${this.metrics.rateLimitWarnings}

## Issues

### Warnings (${this.metrics.warnings.length}):
${this.metrics.warnings.slice(-10).join('\n')}

### Errors (${this.metrics.errors.length}):
${this.metrics.errors.slice(-10).join('\n')}

## Recommendations

${this.generateRecommendations()}
`;
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(): string {
    const recommendations: string[] = [];

    if (this.metrics.memoryGrowthRate > 50) {
      recommendations.push('- ⚠️ **Memory Leak**: Investigate memory growth rate (>50MB/hour)');
    }

    if (this.metrics.rejectedSignalsUpdateRate === 0 && this.metrics.uptime > 60000) {
      recommendations.push('- ⚠️ **Stalled Pipeline**: No rejected signals updating - check pipeline health');
    }

    if (this.metrics.alphaRejectionRate === 100 && this.metrics.rejectedSignalsCount > 50) {
      recommendations.push('- ⚠️ **Alpha Strategies**: 100% rejection - review strategy thresholds');
    }

    if (this.metrics.betaRejectionRate > 90 && this.metrics.rejectedSignalsCount > 50) {
      recommendations.push('- ⚠️ **Beta Consensus**: >90% rejection - consider lowering confidence threshold');
    }

    if (this.metrics.rateLimitWarnings > 10) {
      recommendations.push('- ⚠️ **Rate Limits**: Approaching API limits - implement request throttling');
    }

    if (recommendations.length === 0) {
      recommendations.push('- ✅ **All Systems Healthy**: No issues detected');
    }

    return recommendations.join('\n');
  }
}

// Singleton instance
export const stabilityMonitor = new StabilityMonitor();

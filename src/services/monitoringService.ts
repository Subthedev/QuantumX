/**
 * MONITORING SERVICE
 *
 * Client-side metrics collection and monitoring for production observability.
 * Tracks Arena trading, Oracle predictions, and system health metrics.
 *
 * Usage:
 *   import { monitoringService } from '@/services/monitoringService';
 *   monitoringService.trackTrade({ ... });
 *   monitoringService.getMetrics();
 */

interface TradeMetric {
  agentId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  profitLoss: number;
  success: boolean;
  durationMs: number;
  timestamp: number;
}

interface PredictionMetric {
  questionId: string;
  userId: string;
  isEarlyBird: boolean;
  responseTimeMs: number;
  timestamp: number;
}

interface APIMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: number;
}

interface ErrorMetric {
  source: 'arena' | 'oracle' | 'api' | 'system';
  error: string;
  context?: Record<string, any>;
  timestamp: number;
}

interface MetricsSummary {
  arena: {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    successRate: number;
    totalPnL: number;
    avgTradeTime: number;
    tradesPerMinute: number;
  };
  oracle: {
    totalPredictions: number;
    earlyBirdPredictions: number;
    avgResponseTime: number;
    predictionsPerMinute: number;
  };
  api: {
    totalRequests: number;
    successfulRequests: number;
    errorRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  };
  errors: {
    total: number;
    bySource: Record<string, number>;
    recentErrors: ErrorMetric[];
  };
  uptime: {
    startTime: number;
    uptimeMs: number;
    uptimeFormatted: string;
  };
}

class MonitoringService {
  private trades: TradeMetric[] = [];
  private predictions: PredictionMetric[] = [];
  private apiCalls: APIMetric[] = [];
  private errors: ErrorMetric[] = [];
  private startTime: number;

  // Configuration
  private readonly MAX_METRICS_STORED = 1000;
  private readonly METRICS_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Alert thresholds
  private readonly ALERT_THRESHOLDS = {
    errorRatePercent: 5,
    apiResponseTimeMs: 2000,
    tradeSuccessRatePercent: 80,
    pnlDiscrepancyUsd: 1,
  };

  // Alert callbacks
  private alertCallbacks: ((alert: AlertMessage) => void)[] = [];

  constructor() {
    this.startTime = Date.now();
    console.log('[Monitoring] Service initialized');

    // Clean up old metrics periodically
    setInterval(() => this.cleanupOldMetrics(), 5 * 60 * 1000); // Every 5 minutes
  }

  // ============================================================================
  // TRADE METRICS
  // ============================================================================

  trackTrade(metric: Omit<TradeMetric, 'timestamp'>): void {
    const fullMetric: TradeMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.trades.push(fullMetric);
    this.trimMetrics(this.trades);

    // Check for alerts
    this.checkTradeAlerts(fullMetric);

    console.log(`[Monitoring] Trade tracked: ${metric.agentId} ${metric.symbol} ${metric.side} - ${metric.success ? 'SUCCESS' : 'FAILED'}`);
  }

  getTradeMetrics(windowMs: number = 60 * 60 * 1000): TradeMetric[] {
    const cutoff = Date.now() - windowMs;
    return this.trades.filter(t => t.timestamp >= cutoff);
  }

  // ============================================================================
  // PREDICTION METRICS
  // ============================================================================

  trackPrediction(metric: Omit<PredictionMetric, 'timestamp'>): void {
    const fullMetric: PredictionMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.predictions.push(fullMetric);
    this.trimMetrics(this.predictions);

    console.log(`[Monitoring] Prediction tracked: ${metric.questionId} - Early Bird: ${metric.isEarlyBird}`);
  }

  getPredictionMetrics(windowMs: number = 60 * 60 * 1000): PredictionMetric[] {
    const cutoff = Date.now() - windowMs;
    return this.predictions.filter(p => p.timestamp >= cutoff);
  }

  // ============================================================================
  // API METRICS
  // ============================================================================

  trackAPICall(metric: Omit<APIMetric, 'timestamp'>): void {
    const fullMetric: APIMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.apiCalls.push(fullMetric);
    this.trimMetrics(this.apiCalls);

    // Check for slow API calls
    if (metric.responseTimeMs > this.ALERT_THRESHOLDS.apiResponseTimeMs) {
      this.triggerAlert({
        type: 'warning',
        source: 'api',
        message: `Slow API response: ${metric.endpoint} took ${metric.responseTimeMs}ms`,
        data: metric,
      });
    }

    // Check for API errors
    if (metric.statusCode >= 400) {
      this.trackError({
        source: 'api',
        error: `API Error ${metric.statusCode}: ${metric.endpoint}`,
        context: metric,
      });
    }
  }

  getAPIMetrics(windowMs: number = 60 * 60 * 1000): APIMetric[] {
    const cutoff = Date.now() - windowMs;
    return this.apiCalls.filter(a => a.timestamp >= cutoff);
  }

  // ============================================================================
  // ERROR TRACKING
  // ============================================================================

  trackError(metric: Omit<ErrorMetric, 'timestamp'>): void {
    const fullMetric: ErrorMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.errors.push(fullMetric);
    this.trimMetrics(this.errors);

    console.error(`[Monitoring] Error tracked: [${metric.source}] ${metric.error}`);

    // Check error rate
    this.checkErrorRateAlerts();
  }

  getErrors(windowMs: number = 60 * 60 * 1000): ErrorMetric[] {
    const cutoff = Date.now() - windowMs;
    return this.errors.filter(e => e.timestamp >= cutoff);
  }

  // ============================================================================
  // METRICS SUMMARY
  // ============================================================================

  getMetrics(windowMs: number = 60 * 60 * 1000): MetricsSummary {
    const trades = this.getTradeMetrics(windowMs);
    const predictions = this.getPredictionMetrics(windowMs);
    const apiCalls = this.getAPIMetrics(windowMs);
    const errors = this.getErrors(windowMs);

    const windowMinutes = windowMs / (60 * 1000);
    const uptimeMs = Date.now() - this.startTime;

    // Arena metrics
    const successfulTrades = trades.filter(t => t.success);
    const totalPnL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const avgTradeTime = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.durationMs, 0) / trades.length
      : 0;

    // Oracle metrics
    const earlyBirdPredictions = predictions.filter(p => p.isEarlyBird);
    const avgPredictionResponseTime = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.responseTimeMs, 0) / predictions.length
      : 0;

    // API metrics
    const successfulAPICalls = apiCalls.filter(a => a.statusCode < 400);
    const avgAPIResponseTime = apiCalls.length > 0
      ? apiCalls.reduce((sum, a) => sum + a.responseTimeMs, 0) / apiCalls.length
      : 0;

    // Calculate p95 response time
    const sortedResponseTimes = apiCalls.map(a => a.responseTimeMs).sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p95ResponseTime = sortedResponseTimes[p95Index] || 0;

    // Error metrics
    const errorsBySource: Record<string, number> = {};
    errors.forEach(e => {
      errorsBySource[e.source] = (errorsBySource[e.source] || 0) + 1;
    });

    return {
      arena: {
        totalTrades: trades.length,
        successfulTrades: successfulTrades.length,
        failedTrades: trades.length - successfulTrades.length,
        successRate: trades.length > 0
          ? Math.round((successfulTrades.length / trades.length) * 1000) / 10
          : 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
        avgTradeTime: Math.round(avgTradeTime),
        tradesPerMinute: Math.round((trades.length / windowMinutes) * 10) / 10,
      },
      oracle: {
        totalPredictions: predictions.length,
        earlyBirdPredictions: earlyBirdPredictions.length,
        avgResponseTime: Math.round(avgPredictionResponseTime),
        predictionsPerMinute: Math.round((predictions.length / windowMinutes) * 10) / 10,
      },
      api: {
        totalRequests: apiCalls.length,
        successfulRequests: successfulAPICalls.length,
        errorRate: apiCalls.length > 0
          ? Math.round(((apiCalls.length - successfulAPICalls.length) / apiCalls.length) * 1000) / 10
          : 0,
        avgResponseTime: Math.round(avgAPIResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
      },
      errors: {
        total: errors.length,
        bySource: errorsBySource,
        recentErrors: errors.slice(-10), // Last 10 errors
      },
      uptime: {
        startTime: this.startTime,
        uptimeMs,
        uptimeFormatted: this.formatUptime(uptimeMs),
      },
    };
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  onAlert(callback: (alert: AlertMessage) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) this.alertCallbacks.splice(index, 1);
    };
  }

  private triggerAlert(alert: AlertMessage): void {
    console.warn(`[Monitoring ALERT] [${alert.type.toUpperCase()}] ${alert.message}`);
    this.alertCallbacks.forEach(cb => cb(alert));
  }

  private checkTradeAlerts(trade: TradeMetric): void {
    // Check for failed trade
    if (!trade.success) {
      this.triggerAlert({
        type: 'warning',
        source: 'arena',
        message: `Trade failed: ${trade.agentId} ${trade.symbol}`,
        data: trade,
      });
    }

    // Check for large loss
    if (trade.profitLoss < -100) {
      this.triggerAlert({
        type: 'critical',
        source: 'arena',
        message: `Large loss detected: ${trade.agentId} lost $${Math.abs(trade.profitLoss).toFixed(2)}`,
        data: trade,
      });
    }

    // Check overall success rate
    const recentTrades = this.getTradeMetrics(15 * 60 * 1000); // Last 15 min
    if (recentTrades.length >= 5) {
      const successRate = recentTrades.filter(t => t.success).length / recentTrades.length * 100;
      if (successRate < this.ALERT_THRESHOLDS.tradeSuccessRatePercent) {
        this.triggerAlert({
          type: 'warning',
          source: 'arena',
          message: `Low trade success rate: ${successRate.toFixed(1)}% in last 15 minutes`,
          data: { successRate, tradeCount: recentTrades.length },
        });
      }
    }
  }

  private checkErrorRateAlerts(): void {
    const recentAPICalls = this.getAPIMetrics(5 * 60 * 1000); // Last 5 min
    if (recentAPICalls.length >= 10) {
      const errorRate = recentAPICalls.filter(a => a.statusCode >= 400).length / recentAPICalls.length * 100;
      if (errorRate > this.ALERT_THRESHOLDS.errorRatePercent) {
        this.triggerAlert({
          type: 'critical',
          source: 'api',
          message: `High API error rate: ${errorRate.toFixed(1)}% in last 5 minutes`,
          data: { errorRate, requestCount: recentAPICalls.length },
        });
      }
    }
  }

  // ============================================================================
  // P&L DISCREPANCY TRACKING
  // ============================================================================

  checkPnLDiscrepancy(agentId: string, recordedPnL: number, calculatedPnL: number): void {
    const discrepancy = Math.abs(recordedPnL - calculatedPnL);

    if (discrepancy > this.ALERT_THRESHOLDS.pnlDiscrepancyUsd) {
      this.triggerAlert({
        type: 'critical',
        source: 'arena',
        message: `P&L discrepancy detected for ${agentId}: Recorded $${recordedPnL.toFixed(2)} vs Calculated $${calculatedPnL.toFixed(2)} (diff: $${discrepancy.toFixed(2)})`,
        data: { agentId, recordedPnL, calculatedPnL, discrepancy },
      });

      this.trackError({
        source: 'arena',
        error: `P&L discrepancy: $${discrepancy.toFixed(2)}`,
        context: { agentId, recordedPnL, calculatedPnL },
      });
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private trimMetrics<T extends { timestamp: number }>(metrics: T[]): void {
    // Keep only recent metrics within retention period
    const cutoff = Date.now() - this.METRICS_RETENTION_MS;
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoff);

    // Also limit total count
    if (recentMetrics.length > this.MAX_METRICS_STORED) {
      recentMetrics.splice(0, recentMetrics.length - this.MAX_METRICS_STORED);
    }

    metrics.length = 0;
    metrics.push(...recentMetrics);
  }

  private cleanupOldMetrics(): void {
    const beforeCount = this.trades.length + this.predictions.length + this.apiCalls.length + this.errors.length;

    this.trimMetrics(this.trades);
    this.trimMetrics(this.predictions);
    this.trimMetrics(this.apiCalls);
    this.trimMetrics(this.errors);

    const afterCount = this.trades.length + this.predictions.length + this.apiCalls.length + this.errors.length;

    if (beforeCount !== afterCount) {
      console.log(`[Monitoring] Cleaned up ${beforeCount - afterCount} old metrics`);
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  }

  // ============================================================================
  // CONSOLE DASHBOARD
  // ============================================================================

  printDashboard(): void {
    const metrics = this.getMetrics(60 * 60 * 1000); // Last hour

    console.log('\n' + '═'.repeat(60));
    console.log('📊 QUANTUMX MONITORING DASHBOARD');
    console.log('═'.repeat(60));

    console.log('\n🎪 ARENA TRADING');
    console.log(`   Trades: ${metrics.arena.totalTrades} (${metrics.arena.successfulTrades} successful)`);
    console.log(`   Success Rate: ${metrics.arena.successRate}%`);
    console.log(`   Total P&L: $${metrics.arena.totalPnL}`);
    console.log(`   Avg Trade Time: ${metrics.arena.avgTradeTime}ms`);
    console.log(`   Trades/min: ${metrics.arena.tradesPerMinute}`);

    console.log('\n🔮 ORACLE PREDICTIONS');
    console.log(`   Predictions: ${metrics.oracle.totalPredictions}`);
    console.log(`   Early Birds: ${metrics.oracle.earlyBirdPredictions}`);
    console.log(`   Avg Response: ${metrics.oracle.avgResponseTime}ms`);
    console.log(`   Predictions/min: ${metrics.oracle.predictionsPerMinute}`);

    console.log('\n🌐 API HEALTH');
    console.log(`   Requests: ${metrics.api.totalRequests}`);
    console.log(`   Error Rate: ${metrics.api.errorRate}%`);
    console.log(`   Avg Response: ${metrics.api.avgResponseTime}ms`);
    console.log(`   P95 Response: ${metrics.api.p95ResponseTime}ms`);

    console.log('\n⚠️ ERRORS');
    console.log(`   Total: ${metrics.errors.total}`);
    Object.entries(metrics.errors.bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });

    console.log('\n⏱️ UPTIME');
    console.log(`   Started: ${new Date(metrics.uptime.startTime).toISOString()}`);
    console.log(`   Uptime: ${metrics.uptime.uptimeFormatted}`);

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  // ============================================================================
  // EXPORT FOR EXTERNAL MONITORING
  // ============================================================================

  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics(60 * 60 * 1000);

    const lines = [
      '# HELP quantumx_arena_trades_total Total number of trades',
      '# TYPE quantumx_arena_trades_total counter',
      `quantumx_arena_trades_total ${metrics.arena.totalTrades}`,
      '',
      '# HELP quantumx_arena_trade_success_rate Trade success rate percentage',
      '# TYPE quantumx_arena_trade_success_rate gauge',
      `quantumx_arena_trade_success_rate ${metrics.arena.successRate}`,
      '',
      '# HELP quantumx_arena_pnl_total Total P&L in USD',
      '# TYPE quantumx_arena_pnl_total gauge',
      `quantumx_arena_pnl_total ${metrics.arena.totalPnL}`,
      '',
      '# HELP quantumx_oracle_predictions_total Total predictions',
      '# TYPE quantumx_oracle_predictions_total counter',
      `quantumx_oracle_predictions_total ${metrics.oracle.totalPredictions}`,
      '',
      '# HELP quantumx_api_requests_total Total API requests',
      '# TYPE quantumx_api_requests_total counter',
      `quantumx_api_requests_total ${metrics.api.totalRequests}`,
      '',
      '# HELP quantumx_api_error_rate API error rate percentage',
      '# TYPE quantumx_api_error_rate gauge',
      `quantumx_api_error_rate ${metrics.api.errorRate}`,
      '',
      '# HELP quantumx_api_response_time_ms Average API response time',
      '# TYPE quantumx_api_response_time_ms gauge',
      `quantumx_api_response_time_ms ${metrics.api.avgResponseTime}`,
      '',
      '# HELP quantumx_errors_total Total errors',
      '# TYPE quantumx_errors_total counter',
      `quantumx_errors_total ${metrics.errors.total}`,
      '',
      '# HELP quantumx_uptime_seconds Service uptime in seconds',
      '# TYPE quantumx_uptime_seconds counter',
      `quantumx_uptime_seconds ${Math.floor(metrics.uptime.uptimeMs / 1000)}`,
    ];

    return lines.join('\n');
  }
}

interface AlertMessage {
  type: 'info' | 'warning' | 'critical';
  source: 'arena' | 'oracle' | 'api' | 'system';
  message: string;
  data?: any;
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).monitoringService = monitoringService;
}

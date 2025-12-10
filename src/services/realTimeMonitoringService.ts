/**
 * REAL-TIME MONITORING SERVICE
 * Orchestrates the IGX Hybrid System V4
 *
 * COMPONENTS:
 * - IGX Data Pipeline V4: Full multi-exchange data (9 exchanges)
 * - IGX Alpha Model: Dynamic threshold adjustment for 25%+ monthly profit
 * - IGX Beta Model: ML-powered strategy engine (10 parallel strategies)
 * - IGX Quality Checker: Adaptive quality gates
 * - System Health Monitoring: Tracks performance and profitability
 */

import { igxSystem } from './igx/IGXSystemOrchestrator';
import { persistentStatsManager } from './persistentStatsManager';
import { ohlcDataManager } from './ohlcDataManager';

export interface MonitoringConfig {
  coinGeckoIds: string[];
  enableHealthMonitoring?: boolean;
  healthMonitoringInterval?: number; // milliseconds
}

export interface MonitoringStatus {
  isRunning: boolean;
  startTime: number | null;
  monitoredCoins: string[];
  stats: {
    igxSystem: any;
  };
}

export class RealTimeMonitoringService {
  private isRunning = false;
  private startTime: number | null = null;
  private monitoredCoins: string[] = [];
  private healthMonitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Start real-time monitoring with adaptive scanning
   */
  async start(config: MonitoringConfig) {
    if (this.isRunning) {
      console.log('[RealTimeMonitoring] Already running');
      return;
    }

    console.log('\n========================================');
    console.log('🚀 STARTING IGX HYBRID SYSTEM V4');
    console.log('========================================');
    console.log(`Coins: ${config.coinGeckoIds.length}`);
    console.log(`Target: 25%+ Monthly Profitability`);
    console.log(`Data: 9 Exchanges (Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Gemini, Bitfinex, Huobi)`);
    console.log(`Architecture: 4-Engine Hybrid Model`);
    console.log(`- IGX Data Pipeline: Multi-exchange aggregation`);
    console.log(`- IGX Alpha: Dynamic threshold planning`);
    console.log(`- IGX Beta: 10 parallel strategies with ML`);
    console.log(`- IGX Quality: Adaptive quality gates`);
    console.log('========================================\n');

    this.isRunning = true;
    this.startTime = Date.now();
    this.monitoredCoins = config.coinGeckoIds;

    // CRITICAL: Initialize OHLC data FIRST (strategies need historical candles)
    console.log('[RealTimeMonitoring] 🕯️ Initializing OHLC data manager...');
    await ohlcDataManager.initializeCoins(config.coinGeckoIds);
    const ohlcStats = ohlcDataManager.getStats();
    console.log(`[RealTimeMonitoring] ✅ OHLC initialized: ${ohlcStats.coinsWithData}/${ohlcStats.totalCoins} coins have data`);
    console.log(`[RealTimeMonitoring]    Candles per coin: avg ${ohlcStats.avgCandlesPerCoin.toFixed(0)}, min ${ohlcStats.minCandles}, max ${ohlcStats.maxCandles}\n`);

    // ✅ CRITICAL: Start Data Engine V4 for real-time market prices
    // This provides consistent price data for Arena and mock trading
    console.log('[RealTimeMonitoring] 📊 Starting Data Engine V4 for real-time prices...');
    const { multiExchangeAggregatorV4 } = await import('./dataStreams/multiExchangeAggregatorV4');
    multiExchangeAggregatorV4.start(config.coinGeckoIds, (ticker) => {
      // Data is cached in aggregator for retrieval by mockTradingService
      // Log only first few updates to avoid spam
      if (Math.random() < 0.001) { // Log 0.1% of updates
        console.log(`[Data Engine] Price: ${ticker.symbol} @ $${ticker.price.toFixed(2)}`);
      }
    });
    console.log('[RealTimeMonitoring] ✅ Data Engine V4 started - real-time prices available\n');

    // Start IGX Hybrid System
    // Note: IGX system internally manages all 4 engines
    await igxSystem.start();

    // Start health monitoring if enabled
    if (config.enableHealthMonitoring !== false) {
      this.startHealthMonitoring(config.healthMonitoringInterval || 30000);
    }

    console.log('[RealTimeMonitoring] ✅ System started successfully\n');
  }

  /**
   * Start health monitoring (emits stats events)
   */
  private startHealthMonitoring(interval: number) {
    console.log(`[RealTimeMonitoring] Starting health monitoring (${interval}ms interval)`);

    this.healthMonitoringInterval = setInterval(() => {
      try {
        // Get IGX system stats
        const systemStatus = igxSystem.getSystemStatus();

        // Calculate uptime
        const uptimeSeconds = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);

        // Log summary
        console.log('\n[RealTimeMonitoring] ========== IGX SYSTEM HEALTH CHECK ==========');
        console.log(`⏱️  Uptime: ${uptimeMinutes} minutes`);
        console.log(`📊 Status: ${systemStatus.status}`);
        console.log(`🔌 Exchanges Connected: ${systemStatus.health.exchangesConnected}/9`);
        console.log(`✨ Data Quality: ${systemStatus.health.dataQuality}/100`);
        console.log(`⚡ Latency: ${systemStatus.health.latency.toFixed(0)}ms`);
        console.log('\n💰 PERFORMANCE:');
        console.log(`  Monthly Profit: ${systemStatus.performance.monthlyProfit}`);
        console.log(`  Target: ${systemStatus.performance.targetProfit}`);
        console.log(`  Win Rate: ${systemStatus.performance.winRate}`);
        console.log(`  Total Signals: ${systemStatus.performance.totalSignals}`);
        console.log(`  Active Positions: ${systemStatus.performance.activePositions}`);
        console.log(`  Today's Signals: ${systemStatus.performance.todaySignals}`);
        console.log('\n🔧 COMPONENTS:');
        console.log(`  Data Pipeline: ${systemStatus.components.dataPipeline ? '✅' : '❌'}`);
        console.log(`  Alpha Model: ${systemStatus.components.alphaModel ? '✅' : '❌'}`);
        console.log(`  Beta Model: ${systemStatus.components.betaModel ? '✅' : '❌'}`);
        console.log(`  Quality Checker: ${systemStatus.components.qualityChecker ? '✅' : '❌'}`);
        console.log('===========================================================\n');

        // Emit health event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('igx-monitoring-health', {
            detail: {
              uptime: uptimeSeconds,
              systemStatus,
              timestamp: Date.now()
            }
          }));
        }

      } catch (error) {
        console.error('[RealTimeMonitoring] Health check error:', error);
      }
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      console.log('[RealTimeMonitoring] Not running');
      return;
    }

    console.log('\n[RealTimeMonitoring] Stopping IGX system...');

    // Stop IGX hybrid system (which internally stops all engines)
    igxSystem.stop();

    // Stop health monitoring
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = null;
    }

    this.isRunning = false;
    this.startTime = null;
    this.monitoredCoins = [];

    console.log('[RealTimeMonitoring] ✅ IGX system stopped\n');
  }

  /**
   * Get current status
   */
  getStatus(): MonitoringStatus {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      monitoredCoins: this.monitoredCoins,
      stats: {
        igxSystem: this.isRunning ? igxSystem.getSystemStatus() : null
      }
    };
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }
}

// Singleton instance
export const realTimeMonitoringService = new RealTimeMonitoringService();

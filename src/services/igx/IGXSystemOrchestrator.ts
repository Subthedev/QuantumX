/**
 * IGX SYSTEM ORCHESTRATOR
 * Master controller that connects and coordinates all IGX components
 *
 * COMPONENTS:
 * 1. IGX Data Engine V4 - Adaptive real-time data collection with WebSocket + REST fallback
 * 2. IGX Alpha Model - Dynamic threshold adjustment for 25%+ monthly profit
 * 3. IGX Beta Model - Strategy matching and signal generation
 * 4. IGX Quality Checker - Dynamic quality gates
 *
 * FEATURES:
 * - Automatic component initialization
 * - Real-time performance monitoring
 * - Profit tracking and transparency
 * - Health checks and error recovery
 */

// Use Data Engine V4 for production-grade data collection with adaptive intelligence
import { igxDataEngineV4 as igxDataPipeline } from './IGXDataEngineV4';
import { igxAlphaModel } from './IGXAlphaModel';
import { igxBetaModel } from './IGXBetaModel';
import { igxQualityChecker } from './IGXQualityChecker';
import type { IGXSignal } from './IGXBetaModel';

export interface IGXSystemStatus {
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  startTime: number | null;
  uptime: number; // seconds
  components: {
    dataPipeline: boolean;
    alphaModel: boolean;
    betaModel: boolean;
    qualityChecker: boolean;
  };
  performance: {
    monthlyProfit: string;
    targetProfit: string;
    winRate: string;
    totalSignals: number;
    activePositions: number;
    todaySignals: number;
  };
  health: {
    dataQuality: number;
    exchangesConnected: number;
    latency: number;
    errors: number;
  };
}

export interface SignalRecord {
  signal: IGXSignal;
  executedAt: number;
  status: 'ACTIVE' | 'CLOSED' | 'STOPPED';
  outcome?: {
    profit: number;
    success: boolean;
    closedAt: number;
    actualProfit: number;
  };
}

export class IGXSystemOrchestrator {
  private isRunning = false;
  private startTime: number | null = null;
  private signals: Map<string, SignalRecord> = new Map();
  private dailySignals: Map<string, number> = new Map(); // date -> count

  // Performance tracking
  private totalProfit = 0;
  private totalTrades = 0;
  private successfulTrades = 0;

  // Health monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private alphaAdjustmentInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly MONITORED_SYMBOLS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'AVAX', 'SHIB',
    'MATIC', 'LTC', 'UNI', 'ATOM', 'LINK', 'ETC', 'XLM', 'BCH', 'ALGO', 'VET',
    'FIL', 'ICP', 'MANA', 'SAND', 'AXS', 'THETA', 'FTM', 'HBAR', 'NEAR', 'GRT',
    'ENJ', 'CHZ', 'SUSHI', 'YFI', 'AAVE', 'COMP', 'SNX', 'CRV', 'MKR', 'INJ'
  ];

  /**
   * Start the IGX System
   */
  async start() {
    if (this.isRunning) {
      console.log('[IGX System] Already running');
      return;
    }

    console.log('\n🚀 ================================================');
    console.log('         STARTING IGX HYBRID SYSTEM V4           ');
    console.log('================================================');
    console.log('🎯 Target: 25%+ Monthly Profitability');
    console.log('📊 Architecture: 4-Engine Hybrid Model');
    console.log('🔬 Mode: Adaptive Quality/Frequency Balance');
    console.log('📈 Transparency: 100% Trade Visibility');
    console.log('📡 Data Sources: 8+ exchanges (Binance, CoinGecko, CoinCap, KuCoin, etc.)');
    console.log('================================================\n');

    this.isRunning = true;
    this.startTime = Date.now();

    try {
      // Start all components in sequence
      await this.startDataPipeline();
      await this.startAlphaModel();
      await this.startBetaModel();
      await this.startQualityChecker();

      // Setup event listeners
      this.setupEventListeners();

      // Start monitoring
      this.startHealthMonitoring();
      this.startAlphaAdjustments();

      console.log('\n✅ IGX SYSTEM FULLY OPERATIONAL\n');
      console.log('📊 Monitoring', this.MONITORED_SYMBOLS.length, 'symbols');
      console.log('🔄 Data from 8+ exchanges (multi-source aggregation)');
      console.log('🧠 10 strategies running in parallel');
      console.log('✨ Dynamic thresholds for optimal performance');
      console.log('💡 Signals will start generating within 30-60 seconds');
      console.log('================================================\n');

    } catch (error) {
      console.error('[IGX System] Startup error:', error);
      this.stop();
      throw error;
    }
  }

  /**
   * Start Data Pipeline
   */
  private async startDataPipeline() {
    console.log('[IGX System] Starting Data Pipeline V4...');
    await igxDataPipeline.start(this.MONITORED_SYMBOLS);
    console.log('[IGX System] ✅ Data Pipeline started');
  }

  /**
   * Start Alpha Model
   */
  private async startAlphaModel() {
    console.log('[IGX System] Starting Alpha Model...');
    // Alpha model is self-starting
    console.log('[IGX System] ✅ Alpha Model started');
  }

  /**
   * Start Beta Model
   */
  private async startBetaModel() {
    console.log('[IGX System] Starting Beta Model...');
    igxBetaModel.start();
    console.log('[IGX System] ✅ Beta Model started');
  }

  /**
   * Start Quality Checker
   */
  private async startQualityChecker() {
    console.log('[IGX System] Starting Quality Checker...');
    igxQualityChecker.start();
    console.log('[IGX System] ✅ Quality Checker started');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Listen for approved signals
      window.addEventListener('igx-signal-approved', this.handleApprovedSignal.bind(this));
    }
  }

  /**
   * Handle approved signal
   */
  private handleApprovedSignal(event: CustomEvent) {
    const signal: IGXSignal = event.detail;

    // Record signal
    const record: SignalRecord = {
      signal,
      executedAt: Date.now(),
      status: 'ACTIVE'
    };

    this.signals.set(signal.id, record);

    // Update daily count
    const today = new Date().toISOString().split('T')[0];
    const todayCount = this.dailySignals.get(today) || 0;
    this.dailySignals.set(today, todayCount + 1);

    // Log signal
    this.logSignal(signal);

    // Simulate execution (in production, would send to exchange)
    this.simulateExecution(signal);

    // Emit for UI
    this.emitSignalForUI(signal);
  }

  /**
   * Log signal details
   */
  private logSignal(signal: IGXSignal) {
    console.log('\n💎 ========================================');
    console.log('        IGX SIGNAL GENERATED              ');
    console.log('==========================================');
    console.log(`📊 ${signal.symbol} ${signal.direction}`);
    console.log(`💰 Entry: $${signal.entryPrice.toFixed(2)}`);
    console.log(`🛡️ Stop: $${signal.stopLoss.toFixed(2)}`);
    console.log(`🎯 Target: $${signal.targets[0].toFixed(2)}`);
    console.log(`📈 R:R: ${signal.riskRewardRatio.toFixed(2)}:1`);
    console.log(`✨ Quality: ${signal.qualityScore}/100`);
    console.log(`🧠 Strategy: ${signal.winningStrategy}`);
    console.log(`📊 Expected Profit: ${signal.expectedProfit.toFixed(2)}%`);
    console.log('==========================================\n');
  }

  /**
   * Simulate signal execution (for testing)
   */
  private simulateExecution(signal: IGXSignal) {
    // Simulate random outcome after some time
    const executionTime = 1000 * 60 * Math.random() * 60; // Random 0-60 minutes

    setTimeout(() => {
      this.simulateOutcome(signal);
    }, executionTime);
  }

  /**
   * Simulate trade outcome (for testing)
   */
  private simulateOutcome(signal: IGXSignal) {
    const record = this.signals.get(signal.id);
    if (!record || record.status !== 'ACTIVE') return;

    // Simulate outcome based on expected profit and randomness
    const successProbability = signal.confidence / 100;
    const success = Math.random() < successProbability;

    let actualProfit: number;
    if (success) {
      // Hit target with some variance
      actualProfit = signal.expectedProfit * (0.8 + Math.random() * 0.4); // 80-120% of expected
      this.successfulTrades++;
    } else {
      // Hit stop loss
      const risk = Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice;
      actualProfit = -risk * 100; // Negative percentage
    }

    // Update record
    record.status = 'CLOSED';
    record.outcome = {
      profit: actualProfit,
      success,
      closedAt: Date.now(),
      actualProfit
    };

    // Update performance
    this.totalTrades++;
    this.totalProfit += actualProfit;

    // Update Alpha model
    igxAlphaModel.recordTradeOutcome(
      signal.symbol,
      actualProfit * 1000, // Convert to dollar amount
      success,
      signal.winningStrategy
    );

    // Update Beta model
    igxBetaModel.updateStrategyPerformance(
      signal.winningStrategy,
      success,
      actualProfit
    );

    // Close position in quality checker
    igxQualityChecker.closePosition(signal.id);

    console.log(`[IGX System] Trade closed: ${signal.symbol} ${success ? '✅' : '❌'} ${actualProfit.toFixed(2)}%`);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check
   */
  private performHealthCheck() {
    const status = this.getSystemStatus();

    // Check for issues
    if (status.health.dataQuality < 50) {
      console.warn('[IGX System] ⚠️ Low data quality:', status.health.dataQuality);
    }

    if (status.health.exchangesConnected < 3) {
      console.warn('[IGX System] ⚠️ Few exchanges connected:', status.health.exchangesConnected);
    }

    // Emit health event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-health-update', {
        detail: status
      }));
    }
  }

  /**
   * Start Alpha model adjustments
   */
  private startAlphaAdjustments() {
    // Run Alpha adjustments every hour
    this.alphaAdjustmentInterval = setInterval(() => {
      const decision = igxAlphaModel.analyzeAndAdjust();

      if (decision.decision === 'ADJUST_THRESHOLDS') {
        console.log('[IGX System] 📊 Alpha adjusted thresholds:', decision.newThresholds);
      }
    }, 60 * 60 * 1000); // Every hour

    // Run initial adjustment
    igxAlphaModel.analyzeAndAdjust();
  }

  /**
   * Emit signal for UI
   */
  private emitSignalForUI(signal: IGXSignal) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-new-signal', {
        detail: {
          signal,
          performance: this.getPerformance()
        }
      }));
    }
  }

  /**
   * Get current performance
   */
  private getPerformance() {
    const winRate = this.totalTrades > 0 ?
      (this.successfulTrades / this.totalTrades) * 100 : 0;

    const monthlyProfit = this.totalProfit; // Simplified

    return {
      monthlyProfit: `${monthlyProfit.toFixed(2)}%`,
      winRate: `${winRate.toFixed(1)}%`,
      totalTrades: this.totalTrades,
      successfulTrades: this.successfulTrades,
      activeSignals: Array.from(this.signals.values())
        .filter(r => r.status === 'ACTIVE').length
    };
  }

  /**
   * Get system status
   */
  getSystemStatus(): IGXSystemStatus {
    const uptime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const today = new Date().toISOString().split('T')[0];

    // Get component stats
    const pipelineStats = igxDataPipeline.getStats();
    const alphaStats = igxAlphaModel.getStats();
    const betaStats = igxBetaModel.getStats();
    const qualityStats = igxQualityChecker.getStats();

    return {
      status: this.isRunning ? 'RUNNING' : 'STOPPED',
      startTime: this.startTime,
      uptime,
      components: {
        dataPipeline: pipelineStats.exchangesConnected > 0,
        alphaModel: true,
        betaModel: true,
        qualityChecker: true
      },
      performance: {
        monthlyProfit: alphaStats.monthlyProfit,
        targetProfit: alphaStats.targetProfit,
        winRate: alphaStats.winRate,
        totalSignals: this.signals.size,
        activePositions: Array.from(this.signals.values())
          .filter(r => r.status === 'ACTIVE').length,
        todaySignals: this.dailySignals.get(today) || 0
      },
      health: {
        dataQuality: pipelineStats.dataQuality,
        exchangesConnected: pipelineStats.exchangesConnected,
        latency: pipelineStats.averageLatency,
        errors: pipelineStats.errors
      }
    };
  }

  /**
   * Get all signals
   */
  getSignals(): SignalRecord[] {
    return Array.from(this.signals.values())
      .sort((a, b) => b.executedAt - a.executedAt);
  }

  /**
   * Get active signals
   */
  getActiveSignals(): SignalRecord[] {
    return Array.from(this.signals.values())
      .filter(r => r.status === 'ACTIVE')
      .sort((a, b) => b.executedAt - a.executedAt);
  }

  /**
   * Stop the system
   */
  stop() {
    console.log('\n[IGX System] Shutting down...');

    this.isRunning = false;

    // Stop components
    igxDataPipeline.stop();
    igxBetaModel.stop();
    igxQualityChecker.stop();

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.alphaAdjustmentInterval) {
      clearInterval(this.alphaAdjustmentInterval);
    }

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('igx-signal-approved', this.handleApprovedSignal.bind(this));
    }

    console.log('[IGX System] ✅ Shutdown complete\n');
  }
}

// Singleton instance
export const igxSystem = new IGXSystemOrchestrator();
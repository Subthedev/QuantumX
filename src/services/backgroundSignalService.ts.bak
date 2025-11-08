/**
 * BACKGROUND SIGNAL SERVICE - 24/7 AUTONOMOUS OPERATION
 *
 * CRITICAL: This service runs independently of React components
 * - Starts automatically on server boot
 * - Runs continuously 24/7
 * - Persists signals to Supabase
 * - Survives page navigation/refresh
 *
 * ARCHITECTURE:
 * - Singleton pattern ensures single instance
 * - Auto-start on import (runs when app loads)
 * - Saves signals to database for persistence
 * - Frontend reads signals from database (not memory)
 */

import { multiExchangeAggregator } from './dataStreams/multiExchangeAggregator';
import { realTimeSignalEngineV3 } from './realTimeSignalEngineV3';
import { ohlcDataManager } from './ohlcDataManager';
import { getStrategicCoins } from './strategicCoinSelection';
import { persistentStatsManager } from './persistentStatsManager';
import { preComputationPipeline } from './cache/PreComputationPipeline';
import { signalOutcomeTracker } from './strategies/SignalOutcomeTracker';
import { supabase } from '@/integrations/supabase/client';
import type { CanonicalTicker } from './dataStreams/canonicalDataTypes';

export interface BackgroundServiceStatus {
  isRunning: boolean;
  startTime: number | null;
  uptimeSeconds: number;
  coinsMonitored: number;
  signalsGenerated: number;
  lastSignalTime: number | null;
  lastHealthCheck: number | null;
  errors: string[];
}

class BackgroundSignalService {
  private static instance: BackgroundSignalService;
  private isRunning = false;
  private startTime: number | null = null;
  private signalsGenerated = 0;
  private lastSignalTime: number | null = null;
  private lastHealthCheck: number | null = null;
  private errors: string[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private signalCheckInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 30000; // 30 seconds

  private constructor() {
    console.log('[BackgroundService] 🚀 Instance created');
  }

  static getInstance(): BackgroundSignalService {
    if (!BackgroundSignalService.instance) {
      BackgroundSignalService.instance = new BackgroundSignalService();
    }
    return BackgroundSignalService.instance;
  }

  /**
   * Start the background service
   * This runs 24/7 independently of React components
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[BackgroundService] ⚠️ Already running');
      return;
    }

    try {
      console.log('\n');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║     IGX BACKGROUND SIGNAL SERVICE - 24/7 OPERATION          ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log('║  🎯 Mission: Generate 1+ signals/hour                       ║');
      console.log('║  📊 Monitoring: 50 strategic coins                          ║');
      console.log('║  ⚡ Architecture: 3-tier adaptive scanning                  ║');
      console.log('║  💾 Persistence: Signals saved to Supabase                  ║');
      console.log('║  🔄 Operation: Continuous 24/7 (page-independent)           ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('\n');

      this.isRunning = true;
      this.startTime = Date.now();

      // Get strategic coin selection (50 coins)
      const strategicCoins = getStrategicCoins();
      console.log(`[BackgroundService] 📋 Loading ${strategicCoins.length} strategic coins...`);

      // Initialize OHLC data manager FIRST
      console.log('[BackgroundService] 🕯️ Fetching historical OHLC data...');
      await ohlcDataManager.initializeCoins(strategicCoins);

      const ohlcStats = ohlcDataManager.getStats();
      console.log(`[BackgroundService] ✅ OHLC Ready: ${ohlcStats.coinsWithData}/${ohlcStats.totalCoins} coins`);
      console.log(`[BackgroundService]    Candles: avg ${ohlcStats.avgCandlesPerCoin.toFixed(0)}, min ${ohlcStats.minCandles}, max ${ohlcStats.maxCandles}`);

      // Start pre-computation pipeline for hot coins
      console.log('[BackgroundService] 🚀 Starting indicator pre-computation pipeline...');
      preComputationPipeline.start();

      // Start signal outcome tracking for reputation management
      console.log('[BackgroundService] 📊 Starting signal outcome tracker...');
      await signalOutcomeTracker.start();

      // Start multi-exchange data aggregator
      console.log('[BackgroundService] 🌐 Starting WebSocket connections...');
      multiExchangeAggregator.start(strategicCoins, (ticker: CanonicalTicker) => {
        // Process every tick through V3 engine
        try {
          realTimeSignalEngineV3.processTick(ticker);
        } catch (error) {
          console.error('[BackgroundService] Error processing tick:', error);
          this.errors.push(`Tick error: ${error}`);
        }
      });

      // Listen for signal generation events
      this.setupSignalListener();

      // Start health monitoring (every 60 seconds)
      this.startHealthMonitoring();

      // Start signal generation check (every 30 minutes)
      this.startSignalCheck();

      console.log('[BackgroundService] ✅ Service started successfully!');
      console.log('[BackgroundService] 📡 Monitoring markets 24/7...\n');

    } catch (error) {
      console.error('[BackgroundService] ❌ Startup failed:', error);
      this.errors.push(`Startup error: ${error}`);
      this.isRunning = false;

      // Auto-retry on failure
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`[BackgroundService] 🔄 Retrying in 30 seconds... (attempt ${this.retryCount}/${this.MAX_RETRIES})`);
        setTimeout(() => this.start(), this.RETRY_DELAY);
      }
    }
  }

  /**
   * Setup listener for signal generation events
   */
  private setupSignalListener(): void {
    if (typeof window !== 'undefined') {
      const handleSignal = async (event: any) => {
        const signal = event.detail;
        console.log(`[BackgroundService] 🎯 NEW SIGNAL: ${signal.symbol} ${signal.signal} (${signal.confidence}% confidence)`);

        this.signalsGenerated++;
        this.lastSignalTime = Date.now();

        // Record in persistent stats
        persistentStatsManager.recordSignal();

        // Save to database for persistence
        try {
          await this.saveSignalToDatabase(signal);
        } catch (error) {
          console.error('[BackgroundService] Failed to save signal:', error);
          this.errors.push(`DB save error: ${error}`);
        }
      };

      window.addEventListener('igx-signal-generated', handleSignal);
    }
  }

  /**
   * Save signal to Supabase database
   */
  private async saveSignalToDatabase(signal: any): Promise<void> {
    try {
      // Calculate expiry (4 hours from now)
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('intelligence_signals')
        .insert({
          symbol: signal.symbol || 'BTC',
          signal_type: signal.signal || 'LONG',
          entry: signal.entry,
          stop_loss: signal.stopLoss,
          take_profit_1: signal.takeProfit1,
          take_profit_2: signal.takeProfit2,
          take_profit_3: signal.takeProfit3,
          confidence: signal.confidence,
          risk_reward_ratio: signal.riskRewardRatio,
          strategy_name: signal.strategyName,
          trigger_reason: signal.triggerReason,
          market_conditions: signal.marketConditions || {},
          technical_indicators: signal.technicalIndicators || {},
          status: 'ACTIVE',
          expires_at: expiresAt
        });

      if (error) throw error;
      console.log(`[BackgroundService] 💾 Signal saved to database: ${signal.symbol}`);

    } catch (error) {
      console.error('[BackgroundService] Database save failed:', error);
      throw error;
    }
  }

  /**
   * Health monitoring - logs stats every minute
   */
  private startHealthMonitoring(): void {
    console.log('[BackgroundService] 🏥 Starting health monitoring (60s interval)');

    this.healthCheckInterval = setInterval(() => {
      this.lastHealthCheck = Date.now();
      const uptime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
      const uptimeHours = (uptime / 3600).toFixed(1);
      const signalsPerHour = uptime > 0 ? (this.signalsGenerated / (uptime / 3600)).toFixed(2) : '0';

      console.log('\n[BackgroundService] ========== HEALTH CHECK ==========');
      console.log(`⏱️  Uptime: ${uptimeHours} hours`);
      console.log(`📊 Signals Generated: ${this.signalsGenerated}`);
      console.log(`📈 Signals/Hour: ${signalsPerHour}`);
      console.log(`⏰ Last Signal: ${this.lastSignalTime ? new Date(this.lastSignalTime).toLocaleTimeString() : 'None yet'}`);

      const engineStats = realTimeSignalEngineV3.getCombinedStats();
      console.log(`🎯 Triggers Evaluated: ${engineStats.engine.triggersEvaluated}`);
      console.log(`✅ Signals Accepted: ${engineStats.engine.signalsGenerated}`);
      console.log(`❌ Signals Rejected: ${engineStats.engine.signalsRejected}`);

      const dataStats = multiExchangeAggregator.getStats();
      console.log(`📡 Data Sources: ${dataStats.activeSources.join(', ')}`);
      console.log(`📊 Total Data Points: ${dataStats.totalDataPoints}`);

      if (this.errors.length > 0) {
        console.log(`⚠️  Recent Errors: ${this.errors.slice(-3).join('; ')}`);
      }

      console.log('=====================================\n');
    }, 60000); // Every 60 seconds
  }

  /**
   * Check if we're meeting signal generation targets
   */
  private startSignalCheck(): void {
    console.log('[BackgroundService] 📊 Starting signal generation check (30min interval)');

    this.signalCheckInterval = setInterval(() => {
      const timeSinceLastSignal = this.lastSignalTime ? (Date.now() - this.lastSignalTime) / 1000 / 60 : Infinity;

      if (timeSinceLastSignal > 60) {
        console.log('[BackgroundService] ⚠️ WARNING: No signals generated in the last hour!');
        console.log('[BackgroundService] 🔍 Checking system health...');

        // Log diagnostic info
        const engineStats = realTimeSignalEngineV3.getCombinedStats();
        console.log(`  - Engine ticks: ${engineStats.engine.totalTicks}`);
        console.log(`  - Triggers evaluated: ${engineStats.engine.triggersEvaluated}`);
        console.log(`  - Micro anomalies: ${engineStats.engine.microAnomalies}`);

        const ohlcStats = ohlcDataManager.getStats();
        console.log(`  - OHLC coins with data: ${ohlcStats.coinsWithData}/${ohlcStats.totalCoins}`);

        const dataStats = multiExchangeAggregator.getStats();
        console.log(`  - WebSocket status: ${dataStats.activeSources.join(', ')}`);
        console.log(`  - Recent data points: ${dataStats.totalDataPoints}`);
      }
    }, 1800000); // Every 30 minutes
  }

  /**
   * Get service status
   */
  getStatus(): BackgroundServiceStatus {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptimeSeconds: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
      coinsMonitored: getStrategicCoins().length,
      signalsGenerated: this.signalsGenerated,
      lastSignalTime: this.lastSignalTime,
      lastHealthCheck: this.lastHealthCheck,
      errors: this.errors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Stop the service (for cleanup)
   */
  stop(): void {
    console.log('[BackgroundService] 🛑 Stopping service...');

    this.isRunning = false;
    multiExchangeAggregator.stop();
    preComputationPipeline.stop();
    signalOutcomeTracker.stop();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.signalCheckInterval) {
      clearInterval(this.signalCheckInterval);
      this.signalCheckInterval = null;
    }

    console.log('[BackgroundService] Stopped');
  }

  /**
   * Force restart the service
   */
  async restart(): Promise<void> {
    console.log('[BackgroundService] 🔄 Restarting service...');
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.start();
  }
}

// Export singleton instance
export const backgroundSignalService = BackgroundSignalService.getInstance();

// NOTE: Auto-start removed to prevent initialization issues
// Service is now managed by backgroundServiceManager for robust initialization
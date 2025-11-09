/**
 * PRODUCTION DATA PIPELINE MANAGER
 * Robust, fault-tolerant data pipeline for 24/7 signal generation
 *
 * FEATURES:
 * - Automatic initialization with retry logic
 * - WebSocket with fallback to HTTP polling
 * - Persistent statistics across refreshes
 * - Health monitoring and auto-recovery
 * - Memory leak prevention
 * - Browser environment detection
 *
 * ARCHITECTURE:
 * - Single entry point for all data pipeline operations
 * - Manages all sub-services (WebSockets, OHLC, Strategies)
 * - Self-healing with automatic recovery
 * - Production-grade error handling
 */

import { backgroundSignalService } from './backgroundSignalService';
import { persistentStatsManager } from './persistentStatsManager';
import { multiExchangeAggregator } from './dataStreams/multiExchangeAggregator';
import { ohlcDataManager } from './ohlcDataManager';
import { realTimeSignalEngineV3 } from './realTimeSignalEngineV3';
import { preComputationPipeline } from './cache/PreComputationPipeline';
import { signalOutcomeTracker } from './strategies/SignalOutcomeTracker';
import { getStrategicCoins } from './strategicCoinSelection';
import { cryptoDataService } from './cryptoDataService';
import type { CanonicalTicker } from './dataStreams/canonicalDataTypes';

export interface PipelineStatus {
  isRunning: boolean;
  isInitializing: boolean;
  initializationStep: string;
  dataFlowing: boolean;
  lastDataTime: number | null;
  webSocketStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'FALLBACK';
  ohlcStatus: 'READY' | 'LOADING' | 'ERROR';
  strategiesStatus: 'ACTIVE' | 'IDLE' | 'ERROR';
  signalsGenerated: number;
  errors: string[];
  healthScore: number; // 0-100
}

class ProductionDataPipeline {
  private static instance: ProductionDataPipeline;

  private status: PipelineStatus = {
    isRunning: false,
    isInitializing: false,
    initializationStep: '',
    dataFlowing: false,
    lastDataTime: null,
    webSocketStatus: 'DISCONNECTED',
    ohlcStatus: 'LOADING',
    strategiesStatus: 'IDLE',
    signalsGenerated: 0,
    errors: [],
    healthScore: 0
  };

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private dataFlowCheckInterval: NodeJS.Timeout | null = null;
  private fallbackPollingInterval: NodeJS.Timeout | null = null;
  private initializationAttempts = 0;
  private readonly MAX_INIT_ATTEMPTS = 5;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly DATA_FLOW_TIMEOUT = 60000; // 1 minute without data = problem
  private readonly FALLBACK_POLL_INTERVAL = 5000; // 5 seconds

  private constructor() {
    console.log('[ProductionPipeline] Instance created');
  }

  static getInstance(): ProductionDataPipeline {
    if (!ProductionDataPipeline.instance) {
      ProductionDataPipeline.instance = new ProductionDataPipeline();
    }
    return ProductionDataPipeline.instance;
  }

  /**
   * Initialize the entire data pipeline
   */
  async initialize(): Promise<boolean> {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          PRODUCTION DATA PIPELINE - INITIALIZATION             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Check if already running
    if (this.status.isRunning) {
      console.log('[ProductionPipeline] Already running');
      return true;
    }

    if (this.status.isInitializing) {
      console.log('[ProductionPipeline] Already initializing');
      return false;
    }

    this.status.isInitializing = true;
    this.initializationAttempts++;

    try {
      // Step 1: Load persistent stats
      await this.initializeStep('Loading persistent statistics', async () => {
        const stats = persistentStatsManager.getStats();
        console.log(`[ProductionPipeline] Loaded stats: ${stats.triggers24h} triggers, ${stats.signals24h} signals in last 24h`);
      });

      // Step 2: Get strategic coins
      await this.initializeStep('Loading strategic coins', async () => {
        const coins = getStrategicCoins();
        console.log(`[ProductionPipeline] Loaded ${coins.length} strategic coins`);
      });

      // Step 3: Initialize OHLC data
      await this.initializeStep('Fetching historical OHLC data', async () => {
        const coins = getStrategicCoins();
        await ohlcDataManager.initializeCoins(coins);
        const stats = ohlcDataManager.getStats();
        console.log(`[ProductionPipeline] OHLC ready: ${stats.coinsWithData}/${stats.totalCoins} coins`);
        this.status.ohlcStatus = 'READY';
      });

      // Step 4: Start pre-computation pipeline
      await this.initializeStep('Starting indicator pre-computation', async () => {
        preComputationPipeline.start();
        console.log('[ProductionPipeline] Pre-computation pipeline started');
      });

      // Step 5: Start signal outcome tracker
      await this.initializeStep('Starting signal outcome tracker', async () => {
        await signalOutcomeTracker.start();
        console.log('[ProductionPipeline] Outcome tracker started');
      });

      // Step 6: Start WebSocket or fallback
      await this.initializeStep('Starting data streams', async () => {
        await this.startDataStreams();
      });

      // Step 7: Start health monitoring
      await this.initializeStep('Starting health monitoring', async () => {
        this.startHealthMonitoring();
        this.startDataFlowMonitoring();
      });

      // Success!
      this.status.isRunning = true;
      this.status.isInitializing = false;
      this.status.strategiesStatus = 'ACTIVE';
      this.updateHealthScore();

      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║       ✅ PRODUCTION DATA PIPELINE - READY FOR SIGNALS         ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      return true;

    } catch (error) {
      console.error('[ProductionPipeline] Initialization failed:', error);
      this.status.errors.push(`Init failed: ${error}`);
      this.status.isInitializing = false;

      // Retry if under limit
      if (this.initializationAttempts < this.MAX_INIT_ATTEMPTS) {
        const retryDelay = this.initializationAttempts * 5000;
        console.log(`[ProductionPipeline] Retrying in ${retryDelay / 1000}s (attempt ${this.initializationAttempts}/${this.MAX_INIT_ATTEMPTS})`);
        setTimeout(() => this.initialize(), retryDelay);
      } else {
        console.error('[ProductionPipeline] Max initialization attempts reached, starting in degraded mode');
        this.startFallbackMode();
      }

      return false;
    }
  }

  /**
   * Execute initialization step with logging
   */
  private async initializeStep(stepName: string, action: () => Promise<void>): Promise<void> {
    this.status.initializationStep = stepName;
    console.log(`[ProductionPipeline] 🔄 ${stepName}...`);

    try {
      await action();
      console.log(`[ProductionPipeline] ✅ ${stepName} - Complete`);
    } catch (error) {
      console.error(`[ProductionPipeline] ❌ ${stepName} - Failed:`, error);
      throw error;
    }
  }

  /**
   * Start data streams (WebSocket or fallback)
   */
  private async startDataStreams(): Promise<void> {
    const coins = getStrategicCoins();

    // Check if WebSocket is available
    if (typeof WebSocket !== 'undefined') {
      try {
        // Start WebSocket connections
        multiExchangeAggregator.start(coins, (ticker: CanonicalTicker) => {
          this.handleIncomingData(ticker);
        });

        // Wait a bit to see if connection succeeds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if data is flowing
        if (this.status.dataFlowing) {
          console.log('[ProductionPipeline] WebSocket data flowing');
          this.status.webSocketStatus = 'CONNECTED';
          return;
        }
      } catch (error) {
        console.error('[ProductionPipeline] WebSocket failed:', error);
        this.status.errors.push(`WebSocket error: ${error}`);
      }
    }

    // Fallback to polling
    console.log('[ProductionPipeline] Starting fallback HTTP polling mode');
    this.startFallbackMode();
  }

  /**
   * Handle incoming data from any source
   */
  private handleIncomingData(ticker: CanonicalTicker): void {
    // Update status
    this.status.lastDataTime = Date.now();
    this.status.dataFlowing = true;

    // Update persistent stats with the exchange source
    const source = ticker.exchange || 'UNKNOWN';
    persistentStatsManager.recordDataPoint(source);

    // Send to signal engine
    try {
      realTimeSignalEngineV3.processTick(ticker);
    } catch (error) {
      console.error('[ProductionPipeline] Error processing tick:', error);
      this.status.errors.push(`Processing error: ${error}`);
    }
  }

  /**
   * Start fallback HTTP polling mode
   */
  private startFallbackMode(): void {
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
    }

    console.log('[ProductionPipeline] 📡 Starting fallback HTTP polling');
    this.status.webSocketStatus = 'FALLBACK';

    this.fallbackPollingInterval = setInterval(async () => {
      try {
        // Get top cryptos
        const cryptos = await cryptoDataService.getTopCryptos(50);

        // Convert to ticker format and process
        for (const crypto of cryptos) {
          const ticker: CanonicalTicker = {
            symbol: crypto.symbol,
            exchange: 'COINGECKO',
            price: crypto.current_price,
            volume24h: crypto.total_volume,
            high24h: crypto.high_24h,
            low24h: crypto.low_24h,
            open24h: crypto.current_price - (crypto.price_change_24h || 0),
            priceChange24h: crypto.price_change_24h || 0,
            priceChangePercent24h: crypto.price_change_percentage_24h || 0,
            marketCap: crypto.market_cap,
            circulatingSupply: crypto.circulating_supply,
            bid: crypto.current_price * 0.999, // Estimate
            ask: crypto.current_price * 1.001, // Estimate
            timestamp: Date.now(),
            quality: 'DELAYED'
          };

          this.handleIncomingData(ticker);
        }

        console.log(`[ProductionPipeline] Fallback poll: processed ${cryptos.length} cryptos`);

      } catch (error) {
        console.error('[ProductionPipeline] Fallback poll error:', error);
        this.status.errors.push(`Fallback error: ${error}`);
      }
    }, this.FALLBACK_POLL_INTERVAL);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    console.log('[ProductionPipeline] 🏥 Performing health check...');

    // Check data flow
    if (this.status.lastDataTime) {
      const timeSinceData = Date.now() - this.status.lastDataTime;
      if (timeSinceData > this.DATA_FLOW_TIMEOUT) {
        console.warn('[ProductionPipeline] ⚠️ No data for over 1 minute');
        this.status.dataFlowing = false;
        this.attemptRecovery();
      }
    }

    // Check WebSocket status
    const aggregatorStats = multiExchangeAggregator.getStats();
    if (!aggregatorStats.binanceData && !aggregatorStats.okxData && this.status.webSocketStatus === 'CONNECTED') {
      console.warn('[ProductionPipeline] ⚠️ WebSockets disconnected');
      this.status.webSocketStatus = 'DISCONNECTED';
      this.attemptRecovery();
    }

    // Update health score
    this.updateHealthScore();

    // Clear old errors (keep last 10)
    if (this.status.errors.length > 10) {
      this.status.errors = this.status.errors.slice(-10);
    }

    console.log(`[ProductionPipeline] Health Score: ${this.status.healthScore}/100`);
  }

  /**
   * Start data flow monitoring
   */
  private startDataFlowMonitoring(): void {
    if (this.dataFlowCheckInterval) {
      clearInterval(this.dataFlowCheckInterval);
    }

    // Listen for signal generation events
    if (typeof window !== 'undefined') {
      window.addEventListener('igx-signal-generated', () => {
        this.status.signalsGenerated++;
        persistentStatsManager.recordSignal();
        console.log(`[ProductionPipeline] 🎯 Signal generated! Total: ${this.status.signalsGenerated}`);
      });
    }
  }

  /**
   * Attempt recovery from failures
   */
  private async attemptRecovery(): Promise<void> {
    console.log('[ProductionPipeline] 🔧 Attempting recovery...');

    try {
      // Stop current streams
      multiExchangeAggregator.stop();

      // Clear fallback
      if (this.fallbackPollingInterval) {
        clearInterval(this.fallbackPollingInterval);
        this.fallbackPollingInterval = null;
      }

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Restart data streams
      await this.startDataStreams();

      console.log('[ProductionPipeline] ✅ Recovery complete');
    } catch (error) {
      console.error('[ProductionPipeline] Recovery failed:', error);
      this.status.errors.push(`Recovery failed: ${error}`);

      // Fall back to polling
      this.startFallbackMode();
    }
  }

  /**
   * Update health score (0-100)
   */
  private updateHealthScore(): void {
    let score = 0;

    // Running (30 points)
    if (this.status.isRunning) score += 30;

    // Data flowing (25 points)
    if (this.status.dataFlowing) score += 25;

    // WebSocket connected (20 points)
    if (this.status.webSocketStatus === 'CONNECTED') score += 20;
    else if (this.status.webSocketStatus === 'FALLBACK') score += 10;

    // OHLC ready (10 points)
    if (this.status.ohlcStatus === 'READY') score += 10;

    // Strategies active (10 points)
    if (this.status.strategiesStatus === 'ACTIVE') score += 10;

    // Low error count (5 points)
    if (this.status.errors.length < 5) score += 5;

    this.status.healthScore = score;
  }

  /**
   * Stop the pipeline
   */
  stop(): void {
    console.log('[ProductionPipeline] Stopping...');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.dataFlowCheckInterval) {
      clearInterval(this.dataFlowCheckInterval);
      this.dataFlowCheckInterval = null;
    }

    // Stop fallback polling
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
    }

    // Stop services
    multiExchangeAggregator.stop();
    preComputationPipeline.stop();
    signalOutcomeTracker.stop();

    // Reset status
    this.status = {
      isRunning: false,
      isInitializing: false,
      initializationStep: '',
      dataFlowing: false,
      lastDataTime: null,
      webSocketStatus: 'DISCONNECTED',
      ohlcStatus: 'LOADING',
      strategiesStatus: 'IDLE',
      signalsGenerated: 0,
      errors: [],
      healthScore: 0
    };

    console.log('[ProductionPipeline] Stopped');
  }

  /**
   * Restart the pipeline
   */
  async restart(): Promise<boolean> {
    console.log('[ProductionPipeline] Restarting...');
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return this.initialize();
  }

  /**
   * Get pipeline status
   */
  getStatus(): PipelineStatus {
    return { ...this.status };
  }

  /**
   * Get detailed statistics
   */
  getDetailedStats() {
    return {
      pipeline: this.status,
      persistent: persistentStatsManager.getStats(),
      aggregator: multiExchangeAggregator.getStats(),
      ohlc: ohlcDataManager.getStats(),
      engine: realTimeSignalEngineV3.getStats()
    };
  }
}

// Export singleton instance
export const productionDataPipeline = ProductionDataPipeline.getInstance();
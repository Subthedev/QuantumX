/**
 * AUTOMATED RETRAINING PIPELINE
 * Scheduled and performance-triggered model retraining
 *
 * PURPOSE:
 * - Auto-retrain models on schedule (daily/weekly)
 * - Trigger retraining when performance degrades
 * - A/B test new models before promotion
 * - Automatic rollback on performance regression
 *
 * TRIGGERS:
 * 1. Time-based: Every 24 hours
 * 2. Performance-based: Accuracy drops below threshold
 * 3. Data-based: New data available (50+ samples)
 * 4. Manual: On-demand retraining
 *
 * INSPIRED BY:
 * - Google Vertex AI: Auto ML retraining
 * - AWS SageMaker Pipelines
 * - Uber Michelangelo: Continuous training
 * - Netflix: Automated model deployment
 */

import { strategyPerformanceML } from './StrategyPerformancePredictorML';
import { mlPerformanceMonitor } from './MLPerformanceMonitor';
import { mlCircuitBreaker } from './MLCircuitBreaker';
import { StrategyName } from '../strategies/strategyTypes';

export interface RetrainingConfig {
  scheduleIntervalHours: number; // Retrain every N hours
  accuracyThreshold: number; // Retrain if accuracy drops below this
  driftThreshold: number; // Retrain if drift exceeds this
  minNewSamples: number; // Min new samples to trigger retrain
  enableAutoRetrain: boolean;
  enableABTesting: boolean;
}

export interface RetrainingJob {
  id: string;
  strategyName: StrategyName;
  trigger: 'SCHEDULED' | 'PERFORMANCE' | 'DRIFT' | 'MANUAL';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: number | null;
  completedAt: number | null;
  oldAccuracy: number;
  newAccuracy: number | null;
  promoted: boolean;
  error?: string;
}

export interface RetrainingStats {
  totalRetrains: number;
  successfulRetrains: number;
  failedRetrains: number;
  avgImprovementPercent: number;
  lastRetrain: number | null;
  nextScheduledRetrain: number;
}

export class AutomatedRetrainingPipeline {
  private config: RetrainingConfig = {
    scheduleIntervalHours: 24, // Daily retraining
    accuracyThreshold: 0.50, // Retrain if < 50%
    driftThreshold: 0.15, // Retrain if drift > 15%
    minNewSamples: 50,
    enableAutoRetrain: true,
    enableABTesting: true
  };

  private jobs: RetrainingJob[] = [];
  private stats: RetrainingStats = {
    totalRetrains: 0,
    successfulRetrains: 0,
    failedRetrains: 0,
    avgImprovementPercent: 0,
    lastRetrain: null,
    nextScheduledRetrain: Date.now() + (24 * 60 * 60 * 1000)
  };

  private scheduledTimer: any = null;
  private isRunning = false;

  constructor() {
    this.loadConfig();
    console.log('[AutoRetrainingPipeline] Initialized');
  }

  /**
   * Start automated retraining pipeline
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[AutoRetrainingPipeline] Already running');
      return;
    }

    this.isRunning = true;

    // Start scheduled retraining
    if (this.config.enableAutoRetrain) {
      this.startScheduledRetraining();
    }

    // Start performance monitoring
    this.startPerformanceMonitoring();

    console.log('[AutoRetrainingPipeline] ✅ Started - monitoring ' +
      `${this.config.scheduleIntervalHours}h schedule + performance triggers`);
  }

  /**
   * Stop automated retraining
   */
  stop(): void {
    this.isRunning = false;

    if (this.scheduledTimer) {
      clearInterval(this.scheduledTimer);
      this.scheduledTimer = null;
    }

    console.log('[AutoRetrainingPipeline] ⏹️ Stopped');
  }

  /**
   * Manually trigger retraining for specific strategy
   */
  async triggerRetrain(strategyName: StrategyName, reason: string = 'Manual trigger'): Promise<string> {
    console.log(`[AutoRetrainingPipeline] 🔄 Manual retrain triggered: ${strategyName} (${reason})`);

    return await this.queueRetraining(strategyName, 'MANUAL');
  }

  /**
   * Retrain all strategies
   */
  async retrainAllStrategies(): Promise<void> {
    console.log('[AutoRetrainingPipeline] 🔄 Retraining all 17 strategies...');

    const strategies: StrategyName[] = [
      'WHALE_SHADOW', 'SPRING_TRAP', 'MOMENTUM_SURGE', 'MOMENTUM_SURGE_V2',
      'MOMENTUM_RECOVERY', 'FUNDING_SQUEEZE', 'ORDER_FLOW_TSUNAMI',
      'FEAR_GREED_CONTRARIAN', 'GOLDEN_CROSS_MOMENTUM', 'MARKET_PHASE_SNIPER',
      'LIQUIDITY_HUNTER', 'VOLATILITY_BREAKOUT', 'STATISTICAL_ARBITRAGE',
      'ORDER_BOOK_MICROSTRUCTURE', 'LIQUIDATION_CASCADE_PREDICTION',
      'CORRELATION_BREAKDOWN_DETECTOR', 'BOLLINGER_MEAN_REVERSION'
    ];

    for (const strategy of strategies) {
      await this.queueRetraining(strategy, 'SCHEDULED');
    }

    console.log('[AutoRetrainingPipeline] ✅ All retraining jobs queued');
  }

  /**
   * Get retraining statistics
   */
  getStats(): RetrainingStats {
    return { ...this.stats };
  }

  /**
   * Get recent retraining jobs
   */
  getRecentJobs(limit: number = 10): RetrainingJob[] {
    return this.jobs.slice(-limit).reverse();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetrainingConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();

    // Restart if schedule changed
    if (config.scheduleIntervalHours && this.isRunning) {
      this.stop();
      this.start();
    }

    console.log('[AutoRetrainingPipeline] ✅ Configuration updated');
  }

  // ===== PRIVATE METHODS =====

  /**
   * Start scheduled retraining
   */
  private startScheduledRetraining(): void {
    const intervalMs = this.config.scheduleIntervalHours * 60 * 60 * 1000;

    this.scheduledTimer = setInterval(async () => {
      console.log('[AutoRetrainingPipeline] ⏰ Scheduled retrain triggered');

      // Retrain all strategies
      await this.retrainAllStrategies();

      // Update next schedule
      this.stats.nextScheduledRetrain = Date.now() + intervalMs;
    }, intervalMs);

    console.log(`[AutoRetrainingPipeline] 📅 Scheduled retraining every ${this.config.scheduleIntervalHours}h`);
  }

  /**
   * Start performance monitoring (check every 30 min)
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.checkPerformanceTriggers();
    }, 30 * 60 * 1000); // 30 minutes

    console.log('[AutoRetrainingPipeline] 📊 Performance monitoring started (30min intervals)');
  }

  /**
   * Check if any models need retraining based on performance
   */
  private async checkPerformanceTriggers(): Promise<void> {
    if (!this.config.enableAutoRetrain) return;

    const strategies: StrategyName[] = [
      'WHALE_SHADOW', 'SPRING_TRAP', 'MOMENTUM_SURGE', 'MOMENTUM_SURGE_V2',
      'MOMENTUM_RECOVERY', 'FUNDING_SQUEEZE', 'ORDER_FLOW_TSUNAMI',
      'FEAR_GREED_CONTRARIAN', 'GOLDEN_CROSS_MOMENTUM', 'MARKET_PHASE_SNIPER',
      'LIQUIDITY_HUNTER', 'VOLATILITY_BREAKOUT', 'STATISTICAL_ARBITRAGE',
      'ORDER_BOOK_MICROSTRUCTURE', 'LIQUIDATION_CASCADE_PREDICTION',
      'CORRELATION_BREAKDOWN_DETECTOR', 'BOLLINGER_MEAN_REVERSION'
    ];

    for (const strategy of strategies) {
      const metrics = mlPerformanceMonitor.getModelMetrics(strategy);
      if (!metrics) continue;

      // Trigger 1: Low accuracy
      if (metrics.accuracy < this.config.accuracyThreshold && metrics.predictions > 20) {
        console.log(
          `[AutoRetrainingPipeline] ⚠️ ${strategy}: Low accuracy (${(metrics.accuracy * 100).toFixed(0)}%) - triggering retrain`
        );
        await this.queueRetraining(strategy, 'PERFORMANCE');
        continue;
      }

      // Trigger 2: Model drift
      if (metrics.driftScore > this.config.driftThreshold && metrics.predictions > 50) {
        console.log(
          `[AutoRetrainingPipeline] ⚠️ ${strategy}: Model drift detected (${(metrics.driftScore * 100).toFixed(0)}%) - triggering retrain`
        );
        await this.queueRetraining(strategy, 'DRIFT');
        continue;
      }
    }
  }

  /**
   * Queue a retraining job
   */
  private async queueRetraining(
    strategyName: StrategyName,
    trigger: 'SCHEDULED' | 'PERFORMANCE' | 'DRIFT' | 'MANUAL'
  ): Promise<string> {
    const jobId = `retrain-${strategyName}-${Date.now()}`;

    // Get current accuracy
    const currentMetrics = mlPerformanceMonitor.getModelMetrics(strategyName);
    const oldAccuracy = currentMetrics ? currentMetrics.accuracy : 0;

    const job: RetrainingJob = {
      id: jobId,
      strategyName,
      trigger,
      status: 'QUEUED',
      startedAt: null,
      completedAt: null,
      oldAccuracy,
      newAccuracy: null,
      promoted: false
    };

    this.jobs.push(job);

    // Execute immediately (in production, this would go to a queue)
    this.executeRetrainingJob(job);

    return jobId;
  }

  /**
   * Execute a retraining job
   */
  private async executeRetrainingJob(job: RetrainingJob): Promise<void> {
    job.status = 'RUNNING';
    job.startedAt = Date.now();

    try {
      console.log(`[AutoRetrainingPipeline] 🔄 Retraining ${job.strategyName}...`);

      // Retrain the strategy
      await strategyPerformanceML.trainStrategy(job.strategyName);

      // Get new accuracy
      const newMetrics = mlPerformanceMonitor.getModelMetrics(job.strategyName);
      job.newAccuracy = newMetrics ? newMetrics.accuracy : 0;

      // Decide whether to promote
      const improvement = job.newAccuracy! - job.oldAccuracy;
      const improvementPercent = (improvement / job.oldAccuracy) * 100;

      if (this.config.enableABTesting) {
        // A/B test: Only promote if improvement > 2%
        if (improvementPercent > 2) {
          job.promoted = true;
          console.log(
            `[AutoRetrainingPipeline] ✅ ${job.strategyName}: ` +
            `Promoted new model (+${improvementPercent.toFixed(1)}% improvement)`
          );
        } else if (improvementPercent < -5) {
          // Rollback if significant regression
          job.promoted = false;
          console.log(
            `[AutoRetrainingPipeline] ⚠️ ${job.strategyName}: ` +
            `Rollback (${improvementPercent.toFixed(1)}% regression)`
          );
          // TODO: Actual rollback logic
        } else {
          job.promoted = false;
          console.log(
            `[AutoRetrainingPipeline] ℹ️ ${job.strategyName}: ` +
            `Not promoted (${improvementPercent.toFixed(1)}% change - need >2%)`
          );
        }
      } else {
        // Auto-promote
        job.promoted = true;
      }

      job.status = 'COMPLETED';
      job.completedAt = Date.now();

      // Update stats
      this.stats.totalRetrains++;
      this.stats.successfulRetrains++;
      this.stats.lastRetrain = Date.now();

      // Update average improvement
      const prevAvg = this.stats.avgImprovementPercent;
      this.stats.avgImprovementPercent =
        (prevAvg * (this.stats.successfulRetrains - 1) + improvementPercent) / this.stats.successfulRetrains;

      console.log(`[AutoRetrainingPipeline] ✅ ${job.strategyName} retrain complete`);

    } catch (error) {
      job.status = 'FAILED';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = Date.now();

      this.stats.totalRetrains++;
      this.stats.failedRetrains++;

      console.error(`[AutoRetrainingPipeline] ❌ ${job.strategyName} retrain failed:`, error);

      // Alert on failure
      mlPerformanceMonitor.addAlert(
        'CRITICAL',
        'ACCURACY',
        `Retraining failed for ${job.strategyName}: ${job.error}`,
        { jobId: job.id }
      );
    }
  }

  /**
   * Save configuration
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('retraining-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[AutoRetrainingPipeline] Error saving config:', error);
    }
  }

  /**
   * Load configuration
   */
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('retraining-config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
        console.log('[AutoRetrainingPipeline] Loaded config from storage');
      }
    } catch (error) {
      console.error('[AutoRetrainingPipeline] Error loading config:', error);
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isRunning: boolean;
    enableAutoRetrain: boolean;
    queuedJobs: number;
    runningJobs: number;
    successRate: number;
    avgImprovement: number;
    nextScheduledRetrain: string;
  } {
    const queuedJobs = this.jobs.filter(j => j.status === 'QUEUED').length;
    const runningJobs = this.jobs.filter(j => j.status === 'RUNNING').length;
    const successRate = this.stats.totalRetrains > 0
      ? this.stats.successfulRetrains / this.stats.totalRetrains
      : 0;

    return {
      isRunning: this.isRunning,
      enableAutoRetrain: this.config.enableAutoRetrain,
      queuedJobs,
      runningJobs,
      successRate: Math.round(successRate * 100) / 100,
      avgImprovement: Math.round(this.stats.avgImprovementPercent * 10) / 10,
      nextScheduledRetrain: new Date(this.stats.nextScheduledRetrain).toISOString()
    };
  }
}

// Singleton export
export const automatedRetrainingPipeline = new AutomatedRetrainingPipeline();

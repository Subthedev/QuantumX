/**
 * ZETA LEARNING ENGINE - Continuous Learning Coordinator
 *
 * Lightweight coordinator that integrates all existing learning systems:
 * - Delta V2 ML Training
 * - Real Outcome Tracking
 * - Strategy Performance
 * - Regime Adaptation
 * - Confidence Calibration
 *
 * Design: Minimal overhead, efficient event routing, clean metrics
 */

import { deltaV2QualityEngine } from './deltaV2QualityEngine';
import { realOutcomeTracker } from './realOutcomeTracker';

// Simple EventEmitter for browser compatibility
class SimpleEventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, handler: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
}

// ========== TYPES ==========

export interface ZetaMetrics {
  totalOutcomes: number;
  mlAccuracy: number;
  topStrategy: string;
  health: 'OPTIMAL' | 'GOOD' | 'FAIR' | 'DEGRADED';
  lastTrainingTime: number;
  trainingCount: number;
}

export interface SignalOutcome {
  signalId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  outcome: 'WIN' | 'LOSS' | 'TIMEOUT';
  entryPrice: number;
  exitPrice: number;
  confidence: number;
  strategy: string;
  regime: string;
  returnPct: number;
  timestamp: number;
}

// ========== ZETA ENGINE ==========

class ZetaLearningEngine extends SimpleEventEmitter {
  private state: {
    totalOutcomes: number;
    lastTrainingTime: number;
    trainingCount: number;
    mlAccuracy: number;
    topStrategy: string;
    health: 'OPTIMAL' | 'GOOD' | 'FAIR' | 'DEGRADED';
    strategyPerformance: Map<string, { wins: number; total: number }>;
  };

  private metricUpdateTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly METRIC_UPDATE_INTERVAL = 1000; // Batch updates every 1 second (real-time)
  private readonly HEARTBEAT_INTERVAL = 1000; // Emit metrics every 1 second (real-time)
  private readonly STORAGE_KEY = 'zeta-learning-state';

  constructor() {
    super();
    this.state = {
      totalOutcomes: 0,
      lastTrainingTime: 0,
      trainingCount: 0,
      mlAccuracy: 0,
      topStrategy: 'Initializing...',
      health: 'OPTIMAL',
      strategyPerformance: new Map()
    };

    this.loadState();
  }

  // ========== LIFECYCLE ==========

  /**
   * Start Zeta - Initialize all learning systems
   */
  start(): void {
    console.log('[Zeta] Starting continuous learning coordinator...');

    // ✅ CRITICAL: Subscribe to globalHubService signal outcomes
    // This was MISSING - Zeta was never receiving outcome events!
    if (typeof window !== 'undefined') {
      // Import globalHubService dynamically to avoid circular dependency
      import('./globalHubService').then(({ globalHubService }) => {
        globalHubService.on('signal:outcome', (outcomeData: any) => {
          console.log('[Zeta] 📥 Received signal outcome:', outcomeData.symbol, outcomeData.outcome);

          // Convert to SignalOutcome format
          const outcome: SignalOutcome = {
            signalId: outcomeData.signalId,
            symbol: outcomeData.symbol,
            direction: outcomeData.direction,
            outcome: outcomeData.outcome,
            entryPrice: outcomeData.entryPrice,
            exitPrice: outcomeData.exitPrice,
            confidence: outcomeData.qualityScore || 70,
            strategy: outcomeData.strategy || 'UNKNOWN',
            regime: 'UNKNOWN',
            returnPct: outcomeData.returnPct,
            timestamp: outcomeData.timestamp
          };

          this.processSignalOutcome(outcome);
        });

        console.log('[Zeta] ✅ Connected to globalHubService outcome events');
      });
    }

    // ✅ HEARTBEAT: Emit metrics every 1 second for real-time UI updates
    // Professional quant-firm level transparency - all metrics update in real-time
    this.heartbeatInterval = setInterval(() => {
      this.emit('metrics:update', this.getMetrics());
    }, this.HEARTBEAT_INTERVAL);

    console.log('[Zeta] ✅ Learning coordinator active with 1-second real-time heartbeat');
    this.emit('started');
  }

  /**
   * Stop Zeta - Clean shutdown
   */
  stop(): void {
    console.log('[Zeta] Stopping learning coordinator...');

    if (this.metricUpdateTimeout) {
      clearTimeout(this.metricUpdateTimeout);
      this.metricUpdateTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.saveState();
    console.log('[Zeta] ✅ Learning coordinator stopped');
  }

  // ========== OUTCOME PROCESSING ==========

  /**
   * Process signal outcome - Route to all learning engines
   * Performance target: <5ms
   */
  processSignalOutcome(outcome: SignalOutcome): void {
    const startTime = performance.now();

    console.log(`[Zeta] 🎓 Processing outcome #${this.state.totalOutcomes + 1}: ${outcome.symbol} ${outcome.outcome} (${outcome.returnPct.toFixed(2)}%)`);

    try {
      // Update state
      this.state.totalOutcomes++;

      // Track strategy performance
      const strategyKey = outcome.strategy;
      const perf = this.state.strategyPerformance.get(strategyKey) || { wins: 0, total: 0 };
      perf.total++;
      if (outcome.outcome === 'WIN') {
        perf.wins++;
      }
      this.state.strategyPerformance.set(strategyKey, perf);

      // Update top strategy
      this.updateTopStrategy();

      // Route to Delta V2 ML (it will train if needed)
      deltaV2QualityEngine.learn(
        {
          symbol: outcome.symbol,
          confidence: outcome.confidence,
          direction: outcome.direction,
          strategy: outcome.strategy as any,
          qualityScore: 0 // Delta V2 will calculate
        },
        outcome.regime as any,
        0,
        outcome.outcome === 'WIN'
      );

      // Check if ML just trained
      const deltaMetrics = deltaV2QualityEngine.getMetrics();
      if (deltaMetrics.mlAccuracy !== this.state.mlAccuracy) {
        this.state.mlAccuracy = deltaMetrics.mlAccuracy;
        this.state.trainingCount++;
        this.state.lastTrainingTime = Date.now();

        // Log only significant training events
        console.log(`[Zeta] ML trained - Accuracy: ${deltaMetrics.mlAccuracy.toFixed(1)}%`);

        // Emit training event
        this.emit('ml:trained', { accuracy: deltaMetrics.mlAccuracy });
      }

      // Update health based on performance
      this.updateHealth();

      // Schedule batched metric update (not immediate)
      this.scheduleMetricUpdate();

      // Performance monitoring
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`[Zeta] Slow processing: ${duration.toFixed(2)}ms`);
      }

    } catch (error) {
      console.error('[Zeta] Error processing outcome:', error);
      // Graceful degradation - don't crash the system
    }
  }

  // ========== METRICS ==========

  /**
   * Get current metrics for UI
   */
  getMetrics(): ZetaMetrics {
    return {
      totalOutcomes: this.state.totalOutcomes,
      mlAccuracy: this.state.mlAccuracy,
      topStrategy: this.state.topStrategy,
      health: this.state.health,
      lastTrainingTime: this.state.lastTrainingTime,
      trainingCount: this.state.trainingCount
    };
  }

  /**
   * Update top performing strategy
   */
  private updateTopStrategy(): void {
    let topStrategy = 'Initializing...';
    let topWinRate = 0;

    for (const [strategy, perf] of this.state.strategyPerformance.entries()) {
      if (perf.total < 5) continue; // Need at least 5 samples

      const winRate = perf.wins / perf.total;
      if (winRate > topWinRate) {
        topWinRate = winRate;
        topStrategy = strategy;
      }
    }

    this.state.topStrategy = topStrategy;
  }

  /**
   * Update system health based on performance
   */
  private updateHealth(): void {
    const oldHealth = this.state.health;

    // Calculate overall win rate
    let totalWins = 0;
    let totalSignals = 0;

    for (const perf of this.state.strategyPerformance.values()) {
      totalWins += perf.wins;
      totalSignals += perf.total;
    }

    if (totalSignals < 10) {
      this.state.health = 'OPTIMAL'; // Not enough data yet
      return;
    }

    const overallWinRate = totalWins / totalSignals;

    // Determine health
    if (overallWinRate >= 0.60) {
      this.state.health = 'OPTIMAL';
    } else if (overallWinRate >= 0.50) {
      this.state.health = 'GOOD';
    } else if (overallWinRate >= 0.40) {
      this.state.health = 'FAIR';
    } else {
      this.state.health = 'DEGRADED';
    }

    // Log only if health changed
    if (oldHealth !== this.state.health) {
      console.log(`[Zeta] Health: ${oldHealth} → ${this.state.health}`);
    }
  }

  /**
   * Schedule batched metric update (efficient)
   */
  private scheduleMetricUpdate(): void {
    if (this.metricUpdateTimeout) return; // Already scheduled

    this.metricUpdateTimeout = setTimeout(() => {
      this.emit('metrics:update', this.getMetrics());
      this.metricUpdateTimeout = null;
      this.saveState(); // Persist periodically
    }, this.METRIC_UPDATE_INTERVAL);
  }

  // ========== PERSISTENCE ==========

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.state.totalOutcomes = data.totalOutcomes || 0;
        this.state.mlAccuracy = data.mlAccuracy || 0;
        this.state.trainingCount = data.trainingCount || 0;
        this.state.lastTrainingTime = data.lastTrainingTime || 0;
        this.state.topStrategy = data.topStrategy || 'Initializing...';
        this.state.health = data.health || 'OPTIMAL';

        // Restore strategy performance
        if (data.strategyPerformance) {
          this.state.strategyPerformance = new Map(Object.entries(data.strategyPerformance));
        }

        console.log(`[Zeta] State loaded - ${this.state.totalOutcomes} outcomes processed`);
      }
    } catch (error) {
      console.error('[Zeta] Error loading state:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      const data = {
        totalOutcomes: this.state.totalOutcomes,
        mlAccuracy: this.state.mlAccuracy,
        trainingCount: this.state.trainingCount,
        lastTrainingTime: this.state.lastTrainingTime,
        topStrategy: this.state.topStrategy,
        health: this.state.health,
        strategyPerformance: Object.fromEntries(this.state.strategyPerformance)
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[Zeta] Error saving state:', error);
    }
  }
}

// ========== SINGLETON EXPORT ==========

export const zetaLearningEngine = new ZetaLearningEngine();

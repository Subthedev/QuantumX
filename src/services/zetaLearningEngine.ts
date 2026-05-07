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
  // Optional: agent that produced the trade (enables per-agent learning)
  agentId?: string;
  // Detailed outcome tracking for ML learning
  outcomeReason?: string;
  outcomeDetails?: {
    targetHit?: 'TP1' | 'TP2' | 'TP3';
    stopLossHit?: boolean;
    timeoutReason?: 'PRICE_STAGNATION' | 'WRONG_DIRECTION' | 'LOW_VOLATILITY' | 'TIME_EXPIRED';
    priceMovement?: number;
    expectedMovement?: number;
    highestPrice?: number;
    lowestPrice?: number;
    holdDuration?: number;
    marketConditions?: string;
  };
}

interface EngineLearnings {
  alpha?: string;
  beta?: string;
  gamma?: string;
  delta?: string;
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
    this.loadSelfImprovementState();
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

      // ✅ ARENA BRIDGE: Learn from arena agent trade closures (much higher frequency)
      // Arena agents trade every few minutes — each closed trade is a learning opportunity
      import('./arenaQuantEngine').then(({ arenaQuantEngine }) => {
        arenaQuantEngine.onTradeEvent((event) => {
          if (event.type !== 'close' || !event.position || event.pnlPercent === undefined) return;

          // Capture the actual market regime at entry — this is what makes
          // regime-aware learning possible downstream (Delta V2, blacklist, etc.).
          // Falling back to 'UNKNOWN' here was the bug that defeated the entire
          // strategy×regime learning path.
          const regimeAtEntry = String(event.position.marketStateAtEntry || 'UNKNOWN');

          const outcome: SignalOutcome = {
            signalId: `arena-${event.agent.id}-${Date.now()}`,
            symbol: event.position.symbol,
            direction: event.position.direction === 'LONG' ? 'LONG' : 'SHORT',
            outcome: event.isWin ? 'WIN' : (event.reason === 'TIMEOUT' ? 'TIMEOUT' : 'LOSS'),
            entryPrice: event.position.entryPrice,
            exitPrice: event.exitPrice || event.position.entryPrice,
            confidence: 65, // Arena trades use moderate confidence baseline
            strategy: event.position.strategy || 'MOMENTUM',
            regime: regimeAtEntry,
            returnPct: event.pnlPercent,
            timestamp: Date.now(),
            outcomeDetails: {
              targetHit: event.reason === 'TP' && event.isWin ? 'TP1' : undefined,
              stopLossHit: event.reason === 'SL',
              timeoutReason: event.reason === 'TIMEOUT' ? 'TIME_EXPIRED' : undefined,
              holdDuration: Date.now() - event.position.entryTime,
            },
          };

          // Per-agent learning hook — tag the outcome with the originating agent
          // so we can build per-agent strategy×regime performance maps.
          outcome.agentId = event.agent.id;

          this.processSignalOutcome(outcome);
        });

        console.log('[Zeta] ✅ Connected to arenaQuantEngine trade events (high-frequency learning, regime-aware)');
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
   * Record outcome from globalHubService format
   * Maps the Hub's rich outcome data to SignalOutcome and delegates to processSignalOutcome()
   */
  recordOutcome(data: {
    signalId: string;
    symbol: string;
    direction: string;
    outcome: string;
    trainingValue: number;
    qualityScore: number;
    mlProbability: number;
    strategy: string;
    marketRegime: string;
    entryPrice: number;
    exitPrice: number;
    returnPct: number;
  }): void {
    // Map outcome strings: WIN_TP1/TP2/TP3 -> WIN, LOSS_SL/PARTIAL -> LOSS, TIMEOUT_* -> TIMEOUT
    let mappedOutcome: 'WIN' | 'LOSS' | 'TIMEOUT';
    let outcomeDetails: SignalOutcome['outcomeDetails'] = {};

    const rawOutcome = String(data.outcome);
    if (rawOutcome.startsWith('WIN') || rawOutcome === 'WIN_TP1' || rawOutcome === 'WIN_TP2' || rawOutcome === 'WIN_TP3') {
      mappedOutcome = 'WIN';
      if (rawOutcome.includes('TP')) {
        outcomeDetails.targetHit = rawOutcome.replace('WIN_', '') as 'TP1' | 'TP2' | 'TP3';
      }
    } else if (rawOutcome.startsWith('LOSS') || rawOutcome === 'LOSS_SL' || rawOutcome === 'LOSS_PARTIAL') {
      mappedOutcome = 'LOSS';
      outcomeDetails.stopLossHit = rawOutcome === 'LOSS_SL';
    } else if (rawOutcome.startsWith('TIMEOUT')) {
      mappedOutcome = 'TIMEOUT';
      const reason = rawOutcome.replace('TIMEOUT_', '');
      if (['PRICE_STAGNATION', 'WRONG_DIRECTION', 'LOW_VOLATILITY', 'TIME_EXPIRED'].includes(reason)) {
        outcomeDetails.timeoutReason = reason as any;
      }
    } else {
      // Fallback: treat as the raw value if it's already WIN/LOSS/TIMEOUT
      mappedOutcome = rawOutcome as 'WIN' | 'LOSS' | 'TIMEOUT';
    }

    const signalOutcome: SignalOutcome = {
      signalId: data.signalId,
      symbol: data.symbol,
      direction: data.direction as 'LONG' | 'SHORT',
      outcome: mappedOutcome,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      confidence: data.qualityScore,
      strategy: data.strategy,
      regime: data.marketRegime,
      returnPct: data.returnPct,
      timestamp: Date.now(),
      outcomeDetails
    };

    console.log(`[Zeta] recordOutcome() → ${data.symbol} ${rawOutcome} mapped to ${mappedOutcome}`);
    this.processSignalOutcome(signalOutcome);
  }

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

      // Emit outcome processed event for UI real-time updates
      this.emit('outcome:processed', {
        symbol: outcome.symbol,
        outcome: outcome.outcome,
        returnPct: outcome.returnPct,
        strategy: outcome.strategy,
        timestamp: Date.now(),
        totalOutcomes: this.state.totalOutcomes,
        mlAccuracy: this.state.mlAccuracy,
        outcomeReason: outcome.outcomeReason,
        outcomeDetails: outcome.outcomeDetails
      });

      // Emit `signal_outcome` for autonomousOrchestrator Loop 3 (adaptive
      // position sizing). Previously this name mismatch silently broke the
      // outcome → position-sizing feedback loop.
      this.emit('signal_outcome', {
        signalId: outcome.signalId,
        symbol: outcome.symbol,
        outcome: outcome.outcome,
        strategy: outcome.strategy,
        regime: outcome.regime,
        returnPct: outcome.returnPct,
        confidence: outcome.confidence,
        timestamp: Date.now(),
      });

      // Update per-agent learning if this outcome came from a specific agent
      if (outcome.agentId) {
        this.updateAgentPerformance(outcome.agentId, outcome);
      }

      // Forward outcome to ContinuousLearningEngine for regime-weight gradient
      // descent (complementary to Zeta's discrete blacklisting).
      this.forwardToContinuousLearning(outcome);

      // Analyze outcome for engine-specific feedback
      const engineLearnings = this.analyzeOutcomeForEngines(outcome);
      if (Object.keys(engineLearnings).length > 0) {
        // Emit engine-specific feedback events for continuous improvement
        if (engineLearnings.alpha) {
          this.emit('feedback:alpha', {
            signal: outcome,
            learning: engineLearnings.alpha,
            timestamp: Date.now()
          });
        }
        if (engineLearnings.beta) {
          this.emit('feedback:beta', {
            signal: outcome,
            learning: engineLearnings.beta,
            timestamp: Date.now()
          });
        }
        if (engineLearnings.gamma) {
          this.emit('feedback:gamma', {
            signal: outcome,
            learning: engineLearnings.gamma,
            timestamp: Date.now()
          });
        }
        if (engineLearnings.delta) {
          this.emit('feedback:delta', {
            signal: outcome,
            learning: engineLearnings.delta,
            timestamp: Date.now()
          });
        }
      }

      // Run self-improvement checks (confidence calibration, hourly tracking, strategy health)
      this.runSelfImprovement(outcome);

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

  /**
   * Analyze outcome to generate engine-specific learnings
   * This creates a systematic feedback loop for continuous improvement
   */
  private analyzeOutcomeForEngines(outcome: SignalOutcome): EngineLearnings {
    const learnings: EngineLearnings = {};

    // TIMEOUT Analysis - All engines should learn from this
    if (outcome.outcome === 'TIMEOUT') {
      const details = outcome.outcomeDetails;

      // Alpha: Pattern detection feedback
      if (details?.timeoutReason === 'PRICE_STAGNATION') {
        learnings.alpha = `Pattern led to stagnant price - reduce detection sensitivity for similar setups in ${outcome.regime} regime`;
      } else if (details?.timeoutReason === 'WRONG_DIRECTION') {
        learnings.alpha = `Pattern predicted wrong direction - review reversal vs continuation logic for ${outcome.strategy}`;
      } else if (details?.timeoutReason === 'LOW_VOLATILITY') {
        learnings.alpha = `Low volatility timeout - increase minimum volatility threshold for pattern detection`;
      }

      // Beta: Confidence scoring feedback
      learnings.beta = `Strategy ${outcome.strategy} timed out (confidence was ${outcome.confidence}%) - reduce scoring weight by 10%`;

      // Gamma: Assembly logic feedback
      learnings.gamma = `Signal assembly approved a timeout - tighten filters for ${outcome.regime} regime signals`;

      // Delta: ML threshold feedback
      learnings.delta = `ML approved signal that timed out - increase quality threshold for similar patterns`;
    }

    // LOSS Analysis - Identify what went wrong
    if (outcome.outcome === 'LOSS') {
      const details = outcome.outcomeDetails;

      if (details?.stopLossHit) {
        // Stop loss was too tight or entry was poor
        learnings.alpha = `Stop loss hit at ${outcome.returnPct.toFixed(2)}% - review entry timing for ${outcome.strategy}`;
        learnings.beta = `Loss of ${outcome.returnPct.toFixed(2)}% - reduce confidence for strategy ${outcome.strategy} in ${outcome.regime} regime`;
        learnings.delta = `Stop loss triggered - consider wider stops for ${outcome.regime} volatility or better entry filtering`;
      } else {
        // Price moved against position significantly
        const moveAgainst = Math.abs(outcome.returnPct);
        if (moveAgainst > 3) {
          learnings.alpha = `Large loss ${outcome.returnPct.toFixed(2)}% - pattern failed badly, decrease detection weight`;
          learnings.gamma = `Major loss - signal should have been rejected, strengthen assembly filters`;
        }
      }
    }

    // WIN Analysis - Reinforce successful patterns
    if (outcome.outcome === 'WIN') {
      const details = outcome.outcomeDetails;
      const winSize = outcome.returnPct;

      if (details?.targetHit === 'TP3') {
        // Big win - reinforce aggressively
        learnings.alpha = `TP3 hit with ${winSize.toFixed(2)}% gain - reinforce pattern detection for ${outcome.strategy}`;
        learnings.beta = `Strong win at TP3 - increase confidence weight for strategy ${outcome.strategy} by 15%`;
        learnings.gamma = `TP3 success - current assembly logic is optimal for ${outcome.regime} regime`;
        learnings.delta = `TP3 hit - ML prediction was excellent, maintain current thresholds`;
      } else if (details?.targetHit === 'TP2') {
        // Good win - moderate reinforcement
        learnings.alpha = `TP2 hit with ${winSize.toFixed(2)}% gain - good pattern, maintain detection sensitivity`;
        learnings.beta = `TP2 success - increase strategy ${outcome.strategy} weight by 8%`;
      } else if (details?.targetHit === 'TP1') {
        // Small win - slight reinforcement
        learnings.beta = `TP1 hit with ${winSize.toFixed(2)}% - acceptable but could be better, slight +5% weight increase`;
      }

      // Check if win was in challenging conditions
      if (outcome.regime === 'HIGH_VOLATILITY' || outcome.regime === 'BEARISH') {
        learnings.gamma = `Win in ${outcome.regime} conditions - excellent signal assembly, document this setup`;
      }
    }

    // Log generated learnings for transparency
    if (Object.keys(learnings).length > 0) {
      console.log(`[Zeta] 📚 Engine learnings generated for ${outcome.symbol} ${outcome.outcome}:`, learnings);
    }

    return learnings;
  }

  // ========== METRICS ==========

  /**
   * Get current metrics for UI
   */
  getTotalOutcomes(): number {
    return this.state.totalOutcomes;
  }

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
      if (perf.total < 3) continue; // Need at least 3 samples (lowered from 5)

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
   * Get strategy performance for UI display
   */
  getStrategyPerformance(): Array<{ strategy: string; wins: number; total: number; winRate: number }> {
    const performance: Array<{ strategy: string; wins: number; total: number; winRate: number }> = [];

    for (const [strategy, perf] of this.state.strategyPerformance.entries()) {
      performance.push({
        strategy,
        wins: perf.wins,
        total: perf.total,
        winRate: perf.total > 0 ? (perf.wins / perf.total) * 100 : 0
      });
    }

    // Sort by total outcomes (most tested strategies first)
    return performance.sort((a, b) => b.total - a.total);
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

  // ========== SELF-IMPROVEMENT ENGINE ==========
  // These methods enable autonomous learning that compounds over time.

  private confidenceCalibration: Map<string, { predicted: number; actual: number; count: number }> = new Map();
  private hourlyPerformance: Map<number, { wins: number; total: number }> = new Map();
  private strategyBlacklist: Set<string> = new Set();
  private readonly SELF_IMPROVE_KEY = 'zeta-self-improve-v1';

  // PER-AGENT LEARNING — each agent (alphaX, betaX, gammaX) accumulates its
  // own strategy×regime performance map so we can tilt position sizing and
  // strategy selection toward what THAT agent has historically done well with.
  // Key: `${strategy}-${regime}` → { wins, total, totalReturn }
  private agentPerformance: Map<string, Map<string, { wins: number; total: number; totalReturn: number }>> = new Map();
  private readonly AGENT_LEARNING_KEY = 'zeta-agent-learning-v1';

  /**
   * Called after every outcome to trigger self-improvement checks.
   * Runs automatically — no human intervention needed.
   */
  private runSelfImprovement(outcome: SignalOutcome): void {
    this.updateConfidenceCalibration(outcome);
    this.updateHourlyPerformance(outcome);
    this.checkStrategyHealth(outcome);
    this.saveSelfImprovementState();

    // Every 15 outcomes, run a full optimization pass (lowered from 25 for faster adaptation)
    if (this.state.totalOutcomes % 15 === 0 && this.state.totalOutcomes > 0) {
      this.runOptimizationPass();
    }
  }

  /**
   * CONFIDENCE CALIBRATION
   * Tracks predicted confidence vs actual win rate.
   * If signals with 80% confidence only win 50%, we know confidence is inflated.
   */
  private updateConfidenceCalibration(outcome: SignalOutcome): void {
    // Bucket confidence into 10% ranges: 0-10, 10-20, ..., 90-100
    const bucket = Math.floor(outcome.confidence / 10) * 10;
    const key = `${bucket}`;
    const cal = this.confidenceCalibration.get(key) || { predicted: bucket + 5, actual: 0, count: 0 };
    cal.count++;
    cal.actual = ((cal.actual * (cal.count - 1)) + (outcome.outcome === 'WIN' ? 100 : 0)) / cal.count;
    this.confidenceCalibration.set(key, cal);
  }

  /**
   * Get calibrated confidence for a raw confidence score.
   * Returns adjusted confidence based on historical accuracy of that bucket.
   */
  getCalibratedConfidence(rawConfidence: number): number {
    const bucket = Math.floor(rawConfidence / 10) * 10;
    const cal = this.confidenceCalibration.get(`${bucket}`);
    if (!cal || cal.count < 3) return rawConfidence; // Need at least 3 samples (lowered from 5)
    // Blend: 70% raw + 30% calibrated (gradual correction)
    return rawConfidence * 0.7 + cal.actual * 0.3;
  }

  /**
   * HOURLY PERFORMANCE TRACKING
   * Tracks win rate by hour of day to identify optimal trading windows.
   */
  private updateHourlyPerformance(outcome: SignalOutcome): void {
    const hour = new Date().getHours();
    const perf = this.hourlyPerformance.get(hour) || { wins: 0, total: 0 };
    perf.total++;
    if (outcome.outcome === 'WIN') perf.wins++;
    this.hourlyPerformance.set(hour, perf);
  }

  /**
   * Check if current hour is historically good for trading.
   * Returns a multiplier: 0.5 (bad hour) to 1.2 (great hour).
   */
  getHourlyMultiplier(): number {
    const hour = new Date().getHours();
    const perf = this.hourlyPerformance.get(hour);
    if (!perf || perf.total < 5) return 1.0; // Need at least 5 samples (lowered from 10)
    const winRate = perf.wins / perf.total;
    if (winRate >= 0.65) return 1.2;  // Great hour
    if (winRate >= 0.55) return 1.0;  // Normal
    if (winRate >= 0.45) return 0.8;  // Below average
    return 0.5;                        // Bad hour — reduce activity
  }

  /**
   * STRATEGY HEALTH CHECK
   * Auto-blacklists strategies with consistently poor performance.
   */
  private checkStrategyHealth(outcome: SignalOutcome): void {
    const key = `${outcome.strategy}-${outcome.regime}`;
    const perf = this.state.strategyPerformance.get(key) ||
                 this.state.strategyPerformance.get(outcome.strategy);
    if (!perf || perf.total < 8) return; // Lowered from 15 — blacklist bad combos faster

    const winRate = perf.wins / perf.total;

    // Blacklist strategy-regime combos below 30% win rate over 15+ trades
    if (winRate < 0.30) {
      if (!this.strategyBlacklist.has(key)) {
        this.strategyBlacklist.add(key);
        console.log(`[Zeta] AUTO-BLACKLIST: ${key} (win rate: ${(winRate * 100).toFixed(1)}% over ${perf.total} trades)`);
        this.emit('self-improve:blacklist', { strategy: outcome.strategy, regime: outcome.regime, winRate });
      }
    }

    // Un-blacklist if it recovers above 45% (allows redemption)
    if (winRate > 0.45 && this.strategyBlacklist.has(key)) {
      this.strategyBlacklist.delete(key);
      console.log(`[Zeta] UN-BLACKLISTED: ${key} (win rate recovered to ${(winRate * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Check if a strategy-regime combo is blacklisted.
   */
  isStrategyBlacklisted(strategy: string, regime: string): boolean {
    return this.strategyBlacklist.has(`${strategy}-${regime}`) ||
           this.strategyBlacklist.has(strategy);
  }

  /**
   * FULL OPTIMIZATION PASS
   * Runs every 25 outcomes. Analyzes patterns and emits adjustment recommendations.
   */
  private runOptimizationPass(): void {
    console.log(`[Zeta] Running optimization pass #${Math.floor(this.state.totalOutcomes / 25)}...`);

    // 1. Check confidence calibration drift
    let totalDrift = 0;
    let driftCount = 0;
    for (const [, cal] of this.confidenceCalibration) {
      if (cal.count >= 5) {
        totalDrift += Math.abs(cal.predicted - cal.actual);
        driftCount++;
      }
    }
    const avgDrift = driftCount > 0 ? totalDrift / driftCount : 0;

    // 2. Find best and worst hours
    let bestHour = -1, worstHour = -1;
    let bestWR = 0, worstWR = 1;
    for (const [hour, perf] of this.hourlyPerformance) {
      if (perf.total < 5) continue;
      const wr = perf.wins / perf.total;
      if (wr > bestWR) { bestWR = wr; bestHour = hour; }
      if (wr < worstWR) { worstWR = wr; worstHour = hour; }
    }

    // 3. Count blacklisted strategies
    const blacklistCount = this.strategyBlacklist.size;

    // 4. Emit optimization report
    const report = {
      totalOutcomes: this.state.totalOutcomes,
      confidenceDrift: avgDrift,
      bestTradingHour: bestHour >= 0 ? `${bestHour}:00 (${(bestWR * 100).toFixed(0)}% WR)` : 'N/A',
      worstTradingHour: worstHour >= 0 ? `${worstHour}:00 (${(worstWR * 100).toFixed(0)}% WR)` : 'N/A',
      blacklistedStrategies: blacklistCount,
      overallHealth: this.state.health,
      mlAccuracy: this.state.mlAccuracy
    };

    console.log('[Zeta] Optimization report:', report);
    this.emit('self-improve:report', report);
  }

  /**
   * Get self-improvement diagnostics for UI/debugging
   */
  getSelfImprovementState(): {
    calibration: Record<string, { predicted: number; actual: number; count: number }>;
    hourlyPerf: Record<number, { wins: number; total: number; winRate: number }>;
    blacklist: string[];
  } {
    const hourlyPerf: Record<number, { wins: number; total: number; winRate: number }> = {};
    for (const [hour, perf] of this.hourlyPerformance) {
      hourlyPerf[hour] = { ...perf, winRate: perf.total > 0 ? (perf.wins / perf.total) * 100 : 0 };
    }

    return {
      calibration: Object.fromEntries(this.confidenceCalibration),
      hourlyPerf,
      blacklist: Array.from(this.strategyBlacklist)
    };
  }

  private saveSelfImprovementState(): void {
    try {
      const data = {
        calibration: Object.fromEntries(this.confidenceCalibration),
        hourly: Object.fromEntries(this.hourlyPerformance),
        blacklist: Array.from(this.strategyBlacklist)
      };
      localStorage.setItem(this.SELF_IMPROVE_KEY, JSON.stringify(data));
    } catch {}
  }

  private loadSelfImprovementState(): void {
    try {
      const stored = localStorage.getItem(this.SELF_IMPROVE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.calibration) this.confidenceCalibration = new Map(Object.entries(data.calibration));
        if (data.hourly) this.hourlyPerformance = new Map(Object.entries(data.hourly).map(([k, v]) => [Number(k), v as any]));
        if (data.blacklist) this.strategyBlacklist = new Set(data.blacklist);
        console.log(`[Zeta] Self-improvement state loaded: ${this.confidenceCalibration.size} calibration buckets, ${this.strategyBlacklist.size} blacklisted`);
      }
    } catch {}

    // Load per-agent learning state separately (different storage key)
    try {
      const stored = localStorage.getItem(this.AGENT_LEARNING_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, Record<string, { wins: number; total: number; totalReturn: number }>>;
        for (const [agentId, perfMap] of Object.entries(data)) {
          this.agentPerformance.set(agentId, new Map(Object.entries(perfMap)));
        }
        console.log(`[Zeta] Per-agent learning state loaded: ${this.agentPerformance.size} agents tracked`);
      }
    } catch {}
  }

  // ========== PER-AGENT LEARNING ==========

  /**
   * Update an agent's strategy×regime performance map after one of its trades closes.
   * Called from the arena bridge inside processSignalOutcome().
   */
  private updateAgentPerformance(agentId: string, outcome: SignalOutcome): void {
    if (!this.agentPerformance.has(agentId)) {
      this.agentPerformance.set(agentId, new Map());
    }
    const agentMap = this.agentPerformance.get(agentId)!;
    const key = `${outcome.strategy}-${outcome.regime}`;
    const perf = agentMap.get(key) || { wins: 0, total: 0, totalReturn: 0 };
    perf.total++;
    if (outcome.outcome === 'WIN') perf.wins++;
    perf.totalReturn += outcome.returnPct;
    agentMap.set(key, perf);

    // Persist (best-effort, throttled by parent saveState debounce path)
    this.saveAgentPerformance();
  }

  /**
   * Get a per-agent strategy bias (0.5 → 1.5) for sizing/selection decisions.
   * Returns 1.0 (neutral) when there's not enough data for confident learning.
   *
   * The bias is centered on 1.0 and scales with sample-size confidence so that
   * a 70% win rate over 3 trades doesn't produce the same boost as 70% over 30.
   */
  getAgentStrategyBias(agentId: string, strategy: string, regime: string): number {
    const agentMap = this.agentPerformance.get(agentId);
    if (!agentMap) return 1.0;

    const key = `${strategy}-${regime}`;
    const perf = agentMap.get(key);
    if (!perf || perf.total < 3) return 1.0; // Not enough data — stay neutral

    const winRate = perf.wins / perf.total;
    const avgReturn = perf.totalReturn / perf.total;

    // Confidence factor (Wilson-style): more samples → stronger signal
    const confidence = Math.min(1.0, perf.total / 20); // 20 trades = full confidence

    // Bias = baseline + (winRate departure from 50%) × confidence × scale
    // Boost on positive avg return amplifies; negative damps further.
    const winRateAdj = (winRate - 0.5) * 2 * confidence; // -1 to +1
    const returnAdj = Math.tanh(avgReturn / 5) * confidence; // tanh squashes to -1..+1

    const bias = 1.0 + (winRateAdj * 0.4 + returnAdj * 0.2);
    return Math.max(0.4, Math.min(1.6, bias));
  }

  /**
   * Snapshot of an agent's learning state — used by UI/diagnostic panels.
   */
  getAgentLearningInsights(agentId: string): {
    totalTrades: number;
    bestCombo: { key: string; winRate: number; total: number; avgReturn: number } | null;
    worstCombo: { key: string; winRate: number; total: number; avgReturn: number } | null;
    combos: Array<{ key: string; wins: number; total: number; winRate: number; avgReturn: number }>;
  } {
    const agentMap = this.agentPerformance.get(agentId);
    if (!agentMap || agentMap.size === 0) {
      return { totalTrades: 0, bestCombo: null, worstCombo: null, combos: [] };
    }

    const combos = Array.from(agentMap.entries()).map(([key, perf]) => ({
      key,
      wins: perf.wins,
      total: perf.total,
      winRate: perf.total > 0 ? (perf.wins / perf.total) * 100 : 0,
      avgReturn: perf.total > 0 ? perf.totalReturn / perf.total : 0,
    }));

    const eligible = combos.filter(c => c.total >= 3);
    const totalTrades = combos.reduce((s, c) => s + c.total, 0);

    let bestCombo = null;
    let worstCombo = null;
    if (eligible.length > 0) {
      const sortedByWR = [...eligible].sort((a, b) => b.winRate - a.winRate);
      bestCombo = sortedByWR[0];
      worstCombo = sortedByWR[sortedByWR.length - 1];
    }

    return { totalTrades, bestCombo, worstCombo, combos: combos.sort((a, b) => b.total - a.total) };
  }

  private saveAgentPerformance(): void {
    try {
      const serialized: Record<string, Record<string, { wins: number; total: number; totalReturn: number }>> = {};
      for (const [agentId, perfMap] of this.agentPerformance) {
        serialized[agentId] = Object.fromEntries(perfMap);
      }
      localStorage.setItem(this.AGENT_LEARNING_KEY, JSON.stringify(serialized));
    } catch {}
  }

  // ========== CONTINUOUS-LEARNING BRIDGE ==========

  /**
   * Cached regime weight from ContinuousLearningEngine. Refreshed lazily on
   * each outcome so synchronous consumers (arena.openStrategyPosition) can
   * read it without awaiting a dynamic import.
   */
  private clRegimeWeights: Record<string, number> = {
    BULL_TRENDING: 1.0,
    BEAR_TRENDING: 1.0,
    RANGING: 1.0,
    HIGH_VOLATILITY: 1.0,
    LOW_VOLATILITY: 1.0,
    UNKNOWN: 1.0,
  };

  /**
   * Synchronous read of the ContinuousLearningEngine's learned regime weight,
   * keyed by any regime label this codebase produces. Returns a tightly-bounded
   * multiplier (0.7 → 1.3) to avoid compounding with the other bias inputs in
   * arena.openStrategyPosition. Defaults to 1.0 when the learner has no data.
   */
  getContinuousLearningRegimeWeight(regimeLabel: string | undefined): number {
    if (!regimeLabel) return 1.0;
    const map: Record<string, string> = {
      BULLISH_HIGH_VOL: 'HIGH_VOLATILITY',
      BULLISH_LOW_VOL: 'BULL_TRENDING',
      BEARISH_HIGH_VOL: 'HIGH_VOLATILITY',
      BEARISH_LOW_VOL: 'BEAR_TRENDING',
      RANGEBOUND: 'RANGING',
      BULLISH_TREND: 'BULL_TRENDING',
      BEARISH_TREND: 'BEAR_TRENDING',
      SIDEWAYS: 'RANGING',
      CHOPPY: 'RANGING',
    };
    const mapped = map[regimeLabel.toUpperCase()] || regimeLabel.toUpperCase();
    const raw = this.clRegimeWeights[mapped] ?? 1.0;
    // Clamp the underlying 0.5–2.0 range into a more conservative 0.7–1.3
    // band so a single-bias input can't dominate the sizing pipeline.
    return Math.max(0.7, Math.min(1.3, 0.7 + (raw - 0.5) * 0.4));
  }


  /**
   * Forward each outcome to the gradient-descent ContinuousLearningEngine so
   * its regime-weight learner actually receives input. Previously this engine
   * was instantiated but never fed any outcomes — pure SOP. We map Zeta's
   * MarketState-style regime strings to the engine's MarketRegime enum.
   */
  private forwardToContinuousLearning(outcome: SignalOutcome): void {
    if (typeof window === 'undefined') return;

    import('./igx/ContinuousLearningEngine').then(({ continuousLearningEngine }) => {
      // Normalize every regime label this codebase produces to the
      // ContinuousLearningEngine's MarketRegime enum
      // (BULL_TRENDING | BEAR_TRENDING | RANGING | HIGH_VOLATILITY | LOW_VOLATILITY | UNKNOWN).
      // Sources covered:
      //  - Arena's MarketState  (BULLISH_HIGH_VOL, BULLISH_LOW_VOL, BEARISH_*, RANGEBOUND)
      //  - Delta V2's MarketRegime  (BULLISH_TREND, BEARISH_TREND, SIDEWAYS, HIGH_VOLATILITY, LOW_VOLATILITY)
      //  - GlobalHub default 'CHOPPY'
      //  - Native MarketRegime values (passthrough)
      const regimeMap: Record<string, string> = {
        // Arena MarketState
        'BULLISH_HIGH_VOL': 'HIGH_VOLATILITY',
        'BULLISH_LOW_VOL': 'BULL_TRENDING',
        'BEARISH_HIGH_VOL': 'HIGH_VOLATILITY',
        'BEARISH_LOW_VOL': 'BEAR_TRENDING',
        'RANGEBOUND': 'RANGING',
        // Delta V2 MarketRegime
        'BULLISH_TREND': 'BULL_TRENDING',
        'BEARISH_TREND': 'BEAR_TRENDING',
        'SIDEWAYS': 'RANGING',
        // GlobalHub fallback labels
        'CHOPPY': 'RANGING',
        // Native MarketRegime passthrough
        'BULL_TRENDING': 'BULL_TRENDING',
        'BEAR_TRENDING': 'BEAR_TRENDING',
        'RANGING': 'RANGING',
        'HIGH_VOLATILITY': 'HIGH_VOLATILITY',
        'LOW_VOLATILITY': 'LOW_VOLATILITY',
      };
      const mappedRegime = regimeMap[(outcome.regime || '').toUpperCase()] || 'UNKNOWN';

      continuousLearningEngine.recordOutcome({
        signalId: outcome.signalId,
        symbol: outcome.symbol,
        direction: outcome.direction,
        entryPrice: outcome.entryPrice,
        exitPrice: outcome.exitPrice,
        actualProfit: outcome.returnPct,
        actualDrawdown: Math.max(0, -outcome.returnPct), // approximate drawdown from final return
        duration: outcome.outcomeDetails?.holdDuration ?? 0,
        regime: mappedRegime as any,
        patternStrength: outcome.confidence, // use confidence as proxy for pattern strength
        confidence: outcome.confidence,
        timestamp: outcome.timestamp,
      });

      // Cache the freshly-updated regime weights so arena's synchronous
      // sizing path (openStrategyPosition) can read them without awaiting.
      try {
        const w = continuousLearningEngine.getWeights();
        this.clRegimeWeights = { ...w.regime } as Record<string, number>;
      } catch {}
    }).catch(err => console.warn('[Zeta] ContinuousLearning forward failed:', err?.message));
  }
}

// ========== SINGLETON EXPORT ==========

export const zetaLearningEngine = new ZetaLearningEngine();

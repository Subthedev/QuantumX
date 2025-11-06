/**
 * SIGNAL LIFECYCLE MANAGER
 * Tracks signals from generation to outcome detection
 *
 * RESPONSIBILITIES:
 * - Register all generated signals
 * - Monitor price action for active signals
 * - Auto-detect stop loss or target hits
 * - Calculate actual profit/loss
 * - Emit outcome events for continuous learning
 *
 * This is the CRITICAL feedback loop that enables the system to learn and improve
 */

import type { IGXSignal } from './IGXBetaV2';

export interface SignalOutcome {
  // Signal identification
  signalId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';

  // Prices
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  targets: number[];

  // Actual outcome
  actualProfit: number; // Percentage
  actualDrawdown: number; // Max drawdown during trade
  duration: number; // ms

  // Strategy/Pattern info (for learning attribution)
  strategy: string;
  patterns: string[]; // Pattern names
  regime: string; // Market regime at signal time

  // Original predictions (for calibration)
  predictedConfidence: number;
  originalConfidence: number;

  // Outcome classification
  success: boolean; // True if profit > 0
  hitTarget: boolean; // True if target hit
  hitStopLoss: boolean; // True if stop loss hit
  timeout: boolean; // True if neither hit within time limit

  // Timestamps
  entryTime: number;
  exitTime: number;
  timestamp: number;
}

interface ActiveSignal {
  signal: IGXSignal;
  registeredAt: number;
  highestPrice: number; // Track for drawdown calculation
  lowestPrice: number;
  currentDrawdown: number;
  status: 'PENDING' | 'ENTERED' | 'MONITORING' | 'EXITED';
}

export class SignalLifecycleManager {
  // Active signals being monitored
  private activeSignals = new Map<string, ActiveSignal>();

  // Outcome history (last 1000 outcomes)
  private outcomes: SignalOutcome[] = [];
  private readonly MAX_OUTCOMES = 1000;

  // Configuration
  private readonly TIMEOUT_DURATION = 48 * 60 * 60 * 1000; // 48 hours
  private readonly MONITORING_INTERVAL = 5000; // 5 seconds
  private readonly PRICE_CHECK_TOLERANCE = 0.001; // 0.1% tolerance for stop/target hits

  // Running state
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Stats
  private stats = {
    totalSignalsRegistered: 0,
    activeSignalsCount: 0,
    totalOutcomes: 0,
    winsDetected: 0,
    lossesDetected: 0,
    timeouts: 0,
    avgSignalDuration: 0
  };

  constructor() {
    console.log('[Signal Lifecycle] Initialized');
  }

  /**
   * Start lifecycle monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Signal Lifecycle] Already running');
      return;
    }

    this.isRunning = true;

    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.monitorActiveSignals();
    }, this.MONITORING_INTERVAL);

    console.log('[Signal Lifecycle] ✅ Started monitoring (checking every 5 seconds)');
  }

  /**
   * Stop lifecycle monitoring
   */
  stop(): void {
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[Signal Lifecycle] ⏹️ Stopped monitoring');
  }

  /**
   * Register new signal for lifecycle tracking
   */
  registerSignal(signal: IGXSignal): void {
    const activeSignal: ActiveSignal = {
      signal,
      registeredAt: Date.now(),
      highestPrice: signal.entryPrice,
      lowestPrice: signal.entryPrice,
      currentDrawdown: 0,
      status: 'PENDING'
    };

    this.activeSignals.set(signal.id, activeSignal);
    this.stats.totalSignalsRegistered++;
    this.stats.activeSignalsCount = this.activeSignals.size;

    console.log(
      `[Signal Lifecycle] 📝 Registered: ${signal.symbol} ${signal.direction} @ $${signal.entryPrice} ` +
      `(Stop: $${signal.stopLoss}, Targets: ${signal.targets.map(t => '$' + t).join(', ')})`
    );

    // Emit registration event
    this.emitEvent('signal-registered', { signal });
  }

  /**
   * Monitor all active signals
   */
  private async monitorActiveSignals(): Promise<void> {
    if (this.activeSignals.size === 0) return;

    for (const [id, activeSignal] of this.activeSignals.entries()) {
      try {
        // Get current price for this symbol
        const currentPrice = await this.getCurrentPrice(activeSignal.signal.symbol);

        if (!currentPrice) continue;

        // Update price tracking
        this.updatePriceTracking(activeSignal, currentPrice);

        // Check for outcome
        const outcome = this.checkForOutcome(activeSignal, currentPrice);

        if (outcome) {
          // Outcome detected!
          this.recordOutcome(outcome);
          this.activeSignals.delete(id);
          this.stats.activeSignalsCount = this.activeSignals.size;

          console.log(
            `[Signal Lifecycle] ✅ Outcome detected: ${outcome.symbol} ${outcome.direction} → ` +
            `${outcome.success ? 'WIN' : 'LOSS'} (${outcome.actualProfit > 0 ? '+' : ''}${outcome.actualProfit.toFixed(2)}%)`
          );
        }
      } catch (error) {
        console.error(`[Signal Lifecycle] Error monitoring signal ${id}:`, error);
      }
    }

    // Check for timeouts
    this.checkForTimeouts();
  }

  /**
   * Get current price for symbol (from ticker events or API)
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    // TODO: Integrate with price feed
    // For now, we'll listen to ticker events
    // In production, this should query a price service or websocket feed
    return null; // Placeholder
  }

  /**
   * Update price tracking for drawdown calculation
   */
  private updatePriceTracking(activeSignal: ActiveSignal, currentPrice: number): void {
    const { signal } = activeSignal;

    // Update highest/lowest
    if (currentPrice > activeSignal.highestPrice) {
      activeSignal.highestPrice = currentPrice;
    }
    if (currentPrice < activeSignal.lowestPrice) {
      activeSignal.lowestPrice = currentPrice;
    }

    // Calculate current drawdown
    if (signal.direction === 'LONG') {
      // For LONG, drawdown is from highest to current
      activeSignal.currentDrawdown =
        ((activeSignal.highestPrice - currentPrice) / activeSignal.highestPrice) * 100;
    } else {
      // For SHORT, drawdown is from lowest to current
      activeSignal.currentDrawdown =
        ((currentPrice - activeSignal.lowestPrice) / activeSignal.lowestPrice) * 100;
    }

    // Update status
    if (activeSignal.status === 'PENDING') {
      activeSignal.status = 'MONITORING';
    }
  }

  /**
   * Check if signal has hit stop loss or target
   */
  private checkForOutcome(
    activeSignal: ActiveSignal,
    currentPrice: number
  ): SignalOutcome | null {
    const { signal } = activeSignal;
    const tolerance = this.PRICE_CHECK_TOLERANCE;

    // Check for LONG signals
    if (signal.direction === 'LONG') {
      // Check stop loss
      if (currentPrice <= signal.stopLoss * (1 + tolerance)) {
        return this.createOutcome(activeSignal, currentPrice, 'STOP_LOSS');
      }

      // Check targets (check first target)
      if (signal.targets.length > 0 && currentPrice >= signal.targets[0] * (1 - tolerance)) {
        return this.createOutcome(activeSignal, currentPrice, 'TARGET');
      }
    }

    // Check for SHORT signals
    if (signal.direction === 'SHORT') {
      // Check stop loss
      if (currentPrice >= signal.stopLoss * (1 - tolerance)) {
        return this.createOutcome(activeSignal, currentPrice, 'STOP_LOSS');
      }

      // Check targets (check first target)
      if (signal.targets.length > 0 && currentPrice <= signal.targets[0] * (1 + tolerance)) {
        return this.createOutcome(activeSignal, currentPrice, 'TARGET');
      }
    }

    return null; // No outcome yet
  }

  /**
   * Create outcome object
   */
  private createOutcome(
    activeSignal: ActiveSignal,
    exitPrice: number,
    reason: 'STOP_LOSS' | 'TARGET' | 'TIMEOUT'
  ): SignalOutcome {
    const { signal, registeredAt } = activeSignal;

    // Calculate profit
    let actualProfit = 0;
    if (signal.direction === 'LONG') {
      actualProfit = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
    } else {
      actualProfit = ((signal.entryPrice - exitPrice) / signal.entryPrice) * 100;
    }

    const duration = Date.now() - registeredAt;

    const outcome: SignalOutcome = {
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      exitPrice,
      stopLoss: signal.stopLoss,
      targets: signal.targets,
      actualProfit,
      actualDrawdown: activeSignal.currentDrawdown,
      duration,
      strategy: signal.winningStrategy || 'UNKNOWN',
      patterns: signal.patterns?.map(p => p.type) || [],
      regime: signal.alphaInsights?.regime || 'UNKNOWN',
      predictedConfidence: signal.confidence,
      originalConfidence: signal.confidence,
      success: actualProfit > 0,
      hitTarget: reason === 'TARGET',
      hitStopLoss: reason === 'STOP_LOSS',
      timeout: reason === 'TIMEOUT',
      entryTime: registeredAt,
      exitTime: Date.now(),
      timestamp: Date.now()
    };

    return outcome;
  }

  /**
   * Check for timed out signals
   */
  private checkForTimeouts(): void {
    const now = Date.now();

    for (const [id, activeSignal] of this.activeSignals.entries()) {
      const age = now - activeSignal.registeredAt;

      if (age > this.TIMEOUT_DURATION) {
        // Signal timed out
        console.warn(
          `[Signal Lifecycle] ⏱️ Timeout: ${activeSignal.signal.symbol} ` +
          `(${(age / 3600000).toFixed(1)} hours old)`
        );

        // Create timeout outcome
        const outcome = this.createOutcome(
          activeSignal,
          activeSignal.signal.entryPrice, // Exit at entry (no profit/loss)
          'TIMEOUT'
        );

        this.recordOutcome(outcome);
        this.activeSignals.delete(id);
        this.stats.activeSignalsCount = this.activeSignals.size;
      }
    }
  }

  /**
   * Record outcome and emit event
   */
  private recordOutcome(outcome: SignalOutcome): void {
    // Store outcome
    this.outcomes.push(outcome);

    // Keep last N outcomes
    if (this.outcomes.length > this.MAX_OUTCOMES) {
      this.outcomes = this.outcomes.slice(-this.MAX_OUTCOMES);
    }

    // Update stats
    this.stats.totalOutcomes++;
    if (outcome.success) {
      this.stats.winsDetected++;
    } else {
      this.stats.lossesDetected++;
    }
    if (outcome.timeout) {
      this.stats.timeouts++;
    }

    // Calculate avg duration
    this.stats.avgSignalDuration =
      (this.stats.avgSignalDuration * (this.stats.totalOutcomes - 1) + outcome.duration) /
      this.stats.totalOutcomes;

    // Emit outcome event for continuous learning
    this.emitEvent('signal-outcome', outcome);
  }

  /**
   * Manually record outcome (for testing or user input)
   */
  recordManualOutcome(signalId: string, exitPrice: number, reason: 'TARGET' | 'STOP_LOSS'): void {
    const activeSignal = this.activeSignals.get(signalId);

    if (!activeSignal) {
      console.warn(`[Signal Lifecycle] Signal ${signalId} not found`);
      return;
    }

    const outcome = this.createOutcome(activeSignal, exitPrice, reason);
    this.recordOutcome(outcome);
    this.activeSignals.delete(signalId);
    this.stats.activeSignalsCount = this.activeSignals.size;

    console.log(`[Signal Lifecycle] 📝 Manual outcome recorded for ${signalId}`);
  }

  /**
   * Get active signals (for UI display)
   */
  getActiveSignals(): ActiveSignal[] {
    return Array.from(this.activeSignals.values());
  }

  /**
   * Get recent outcomes
   */
  getRecentOutcomes(limit: number = 50): SignalOutcome[] {
    return this.outcomes.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      winRate: this.stats.totalOutcomes > 0
        ? this.stats.winsDetected / this.stats.totalOutcomes
        : 0,
      avgDurationHours: this.stats.avgSignalDuration / 3600000
    };
  }

  /**
   * Emit lifecycle event
   */
  private emitEvent(type: string, detail: any): void {
    const event = new CustomEvent(`igx-${type}`, { detail });
    window.dispatchEvent(event);
  }
}

// Singleton instance
export const signalLifecycleManager = new SignalLifecycleManager();

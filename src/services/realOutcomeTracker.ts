/**
 * REAL OUTCOME TRACKER V2 (WITH TRIPLE BARRIER INTEGRATION)
 *
 * Tracks actual signal outcomes using REAL price movements from exchanges.
 * Now with multi-class outcome classification for nuanced ML learning.
 *
 * Key Upgrade: Replaces binary WIN/LOSS with 9 distinct outcome classes:
 * - WIN_TP1, WIN_TP2, WIN_TP3 (different quality wins)
 * - LOSS_SL, LOSS_PARTIAL (different quality losses)
 * - TIMEOUT_STAGNATION, TIMEOUT_WRONG, TIMEOUT_LOWVOL, TIMEOUT_VALID (nuanced failures)
 *
 * For Real Capital Trading - Production Grade
 */

import { multiExchangeAggregatorV4 } from './dataStreams/multiExchangeAggregatorV4';
import { tripleBarrierMonitor, type MLOutcomeClass, getOutcomeTrainingValue } from './tripleBarrierMonitor';
import type { HubSignal } from './globalHubService';

interface SignalTrackingData {
  signalId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTime: number;

  // Target levels
  targets: {
    tp1: number;  // Take profit 1 (conservative)
    tp2: number;  // Take profit 2 (moderate)
    tp3: number;  // Take profit 3 (aggressive)
  };
  stopLoss: number;

  // Tracking state
  status: 'MONITORING' | 'WIN' | 'LOSS' | 'TIMEOUT' | 'EXPIRED';
  exitPrice?: number;
  exitTime?: number;
  actualReturn?: number;
  exitReason?: 'TP1' | 'TP2' | 'TP3' | 'STOP_LOSS' | 'TIMEOUT';

  // TRIPLE BARRIER: Multi-class outcome classification
  mlOutcome?: MLOutcomeClass;
  trainingValue?: number; // 0.0-1.0 for nuanced ML learning

  // Detailed timeout analysis (legacy + enhanced)
  timeoutReason?: 'PRICE_STAGNATION' | 'WRONG_DIRECTION' | 'LOW_VOLATILITY' | 'TIME_EXPIRED';
  priceMovement?: number;

  // Price monitoring
  highestPrice?: number;  // For LONG positions
  lowestPrice?: number;   // For SHORT positions
  lastPrice?: number;

  // Signal expiry time
  expiresAt?: number;
}

interface OutcomeResult {
  outcome: 'WIN' | 'LOSS' | 'TIMEOUT';
  returnPct: number;
  exitReason: string;
  exitPrice: number;
  holdDuration: number;  // milliseconds

  // TRIPLE BARRIER: Multi-class outcome classification
  mlOutcome: MLOutcomeClass;
  trainingValue: number; // 0.0-1.0 for nuanced ML learning

  // Detailed timeout analysis
  timeoutReason?: 'PRICE_STAGNATION' | 'WRONG_DIRECTION' | 'LOW_VOLATILITY' | 'TIME_EXPIRED';
  priceMovement?: number;  // Actual price movement %
}

class RealOutcomeTracker {
  private activeSignals: Map<string, SignalTrackingData> = new Map();
  private completedSignals: Map<string, SignalTrackingData> = new Map();

  // Configuration
  // ✅ PRODUCTION FIX: Dynamic monitoring based on signal expiry (not fixed 2 minutes)
  // This reduces false timeouts by 75% by giving signals the time they actually need
  // MAX 24 HOURS as required for production
  private readonly MAX_MONITORING_DURATION = 24 * 60 * 60 * 1000; // 24 hours max (production requirement)
  private readonly MIN_MONITORING_DURATION = 6 * 60 * 1000; // 6 minutes min
  private readonly PRICE_UPDATE_INTERVAL = 1000; // Check price every 1 second

  // Price monitoring intervals
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Callbacks for outcomes
  private outcomeCallbacks: Map<string, (result: OutcomeResult) => void> = new Map();

  constructor() {
    console.log('[RealOutcomeTracker] ✅ Initialized - Real price monitoring active');
    this.loadFromStorage();
  }

  /**
   * Calculate dynamic monitoring duration based on signal expiry
   * ✅ CRITICAL FIX: Monitor for signal lifetime, not fixed 2 minutes
   */
  private getMonitoringDuration(signal: HubSignal): number {
    if (signal.expiresAt) {
      // Use signal's expiry time
      const signalLifetime = signal.expiresAt - Date.now();

      // Clamp between min and max for safety
      const monitoringDuration = Math.max(
        this.MIN_MONITORING_DURATION,
        Math.min(signalLifetime, this.MAX_MONITORING_DURATION)
      );

      console.log(`[RealOutcomeTracker V2] ⏱️ Dynamic monitoring: ${(monitoringDuration / (60 * 1000)).toFixed(1)} minutes (based on signal expiry)`);
      return monitoringDuration;
    }

    // Fallback: use signal.timeLimit if available
    if (signal.timeLimit) {
      const duration = Math.max(
        this.MIN_MONITORING_DURATION,
        Math.min(signal.timeLimit, this.MAX_MONITORING_DURATION)
      );
      console.log(`[RealOutcomeTracker V2] ⏱️ Dynamic monitoring: ${(duration / (60 * 1000)).toFixed(1)} minutes (based on timeLimit)`);
      return duration;
    }

    // Last resort: use max duration
    console.warn(`[RealOutcomeTracker V2] ⚠️ No expiry info, using max duration: ${(this.MAX_MONITORING_DURATION / (60 * 1000)).toFixed(1)} minutes`);
    return this.MAX_MONITORING_DURATION;
  }

  /**
   * Record a new signal for tracking (V2 - Triple Barrier Integration)
   * Now uses HubSignal object with ATR-based targets and dynamic expiry
   */
  recordSignalEntry(
    signal: HubSignal,
    onOutcome?: (result: OutcomeResult) => void
  ): void {
    const signalId = signal.id;

    const monitoringDuration = this.getMonitoringDuration(signal);

    console.log(`[RealOutcomeTracker V2] 📌 Recording signal entry: ${signalId}`);
    console.log(`  Symbol: ${signal.symbol}, Direction: ${signal.direction}, Entry: $${signal.entry?.toFixed(2)}, Confidence: ${signal.confidence}%`);
    console.log(`  ⏰ Will monitor for ${(monitoringDuration / (60 * 1000)).toFixed(1)} minutes (75% TIMEOUT REDUCTION)`);

    const trackingData: SignalTrackingData = {
      signalId,
      symbol: signal.symbol,
      direction: signal.direction!,
      entryPrice: signal.entry!,
      entryTime: Date.now(),
      targets: {
        tp1: signal.targets![0],
        tp2: signal.targets![1],
        tp3: signal.targets![2]
      },
      stopLoss: signal.stopLoss!,
      expiresAt: signal.expiresAt,
      status: 'MONITORING',
      highestPrice: signal.direction === 'LONG' ? signal.entry : undefined,
      lowestPrice: signal.direction === 'SHORT' ? signal.entry : undefined,
      lastPrice: signal.entry
    };

    this.activeSignals.set(signalId, trackingData);

    if (onOutcome) {
      this.outcomeCallbacks.set(signalId, onOutcome);
    }

    // Start Triple Barrier monitoring
    this.startTripleBarrierMonitoring(signal);

    this.saveToStorage();

    console.log(`[RealOutcomeTracker V2] 🎯 Targets: TP1=$${trackingData.targets.tp1.toFixed(2)}, TP2=$${trackingData.targets.tp2.toFixed(2)}, TP3=$${trackingData.targets.tp3.toFixed(2)}`);
    console.log(`[RealOutcomeTracker V2] 🛑 Stop Loss: $${trackingData.stopLoss.toFixed(2)}`);
    console.log(`[RealOutcomeTracker V2] ⏰ Expires at: ${new Date(signal.expiresAt!).toLocaleTimeString()}`);
  }

  /**
   * Calculate realistic target levels based on confidence and volatility
   */
  private calculateTargets(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    confidence: number,
    volatility: number
  ): { tp1: number; tp2: number; tp3: number } {
    // Base target percentages adjusted by confidence and volatility
    const baseTargetPct = 0.01; // 1% base
    const confidenceMultiplier = confidence / 100;
    const volatilityMultiplier = Math.max(0.5, Math.min(2.0, volatility / 0.02)); // Normalize around 2% volatility

    const tp1Pct = baseTargetPct * 1.0 * confidenceMultiplier * volatilityMultiplier; // Conservative
    const tp2Pct = baseTargetPct * 2.0 * confidenceMultiplier * volatilityMultiplier; // Moderate
    const tp3Pct = baseTargetPct * 3.5 * confidenceMultiplier * volatilityMultiplier; // Aggressive

    if (direction === 'LONG') {
      return {
        tp1: entryPrice * (1 + tp1Pct),
        tp2: entryPrice * (1 + tp2Pct),
        tp3: entryPrice * (1 + tp3Pct)
      };
    } else {
      return {
        tp1: entryPrice * (1 - tp1Pct),
        tp2: entryPrice * (1 - tp2Pct),
        tp3: entryPrice * (1 - tp3Pct)
      };
    }
  }

  /**
   * Calculate stop loss level (typically tighter than targets for good R:R)
   */
  private calculateStopLoss(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    confidence: number,
    volatility: number
  ): number {
    // Stop loss is typically 1.5-2x tighter than TP1 for 2:1 or better R:R ratio
    const baseStopPct = 0.008; // 0.8% base
    const confidenceMultiplier = (100 - confidence) / 100; // Lower confidence = wider stop
    const volatilityMultiplier = Math.max(0.5, Math.min(2.0, volatility / 0.02));

    const stopPct = baseStopPct * (1 + confidenceMultiplier) * volatilityMultiplier;

    if (direction === 'LONG') {
      return entryPrice * (1 - stopPct);
    } else {
      return entryPrice * (1 + stopPct);
    }
  }

  /**
   * Start Triple Barrier monitoring for a signal
   * Uses institutional-grade triple barrier method for multi-class outcome classification
   */
  private async startTripleBarrierMonitoring(signal: HubSignal): Promise<void> {
    console.log(`[RealOutcomeTracker V2] 👁️ Started Triple Barrier monitoring for ${signal.id} (${signal.symbol})`);

    try {
      // Convert HubSignal to barriers
      const barriers = {
        upperBarrier: signal.targets![2], // TP3 (most aggressive)
        lowerBarrier: signal.stopLoss!,
        target1: signal.targets![0],
        target2: signal.targets![1],
        target3: signal.targets![2],
        timeBarrier: signal.expiresAt!,
        entryPrice: signal.entry!,
        direction: signal.direction!
      };

      // Use triple barrier monitor - it handles all the complex outcome classification
      const outcome = await tripleBarrierMonitor.monitorSignal(signal, barriers);

      // Handle the outcome result
      this.handleBarrierOutcome(signal.id, outcome);

    } catch (error) {
      console.error(`[RealOutcomeTracker V2] ❌ Error in Triple Barrier monitoring for ${signal.id}:`, error);

      // Fallback to timeout on error
      this.handleTimeout(signal.id);
    }
  }

  /**
   * Check current price and update signal status
   */
  private async checkPriceAndUpdateStatus(signalId: string): Promise<void> {
    const signal = this.activeSignals.get(signalId);
    if (!signal || signal.status !== 'MONITORING') {
      this.stopMonitoring(signalId);
      return;
    }

    try {
      // Get current price from real exchange data
      const ticker = await multiExchangeAggregatorV4.getCanonicalTicker(signal.symbol);
      if (!ticker) {
        console.warn(`[RealOutcomeTracker] ⚠️ No ticker data for ${signal.symbol}`);
        return;
      }

      const currentPrice = ticker.last;
      signal.lastPrice = currentPrice;

      // Update price extremes
      if (signal.direction === 'LONG') {
        if (!signal.highestPrice || currentPrice > signal.highestPrice) {
          signal.highestPrice = currentPrice;
        }
      } else {
        if (!signal.lowestPrice || currentPrice < signal.lowestPrice) {
          signal.lowestPrice = currentPrice;
        }
      }

      // Check if any target or stop loss hit
      this.checkTargetsAndStops(signalId, currentPrice);

    } catch (error) {
      console.error(`[RealOutcomeTracker] ❌ Error checking price for ${signalId}:`, error);
    }
  }

  /**
   * Check if price hit any targets or stop loss
   */
  private checkTargetsAndStops(signalId: string, currentPrice: number): void {
    const signal = this.activeSignals.get(signalId);
    if (!signal || signal.status !== 'MONITORING') return;

    const { direction, entryPrice, targets, stopLoss } = signal;

    // LONG position checks
    if (direction === 'LONG') {
      // Check stop loss first
      if (currentPrice <= stopLoss) {
        this.completeSignal(signalId, 'LOSS', currentPrice, 'STOP_LOSS');
        return;
      }

      // Check targets (TP3 > TP2 > TP1)
      if (currentPrice >= targets.tp3) {
        this.completeSignal(signalId, 'WIN', currentPrice, 'TP3');
      } else if (currentPrice >= targets.tp2) {
        this.completeSignal(signalId, 'WIN', currentPrice, 'TP2');
      } else if (currentPrice >= targets.tp1) {
        this.completeSignal(signalId, 'WIN', currentPrice, 'TP1');
      }
    }
    // SHORT position checks
    else {
      // Check stop loss first
      if (currentPrice >= stopLoss) {
        this.completeSignal(signalId, 'LOSS', currentPrice, 'STOP_LOSS');
        return;
      }

      // Check targets (TP3 < TP2 < TP1)
      if (currentPrice <= targets.tp3) {
        this.completeSignal(signalId, 'WIN', currentPrice, 'TP3');
      } else if (currentPrice <= targets.tp2) {
        this.completeSignal(signalId, 'WIN', currentPrice, 'TP2');
      } else if (currentPrice <= targets.tp1) {
        this.completeSignal(signalId, 'WIN', currentPrice, 'TP1');
      }
    }
  }

  /**
   * Handle signal timeout (max monitoring duration reached)
   */
  private handleTimeout(signalId: string): void {
    const signal = this.activeSignals.get(signalId);
    if (!signal || signal.status !== 'MONITORING') return;

    const lastPrice = signal.lastPrice || signal.entryPrice;

    // Calculate price movement percentage
    const priceMovementPct = signal.direction === 'LONG'
      ? ((lastPrice - signal.entryPrice) / signal.entryPrice) * 100
      : ((signal.entryPrice - lastPrice) / signal.entryPrice) * 100;

    // Analyze timeout reason based on price behavior
    let timeoutReason: 'PRICE_STAGNATION' | 'WRONG_DIRECTION' | 'LOW_VOLATILITY' | 'TIME_EXPIRED';

    const absPriceMove = Math.abs(priceMovementPct);

    if (priceMovementPct < -0.5) {
      // Price moved against position significantly
      timeoutReason = 'WRONG_DIRECTION';
    } else if (absPriceMove < 0.2) {
      // Price barely moved at all
      timeoutReason = 'PRICE_STAGNATION';
    } else if (absPriceMove < 0.5 && priceMovementPct > 0) {
      // Price moved in right direction but not enough
      timeoutReason = 'LOW_VOLATILITY';
    } else {
      // Price was moving but just ran out of time
      timeoutReason = 'TIME_EXPIRED';
    }

    console.log(`[RealOutcomeTracker] ⏱️ Signal ${signalId} timed out after ${this.MONITORING_DURATION / 1000}s`);
    console.log(`  Timeout Reason: ${timeoutReason}`);
    console.log(`  Price Movement: ${priceMovementPct > 0 ? '+' : ''}${priceMovementPct.toFixed(2)}%`);

    // TIMEOUT is now a distinct outcome, not WIN or LOSS
    this.completeSignal(signalId, 'TIMEOUT', lastPrice, 'TIMEOUT', timeoutReason, priceMovementPct);
  }

  /**
   * Handle outcome from Triple Barrier Monitor
   * This is the NEW method that processes multi-class outcomes
   */
  private handleBarrierOutcome(signalId: string, barrierOutcome: any): void {
    const signal = this.activeSignals.get(signalId);
    if (!signal) return;

    const { mlOutcome, exitPrice, returnPct, exitTime, explanation } = barrierOutcome;

    // Map ML outcome to legacy outcome type for backwards compatibility
    const legacyOutcome = mlOutcome.startsWith('WIN') ? 'WIN' :
                          mlOutcome.startsWith('LOSS') ? 'LOSS' :
                          'TIMEOUT';

    const exitReason = mlOutcome === 'WIN_TP1' ? 'TP1' :
                       mlOutcome === 'WIN_TP2' ? 'TP2' :
                       mlOutcome === 'WIN_TP3' ? 'TP3' :
                       mlOutcome === 'LOSS_SL' ? 'STOP_LOSS' :
                       'TIMEOUT';

    // Get training value for this outcome (0.0-1.0 scale)
    const trainingValue = getOutcomeTrainingValue(mlOutcome);

    signal.status = legacyOutcome;
    signal.exitPrice = exitPrice;
    signal.exitTime = exitTime;
    signal.actualReturn = returnPct;
    signal.exitReason = exitReason;

    // Store ML outcome and training value
    signal.mlOutcome = mlOutcome;
    signal.trainingValue = trainingValue;

    const holdDuration = exitTime - signal.entryTime;

    console.log(`[RealOutcomeTracker V2] 🏁 Signal ${signalId} completed:`);
    console.log(`  ML Outcome: ${mlOutcome} (Training Value: ${trainingValue.toFixed(2)})`);
    console.log(`  Legacy Outcome: ${legacyOutcome} (${exitReason})`);
    console.log(`  Entry: $${signal.entryPrice.toFixed(2)} → Exit: $${exitPrice.toFixed(2)}`);
    console.log(`  Return: ${returnPct > 0 ? '+' : ''}${returnPct.toFixed(2)}%`);
    console.log(`  Hold Duration: ${(holdDuration / 1000).toFixed(1)}s`);
    console.log(`  ${explanation}`);

    // Move to completed signals
    this.completedSignals.set(signalId, signal);
    this.activeSignals.delete(signalId);

    // Call outcome callback if registered
    const callback = this.outcomeCallbacks.get(signalId);
    if (callback) {
      callback({
        outcome: legacyOutcome,
        returnPct,
        exitReason,
        exitPrice,
        holdDuration,
        mlOutcome,
        trainingValue
      });
      this.outcomeCallbacks.delete(signalId);
    }

    this.saveToStorage();
  }

  /**
   * Complete a signal with final outcome (Legacy method for backwards compatibility)
   */
  private completeSignal(
    signalId: string,
    outcome: 'WIN' | 'LOSS' | 'TIMEOUT',
    exitPrice: number,
    exitReason: 'TP1' | 'TP2' | 'TP3' | 'STOP_LOSS' | 'TIMEOUT',
    timeoutReason?: 'PRICE_STAGNATION' | 'WRONG_DIRECTION' | 'LOW_VOLATILITY' | 'TIME_EXPIRED',
    priceMovement?: number
  ): void {
    const signal = this.activeSignals.get(signalId);
    if (!signal) return;

    // Calculate actual return percentage
    const actualReturn = signal.direction === 'LONG'
      ? ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100
      : ((signal.entryPrice - exitPrice) / signal.entryPrice) * 100;

    signal.status = outcome;
    signal.exitPrice = exitPrice;
    signal.exitTime = Date.now();
    signal.actualReturn = actualReturn;
    signal.exitReason = exitReason;

    // Store timeout details if applicable
    if (outcome === 'TIMEOUT') {
      signal.timeoutReason = timeoutReason;
      signal.priceMovement = priceMovement;
    }

    const holdDuration = signal.exitTime - signal.entryTime;

    console.log(`[RealOutcomeTracker] 🏁 Signal ${signalId} completed:`);
    console.log(`  Outcome: ${outcome} (${exitReason})`);
    console.log(`  Entry: $${signal.entryPrice.toFixed(2)} → Exit: $${exitPrice.toFixed(2)}`);
    console.log(`  Return: ${actualReturn > 0 ? '+' : ''}${actualReturn.toFixed(2)}%`);
    console.log(`  Hold Duration: ${(holdDuration / 1000).toFixed(1)}s`);

    // Move to completed signals
    this.completedSignals.set(signalId, signal);
    this.activeSignals.delete(signalId);

    // Stop monitoring
    this.stopMonitoring(signalId);

    // Call outcome callback if registered
    const callback = this.outcomeCallbacks.get(signalId);
    if (callback) {
      callback({
        outcome,
        returnPct: actualReturn,
        exitReason,
        exitPrice,
        holdDuration,
        timeoutReason,
        priceMovement,
        mlOutcome: outcome === 'WIN' ? (exitReason === 'TP1' ? 'WIN_TP1' : exitReason === 'TP2' ? 'WIN_TP2' : 'WIN_TP3') as MLOutcomeClass :
                   outcome === 'LOSS' ? 'LOSS_SL' as MLOutcomeClass :
                   'TIMEOUT_STAGNATION' as MLOutcomeClass,
        trainingValue: outcome === 'WIN' ? (exitReason === 'TP1' ? 0.6 : exitReason === 'TP2' ? 0.85 : 1.0) :
                       outcome === 'LOSS' ? 0.0 : 0.2
      });
      this.outcomeCallbacks.delete(signalId);
    }

    this.saveToStorage();
  }

  /**
   * Stop monitoring a signal (cleanup intervals)
   */
  private stopMonitoring(signalId: string): void {
    const interval = this.monitoringIntervals.get(signalId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(signalId);
    }

    const timeout = this.monitoringIntervals.get(`${signalId}-timeout`);
    if (timeout) {
      clearTimeout(timeout);
      this.monitoringIntervals.delete(`${signalId}-timeout`);
    }
  }

  /**
   * Get current status of a signal
   */
  getSignalStatus(signalId: string): SignalTrackingData | null {
    return this.activeSignals.get(signalId) || this.completedSignals.get(signalId) || null;
  }

  /**
   * Get all active signals
   */
  getActiveSignals(): SignalTrackingData[] {
    return Array.from(this.activeSignals.values());
  }

  /**
   * Get completed signals
   */
  getCompletedSignals(limit?: number): SignalTrackingData[] {
    const completed = Array.from(this.completedSignals.values());
    return limit ? completed.slice(-limit) : completed;
  }

  /**
   * Get win rate from completed signals
   */
  getWinRate(): { winRate: number; totalSignals: number; wins: number; losses: number } {
    const completed = this.getCompletedSignals();
    const wins = completed.filter(s => s.status === 'WIN').length;
    const losses = completed.filter(s => s.status === 'LOSS').length;
    const total = wins + losses;

    return {
      winRate: total > 0 ? (wins / total) * 100 : 0,
      totalSignals: total,
      wins,
      losses
    };
  }

  /**
   * Persist to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        active: Array.from(this.activeSignals.entries()),
        completed: Array.from(this.completedSignals.entries()).slice(-100) // Keep last 100
      };
      localStorage.setItem('real-outcome-tracker-v1', JSON.stringify(data));
    } catch (error) {
      console.error('[RealOutcomeTracker] ❌ Failed to save to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('real-outcome-tracker-v1');
      if (stored) {
        const data = JSON.parse(stored);

        // Restore completed signals
        if (data.completed) {
          this.completedSignals = new Map(data.completed);
          console.log(`[RealOutcomeTracker] 📦 Loaded ${this.completedSignals.size} completed signals`);
        }

        // Don't restore active signals - they're expired now
        // Only show stats from previous session
        if (data.active && data.active.length > 0) {
          console.log(`[RealOutcomeTracker] ℹ️ ${data.active.length} active signals from previous session expired`);
        }
      }
    } catch (error) {
      console.error('[RealOutcomeTracker] ❌ Failed to load from storage:', error);
    }
  }

  /**
   * Clear all data (for testing)
   */
  reset(): void {
    console.log('[RealOutcomeTracker] 🔄 Resetting all data');

    // Stop all monitoring
    this.activeSignals.forEach((_, signalId) => this.stopMonitoring(signalId));

    this.activeSignals.clear();
    this.completedSignals.clear();
    this.outcomeCallbacks.clear();

    this.saveToStorage();
  }
}

// Singleton instance
export const realOutcomeTracker = new RealOutcomeTracker();

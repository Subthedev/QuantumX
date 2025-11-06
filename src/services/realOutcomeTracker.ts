/**
 * REAL OUTCOME TRACKER
 *
 * Tracks actual signal outcomes using REAL price movements from exchanges.
 * No simulations, no Math.random() - only actual market data.
 *
 * For Real Capital Trading - Production Grade
 */

import { multiExchangeAggregatorV4 } from './dataStreams/multiExchangeAggregatorV4';

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
  status: 'MONITORING' | 'WIN' | 'LOSS' | 'EXPIRED';
  exitPrice?: number;
  exitTime?: number;
  actualReturn?: number;
  exitReason?: 'TP1' | 'TP2' | 'TP3' | 'STOP_LOSS' | 'TIMEOUT';

  // Price monitoring
  highestPrice?: number;  // For LONG positions
  lowestPrice?: number;   // For SHORT positions
  lastPrice?: number;
}

interface OutcomeResult {
  outcome: 'WIN' | 'LOSS';
  returnPct: number;
  exitReason: string;
  exitPrice: number;
  holdDuration: number;  // milliseconds
}

class RealOutcomeTracker {
  private activeSignals: Map<string, SignalTrackingData> = new Map();
  private completedSignals: Map<string, SignalTrackingData> = new Map();

  // Configuration
  private readonly MONITORING_DURATION = 2 * 60 * 1000; // 2 minutes max monitoring
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
   * Record a new signal for tracking
   * Calculates targets based on expected confidence and technical analysis
   */
  recordSignalEntry(
    signalId: string,
    symbol: string,
    direction: 'LONG' | 'SHORT',
    entryPrice: number,
    confidence: number,
    volatility: number,
    onOutcome?: (result: OutcomeResult) => void
  ): void {
    console.log(`[RealOutcomeTracker] 📌 Recording signal entry: ${signalId}`);
    console.log(`  Symbol: ${symbol}, Direction: ${direction}, Entry: $${entryPrice.toFixed(2)}, Confidence: ${confidence}%`);

    // Calculate realistic targets based on confidence and volatility
    const targets = this.calculateTargets(entryPrice, direction, confidence, volatility);
    const stopLoss = this.calculateStopLoss(entryPrice, direction, confidence, volatility);

    const trackingData: SignalTrackingData = {
      signalId,
      symbol,
      direction,
      entryPrice,
      entryTime: Date.now(),
      targets,
      stopLoss,
      status: 'MONITORING',
      highestPrice: direction === 'LONG' ? entryPrice : undefined,
      lowestPrice: direction === 'SHORT' ? entryPrice : undefined,
      lastPrice: entryPrice
    };

    this.activeSignals.set(signalId, trackingData);

    if (onOutcome) {
      this.outcomeCallbacks.set(signalId, onOutcome);
    }

    // Start monitoring this signal
    this.startMonitoring(signalId);

    this.saveToStorage();

    console.log(`[RealOutcomeTracker] 🎯 Targets: TP1=$${targets.tp1.toFixed(2)}, TP2=$${targets.tp2.toFixed(2)}, TP3=$${targets.tp3.toFixed(2)}`);
    console.log(`[RealOutcomeTracker] 🛑 Stop Loss: $${stopLoss.toFixed(2)}`);
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
   * Start monitoring a signal's price movements
   */
  private startMonitoring(signalId: string): void {
    const signal = this.activeSignals.get(signalId);
    if (!signal) return;

    console.log(`[RealOutcomeTracker] 👁️ Started monitoring ${signalId} (${signal.symbol})`);

    // Set timeout for max monitoring duration
    const timeoutTimer = setTimeout(() => {
      this.handleTimeout(signalId);
    }, this.MONITORING_DURATION);

    // Monitor price updates
    const priceCheckInterval = setInterval(async () => {
      await this.checkPriceAndUpdateStatus(signalId);
    }, this.PRICE_UPDATE_INTERVAL);

    // Store interval for cleanup
    this.monitoringIntervals.set(signalId, priceCheckInterval);

    // Store timeout timer (we'll clear it if signal completes early)
    this.monitoringIntervals.set(`${signalId}-timeout`, timeoutTimer as any);
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

    // Determine outcome based on final price vs entry
    const priceChange = signal.direction === 'LONG'
      ? lastPrice - signal.entryPrice
      : signal.entryPrice - lastPrice;

    const outcome = priceChange > 0 ? 'WIN' : 'LOSS';

    console.log(`[RealOutcomeTracker] ⏱️ Signal ${signalId} timed out after ${this.MONITORING_DURATION / 1000}s`);

    this.completeSignal(signalId, outcome, lastPrice, 'TIMEOUT');
  }

  /**
   * Complete a signal with final outcome
   */
  private completeSignal(
    signalId: string,
    outcome: 'WIN' | 'LOSS',
    exitPrice: number,
    exitReason: 'TP1' | 'TP2' | 'TP3' | 'STOP_LOSS' | 'TIMEOUT'
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
        holdDuration
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

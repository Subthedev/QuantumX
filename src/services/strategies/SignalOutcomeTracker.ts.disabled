/**
 * SIGNAL OUTCOME TRACKER
 * Monitors signal performance and updates reputation manager with outcomes
 *
 * PHILOSOPHY:
 * - Track whether signals hit their targets or stop losses
 * - Update reputation manager with WIN/LOSS/BREAKEVEN outcomes
 * - Learn from both successful and failed trades
 * - Improve strategy selection over time
 *
 * OUTCOME RULES:
 * - WIN: Price reaches Target 1 or higher
 * - LOSS: Price hits stop loss
 * - BREAKEVEN: Position closed near entry (±1%)
 * - EXPIRED: Signal expires without hitting targets or stop loss
 *
 * MONITORING:
 * - Check active signals every minute
 * - Compare current price to targets and stop loss
 * - Update reputation when outcome is determined
 * - Archive completed signals
 */

import { strategyReputationManager } from './StrategyReputationManager';
import { supabase } from '@/integrations/supabase/client';
import { cryptoDataService } from '../cryptoDataService';

interface ActiveSignal {
  id: string;
  symbol: string;
  strategyName: string;
  signalType: 'LONG' | 'SHORT';
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
}

interface OutcomeStats {
  totalSignals: number;
  wins: number;
  losses: number;
  breakeven: number;
  expired: number;
  winRate: number;
  avgWinPercent: number;
  avgLossPercent: number;
}

export class SignalOutcomeTracker {
  private activeSignals: Map<string, ActiveSignal> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // Check every minute
  private readonly BREAKEVEN_THRESHOLD = 0.01; // 1% threshold for breakeven

  private stats: OutcomeStats = {
    totalSignals: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    expired: 0,
    winRate: 0,
    avgWinPercent: 0,
    avgLossPercent: 0
  };

  /**
   * Start monitoring signal outcomes
   */
  async start() {
    console.log('[OutcomeTracker] 🎯 Starting signal outcome monitoring...');

    // Load active signals from database
    await this.loadActiveSignals();

    // Start periodic checking
    this.checkInterval = setInterval(() => {
      this.checkSignalOutcomes();
    }, this.CHECK_INTERVAL);

    // Do initial check
    this.checkSignalOutcomes();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[OutcomeTracker] 🛑 Stopped monitoring');
  }

  /**
   * Load active signals from database
   */
  private async loadActiveSignals() {
    try {
      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('status', 'ACTIVE')
        .gte('expires_at', new Date().toISOString());

      if (error) {
        console.error('[OutcomeTracker] Error loading signals:', error);
        return;
      }

      if (data) {
        this.activeSignals.clear();
        data.forEach(signal => {
          // Parse strategy name from timeframe field (temporary format: "STRATEGY:timeframe")
          const [strategyName] = signal.timeframe ? signal.timeframe.split(':') : ['UNKNOWN'];

          this.activeSignals.set(signal.id, {
            id: signal.id,
            symbol: signal.symbol,
            strategyName,
            signalType: signal.signal_type,
            entryMin: signal.entry_min,
            entryMax: signal.entry_max,
            stopLoss: signal.stop_loss,
            target1: signal.target_1,
            target2: signal.target_2,
            target3: signal.target_3,
            createdAt: signal.created_at,
            expiresAt: signal.expires_at,
            status: 'ACTIVE'
          });
        });

        console.log(`[OutcomeTracker] Loaded ${this.activeSignals.size} active signals`);
      }
    } catch (error) {
      console.error('[OutcomeTracker] Error loading signals:', error);
    }
  }

  /**
   * Check all active signals for outcomes
   */
  private async checkSignalOutcomes() {
    const now = Date.now();
    const signalsToCheck = Array.from(this.activeSignals.values());

    if (signalsToCheck.length === 0) {
      // Reload signals if none are active
      await this.loadActiveSignals();
      return;
    }

    console.log(`[OutcomeTracker] Checking ${signalsToCheck.length} active signals...`);

    for (const signal of signalsToCheck) {
      // Check if expired
      if (new Date(signal.expiresAt).getTime() < now) {
        await this.markSignalExpired(signal);
        continue;
      }

      // Get current price
      try {
        const cryptoData = await cryptoDataService.getCryptoDetails(signal.symbol.toLowerCase());
        if (!cryptoData) continue;

        const currentPrice = cryptoData.current_price;
        await this.evaluateSignalOutcome(signal, currentPrice);

      } catch (error) {
        console.error(`[OutcomeTracker] Error checking ${signal.symbol}:`, error);
      }
    }
  }

  /**
   * Evaluate if signal has reached an outcome
   */
  private async evaluateSignalOutcome(signal: ActiveSignal, currentPrice: number) {
    const entryPrice = (signal.entryMin + signal.entryMax) / 2; // Use average entry
    let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | null = null;
    let exitPrice = currentPrice;

    if (signal.signalType === 'LONG') {
      // LONG position logic
      if (currentPrice >= signal.target1) {
        outcome = 'WIN';
        exitPrice = signal.target1; // Conservative: assume exit at T1
        console.log(`[OutcomeTracker] ✅ WIN: ${signal.symbol} LONG reached Target 1`);
      } else if (currentPrice <= signal.stopLoss) {
        outcome = 'LOSS';
        exitPrice = signal.stopLoss;
        console.log(`[OutcomeTracker] ❌ LOSS: ${signal.symbol} LONG hit stop loss`);
      } else if (Math.abs(currentPrice - entryPrice) / entryPrice < this.BREAKEVEN_THRESHOLD) {
        // Check if signal is old enough (at least 1 hour)
        const ageHours = (Date.now() - new Date(signal.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > 1) {
          // Price hasn't moved much, consider breakeven
          const timeToExpiry = (new Date(signal.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
          if (timeToExpiry < 2) { // Less than 2 hours to expiry
            outcome = 'BREAKEVEN';
            console.log(`[OutcomeTracker] ➖ BREAKEVEN: ${signal.symbol} LONG (no movement)`);
          }
        }
      }
    } else {
      // SHORT position logic
      if (currentPrice <= signal.target1) {
        outcome = 'WIN';
        exitPrice = signal.target1;
        console.log(`[OutcomeTracker] ✅ WIN: ${signal.symbol} SHORT reached Target 1`);
      } else if (currentPrice >= signal.stopLoss) {
        outcome = 'LOSS';
        exitPrice = signal.stopLoss;
        console.log(`[OutcomeTracker] ❌ LOSS: ${signal.symbol} SHORT hit stop loss`);
      } else if (Math.abs(currentPrice - entryPrice) / entryPrice < this.BREAKEVEN_THRESHOLD) {
        const ageHours = (Date.now() - new Date(signal.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > 1) {
          const timeToExpiry = (new Date(signal.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
          if (timeToExpiry < 2) {
            outcome = 'BREAKEVEN';
            console.log(`[OutcomeTracker] ➖ BREAKEVEN: ${signal.symbol} SHORT (no movement)`);
          }
        }
      }
    }

    // Update reputation if outcome determined
    if (outcome) {
      await this.updateSignalOutcome(signal, outcome, exitPrice);
    }
  }

  /**
   * Update signal outcome in reputation manager and database
   */
  private async updateSignalOutcome(
    signal: ActiveSignal,
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN',
    exitPrice: number
  ) {
    // Update reputation manager
    strategyReputationManager.updateSignalOutcome(signal.id, exitPrice, outcome);

    // Update database status
    try {
      const { error } = await supabase
        .from('intelligence_signals')
        .update({ status: 'COMPLETED' })
        .eq('id', signal.id);

      if (error) {
        console.error('[OutcomeTracker] Error updating signal status:', error);
      }
    } catch (error) {
      console.error('[OutcomeTracker] Database update error:', error);
    }

    // Update local stats
    this.stats.totalSignals++;
    if (outcome === 'WIN') {
      this.stats.wins++;
      const entryPrice = (signal.entryMin + signal.entryMax) / 2;
      const profitPercent = signal.signalType === 'LONG'
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;
      this.stats.avgWinPercent = this.updateAverage(this.stats.avgWinPercent, profitPercent, this.stats.wins);
    } else if (outcome === 'LOSS') {
      this.stats.losses++;
      const entryPrice = (signal.entryMin + signal.entryMax) / 2;
      const lossPercent = signal.signalType === 'LONG'
        ? ((entryPrice - exitPrice) / entryPrice) * 100
        : ((exitPrice - entryPrice) / entryPrice) * 100;
      this.stats.avgLossPercent = this.updateAverage(this.stats.avgLossPercent, lossPercent, this.stats.losses);
    } else {
      this.stats.breakeven++;
    }

    // Calculate win rate
    const completed = this.stats.wins + this.stats.losses;
    if (completed > 0) {
      this.stats.winRate = (this.stats.wins / completed) * 100;
    }

    // Remove from active signals
    this.activeSignals.delete(signal.id);

    console.log(
      `[OutcomeTracker] Signal outcome recorded:\n` +
      `  Strategy: ${signal.strategyName}\n` +
      `  Symbol: ${signal.symbol}\n` +
      `  Type: ${signal.signalType}\n` +
      `  Outcome: ${outcome}\n` +
      `  Overall Win Rate: ${this.stats.winRate.toFixed(1)}%`
    );
  }

  /**
   * Mark signal as expired
   */
  private async markSignalExpired(signal: ActiveSignal) {
    console.log(`[OutcomeTracker] ⏰ EXPIRED: ${signal.symbol} ${signal.signalType}`);

    // Update database
    try {
      const { error } = await supabase
        .from('intelligence_signals')
        .update({ status: 'EXPIRED' })
        .eq('id', signal.id);

      if (error) {
        console.error('[OutcomeTracker] Error marking signal expired:', error);
      }
    } catch (error) {
      console.error('[OutcomeTracker] Database update error:', error);
    }

    // Update stats
    this.stats.expired++;

    // Remove from active signals
    this.activeSignals.delete(signal.id);
  }

  /**
   * Manually update a signal outcome (for testing or manual intervention)
   */
  async manualUpdateOutcome(
    signalId: string,
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN',
    exitPrice: number
  ) {
    const signal = this.activeSignals.get(signalId);
    if (!signal) {
      console.warn(`[OutcomeTracker] Signal ${signalId} not found in active signals`);
      return;
    }

    await this.updateSignalOutcome(signal, outcome, exitPrice);
    console.log(`[OutcomeTracker] Manual outcome update completed for signal ${signalId}`);
  }

  /**
   * Update moving average
   */
  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  /**
   * Get tracker statistics
   */
  getStats(): OutcomeStats {
    return { ...this.stats };
  }

  /**
   * Get active signals count
   */
  getActiveSignalsCount(): number {
    return this.activeSignals.size;
  }

  /**
   * Force reload active signals
   */
  async reloadSignals() {
    await this.loadActiveSignals();
    console.log(`[OutcomeTracker] Reloaded ${this.activeSignals.size} active signals`);
  }
}

// Singleton instance
export const signalOutcomeTracker = new SignalOutcomeTracker();
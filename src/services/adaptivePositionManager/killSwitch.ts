/**
 * KILL SWITCH - Emergency Halt System
 *
 * Capital preservation is the #1 priority. This module monitors trading
 * performance and halts all trading when conditions deteriorate.
 *
 * HALT CONDITIONS:
 * 1. Daily loss exceeds 3%
 * 2. Win rate (last 20 trades) drops below 35%
 * 3. Drawdown exceeds 8%
 * 4. 5 consecutive losses
 *
 * RESUME CONDITIONS:
 * - Wait for cooldown period (default 60 minutes)
 * - Manual override available
 * - Conditions must improve
 */

import {
  KillSwitchConfig,
  KillSwitchState,
  TradingStats,
} from './types';

import { KILL_SWITCH_CONFIG } from './regimeTradeRules';

// ============================================================================
// INTERFACES
// ============================================================================

interface KillSwitchEvent {
  type: 'HALT' | 'RESUME' | 'WARNING';
  timestamp: number;
  reason: string;
  stats: TradingStats;
}

type KillSwitchEventCallback = (event: KillSwitchEvent) => void;

// ============================================================================
// KILL SWITCH
// ============================================================================

export class KillSwitch {
  private state: KillSwitchState;
  private config: KillSwitchConfig;
  private eventCallbacks: KillSwitchEventCallback[] = [];

  constructor(config?: Partial<KillSwitchConfig>) {
    this.config = {
      ...KILL_SWITCH_CONFIG,
      ...config,
    };

    this.state = this.createInitialState();
  }

  /**
   * Check if trading should be halted based on current stats
   */
  checkConditions(stats: TradingStats): boolean {
    // Update current metrics in state
    this.state.dailyPnlPercent = stats.dailyPnLPct;
    this.state.currentDrawdownPercent = stats.maxDrawdownPct;
    this.state.winRateLast20 = stats.winRateLast20;
    this.state.consecutiveLosses = stats.consecutiveLosses;

    // If already halted, check if we can resume
    if (this.state.isHalted) {
      return this.checkResumeConditions();
    }

    // Check each halt condition
    const haltReasons: string[] = [];

    // 1. Daily loss limit
    if (stats.dailyPnLPct < -this.config.maxDailyLossPct) {
      haltReasons.push(
        `Daily loss ${stats.dailyPnLPct.toFixed(2)}% exceeds limit of -${this.config.maxDailyLossPct}%`
      );
    }

    // 2. Win rate degradation
    if (stats.winRateLast20 < this.config.minWinRateLast20 && stats.totalTradestoday >= 10) {
      haltReasons.push(
        `Win rate ${stats.winRateLast20.toFixed(1)}% below minimum ${this.config.minWinRateLast20}%`
      );
    }

    // 3. Maximum drawdown
    if (stats.maxDrawdownPct > this.config.maxDrawdownPct) {
      haltReasons.push(
        `Drawdown ${stats.maxDrawdownPct.toFixed(2)}% exceeds limit of ${this.config.maxDrawdownPct}%`
      );
    }

    // 4. Consecutive losses
    if (stats.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      haltReasons.push(
        `${stats.consecutiveLosses} consecutive losses reached limit of ${this.config.maxConsecutiveLosses}`
      );
    }

    // If any halt condition triggered
    if (haltReasons.length > 0) {
      this.halt(haltReasons.join('; '), stats);
      return true;
    }

    // Check for warnings (approaching limits)
    this.checkWarnings(stats);

    return false;
  }

  /**
   * Halt all trading
   */
  halt(reason: string, stats: TradingStats): void {
    const now = Date.now();

    this.state.isHalted = true;
    this.state.haltedAt = now;
    this.state.haltReason = reason;
    this.state.canResumeAt = now + (this.config.cooldownMinutes * 60 * 1000);

    // Record in history
    this.state.haltHistory.push({
      timestamp: now,
      reason,
      duration: 0, // Will be updated when resumed
    });

    // Emit event
    this.emitEvent({
      type: 'HALT',
      timestamp: now,
      reason,
      stats,
    });

    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║                     🚨 KILL SWITCH ACTIVATED 🚨                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Reason: ${reason.substring(0, 54).padEnd(54)}║
║  Time: ${new Date(now).toISOString().padEnd(56)}║
║  Resume at: ${new Date(this.state.canResumeAt).toISOString().padEnd(51)}║
╠══════════════════════════════════════════════════════════════════╣
║  Daily P&L: ${stats.dailyPnLPct.toFixed(2).padStart(7)}%                                           ║
║  Win Rate: ${stats.winRateLast20.toFixed(1).padStart(7)}%                                            ║
║  Drawdown: ${stats.maxDrawdownPct.toFixed(2).padStart(7)}%                                           ║
║  Losses Streak: ${stats.consecutiveLosses.toString().padStart(3)}                                        ║
╚══════════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Check if trading can resume
   */
  private checkResumeConditions(): boolean {
    const now = Date.now();

    // Still in cooldown
    if (this.state.canResumeAt && now < this.state.canResumeAt) {
      return true; // Still halted
    }

    // Cooldown complete - check if conditions improved
    const canResume = this.canResume();

    if (canResume) {
      this.resume('Cooldown complete and conditions improved');
      return false; // No longer halted
    }

    // Extend cooldown
    this.state.canResumeAt = now + (this.config.cooldownMinutes * 60 * 1000);
    console.warn(
      `[KillSwitch] Conditions not improved. Extended cooldown to ${new Date(this.state.canResumeAt).toISOString()}`
    );

    return true; // Still halted
  }

  /**
   * Check if conditions have improved enough to resume
   */
  private canResume(): boolean {
    // Check if conditions are now acceptable
    // We require slightly better than threshold to prevent immediate re-halt

    const safetyMargin = 0.8; // 20% safety margin

    const dailyOk = this.state.dailyPnlPercent > -(this.config.maxDailyLossPct * safetyMargin);
    const winRateOk = this.state.winRateLast20 > (this.config.minWinRateLast20 / safetyMargin);
    const drawdownOk = this.state.currentDrawdownPercent < (this.config.maxDrawdownPct * safetyMargin);
    const streakOk = this.state.consecutiveLosses < (this.config.maxConsecutiveLosses - 1);

    return dailyOk && winRateOk && drawdownOk && streakOk;
  }

  /**
   * Resume trading
   */
  resume(reason: string): void {
    if (!this.state.isHalted) return;

    const now = Date.now();
    const duration = now - (this.state.haltedAt || now);

    // Update history with duration
    if (this.state.haltHistory.length > 0) {
      this.state.haltHistory[this.state.haltHistory.length - 1].duration = duration;
    }

    this.state.isHalted = false;
    this.state.haltedAt = undefined;
    this.state.haltReason = undefined;
    this.state.canResumeAt = undefined;

    // Emit event
    this.emitEvent({
      type: 'RESUME',
      timestamp: now,
      reason,
      stats: this.getCurrentStats(),
    });

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                     ✅ TRADING RESUMED ✅                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Reason: ${reason.substring(0, 54).padEnd(54)}║
║  Halted for: ${Math.round(duration / 60000)} minutes                                          ║
╚══════════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Force resume (manual override)
   */
  forceResume(): void {
    this.resume('Manual override');
  }

  /**
   * Check for warning conditions (approaching limits)
   */
  private checkWarnings(stats: TradingStats): void {
    const warningThreshold = 0.8; // Warn at 80% of limit
    const warnings: string[] = [];

    if (stats.dailyPnLPct < -(this.config.maxDailyLossPct * warningThreshold)) {
      warnings.push(`Daily loss approaching limit: ${stats.dailyPnLPct.toFixed(2)}%`);
    }

    if (stats.winRateLast20 < this.config.minWinRateLast20 / warningThreshold) {
      warnings.push(`Win rate degrading: ${stats.winRateLast20.toFixed(1)}%`);
    }

    if (stats.maxDrawdownPct > this.config.maxDrawdownPct * warningThreshold) {
      warnings.push(`Drawdown approaching limit: ${stats.maxDrawdownPct.toFixed(2)}%`);
    }

    if (stats.consecutiveLosses >= this.config.maxConsecutiveLosses - 2) {
      warnings.push(`Losing streak: ${stats.consecutiveLosses} consecutive`);
    }

    // Emit warnings
    if (warnings.length > 0) {
      this.emitEvent({
        type: 'WARNING',
        timestamp: Date.now(),
        reason: warnings.join('; '),
        stats,
      });

      console.warn(`[KillSwitch] WARNING: ${warnings.join(', ')}`);
    }
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Get current state
   */
  getState(): KillSwitchState {
    return { ...this.state };
  }

  /**
   * Check if currently halted
   */
  isHalted(): boolean {
    return this.state.isHalted;
  }

  /**
   * Get time until resume (in minutes)
   */
  getTimeUntilResume(): number | null {
    if (!this.state.isHalted || !this.state.canResumeAt) return null;

    const remaining = this.state.canResumeAt - Date.now();
    return Math.max(0, Math.round(remaining / 60000));
  }

  /**
   * Get halt reason
   */
  getHaltReason(): string | null {
    return this.state.haltReason || null;
  }

  /**
   * Get current stats snapshot
   */
  private getCurrentStats(): TradingStats {
    return {
      dailyPnLPct: this.state.dailyPnlPercent,
      winRateLast20: this.state.winRateLast20,
      maxDrawdownPct: this.state.currentDrawdownPercent,
      consecutiveLosses: this.state.consecutiveLosses,
      totalTradestoday: 0,
      winsToday: 0,
      lossesToday: 0,
    };
  }

  /**
   * Create initial state
   */
  private createInitialState(): KillSwitchState {
    return {
      isHalted: false,
      haltedAt: undefined,
      haltReason: undefined,
      canResumeAt: undefined,
      dailyPnlPercent: 0,
      currentDrawdownPercent: 0,
      winRateLast20: 50, // Assume neutral start
      consecutiveLosses: 0,
      haltHistory: [],
    };
  }

  /**
   * Update config
   */
  updateConfig(newConfig: Partial<KillSwitchConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    console.log('[KillSwitch] Config updated:', this.config);
  }

  /**
   * Get config
   */
  getConfig(): KillSwitchConfig {
    return { ...this.config };
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Register event callback
   */
  onEvent(callback: KillSwitchEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit event to all callbacks
   */
  private emitEvent(event: KillSwitchEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[KillSwitch] Event callback error:', error);
      }
    });
  }

  /**
   * Get status string for logging
   */
  getStatus(): string {
    if (this.state.isHalted) {
      const resumeIn = this.getTimeUntilResume();
      return `
[KILL SWITCH] 🚨 HALTED
  Reason: ${this.state.haltReason}
  Resume in: ${resumeIn} minutes
  Daily P&L: ${this.state.dailyPnlPercent.toFixed(2)}%
  Win Rate: ${this.state.winRateLast20.toFixed(1)}%
  Drawdown: ${this.state.currentDrawdownPercent.toFixed(2)}%
  Losing Streak: ${this.state.consecutiveLosses}
`;
    }

    return `
[KILL SWITCH] ✅ ACTIVE
  Daily P&L: ${this.state.dailyPnlPercent.toFixed(2)}%
  Win Rate: ${this.state.winRateLast20.toFixed(1)}%
  Drawdown: ${this.state.currentDrawdownPercent.toFixed(2)}%
  Losing Streak: ${this.state.consecutiveLosses}
  Halts Today: ${this.state.haltHistory.filter(h => h.timestamp > Date.now() - 86400000).length}
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const killSwitch = new KillSwitch();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if trading is allowed
 */
export function canTrade(): boolean {
  return !killSwitch.isHalted();
}

/**
 * Calculate trading stats from trade history
 */
export function calculateTradingStats(
  trades: Array<{
    pnlPercent: number;
    timestamp: number;
    isWin: boolean;
  }>,
  startingBalance: number,
  currentBalance: number
): TradingStats {
  const now = Date.now();
  const oneDayAgo = now - 86400000;

  // Filter today's trades
  const todaysTrades = trades.filter(t => t.timestamp >= oneDayAgo);

  // Calculate daily P&L
  const dailyPnLPct = todaysTrades.reduce((sum, t) => sum + t.pnlPercent, 0);

  // Calculate win rate of last 20 trades
  const last20 = trades.slice(-20);
  const wins = last20.filter(t => t.isWin).length;
  const winRateLast20 = last20.length > 0 ? (wins / last20.length) * 100 : 50;

  // Calculate max drawdown
  const maxDrawdownPct = startingBalance > 0
    ? Math.max(0, ((startingBalance - currentBalance) / startingBalance) * 100)
    : 0;

  // Calculate consecutive losses
  let consecutiveLosses = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (!trades[i].isWin) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  // Today's wins and losses
  const winsToday = todaysTrades.filter(t => t.isWin).length;
  const lossesToday = todaysTrades.filter(t => !t.isWin).length;

  return {
    dailyPnLPct,
    winRateLast20,
    maxDrawdownPct,
    consecutiveLosses,
    totalTradestoday: todaysTrades.length,
    winsToday,
    lossesToday,
  };
}

/**
 * Evaluate if specific trade should be blocked (pre-trade check)
 */
export function shouldBlockTrade(stats: TradingStats): { block: boolean; reason: string } {
  // Check if kill switch is active
  if (killSwitch.isHalted()) {
    return {
      block: true,
      reason: `Kill switch active: ${killSwitch.getHaltReason()}`,
    };
  }

  // Pre-trade risk checks (more conservative than halt conditions)
  const preTradeRiskThreshold = 0.7; // Block at 70% of halt threshold

  if (stats.dailyPnLPct < -(KILL_SWITCH_CONFIG.maxDailyLossPct * preTradeRiskThreshold)) {
    return {
      block: true,
      reason: `Daily loss too high: ${stats.dailyPnLPct.toFixed(2)}%`,
    };
  }

  if (stats.consecutiveLosses >= KILL_SWITCH_CONFIG.maxConsecutiveLosses - 1) {
    return {
      block: true,
      reason: `Losing streak too long: ${stats.consecutiveLosses}`,
    };
  }

  return { block: false, reason: '' };
}

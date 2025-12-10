/**
 * ARENA CIRCUIT BREAKER SYSTEM
 *
 * Professional-grade risk management based on Citadel/Millennium practices.
 *
 * Features:
 * - Multi-level circuit breaker (L1-L5)
 * - Smart damage detection with adaptive recovery
 * - Daily loss limits per agent
 * - Account-wide protection
 * - Position sizing adjustments based on drawdown
 */

import { MarketState } from './marketStateDetectionEngine';

// ===================== CONFIGURATION =====================

export interface CircuitBreakerConfig {
  // Per-Agent Limits (Moderate risk tolerance - user selected)
  maxDailyLossPercent: number;      // 3% per agent per day
  maxConsecutiveLosses: number;     // 3 losses trigger pause
  maxSingleTradePercent: number;    // Max 3% loss on single trade

  // Account-Wide Limits
  maxTotalDailyLossPercent: number; // 7% halt-all threshold
  absoluteMinBalancePercent: number; // 50% of initial = hard floor

  // Recovery Settings
  recoveryMultipliers: {
    L1: number; // Position size after L1 trigger
    L2: number;
    L3: number;
    L4: number;
  };
}

export const DEFAULT_CONFIG: CircuitBreakerConfig = {
  // Moderate settings (user-selected)
  maxDailyLossPercent: 3,           // 3% max daily loss per agent
  maxConsecutiveLosses: 3,          // 3 losses = pause
  maxSingleTradePercent: 3,         // Max 3% loss on single trade

  // Account-wide
  maxTotalDailyLossPercent: 7,      // 7% halt-all threshold
  absoluteMinBalancePercent: 50,    // Never trade below 50% of initial

  // Position size multipliers during recovery
  recoveryMultipliers: {
    L1: 0.75,  // 75% position size
    L2: 0.50,  // 50% position size
    L3: 0.25,  // 25% position size
    L4: 0.10,  // 10% position size (minimal)
  }
};

// ===================== TYPES =====================

export enum CircuitBreakerLevel {
  ACTIVE = 'ACTIVE',           // Normal trading
  L1_CAUTIOUS = 'L1_CAUTIOUS', // After 3 consecutive losses
  L2_REDUCED = 'L2_REDUCED',   // 3% daily loss hit
  L3_MINIMAL = 'L3_MINIMAL',   // 5% daily loss hit
  L4_HALTED = 'L4_HALTED',     // 7% daily loss hit
  L5_EMERGENCY = 'L5_EMERGENCY' // Critical - manual reset required
}

export interface AgentRiskState {
  agentId: string;
  level: CircuitBreakerLevel;
  dailyPnL: number;           // Today's P&L in dollars
  dailyPnLPercent: number;    // Today's P&L as % of initial balance
  consecutiveLosses: number;
  lastTradeTime: number;
  haltedUntil: number;        // Timestamp when trading can resume
  positionSizeMultiplier: number; // Current position size adjustment
  triggerReason: string | null;
  recoveryTradesRequired: number; // Small winning trades needed to upgrade
  recoveryTradesCompleted: number;
}

export interface AccountRiskState {
  level: CircuitBreakerLevel;
  totalDailyPnL: number;
  totalDailyPnLPercent: number;
  isHalted: boolean;
  haltedUntil: number;
  triggerReason: string | null;
}

// ===================== CIRCUIT BREAKER CLASS =====================

class ArenaCircuitBreaker {
  private config: CircuitBreakerConfig;
  private agentStates = new Map<string, AgentRiskState>();
  private accountState: AccountRiskState;
  private dayStartTimestamp: number;
  private initialBalancePerAgent = 10000;
  private totalInitialBalance = 30000;

  constructor(config: CircuitBreakerConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.dayStartTimestamp = this.getTodayStart();
    this.accountState = this.createDefaultAccountState();

    console.log('%c CIRCUIT BREAKER INITIALIZED',
      'background: #ef4444; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;');
    console.log(`   Max Daily Loss: ${config.maxDailyLossPercent}% per agent, ${config.maxTotalDailyLossPercent}% total`);
  }

  private getTodayStart(): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }

  private createDefaultAgentState(agentId: string): AgentRiskState {
    return {
      agentId,
      level: CircuitBreakerLevel.ACTIVE,
      dailyPnL: 0,
      dailyPnLPercent: 0,
      consecutiveLosses: 0,
      lastTradeTime: 0,
      haltedUntil: 0,
      positionSizeMultiplier: 1.0,
      triggerReason: null,
      recoveryTradesRequired: 0,
      recoveryTradesCompleted: 0
    };
  }

  private createDefaultAccountState(): AccountRiskState {
    return {
      level: CircuitBreakerLevel.ACTIVE,
      totalDailyPnL: 0,
      totalDailyPnLPercent: 0,
      isHalted: false,
      haltedUntil: 0,
      triggerReason: null
    };
  }

  // ===================== INITIALIZATION =====================

  initializeAgent(agentId: string): void {
    if (!this.agentStates.has(agentId)) {
      this.agentStates.set(agentId, this.createDefaultAgentState(agentId));
    }
  }

  // ===================== PRE-TRADE CHECKS =====================

  /**
   * Check if agent is allowed to trade
   * Call this BEFORE opening any position
   */
  canAgentTrade(agentId: string): { allowed: boolean; reason: string; positionMultiplier: number } {
    this.checkDayReset();

    const state = this.agentStates.get(agentId) || this.createDefaultAgentState(agentId);

    // Check account-level halt first
    if (this.accountState.isHalted) {
      if (Date.now() < this.accountState.haltedUntil) {
        const timeLeft = Math.ceil((this.accountState.haltedUntil - Date.now()) / 60000);
        return {
          allowed: false,
          reason: `Account halted for ${timeLeft}min: ${this.accountState.triggerReason}`,
          positionMultiplier: 0
        };
      } else {
        // Auto-recover from account halt
        this.accountState.isHalted = false;
        this.accountState.level = CircuitBreakerLevel.L2_REDUCED;
      }
    }

    // Check agent-level halt
    if (state.level === CircuitBreakerLevel.L4_HALTED || state.level === CircuitBreakerLevel.L5_EMERGENCY) {
      if (Date.now() < state.haltedUntil) {
        const timeLeft = Math.ceil((state.haltedUntil - Date.now()) / 60000);
        return {
          allowed: false,
          reason: `${agentId} halted for ${timeLeft}min: ${state.triggerReason}`,
          positionMultiplier: 0
        };
      } else {
        // Auto-recover: downgrade to L3
        state.level = CircuitBreakerLevel.L3_MINIMAL;
        state.positionSizeMultiplier = this.config.recoveryMultipliers.L3;
        state.recoveryTradesRequired = 3;
        state.recoveryTradesCompleted = 0;
      }
    }

    return {
      allowed: true,
      reason: state.level === CircuitBreakerLevel.ACTIVE ? 'OK' : `${state.level}: Trading at reduced size`,
      positionMultiplier: state.positionSizeMultiplier
    };
  }

  // ===================== TRADE OUTCOME PROCESSING =====================

  /**
   * Record trade outcome and update circuit breaker state
   * Call this AFTER closing any position
   */
  recordTradeOutcome(
    agentId: string,
    pnlDollar: number,
    pnlPercent: number,
    isWin: boolean
  ): void {
    this.checkDayReset();

    let state = this.agentStates.get(agentId);
    if (!state) {
      state = this.createDefaultAgentState(agentId);
      this.agentStates.set(agentId, state);
    }

    // Update daily P&L
    state.dailyPnL += pnlDollar;
    state.dailyPnLPercent = (state.dailyPnL / this.initialBalancePerAgent) * 100;
    state.lastTradeTime = Date.now();

    // Update consecutive losses
    if (isWin) {
      state.consecutiveLosses = 0;

      // Recovery progress
      if (state.recoveryTradesRequired > 0) {
        state.recoveryTradesCompleted++;
        if (state.recoveryTradesCompleted >= state.recoveryTradesRequired) {
          this.upgradeAgentLevel(agentId);
        }
      }
    } else {
      state.consecutiveLosses++;
    }

    // Update account-level totals
    this.updateAccountState();

    // Check for circuit breaker triggers
    this.checkCircuitBreakerTriggers(agentId);
  }

  private updateAccountState(): void {
    let totalDailyPnL = 0;
    this.agentStates.forEach(state => {
      totalDailyPnL += state.dailyPnL;
    });

    this.accountState.totalDailyPnL = totalDailyPnL;
    this.accountState.totalDailyPnLPercent = (totalDailyPnL / this.totalInitialBalance) * 100;
  }

  private checkCircuitBreakerTriggers(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (!state) return;

    const lossPercent = Math.abs(state.dailyPnLPercent);
    const accountLossPercent = Math.abs(this.accountState.totalDailyPnLPercent);

    // L1: 3 consecutive losses
    if (state.consecutiveLosses >= this.config.maxConsecutiveLosses &&
        state.level === CircuitBreakerLevel.ACTIVE) {
      this.triggerLevel(agentId, CircuitBreakerLevel.L1_CAUTIOUS,
        `${state.consecutiveLosses} consecutive losses`);
    }

    // L2: 3% daily loss per agent
    if (lossPercent >= this.config.maxDailyLossPercent &&
        state.level !== CircuitBreakerLevel.L4_HALTED &&
        state.level !== CircuitBreakerLevel.L5_EMERGENCY) {
      this.triggerLevel(agentId, CircuitBreakerLevel.L2_REDUCED,
        `${lossPercent.toFixed(1)}% daily loss`);
    }

    // L3: 5% daily loss
    if (lossPercent >= 5 &&
        state.level !== CircuitBreakerLevel.L4_HALTED &&
        state.level !== CircuitBreakerLevel.L5_EMERGENCY) {
      this.triggerLevel(agentId, CircuitBreakerLevel.L3_MINIMAL,
        `${lossPercent.toFixed(1)}% daily loss - minimal positions`);
    }

    // L4: 7% daily loss (halt-all threshold)
    if (accountLossPercent >= this.config.maxTotalDailyLossPercent) {
      this.triggerAccountHalt(`${accountLossPercent.toFixed(1)}% total daily loss`);
    }

    // L5: Single trade > 3% loss (emergency)
    // This is checked in validatePnL before applying
  }

  private triggerLevel(agentId: string, level: CircuitBreakerLevel, reason: string): void {
    const state = this.agentStates.get(agentId);
    if (!state) return;

    // Don't downgrade
    const levelOrder = [
      CircuitBreakerLevel.ACTIVE,
      CircuitBreakerLevel.L1_CAUTIOUS,
      CircuitBreakerLevel.L2_REDUCED,
      CircuitBreakerLevel.L3_MINIMAL,
      CircuitBreakerLevel.L4_HALTED,
      CircuitBreakerLevel.L5_EMERGENCY
    ];

    if (levelOrder.indexOf(level) <= levelOrder.indexOf(state.level)) {
      return; // Already at this level or higher
    }

    state.level = level;
    state.triggerReason = reason;

    // Set position multiplier and halt duration based on level
    switch (level) {
      case CircuitBreakerLevel.L1_CAUTIOUS:
        state.positionSizeMultiplier = this.config.recoveryMultipliers.L1;
        state.haltedUntil = Date.now() + 15 * 60 * 1000; // 15 min
        state.recoveryTradesRequired = 2;
        break;
      case CircuitBreakerLevel.L2_REDUCED:
        state.positionSizeMultiplier = this.config.recoveryMultipliers.L2;
        state.haltedUntil = Date.now() + 30 * 60 * 1000; // 30 min
        state.recoveryTradesRequired = 3;
        break;
      case CircuitBreakerLevel.L3_MINIMAL:
        state.positionSizeMultiplier = this.config.recoveryMultipliers.L3;
        state.haltedUntil = Date.now() + 60 * 60 * 1000; // 1 hour
        state.recoveryTradesRequired = 4;
        break;
      case CircuitBreakerLevel.L4_HALTED:
        state.positionSizeMultiplier = 0;
        state.haltedUntil = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
        state.recoveryTradesRequired = 5;
        break;
      case CircuitBreakerLevel.L5_EMERGENCY:
        state.positionSizeMultiplier = 0;
        state.haltedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        state.recoveryTradesRequired = 10;
        break;
    }

    state.recoveryTradesCompleted = 0;

    console.log(`%c CIRCUIT BREAKER ${level}: ${agentId}`,
      'background: #ef4444; color: white; padding: 4px 12px; border-radius: 4px;');
    console.log(`   Reason: ${reason}`);
    console.log(`   Position size: ${(state.positionSizeMultiplier * 100).toFixed(0)}%`);
  }

  private triggerAccountHalt(reason: string): void {
    this.accountState.isHalted = true;
    this.accountState.level = CircuitBreakerLevel.L4_HALTED;
    this.accountState.haltedUntil = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
    this.accountState.triggerReason = reason;

    // Halt all agents
    this.agentStates.forEach((state, agentId) => {
      this.triggerLevel(agentId, CircuitBreakerLevel.L4_HALTED, `Account halt: ${reason}`);
    });

    console.log(`%c ACCOUNT HALT TRIGGERED`,
      'background: #dc2626; color: white; padding: 6px 16px; border-radius: 4px; font-weight: bold;');
    console.log(`   Reason: ${reason}`);
    console.log(`   All trading suspended for 4 hours`);
  }

  private upgradeAgentLevel(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (!state) return;

    const levelOrder = [
      CircuitBreakerLevel.ACTIVE,
      CircuitBreakerLevel.L1_CAUTIOUS,
      CircuitBreakerLevel.L2_REDUCED,
      CircuitBreakerLevel.L3_MINIMAL,
      CircuitBreakerLevel.L4_HALTED,
      CircuitBreakerLevel.L5_EMERGENCY
    ];

    const currentIndex = levelOrder.indexOf(state.level);
    if (currentIndex > 0) {
      const newLevel = levelOrder[currentIndex - 1];
      state.level = newLevel;
      state.recoveryTradesCompleted = 0;

      // Set new multiplier
      switch (newLevel) {
        case CircuitBreakerLevel.ACTIVE:
          state.positionSizeMultiplier = 1.0;
          state.recoveryTradesRequired = 0;
          break;
        case CircuitBreakerLevel.L1_CAUTIOUS:
          state.positionSizeMultiplier = this.config.recoveryMultipliers.L1;
          state.recoveryTradesRequired = 2;
          break;
        case CircuitBreakerLevel.L2_REDUCED:
          state.positionSizeMultiplier = this.config.recoveryMultipliers.L2;
          state.recoveryTradesRequired = 3;
          break;
        case CircuitBreakerLevel.L3_MINIMAL:
          state.positionSizeMultiplier = this.config.recoveryMultipliers.L3;
          state.recoveryTradesRequired = 4;
          break;
      }

      console.log(`%c ${agentId} UPGRADED to ${newLevel}`,
        'background: #10b981; color: white; padding: 4px 12px; border-radius: 4px;');
    }
  }

  // ===================== P&L VALIDATION =====================

  /**
   * Validate and cap P&L before applying to balance
   * Prevents catastrophic single-trade losses
   */
  validateAndCapPnL(
    agentId: string,
    pnlDollar: number,
    positionNotional: number
  ): { cappedPnL: number; wasCapped: boolean; triggerEmergency: boolean } {
    const maxLossPercent = this.config.maxSingleTradePercent;
    const maxLossAllowed = this.initialBalancePerAgent * (maxLossPercent / 100);

    // Can't lose more than position size
    const positionCappedLoss = Math.max(pnlDollar, -positionNotional);

    // Can't lose more than 3% of initial balance on single trade
    const finalCappedPnL = Math.max(positionCappedLoss, -maxLossAllowed);

    const wasCapped = finalCappedPnL !== pnlDollar;
    const triggerEmergency = pnlDollar < -maxLossAllowed;

    if (triggerEmergency) {
      this.triggerLevel(agentId, CircuitBreakerLevel.L5_EMERGENCY,
        `Single trade loss exceeded ${maxLossPercent}%`);
    }

    return { cappedPnL: finalCappedPnL, wasCapped, triggerEmergency };
  }

  // ===================== BALANCE VALIDATION =====================

  /**
   * Validate balance delta when loading from localStorage
   * Prevents loading corrupted/extreme values
   */
  validateBalanceDelta(agentId: string, balanceDelta: number): number {
    const maxLossAllowed = this.initialBalancePerAgent * (this.config.absoluteMinBalancePercent / 100);
    const maxValidLoss = -maxLossAllowed; // -50% of initial

    if (balanceDelta < maxValidLoss) {
      console.warn(`%c CORRUPTED BALANCE DETECTED: ${agentId}`,
        'background: #f59e0b; color: black; padding: 4px 12px;');
      console.log(`   Loaded: $${balanceDelta.toFixed(2)}, Capped to: $${maxValidLoss.toFixed(2)}`);
      return maxValidLoss;
    }

    return balanceDelta;
  }

  /**
   * Check if agent balance is above minimum threshold
   */
  isBalanceValid(currentBalance: number): boolean {
    const minBalance = this.initialBalancePerAgent * (this.config.absoluteMinBalancePercent / 100);
    return currentBalance >= minBalance;
  }

  // ===================== DAY RESET =====================

  private checkDayReset(): void {
    const todayStart = this.getTodayStart();
    if (todayStart > this.dayStartTimestamp) {
      console.log('%c NEW DAY - RESETTING CIRCUIT BREAKERS',
        'background: #3b82f6; color: white; padding: 4px 12px;');

      this.dayStartTimestamp = todayStart;

      // Reset daily stats but keep level if still in cooldown
      this.agentStates.forEach(state => {
        state.dailyPnL = 0;
        state.dailyPnLPercent = 0;
        state.consecutiveLosses = 0;

        // Only reset level if cooldown expired
        if (Date.now() >= state.haltedUntil) {
          state.level = CircuitBreakerLevel.ACTIVE;
          state.positionSizeMultiplier = 1.0;
          state.triggerReason = null;
        }
      });

      // Reset account state
      this.accountState.totalDailyPnL = 0;
      this.accountState.totalDailyPnLPercent = 0;
      if (Date.now() >= this.accountState.haltedUntil) {
        this.accountState.isHalted = false;
        this.accountState.level = CircuitBreakerLevel.ACTIVE;
      }
    }
  }

  // ===================== EMERGENCY RESET =====================

  /**
   * Emergency reset - clears all state and restores to defaults
   */
  emergencyReset(): void {
    console.log('%c EMERGENCY RESET - ALL CIRCUIT BREAKERS CLEARED',
      'background: #ef4444; color: white; padding: 6px 16px; font-weight: bold;');

    this.agentStates.clear();
    this.accountState = this.createDefaultAccountState();
    this.dayStartTimestamp = this.getTodayStart();
  }

  // ===================== STATUS API =====================

  getAgentState(agentId: string): AgentRiskState {
    return this.agentStates.get(agentId) || this.createDefaultAgentState(agentId);
  }

  getAccountState(): AccountRiskState {
    return { ...this.accountState };
  }

  getAllStates(): { agents: AgentRiskState[]; account: AccountRiskState } {
    return {
      agents: Array.from(this.agentStates.values()),
      account: this.getAccountState()
    };
  }

  /**
   * Get risk dashboard data for UI
   */
  getRiskDashboardData(): {
    overallStatus: 'healthy' | 'caution' | 'warning' | 'critical';
    statusColor: string;
    dailyDrawdownPercent: number;
    agentStatuses: Array<{
      id: string;
      level: string;
      dailyPnL: number;
      positionMultiplier: number;
    }>;
    isHalted: boolean;
    haltTimeRemaining: number | null;
  } {
    this.checkDayReset();

    const accountLoss = Math.abs(this.accountState.totalDailyPnLPercent);

    let overallStatus: 'healthy' | 'caution' | 'warning' | 'critical';
    let statusColor: string;

    if (this.accountState.isHalted || accountLoss >= 7) {
      overallStatus = 'critical';
      statusColor = '#dc2626';
    } else if (accountLoss >= 5) {
      overallStatus = 'warning';
      statusColor = '#f59e0b';
    } else if (accountLoss >= 3) {
      overallStatus = 'caution';
      statusColor = '#eab308';
    } else {
      overallStatus = 'healthy';
      statusColor = '#10b981';
    }

    const agentStatuses = Array.from(this.agentStates.values()).map(state => ({
      id: state.agentId,
      level: state.level,
      dailyPnL: state.dailyPnL,
      positionMultiplier: state.positionSizeMultiplier
    }));

    const haltTimeRemaining = this.accountState.isHalted
      ? Math.max(0, this.accountState.haltedUntil - Date.now())
      : null;

    return {
      overallStatus,
      statusColor,
      dailyDrawdownPercent: this.accountState.totalDailyPnLPercent,
      agentStatuses,
      isHalted: this.accountState.isHalted,
      haltTimeRemaining
    };
  }
}

// ===================== SINGLETON =====================

export const arenaCircuitBreaker = new ArenaCircuitBreaker();
export default arenaCircuitBreaker;

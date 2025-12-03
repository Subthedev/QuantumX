/**
 * SMART TIMEOUT MANAGER
 *
 * Intelligent position timeout that doesn't kill profitable trending positions.
 *
 * KEY RULES:
 * 1. NEVER timeout if profitable (>1%) AND in trending regime (not rangebound)
 * 2. Timeout rangebound positions after 24h (mean reversion plays are short-term)
 * 3. Timeout breakeven/losing positions after 48h (capital efficiency)
 * 4. Timeout ANY position after 72h (hard cap for capital efficiency)
 * 5. Agent-specific timeouts (aggressive shorter, conservative longer)
 *
 * REGIME-BASED TIMEOUTS:
 * - BULLISH_HIGH_VOL: 4h (unprofitable) / 8h (profitable)
 * - BULLISH_LOW_VOL: 6h (unprofitable) / 12h (profitable)
 * - BEARISH_HIGH_VOL: 4h (unprofitable) / 8h (profitable)
 * - BEARISH_LOW_VOL: 6h (unprofitable) / 12h (profitable)
 * - RANGEBOUND: 2h (unprofitable) / 4h (profitable)
 */

import {
  AdaptivePosition,
  MarketRegime,
  WyckoffPhase,
  AgentRiskProfile,
  MAX_POSITION_HOLD_HOURS,
} from './types';

import { REGIME_CONFIGS, WYCKOFF_CONFIGS } from './regimeTradeRules';

// ============================================================================
// CONSTANTS
// ============================================================================

// Hard limits that override all other rules
const HARD_TIMEOUT_HOURS = 72; // Absolute max for any position
const RANGEBOUND_MAX_HOURS = 24; // Rangebound positions max
const BREAKEVEN_MAX_HOURS = 48; // Breakeven/losing positions max

// Profit threshold to be considered "profitable" for timeout purposes
const PROFITABLE_THRESHOLD_PERCENT = 1.0;

// Agent timeout multipliers
const AGENT_TIMEOUT_MULTIPLIERS: Record<AgentRiskProfile, number> = {
  AGGRESSIVE: 0.75, // 25% shorter timeouts
  BALANCED: 1.0,    // Standard timeouts
  CONSERVATIVE: 1.5, // 50% longer timeouts (more patient)
};

// ============================================================================
// INTERFACES
// ============================================================================

interface TimeoutCheckResult {
  shouldTimeout: boolean;
  reason: string;
  hoursOpen: number;
  hoursRemaining: number;
  profitPercent: number;
}

interface TimeoutConfig {
  baseHours: number;
  profitableHours: number;
  agentMultiplier: number;
  effectiveHours: number;
  effectiveProfitableHours: number;
}

// ============================================================================
// SMART TIMEOUT MANAGER
// ============================================================================

export class SmartTimeoutManager {
  /**
   * Check if position should be timed out
   * This is the main method implementing the smart timeout logic
   */
  shouldTimeoutPosition(
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime
  ): TimeoutCheckResult {
    const hoursOpen = this.getHoursOpen(position);
    const profitPercent = this.calculateProfitPercent(position, currentPrice);
    const isProfitable = profitPercent > PROFITABLE_THRESHOLD_PERCENT;
    const isTrending = this.isTrendingRegime(currentRegime);

    // ===========================================
    // RULE 1: NEVER timeout profitable + trending
    // ===========================================
    if (isProfitable && isTrending) {
      // Exception: Still timeout after hard limit
      if (hoursOpen > HARD_TIMEOUT_HOURS) {
        return {
          shouldTimeout: true,
          reason: `Hard timeout at ${HARD_TIMEOUT_HOURS}h (profitable but capital efficiency)`,
          hoursOpen,
          hoursRemaining: 0,
          profitPercent,
        };
      }

      return {
        shouldTimeout: false,
        reason: `Profitable (${profitPercent.toFixed(2)}%) in trending regime - let it ride`,
        hoursOpen,
        hoursRemaining: HARD_TIMEOUT_HOURS - hoursOpen,
        profitPercent,
      };
    }

    // ===========================================
    // RULE 2: Timeout rangebound positions after 24h
    // ===========================================
    if (currentRegime === 'RANGEBOUND' && hoursOpen > RANGEBOUND_MAX_HOURS) {
      return {
        shouldTimeout: true,
        reason: `Rangebound timeout at ${RANGEBOUND_MAX_HOURS}h (mean reversion expired)`,
        hoursOpen,
        hoursRemaining: 0,
        profitPercent,
      };
    }

    // ===========================================
    // RULE 3: Timeout breakeven/losing after 48h
    // ===========================================
    if (profitPercent < 0.5 && hoursOpen > BREAKEVEN_MAX_HOURS) {
      return {
        shouldTimeout: true,
        reason: `Stale position timeout at ${BREAKEVEN_MAX_HOURS}h (P&L: ${profitPercent.toFixed(2)}%)`,
        hoursOpen,
        hoursRemaining: 0,
        profitPercent,
      };
    }

    // ===========================================
    // RULE 4: Hard timeout after 72h
    // ===========================================
    if (hoursOpen > HARD_TIMEOUT_HOURS) {
      return {
        shouldTimeout: true,
        reason: `Hard timeout at ${HARD_TIMEOUT_HOURS}h (capital efficiency)`,
        hoursOpen,
        hoursRemaining: 0,
        profitPercent,
      };
    }

    // ===========================================
    // RULE 5: Regime-specific soft timeouts
    // ===========================================
    const timeoutConfig = this.getTimeoutConfig(currentRegime, position.agentRiskProfile);

    if (isProfitable) {
      // Profitable: Use extended timeout
      if (hoursOpen > timeoutConfig.effectiveProfitableHours) {
        return {
          shouldTimeout: true,
          reason: `Regime timeout at ${timeoutConfig.effectiveProfitableHours.toFixed(1)}h (profitable)`,
          hoursOpen,
          hoursRemaining: 0,
          profitPercent,
        };
      }

      return {
        shouldTimeout: false,
        reason: `Within profitable timeout (${hoursOpen.toFixed(1)}h / ${timeoutConfig.effectiveProfitableHours.toFixed(1)}h)`,
        hoursOpen,
        hoursRemaining: timeoutConfig.effectiveProfitableHours - hoursOpen,
        profitPercent,
      };
    } else {
      // Not profitable: Use standard timeout
      if (hoursOpen > timeoutConfig.effectiveHours) {
        return {
          shouldTimeout: true,
          reason: `Regime timeout at ${timeoutConfig.effectiveHours.toFixed(1)}h (not profitable: ${profitPercent.toFixed(2)}%)`,
          hoursOpen,
          hoursRemaining: 0,
          profitPercent,
        };
      }

      return {
        shouldTimeout: false,
        reason: `Within standard timeout (${hoursOpen.toFixed(1)}h / ${timeoutConfig.effectiveHours.toFixed(1)}h)`,
        hoursOpen,
        hoursRemaining: timeoutConfig.effectiveHours - hoursOpen,
        profitPercent,
      };
    }
  }

  /**
   * Get timeout configuration for regime and agent
   */
  getTimeoutConfig(regime: MarketRegime, agentProfile: AgentRiskProfile): TimeoutConfig {
    const regimeConfig = REGIME_CONFIGS[regime];
    const agentMultiplier = AGENT_TIMEOUT_MULTIPLIERS[agentProfile];

    const baseHours = regimeConfig.maxHoldHours;
    const profitableHours = regimeConfig.profitableMaxHoldHours;

    return {
      baseHours,
      profitableHours,
      agentMultiplier,
      effectiveHours: baseHours * agentMultiplier,
      effectiveProfitableHours: profitableHours * agentMultiplier,
    };
  }

  /**
   * Calculate time to timeout warning
   * Returns hours until warning threshold (80% of timeout)
   */
  getTimeToWarning(
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime
  ): number | null {
    const result = this.shouldTimeoutPosition(position, currentPrice, currentRegime);

    if (result.shouldTimeout) {
      return 0; // Already at timeout
    }

    const warningThreshold = 0.8; // Warn at 80% of timeout
    const hoursToWarning = (result.hoursRemaining * warningThreshold) - (result.hoursRemaining * (1 - warningThreshold));

    return hoursToWarning > 0 ? hoursToWarning : null;
  }

  /**
   * Should we extend the timeout?
   * Returns true if position is performing well and should get more time
   */
  shouldExtendTimeout(
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime,
    currentWyckoff: WyckoffPhase
  ): { shouldExtend: boolean; reason: string; extensionHours: number } {
    const profitPercent = this.calculateProfitPercent(position, currentPrice);

    // Conditions for extension:
    // 1. Position is profitable (>1%)
    // 2. In favorable Wyckoff phase (ACCUMULATION or MARKUP)
    // 3. Not in rangebound regime
    // 4. Not already at hard limit

    const hoursOpen = this.getHoursOpen(position);
    const isProfitable = profitPercent > PROFITABLE_THRESHOLD_PERCENT;
    const isFavorablePhase = currentWyckoff === 'ACCUMULATION' || currentWyckoff === 'MARKUP';
    const isTrending = this.isTrendingRegime(currentRegime);
    const nearHardLimit = hoursOpen > HARD_TIMEOUT_HOURS * 0.8;

    if (isProfitable && isFavorablePhase && isTrending && !nearHardLimit) {
      const extensionHours = WYCKOFF_CONFIGS[currentWyckoff].holdTimeMultiplier * 2; // Base 2h extension

      return {
        shouldExtend: true,
        reason: `Profitable in ${currentWyckoff} phase, extending timeout`,
        extensionHours,
      };
    }

    return {
      shouldExtend: false,
      reason: 'No extension warranted',
      extensionHours: 0,
    };
  }

  /**
   * Get priority for timeout (higher = should exit sooner)
   * Used for deciding which positions to close first when need to free capital
   */
  getTimeoutPriority(
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime
  ): number {
    const hoursOpen = this.getHoursOpen(position);
    const profitPercent = this.calculateProfitPercent(position, currentPrice);
    const timeoutResult = this.shouldTimeoutPosition(position, currentPrice, currentRegime);

    // Base priority from hours open (0-100 scale)
    let priority = (hoursOpen / HARD_TIMEOUT_HOURS) * 50;

    // Add priority for losing positions
    if (profitPercent < 0) {
      priority += Math.abs(profitPercent) * 10; // Bigger loss = higher priority
    }

    // Add priority for rangebound (should exit faster)
    if (currentRegime === 'RANGEBOUND') {
      priority += 20;
    }

    // Add priority if near timeout
    if (timeoutResult.hoursRemaining < 2) {
      priority += 30;
    }

    // Cap at 100
    return Math.min(100, priority);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Calculate hours position has been open
   */
  private getHoursOpen(position: AdaptivePosition): number {
    return (Date.now() - position.openedAt) / (1000 * 60 * 60);
  }

  /**
   * Calculate profit percentage
   */
  private calculateProfitPercent(position: AdaptivePosition, currentPrice: number): number {
    if (position.direction === 'LONG') {
      return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    } else {
      return ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
    }
  }

  /**
   * Check if regime is trending (not rangebound)
   */
  private isTrendingRegime(regime: MarketRegime): boolean {
    return regime !== 'RANGEBOUND';
  }

  /**
   * Get status string for logging
   */
  getTimeoutStatus(
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime
  ): string {
    const result = this.shouldTimeoutPosition(position, currentPrice, currentRegime);
    const config = this.getTimeoutConfig(currentRegime, position.agentRiskProfile);

    const progressPercent = result.shouldTimeout
      ? 100
      : ((result.hoursOpen / (result.hoursOpen + result.hoursRemaining)) * 100);

    const progressBar = this.buildProgressBar(progressPercent);

    return `
[TIMEOUT STATUS] ${position.symbol}
  Hours Open: ${result.hoursOpen.toFixed(1)}h
  Profit: ${result.profitPercent.toFixed(2)}%
  Regime: ${currentRegime}
  Agent Timeout: ${config.effectiveHours.toFixed(1)}h / ${config.effectiveProfitableHours.toFixed(1)}h (profitable)
  Progress: ${progressBar} ${progressPercent.toFixed(0)}%
  Status: ${result.shouldTimeout ? '🚨 TIMEOUT!' : '✅ Active'}
  Reason: ${result.reason}
`;
  }

  /**
   * Build a visual progress bar
   */
  private buildProgressBar(percent: number): string {
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const smartTimeoutManager = new SmartTimeoutManager();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if position should be timed out
 */
export function shouldTimeout(
  position: AdaptivePosition,
  currentPrice: number,
  currentRegime: MarketRegime
): boolean {
  return smartTimeoutManager.shouldTimeoutPosition(position, currentPrice, currentRegime).shouldTimeout;
}

/**
 * Get hours until timeout
 */
export function getHoursUntilTimeout(
  position: AdaptivePosition,
  currentPrice: number,
  currentRegime: MarketRegime
): number {
  return smartTimeoutManager.shouldTimeoutPosition(position, currentPrice, currentRegime).hoursRemaining;
}

/**
 * Check if position is near timeout (within 2 hours)
 */
export function isNearTimeout(
  position: AdaptivePosition,
  currentPrice: number,
  currentRegime: MarketRegime
): boolean {
  const result = smartTimeoutManager.shouldTimeoutPosition(position, currentPrice, currentRegime);
  return !result.shouldTimeout && result.hoursRemaining < 2;
}

/**
 * Get timeout multiplier for agent
 */
export function getAgentTimeoutMultiplier(agentProfile: AgentRiskProfile): number {
  return AGENT_TIMEOUT_MULTIPLIERS[agentProfile];
}

/**
 * Calculate effective timeout hours
 */
export function getEffectiveTimeoutHours(
  regime: MarketRegime,
  agentProfile: AgentRiskProfile,
  isProfitable: boolean
): number {
  const config = smartTimeoutManager.getTimeoutConfig(regime, agentProfile);
  return isProfitable ? config.effectiveProfitableHours : config.effectiveHours;
}

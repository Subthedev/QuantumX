/**
 * PARTIAL EXIT MANAGER
 *
 * Regime-adaptive partial exit system. Different market conditions
 * require different profit-taking strategies.
 *
 * EXIT SPLITS BY REGIME:
 * - HIGH VOL (BULLISH/BEARISH): 60% / 30% / 10% - Secure profits fast
 * - LOW VOL (BULLISH/BEARISH): 30% / 40% / 30% - Let it run
 * - RANGEBOUND: 70% / 25% / 5% - Mean reversion, exit quickly
 *
 * STOP ADJUSTMENT AFTER PARTIALS:
 * - TP1 hit → Move SL to break-even
 * - TP2 hit → Move SL to TP1 price
 * - TP3/Remaining → Trail with tight stop
 */

import {
  AdaptivePosition,
  PartialExit,
  TakeProfitTarget,
  MarketRegime,
  WyckoffPhase,
  AgentRiskProfile,
  AGENT_MULTIPLIERS,
} from './types';

import {
  REGIME_CONFIGS,
  WYCKOFF_CONFIGS,
  getPartialExitSplits,
  adjustTakeProfitForWyckoff,
} from './regimeTradeRules';

// ============================================================================
// INTERFACES
// ============================================================================

interface PartialExitResult {
  shouldExit: boolean;
  level: 1 | 2 | 3;
  exitQuantity: number;
  exitPrice: number;
  newStopLoss: number;
  reason: string;
  updatedTargets: TakeProfitTarget[];
}

interface ExitExecutionResult {
  success: boolean;
  partialExit: PartialExit;
  updatedPosition: AdaptivePosition;
}

// ============================================================================
// PARTIAL EXIT MANAGER
// ============================================================================

export class PartialExitManager {
  /**
   * Check if any partial exit should be triggered
   */
  checkPartialExits(
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime,
    currentWyckoff: WyckoffPhase
  ): PartialExitResult | null {
    // Get regime-specific exit splits
    const splits = getPartialExitSplits(currentRegime);
    const regimeConfig = REGIME_CONFIGS[currentRegime];
    const wyckoffConfig = WYCKOFF_CONFIGS[currentWyckoff];

    // Check each take profit level
    for (let level = 1; level <= 3; level++) {
      const tpTarget = position.takeProfitTargets.find(t => t.level === level);

      if (!tpTarget || tpTarget.triggered) continue;

      // Check if TP level is hit
      const isHit = this.isTakeProfitHit(position.direction, currentPrice, tpTarget.priceTarget);

      if (isHit) {
        // Calculate exit quantity based on regime splits
        const exitPercent = level === 1 ? splits.tp1 : level === 2 ? splits.tp2 : splits.tp3;
        const exitQuantity = position.remainingQuantity * (exitPercent / 100);

        // Calculate new stop loss after this partial exit
        const newStopLoss = this.calculateNewStopAfterPartial(
          position,
          level as 1 | 2 | 3,
          currentPrice
        );

        // Update targets
        const updatedTargets = this.updateTargetsAfterExit(
          position.takeProfitTargets,
          level as 1 | 2 | 3,
          currentPrice
        );

        return {
          shouldExit: true,
          level: level as 1 | 2 | 3,
          exitQuantity,
          exitPrice: currentPrice,
          newStopLoss,
          reason: this.buildExitReason(level as 1 | 2 | 3, currentPrice, exitPercent, currentRegime),
          updatedTargets,
        };
      }
    }

    return null;
  }

  /**
   * Execute a partial exit and update position
   */
  executePartialExit(
    position: AdaptivePosition,
    exitResult: PartialExitResult
  ): ExitExecutionResult {
    const now = Date.now();

    // Calculate P&L for this partial exit
    const pnlPercent = this.calculatePnLPercent(
      position.entryPrice,
      exitResult.exitPrice,
      position.direction
    );
    const pnlDollar = this.calculatePnLDollar(
      position.entryPrice,
      exitResult.exitPrice,
      exitResult.exitQuantity,
      position.direction,
      position.leverage
    );

    // Create partial exit record
    const partialExit: PartialExit = {
      level: exitResult.level,
      quantity: exitResult.exitQuantity,
      exitPrice: exitResult.exitPrice,
      pnlPercent,
      pnlDollar,
      timestamp: now,
      reason: exitResult.reason,
    };

    // Update position
    const updatedPosition: AdaptivePosition = {
      ...position,
      remainingQuantity: position.remainingQuantity - exitResult.exitQuantity,
      currentStopLoss: exitResult.newStopLoss,
      takeProfitTargets: exitResult.updatedTargets,
      partialExits: [...position.partialExits, partialExit],
      performance: {
        ...position.performance,
        realizedPnlDollar: position.performance.realizedPnlDollar + pnlDollar,
      },
      lastUpdatedAt: now,
    };

    console.log(
      `[PartialExitManager] TP${exitResult.level} executed for ${position.symbol}: ` +
      `${exitResult.exitQuantity.toFixed(4)} units @ $${exitResult.exitPrice.toFixed(2)} ` +
      `(P&L: $${pnlDollar.toFixed(2)}, New SL: $${exitResult.newStopLoss.toFixed(2)})`
    );

    return {
      success: true,
      partialExit,
      updatedPosition,
    };
  }

  /**
   * Recalculate take profit targets based on regime change
   */
  recalculateTargetsForRegime(
    position: AdaptivePosition,
    newRegime: MarketRegime,
    newWyckoff: WyckoffPhase
  ): TakeProfitTarget[] {
    const regimeConfig = REGIME_CONFIGS[newRegime];
    const splits = getPartialExitSplits(newRegime);

    const newTargets: TakeProfitTarget[] = [];

    for (let level = 1; level <= 3; level++) {
      const existingTarget = position.takeProfitTargets.find(t => t.level === level);

      // If already triggered, keep it
      if (existingTarget?.triggered) {
        newTargets.push(existingTarget);
        continue;
      }

      // Calculate new target price for this level
      const basePercent = level === 1 ? regimeConfig.tp1Percent
        : level === 2 ? regimeConfig.tp2Percent
        : regimeConfig.tp3Percent;

      // Adjust for Wyckoff phase
      const adjustedPercent = adjustTakeProfitForWyckoff(basePercent, newWyckoff);

      const priceTarget = position.direction === 'LONG'
        ? position.entryPrice * (1 + adjustedPercent / 100)
        : position.entryPrice * (1 - adjustedPercent / 100);

      const exitPercent = level === 1 ? splits.tp1 : level === 2 ? splits.tp2 : splits.tp3;

      newTargets.push({
        level: level as 1 | 2 | 3,
        priceTarget,
        percentOfPosition: exitPercent,
        triggered: false,
      });
    }

    return newTargets;
  }

  /**
   * Get remaining position after all partial exits
   */
  getRemainingPosition(position: AdaptivePosition): number {
    return position.remainingQuantity;
  }

  /**
   * Get total realized P&L from partial exits
   */
  getTotalRealizedPnL(position: AdaptivePosition): number {
    return position.partialExits.reduce((sum, exit) => sum + exit.pnlDollar, 0);
  }

  /**
   * Get average exit price from partial exits
   */
  getAverageExitPrice(position: AdaptivePosition): number | null {
    if (position.partialExits.length === 0) return null;

    const totalValue = position.partialExits.reduce(
      (sum, exit) => sum + (exit.exitPrice * exit.quantity),
      0
    );
    const totalQuantity = position.partialExits.reduce(
      (sum, exit) => sum + exit.quantity,
      0
    );

    return totalQuantity > 0 ? totalValue / totalQuantity : null;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Check if take profit level is hit
   */
  private isTakeProfitHit(
    direction: 'LONG' | 'SHORT',
    currentPrice: number,
    targetPrice: number
  ): boolean {
    if (direction === 'LONG') {
      return currentPrice >= targetPrice;
    } else {
      return currentPrice <= targetPrice;
    }
  }

  /**
   * Calculate new stop loss after partial exit
   */
  private calculateNewStopAfterPartial(
    position: AdaptivePosition,
    level: 1 | 2 | 3,
    currentPrice: number
  ): number {
    const { entryPrice, direction, takeProfitTargets } = position;

    switch (level) {
      case 1:
        // TP1 hit → Move stop to break-even (entry price)
        return entryPrice;

      case 2:
        // TP2 hit → Move stop to TP1 price
        const tp1 = takeProfitTargets.find(t => t.level === 1);
        return tp1?.priceTarget || entryPrice;

      case 3:
        // TP3 hit → Move stop to TP2 price or close position
        const tp2 = takeProfitTargets.find(t => t.level === 2);
        return tp2?.priceTarget || position.currentStopLoss;

      default:
        return position.currentStopLoss;
    }
  }

  /**
   * Update targets after a partial exit
   */
  private updateTargetsAfterExit(
    targets: TakeProfitTarget[],
    triggeredLevel: 1 | 2 | 3,
    exitPrice: number
  ): TakeProfitTarget[] {
    return targets.map(target => {
      if (target.level === triggeredLevel) {
        return {
          ...target,
          triggered: true,
          triggeredAt: Date.now(),
          triggeredPrice: exitPrice,
        };
      }
      return target;
    });
  }

  /**
   * Build exit reason string
   */
  private buildExitReason(
    level: 1 | 2 | 3,
    price: number,
    exitPercent: number,
    regime: MarketRegime
  ): string {
    return `TP${level} hit @ $${price.toFixed(2)} | ${exitPercent}% exit (${regime} regime)`;
  }

  /**
   * Calculate P&L percentage
   */
  private calculatePnLPercent(
    entryPrice: number,
    exitPrice: number,
    direction: 'LONG' | 'SHORT'
  ): number {
    if (direction === 'LONG') {
      return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
  }

  /**
   * Calculate P&L in dollars
   */
  private calculatePnLDollar(
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    direction: 'LONG' | 'SHORT',
    leverage: number
  ): number {
    const pnlPercent = this.calculatePnLPercent(entryPrice, exitPrice, direction);
    const notionalValue = entryPrice * quantity;
    return (pnlPercent / 100) * notionalValue * leverage;
  }

  /**
   * Get status for logging
   */
  getPartialExitStatus(position: AdaptivePosition): string {
    const totalExits = position.partialExits.length;
    const triggeredLevels = position.takeProfitTargets.filter(t => t.triggered).map(t => `TP${t.level}`);
    const pendingLevels = position.takeProfitTargets.filter(t => !t.triggered).map(t => `TP${t.level}`);
    const realizedPnL = this.getTotalRealizedPnL(position);
    const remainingPct = (position.remainingQuantity / position.quantity) * 100;

    return `
[PARTIAL EXIT STATUS]
  Total Exits: ${totalExits}
  Triggered: ${triggeredLevels.join(', ') || 'None'}
  Pending: ${pendingLevels.join(', ') || 'None'}
  Remaining: ${remainingPct.toFixed(1)}% (${position.remainingQuantity.toFixed(4)} units)
  Realized P&L: $${realizedPnL.toFixed(2)}
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const partialExitManager = new PartialExitManager();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if position has completed all partial exits
 */
export function hasCompletedAllExits(position: AdaptivePosition): boolean {
  return position.takeProfitTargets.every(t => t.triggered);
}

/**
 * Get the next pending take profit level
 */
export function getNextPendingTP(position: AdaptivePosition): TakeProfitTarget | null {
  return position.takeProfitTargets.find(t => !t.triggered) || null;
}

/**
 * Calculate distance to next TP level
 */
export function getDistanceToNextTP(
  position: AdaptivePosition,
  currentPrice: number
): { level: number; distance: number; distancePercent: number } | null {
  const nextTP = getNextPendingTP(position);
  if (!nextTP) return null;

  const distance = position.direction === 'LONG'
    ? nextTP.priceTarget - currentPrice
    : currentPrice - nextTP.priceTarget;

  const distancePercent = (distance / currentPrice) * 100;

  return {
    level: nextTP.level,
    distance,
    distancePercent,
  };
}

/**
 * Get regime-appropriate exit splits
 */
export function getExitSplitsForRegime(regime: MarketRegime): { tp1: number; tp2: number; tp3: number } {
  return getPartialExitSplits(regime);
}

/**
 * Should we tighten take profits based on Wyckoff phase?
 */
export function shouldTightenTargets(wyckoff: WyckoffPhase): boolean {
  // Tighten in distribution and markdown (smart money exiting)
  return wyckoff === 'DISTRIBUTION' || wyckoff === 'MARKDOWN';
}

/**
 * Should we extend take profits based on Wyckoff phase?
 */
export function shouldExtendTargets(wyckoff: WyckoffPhase): boolean {
  // Extend in markup (let profits run)
  return wyckoff === 'MARKUP';
}

/**
 * REGIME CHANGE HANDLER
 *
 * Tiered response system for market regime changes.
 * Not all regime changes require the same action.
 *
 * TIERED RESPONSE SYSTEM:
 * - HOLD: Regime change BUT position profitable AND confidence >60%
 *         → Just tighten stop-loss by 25%
 * - PARTIAL: Regime shifts adversely BUT same direction (bull→bull)
 *         → Exit 50%, move stop to breakeven
 * - EXIT: Direction flip (bull→bear or bear→bull)
 *         → EXIT IMMEDIATELY
 *
 * TOLERANCE SYSTEM:
 * - 1st Adverse Change: Tighten stop by 25%
 * - 2nd Adverse Change: Exit 60%, trail remaining 40% tightly
 * - 3rd Change: Full exit, no exceptions
 */

import {
  AdaptivePosition,
  MarketRegime,
  WyckoffPhase,
  PartialExit,
} from './types';

import {
  REGIME_CONFIGS,
  isDirectionFlip,
  isAdverseRegimeChange,
  getVolatilityFromRegime,
} from './regimeTradeRules';

// ============================================================================
// TYPES
// ============================================================================

type RegimeChangeAction = 'HOLD' | 'TIGHTEN_STOP' | 'PARTIAL_EXIT' | 'FULL_EXIT';

interface RegimeChangeResult {
  action: RegimeChangeAction;
  exitPercent: number; // 0 for HOLD, 50 for PARTIAL, 100 for FULL
  newStopPercent: number; // How much to tighten stop (0.75 = 25% tighter)
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface RegimeChangeEvent {
  timestamp: number;
  oldRegime: MarketRegime;
  newRegime: MarketRegime;
  action: RegimeChangeAction;
  positionId: string;
}

// ============================================================================
// REGIME CHANGE HANDLER
// ============================================================================

export class RegimeChangeHandler {
  private changeHistory: Map<string, RegimeChangeEvent[]> = new Map();

  /**
   * Handle a regime change for a position
   * This is the main method that determines the appropriate response
   */
  handleRegimeChange(
    position: AdaptivePosition,
    oldRegime: MarketRegime,
    newRegime: MarketRegime,
    currentPrice: number
  ): RegimeChangeResult {
    // Same regime = no action
    if (oldRegime === newRegime) {
      return {
        action: 'HOLD',
        exitPercent: 0,
        newStopPercent: 1.0,
        reason: 'No regime change',
        urgency: 'LOW',
      };
    }

    // Calculate position P&L
    const pnlPercent = this.calculatePnLPercent(position, currentPrice);
    const isProfitable = pnlPercent > 0.5; // Consider 0.5% as "profitable"
    const isHighConfidence = position.signalConfidence >= 60;

    // Track adverse changes
    const adverseCount = this.getAdverseChangeCount(position.id);

    // ===========================================
    // RULE 1: Direction flip = EXIT IMMEDIATELY
    // ===========================================
    if (isDirectionFlip(oldRegime, newRegime)) {
      this.recordChange(position.id, oldRegime, newRegime, 'FULL_EXIT');

      return {
        action: 'FULL_EXIT',
        exitPercent: 100,
        newStopPercent: 1.0,
        reason: `Direction flip detected: ${oldRegime} → ${newRegime}. EXIT IMMEDIATELY.`,
        urgency: 'CRITICAL',
      };
    }

    // ===========================================
    // RULE 2: Check if adverse for position
    // ===========================================
    const isAdverse = isAdverseRegimeChange(position.direction, oldRegime, newRegime);

    if (!isAdverse) {
      // Regime changed but not adversely (e.g., bullish high vol → bullish low vol for long)
      // Just monitor more closely
      return {
        action: 'HOLD',
        exitPercent: 0,
        newStopPercent: 1.0,
        reason: `Regime change ${oldRegime} → ${newRegime} is neutral/favorable for ${position.direction}`,
        urgency: 'LOW',
      };
    }

    // ===========================================
    // ADVERSE CHANGE HANDLING
    // ===========================================

    // Check tolerance based on regime config
    const regimeConfig = REGIME_CONFIGS[newRegime];
    const toleranceExceeded = adverseCount >= regimeConfig.regimeChangeTolerance;

    // ===========================================
    // TIERED RESPONSE BASED ON CONDITIONS
    // ===========================================

    // Tier 1: Profitable + High Confidence = Just tighten stop
    if (isProfitable && isHighConfidence && adverseCount < 2) {
      this.recordChange(position.id, oldRegime, newRegime, 'TIGHTEN_STOP');

      return {
        action: 'TIGHTEN_STOP',
        exitPercent: 0,
        newStopPercent: 0.75, // 25% tighter
        reason: `Adverse change #${adverseCount + 1} but profitable (${pnlPercent.toFixed(2)}%) with confidence ${position.signalConfidence}%. Tightening stop.`,
        urgency: 'MEDIUM',
      };
    }

    // Tier 2: Second adverse change or not profitable = Partial exit
    if (adverseCount >= 1 && adverseCount < regimeConfig.regimeChangeTolerance) {
      this.recordChange(position.id, oldRegime, newRegime, 'PARTIAL_EXIT');

      return {
        action: 'PARTIAL_EXIT',
        exitPercent: 60, // Exit 60% of remaining
        newStopPercent: 0.5, // 50% tighter (very tight trailing)
        reason: `Adverse change #${adverseCount + 1}: ${oldRegime} → ${newRegime}. Exiting 60%, trailing remainder tightly.`,
        urgency: 'HIGH',
      };
    }

    // Tier 3: Tolerance exceeded = Full exit
    if (toleranceExceeded) {
      this.recordChange(position.id, oldRegime, newRegime, 'FULL_EXIT');

      return {
        action: 'FULL_EXIT',
        exitPercent: 100,
        newStopPercent: 1.0,
        reason: `Tolerance exceeded (${adverseCount + 1} adverse changes). Full exit required.`,
        urgency: 'CRITICAL',
      };
    }

    // Default: First adverse change, not very profitable
    this.recordChange(position.id, oldRegime, newRegime, 'TIGHTEN_STOP');

    return {
      action: 'TIGHTEN_STOP',
      exitPercent: 0,
      newStopPercent: 0.75,
      reason: `First adverse change: ${oldRegime} → ${newRegime}. Tightening stop, monitoring closely.`,
      urgency: 'MEDIUM',
    };
  }

  /**
   * Apply regime change action to position
   */
  applyRegimeChange(
    position: AdaptivePosition,
    result: RegimeChangeResult,
    currentPrice: number
  ): { updatedPosition: AdaptivePosition; partialExit?: PartialExit } {
    const now = Date.now();

    switch (result.action) {
      case 'HOLD':
        return { updatedPosition: position };

      case 'TIGHTEN_STOP': {
        // Tighten stop by the specified percentage
        const currentDistance = position.direction === 'LONG'
          ? position.entryPrice - position.currentStopLoss
          : position.currentStopLoss - position.entryPrice;

        const newDistance = currentDistance * result.newStopPercent;
        const newStopLoss = position.direction === 'LONG'
          ? currentPrice - newDistance
          : currentPrice + newDistance;

        // Only move stop if it's better (tighter)
        const betterStop = position.direction === 'LONG'
          ? Math.max(newStopLoss, position.currentStopLoss)
          : Math.min(newStopLoss, position.currentStopLoss);

        console.log(
          `[RegimeChange] Tightening stop for ${position.symbol}: ` +
          `$${position.currentStopLoss.toFixed(2)} → $${betterStop.toFixed(2)}`
        );

        return {
          updatedPosition: {
            ...position,
            currentStopLoss: betterStop,
            regimeTracking: {
              ...position.regimeTracking,
              adverseChangeCount: position.regimeTracking.adverseChangeCount + 1,
            },
            lastUpdatedAt: now,
          },
        };
      }

      case 'PARTIAL_EXIT': {
        // Create partial exit
        const exitQuantity = position.remainingQuantity * (result.exitPercent / 100);
        const pnlPercent = this.calculatePnLPercent(position, currentPrice);
        const pnlDollar = this.calculatePnLDollar(position, currentPrice, exitQuantity);

        const partialExit: PartialExit = {
          level: 'REGIME_CHANGE',
          quantity: exitQuantity,
          exitPrice: currentPrice,
          pnlPercent,
          pnlDollar,
          timestamp: now,
          reason: result.reason,
        };

        // Move stop to break-even
        const breakEvenStop = position.entryPrice;

        console.log(
          `[RegimeChange] Partial exit for ${position.symbol}: ` +
          `${exitQuantity.toFixed(4)} units @ $${currentPrice.toFixed(2)} (${result.exitPercent}%)`
        );

        return {
          updatedPosition: {
            ...position,
            remainingQuantity: position.remainingQuantity - exitQuantity,
            currentStopLoss: breakEvenStop,
            partialExits: [...position.partialExits, partialExit],
            regimeTracking: {
              ...position.regimeTracking,
              adverseChangeCount: position.regimeTracking.adverseChangeCount + 1,
            },
            performance: {
              ...position.performance,
              realizedPnlDollar: position.performance.realizedPnlDollar + pnlDollar,
            },
            lastUpdatedAt: now,
          },
          partialExit,
        };
      }

      case 'FULL_EXIT': {
        // Signal full exit (actual execution happens in main system)
        console.log(
          `[RegimeChange] FULL EXIT required for ${position.symbol}: ${result.reason}`
        );

        return {
          updatedPosition: {
            ...position,
            regimeTracking: {
              ...position.regimeTracking,
              adverseChangeCount: position.regimeTracking.adverseChangeCount + 1,
            },
            lastUpdatedAt: now,
          },
        };
      }

      default:
        return { updatedPosition: position };
    }
  }

  /**
   * Check if regime change warrants forced exit
   */
  shouldForceExit(
    position: AdaptivePosition,
    oldRegime: MarketRegime,
    newRegime: MarketRegime
  ): boolean {
    const regimeConfig = REGIME_CONFIGS[oldRegime];

    // Force exit on direction flip if configured
    if (regimeConfig.forceExitOnDirectionFlip && isDirectionFlip(oldRegime, newRegime)) {
      return true;
    }

    // Force exit if tolerance exceeded
    const adverseCount = position.regimeTracking.adverseChangeCount;
    if (adverseCount >= regimeConfig.regimeChangeTolerance) {
      return true;
    }

    return false;
  }

  /**
   * Analyze regime transition for risk
   */
  analyzeRegimeTransition(
    oldRegime: MarketRegime,
    newRegime: MarketRegime,
    positionDirection: 'LONG' | 'SHORT'
  ): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    recommendation: string;
  } {
    // Direction flip = critical
    if (isDirectionFlip(oldRegime, newRegime)) {
      return {
        riskLevel: 'CRITICAL',
        description: `Market direction reversed: ${oldRegime} → ${newRegime}`,
        recommendation: 'Exit position immediately',
      };
    }

    // Moving to rangebound from trending
    if (newRegime === 'RANGEBOUND' && oldRegime !== 'RANGEBOUND') {
      return {
        riskLevel: 'HIGH',
        description: `Trend exhaustion: ${oldRegime} → RANGEBOUND`,
        recommendation: 'Take profits on 50-60% of position',
      };
    }

    // Volatility increase
    const oldVol = getVolatilityFromRegime(oldRegime);
    const newVol = getVolatilityFromRegime(newRegime);

    if (newVol === 'HIGH' && oldVol === 'LOW') {
      return {
        riskLevel: 'MEDIUM',
        description: `Volatility spike: ${oldRegime} → ${newRegime}`,
        recommendation: 'Widen stops, consider partial profit taking',
      };
    }

    // Same direction, different volatility
    return {
      riskLevel: 'LOW',
      description: `Regime shift: ${oldRegime} → ${newRegime}`,
      recommendation: 'Adjust position parameters, no immediate action needed',
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Calculate P&L percentage
   */
  private calculatePnLPercent(position: AdaptivePosition, currentPrice: number): number {
    if (position.direction === 'LONG') {
      return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    } else {
      return ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
    }
  }

  /**
   * Calculate P&L in dollars
   */
  private calculatePnLDollar(
    position: AdaptivePosition,
    currentPrice: number,
    quantity: number
  ): number {
    const pnlPercent = this.calculatePnLPercent(position, currentPrice);
    const notionalValue = position.entryPrice * quantity;
    return (pnlPercent / 100) * notionalValue * position.leverage;
  }

  /**
   * Record a regime change event
   */
  private recordChange(
    positionId: string,
    oldRegime: MarketRegime,
    newRegime: MarketRegime,
    action: RegimeChangeAction
  ): void {
    const event: RegimeChangeEvent = {
      timestamp: Date.now(),
      oldRegime,
      newRegime,
      action,
      positionId,
    };

    const history = this.changeHistory.get(positionId) || [];
    history.push(event);
    this.changeHistory.set(positionId, history);
  }

  /**
   * Get count of adverse changes for position
   */
  private getAdverseChangeCount(positionId: string): number {
    const history = this.changeHistory.get(positionId) || [];
    return history.filter(e =>
      e.action === 'TIGHTEN_STOP' ||
      e.action === 'PARTIAL_EXIT'
    ).length;
  }

  /**
   * Get regime change history for position
   */
  getChangeHistory(positionId: string): RegimeChangeEvent[] {
    return this.changeHistory.get(positionId) || [];
  }

  /**
   * Clear history for closed position
   */
  clearHistory(positionId: string): void {
    this.changeHistory.delete(positionId);
  }

  /**
   * Get status string for logging
   */
  getRegimeChangeStatus(
    position: AdaptivePosition,
    currentRegime: MarketRegime
  ): string {
    const history = this.getChangeHistory(position.id);
    const adverseCount = position.regimeTracking.adverseChangeCount;
    const tolerance = REGIME_CONFIGS[currentRegime].regimeChangeTolerance;

    let status = `
[REGIME CHANGE STATUS] ${position.symbol}
  Entry Regime: ${position.regimeTracking.regimeAtEntry}
  Current Regime: ${currentRegime}
  Total Changes: ${position.regimeTracking.regimeChangeCount}
  Adverse Changes: ${adverseCount} / ${tolerance} (tolerance)
  Direction: ${position.direction}
`;

    if (history.length > 0) {
      status += `  Recent Events:\n`;
      history.slice(-3).forEach(e => {
        status += `    - ${new Date(e.timestamp).toISOString()}: ${e.oldRegime} → ${e.newRegime} (${e.action})\n`;
      });
    }

    return status;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const regimeChangeHandler = new RegimeChangeHandler();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if regime change is critical
 */
export function isCriticalRegimeChange(
  oldRegime: MarketRegime,
  newRegime: MarketRegime
): boolean {
  return isDirectionFlip(oldRegime, newRegime);
}

/**
 * Get recommended action for regime change
 */
export function getRecommendedAction(
  position: AdaptivePosition,
  oldRegime: MarketRegime,
  newRegime: MarketRegime,
  currentPrice: number
): RegimeChangeAction {
  return regimeChangeHandler.handleRegimeChange(
    position,
    oldRegime,
    newRegime,
    currentPrice
  ).action;
}

/**
 * Check if position should be monitored more closely
 */
export function shouldIncreaseMonitoring(
  position: AdaptivePosition,
  currentRegime: MarketRegime
): boolean {
  const tolerance = REGIME_CONFIGS[currentRegime].regimeChangeTolerance;
  return position.regimeTracking.adverseChangeCount >= tolerance - 1;
}

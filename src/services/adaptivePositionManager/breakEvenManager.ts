/**
 * BREAK-EVEN MANAGER
 *
 * Moves stop loss to entry price once profit threshold is reached.
 * This is a key survival mechanism - ensures you never turn a winner into a loser.
 *
 * KEY FEATURES:
 * 1. Regime-specific activation thresholds (0.4% rangebound to 0.8% trending)
 * 2. Fee-inclusive break-even price (accounts for round-trip fees)
 * 3. Once activated, never deactivates
 * 4. Works alongside trailing stop (break-even is minimum guarantee)
 */

import {
  AdaptivePosition,
  BreakEvenState,
  MarketRegime,
  WyckoffPhase,
  DEFAULT_FEE_PERCENT,
} from './types';

import { REGIME_CONFIGS, WYCKOFF_CONFIGS } from './regimeTradeRules';

// ============================================================================
// INTERFACES
// ============================================================================

interface BreakEvenParams {
  currentPrice: number;
  entryPrice: number;
  direction: 'LONG' | 'SHORT';
  regime: MarketRegime;
  wyckoff: WyckoffPhase;
  existingState: BreakEvenState;
  feePercent?: number; // Round-trip fee as percentage
}

interface BreakEvenResult {
  shouldActivate: boolean;
  breakEvenPrice: number;
  reason: string;
}

// ============================================================================
// BREAK-EVEN MANAGER
// ============================================================================

export class BreakEvenManager {
  private defaultFeePercent: number;

  constructor(defaultFeePercent: number = DEFAULT_FEE_PERCENT) {
    this.defaultFeePercent = defaultFeePercent;
  }

  /**
   * Check if break-even should be activated and calculate break-even price
   */
  checkBreakEven(params: BreakEvenParams): BreakEvenResult {
    const {
      currentPrice,
      entryPrice,
      direction,
      regime,
      wyckoff,
      existingState,
      feePercent = this.defaultFeePercent,
    } = params;

    // If already activated, maintain break-even
    if (existingState.isActivated) {
      return {
        shouldActivate: true,
        breakEvenPrice: existingState.breakEvenPrice,
        reason: `Break-even active since ${new Date(existingState.activatedAt || 0).toISOString()}`,
      };
    }

    // Get regime configuration
    const regimeConfig = REGIME_CONFIGS[regime];
    const wyckoffConfig = WYCKOFF_CONFIGS[wyckoff];

    // Adjust activation threshold based on Wyckoff phase
    let activationThreshold = regimeConfig.breakEvenActivation;

    // Wyckoff adjustments:
    // - Distribution: Earlier break-even (protect profits)
    // - Accumulation: Later break-even (give room to breathe)
    if (wyckoff === 'DISTRIBUTION' || wyckoff === 'MARKDOWN') {
      activationThreshold *= 0.8; // 20% earlier
    } else if (wyckoff === 'ACCUMULATION') {
      activationThreshold *= 1.2; // 20% later
    }

    // Calculate current P&L
    const pnlPercent = this.calculatePnLPercent(currentPrice, entryPrice, direction);

    // Check if threshold reached
    if (pnlPercent < activationThreshold) {
      return {
        shouldActivate: false,
        breakEvenPrice: this.calculateBreakEvenPrice(entryPrice, direction, feePercent),
        reason: `Waiting for +${activationThreshold.toFixed(2)}% profit (current: ${pnlPercent.toFixed(2)}%)`,
      };
    }

    // Calculate break-even price including fees
    const breakEvenPrice = this.calculateBreakEvenPrice(entryPrice, direction, feePercent);

    return {
      shouldActivate: true,
      breakEvenPrice,
      reason: `Break-even activated at ${pnlPercent.toFixed(2)}% profit (threshold: ${activationThreshold.toFixed(2)}%)`,
    };
  }

  /**
   * Update position's break-even state
   */
  updatePositionBreakEven(
    position: AdaptivePosition,
    currentPrice: number,
    feePercent?: number
  ): AdaptivePosition {
    const result = this.checkBreakEven({
      currentPrice,
      entryPrice: position.entryPrice,
      direction: position.direction,
      regime: position.regimeTracking.currentRegime,
      wyckoff: position.regimeTracking.currentWyckoff,
      existingState: position.breakEven,
      feePercent,
    });

    // If should activate and not already active
    if (result.shouldActivate && !position.breakEven.isActivated) {
      const updatedBreakEven: BreakEvenState = {
        isActivated: true,
        activatedAt: Date.now(),
        breakEvenPrice: result.breakEvenPrice,
        originalStopPrice: position.currentStopLoss,
      };

      // Move stop loss to break-even if better than current
      const newStopLoss = this.getBetterStop(
        result.breakEvenPrice,
        position.currentStopLoss,
        position.direction
      );

      console.log(
        `[BreakEven] Position ${position.id}: ${result.reason}. ` +
        `Moving SL from $${position.currentStopLoss.toFixed(2)} to $${newStopLoss.toFixed(2)}`
      );

      return {
        ...position,
        breakEven: updatedBreakEven,
        currentStopLoss: newStopLoss,
        lastUpdatedAt: Date.now(),
      };
    }

    return position;
  }

  /**
   * Check if position is currently at break-even or better
   */
  isAtBreakEvenOrBetter(position: AdaptivePosition, currentPrice: number): boolean {
    if (!position.breakEven.isActivated) return false;

    if (position.direction === 'LONG') {
      return position.currentStopLoss >= position.breakEven.breakEvenPrice;
    } else {
      return position.currentStopLoss <= position.breakEven.breakEvenPrice;
    }
  }

  /**
   * Get guaranteed profit if break-even is active
   * Returns the minimum profit locked in by break-even stop
   */
  getGuaranteedProfit(position: AdaptivePosition): number {
    if (!position.breakEven.isActivated) {
      return 0; // No guaranteed profit yet
    }

    const { direction, entryPrice, currentStopLoss, quantity } = position;

    if (direction === 'LONG') {
      const priceDiff = currentStopLoss - entryPrice;
      return priceDiff * quantity;
    } else {
      const priceDiff = entryPrice - currentStopLoss;
      return priceDiff * quantity;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate P&L percentage
   */
  private calculatePnLPercent(
    currentPrice: number,
    entryPrice: number,
    direction: 'LONG' | 'SHORT'
  ): number {
    if (direction === 'LONG') {
      return ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - currentPrice) / entryPrice) * 100;
    }
  }

  /**
   * Calculate break-even price including fees
   * For LONG: entry + fees
   * For SHORT: entry - fees
   */
  private calculateBreakEvenPrice(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    feePercent: number
  ): number {
    // Fee is round-trip (entry + exit)
    const feeAmount = entryPrice * (feePercent / 100);

    if (direction === 'LONG') {
      // Need price to be above entry + fees to be truly break-even
      return entryPrice + feeAmount;
    } else {
      // Need price to be below entry - fees for shorts
      return entryPrice - feeAmount;
    }
  }

  /**
   * Get the better (more favorable) stop price
   */
  private getBetterStop(
    newStop: number,
    existingStop: number,
    direction: 'LONG' | 'SHORT'
  ): number {
    if (direction === 'LONG') {
      return Math.max(newStop, existingStop);
    } else {
      return Math.min(newStop, existingStop);
    }
  }

  /**
   * Get break-even status for logging
   */
  getBreakEvenStatus(position: AdaptivePosition): string {
    const { breakEven, direction, entryPrice, currentStopLoss } = position;

    if (!breakEven.isActivated) {
      return `[BREAK-EVEN] Not yet activated`;
    }

    const guaranteedProfit = this.getGuaranteedProfit(position);
    const stopAboveEntry = direction === 'LONG'
      ? currentStopLoss > entryPrice
      : currentStopLoss < entryPrice;

    let status = `[BREAK-EVEN] Active since ${new Date(breakEven.activatedAt || 0).toLocaleTimeString()}`;
    status += ` | BE Price: $${breakEven.breakEvenPrice.toFixed(2)}`;
    status += ` | Current SL: $${currentStopLoss.toFixed(2)}`;
    status += ` | Guaranteed: $${guaranteedProfit.toFixed(2)}`;

    if (stopAboveEntry) {
      status += ' | PROFIT LOCKED';
    }

    return status;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const breakEvenManager = new BreakEvenManager();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if break-even is active for a position
 */
export function isBreakEvenActive(position: AdaptivePosition): boolean {
  return position.breakEven.isActivated;
}

/**
 * Quick check if position can lose money (not at break-even yet)
 */
export function canLoseMoney(position: AdaptivePosition): boolean {
  if (!position.breakEven.isActivated) return true;

  const { direction, entryPrice, currentStopLoss } = position;

  if (direction === 'LONG') {
    return currentStopLoss < entryPrice;
  } else {
    return currentStopLoss > entryPrice;
  }
}

/**
 * Calculate the activation threshold for a regime
 */
export function getBreakEvenThreshold(
  regime: MarketRegime,
  wyckoff: WyckoffPhase
): number {
  const regimeConfig = REGIME_CONFIGS[regime];
  let threshold = regimeConfig.breakEvenActivation;

  if (wyckoff === 'DISTRIBUTION' || wyckoff === 'MARKDOWN') {
    threshold *= 0.8;
  } else if (wyckoff === 'ACCUMULATION') {
    threshold *= 1.2;
  }

  return threshold;
}

/**
 * Create initial break-even state for a new position
 */
export function createInitialBreakEvenState(
  entryPrice: number,
  originalStopLoss: number,
  direction: 'LONG' | 'SHORT',
  feePercent: number = DEFAULT_FEE_PERCENT
): BreakEvenState {
  const feeAmount = entryPrice * (feePercent / 100);
  const breakEvenPrice = direction === 'LONG'
    ? entryPrice + feeAmount
    : entryPrice - feeAmount;

  return {
    isActivated: false,
    activatedAt: undefined,
    breakEvenPrice,
    originalStopPrice: originalStopLoss,
  };
}

/**
 * TRAILING STOP ENGINE
 *
 * ATR-based trailing stop system with regime-aware adjustments.
 * Designed to lock in profits while giving positions room to breathe.
 *
 * KEY FEATURES:
 * 1. ATR-based distance calculation (adapts to volatility)
 * 2. Regime-specific multipliers (wider in high vol, tighter in rangebound)
 * 3. Agent-specific adjustments (aggressive vs conservative)
 * 4. Profit-triggered activation (don't trail until in profit)
 * 5. Acceleration at higher profits (tighten as profit grows)
 */

import {
  AdaptivePosition,
  TrailingStopState,
  MarketRegime,
  WyckoffPhase,
  ATRData,
  AgentRiskProfile,
  AGENT_MULTIPLIERS,
  MIN_TRAILING_STOP_PERCENT,
} from './types';

import {
  REGIME_CONFIGS,
  WYCKOFF_CONFIGS,
  adjustStopWidthForWyckoff,
} from './regimeTradeRules';

// ============================================================================
// INTERFACES
// ============================================================================

interface TrailingStopParams {
  currentPrice: number;
  entryPrice: number;
  direction: 'LONG' | 'SHORT';
  regime: MarketRegime;
  wyckoff: WyckoffPhase;
  agentProfile: AgentRiskProfile;
  atr: ATRData;
  existingState?: TrailingStopState;
}

interface TrailingStopResult {
  shouldActivate: boolean;
  newStopPrice: number;
  distancePercent: number;
  distanceATR: number;
  highWaterMark: number;
  accelerationActive: boolean;
  reason: string;
}

// ============================================================================
// TRAILING STOP ENGINE
// ============================================================================

export class TrailingStopEngine {
  /**
   * Calculate the trailing stop for a position
   * This is the core method that determines where the trailing stop should be
   */
  calculateTrailingStop(params: TrailingStopParams): TrailingStopResult {
    const {
      currentPrice,
      entryPrice,
      direction,
      regime,
      wyckoff,
      agentProfile,
      atr,
      existingState,
    } = params;

    const regimeConfig = REGIME_CONFIGS[regime];
    const wyckoffConfig = WYCKOFF_CONFIGS[wyckoff];
    const agentMultipliers = AGENT_MULTIPLIERS[agentProfile];

    // Calculate current P&L percentage
    const pnlPercent = this.calculatePnLPercent(currentPrice, entryPrice, direction);

    // Determine high water mark (best price achieved)
    const highWaterMark = this.calculateHighWaterMark(
      currentPrice,
      direction,
      existingState?.highWaterMark
    );

    // Check if trailing stop should be activated
    const shouldActivate = this.shouldActivateTrailingStop(
      pnlPercent,
      regimeConfig.trailingStopActivation,
      existingState?.isActive
    );

    // If not activated yet, return initial state
    if (!shouldActivate) {
      return {
        shouldActivate: false,
        newStopPrice: existingState?.currentStopPrice || this.calculateInitialStop(
          entryPrice,
          direction,
          regimeConfig.trailingStopATRMultiplier,
          atr,
          agentMultipliers.trailingStopMultiplier
        ),
        distancePercent: 0,
        distanceATR: 0,
        highWaterMark,
        accelerationActive: false,
        reason: `Waiting for activation (need +${regimeConfig.trailingStopActivation}%, current: ${pnlPercent.toFixed(2)}%)`,
      };
    }

    // Check if acceleration should kick in (tighter trailing at higher profits)
    const accelerationActive = pnlPercent >= regimeConfig.trailingStopAcceleration;

    // Calculate base trailing distance
    let trailingDistanceATR = regimeConfig.trailingStopATRMultiplier;

    // Apply Wyckoff adjustment
    trailingDistanceATR = adjustStopWidthForWyckoff(trailingDistanceATR, wyckoff);

    // Apply agent multiplier
    trailingDistanceATR *= agentMultipliers.trailingStopMultiplier;

    // Apply acceleration (tighten by 30% when in high profit)
    if (accelerationActive) {
      trailingDistanceATR *= 0.7; // 30% tighter
    }

    // Calculate stop distance in price terms
    const stopDistancePrice = trailingDistanceATR * atr.atr;
    const stopDistancePercent = (stopDistancePrice / currentPrice) * 100;

    // Ensure minimum trailing distance (prevent whipsaw)
    const effectiveDistancePercent = Math.max(stopDistancePercent, MIN_TRAILING_STOP_PERCENT);
    const effectiveDistancePrice = (effectiveDistancePercent / 100) * highWaterMark;

    // Calculate new trailing stop price from high water mark
    const newStopPrice = this.calculateTrailingStopPrice(
      highWaterMark,
      effectiveDistancePrice,
      direction
    );

    // Only move stop if it improves (never move against position)
    const finalStopPrice = this.getBestStopPrice(
      newStopPrice,
      existingState?.currentStopPrice,
      direction
    );

    // Determine reason for the stop level
    let reason = `Trailing ${effectiveDistancePercent.toFixed(2)}% from HWM $${highWaterMark.toFixed(2)}`;
    if (accelerationActive) {
      reason += ` [ACCELERATED - profit at ${pnlPercent.toFixed(1)}%]`;
    }

    return {
      shouldActivate: true,
      newStopPrice: finalStopPrice,
      distancePercent: effectiveDistancePercent,
      distanceATR: trailingDistanceATR,
      highWaterMark,
      accelerationActive,
      reason,
    };
  }

  /**
   * Update position's trailing stop state
   */
  updatePositionTrailingStop(
    position: AdaptivePosition,
    currentPrice: number,
    atr: ATRData
  ): AdaptivePosition {
    const result = this.calculateTrailingStop({
      currentPrice,
      entryPrice: position.entryPrice,
      direction: position.direction,
      regime: position.regimeTracking.currentRegime,
      wyckoff: position.regimeTracking.currentWyckoff,
      agentProfile: position.agentRiskProfile,
      atr,
      existingState: position.trailingStop,
    });

    // Update trailing stop state
    const updatedTrailingStop: TrailingStopState = {
      isActive: result.shouldActivate,
      currentStopPrice: result.newStopPrice,
      initialStopPrice: position.trailingStop.initialStopPrice || position.originalStopLoss,
      distancePercent: result.distancePercent,
      distanceATR: result.distanceATR,
      highWaterMark: result.highWaterMark,
      lastUpdatedAt: Date.now(),
      accelerationActive: result.accelerationActive,
    };

    // Update current stop loss if trailing stop is better
    const newCurrentStopLoss = this.getBestStopPrice(
      result.newStopPrice,
      position.currentStopLoss,
      position.direction
    );

    return {
      ...position,
      trailingStop: updatedTrailingStop,
      currentStopLoss: newCurrentStopLoss,
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Check if trailing stop has been hit
   */
  isTrailingStopHit(
    position: AdaptivePosition,
    currentPrice: number
  ): { isHit: boolean; exitPrice: number; reason: string } {
    if (!position.trailingStop.isActive) {
      return {
        isHit: false,
        exitPrice: 0,
        reason: 'Trailing stop not active',
      };
    }

    const stopPrice = position.trailingStop.currentStopPrice;

    if (position.direction === 'LONG') {
      if (currentPrice <= stopPrice) {
        return {
          isHit: true,
          exitPrice: stopPrice,
          reason: `Trailing stop hit at $${stopPrice.toFixed(2)} (HWM: $${position.trailingStop.highWaterMark.toFixed(2)})`,
        };
      }
    } else {
      // SHORT position
      if (currentPrice >= stopPrice) {
        return {
          isHit: true,
          exitPrice: stopPrice,
          reason: `Trailing stop hit at $${stopPrice.toFixed(2)} (HWM: $${position.trailingStop.highWaterMark.toFixed(2)})`,
        };
      }
    }

    return {
      isHit: false,
      exitPrice: 0,
      reason: `Trailing stop at $${stopPrice.toFixed(2)}, current: $${currentPrice.toFixed(2)}`,
    };
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
   * Calculate high water mark (best favorable price)
   */
  private calculateHighWaterMark(
    currentPrice: number,
    direction: 'LONG' | 'SHORT',
    existingHWM?: number
  ): number {
    if (direction === 'LONG') {
      // For longs, HWM is the highest price
      return Math.max(currentPrice, existingHWM || currentPrice);
    } else {
      // For shorts, HWM is the lowest price
      return existingHWM ? Math.min(currentPrice, existingHWM) : currentPrice;
    }
  }

  /**
   * Check if trailing stop should be activated
   */
  private shouldActivateTrailingStop(
    pnlPercent: number,
    activationThreshold: number,
    alreadyActive?: boolean
  ): boolean {
    // Once activated, stay activated
    if (alreadyActive) return true;

    // Activate when profit exceeds threshold
    return pnlPercent >= activationThreshold;
  }

  /**
   * Calculate initial stop loss (before trailing activates)
   */
  private calculateInitialStop(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    atrMultiplier: number,
    atr: ATRData,
    agentMultiplier: number
  ): number {
    const stopDistance = atrMultiplier * atr.atr * agentMultiplier;

    if (direction === 'LONG') {
      return entryPrice - stopDistance;
    } else {
      return entryPrice + stopDistance;
    }
  }

  /**
   * Calculate trailing stop price from high water mark
   */
  private calculateTrailingStopPrice(
    highWaterMark: number,
    distancePrice: number,
    direction: 'LONG' | 'SHORT'
  ): number {
    if (direction === 'LONG') {
      return highWaterMark - distancePrice;
    } else {
      return highWaterMark + distancePrice;
    }
  }

  /**
   * Get the best (most favorable) stop price
   * For LONG: higher stop is better (locks more profit)
   * For SHORT: lower stop is better (locks more profit)
   */
  private getBestStopPrice(
    newStop: number,
    existingStop: number | undefined,
    direction: 'LONG' | 'SHORT'
  ): number {
    if (!existingStop) return newStop;

    if (direction === 'LONG') {
      return Math.max(newStop, existingStop);
    } else {
      return Math.min(newStop, existingStop);
    }
  }

  /**
   * Get trailing stop status for logging/debugging
   */
  getTrailingStopStatus(position: AdaptivePosition, currentPrice: number): string {
    const { trailingStop } = position;

    if (!trailingStop.isActive) {
      return `[TRAILING] Inactive - waiting for profit threshold`;
    }

    const distanceFromStop = position.direction === 'LONG'
      ? ((currentPrice - trailingStop.currentStopPrice) / currentPrice) * 100
      : ((trailingStop.currentStopPrice - currentPrice) / currentPrice) * 100;

    const hwmDistance = position.direction === 'LONG'
      ? ((trailingStop.highWaterMark - currentPrice) / trailingStop.highWaterMark) * 100
      : ((currentPrice - trailingStop.highWaterMark) / trailingStop.highWaterMark) * 100;

    let status = `[TRAILING] Active - Stop: $${trailingStop.currentStopPrice.toFixed(2)}`;
    status += ` | Distance: ${distanceFromStop.toFixed(2)}%`;
    status += ` | HWM: $${trailingStop.highWaterMark.toFixed(2)}`;
    status += ` | From HWM: ${hwmDistance.toFixed(2)}%`;

    if (trailingStop.accelerationActive) {
      status += ' | ACCELERATED';
    }

    return status;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const trailingStopEngine = new TrailingStopEngine();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if trailing stop should update
 */
export function shouldUpdateTrailingStop(
  position: AdaptivePosition,
  currentPrice: number
): boolean {
  // Only update if trailing is active
  if (!position.trailingStop.isActive) return false;

  // Check if we have a new high water mark
  if (position.direction === 'LONG') {
    return currentPrice > position.trailingStop.highWaterMark;
  } else {
    return currentPrice < position.trailingStop.highWaterMark;
  }
}

/**
 * Calculate ATR from recent price data
 * This is a utility for when we don't have ATR from external source
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (highs.length < period + 1) {
    // Not enough data, use approximation
    const avgRange = highs.reduce((sum, h, i) => sum + (h - lows[i]), 0) / highs.length;
    return avgRange;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    const trueRange = Math.max(highLow, highClose, lowClose);
    trueRanges.push(trueRange);
  }

  // Calculate ATR as EMA of true ranges
  const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;

  return atr;
}

/**
 * Create ATR data object from calculated ATR
 */
export function createATRData(
  symbol: string,
  atr: number,
  currentPrice: number,
  period: number = 14
): ATRData {
  return {
    symbol,
    atr,
    atrPercent: (atr / currentPrice) * 100,
    period,
    lastUpdatedAt: Date.now(),
  };
}

/**
 * WYCKOFF PHASE MANAGER
 *
 * Position management based on Wyckoff market cycle phases.
 * This is Layer 2 of the dual-layer system - determines HOW to trade.
 *
 * WYCKOFF 4 PHASES:
 * - ACCUMULATION: Smart money loading - wide stops, patient entries
 *   → 70% Kelly, 2.5x ATR stops, 1.5x hold time, 1.2x TP extension
 *
 * - MARKUP: Uptrend confirmed - let profits run
 *   → 100% Kelly, 2.0x ATR stops, 1.0x hold time, 1.3x TP extension
 *
 * - DISTRIBUTION: Smart money selling - take profits early
 *   → 50% Kelly, 1.5x ATR stops, 0.7x hold time, 0.8x TP contraction
 *
 * - MARKDOWN: Downtrend confirmed - avoid longs, tight stops
 *   → 30% Kelly, 1.5x ATR stops, 0.5x hold time, 0.7x TP contraction
 */

import {
  AdaptivePosition,
  WyckoffPhase,
  MarketRegime,
  WyckoffConfig,
  AgentRiskProfile,
  AGENT_MULTIPLIERS,
} from './types';

import {
  WYCKOFF_CONFIGS,
  adjustPositionSizeForWyckoff,
  adjustStopWidthForWyckoff,
  adjustTakeProfitForWyckoff,
} from './regimeTradeRules';

// ============================================================================
// TYPES
// ============================================================================

interface WyckoffAdjustments {
  positionSizeMultiplier: number;
  stopWidthMultiplier: number;
  holdTimeMultiplier: number;
  tpExtensionFactor: number;
}

interface WyckoffTransitionResult {
  shouldAdjust: boolean;
  adjustments: WyckoffAdjustments;
  newStopLoss?: number;
  recommendation: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PhaseCompatibility {
  isCompatible: boolean;
  riskFactor: number; // 1.0 = normal, >1 = higher risk
  reason: string;
}

// ============================================================================
// WYCKOFF PHASE MANAGER
// ============================================================================

export class WyckoffPhaseManager {
  /**
   * Get adjustments for a Wyckoff phase
   */
  getPhaseAdjustments(phase: WyckoffPhase): WyckoffAdjustments {
    const config = WYCKOFF_CONFIGS[phase];
    return {
      positionSizeMultiplier: config.positionSizeMultiplier,
      stopWidthMultiplier: config.stopWidthATRMultiplier / 2.0, // Normalize to base 1.0
      holdTimeMultiplier: config.holdTimeMultiplier,
      tpExtensionFactor: config.tpExtensionFactor,
    };
  }

  /**
   * Handle Wyckoff phase transition
   */
  handlePhaseTransition(
    position: AdaptivePosition,
    oldPhase: WyckoffPhase,
    newPhase: WyckoffPhase,
    currentPrice: number,
    baseATR: number
  ): WyckoffTransitionResult {
    // Same phase = no action
    if (oldPhase === newPhase) {
      return {
        shouldAdjust: false,
        adjustments: this.getPhaseAdjustments(oldPhase),
        recommendation: 'No phase change',
        riskLevel: 'LOW',
      };
    }

    const newAdjustments = this.getPhaseAdjustments(newPhase);
    const transitionType = this.classifyTransition(oldPhase, newPhase, position.direction);

    // Calculate new stop loss based on phase
    const newStopDistance = baseATR * newAdjustments.stopWidthMultiplier * 2.0;
    const newStopLoss = position.direction === 'LONG'
      ? currentPrice - newStopDistance
      : currentPrice + newStopDistance;

    // Only use new stop if it's better (tighter for adverse, keep current for favorable)
    const shouldUpdateStop = this.shouldUpdateStop(
      position,
      newStopLoss,
      transitionType
    );

    console.log(
      `[Wyckoff] Phase transition for ${position.symbol}: ${oldPhase} → ${newPhase} ` +
      `(${transitionType.type})`
    );

    return {
      shouldAdjust: true,
      adjustments: newAdjustments,
      newStopLoss: shouldUpdateStop ? newStopLoss : undefined,
      recommendation: this.getTransitionRecommendation(transitionType, position.direction),
      riskLevel: transitionType.riskLevel,
    };
  }

  /**
   * Check compatibility between position direction and Wyckoff phase
   */
  checkPhaseCompatibility(
    direction: 'LONG' | 'SHORT',
    phase: WyckoffPhase
  ): PhaseCompatibility {
    if (direction === 'LONG') {
      switch (phase) {
        case 'ACCUMULATION':
          return {
            isCompatible: true,
            riskFactor: 0.9, // Slightly favorable
            reason: 'Smart money accumulating - good for longs with patience',
          };

        case 'MARKUP':
          return {
            isCompatible: true,
            riskFactor: 0.7, // Very favorable
            reason: 'Uptrend confirmed - optimal for longs',
          };

        case 'DISTRIBUTION':
          return {
            isCompatible: false,
            riskFactor: 1.5, // Higher risk
            reason: 'Smart money distributing - reduce long exposure',
          };

        case 'MARKDOWN':
          return {
            isCompatible: false,
            riskFactor: 2.0, // Very high risk
            reason: 'Downtrend confirmed - avoid new longs',
          };
      }
    } else {
      // SHORT positions
      switch (phase) {
        case 'ACCUMULATION':
          return {
            isCompatible: false,
            riskFactor: 1.5,
            reason: 'Bottom forming - avoid new shorts',
          };

        case 'MARKUP':
          return {
            isCompatible: false,
            riskFactor: 2.0,
            reason: 'Uptrend confirmed - avoid shorts',
          };

        case 'DISTRIBUTION':
          return {
            isCompatible: true,
            riskFactor: 0.9,
            reason: 'Top forming - shorts becoming favorable',
          };

        case 'MARKDOWN':
          return {
            isCompatible: true,
            riskFactor: 0.7,
            reason: 'Downtrend confirmed - optimal for shorts',
          };
      }
    }
  }

  /**
   * Calculate position size adjustment for current phase
   */
  calculatePositionSize(
    baseSize: number,
    phase: WyckoffPhase,
    agentProfile: AgentRiskProfile
  ): number {
    const phaseMultiplier = WYCKOFF_CONFIGS[phase].positionSizeMultiplier;
    const agentMultiplier = AGENT_MULTIPLIERS[agentProfile].positionSizeMultiplier;

    // Combine multipliers with a cap
    const combinedMultiplier = Math.min(1.5, phaseMultiplier * agentMultiplier);

    return baseSize * combinedMultiplier;
  }

  /**
   * Calculate stop width for current phase
   */
  calculateStopWidth(
    baseATR: number,
    phase: WyckoffPhase,
    regime: MarketRegime
  ): number {
    const phaseConfig = WYCKOFF_CONFIGS[phase];

    // Phase-adjusted stop width
    const adjustedWidth = adjustStopWidthForWyckoff(baseATR, phase);

    return adjustedWidth;
  }

  /**
   * Calculate take profit extension for current phase
   */
  calculateTPExtension(
    baseTPPercent: number,
    phase: WyckoffPhase
  ): number {
    return adjustTakeProfitForWyckoff(baseTPPercent, phase);
  }

  /**
   * Should we enter a trade in this phase?
   */
  shouldEnterTrade(
    direction: 'LONG' | 'SHORT',
    phase: WyckoffPhase,
    signalConfidence: number
  ): { shouldEnter: boolean; adjustedConfidenceThreshold: number; reason: string } {
    const compatibility = this.checkPhaseCompatibility(direction, phase);

    // If not compatible, require much higher confidence
    if (!compatibility.isCompatible) {
      const adjustedThreshold = Math.min(90, 60 * compatibility.riskFactor);

      if (signalConfidence >= adjustedThreshold) {
        return {
          shouldEnter: true,
          adjustedConfidenceThreshold: adjustedThreshold,
          reason: `High confidence (${signalConfidence}%) overcomes adverse phase. ${compatibility.reason}`,
        };
      }

      return {
        shouldEnter: false,
        adjustedConfidenceThreshold: adjustedThreshold,
        reason: `Phase incompatible. Need ${adjustedThreshold}% confidence, have ${signalConfidence}%. ${compatibility.reason}`,
      };
    }

    // Compatible phase - standard or reduced threshold
    const adjustedThreshold = 60 * compatibility.riskFactor;

    return {
      shouldEnter: signalConfidence >= adjustedThreshold,
      adjustedConfidenceThreshold: adjustedThreshold,
      reason: compatibility.reason,
    };
  }

  /**
   * Get optimal strategies for a Wyckoff phase
   */
  getOptimalStrategies(phase: WyckoffPhase): {
    longStrategies: string[];
    shortStrategies: string[];
    avoidStrategies: string[];
  } {
    switch (phase) {
      case 'ACCUMULATION':
        return {
          longStrategies: ['Liquidity Hunter', 'Market Phase Sniper', 'Whale Shadow'],
          shortStrategies: [],
          avoidStrategies: ['Momentum Surge', 'Liquidation Cascade'],
        };

      case 'MARKUP':
        return {
          longStrategies: ['Momentum Surge V2', 'Golden Cross', 'Volatility Breakout'],
          shortStrategies: [],
          avoidStrategies: ['Bollinger Mean Reversion', 'Fear & Greed Contrarian'],
        };

      case 'DISTRIBUTION':
        return {
          longStrategies: [],
          shortStrategies: ['Fear & Greed Contrarian', 'Funding Squeeze'],
          avoidStrategies: ['Momentum Surge V2', 'Golden Cross'],
        };

      case 'MARKDOWN':
        return {
          longStrategies: [],
          shortStrategies: ['Liquidation Cascade', 'Volatility Breakout'],
          avoidStrategies: ['Liquidity Hunter', 'Whale Shadow'],
        };
    }
  }

  /**
   * Apply Wyckoff adjustments to position
   */
  applyPhaseAdjustments(
    position: AdaptivePosition,
    newPhase: WyckoffPhase,
    currentPrice: number,
    baseATR: number
  ): AdaptivePosition {
    const adjustments = this.getPhaseAdjustments(newPhase);
    const oldPhase = position.regimeTracking.currentWyckoff;

    // Calculate new stop based on phase
    const newStopDistance = baseATR * adjustments.stopWidthMultiplier * 2.0;
    let newStopLoss: number;

    if (position.direction === 'LONG') {
      newStopLoss = Math.max(
        position.currentStopLoss, // Never move stop against us
        currentPrice - newStopDistance
      );
    } else {
      newStopLoss = Math.min(
        position.currentStopLoss,
        currentPrice + newStopDistance
      );
    }

    // Update take profit targets
    const updatedTargets = position.takeProfitTargets.map(target => {
      if (target.triggered) return target;

      // Recalculate target based on new phase
      const basePercent = ((target.priceTarget - position.entryPrice) / position.entryPrice) * 100;
      const adjustedPercent = basePercent * (adjustments.tpExtensionFactor / this.getPhaseAdjustments(oldPhase).tpExtensionFactor);

      const newTargetPrice = position.direction === 'LONG'
        ? position.entryPrice * (1 + adjustedPercent / 100)
        : position.entryPrice * (1 - Math.abs(adjustedPercent) / 100);

      return {
        ...target,
        priceTarget: newTargetPrice,
      };
    });

    console.log(
      `[Wyckoff] Applied ${newPhase} adjustments to ${position.symbol}: ` +
      `Stop: $${position.currentStopLoss.toFixed(2)} → $${newStopLoss.toFixed(2)}`
    );

    return {
      ...position,
      currentStopLoss: newStopLoss,
      takeProfitTargets: updatedTargets,
      regimeTracking: {
        ...position.regimeTracking,
        currentWyckoff: newPhase,
      },
      lastUpdatedAt: Date.now(),
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Classify the transition type
   */
  private classifyTransition(
    oldPhase: WyckoffPhase,
    newPhase: WyckoffPhase,
    direction: 'LONG' | 'SHORT'
  ): { type: 'FAVORABLE' | 'ADVERSE' | 'NEUTRAL'; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' } {
    const phaseOrder = ['ACCUMULATION', 'MARKUP', 'DISTRIBUTION', 'MARKDOWN'];
    const oldIndex = phaseOrder.indexOf(oldPhase);
    const newIndex = phaseOrder.indexOf(newPhase);

    // For LONG positions
    if (direction === 'LONG') {
      // Moving forward in cycle (acc→markup) is favorable
      if (newIndex === oldIndex + 1 && newPhase === 'MARKUP') {
        return { type: 'FAVORABLE', riskLevel: 'LOW' };
      }
      // Moving to distribution/markdown is adverse
      if (newPhase === 'DISTRIBUTION' || newPhase === 'MARKDOWN') {
        return { type: 'ADVERSE', riskLevel: newPhase === 'MARKDOWN' ? 'HIGH' : 'MEDIUM' };
      }
    }

    // For SHORT positions
    if (direction === 'SHORT') {
      // Moving to markdown is favorable for shorts
      if (newPhase === 'MARKDOWN') {
        return { type: 'FAVORABLE', riskLevel: 'LOW' };
      }
      // Moving to accumulation/markup is adverse
      if (newPhase === 'ACCUMULATION' || newPhase === 'MARKUP') {
        return { type: 'ADVERSE', riskLevel: newPhase === 'MARKUP' ? 'HIGH' : 'MEDIUM' };
      }
    }

    return { type: 'NEUTRAL', riskLevel: 'LOW' };
  }

  /**
   * Should we update the stop loss?
   */
  private shouldUpdateStop(
    position: AdaptivePosition,
    newStopLoss: number,
    transitionType: { type: string; riskLevel: string }
  ): boolean {
    // For adverse transitions, always tighten stop
    if (transitionType.type === 'ADVERSE') {
      if (position.direction === 'LONG') {
        return newStopLoss > position.currentStopLoss;
      } else {
        return newStopLoss < position.currentStopLoss;
      }
    }

    // For favorable transitions, keep current stop (don't widen)
    return false;
  }

  /**
   * Get recommendation for transition
   */
  private getTransitionRecommendation(
    transitionType: { type: string; riskLevel: string },
    direction: 'LONG' | 'SHORT'
  ): string {
    if (transitionType.type === 'FAVORABLE') {
      return `Favorable phase transition. Consider extending targets and holding longer.`;
    }

    if (transitionType.type === 'ADVERSE') {
      if (transitionType.riskLevel === 'HIGH') {
        return `High risk: Phase turning against ${direction} position. Consider reducing exposure.`;
      }
      return `Adverse phase transition. Tighten stops and reduce position size.`;
    }

    return `Neutral phase transition. Maintain current position parameters.`;
  }

  /**
   * Get status string for logging
   */
  getWyckoffStatus(position: AdaptivePosition): string {
    const phase = position.regimeTracking.currentWyckoff;
    const adjustments = this.getPhaseAdjustments(phase);
    const compatibility = this.checkPhaseCompatibility(position.direction, phase);

    return `
[WYCKOFF STATUS] ${position.symbol}
  Current Phase: ${phase}
  Position Direction: ${position.direction}
  Compatibility: ${compatibility.isCompatible ? '✅ Compatible' : '⚠️ Adverse'}
  Risk Factor: ${compatibility.riskFactor.toFixed(2)}x

  Phase Adjustments:
    Position Size: ${(adjustments.positionSizeMultiplier * 100).toFixed(0)}% Kelly
    Stop Width: ${(adjustments.stopWidthMultiplier * 100).toFixed(0)}% of base
    Hold Time: ${(adjustments.holdTimeMultiplier * 100).toFixed(0)}% of base
    TP Extension: ${(adjustments.tpExtensionFactor * 100).toFixed(0)}% of base

  Recommendation: ${compatibility.reason}
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wyckoffPhaseManager = new WyckoffPhaseManager();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if phase is favorable for direction
 */
export function isPhaseCompatible(
  direction: 'LONG' | 'SHORT',
  phase: WyckoffPhase
): boolean {
  return wyckoffPhaseManager.checkPhaseCompatibility(direction, phase).isCompatible;
}

/**
 * Get position size multiplier for phase
 */
export function getPhasePositionMultiplier(phase: WyckoffPhase): number {
  return WYCKOFF_CONFIGS[phase].positionSizeMultiplier;
}

/**
 * Get TP extension factor for phase
 */
export function getPhaseTPExtension(phase: WyckoffPhase): number {
  return WYCKOFF_CONFIGS[phase].tpExtensionFactor;
}

/**
 * Check if we're in a profit-taking phase
 */
export function isProfitTakingPhase(phase: WyckoffPhase): boolean {
  return phase === 'DISTRIBUTION' || phase === 'MARKDOWN';
}

/**
 * Check if we're in an accumulation phase
 */
export function isAccumulationPhase(phase: WyckoffPhase): boolean {
  return phase === 'ACCUMULATION';
}

/**
 * Get phase risk level (1-4, 1 being lowest risk for longs)
 */
export function getPhaseRiskLevel(phase: WyckoffPhase, direction: 'LONG' | 'SHORT'): number {
  const riskMap = {
    LONG: { ACCUMULATION: 2, MARKUP: 1, DISTRIBUTION: 3, MARKDOWN: 4 },
    SHORT: { ACCUMULATION: 3, MARKUP: 4, DISTRIBUTION: 2, MARKDOWN: 1 },
  };

  return riskMap[direction][phase];
}

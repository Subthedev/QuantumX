/**
 * DYNAMIC TAKE PROFIT ENGINE
 *
 * Calculates adaptive take profit targets based on:
 * 1. Market Regime (trending vs rangebound, volatility level)
 * 2. Wyckoff Phase (accumulation, markup, distribution, markdown)
 * 3. ATR (current volatility)
 * 4. Agent Risk Profile (aggressive, balanced, conservative)
 *
 * REGIME TP TARGETS:
 * - BULLISH_HIGH_VOL: TP1=1.5%, TP2=3.0%, TP3=5.0%
 * - BULLISH_LOW_VOL: TP1=1.0%, TP2=2.0%, TP3=3.5%
 * - BEARISH_HIGH_VOL: TP1=1.5%, TP2=3.0%, TP3=5.0%
 * - BEARISH_LOW_VOL: TP1=1.0%, TP2=2.0%, TP3=3.0%
 * - RANGEBOUND: TP1=0.6%, TP2=1.0%, TP3=1.5%
 *
 * WYCKOFF EXTENSIONS:
 * - ACCUMULATION: 1.2x (extended targets, patient)
 * - MARKUP: 1.3x (let profits run)
 * - DISTRIBUTION: 0.8x (take profits early)
 * - MARKDOWN: 0.7x (very tight targets)
 */

import {
  AdaptivePosition,
  TakeProfitTarget,
  MarketRegime,
  WyckoffPhase,
  ATRData,
  AgentRiskProfile,
  AGENT_MULTIPLIERS,
} from './types';

import {
  REGIME_CONFIGS,
  WYCKOFF_CONFIGS,
  adjustTakeProfitForWyckoff,
  getPartialExitSplits,
} from './regimeTradeRules';

// ============================================================================
// INTERFACES
// ============================================================================

interface DynamicTPParams {
  entryPrice: number;
  direction: 'LONG' | 'SHORT';
  regime: MarketRegime;
  wyckoff: WyckoffPhase;
  agentProfile: AgentRiskProfile;
  atr?: ATRData;
  signalConfidence?: number;
}

interface TPCalculationResult {
  targets: TakeProfitTarget[];
  adjustments: {
    regimeBase: { tp1: number; tp2: number; tp3: number };
    wyckoffMultiplier: number;
    agentMultiplier: number;
    finalTargets: { tp1: number; tp2: number; tp3: number };
  };
  reasoning: string;
}

// ============================================================================
// DYNAMIC TAKE PROFIT ENGINE
// ============================================================================

export class DynamicTakeProfitEngine {
  /**
   * Calculate dynamic take profit targets
   */
  calculateTakeProfits(params: DynamicTPParams): TPCalculationResult {
    const {
      entryPrice,
      direction,
      regime,
      wyckoff,
      agentProfile,
      atr,
      signalConfidence = 60,
    } = params;

    // Get base targets from regime config
    const regimeConfig = REGIME_CONFIGS[regime];
    const wyckoffConfig = WYCKOFF_CONFIGS[wyckoff];
    const agentMultipliers = AGENT_MULTIPLIERS[agentProfile];

    // Base targets from regime
    const regimeBase = {
      tp1: regimeConfig.tp1Percent,
      tp2: regimeConfig.tp2Percent,
      tp3: regimeConfig.tp3Percent,
    };

    // Wyckoff extension factor
    const wyckoffMultiplier = wyckoffConfig.tpExtensionFactor;

    // Agent extension factor
    const agentMultiplier = agentMultipliers.tpExtensionMultiplier;

    // Confidence adjustment (higher confidence = slightly extended targets)
    const confidenceMultiplier = this.calculateConfidenceMultiplier(signalConfidence);

    // ATR-based volatility adjustment (optional)
    const volatilityMultiplier = atr ? this.calculateVolatilityMultiplier(atr) : 1.0;

    // Calculate final target percentages
    const combinedMultiplier = wyckoffMultiplier * agentMultiplier * confidenceMultiplier * volatilityMultiplier;

    const finalTargets = {
      tp1: regimeBase.tp1 * combinedMultiplier,
      tp2: regimeBase.tp2 * combinedMultiplier,
      tp3: regimeBase.tp3 * combinedMultiplier,
    };

    // Get exit splits
    const splits = getPartialExitSplits(regime);

    // Calculate actual price targets
    const targets: TakeProfitTarget[] = [
      this.createTarget(1, entryPrice, finalTargets.tp1, direction, splits.tp1),
      this.createTarget(2, entryPrice, finalTargets.tp2, direction, splits.tp2),
      this.createTarget(3, entryPrice, finalTargets.tp3, direction, splits.tp3),
    ];

    // Build reasoning
    const reasoning = this.buildReasoning(
      regime,
      wyckoff,
      agentProfile,
      regimeBase,
      finalTargets,
      confidenceMultiplier,
      volatilityMultiplier
    );

    return {
      targets,
      adjustments: {
        regimeBase,
        wyckoffMultiplier,
        agentMultiplier,
        finalTargets,
      },
      reasoning,
    };
  }

  /**
   * Update take profits when regime changes
   */
  updateForRegimeChange(
    position: AdaptivePosition,
    newRegime: MarketRegime,
    newWyckoff: WyckoffPhase,
    currentPrice: number,
    atr?: ATRData
  ): TakeProfitTarget[] {
    // Only update untriggered targets
    const result = this.calculateTakeProfits({
      entryPrice: position.entryPrice,
      direction: position.direction,
      regime: newRegime,
      wyckoff: newWyckoff,
      agentProfile: position.agentRiskProfile,
      atr,
      signalConfidence: position.signalConfidence,
    });

    // Merge with existing triggered targets
    const updatedTargets = position.takeProfitTargets.map(existing => {
      if (existing.triggered) {
        // Keep triggered targets as-is
        return existing;
      }

      // Find new target for this level
      const newTarget = result.targets.find(t => t.level === existing.level);
      if (newTarget) {
        // Only update if new target is reachable (better than current price for direction)
        if (this.isTargetReachable(position.direction, currentPrice, newTarget.priceTarget)) {
          return newTarget;
        }
      }

      return existing;
    });

    console.log(
      `[DynamicTP] Updated targets for ${position.symbol}: ` +
      `Regime change to ${newRegime}/${newWyckoff}`
    );

    return updatedTargets;
  }

  /**
   * Check if current target is still valid given market conditions
   */
  validateTarget(
    target: TakeProfitTarget,
    position: AdaptivePosition,
    currentPrice: number,
    currentRegime: MarketRegime
  ): { isValid: boolean; shouldAdjust: boolean; reason: string } {
    // Already triggered = always valid
    if (target.triggered) {
      return { isValid: true, shouldAdjust: false, reason: 'Already triggered' };
    }

    // Check if target is still reachable
    if (!this.isTargetReachable(position.direction, currentPrice, target.priceTarget)) {
      return {
        isValid: false,
        shouldAdjust: true,
        reason: `Target $${target.priceTarget.toFixed(2)} is no longer reachable from current $${currentPrice.toFixed(2)}`,
      };
    }

    // Check if regime changed significantly
    const regimeConfig = REGIME_CONFIGS[currentRegime];
    const expectedTP = target.level === 1 ? regimeConfig.tp1Percent
      : target.level === 2 ? regimeConfig.tp2Percent
      : regimeConfig.tp3Percent;

    const currentTPPercent = position.direction === 'LONG'
      ? ((target.priceTarget - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - target.priceTarget) / position.entryPrice) * 100;

    // If target is >50% different from regime expectation, should adjust
    const deviation = Math.abs(currentTPPercent - expectedTP) / expectedTP;
    if (deviation > 0.5) {
      return {
        isValid: true,
        shouldAdjust: true,
        reason: `Target deviation ${(deviation * 100).toFixed(0)}% from regime expectation`,
      };
    }

    return { isValid: true, shouldAdjust: false, reason: 'Target valid' };
  }

  /**
   * Calculate optimal TP for mean reversion in rangebound market
   */
  calculateMeanReversionTP(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    supportLevel: number,
    resistanceLevel: number
  ): TakeProfitTarget[] {
    const rangeSize = resistanceLevel - supportLevel;
    const midpoint = (supportLevel + resistanceLevel) / 2;

    let targets: TakeProfitTarget[];

    if (direction === 'LONG') {
      // For longs bought near support, target the range
      targets = [
        this.createTarget(1, entryPrice, ((midpoint - entryPrice) / entryPrice) * 100, direction, 70),
        this.createTarget(2, entryPrice, ((resistanceLevel * 0.95 - entryPrice) / entryPrice) * 100, direction, 25),
        this.createTarget(3, entryPrice, ((resistanceLevel - entryPrice) / entryPrice) * 100, direction, 5),
      ];
    } else {
      // For shorts sold near resistance, target the range
      targets = [
        this.createTarget(1, entryPrice, ((entryPrice - midpoint) / entryPrice) * 100, direction, 70),
        this.createTarget(2, entryPrice, ((entryPrice - supportLevel * 1.05) / entryPrice) * 100, direction, 25),
        this.createTarget(3, entryPrice, ((entryPrice - supportLevel) / entryPrice) * 100, direction, 5),
      ];
    }

    return targets;
  }

  /**
   * Get recommended TP based on ATR
   */
  calculateATRBasedTP(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    atr: ATRData,
    multipliers: { tp1: number; tp2: number; tp3: number } = { tp1: 1.5, tp2: 3.0, tp3: 5.0 }
  ): TakeProfitTarget[] {
    const splits = { tp1: 50, tp2: 35, tp3: 15 }; // Default splits for ATR-based

    const tp1Percent = (atr.atr * multipliers.tp1 / entryPrice) * 100;
    const tp2Percent = (atr.atr * multipliers.tp2 / entryPrice) * 100;
    const tp3Percent = (atr.atr * multipliers.tp3 / entryPrice) * 100;

    return [
      this.createTarget(1, entryPrice, tp1Percent, direction, splits.tp1),
      this.createTarget(2, entryPrice, tp2Percent, direction, splits.tp2),
      this.createTarget(3, entryPrice, tp3Percent, direction, splits.tp3),
    ];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Create a take profit target
   */
  private createTarget(
    level: 1 | 2 | 3,
    entryPrice: number,
    targetPercent: number,
    direction: 'LONG' | 'SHORT',
    exitPercent: number
  ): TakeProfitTarget {
    const priceTarget = direction === 'LONG'
      ? entryPrice * (1 + targetPercent / 100)
      : entryPrice * (1 - targetPercent / 100);

    return {
      level,
      priceTarget,
      percentOfPosition: exitPercent,
      triggered: false,
    };
  }

  /**
   * Check if target is reachable from current price
   */
  private isTargetReachable(
    direction: 'LONG' | 'SHORT',
    currentPrice: number,
    targetPrice: number
  ): boolean {
    if (direction === 'LONG') {
      return targetPrice > currentPrice;
    } else {
      return targetPrice < currentPrice;
    }
  }

  /**
   * Calculate confidence multiplier (0.9 - 1.1 range)
   */
  private calculateConfidenceMultiplier(confidence: number): number {
    // Base at 60% confidence = 1.0
    // Every 10% above = +5% extension
    // Every 10% below = -5% contraction
    const baseConfidence = 60;
    const deviation = (confidence - baseConfidence) / 10;
    const multiplier = 1.0 + (deviation * 0.05);

    // Clamp to reasonable range
    return Math.max(0.9, Math.min(1.1, multiplier));
  }

  /**
   * Calculate volatility multiplier based on ATR
   */
  private calculateVolatilityMultiplier(atr: ATRData): number {
    // High ATR% = extend targets
    // Low ATR% = contract targets
    // Base assumption: 2% ATR is "normal"
    const baseATRPercent = 2.0;
    const ratio = atr.atrPercent / baseATRPercent;

    // Scale: 0.8 - 1.2 range
    return Math.max(0.8, Math.min(1.2, 0.5 + (ratio * 0.5)));
  }

  /**
   * Build reasoning string for logging
   */
  private buildReasoning(
    regime: MarketRegime,
    wyckoff: WyckoffPhase,
    agentProfile: AgentRiskProfile,
    regimeBase: { tp1: number; tp2: number; tp3: number },
    finalTargets: { tp1: number; tp2: number; tp3: number },
    confidenceMultiplier: number,
    volatilityMultiplier: number
  ): string {
    return `
[Dynamic TP Calculation]
  Regime: ${regime} → Base TP1=${regimeBase.tp1}%, TP2=${regimeBase.tp2}%, TP3=${regimeBase.tp3}%
  Wyckoff: ${wyckoff} → Extension factor applied
  Agent: ${agentProfile} → Risk-adjusted
  Confidence: x${confidenceMultiplier.toFixed(2)}
  Volatility: x${volatilityMultiplier.toFixed(2)}
  Final: TP1=${finalTargets.tp1.toFixed(2)}%, TP2=${finalTargets.tp2.toFixed(2)}%, TP3=${finalTargets.tp3.toFixed(2)}%
`;
  }

  /**
   * Get status string for logging
   */
  getTPStatus(position: AdaptivePosition, currentPrice: number): string {
    let status = `[TAKE PROFIT STATUS] ${position.symbol}\n`;

    for (const target of position.takeProfitTargets) {
      const distance = position.direction === 'LONG'
        ? ((target.priceTarget - currentPrice) / currentPrice) * 100
        : ((currentPrice - target.priceTarget) / currentPrice) * 100;

      const statusIcon = target.triggered ? '✅' : distance <= 0 ? '🎯' : '⏳';
      const priceStr = `$${target.priceTarget.toFixed(2)}`;
      const distStr = target.triggered
        ? `Triggered @ $${target.triggeredPrice?.toFixed(2)}`
        : `${distance.toFixed(2)}% away`;

      status += `  ${statusIcon} TP${target.level}: ${priceStr} (${target.percentOfPosition}%) - ${distStr}\n`;
    }

    return status;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const dynamicTakeProfitEngine = new DynamicTakeProfitEngine();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick calculation of take profit targets
 */
export function calculateQuickTP(
  entryPrice: number,
  direction: 'LONG' | 'SHORT',
  regime: MarketRegime,
  wyckoff: WyckoffPhase
): TakeProfitTarget[] {
  return dynamicTakeProfitEngine.calculateTakeProfits({
    entryPrice,
    direction,
    regime,
    wyckoff,
    agentProfile: 'BALANCED',
  }).targets;
}

/**
 * Get expected TP percentages for a regime
 */
export function getExpectedTPPercents(regime: MarketRegime): {
  tp1: number;
  tp2: number;
  tp3: number;
} {
  const config = REGIME_CONFIGS[regime];
  return {
    tp1: config.tp1Percent,
    tp2: config.tp2Percent,
    tp3: config.tp3Percent,
  };
}

/**
 * Check if we should extend targets (trending with momentum)
 */
export function shouldExtendTargets(
  regime: MarketRegime,
  wyckoff: WyckoffPhase
): boolean {
  // Extend in markup phase of trending regimes
  const isTrending = regime.includes('BULLISH') || regime.includes('BEARISH');
  const isMarkup = wyckoff === 'MARKUP' || wyckoff === 'ACCUMULATION';
  return isTrending && isMarkup;
}

/**
 * Check if we should contract targets (distribution, markdown, rangebound)
 */
export function shouldContractTargets(
  regime: MarketRegime,
  wyckoff: WyckoffPhase
): boolean {
  if (regime === 'RANGEBOUND') return true;
  return wyckoff === 'DISTRIBUTION' || wyckoff === 'MARKDOWN';
}

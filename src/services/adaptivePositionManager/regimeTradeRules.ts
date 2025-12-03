/**
 * REGIME TRADE RULES
 *
 * Configuration for each market regime and Wyckoff phase.
 * These rules determine how positions are managed in different market conditions.
 *
 * DUAL-LAYER SYSTEM:
 * 1. 5 Regimes → Strategy Selection (What to trade)
 * 2. Wyckoff 4 Phases → Position Management (How to trade)
 */

import {
  MarketRegime,
  WyckoffPhase,
  RegimeConfig,
  WyckoffConfig,
  KillSwitchConfig,
} from './types';

// ============================================================================
// MARKET REGIME CONFIGURATIONS
// ============================================================================

/**
 * Configuration for each of the 5 market regimes
 * These control trailing stops, take profits, and timeouts
 */
export const REGIME_CONFIGS: Record<MarketRegime, RegimeConfig> = {
  /**
   * BULLISH_HIGH_VOL - Strong uptrend with high volatility
   * Strategy: Momentum plays, let winners run but secure profits fast
   * Volatility can reverse quickly - be aggressive with partial exits
   */
  BULLISH_HIGH_VOL: {
    // Trailing Stop - wider due to volatility
    trailingStopATRMultiplier: 2.5,
    trailingStopActivation: 0.3,      // Activate at +0.3%
    trailingStopAcceleration: 1.5,    // Tighten at +1.5%

    // Take Profit Targets - extended for momentum
    tp1Percent: 1.5,
    tp2Percent: 3.0,
    tp3Percent: 5.0,

    // Partial Exit Splits - aggressive profit taking
    // HIGH VOL: 60% / 30% / 10% - secure profits fast
    tp1ExitPercent: 60,
    tp2ExitPercent: 30,
    tp3ExitPercent: 10,

    // Break-Even
    breakEvenActivation: 0.8,         // Move to BE at +0.8%

    // Timeout
    maxHoldHours: 4,
    profitableMaxHoldHours: 8,

    // Risk
    minConfidence: 55,
    maxPositionSizePercent: 5,

    // Regime Change
    forceExitOnDirectionFlip: true,
    regimeChangeTolerance: 2,
  },

  /**
   * BULLISH_LOW_VOL - Steady uptrend with low volatility
   * Strategy: Trend following, let profits run longer
   * Stable trends = be patient, maximize gains
   */
  BULLISH_LOW_VOL: {
    // Trailing Stop - tighter, trends are stable
    trailingStopATRMultiplier: 2.0,
    trailingStopActivation: 0.3,
    trailingStopAcceleration: 1.2,

    // Take Profit Targets - moderate
    tp1Percent: 1.0,
    tp2Percent: 2.0,
    tp3Percent: 3.5,

    // Partial Exit Splits - let it run
    // LOW VOL: 30% / 40% / 30% - patient profit taking
    tp1ExitPercent: 30,
    tp2ExitPercent: 40,
    tp3ExitPercent: 30,

    // Break-Even - slightly earlier in low vol
    breakEvenActivation: 0.6,

    // Timeout - longer hold times in stable trends
    maxHoldHours: 6,
    profitableMaxHoldHours: 12,

    // Risk
    minConfidence: 60,
    maxPositionSizePercent: 4,

    // Regime Change
    forceExitOnDirectionFlip: true,
    regimeChangeTolerance: 3,
  },

  /**
   * BEARISH_HIGH_VOL - Strong downtrend with high volatility
   * Strategy: Short momentum, aggressive profit taking
   * Bear markets are violent - take money off table quickly
   */
  BEARISH_HIGH_VOL: {
    // Trailing Stop - wider for volatility
    trailingStopATRMultiplier: 2.5,
    trailingStopActivation: 0.3,
    trailingStopAcceleration: 1.5,

    // Take Profit Targets - extended for bear momentum
    tp1Percent: 1.5,
    tp2Percent: 3.0,
    tp3Percent: 5.0,

    // Partial Exit Splits - aggressive (shorts in bear)
    // HIGH VOL: 60% / 30% / 10%
    tp1ExitPercent: 60,
    tp2ExitPercent: 30,
    tp3ExitPercent: 10,

    // Break-Even
    breakEvenActivation: 0.8,

    // Timeout - shorter in bear markets
    maxHoldHours: 4,
    profitableMaxHoldHours: 8,

    // Risk
    minConfidence: 55,
    maxPositionSizePercent: 5,

    // Regime Change
    forceExitOnDirectionFlip: true,
    regimeChangeTolerance: 2,
  },

  /**
   * BEARISH_LOW_VOL - Steady downtrend with low volatility
   * Strategy: Careful shorts, trend following
   * Slower grinds down - be patient but cautious
   */
  BEARISH_LOW_VOL: {
    // Trailing Stop - moderate
    trailingStopATRMultiplier: 2.0,
    trailingStopActivation: 0.3,
    trailingStopAcceleration: 1.2,

    // Take Profit Targets - conservative
    tp1Percent: 1.0,
    tp2Percent: 2.0,
    tp3Percent: 3.0,

    // Partial Exit Splits - balanced
    // LOW VOL: 30% / 40% / 30%
    tp1ExitPercent: 30,
    tp2ExitPercent: 40,
    tp3ExitPercent: 30,

    // Break-Even
    breakEvenActivation: 0.6,

    // Timeout
    maxHoldHours: 6,
    profitableMaxHoldHours: 12,

    // Risk
    minConfidence: 60,
    maxPositionSizePercent: 4,

    // Regime Change
    forceExitOnDirectionFlip: true,
    regimeChangeTolerance: 3,
  },

  /**
   * RANGEBOUND - Sideways, mean reversion plays
   * Strategy: Quick entries and exits, tight targets
   * Ranges break fast - grab profits immediately
   */
  RANGEBOUND: {
    // Trailing Stop - very tight
    trailingStopATRMultiplier: 1.5,
    trailingStopActivation: 0.2,      // Earlier activation
    trailingStopAcceleration: 0.8,    // Earlier tightening

    // Take Profit Targets - tight for mean reversion
    tp1Percent: 0.6,
    tp2Percent: 1.0,
    tp3Percent: 1.5,

    // Partial Exit Splits - very aggressive
    // RANGEBOUND: 70% / 25% / 5% - take money immediately
    tp1ExitPercent: 70,
    tp2ExitPercent: 25,
    tp3ExitPercent: 5,

    // Break-Even - quick
    breakEvenActivation: 0.4,

    // Timeout - short, ranges reverse quickly
    maxHoldHours: 2,
    profitableMaxHoldHours: 4,

    // Risk - higher confidence required
    minConfidence: 65,
    maxPositionSizePercent: 3,

    // Regime Change - exit quickly when range breaks
    forceExitOnDirectionFlip: true,
    regimeChangeTolerance: 1,         // Very low tolerance
  },
};

// ============================================================================
// WYCKOFF PHASE CONFIGURATIONS
// ============================================================================

/**
 * Configuration for each Wyckoff phase
 * These control position sizing and stop width
 */
export const WYCKOFF_CONFIGS: Record<WyckoffPhase, WyckoffConfig> = {
  /**
   * ACCUMULATION - Smart money loading
   * Be patient, use wider stops, don't get shaken out
   */
  ACCUMULATION: {
    positionSizeMultiplier: 0.7,      // 70% Kelly - smaller size
    stopWidthATRMultiplier: 2.5,      // Wide stops
    holdTimeMultiplier: 1.5,          // Hold longer
    tpExtensionFactor: 1.2,           // Extended targets
  },

  /**
   * MARKUP - Uptrend confirmed
   * Aggressive sizing, let profits run
   */
  MARKUP: {
    positionSizeMultiplier: 1.0,      // 100% Kelly - full size
    stopWidthATRMultiplier: 2.0,      // Standard stops
    holdTimeMultiplier: 1.0,          // Normal hold time
    tpExtensionFactor: 1.3,           // Extended targets - let it run
  },

  /**
   * DISTRIBUTION - Smart money selling
   * Take profits early, reduce size
   */
  DISTRIBUTION: {
    positionSizeMultiplier: 0.5,      // 50% Kelly - reduced
    stopWidthATRMultiplier: 1.5,      // Tight stops
    holdTimeMultiplier: 0.7,          // Shorter holds
    tpExtensionFactor: 0.8,           // Tighter targets - take profits
  },

  /**
   * MARKDOWN - Downtrend confirmed
   * Very small size for longs, tight stops
   * (Good for shorts if supported)
   */
  MARKDOWN: {
    positionSizeMultiplier: 0.3,      // 30% Kelly - minimal
    stopWidthATRMultiplier: 1.5,      // Tight stops
    holdTimeMultiplier: 0.5,          // Very short holds
    tpExtensionFactor: 0.7,           // Very tight targets
  },
};

// ============================================================================
// KILL SWITCH CONFIGURATION
// ============================================================================

/**
 * Kill switch configuration - capital preservation
 */
export const KILL_SWITCH_CONFIG: KillSwitchConfig = {
  maxDailyLossPct: 3,           // Stop if daily loss > 3%
  minWinRateLast20: 35,         // Stop if win rate < 35% (last 20 trades)
  maxDrawdownPct: 8,            // Stop if drawdown > 8%
  cooldownMinutes: 60,          // Wait 1 hour before resuming
  maxConsecutiveLosses: 5,      // Stop after 5 consecutive losses
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get effective regime config with Wyckoff adjustments
 */
export function getEffectiveConfig(
  regime: MarketRegime,
  wyckoff: WyckoffPhase
): RegimeConfig & { wyckoffAdjustments: WyckoffConfig } {
  const regimeConfig = REGIME_CONFIGS[regime];
  const wyckoffConfig = WYCKOFF_CONFIGS[wyckoff];

  return {
    ...regimeConfig,
    wyckoffAdjustments: wyckoffConfig,
  };
}

/**
 * Adjust take profit targets based on Wyckoff phase
 */
export function adjustTakeProfitForWyckoff(
  baseTP: number,
  wyckoff: WyckoffPhase
): number {
  const config = WYCKOFF_CONFIGS[wyckoff];
  return baseTP * config.tpExtensionFactor;
}

/**
 * Adjust position size based on Wyckoff phase
 */
export function adjustPositionSizeForWyckoff(
  baseSize: number,
  wyckoff: WyckoffPhase
): number {
  const config = WYCKOFF_CONFIGS[wyckoff];
  return baseSize * config.positionSizeMultiplier;
}

/**
 * Adjust stop width based on Wyckoff phase
 */
export function adjustStopWidthForWyckoff(
  baseWidth: number,
  wyckoff: WyckoffPhase
): number {
  const config = WYCKOFF_CONFIGS[wyckoff];
  // Wyckoff adjustment is relative to base
  return baseWidth * (config.stopWidthATRMultiplier / 2.0);
}

/**
 * Check if direction flip occurred (bull→bear or bear→bull)
 */
export function isDirectionFlip(
  oldRegime: MarketRegime,
  newRegime: MarketRegime
): boolean {
  const isBullish = (r: MarketRegime) =>
    r === 'BULLISH_HIGH_VOL' || r === 'BULLISH_LOW_VOL';
  const isBearish = (r: MarketRegime) =>
    r === 'BEARISH_HIGH_VOL' || r === 'BEARISH_LOW_VOL';

  const wasBullish = isBullish(oldRegime);
  const wasBearish = isBearish(oldRegime);
  const nowBullish = isBullish(newRegime);
  const nowBearish = isBearish(newRegime);

  // Direction flip = bull→bear or bear→bull
  return (wasBullish && nowBearish) || (wasBearish && nowBullish);
}

/**
 * Check if regime change is adverse for position direction
 */
export function isAdverseRegimeChange(
  positionDirection: 'LONG' | 'SHORT',
  oldRegime: MarketRegime,
  newRegime: MarketRegime
): boolean {
  const isBullish = (r: MarketRegime) =>
    r === 'BULLISH_HIGH_VOL' || r === 'BULLISH_LOW_VOL';
  const isBearish = (r: MarketRegime) =>
    r === 'BEARISH_HIGH_VOL' || r === 'BEARISH_LOW_VOL';

  if (positionDirection === 'LONG') {
    // Adverse for LONG: going from bullish to bearish/rangebound
    const wasBullish = isBullish(oldRegime);
    const nowBearish = isBearish(newRegime) || newRegime === 'RANGEBOUND';
    return wasBullish && nowBearish;
  } else {
    // Adverse for SHORT: going from bearish to bullish/rangebound
    const wasBearish = isBearish(oldRegime);
    const nowBullish = isBullish(newRegime) || newRegime === 'RANGEBOUND';
    return wasBearish && nowBullish;
  }
}

/**
 * Get volatility category from regime
 */
export function getVolatilityFromRegime(regime: MarketRegime): 'HIGH' | 'LOW' | 'MEDIUM' {
  if (regime === 'BULLISH_HIGH_VOL' || regime === 'BEARISH_HIGH_VOL') {
    return 'HIGH';
  } else if (regime === 'RANGEBOUND') {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Get partial exit splits for regime
 */
export function getPartialExitSplits(regime: MarketRegime): {
  tp1: number;
  tp2: number;
  tp3: number;
} {
  const config = REGIME_CONFIGS[regime];
  return {
    tp1: config.tp1ExitPercent,
    tp2: config.tp2ExitPercent,
    tp3: config.tp3ExitPercent,
  };
}

/**
 * Validate that partial exit splits sum to 100
 */
export function validatePartialExitSplits(): void {
  for (const [regime, config] of Object.entries(REGIME_CONFIGS)) {
    const sum = config.tp1ExitPercent + config.tp2ExitPercent + config.tp3ExitPercent;
    if (sum !== 100) {
      console.warn(
        `[RegimeRules] WARNING: Partial exit splits for ${regime} sum to ${sum}, not 100`
      );
    }
  }
}

// Validate on module load
validatePartialExitSplits();

/**
 * Log regime configuration for debugging
 */
export function logRegimeConfig(regime: MarketRegime): void {
  const config = REGIME_CONFIGS[regime];
  console.log(`[RegimeRules] ${regime} Configuration:`);
  console.log(`  Trailing Stop: ${config.trailingStopATRMultiplier}x ATR, activate at +${config.trailingStopActivation}%`);
  console.log(`  Take Profits: TP1=${config.tp1Percent}%, TP2=${config.tp2Percent}%, TP3=${config.tp3Percent}%`);
  console.log(`  Exit Splits: TP1=${config.tp1ExitPercent}%, TP2=${config.tp2ExitPercent}%, TP3=${config.tp3ExitPercent}%`);
  console.log(`  Break-Even: ${config.breakEvenActivation}%`);
  console.log(`  Max Hold: ${config.maxHoldHours}h (profitable: ${config.profitableMaxHoldHours}h)`);
}

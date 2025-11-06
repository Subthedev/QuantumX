/**
 * VOLATILITY-AWARE DYNAMIC THRESHOLDS
 * Adjusts trigger thresholds based on rolling volatility windows
 * Prevents false positives in calm markets and captures moves in volatile markets
 */

export interface VolatilityRegime {
  regime: 'CALM' | 'NORMAL' | 'VOLATILE' | 'EXTREME';
  volatility: number; // Rolling standard deviation
  sampleSize: number;
  thresholds: ThresholdSet;
}

export interface ThresholdSet {
  priceChange: number;      // % price change to trigger
  priceVelocity: number;    // % per second to trigger
  spreadWidening: number;   // % spread increase to trigger
  volumeSurge: number;      // multiplier to trigger
}

export interface VolatilityStats {
  avgVolatility: number;
  regimeDistribution: Record<string, number>;
  totalSamples: number;
  lastUpdate: number;
}

export class VolatilityAwareThresholds {
  private volatilityHistory: Map<string, number[]> = new Map(); // Rolling window per coin
  private currentRegimes: Map<string, VolatilityRegime> = new Map();

  private readonly WINDOW_SIZE = 20; // Last 20 price changes for volatility calc
  private readonly MIN_SAMPLES = 5;  // Minimum samples before adjusting thresholds

  // BASE THRESHOLDS (optimized for production signal quality)
  private readonly BASE_THRESHOLDS: ThresholdSet = {
    priceChange: 0.10,      // 0.10% price change (more sensitive - realistic for crypto)
    priceVelocity: 0.35,    // 0.35% per second (more responsive to fast moves)
    spreadWidening: 1.8,    // 1.8x spread increase (80% widening minimum)
    volumeSurge: 1.8        // 1.8x volume increase (more sensitive)
  };

  // REGIME DEFINITIONS (based on rolling volatility)
  private readonly REGIME_RANGES = {
    CALM: { max: 0.5 },          // < 0.5% volatility
    NORMAL: { min: 0.5, max: 1.5 }, // 0.5-1.5% volatility
    VOLATILE: { min: 1.5, max: 3.0 }, // 1.5-3.0% volatility
    EXTREME: { min: 3.0 }         // > 3.0% volatility
  };

  // THRESHOLD MULTIPLIERS per regime
  private readonly REGIME_MULTIPLIERS = {
    CALM: {
      priceChange: 0.4,      // Lower threshold (0.06%) - catch smaller moves
      priceVelocity: 0.5,    // Lower threshold (0.25%/s)
      spreadWidening: 1.0,   // Baseline (1.8x) - don't make more sensitive in calm markets
      volumeSurge: 0.6       // Lower threshold (1.2x)
    },
    NORMAL: {
      priceChange: 1.0,      // Baseline (0.15%)
      priceVelocity: 1.0,    // Baseline (0.5%/s)
      spreadWidening: 1.0,   // Baseline (1.8x)
      volumeSurge: 1.0       // Baseline (2.0x)
    },
    VOLATILE: {
      priceChange: 1.5,      // Higher threshold (0.225%) - reduce noise
      priceVelocity: 1.3,    // Higher threshold (0.65%/s)
      spreadWidening: 1.3,   // Higher threshold (2.34x) - be more selective
      volumeSurge: 1.4       // Higher threshold (2.8x)
    },
    EXTREME: {
      priceChange: 2.0,      // Much higher (0.30%) - only extreme moves
      priceVelocity: 1.5,    // Much higher (0.75%/s)
      spreadWidening: 1.5,   // Much higher (2.7x) - very selective
      volumeSurge: 2.0       // Much higher (4.0x)
    }
  };

  /**
   * Update volatility calculation with new price change
   */
  updateVolatility(symbol: string, priceChangePercent: number) {
    // Get or create history
    let history = this.volatilityHistory.get(symbol) || [];

    // Add new sample (absolute value for volatility calculation)
    history.push(Math.abs(priceChangePercent));

    // Keep only last N samples
    if (history.length > this.WINDOW_SIZE) {
      history = history.slice(-this.WINDOW_SIZE);
    }

    this.volatilityHistory.set(symbol, history);

    // Recalculate regime if we have enough samples
    if (history.length >= this.MIN_SAMPLES) {
      this.updateRegime(symbol, history);
    }
  }

  /**
   * Calculate regime based on rolling volatility
   */
  private updateRegime(symbol: string, history: number[]) {
    // Calculate standard deviation (volatility measure)
    const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const volatility = Math.sqrt(variance);

    // Determine regime
    let regime: VolatilityRegime['regime'] = 'NORMAL';
    if (volatility < this.REGIME_RANGES.CALM.max) {
      regime = 'CALM';
    } else if (volatility >= this.REGIME_RANGES.EXTREME.min) {
      regime = 'EXTREME';
    } else if (volatility >= this.REGIME_RANGES.VOLATILE.min) {
      regime = 'VOLATILE';
    }

    // Get multipliers for this regime
    const multipliers = this.REGIME_MULTIPLIERS[regime];

    // Calculate adjusted thresholds
    const thresholds: ThresholdSet = {
      priceChange: this.BASE_THRESHOLDS.priceChange * multipliers.priceChange,
      priceVelocity: this.BASE_THRESHOLDS.priceVelocity * multipliers.priceVelocity,
      spreadWidening: this.BASE_THRESHOLDS.spreadWidening * multipliers.spreadWidening,
      volumeSurge: this.BASE_THRESHOLDS.volumeSurge * multipliers.volumeSurge
    };

    // Store regime
    const previousRegime = this.currentRegimes.get(symbol);
    this.currentRegimes.set(symbol, {
      regime,
      volatility,
      sampleSize: history.length,
      thresholds
    });

    // Log regime changes
    if (previousRegime && previousRegime.regime !== regime) {
      console.log(
        `[VolatilityThresholds] ${symbol.toUpperCase()}: REGIME CHANGE ` +
        `${previousRegime.regime} → ${regime} | ` +
        `Volatility: ${volatility.toFixed(3)}% | ` +
        `Price threshold: ${thresholds.priceChange.toFixed(2)}%`
      );

      // Emit event for monitoring
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('igx-regime-change', {
          detail: {
            symbol,
            fromRegime: previousRegime.regime,
            toRegime: regime,
            volatility,
            thresholds
          }
        }));
      }
    }
  }

  /**
   * Get current thresholds for a symbol
   */
  getThresholds(symbol: string): ThresholdSet {
    const regime = this.currentRegimes.get(symbol);

    // If no regime yet (not enough samples), use NORMAL baseline
    if (!regime) {
      return this.BASE_THRESHOLDS;
    }

    return regime.thresholds;
  }

  /**
   * Get current regime for a symbol
   */
  getRegime(symbol: string): VolatilityRegime | null {
    return this.currentRegimes.get(symbol) || null;
  }

  /**
   * Check if price change exceeds dynamic threshold
   */
  exceedsThreshold(symbol: string, priceChangePercent: number): boolean {
    const thresholds = this.getThresholds(symbol);
    return Math.abs(priceChangePercent) >= thresholds.priceChange;
  }

  /**
   * Check if velocity exceeds dynamic threshold
   */
  exceedsVelocityThreshold(symbol: string, velocityPercentPerSecond: number): boolean {
    const thresholds = this.getThresholds(symbol);
    return Math.abs(velocityPercentPerSecond) >= thresholds.priceVelocity;
  }

  /**
   * Check if spread widening exceeds dynamic threshold
   */
  exceedsSpreadThreshold(symbol: string, spreadMultiplier: number): boolean {
    const thresholds = this.getThresholds(symbol);
    return spreadMultiplier >= thresholds.spreadWidening;
  }

  /**
   * Check if volume surge exceeds dynamic threshold
   */
  exceedsVolumeThreshold(symbol: string, volumeMultiplier: number): boolean {
    const thresholds = this.getThresholds(symbol);
    return volumeMultiplier >= thresholds.volumeSurge;
  }

  /**
   * Get system-wide statistics
   */
  getStats(): VolatilityStats {
    const regimes = Array.from(this.currentRegimes.values());

    // Calculate distribution
    const distribution: Record<string, number> = {
      CALM: 0,
      NORMAL: 0,
      VOLATILE: 0,
      EXTREME: 0
    };

    let totalVolatility = 0;

    for (const regime of regimes) {
      distribution[regime.regime]++;
      totalVolatility += regime.volatility;
    }

    return {
      avgVolatility: regimes.length > 0 ? totalVolatility / regimes.length : 0,
      regimeDistribution: distribution,
      totalSamples: regimes.length,
      lastUpdate: Date.now()
    };
  }

  /**
   * Get per-symbol breakdown (for debugging)
   */
  getSymbolBreakdown(): Map<string, VolatilityRegime> {
    return new Map(this.currentRegimes);
  }

  /**
   * Reset state for a symbol
   */
  reset(symbol: string) {
    this.volatilityHistory.delete(symbol);
    this.currentRegimes.delete(symbol);
  }

  /**
   * Reset all state (for testing)
   */
  resetAll() {
    this.volatilityHistory.clear();
    this.currentRegimes.clear();
  }

  /**
   * Emit system stats event for monitoring
   */
  emitStatsEvent() {
    if (typeof window !== 'undefined') {
      const stats = this.getStats();
      window.dispatchEvent(new CustomEvent('igx-volatility-stats', {
        detail: stats
      }));
    }
  }
}

// Singleton instance
export const volatilityAwareThresholds = new VolatilityAwareThresholds();

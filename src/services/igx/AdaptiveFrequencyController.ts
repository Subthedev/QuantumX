/**
 * ADAPTIVE FREQUENCY CONTROLLER
 *
 * Dynamically adjusts signal generation rate based on market regime
 * Prevents signal spam in ranging markets, increases opportunities in trends
 *
 * Target Frequencies:
 * - BULL_TRENDING: 3-10 signals/hour (high opportunity)
 * - BEAR_TRENDING: 2-5 signals/hour (selective shorts)
 * - RANGING: 0.5-3 signals/hour (avoid whipsaws)
 * - HIGH_VOLATILITY: 1-4 signals/hour (reduced risk)
 * - LOW_VOLATILITY: 0.5-2 signals/hour (wait for setup)
 */

export type MarketRegime =
  | 'BULL_TRENDING'
  | 'BEAR_TRENDING'
  | 'RANGING'
  | 'HIGH_VOLATILITY'
  | 'LOW_VOLATILITY'
  | 'UNKNOWN';

interface FrequencyConfig {
  minSignalsPerHour: number;
  maxSignalsPerHour: number;
  cooldownMs: number;
}

interface SignalRecord {
  symbol: string;
  timestamp: number;
  regime: MarketRegime;
}

export class AdaptiveFrequencyController {
  // Regime-based frequency targets
  private readonly FREQUENCY_CONFIG: Record<MarketRegime, FrequencyConfig> = {
    BULL_TRENDING: {
      minSignalsPerHour: 3,
      maxSignalsPerHour: 10,
      cooldownMs: 360000 // 6 minutes between signals
    },
    BEAR_TRENDING: {
      minSignalsPerHour: 2,
      maxSignalsPerHour: 5,
      cooldownMs: 720000 // 12 minutes between signals
    },
    RANGING: {
      minSignalsPerHour: 0.5,
      maxSignalsPerHour: 3,
      cooldownMs: 1200000 // 20 minutes between signals
    },
    HIGH_VOLATILITY: {
      minSignalsPerHour: 1,
      maxSignalsPerHour: 4,
      cooldownMs: 900000 // 15 minutes between signals
    },
    LOW_VOLATILITY: {
      minSignalsPerHour: 0.5,
      maxSignalsPerHour: 2,
      cooldownMs: 1800000 // 30 minutes between signals
    },
    UNKNOWN: {
      minSignalsPerHour: 1,
      maxSignalsPerHour: 3,
      cooldownMs: 1200000 // 20 minutes between signals
    }
  };

  // Signal tracking (per symbol, last 60 minutes)
  private signalHistory: Map<string, SignalRecord[]> = new Map();

  // Current regime
  private currentRegime: MarketRegime = 'UNKNOWN';

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup every 60 seconds
    this.cleanupTimer = setInterval(() => this.cleanupHistory(), 60000);
  }

  /**
   * Update current market regime
   */
  onRegimeChange(regime: MarketRegime) {
    if (this.currentRegime !== regime) {
      console.log(`[Frequency Controller] Regime change: ${this.currentRegime} → ${regime}`);
      this.currentRegime = regime;
    }
  }

  /**
   * Check if signal should be generated for symbol
   * Returns: { allowed: boolean, reason: string, cooldownRemaining?: number }
   */
  shouldGenerateSignal(symbol: string): {
    allowed: boolean;
    reason: string;
    cooldownRemaining?: number;
  } {
    const config = this.FREQUENCY_CONFIG[this.currentRegime];
    const now = Date.now();

    // Get recent signals for this symbol (last 60 minutes)
    const recentSignals = this.getRecentSignals(symbol, 3600000);

    if (recentSignals.length === 0) {
      return {
        allowed: true,
        reason: 'No recent signals for this symbol'
      };
    }

    // Check cooldown from last signal
    const lastSignal = recentSignals[recentSignals.length - 1];
    const timeSinceLastSignal = now - lastSignal.timestamp;

    if (timeSinceLastSignal < config.cooldownMs) {
      const cooldownRemaining = config.cooldownMs - timeSinceLastSignal;
      return {
        allowed: false,
        reason: `Cooldown active for ${this.currentRegime} (${Math.ceil(cooldownRemaining / 60000)}min remaining)`,
        cooldownRemaining
      };
    }

    // Check if at max frequency for this regime
    const signalsLastHour = recentSignals.length;
    if (signalsLastHour >= config.maxSignalsPerHour) {
      return {
        allowed: false,
        reason: `Max frequency reached for ${this.currentRegime} (${signalsLastHour}/${config.maxSignalsPerHour} signals/hour)`
      };
    }

    return {
      allowed: true,
      reason: `Within frequency limits (${signalsLastHour}/${config.maxSignalsPerHour} signals/hour)`
    };
  }

  /**
   * Record a signal generation
   */
  recordSignal(symbol: string) {
    const record: SignalRecord = {
      symbol,
      timestamp: Date.now(),
      regime: this.currentRegime
    };

    if (!this.signalHistory.has(symbol)) {
      this.signalHistory.set(symbol, []);
    }

    this.signalHistory.get(symbol)!.push(record);

    console.log(
      `[Frequency Controller] Signal recorded: ${symbol} (${this.currentRegime}) - ` +
      `${this.getCurrentRate(symbol).toFixed(1)} signals/hour`
    );
  }

  /**
   * Get current signal generation rate for symbol
   */
  getCurrentRate(symbol: string): number {
    const recentSignals = this.getRecentSignals(symbol, 3600000);
    return recentSignals.length;
  }

  /**
   * Get target frequency for current regime
   */
  getTargetFrequency(regime?: MarketRegime): FrequencyConfig {
    const targetRegime = regime || this.currentRegime;
    return this.FREQUENCY_CONFIG[targetRegime];
  }

  /**
   * Get frequency statistics
   */
  getFrequencyStats() {
    const stats = {
      currentRegime: this.currentRegime,
      targetConfig: this.FREQUENCY_CONFIG[this.currentRegime],
      symbolStats: [] as Array<{
        symbol: string;
        signalsLastHour: number;
        lastSignalAge: number;
        canGenerate: boolean;
      }>
    };

    for (const [symbol, records] of this.signalHistory.entries()) {
      const recentSignals = this.getRecentSignals(symbol, 3600000);
      const lastSignal = records[records.length - 1];
      const check = this.shouldGenerateSignal(symbol);

      stats.symbolStats.push({
        symbol,
        signalsLastHour: recentSignals.length,
        lastSignalAge: Date.now() - lastSignal.timestamp,
        canGenerate: check.allowed
      });
    }

    return stats;
  }

  /**
   * Get recent signals for symbol within time window
   */
  private getRecentSignals(symbol: string, windowMs: number): SignalRecord[] {
    const records = this.signalHistory.get(symbol) || [];
    const cutoff = Date.now() - windowMs;
    return records.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Cleanup old signal records (older than 60 minutes)
   */
  private cleanupHistory() {
    const cutoff = Date.now() - 3600000; // 60 minutes
    let cleaned = 0;

    for (const [symbol, records] of this.signalHistory.entries()) {
      const before = records.length;
      const filtered = records.filter(r => r.timestamp >= cutoff);

      if (filtered.length === 0) {
        this.signalHistory.delete(symbol);
      } else {
        this.signalHistory.set(symbol, filtered);
      }

      cleaned += (before - filtered.length);
    }

    if (cleaned > 0) {
      console.log(`[Frequency Controller] Cleanup: removed ${cleaned} old signal records`);
    }
  }

  /**
   * Stop controller (cleanup timers)
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
export const adaptiveFrequencyController = new AdaptiveFrequencyController();

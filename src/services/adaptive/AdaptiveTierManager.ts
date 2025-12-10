/**
 * ADAPTIVE TIER MANAGER
 * Manages per-coin scanning tiers based on market volatility and anomalies
 * Automatically upgrades/downgrades scanning frequency to balance speed vs efficiency
 */

import { AnomalySeverity } from './MicroPatternDetector';

export type ScanningTier = 1 | 2 | 3;

export interface TierState {
  tier: ScanningTier;
  lastAnomalyTime: number;
  lastAnomalySeverity: AnomalySeverity;
  lastCheckTime: number;
  checksInCurrentTier: number;
  tierUpgrades: number;
  tierDowngrades: number;
}

export interface TierStats {
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  totalChecks: number;
  totalUpgrades: number;
  totalDowngrades: number;
  avgChecksPerSecond: number;
}

export class AdaptiveTierManager {
  private coinStates: Map<string, TierState> = new Map();
  private globalStats = {
    totalChecks: 0,
    totalUpgrades: 0,
    totalDowngrades: 0,
    startTime: Date.now()
  };

  // TIER INTERVALS (milliseconds)
  private readonly TIER_INTERVALS = {
    1: 5000,   // CALM: 5 seconds (baseline efficiency)
    2: 1000,   // ALERT: 1 second (elevated scanning)
    3: 500     // OPPORTUNITY: 500ms (maximum capture)
  };

  // TIER TIMEOUTS (how long to stay in elevated tier after last anomaly)
  private readonly TIER_TIMEOUTS = {
    2: 30000,  // ALERT: 30 seconds timeout
    3: 10000   // OPPORTUNITY: 10 seconds timeout
  };

  // TIER DESCRIPTIONS (for logging)
  private readonly TIER_NAMES = {
    1: 'CALM',
    2: 'ALERT',
    3: 'OPPORTUNITY'
  };

  /**
   * Initialize or get state for a symbol
   */
  private getState(symbol: string): TierState {
    if (!this.coinStates.has(symbol)) {
      this.coinStates.set(symbol, {
        tier: 1,
        lastAnomalyTime: 0,
        lastAnomalySeverity: 'NONE',
        lastCheckTime: 0,
        checksInCurrentTier: 0,
        tierUpgrades: 0,
        tierDowngrades: 0
      });
    }
    return this.coinStates.get(symbol)!;
  }

  /**
   * Upgrade tier based on anomaly severity
   * CRITICAL/HIGH → Tier 3 (500ms scanning)
   * MEDIUM → Tier 2 (1s scanning)
   * LOW → Stay in current tier
   */
  upgradeTier(symbol: string, severity: AnomalySeverity, reason: string) {
    const state = this.getState(symbol);
    const previousTier = state.tier;
    const now = Date.now();

    // Determine target tier based on severity
    let targetTier: ScanningTier = state.tier;

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      targetTier = 3; // Jump to OPPORTUNITY mode
    } else if (severity === 'MEDIUM') {
      targetTier = Math.max(state.tier, 2) as ScanningTier; // Upgrade to ALERT if lower
    }

    // Apply upgrade if needed
    if (targetTier > state.tier) {
      state.tier = targetTier;
      state.tierUpgrades++;
      this.globalStats.totalUpgrades++;

      console.log(
        `[AdaptiveTier] 🔼 ${symbol.toUpperCase()}: TIER ${previousTier} → TIER ${targetTier} ` +
        `(${this.TIER_NAMES[previousTier]} → ${this.TIER_NAMES[targetTier]}) ` +
        `| Reason: ${reason} | Severity: ${severity}`
      );

      // Emit event for UI/monitoring
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('igx-tier-upgrade', {
          detail: { symbol, fromTier: previousTier, toTier: targetTier, severity, reason }
        }));
      }
    }

    // Update anomaly tracking
    state.lastAnomalyTime = now;
    state.lastAnomalySeverity = severity;
    this.coinStates.set(symbol, state);
  }

  /**
   * Check if enough time has passed to trigger a scan for this symbol
   * Automatically handles tier downgrade if timeout expired
   */
  shouldCheck(symbol: string): boolean {
    const state = this.getState(symbol);
    const now = Date.now();

    // STEP 1: Check if we should downgrade tier (timeout expired)
    if (state.tier > 1) {
      const timeSinceAnomaly = now - state.lastAnomalyTime;
      const timeout = this.TIER_TIMEOUTS[state.tier];

      if (timeSinceAnomaly > timeout) {
        this.downgradeTier(symbol);
      }
    }

    // STEP 2: Check if enough time passed for current tier's interval
    const interval = this.TIER_INTERVALS[state.tier];
    const timeSinceLastCheck = now - state.lastCheckTime;

    if (timeSinceLastCheck >= interval) {
      state.lastCheckTime = now;
      state.checksInCurrentTier++;
      this.globalStats.totalChecks++;
      this.coinStates.set(symbol, state);
      return true;
    }

    return false;
  }

  /**
   * Manually downgrade a tier (called on timeout)
   */
  private downgradeTier(symbol: string) {
    const state = this.getState(symbol);
    const previousTier = state.tier;

    if (state.tier > 1) {
      state.tier = Math.max(1, state.tier - 1) as ScanningTier;
      state.tierDowngrades++;
      this.globalStats.totalDowngrades++;

      console.log(
        `[AdaptiveTier] 🔽 ${symbol.toUpperCase()}: TIER ${previousTier} → TIER ${state.tier} ` +
        `(${this.TIER_NAMES[previousTier]} → ${this.TIER_NAMES[state.tier]}) ` +
        `| Reason: Timeout (calm period)`
      );

      // Emit event for UI/monitoring
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('igx-tier-downgrade', {
          detail: { symbol, fromTier: previousTier, toTier: state.tier, reason: 'timeout' }
        }));
      }

      this.coinStates.set(symbol, state);
    }
  }

  /**
   * Force a specific tier (for manual control or testing)
   */
  setTier(symbol: string, tier: ScanningTier, reason: string = 'manual') {
    const state = this.getState(symbol);
    const previousTier = state.tier;

    if (tier !== previousTier) {
      state.tier = tier;

      if (tier > previousTier) {
        state.tierUpgrades++;
        this.globalStats.totalUpgrades++;
      } else {
        state.tierDowngrades++;
        this.globalStats.totalDowngrades++;
      }

      console.log(
        `[AdaptiveTier] 🎯 ${symbol.toUpperCase()}: TIER ${previousTier} → TIER ${tier} ` +
        `(${reason})`
      );

      this.coinStates.set(symbol, state);
    }
  }

  /**
   * Get current tier for a symbol
   */
  getTier(symbol: string): ScanningTier {
    return this.getState(symbol).tier;
  }

  /**
   * Get full state for a symbol
   */
  getSymbolState(symbol: string): TierState {
    return { ...this.getState(symbol) };
  }

  /**
   * Get system-wide statistics
   */
  getStats(): TierStats {
    const tierCounts = { 1: 0, 2: 0, 3: 0 };

    for (const state of this.coinStates.values()) {
      tierCounts[state.tier]++;
    }

    const uptimeSeconds = (Date.now() - this.globalStats.startTime) / 1000;
    const avgChecksPerSecond = uptimeSeconds > 0 ? this.globalStats.totalChecks / uptimeSeconds : 0;

    return {
      tier1Count: tierCounts[1],
      tier2Count: tierCounts[2],
      tier3Count: tierCounts[3],
      totalChecks: this.globalStats.totalChecks,
      totalUpgrades: this.globalStats.totalUpgrades,
      totalDowngrades: this.globalStats.totalDowngrades,
      avgChecksPerSecond
    };
  }

  /**
   * Get per-symbol breakdown (for debugging)
   */
  getSymbolBreakdown(): Map<string, TierState> {
    return new Map(this.coinStates);
  }

  /**
   * Reset state for a symbol
   */
  reset(symbol: string) {
    this.coinStates.delete(symbol);
  }

  /**
   * Reset all state (for testing)
   */
  resetAll() {
    this.coinStates.clear();
    this.globalStats = {
      totalChecks: 0,
      totalUpgrades: 0,
      totalDowngrades: 0,
      startTime: Date.now()
    };
  }

  /**
   * Get interval for a specific tier (for external use)
   */
  getTierInterval(tier: ScanningTier): number {
    return this.TIER_INTERVALS[tier];
  }

  /**
   * Get timeout for a specific tier (for external use)
   */
  getTierTimeout(tier: ScanningTier): number {
    return tier === 1 ? 0 : this.TIER_TIMEOUTS[tier];
  }

  /**
   * Emit system stats event for monitoring
   */
  emitStatsEvent() {
    if (typeof window !== 'undefined') {
      const stats = this.getStats();
      window.dispatchEvent(new CustomEvent('igx-tier-stats', {
        detail: stats
      }));
    }
  }
}

// Singleton instance
export const adaptiveTierManager = new AdaptiveTierManager();

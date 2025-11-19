/**
 * SIMPLE RATE LIMITER
 *
 * Time-based signal distribution with tier quotas:
 * - FREE: 3 signals per 24 hours
 * - PRO: 15 signals per 24 hours
 * - MAX: 30 signals per 24 hours
 *
 * Signals are dropped immediately when generated (no complex selection)
 * Simple first-come-first-served until quota is reached
 */

export type UserTier = 'FREE' | 'PRO' | 'MAX';

interface SignalDrop {
  timestamp: number;
  symbol: string;
  tier: UserTier;
}

interface TierLimits {
  FREE: number;
  PRO: number;
  MAX: number;
}

class SimpleRateLimiter {
  // Tier quotas (signals per 24 hours)
  private readonly TIER_LIMITS: TierLimits = {
    FREE: 3,
    PRO: 15,
    MAX: 30
  };

  // Track signal drops per tier (in-memory for now)
  private signalHistory: SignalDrop[] = [];

  // 24 hours in milliseconds
  private readonly WINDOW_MS = 24 * 60 * 60 * 1000;

  constructor() {
    console.log('[SimpleRateLimiter] Initialized with tier limits:', this.TIER_LIMITS);

    // Clean up old signals every hour
    setInterval(() => this.cleanupOldSignals(), 60 * 60 * 1000);
  }

  /**
   * Check if signal can be published for given tier
   */
  canPublish(tier: UserTier): boolean {
    this.cleanupOldSignals();

    const recentSignals = this.getRecentSignalsForTier(tier);
    const limit = this.TIER_LIMITS[tier];
    const canPublish = recentSignals.length < limit;

    console.log(
      `[SimpleRateLimiter] Tier ${tier}: ${recentSignals.length}/${limit} signals used in last 24h` +
      ` → ${canPublish ? '✅ CAN PUBLISH' : '❌ QUOTA EXCEEDED'}`
    );

    return canPublish;
  }

  /**
   * Record a signal drop
   */
  recordDrop(symbol: string, tier: UserTier): void {
    const drop: SignalDrop = {
      timestamp: Date.now(),
      symbol,
      tier
    };

    this.signalHistory.push(drop);
    console.log(`[SimpleRateLimiter] 📝 Recorded drop: ${symbol} (${tier})`);
  }

  /**
   * Get remaining quota for tier
   */
  getRemainingQuota(tier: UserTier): number {
    this.cleanupOldSignals();
    const recentSignals = this.getRecentSignalsForTier(tier);
    const limit = this.TIER_LIMITS[tier];
    return Math.max(0, limit - recentSignals.length);
  }

  /**
   * Get next reset time (when quota refills)
   */
  getNextResetTime(tier: UserTier): Date {
    const recentSignals = this.getRecentSignalsForTier(tier);

    if (recentSignals.length === 0) {
      return new Date(Date.now() + this.WINDOW_MS);
    }

    // Oldest signal will expire first
    const oldestSignal = recentSignals[0];
    return new Date(oldestSignal.timestamp + this.WINDOW_MS);
  }

  /**
   * Get time interval between signals for even distribution
   */
  getSignalInterval(tier: UserTier): number {
    const limit = this.TIER_LIMITS[tier];
    // Distribute signals evenly across 24 hours
    return this.WINDOW_MS / limit; // milliseconds between signals
  }

  /**
   * Get stats for a tier
   */
  getStats(tier: UserTier) {
    this.cleanupOldSignals();
    const recentSignals = this.getRecentSignalsForTier(tier);
    const limit = this.TIER_LIMITS[tier];
    const remaining = this.getRemainingQuota(tier);
    const nextReset = this.getNextResetTime(tier);
    const interval = this.getSignalInterval(tier);

    return {
      tier,
      limit,
      used: recentSignals.length,
      remaining,
      nextReset,
      intervalMs: interval,
      intervalMinutes: Math.floor(interval / 60000),
      recentDrops: recentSignals.map(s => ({
        symbol: s.symbol,
        timestamp: new Date(s.timestamp),
        age: Date.now() - s.timestamp
      }))
    };
  }

  /**
   * Get recent signals for a specific tier (last 24 hours)
   */
  private getRecentSignalsForTier(tier: UserTier): SignalDrop[] {
    const cutoff = Date.now() - this.WINDOW_MS;
    return this.signalHistory.filter(
      drop => drop.tier === tier && drop.timestamp > cutoff
    );
  }

  /**
   * Remove signals older than 24 hours
   */
  private cleanupOldSignals(): void {
    const cutoff = Date.now() - this.WINDOW_MS;
    const before = this.signalHistory.length;
    this.signalHistory = this.signalHistory.filter(drop => drop.timestamp > cutoff);
    const removed = before - this.signalHistory.length;

    if (removed > 0) {
      console.log(`[SimpleRateLimiter] 🧹 Cleaned up ${removed} old signals`);
    }
  }

  /**
   * Reset all quotas (for testing)
   */
  reset(): void {
    this.signalHistory = [];
    console.log('[SimpleRateLimiter] 🔄 All quotas reset');
  }

  /**
   * Get all stats
   */
  getAllStats() {
    return {
      FREE: this.getStats('FREE'),
      PRO: this.getStats('PRO'),
      MAX: this.getStats('MAX'),
      totalSignals: this.signalHistory.length
    };
  }
}

// Export singleton instance
export const simpleRateLimiter = new SimpleRateLimiter();

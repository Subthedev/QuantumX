/**
 * Signal Quality Gate V3 - Regime-Aware Scheduled Distribution
 *
 * NEW ARCHITECTURE (Per User Request):
 * ===================================
 *
 * 1. STORAGE: Signals stored in quality gate (NOT published immediately)
 * 2. SCHEDULED DROPS: Time-based distribution over 24 hours:
 *    - MAX Tier: 30 signals / 24 hours (1.25 per hour)
 *    - PRO Tier: 15 signals / 24 hours (0.625 per hour)
 *    - FREE Tier: 2 signals / 24 hours (highest quality only)
 *
 * 3. REGIME-AWARE MATCHING: When time to drop signal:
 *    - Contact engine with market regime information
 *    - Match stored signals to best regime for current time
 *    - Distribute best-matched signals
 *
 * 4. REAL-TIME UI UPDATES: Signal counts update every second
 *
 * FLOW:
 * Delta → submitCandidate() → STORAGE (with regime)
 *      → Timer fires (scheduled)
 *      → getMarketRegime() from globalHubService
 *      → matchSignalsToRegime(currentRegime)
 *      → distributeByTier(MAX: 1-2, PRO: 0-1, FREE: 0-0.08 per hour)
 *      → publishSignal() → Smart Pool → Database → UI
 */

import type { HubSignal } from './globalHubService';

// ===== TYPES =====

export type MarketRegime = 'BULLISH_TREND' | 'BEARISH_TREND' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';

export interface StoredSignal {
  signal: HubSignal;
  qualityScore: number;
  mlProbability: number;
  marketRegime: MarketRegime;  // Regime when signal was generated
  receivedAt: number;
  metadata: {
    strategy: string;
    confidence: number;
    volatility: number;
    rsi: number;
  };
}

export interface TierQuota {
  MAX: {
    signalsPerDay: number;  // 30
    signalsPerHour: number;  // 1.25
    minQuality: number;  // 60
    published24h: number;
    publishedThisHour: number;
    nextDrop: number;  // timestamp
  };
  PRO: {
    signalsPerDay: number;  // 15
    signalsPerHour: number;  // 0.625
    minQuality: number;  // 65
    published24h: number;
    publishedThisHour: number;
    nextDrop: number;
  };
  FREE: {
    signalsPerDay: number;  // 2
    signalsPerHour: number;  // 0.083
    minQuality: number;  // 75
    published24h: number;
    publishedThisHour: number;
    nextDrop: number;
  };
}

export interface StorageStatus {
  totalStored: number;
  byRegime: Record<MarketRegime, number>;
  byQuality: {
    excellent: number;  // 85+
    veryGood: number;   // 75-84
    good: number;       // 65-74
    acceptable: number; // 50-64
  };
  oldest: number | null;  // timestamp
  newest: number | null;  // timestamp
}

// ===== REGIME-AWARE QUALITY GATE V3 =====

export class SignalQualityGateV3 {
  // Storage for signals (NOT published immediately)
  private signalStorage: StoredSignal[] = [];

  // Tier quotas and tracking
  private tierQuotas: TierQuota;

  // Callbacks
  private onSignalPublished: ((signal: HubSignal, tier: 'MAX' | 'PRO' | 'FREE') => Promise<void> | void) | null = null;
  private getMarketRegime: (() => MarketRegime) | null = null;

  // Distribution timer
  private distributionTimer: NodeJS.Timeout | null = null;

  // LocalStorage keys
  private readonly STORAGE_KEY = 'quality-gate-v3-signals';
  private readonly QUOTAS_KEY = 'quality-gate-v3-quotas';

  constructor() {
    // Initialize tier quotas
    this.tierQuotas = {
      MAX: {
        signalsPerDay: 30,
        signalsPerHour: 30 / 24,  // 1.25
        minQuality: 60,
        published24h: 0,
        publishedThisHour: 0,
        nextDrop: Date.now() + (3600000 / (30/24))  // ~48 minutes
      },
      PRO: {
        signalsPerDay: 15,
        signalsPerHour: 15 / 24,  // 0.625
        minQuality: 65,
        published24h: 0,
        publishedThisHour: 0,
        nextDrop: Date.now() + (3600000 / (15/24))  // ~96 minutes
      },
      FREE: {
        signalsPerDay: 2,
        signalsPerHour: 2 / 24,  // 0.083
        minQuality: 75,
        published24h: 0,
        publishedThisHour: 0,
        nextDrop: Date.now() + (3600000 / (2/24))  // ~12 hours
      }
    };

    // Load persisted state
    this.loadPersistedState();

    console.log('[Quality Gate V3] 🚀 Initialized - Regime-Aware Scheduled Distribution');
    console.log('[Quality Gate V3] 📊 Tier Quotas:', {
      MAX: `${this.tierQuotas.MAX.signalsPerDay}/day (${this.tierQuotas.MAX.signalsPerHour.toFixed(2)}/hour)`,
      PRO: `${this.tierQuotas.PRO.signalsPerDay}/day (${this.tierQuotas.PRO.signalsPerHour.toFixed(2)}/hour)`,
      FREE: `${this.tierQuotas.FREE.signalsPerDay}/day (${this.tierQuotas.FREE.signalsPerHour.toFixed(2)}/hour)`
    });
  }

  /**
   * Start the scheduled distribution system
   * Checks every 30 seconds if it's time to drop signals for any tier
   */
  start() {
    if (this.distributionTimer) {
      console.log('[Quality Gate V3] Already running');
      return;
    }

    console.log('[Quality Gate V3] 🎬 Starting scheduled distribution system...');
    console.log('[Quality Gate V3] ⏰ Checking every 30 seconds for signal drops');

    this.distributionTimer = setInterval(() => {
      this.checkAndDistribute();
    }, 30000); // Check every 30 seconds

    // Also run immediately
    setTimeout(() => this.checkAndDistribute(), 5000);

    console.log('[Quality Gate V3] ✅ Distribution system started!');
  }

  /**
   * Stop the distribution system
   */
  stop() {
    if (this.distributionTimer) {
      clearInterval(this.distributionTimer);
      this.distributionTimer = null;
      console.log('[Quality Gate V3] ⏸️  Distribution system stopped');
    }
  }

  /**
   * Submit a signal candidate for storage (NOT immediate publishing)
   * Signal is stored with regime info and will be dropped on schedule
   */
  submitCandidate(
    signal: HubSignal,
    qualityScore: number,
    mlProbability: number,
    marketRegime: MarketRegime,
    metadata: {
      strategy: string;
      confidence: number;
      volatility: number;
      rsi: number;
    }
  ): { accepted: boolean; reason: string } {

    // Minimum quality threshold check
    const MIN_STORAGE_QUALITY = 50;
    if (qualityScore < MIN_STORAGE_QUALITY) {
      console.log(
        `[Quality Gate V3] ❌ REJECTED: ${signal.symbol} ${signal.direction}\n` +
        `   Quality too low: ${qualityScore.toFixed(1)} < ${MIN_STORAGE_QUALITY}\n`
      );
      return {
        accepted: false,
        reason: `Quality too low (${qualityScore.toFixed(1)} < ${MIN_STORAGE_QUALITY})`
      };
    }

    // Store signal
    const storedSignal: StoredSignal = {
      signal,
      qualityScore,
      mlProbability,
      marketRegime,
      receivedAt: Date.now(),
      metadata
    };

    this.signalStorage.push(storedSignal);

    // Sort by quality (highest first)
    this.signalStorage.sort((a, b) => b.qualityScore - a.qualityScore);

    // Keep only top 100 signals (prevent memory bloat)
    if (this.signalStorage.length > 100) {
      this.signalStorage = this.signalStorage.slice(0, 100);
    }

    // Save to localStorage
    this.savePersistedState();

    console.log(
      `[Quality Gate V3] ✅ STORED: ${signal.symbol} ${signal.direction}\n` +
      `   Quality: ${qualityScore.toFixed(1)} | ML: ${(mlProbability * 100).toFixed(1)}% | Regime: ${marketRegime}\n` +
      `   Storage: ${this.signalStorage.length} signals | Will drop on schedule\n`
    );

    return {
      accepted: true,
      reason: `Stored (${this.signalStorage.length} in storage)`
    };
  }

  /**
   * Check if it's time to distribute signals for any tier
   * Called every 30 seconds by timer
   */
  private async checkAndDistribute() {
    const now = Date.now();

    console.log(`\n[Quality Gate V3] ⏰ Checking distribution schedule...`);
    console.log(`[Quality Gate V3] 📦 Storage: ${this.signalStorage.length} signals`);

    // Clean up old quotas (reset counters past 24h/1h)
    this.cleanupOldQuotas();

    // Check each tier
    const tiers: Array<'MAX' | 'PRO' | 'FREE'> = ['MAX', 'PRO', 'FREE'];

    for (const tier of tiers) {
      const quota = this.tierQuotas[tier];

      // Check if it's time to drop a signal for this tier
      if (now >= quota.nextDrop && quota.published24h < quota.signalsPerDay) {
        console.log(`\n[Quality Gate V3] 🎯 Time to drop signal for ${tier} tier!`);
        console.log(`   Published: ${quota.published24h}/${quota.signalsPerDay} (24h)`);
        console.log(`   This hour: ${quota.publishedThisHour}`);

        await this.distributeToTier(tier);
      } else {
        const nextIn = Math.max(0, quota.nextDrop - now);
        const nextInMin = Math.floor(nextIn / 60000);
        console.log(`[Quality Gate V3] ${tier}: Next drop in ${nextInMin}m (${quota.published24h}/${quota.signalsPerDay} today)`);
      }
    }
  }

  /**
   * Distribute a signal to a specific tier
   * Uses regime-aware matching to select best signal
   */
  private async distributeToTier(tier: 'MAX' | 'PRO' | 'FREE') {
    const quota = this.tierQuotas[tier];

    // Get current market regime
    const currentRegime = this.getMarketRegime ? this.getMarketRegime() : 'SIDEWAYS';

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[Quality Gate V3] 🎯 DISTRIBUTING TO ${tier} TIER`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Current Market Regime: ${currentRegime}`);
    console.log(`Storage: ${this.signalStorage.length} signals available`);
    console.log(`Min Quality for ${tier}: ${quota.minQuality}`);

    // Filter signals meeting tier quality threshold
    const eligible = this.signalStorage.filter(s => s.qualityScore >= quota.minQuality);

    console.log(`Eligible signals (quality ≥${quota.minQuality}): ${eligible.length}`);

    if (eligible.length === 0) {
      console.log(`[Quality Gate V3] ⚠️  No signals meet ${tier} quality threshold`);
      console.log(`[Quality Gate V3] ⏭️  Skipping this drop, will try again next cycle`);
      // Schedule next attempt soon (10 minutes)
      quota.nextDrop = Date.now() + 600000;
      this.savePersistedState();
      return;
    }

    // Match signals to current regime (regime-aware selection!)
    const matchedSignal = this.matchSignalToRegime(eligible, currentRegime);

    if (!matchedSignal) {
      console.log(`[Quality Gate V3] ⚠️  No good regime match found`);
      quota.nextDrop = Date.now() + 600000;  // Try again in 10 min
      this.savePersistedState();
      return;
    }

    console.log(`\n✅ BEST MATCH: ${matchedSignal.signal.symbol} ${matchedSignal.signal.direction}`);
    console.log(`   Quality: ${matchedSignal.qualityScore.toFixed(1)}`);
    console.log(`   Signal Regime: ${matchedSignal.marketRegime}`);
    console.log(`   Current Regime: ${currentRegime}`);
    console.log(`   Match: ${matchedSignal.marketRegime === currentRegime ? '✅ PERFECT' : '⚡ COMPATIBLE'}`);

    // Remove from storage
    const index = this.signalStorage.findIndex(s => s === matchedSignal);
    if (index !== -1) {
      this.signalStorage.splice(index, 1);
    }

    // Update quotas
    quota.published24h++;
    quota.publishedThisHour++;

    // Calculate next drop time (evenly distributed over 24 hours)
    const avgIntervalMs = (24 * 3600000) / quota.signalsPerDay;
    quota.nextDrop = Date.now() + avgIntervalMs;

    console.log(`\n📊 ${tier} Quota Updated:`);
    console.log(`   Published: ${quota.published24h}/${quota.signalsPerDay} (24h)`);
    console.log(`   This hour: ${quota.publishedThisHour}`);
    console.log(`   Next drop: ${new Date(quota.nextDrop).toLocaleTimeString()}`);

    // Save state
    this.savePersistedState();

    // Publish signal (trigger callback)
    if (this.onSignalPublished) {
      console.log(`\n🚀 [Quality Gate V3] Publishing to ${tier} tier...`);
      try {
        await this.onSignalPublished(matchedSignal.signal, tier);
        console.log(`✅ [Quality Gate V3] Signal published successfully to ${tier}!`);
        console.log(`${'='.repeat(80)}\n`);
      } catch (error) {
        console.error(`❌ [Quality Gate V3] Publish failed:`, error);
      }
    } else {
      console.error(`❌ [Quality Gate V3] NO CALLBACK REGISTERED!`);
    }
  }

  /**
   * Match signals to current market regime (REGIME-AWARE LOGIC)
   * Prioritizes signals generated in similar regime to current regime
   */
  private matchSignalToRegime(
    signals: StoredSignal[],
    currentRegime: MarketRegime
  ): StoredSignal | null {

    // Strategy: Prioritize signals from same regime, then compatible regimes
    const regimeCompatibility: Record<MarketRegime, MarketRegime[]> = {
      'BULLISH_TREND': ['BULLISH_TREND', 'HIGH_VOLATILITY', 'SIDEWAYS'],
      'BEARISH_TREND': ['BEARISH_TREND', 'HIGH_VOLATILITY', 'SIDEWAYS'],
      'SIDEWAYS': ['SIDEWAYS', 'LOW_VOLATILITY', 'BULLISH_TREND', 'BEARISH_TREND'],
      'HIGH_VOLATILITY': ['HIGH_VOLATILITY', 'BULLISH_TREND', 'BEARISH_TREND'],
      'LOW_VOLATILITY': ['LOW_VOLATILITY', 'SIDEWAYS']
    };

    const compatibleRegimes = regimeCompatibility[currentRegime];

    // Score each signal by regime match + quality
    const scored = signals.map(signal => {
      let regimeScore = 0;

      // Perfect match: same regime
      if (signal.marketRegime === currentRegime) {
        regimeScore = 100;
      }
      // Compatible regime
      else if (compatibleRegimes.includes(signal.marketRegime)) {
        const index = compatibleRegimes.indexOf(signal.marketRegime);
        regimeScore = 80 - (index * 10);  // 80, 70, 60...
      }
      // Not compatible
      else {
        regimeScore = 30;  // Low score but not 0 (fallback)
      }

      // Composite score: 60% quality + 40% regime match
      const compositeScore = (signal.qualityScore * 0.6) + (regimeScore * 0.4);

      return {
        signal,
        regimeScore,
        compositeScore
      };
    });

    // Sort by composite score (best match first)
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Return best match
    return scored[0]?.signal || null;
  }

  /**
   * Clean up old quota counters
   */
  private cleanupOldQuotas() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 3600000;
    const oneHourAgo = now - 3600000;

    // Reset 24h counters if we crossed midnight
    const tiers: Array<'MAX' | 'PRO' | 'FREE'> = ['MAX', 'PRO', 'FREE'];
    tiers.forEach(tier => {
      // Reset hour counter every hour
      if (now - oneHourAgo > 3600000) {
        this.tierQuotas[tier].publishedThisHour = 0;
      }

      // Note: published24h is tracked by actual timestamps in a real system
      // For now, we'll reset at midnight (simplified)
      const midnight = new Date().setHours(0, 0, 0, 0);
      const lastMidnight = now - (now - midnight);
      if (now >= midnight + 24*3600000) {
        this.tierQuotas[tier].published24h = 0;
        console.log(`[Quality Gate V3] 🔄 ${tier} 24h counter reset`);
      }
    });
  }

  /**
   * Get storage status for UI display
   */
  getStorageStatus(): StorageStatus {
    const byRegime: Record<MarketRegime, number> = {
      'BULLISH_TREND': 0,
      'BEARISH_TREND': 0,
      'SIDEWAYS': 0,
      'HIGH_VOLATILITY': 0,
      'LOW_VOLATILITY': 0
    };

    const byQuality = {
      excellent: 0,
      veryGood: 0,
      good: 0,
      acceptable: 0
    };

    this.signalStorage.forEach(s => {
      byRegime[s.marketRegime]++;

      if (s.qualityScore >= 85) byQuality.excellent++;
      else if (s.qualityScore >= 75) byQuality.veryGood++;
      else if (s.qualityScore >= 65) byQuality.good++;
      else byQuality.acceptable++;
    });

    return {
      totalStored: this.signalStorage.length,
      byRegime,
      byQuality,
      oldest: this.signalStorage.length > 0
        ? Math.min(...this.signalStorage.map(s => s.receivedAt))
        : null,
      newest: this.signalStorage.length > 0
        ? Math.max(...this.signalStorage.map(s => s.receivedAt))
        : null
    };
  }

  /**
   * Get tier quota status for UI display
   */
  getTierQuotas(): TierQuota {
    return { ...this.tierQuotas };
  }

  /**
   * Register callback for signal publication
   */
  onPublish(callback: (signal: HubSignal, tier: 'MAX' | 'PRO' | 'FREE') => Promise<void> | void) {
    this.onSignalPublished = callback;
    console.log('[Quality Gate V3] ✅ Publish callback registered');
  }

  /**
   * Register market regime provider
   */
  setRegimeProvider(provider: () => MarketRegime) {
    this.getMarketRegime = provider;
    console.log('[Quality Gate V3] ✅ Market regime provider registered');
  }

  /**
   * Clear all storage (for debugging)
   */
  clearStorage() {
    this.signalStorage = [];
    this.savePersistedState();
    console.log('[Quality Gate V3] 🗑️  Storage cleared');
  }

  /**
   * Reset quotas (for debugging)
   */
  resetQuotas() {
    const tiers: Array<'MAX' | 'PRO' | 'FREE'> = ['MAX', 'PRO', 'FREE'];
    tiers.forEach(tier => {
      this.tierQuotas[tier].published24h = 0;
      this.tierQuotas[tier].publishedThisHour = 0;
    });
    this.savePersistedState();
    console.log('[Quality Gate V3] 🔄 Quotas reset');
  }

  // ===== PERSISTENCE =====

  private loadPersistedState() {
    try {
      // Load signal storage
      const storedSignals = localStorage.getItem(this.STORAGE_KEY);
      if (storedSignals) {
        this.signalStorage = JSON.parse(storedSignals);
        console.log(`[Quality Gate V3] 📥 Loaded ${this.signalStorage.length} signals from storage`);
      }

      // Load quotas
      const storedQuotas = localStorage.getItem(this.QUOTAS_KEY);
      if (storedQuotas) {
        this.tierQuotas = JSON.parse(storedQuotas);
        console.log('[Quality Gate V3] 📥 Loaded tier quotas from storage');
      }
    } catch (error) {
      console.error('[Quality Gate V3] Error loading persisted state:', error);
    }
  }

  private savePersistedState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.signalStorage));
      localStorage.setItem(this.QUOTAS_KEY, JSON.stringify(this.tierQuotas));
    } catch (error) {
      console.error('[Quality Gate V3] Error saving state:', error);
    }
  }
}

// Export singleton instance
export const signalQualityGateV3 = new SignalQualityGateV3();
export default signalQualityGateV3;

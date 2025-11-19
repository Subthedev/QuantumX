/**
 * SMART SIGNAL POOL MANAGER
 *
 * Intelligent signal collection, ranking, and tier-based distribution
 *
 * SMART LOGIC:
 * 1. Collects ALL signals from all strategies into a daily pool
 * 2. Ranks signals using multi-factor scoring:
 *    - Confidence score (primary)
 *    - Quality score (secondary)
 *    - Diversity bonus (avoid 10 BTC signals)
 *    - Freshness bonus (newer signals ranked higher)
 *    - Strategy diversity (different strategies get bonus)
 * 3. Distributes from ranked pool:
 *    - FREE: Absolute TOP 2 best signals (scheduled at 9 AM, 6 PM UTC)
 *    - PRO: Top 15-20 best signals (real-time)
 *    - MAX: Top 30-35 best signals (10min early access)
 *
 * BENEFITS FOR IGNITEX:
 * - FREE users get the absolute BEST signals → Trust building → Conversion flywheel
 * - PRO users get high-quality curated signals → Justified premium
 * - MAX users get best + volume + early access → VIP treatment
 * - No tier gets low-quality signals → Protects brand reputation
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserTier } from './tieredSignalGate';
import { tieredSignalGate, type SignalForDistribution } from './tieredSignalGate';

export interface SignalForRanking {
  id: string;
  symbol: string;
  signal_type: 'LONG' | 'SHORT';
  confidence: number;
  quality_score: number;
  entry_price: number;
  take_profit?: number[];
  stop_loss?: number;
  timestamp: string;
  expires_at: string;
  strategy: string;
  metadata: any;
}

export interface RankedSignal extends SignalForRanking {
  compositeScore: number; // Our smart ranking score
  rank: number; // 1 = best
  diversityBonus: number;
  freshnessBonus: number;
  strategyBonus: number;
}

export interface DailySignalPool {
  date: string;
  signals: RankedSignal[];
  lastUpdated: number;
  totalSignals: number;
  avgConfidence: number;
  avgQuality: number;
}

export interface TierAllocation {
  tier: UserTier;
  signalIds: string[];
  minRank: number;
  maxRank: number;
}

class SmartSignalPoolManager {
  private static instance: SmartSignalPoolManager;
  private dailyPool: DailySignalPool | null = null;
  private symbolCountCache: Map<string, number> = new Map(); // Track symbol distribution
  private strategyCountCache: Map<string, number> = new Map(); // Track strategy distribution

  // Configuration
  private readonly FREE_TIER_COUNT = 2;
  private readonly PRO_TIER_COUNT = 15;
  private readonly MAX_TIER_COUNT = 30;
  private readonly MIN_QUALITY_THRESHOLD = 60; // Only pool signals with 60+ quality
  private readonly POOL_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh pool every 5 minutes

  private constructor() {
    this.initializePool();
    this.startPoolRefresh();
    console.log('🎯 Smart Signal Pool Manager initialized');
  }

  static getInstance(): SmartSignalPoolManager {
    if (!SmartSignalPoolManager.instance) {
      SmartSignalPoolManager.instance = new SmartSignalPoolManager();
    }
    return SmartSignalPoolManager.instance;
  }

  /**
   * Initialize daily pool
   */
  private initializePool(): void {
    const today = new Date().toISOString().split('T')[0];
    this.dailyPool = {
      date: today,
      signals: [],
      lastUpdated: Date.now(),
      totalSignals: 0,
      avgConfidence: 0,
      avgQuality: 0,
    };
  }

  /**
   * Start automatic pool refresh
   */
  private startPoolRefresh(): void {
    setInterval(() => {
      this.refreshPool();
    }, this.POOL_REFRESH_INTERVAL);
  }

  /**
   * Add new signal to pool and re-rank
   */
  async addSignal(signal: SignalForRanking): Promise<void> {
    // Quality gate - only accept signals with 60+ quality
    if (signal.quality_score < this.MIN_QUALITY_THRESHOLD) {
      console.log(`⏭️ [Pool] Signal ${signal.symbol} rejected - quality ${signal.quality_score.toFixed(1)} < ${this.MIN_QUALITY_THRESHOLD}`);
      return;
    }

    // Check if new day - reset pool
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyPool?.date !== today) {
      console.log(`🔄 [Pool] New day detected - resetting pool`);
      this.initializePool();
      this.symbolCountCache.clear();
      this.strategyCountCache.clear();
    }

    // Check if signal already exists
    if (this.dailyPool!.signals.some(s => s.id === signal.id)) {
      console.log(`⏭️ [Pool] Signal ${signal.id} already in pool`);
      return;
    }

    // Calculate composite score
    const rankedSignal = this.calculateCompositeScore(signal);

    // Add to pool
    this.dailyPool!.signals.push(rankedSignal);
    this.dailyPool!.totalSignals = this.dailyPool!.signals.length;

    // Update caches
    this.symbolCountCache.set(signal.symbol, (this.symbolCountCache.get(signal.symbol) || 0) + 1);
    this.strategyCountCache.set(signal.strategy, (this.strategyCountCache.get(signal.strategy) || 0) + 1);

    // Re-rank entire pool
    this.rankAllSignals();

    // Update pool stats
    this.updatePoolStats();

    console.log(`✅ [Pool] Added ${signal.symbol} ${signal.signal_type} | Composite: ${rankedSignal.compositeScore.toFixed(2)} | Rank: ${rankedSignal.rank}/${this.dailyPool!.totalSignals}`);

    // Trigger tier distribution if needed
    await this.distributeToTiers();
  }

  /**
   * Calculate composite score using multiple factors
   */
  private calculateCompositeScore(signal: SignalForRanking): RankedSignal {
    // Base scores (normalized to 0-100)
    const confidenceScore = signal.confidence; // 0-100
    const qualityScore = signal.quality_score; // 0-100

    // Diversity bonus: Penalize over-representation of same symbol
    const symbolCount = this.symbolCountCache.get(signal.symbol) || 0;
    const diversityBonus = Math.max(0, 10 - symbolCount * 2); // Max +10, -2 per existing signal

    // Freshness bonus: Newer signals get slight boost
    const ageMinutes = (Date.now() - new Date(signal.timestamp).getTime()) / (60 * 1000);
    const freshnessBonus = Math.max(0, 5 - ageMinutes * 0.1); // Max +5, decay over time

    // Strategy diversity bonus: Encourage different strategies
    const strategyCount = this.strategyCountCache.get(signal.strategy) || 0;
    const strategyBonus = Math.max(0, 5 - strategyCount); // Max +5

    // Calculate composite score (weighted average)
    const compositeScore =
      confidenceScore * 0.50 +      // 50% weight on confidence
      qualityScore * 0.30 +          // 30% weight on quality
      diversityBonus * 0.10 +        // 10% weight on diversity
      freshnessBonus * 0.05 +        // 5% weight on freshness
      strategyBonus * 0.05;          // 5% weight on strategy diversity

    return {
      ...signal,
      compositeScore,
      rank: 0, // Will be set during ranking
      diversityBonus,
      freshnessBonus,
      strategyBonus,
    };
  }

  /**
   * Rank all signals in pool by composite score
   */
  private rankAllSignals(): void {
    if (!this.dailyPool || this.dailyPool.signals.length === 0) return;

    // Sort by composite score (highest first)
    this.dailyPool.signals.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign ranks
    this.dailyPool.signals.forEach((signal, index) => {
      signal.rank = index + 1;
    });

    this.dailyPool.lastUpdated = Date.now();
  }

  /**
   * Update pool statistics
   */
  private updatePoolStats(): void {
    if (!this.dailyPool || this.dailyPool.signals.length === 0) return;

    const totalConfidence = this.dailyPool.signals.reduce((sum, s) => sum + s.confidence, 0);
    const totalQuality = this.dailyPool.signals.reduce((sum, s) => sum + s.quality_score, 0);

    this.dailyPool.avgConfidence = totalConfidence / this.dailyPool.signals.length;
    this.dailyPool.avgQuality = totalQuality / this.dailyPool.signals.length;
  }

  /**
   * Distribute signals to tiers based on ranking
   * Directly writes to user_signals table with tier-based access control
   */
  private async distributeToTiers(): Promise<void> {
    if (!this.dailyPool || this.dailyPool.signals.length < 2) {
      console.log(`⏳ [Pool] Insufficient signals for distribution (${this.dailyPool?.signals.length || 0}/2)`);
      return;
    }

    console.log(`\n🎯 [Pool] ===== DISTRIBUTING SIGNALS TO TIERS =====`);

    // Get tier-specific signals using our smart allocation logic
    const freeSignals = this.getSignalsForTier('FREE');
    const proSignals = this.getSignalsForTier('PRO');
    const maxSignals = this.getSignalsForTier('MAX');

    console.log(`📦 [Pool] Tier allocations:`);
    console.log(`  FREE: ${freeSignals.length} signals (top ${this.FREE_TIER_COUNT})`);
    console.log(`  PRO:  ${proSignals.length} signals (top ${this.PRO_TIER_COUNT})`);
    console.log(`  MAX:  ${maxSignals.length} signals (top ${this.MAX_TIER_COUNT})`);

    // Distribute to each tier
    const distributionResults = {
      free: 0,
      pro: 0,
      max: 0,
      errors: 0
    };

    // MAX TIER: Get all active MAX users and distribute top 30 signals
    if (maxSignals.length > 0) {
      const { count, error: maxError } = await this.distributeSignalsToTierUsers('MAX', maxSignals);
      if (maxError) {
        console.error(`❌ [Pool] Error distributing to MAX users:`, maxError);
        distributionResults.errors++;
      } else {
        distributionResults.max = count || 0;
        console.log(`✅ [Pool] Distributed ${maxSignals.length} signals to ${count} MAX users`);
      }
    }

    // PRO TIER: Get all active PRO users and distribute top 15 signals
    if (proSignals.length > 0) {
      const { count, error: proError } = await this.distributeSignalsToTierUsers('PRO', proSignals);
      if (proError) {
        console.error(`❌ [Pool] Error distributing to PRO users:`, proError);
        distributionResults.errors++;
      } else {
        distributionResults.pro = count || 0;
        console.log(`✅ [Pool] Distributed ${proSignals.length} signals to ${count} PRO users`);
      }
    }

    // FREE TIER: Get all active FREE users and distribute top 2 signals (scheduled only)
    if (freeSignals.length >= 2) {
      // FREE tier uses scheduled drops (9 AM, 6 PM UTC) - skip real-time distribution
      console.log(`⏰ [Pool] FREE tier uses scheduled drops - signals queued for next drop time`);
    }

    console.log(`✅ [Pool] Distribution complete!`);
    console.log(`   MAX: ${distributionResults.max} users | PRO: ${distributionResults.pro} users | FREE: scheduled`);
    console.log(`================================================\n`);
  }

  /**
   * Distribute signals to all users in a specific tier
   */
  private async distributeSignalsToTierUsers(
    tier: UserTier,
    signals: RankedSignal[]
  ): Promise<{ count: number | null; error: any }> {
    try {
      // Get all active users in this tier
      const { data: users, error: usersError } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('tier', tier)
        .in('status', ['active', 'trialing']);

      if (usersError) {
        return { count: null, error: usersError };
      }

      if (!users || users.length === 0) {
        console.log(`ℹ️ [Pool] No ${tier} users found`);
        return { count: 0, error: null };
      }

      // For each user, check quota and insert signals
      let distributed = 0;
      for (const user of users) {
        for (const signal of signals) {
          // Check if user has quota remaining
          const { data: canReceive } = await supabase.rpc('can_receive_signal', {
            p_user_id: user.user_id
          });

          if (!canReceive) {
            console.log(`⏭️ [Pool] ${tier} user quota exceeded, skipping`);
            continue;
          }

          // Check if signal already sent to this user
          const { data: existing } = await supabase
            .from('user_signals')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('signal_id', signal.id)
            .maybeSingle();

          if (existing) {
            console.log(`⏭️ [Pool] Signal ${signal.id} already sent to user`);
            continue;
          }

          // Determine if full details should be unlocked
          const fullDetails = tier === 'PRO' || tier === 'MAX';

          // Insert signal for this user
          const { error: insertError } = await supabase
            .from('user_signals')
            .insert({
              user_id: user.user_id,
              signal_id: signal.id,
              tier,
              symbol: signal.symbol,
              signal_type: signal.signal_type,
              confidence: signal.confidence,
              quality_score: signal.quality_score,
              entry_price: fullDetails ? signal.entry_price : null,
              take_profit: fullDetails ? signal.take_profit : null,
              stop_loss: fullDetails ? signal.stop_loss : null,
              expires_at: signal.expires_at,
              metadata: signal.metadata,
              full_details: fullDetails,
              viewed: false,
              clicked: false
            });

          if (insertError) {
            console.error(`❌ [Pool] Error inserting signal for user:`, insertError);
            continue;
          }

          // Increment user quota
          await supabase.rpc('increment_signal_quota', {
            p_user_id: user.user_id
          });

          distributed++;
        }
      }

      return { count: users.length, error: null };
    } catch (error) {
      console.error(`❌ [Pool] Error in distributeSignalsToTierUsers:`, error);
      return { count: null, error };
    }
  }

  /**
   * Get signals allocated to specific tier
   * FREE tier has dynamic quality fallback for reliability
   */
  getSignalsForTier(tier: UserTier): RankedSignal[] {
    if (!this.dailyPool) return [];

    switch (tier) {
      case 'MAX':
        // MAX gets top 30 signals (60+ quality from pool entry threshold)
        return this.dailyPool.signals.slice(0, this.MAX_TIER_COUNT);

      case 'PRO':
        // PRO gets top 15 signals (60+ quality from pool entry threshold)
        return this.dailyPool.signals.slice(0, this.PRO_TIER_COUNT);

      case 'FREE':
        // FREE tier: Try to get 2 signals at 75+ quality for trust building
        // But use dynamic fallback for reliability on slow days
        let freeSignals = this.dailyPool.signals
          .filter(s => s.quality_score >= 75)
          .slice(0, this.FREE_TIER_COUNT);

        // Fallback 1: Lower threshold to 70 if insufficient 75+ signals
        if (freeSignals.length < this.FREE_TIER_COUNT) {
          console.log(`⚠️ [Pool] FREE tier: Only ${freeSignals.length} signals at 75+, lowering threshold to 70`);
          freeSignals = this.dailyPool.signals
            .filter(s => s.quality_score >= 70)
            .slice(0, this.FREE_TIER_COUNT);
        }

        // Fallback 2: Use top signals regardless of quality (rare emergency)
        if (freeSignals.length < this.FREE_TIER_COUNT) {
          console.log(`⚠️ [Pool] FREE tier: Only ${freeSignals.length} signals at 70+, using top ${this.FREE_TIER_COUNT} regardless of quality`);
          freeSignals = this.dailyPool.signals.slice(0, this.FREE_TIER_COUNT);
        }

        return freeSignals;

      default:
        return [];
    }
  }

  /**
   * Get top N signals from pool
   */
  getTopSignals(count: number): RankedSignal[] {
    if (!this.dailyPool) return [];
    return this.dailyPool.signals.slice(0, count);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): DailySignalPool | null {
    return this.dailyPool;
  }

  /**
   * Get signal distribution breakdown
   */
  getDistributionBreakdown(): {
    totalSignals: number;
    freeCount: number;
    proCount: number;
    maxCount: number;
    freeSignals: RankedSignal[];
    proSignals: RankedSignal[];
    maxSignals: RankedSignal[];
    avgConfidence: number;
    avgQuality: number;
    topSignal: RankedSignal | null;
  } {
    if (!this.dailyPool || this.dailyPool.signals.length === 0) {
      return {
        totalSignals: 0,
        freeCount: 0,
        proCount: 0,
        maxCount: 0,
        freeSignals: [],
        proSignals: [],
        maxSignals: [],
        avgConfidence: 0,
        avgQuality: 0,
        topSignal: null,
      };
    }

    const freeSignals = this.getSignalsForTier('FREE');
    const proSignals = this.getSignalsForTier('PRO');
    const maxSignals = this.getSignalsForTier('MAX');

    return {
      totalSignals: this.dailyPool.totalSignals,
      freeCount: freeSignals.length,
      proCount: proSignals.length,
      maxCount: maxSignals.length,
      freeSignals,
      proSignals,
      maxSignals,
      avgConfidence: this.dailyPool.avgConfidence,
      avgQuality: this.dailyPool.avgQuality,
      topSignal: this.dailyPool.signals[0] || null,
    };
  }

  /**
   * Refresh pool - recalculate all scores and re-rank
   */
  private refreshPool(): void {
    if (!this.dailyPool) return;

    console.log(`🔄 [Pool] Refreshing pool (${this.dailyPool.signals.length} signals)`);

    // Recalculate composite scores (freshness changes over time)
    this.dailyPool.signals = this.dailyPool.signals.map(signal =>
      this.calculateCompositeScore(signal)
    );

    // Re-rank
    this.rankAllSignals();

    // Update stats
    this.updatePoolStats();

    console.log(`✅ [Pool] Pool refreshed - Top signal: ${this.dailyPool.signals[0]?.symbol || 'none'} (score: ${this.dailyPool.signals[0]?.compositeScore.toFixed(2) || 'N/A'})`);
  }

  /**
   * Clear pool (for testing/debugging)
   */
  clearPool(): void {
    this.initializePool();
    this.symbolCountCache.clear();
    this.strategyCountCache.clear();
    console.log('🗑️ [Pool] Pool cleared');
  }

  /**
   * Get scheduled drop times for FREE tier
   */
  getScheduledDropTimes(): { nextDrop: Date; timeUntilDrop: number } {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const dropHours = [9, 18]; // 9 AM and 6 PM UTC

    // Find next drop
    let nextDropHour = dropHours.find(h => h > currentHour);
    if (!nextDropHour) {
      // Next drop is tomorrow's first drop
      nextDropHour = dropHours[0];
    }

    const nextDrop = new Date(now);
    nextDrop.setUTCHours(nextDropHour, 0, 0, 0);

    // If next drop is tomorrow
    if (nextDropHour <= currentHour) {
      nextDrop.setUTCDate(nextDrop.getUTCDate() + 1);
    }

    const timeUntilDrop = nextDrop.getTime() - now.getTime();

    return {
      nextDrop,
      timeUntilDrop,
    };
  }

  /**
   * Get signal quality health metrics
   */
  getQualityHealthMetrics(): {
    total: number;
    quality75Plus: number;
    quality70Plus: number;
    quality65Plus: number;
    quality60Plus: number;
    freeHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    proHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    maxHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  } {
    if (!this.dailyPool) {
      return {
        total: 0,
        quality75Plus: 0,
        quality70Plus: 0,
        quality65Plus: 0,
        quality60Plus: 0,
        freeHealth: 'CRITICAL',
        proHealth: 'CRITICAL',
        maxHealth: 'CRITICAL',
      };
    }

    const quality75Plus = this.dailyPool.signals.filter(s => s.quality_score >= 75).length;
    const quality70Plus = this.dailyPool.signals.filter(s => s.quality_score >= 70).length;
    const quality65Plus = this.dailyPool.signals.filter(s => s.quality_score >= 65).length;
    const quality60Plus = this.dailyPool.signals.filter(s => s.quality_score >= 60).length;

    // Health assessment
    const freeHealth = quality75Plus >= 2 ? 'HEALTHY' : quality70Plus >= 2 ? 'WARNING' : 'CRITICAL';
    const proHealth = quality65Plus >= 15 ? 'HEALTHY' : quality65Plus >= 10 ? 'WARNING' : 'CRITICAL';
    const maxHealth = quality60Plus >= 30 ? 'HEALTHY' : quality60Plus >= 20 ? 'WARNING' : 'CRITICAL';

    return {
      total: this.dailyPool.totalSignals,
      quality75Plus,
      quality70Plus,
      quality65Plus,
      quality60Plus,
      freeHealth,
      proHealth,
      maxHealth,
    };
  }

  /**
   * Debug: Print pool summary with health metrics
   */
  printPoolSummary(): void {
    if (!this.dailyPool) {
      console.log('📊 [Pool] No pool data');
      return;
    }

    const health = this.getQualityHealthMetrics();

    console.log('\n📊 ===== SIGNAL POOL SUMMARY =====');
    console.log(`Date: ${this.dailyPool.date}`);
    console.log(`Total Signals: ${this.dailyPool.totalSignals}`);
    console.log(`Avg Confidence: ${this.dailyPool.avgConfidence.toFixed(2)}%`);
    console.log(`Avg Quality: ${this.dailyPool.avgQuality.toFixed(2)}%`);

    console.log(`\n📈 QUALITY DISTRIBUTION:`);
    console.log(`  75+ Quality: ${health.quality75Plus} signals ${health.quality75Plus >= 2 ? '✅' : '⚠️'}`);
    console.log(`  70+ Quality: ${health.quality70Plus} signals`);
    console.log(`  65+ Quality: ${health.quality65Plus} signals`);
    console.log(`  60+ Quality: ${health.quality60Plus} signals`);

    console.log(`\n🏆 TOP 5 SIGNALS:`);
    this.dailyPool.signals.slice(0, 5).forEach((signal, idx) => {
      console.log(`  ${idx + 1}. ${signal.symbol} ${signal.signal_type} | Composite: ${signal.compositeScore.toFixed(2)} | Conf: ${signal.confidence.toFixed(1)}% | Quality: ${signal.quality_score.toFixed(1)}%`);
    });

    console.log(`\n📦 TIER ALLOCATIONS & HEALTH:`);
    const freeSignals = this.getSignalsForTier('FREE');
    const proSignals = this.getSignalsForTier('PRO');
    const maxSignals = this.getSignalsForTier('MAX');

    const healthEmoji = (status: string) => status === 'HEALTHY' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';

    console.log(`  FREE (Top 2):  ${freeSignals.map(s => `${s.symbol}(${s.quality_score.toFixed(0)})`).join(', ')} ${healthEmoji(health.freeHealth)}`);
    console.log(`  PRO (Top 15):  ${proSignals.length} signals ${healthEmoji(health.proHealth)}`);
    console.log(`  MAX (Top 30):  ${maxSignals.length} signals ${healthEmoji(health.maxHealth)}`);

    console.log(`\n🎯 HEALTH STATUS:`);
    console.log(`  FREE Tier: ${health.freeHealth} ${healthEmoji(health.freeHealth)}`);
    console.log(`  PRO Tier:  ${health.proHealth} ${healthEmoji(health.proHealth)}`);
    console.log(`  MAX Tier:  ${health.maxHealth} ${healthEmoji(health.maxHealth)}`);

    console.log('=====================================\n');
  }
}

// Export singleton instance
export const smartSignalPool = SmartSignalPoolManager.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).smartSignalPool = smartSignalPool;
  (window as any).printPoolSummary = () => smartSignalPool.printPoolSummary();
}

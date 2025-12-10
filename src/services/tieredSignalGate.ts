/**
 * TIERED SIGNAL GATE SERVICE
 *
 * Manages signal distribution across FREE/PRO/MAX tiers with smart timing
 * and FOMO mechanics for monetization.
 *
 * TIER LOGIC (Trust-Building Flywheel):
 * - FREE: 2 signals/day at 9 AM, 6 PM UTC | Score 75+ (TOP 2 BEST) | Basic info | Trust building
 * - PRO: 12-15 signals/day | Score 65+ | Real-time | Full details | High quality
 * - MAX: 25-30 signals/day | Score 60+ | 10min early access | All features | High quality + volume
 */

import { supabase } from '@/integrations/supabase/client';

export type UserTier = 'FREE' | 'PRO' | 'MAX';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';

export interface TierConfig {
  tier: UserTier;
  maxSignalsPerDay: number;
  minQualityScore: number;
  dropSchedule: 'realtime' | 'scheduled';
  dropTimes?: number[]; // Hours in UTC for scheduled drops
  earlyAccessMinutes: number;
  fullDetails: boolean;
  tradingEnabled: boolean;
}

export interface UserSubscription {
  user_id: string;
  tier: UserTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
}

export interface SignalForDistribution {
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
  metadata: any;
}

export interface DistributionResult {
  distributed: boolean;
  reason?: string;
  tier: UserTier;
  signalsRemainingToday: number;
}

// Tier configurations
// SMART DISTRIBUTION: FREE gets TOP 2 best signals (trust building)
// PRO/MAX get higher quality thresholds for better signals
const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  FREE: {
    tier: 'FREE',
    maxSignalsPerDay: 2,
    minQualityScore: 75, // Cherry-picks TOP 2 from 75+ pool
    dropSchedule: 'scheduled',
    dropTimes: [9, 18], // 9 AM and 6 PM UTC
    earlyAccessMinutes: 0,
    fullDetails: false,
    tradingEnabled: false,
  },
  PRO: {
    tier: 'PRO',
    maxSignalsPerDay: 15,
    minQualityScore: 65, // Higher quality threshold (was 60)
    dropSchedule: 'realtime',
    earlyAccessMinutes: 0,
    fullDetails: true,
    tradingEnabled: true,
  },
  MAX: {
    tier: 'MAX',
    maxSignalsPerDay: 30,
    minQualityScore: 60, // Higher quality threshold (was 50) + more volume
    dropSchedule: 'realtime',
    earlyAccessMinutes: 10, // 10 minutes before PRO users
    fullDetails: true,
    tradingEnabled: true,
  },
};

class TieredSignalGateService {
  private static instance: TieredSignalGateService;
  private scheduledSignalQueue: Map<number, SignalForDistribution[]> = new Map();
  private distributedSignals: Set<string> = new Set(); // Track distributed signal IDs
  private userTierCache: Map<string, { tier: UserTier; cachedAt: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeScheduledDrops();
  }

  static getInstance(): TieredSignalGateService {
    if (!TieredSignalGateService.instance) {
      TieredSignalGateService.instance = new TieredSignalGateService();
    }
    return TieredSignalGateService.instance;
  }

  /**
   * Initialize scheduled signal drops for FREE tier (9 AM, 6 PM UTC)
   */
  private initializeScheduledDrops() {
    // Check every minute for scheduled drops
    setInterval(() => {
      this.processScheduledDrops();
    }, 60 * 1000);

    console.log('📅 Tiered Signal Gate: Scheduled drops initialized (9 AM, 6 PM UTC)');
  }

  /**
   * Main entry point: Distribute signal to appropriate tier users
   */
  async distributeSignal(signal: SignalForDistribution): Promise<void> {
    console.log(`🎯 [Tier Gate] Processing signal ${signal.symbol} ${signal.signal_type} | Score: ${signal.quality_score.toFixed(1)}`);

    // Determine which tiers can receive this signal
    const eligibleTiers = this.getEligibleTiers(signal);

    if (eligibleTiers.length === 0) {
      console.log(`⏭️ [Tier Gate] Signal quality ${signal.quality_score.toFixed(1)} too low for all tiers`);
      return;
    }

    // MAX tier gets early access
    if (eligibleTiers.includes('MAX')) {
      await this.distributeToTier(signal, 'MAX');
    }

    // PRO tier gets signal 10 minutes after MAX
    if (eligibleTiers.includes('PRO')) {
      setTimeout(() => {
        this.distributeToTier(signal, 'PRO');
      }, TIER_CONFIGS.MAX.earlyAccessMinutes * 60 * 1000);
    }

    // FREE tier: queue for scheduled drops
    if (eligibleTiers.includes('FREE')) {
      this.queueForScheduledDrop(signal);
    }
  }

  /**
   * Determine which tiers are eligible for this signal based on quality score
   */
  private getEligibleTiers(signal: SignalForDistribution): UserTier[] {
    const tiers: UserTier[] = [];

    if (signal.quality_score >= TIER_CONFIGS.FREE.minQualityScore) {
      tiers.push('FREE');
    }
    if (signal.quality_score >= TIER_CONFIGS.PRO.minQualityScore) {
      tiers.push('PRO');
    }
    if (signal.quality_score >= TIER_CONFIGS.MAX.minQualityScore) {
      tiers.push('MAX');
    }

    return tiers;
  }

  /**
   * Distribute signal to all users in a specific tier
   */
  private async distributeToTier(signal: SignalForDistribution, tier: UserTier): Promise<void> {
    try {
      // Get all active users in this tier
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('tier', tier)
        .in('status', ['active', 'trialing']);

      if (error) {
        console.error(`❌ [Tier Gate] Error fetching ${tier} users:`, error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`ℹ️ [Tier Gate] No ${tier} users found`);
        return;
      }

      console.log(`📤 [Tier Gate] Distributing to ${subscriptions.length} ${tier} users`);

      // Distribute to each user
      let distributed = 0;
      for (const sub of subscriptions) {
        const result = await this.distributeToUser(signal, sub.user_id, tier);
        if (result.distributed) {
          distributed++;
        }
      }

      console.log(`✅ [Tier Gate] Distributed ${signal.symbol} to ${distributed}/${subscriptions.length} ${tier} users`);
    } catch (error) {
      console.error(`❌ [Tier Gate] Error distributing to ${tier}:`, error);
    }
  }

  /**
   * Distribute signal to individual user with quota checking
   */
  private async distributeToUser(
    signal: SignalForDistribution,
    userId: string,
    tier: UserTier
  ): Promise<DistributionResult> {
    try {
      // Check quota
      const canReceive = await this.checkUserQuota(userId, tier);

      if (!canReceive.canReceive) {
        return {
          distributed: false,
          reason: canReceive.reason,
          tier,
          signalsRemainingToday: canReceive.remaining,
        };
      }

      // Prepare signal data based on tier features
      const signalData = this.prepareSignalForTier(signal, tier);

      // Insert user-specific signal record
      const { error } = await supabase.from('user_signals').insert({
        user_id: userId,
        signal_id: signal.id,
        tier,
        ...signalData,
      });

      if (error) {
        console.error(`❌ Error inserting signal for user ${userId}:`, error);
        return {
          distributed: false,
          reason: 'Database error',
          tier,
          signalsRemainingToday: canReceive.remaining,
        };
      }

      // Increment quota
      await this.incrementQuota(userId);

      return {
        distributed: true,
        tier,
        signalsRemainingToday: canReceive.remaining - 1,
      };
    } catch (error) {
      console.error(`❌ Error distributing to user ${userId}:`, error);
      return {
        distributed: false,
        reason: 'Unexpected error',
        tier,
        signalsRemainingToday: 0,
      };
    }
  }

  /**
   * Check if user has quota remaining for today
   */
  private async checkUserQuota(
    userId: string,
    tier: UserTier
  ): Promise<{ canReceive: boolean; remaining: number; reason?: string }> {
    try {
      const { data, error } = await supabase.rpc('can_receive_signal', { p_user_id: userId });

      if (error) {
        console.error('Error checking quota:', error);
        return { canReceive: false, remaining: 0, reason: 'Quota check failed' };
      }

      if (!data) {
        return { canReceive: false, remaining: 0, reason: 'Daily limit reached' };
      }

      // Get remaining count
      const limit = TIER_CONFIGS[tier].maxSignalsPerDay;
      const { data: quotaData } = await supabase
        .from('user_signal_quotas')
        .select('signals_received')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      const received = quotaData?.signals_received || 0;
      const remaining = limit - received;

      return { canReceive: true, remaining };
    } catch (error) {
      console.error('Error in checkUserQuota:', error);
      return { canReceive: false, remaining: 0, reason: 'Error' };
    }
  }

  /**
   * Increment user's signal quota for today
   */
  private async incrementQuota(userId: string): Promise<void> {
    try {
      await supabase.rpc('increment_signal_quota', { p_user_id: userId });
    } catch (error) {
      console.error('Error incrementing quota:', error);
    }
  }

  /**
   * Prepare signal data based on tier features
   */
  private prepareSignalForTier(signal: SignalForDistribution, tier: UserTier): any {
    const config = TIER_CONFIGS[tier];

    if (config.fullDetails) {
      // PRO and MAX get full signal details
      return {
        symbol: signal.symbol,
        signal_type: signal.signal_type,
        confidence: signal.confidence,
        quality_score: signal.quality_score,
        entry_price: signal.entry_price,
        take_profit: signal.take_profit,
        stop_loss: signal.stop_loss,
        expires_at: signal.expires_at,
        metadata: signal.metadata,
        full_details: true,
      };
    } else {
      // FREE gets limited details (FOMO mode)
      return {
        symbol: signal.symbol,
        signal_type: signal.signal_type,
        confidence: signal.confidence,
        quality_score: signal.quality_score,
        entry_price: null, // Hidden
        take_profit: null, // Hidden
        stop_loss: null, // Hidden
        expires_at: signal.expires_at,
        metadata: { locked: true, upgrade_required: true },
        full_details: false,
      };
    }
  }

  /**
   * Queue signal for scheduled drop (FREE tier)
   */
  private queueForScheduledDrop(signal: SignalForDistribution): void {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const dropTimes = TIER_CONFIGS.FREE.dropTimes!;

    // Find next drop time
    let nextDrop = dropTimes.find((hour) => hour > currentHour);
    if (!nextDrop) {
      nextDrop = dropTimes[0]; // Next day's first drop
    }

    if (!this.scheduledSignalQueue.has(nextDrop)) {
      this.scheduledSignalQueue.set(nextDrop, []);
    }

    this.scheduledSignalQueue.get(nextDrop)!.push(signal);
    console.log(`📅 [Tier Gate] Queued ${signal.symbol} for ${nextDrop}:00 UTC drop`);
  }

  /**
   * Process scheduled drops (runs every minute)
   */
  private async processScheduledDrops(): Promise<void> {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Only process at drop times (exact hour)
    if (currentMinute !== 0) return;

    const dropTimes = TIER_CONFIGS.FREE.dropTimes!;
    if (!dropTimes.includes(currentHour)) return;

    const queuedSignals = this.scheduledSignalQueue.get(currentHour) || [];

    if (queuedSignals.length === 0) {
      console.log(`📅 [Tier Gate] No signals queued for ${currentHour}:00 UTC drop`);
      return;
    }

    console.log(`📅 [Tier Gate] Processing scheduled drop at ${currentHour}:00 UTC (${queuedSignals.length} signals)`);

    // Select top 2 signals by quality score
    const topSignals = queuedSignals
      .sort((a, b) => b.quality_score - a.quality_score)
      .slice(0, 2);

    // Distribute top signals to FREE users
    for (const signal of topSignals) {
      await this.distributeToTier(signal, 'FREE');
    }

    // Clear queue
    this.scheduledSignalQueue.delete(currentHour);
  }

  /**
   * Get user's tier (with caching)
   */
  async getUserTier(userId: string): Promise<UserTier> {
    // Check cache
    const cached = this.userTierCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_DURATION) {
      return cached.tier;
    }

    // Fetch from database
    try {
      const { data, error } = await supabase.rpc('get_user_tier', { p_user_id: userId });

      if (error || !data) {
        console.error('Error fetching user tier:', error);
        return 'FREE';
      }

      const tier = data as UserTier;
      this.userTierCache.set(userId, { tier, cachedAt: Date.now() });
      return tier;
    } catch (error) {
      console.error('Error in getUserTier:', error);
      return 'FREE';
    }
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: UserTier): TierConfig {
    return TIER_CONFIGS[tier];
  }

  /**
   * Get user's remaining signals for today
   */
  async getUserQuotaStatus(userId: string): Promise<{
    tier: UserTier;
    limit: number;
    used: number;
    remaining: number;
  }> {
    try {
      const tier = await this.getUserTier(userId);
      const limit = TIER_CONFIGS[tier].maxSignalsPerDay;

      const { data } = await supabase
        .from('user_signal_quotas')
        .select('signals_received')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      const used = data?.signals_received || 0;
      const remaining = Math.max(0, limit - used);

      return { tier, limit, used, remaining };
    } catch (error) {
      console.error('Error getting quota status:', error);
      return { tier: 'FREE', limit: 2, used: 0, remaining: 2 };
    }
  }
}

// Export singleton instance
export const tieredSignalGate = TieredSignalGateService.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).tieredSignalGate = tieredSignalGate;
}

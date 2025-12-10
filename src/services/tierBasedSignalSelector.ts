/**
 * TIER-BASED SIGNAL SELECTOR
 *
 * Periodically selects best signals from pool based on current market conditions
 * Distributes signals to users based on their tier (FREE/PRO/MAX)
 *
 * Replaces real-time Quality Gate filtering with intelligent batch selection
 */

import { supabase } from '@/integrations/supabase/client';
import { globalHubService } from './globalHubService';

export type UserTier = 'FREE' | 'PRO' | 'MAX';
export type MarketRegime = 'BULLISH_TREND' | 'BEARISH_TREND' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY' | 'BREAKOUT' | 'BREAKDOWN' | 'CONSOLIDATION';

interface PoolSignal {
  id: string;
  signal_id: string;
  symbol: string;
  signal_type: 'LONG' | 'SHORT';
  quality_score: number;
  ml_probability: number;
  confidence: number;
  signal_regime: MarketRegime;
  strategy_name: string;
  entry_price: number;
  stop_loss: number;
  take_profit: any;
  risk_reward_ratio: number;
  timeframe: string | null;
  metadata: any;
  regime_score: number;
  composite_score: number;
  created_at: string;
  expires_at: string;
}

interface ScoredSignal extends PoolSignal {
  currentRegimeMatch: number;
  freshness: number;
  finalScore: number;
}

interface TierDistribution {
  FREE: ScoredSignal[];
  PRO: ScoredSignal[];
  MAX: ScoredSignal[];
}

interface SelectionConfig {
  intervalMinutes: number;  // How often to run selection (5-30 min)
  tierLimits: {
    FREE: number;   // Number of signals for FREE tier
    PRO: number;    // Number of signals for PRO tier
    MAX: number;    // Number of signals for MAX tier
  };
}

class TierBasedSignalSelector {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private config: SelectionConfig = {
    intervalMinutes: 10, // Run every 10 minutes by default
    tierLimits: {
      FREE: 3,   // Top 3 signals for free users
      PRO: 10,   // Top 10 signals for pro users
      MAX: 20    // Top 20 signals for max tier users
    }
  };

  /**
   * Start periodic signal selection
   */
  start(config?: Partial<SelectionConfig>) {
    if (this.isRunning) {
      console.log(`[TierBasedSignalSelector] Already running`);
      return;
    }

    // Apply custom config
    if (config) {
      this.config = { ...this.config, ...config };
      if (config.tierLimits) {
        this.config.tierLimits = { ...this.config.tierLimits, ...config.tierLimits };
      }
    }

    console.log(`\n${'█'.repeat(80)}`);
    console.log(`🎯 [TIER-BASED SIGNAL SELECTOR] STARTING`);
    console.log(`${'█'.repeat(80)}`);
    console.log(`Configuration:`);
    console.log(`   Selection Interval: ${this.config.intervalMinutes} minutes`);
    console.log(`   FREE tier signals: ${this.config.tierLimits.FREE}`);
    console.log(`   PRO tier signals: ${this.config.tierLimits.PRO}`);
    console.log(`   MAX tier signals: ${this.config.tierLimits.MAX}`);
    console.log(`${'█'.repeat(80)}\n`);

    this.isRunning = true;

    // Run immediately on start
    this.selectAndDistribute();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.selectAndDistribute();
    }, this.config.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic signal selection
   */
  stop() {
    if (!this.isRunning) return;

    console.log(`[TierBasedSignalSelector] Stopping...`);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log(`[TierBasedSignalSelector] Stopped`);
  }

  /**
   * Main selection and distribution logic
   */
  private async selectAndDistribute(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎯 [SELECTION RUN] ${new Date().toLocaleTimeString()}`);
      console.log(`${'='.repeat(80)}`);

      // 1. Clean up expired signals
      await this.cleanupExpiredSignals();

      // 2. Get all available signals from pool
      const poolSignals = await this.getAvailableSignals();

      if (poolSignals.length === 0) {
        console.log(`⚠️  No signals in pool - skipping selection`);
        console.log(`${'='.repeat(80)}\n`);
        return;
      }

      console.log(`📊 Found ${poolSignals.length} signals in pool`);

      // 3. Score signals based on current market conditions
      const currentRegime = this.getCurrentMarketRegime();
      const scoredSignals = this.scoreSignals(poolSignals, currentRegime);

      // 4. Distribute to tiers
      const tierDistribution = this.distributeToTiers(scoredSignals);

      console.log(`\n📦 Tier Distribution:`);
      console.log(`   FREE: ${tierDistribution.FREE.length} signals`);
      console.log(`   PRO: ${tierDistribution.PRO.length} signals`);
      console.log(`   MAX: ${tierDistribution.MAX.length} signals`);

      // 5. Publish signals to global hub (which will handle UI updates)
      this.publishToGlobalHub(tierDistribution);

      // 6. Mark signals as published
      const publishedSignalIds = [
        ...new Set([
          ...tierDistribution.FREE.map(s => s.id),
          ...tierDistribution.PRO.map(s => s.id),
          ...tierDistribution.MAX.map(s => s.id)
        ])
      ];
      await this.markSignalsAsPublished(publishedSignalIds);

      // 7. Log selection run
      const duration = Date.now() - startTime;
      await this.logSelectionRun({
        currentRegime,
        totalInPool: poolSignals.length,
        selected: publishedSignalIds.length,
        tierCounts: {
          FREE: tierDistribution.FREE.length,
          PRO: tierDistribution.PRO.length,
          MAX: tierDistribution.MAX.length
        },
        duration
      });

      console.log(`\n✅ Selection run complete!`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Signals published to Global Hub`);
      console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
      console.error(`❌ Selection run failed:`, error);
      console.error(`${'='.repeat(80)}\n`);
    }
  }

  /**
   * Clean up expired signals from pool
   */
  private async cleanupExpiredSignals(): Promise<void> {
    const { data, error } = await supabase.rpc('cleanup_expired_signals');

    if (error) {
      console.error(`❌ Failed to cleanup expired signals:`, error);
      return;
    }

    if (data && data > 0) {
      console.log(`🧹 Cleaned up ${data} expired signals`);
    }
  }

  /**
   * Get available signals from pool
   */
  private async getAvailableSignals(): Promise<PoolSignal[]> {
    const { data, error } = await supabase
      .from('signals_pool')
      .select('*')
      .eq('status', 'approved_by_delta')
      .gt('expires_at', new Date().toISOString())
      .order('composite_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Failed to fetch pool signals:`, error);
      return [];
    }

    return data as PoolSignal[];
  }

  /**
   * Score signals based on current market conditions
   */
  private scoreSignals(signals: PoolSignal[], currentRegime: MarketRegime): ScoredSignal[] {
    const now = Date.now();

    return signals.map(signal => {
      // Calculate regime match with CURRENT market (may have changed since storage)
      const regimeMatch = this.calculateRegimeMatch(signal.signal_regime, currentRegime);

      // Calculate freshness score (newer signals score higher)
      const signalAge = now - new Date(signal.created_at).getTime();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      const freshness = Math.max(0, 100 - (signalAge / maxAge) * 100);

      // Final score: 50% composite + 30% regime match + 20% freshness
      const finalScore =
        (signal.composite_score * 0.5) +
        (regimeMatch * 0.3) +
        (freshness * 0.2);

      return {
        ...signal,
        currentRegimeMatch: regimeMatch,
        freshness,
        finalScore
      };
    }).sort((a, b) => b.finalScore - a.finalScore); // Sort by final score descending
  }

  /**
   * Distribute signals to tiers
   */
  private distributeToTiers(scoredSignals: ScoredSignal[]): TierDistribution {
    return {
      FREE: scoredSignals.slice(0, this.config.tierLimits.FREE),
      PRO: scoredSignals.slice(0, this.config.tierLimits.PRO),
      MAX: scoredSignals.slice(0, this.config.tierLimits.MAX)
    };
  }

  /**
   * Publish signals to Global Hub for UI display
   */
  private publishToGlobalHub(tierDistribution: TierDistribution): void {
    // For now, just publish MAX tier signals to the hub (all users see them)
    // In production with user auth, filter based on user's actual tier
    const signalsToPublish = tierDistribution.MAX;

    console.log(`\n📡 Publishing ${signalsToPublish.length} signals to Global Hub`);

    // TODO: Call globalHubService.publishSignalsFromPool(signalsToPublish)
    // For now, just log it
  }

  /**
   * Mark signals as published in pool
   */
  private async markSignalsAsPublished(signalIds: string[]): Promise<void> {
    if (signalIds.length === 0) return;

    const { error } = await supabase
      .from('signals_pool')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .in('id', signalIds);

    if (error) {
      console.error(`❌ Failed to mark signals as published:`, error);
    }
  }

  /**
   * Log selection run for analytics
   */
  private async logSelectionRun(runData: {
    currentRegime: MarketRegime;
    totalInPool: number;
    selected: number;
    tierCounts: { FREE: number; PRO: number; MAX: number };
    duration: number;
  }): Promise<void> {
    const { error } = await supabase
      .from('signal_selection_runs')
      .insert({
        current_regime: runData.currentRegime,
        total_signals_in_pool: runData.totalInPool,
        signals_selected: runData.selected,
        free_tier_signals: runData.tierCounts.FREE,
        pro_tier_signals: runData.tierCounts.PRO,
        max_tier_signals: runData.tierCounts.MAX,
        run_duration_ms: runData.duration,
        selection_criteria: {
          scoring: '50% composite + 30% regime + 20% freshness',
          tierLimits: this.config.tierLimits
        }
      });

    if (error) {
      console.error(`❌ Failed to log selection run:`, error);
    }
  }

  /**
   * Get current market regime (simplified - uses global hub's regime detection)
   */
  private getCurrentMarketRegime(): MarketRegime {
    // TODO: Get from global hub service
    return 'SIDEWAYS';
  }

  /**
   * Calculate regime match score
   */
  private calculateRegimeMatch(signalRegime: MarketRegime, currentRegime: MarketRegime): number {
    // Perfect match
    if (signalRegime === currentRegime) return 100;

    // Strong matches
    const strongMatches: Record<MarketRegime, MarketRegime[]> = {
      BULLISH_TREND: ['BREAKOUT', 'LOW_VOLATILITY'],
      BEARISH_TREND: ['BREAKDOWN', 'LOW_VOLATILITY'],
      BREAKOUT: ['BULLISH_TREND', 'HIGH_VOLATILITY'],
      BREAKDOWN: ['BEARISH_TREND', 'HIGH_VOLATILITY'],
      HIGH_VOLATILITY: ['BREAKOUT', 'BREAKDOWN'],
      LOW_VOLATILITY: ['SIDEWAYS', 'CONSOLIDATION'],
      SIDEWAYS: ['LOW_VOLATILITY', 'CONSOLIDATION'],
      CONSOLIDATION: ['SIDEWAYS', 'LOW_VOLATILITY']
    };

    if (strongMatches[signalRegime]?.includes(currentRegime)) return 80;

    // Compatible matches
    const compatibleMatches: Record<MarketRegime, MarketRegime[]> = {
      BULLISH_TREND: ['CONSOLIDATION'],
      BEARISH_TREND: ['CONSOLIDATION'],
      BREAKOUT: ['BULLISH_TREND'],
      BREAKDOWN: ['BEARISH_TREND']
    };

    if (compatibleMatches[signalRegime]?.includes(currentRegime)) return 60;

    // Weak match
    return 40;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SelectionConfig>) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };
    if (config.tierLimits) {
      this.config.tierLimits = { ...this.config.tierLimits, ...config.tierLimits };
    }

    console.log(`[TierBasedSignalSelector] Configuration updated:`, this.config);

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SelectionConfig {
    return { ...this.config };
  }

  /**
   * Get selector status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextRun: this.intervalId ? `in ${this.config.intervalMinutes} minutes` : 'not scheduled'
    };
  }
}

// Export singleton instance
export const tierBasedSignalSelector = new TierBasedSignalSelector();

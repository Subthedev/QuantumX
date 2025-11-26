/**
 * QX BALANCE SERVICE
 *
 * Manages QX token balances, transactions, streaks, and leaderboards
 * for the QuantumX Oracle Challenge prediction market.
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface QXBalance {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  maxStreak: number;
  accuracyPercent: number;
  rank: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QXTransaction {
  id: string;
  userId: string;
  type: 'PREDICTION_WIN' | 'EARLY_BIRD_BONUS' | 'STREAK_BONUS' | 'REFERRAL_BONUS' | 'DAILY_BONUS' | 'ACHIEVEMENT' | 'ADMIN_GRANT' | 'ADMIN_DEDUCT';
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  referenceType: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface QXLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  balance: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracyPercent: number;
  currentStreak: number;
  maxStreak: number;
}

export interface QXPhaseConfig {
  phase: number;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  dailyPool: number;
  bonusMultiplier: number;
  isActive: boolean;
}

// Streak multiplier tiers
const STREAK_MULTIPLIERS: { minStreak: number; multiplier: number; title: string }[] = [
  { minStreak: 10, multiplier: 5.0, title: 'LEGEND' },
  { minStreak: 7, multiplier: 3.0, title: 'ORACLE' },
  { minStreak: 5, multiplier: 2.0, title: 'MASTER' },
  { minStreak: 3, multiplier: 1.5, title: 'HOT' },
  { minStreak: 2, multiplier: 1.2, title: 'WARMING UP' },
  { minStreak: 0, multiplier: 1.0, title: '' },
];

// Early bird bonus percentages
const EARLY_BIRD_TIERS = [
  { maxRank: 10, bonus: 0.50 },   // First 10: +50%
  { maxRank: 50, bonus: 0.30 },   // 11-50: +30%
  { maxRank: 100, bonus: 0.20 },  // 51-100: +20%
];

// =====================================================
// SERVICE CLASS
// =====================================================

class QXBalanceService {
  private cache = new Map<string, { data: QXBalance; timestamp: number }>();
  private CACHE_TTL = 30000; // 30 seconds

  /**
   * Get or create a user's QX balance
   */
  async getBalance(userId: string): Promise<QXBalance | null> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Try to get existing balance
      const { data, error } = await supabase
        .from('qx_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[QX Balance] Error fetching balance:', error);
        return null;
      }

      if (data) {
        const balance = this.mapDbToBalance(data);
        this.cache.set(userId, { data: balance, timestamp: Date.now() });
        return balance;
      }

      // Create new balance record if doesn't exist
      const newBalance = await this.createBalance(userId);
      if (newBalance) {
        this.cache.set(userId, { data: newBalance, timestamp: Date.now() });
      }
      return newBalance;
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return null;
    }
  }

  /**
   * Create a new balance record for a user
   */
  async createBalance(userId: string): Promise<QXBalance | null> {
    try {
      const { data, error } = await supabase
        .from('qx_balances')
        .insert({
          user_id: userId,
          balance: 0,
          total_earned: 0,
          total_predictions: 0,
          correct_predictions: 0,
          current_streak: 0,
          max_streak: 0,
          accuracy_percent: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[QX Balance] Error creating balance:', error);
        return null;
      }

      return this.mapDbToBalance(data);
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return null;
    }
  }

  /**
   * Get leaderboard with rankings
   */
  async getLeaderboard(limit: number = 100, offset: number = 0): Promise<QXLeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('qx_balances')
        .select(`
          user_id,
          balance,
          total_predictions,
          correct_predictions,
          accuracy_percent,
          current_streak,
          max_streak
        `)
        .order('balance', { ascending: false })
        .order('correct_predictions', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[QX Balance] Error fetching leaderboard:', error);
        return [];
      }

      // Fetch usernames from auth or profiles
      const entries: QXLeaderboardEntry[] = await Promise.all(
        (data || []).map(async (row, index) => {
          // Try to get username from user_profiles
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('id', row.user_id)
            .single();

          return {
            rank: offset + index + 1,
            userId: row.user_id,
            username: profile?.username || `User ${(row.user_id as string).slice(0, 8)}`,
            balance: row.balance || 0,
            totalPredictions: row.total_predictions || 0,
            correctPredictions: row.correct_predictions || 0,
            accuracyPercent: row.accuracy_percent || 0,
            currentStreak: row.current_streak || 0,
            maxStreak: row.max_streak || 0,
          };
        })
      );

      return entries;
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return [];
    }
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(userId: string): Promise<number | null> {
    try {
      const balance = await this.getBalance(userId);
      if (!balance) return null;

      // Count users with higher balance
      const { count, error } = await supabase
        .from('qx_balances')
        .select('*', { count: 'exact', head: true })
        .gt('balance', balance.balance);

      if (error) {
        console.error('[QX Balance] Error getting rank:', error);
        return null;
      }

      return (count || 0) + 1;
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return null;
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactions(userId: string, limit: number = 50): Promise<QXTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('qx_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[QX Balance] Error fetching transactions:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        amount: row.amount,
        balanceAfter: row.balance_after,
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        description: row.description,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return [];
    }
  }

  /**
   * Get current phase configuration
   */
  async getCurrentPhase(): Promise<QXPhaseConfig | null> {
    try {
      const { data, error } = await supabase
        .from('qx_phase_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('[QX Balance] Error fetching phase:', error);
        return null;
      }

      return {
        phase: data.phase,
        name: data.name,
        description: data.description,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        dailyPool: data.daily_pool,
        bonusMultiplier: data.bonus_multiplier,
        isActive: data.is_active,
      };
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return null;
    }
  }

  /**
   * Calculate streak multiplier for a given streak count
   */
  getStreakMultiplier(streak: number): { multiplier: number; title: string } {
    for (const tier of STREAK_MULTIPLIERS) {
      if (streak >= tier.minStreak) {
        return { multiplier: tier.multiplier, title: tier.title };
      }
    }
    return { multiplier: 1.0, title: '' };
  }

  /**
   * Calculate early bird bonus for a given rank
   */
  getEarlyBirdBonus(rank: number, baseReward: number): number {
    for (const tier of EARLY_BIRD_TIERS) {
      if (rank <= tier.maxRank) {
        return Math.floor(baseReward * tier.bonus);
      }
    }
    return 0;
  }

  /**
   * Calculate total reward including multipliers
   */
  calculateTotalReward(
    baseReward: number,
    streak: number,
    earlyBirdRank: number | null,
    phaseMultiplier: number = 1.0
  ): {
    baseReward: number;
    streakMultiplier: number;
    streakTitle: string;
    streakBonus: number;
    earlyBirdBonus: number;
    phaseBonus: number;
    totalReward: number;
  } {
    const { multiplier: streakMultiplier, title: streakTitle } = this.getStreakMultiplier(streak);
    const streakBonus = Math.floor(baseReward * (streakMultiplier - 1));
    const earlyBirdBonus = earlyBirdRank ? this.getEarlyBirdBonus(earlyBirdRank, baseReward) : 0;
    const subtotal = baseReward + streakBonus + earlyBirdBonus;
    const phaseBonus = Math.floor(subtotal * (phaseMultiplier - 1));
    const totalReward = subtotal + phaseBonus;

    return {
      baseReward,
      streakMultiplier,
      streakTitle,
      streakBonus,
      earlyBirdBonus,
      phaseBonus,
      totalReward,
    };
  }

  /**
   * Get global stats for the prediction market
   */
  async getGlobalStats(): Promise<{
    totalUsers: number;
    totalQXDistributed: number;
    totalPredictions: number;
    avgAccuracy: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('qx_balances')
        .select('balance, total_predictions, accuracy_percent');

      if (error) {
        console.error('[QX Balance] Error fetching global stats:', error);
        return { totalUsers: 0, totalQXDistributed: 0, totalPredictions: 0, avgAccuracy: 0 };
      }

      const rows = data || [];
      const totalUsers = rows.length;
      const totalQXDistributed = rows.reduce((sum, r) => sum + (r.balance || 0), 0);
      const totalPredictions = rows.reduce((sum, r) => sum + (r.total_predictions || 0), 0);
      const avgAccuracy = totalUsers > 0
        ? rows.reduce((sum, r) => sum + (r.accuracy_percent || 0), 0) / totalUsers
        : 0;

      return { totalUsers, totalQXDistributed, totalPredictions, avgAccuracy };
    } catch (err) {
      console.error('[QX Balance] Error:', err);
      return { totalUsers: 0, totalQXDistributed: 0, totalPredictions: 0, avgAccuracy: 0 };
    }
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    this.cache.delete(userId);
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private mapDbToBalance(row: any): QXBalance {
    return {
      id: row.id,
      userId: row.user_id,
      balance: row.balance || 0,
      totalEarned: row.total_earned || 0,
      totalPredictions: row.total_predictions || 0,
      correctPredictions: row.correct_predictions || 0,
      currentStreak: row.current_streak || 0,
      maxStreak: row.max_streak || 0,
      accuracyPercent: row.accuracy_percent || 0,
      rank: row.rank,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const qxBalanceService = new QXBalanceService();
export default qxBalanceService;

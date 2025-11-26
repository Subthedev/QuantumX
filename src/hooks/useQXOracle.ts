/**
 * USE QX ORACLE HOOK
 *
 * React hook for the QuantumX Oracle Challenge prediction market.
 * Provides real-time data, predictions, and user stats.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { qxBalanceService, type QXBalance, type QXLeaderboardEntry } from '@/services/qxBalanceService';
import { qxQuestionService, type QXQuestion } from '@/services/qxQuestionService';
import { qxPredictionService, type QXPrediction, type UserPredictionStats } from '@/services/qxPredictionService';

// =====================================================
// TYPES
// =====================================================

export interface QXOracleState {
  // User data
  balance: QXBalance | null;
  userStats: UserPredictionStats | null;
  userRank: number | null;
  userPredictions: QXPrediction[];

  // Questions
  activeQuestions: QXQuestion[];
  upcomingQuestions: QXQuestion[];
  resolvedQuestions: QXQuestion[];
  todaysQuestions: QXQuestion[];

  // Leaderboard
  leaderboard: QXLeaderboardEntry[];

  // Global stats
  globalStats: {
    totalUsers: number;
    totalQXDistributed: number;
    totalPredictions: number;
    avgAccuracy: number;
  };

  // Timing
  currentSlot: { slot: number; name: string; opensAt: Date; closesAt: Date };
  nextSlot: { slot: number; name: string; opensAt: Date };
  countdown: { hours: number; minutes: number; seconds: number };

  // Phase info
  phase: {
    name: string;
    endsAt: string | null;
    dailyPool: number;
    daysRemaining: number;
  } | null;

  // Loading states
  loading: boolean;
  error: string | null;
}

export interface QXOracleActions {
  makePrediction: (questionId: string, optionId: string) => Promise<{
    success: boolean;
    error?: string;
    isEarlyBird?: boolean;
    potentialReward?: number;
  }>;
  refreshBalance: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  getUserPrediction: (questionId: string) => QXPrediction | undefined;
}

// =====================================================
// HOOK IMPLEMENTATION
// =====================================================

export function useQXOracle(): QXOracleState & QXOracleActions {
  const { user } = useAuth();

  // State
  const [balance, setBalance] = useState<QXBalance | null>(null);
  const [userStats, setUserStats] = useState<UserPredictionStats | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPredictions, setUserPredictions] = useState<QXPrediction[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<QXQuestion[]>([]);
  const [upcomingQuestions, setUpcomingQuestions] = useState<QXQuestion[]>([]);
  const [resolvedQuestions, setResolvedQuestions] = useState<QXQuestion[]>([]);
  const [todaysQuestions, setTodaysQuestions] = useState<QXQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<QXLeaderboardEntry[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    totalQXDistributed: 0,
    totalPredictions: 0,
    avgAccuracy: 0,
  });
  const [phase, setPhase] = useState<QXOracleState['phase']>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current and next slot (memoized to prevent unnecessary recalculations)
  const currentSlot = useMemo(() => qxQuestionService.getCurrentSlot(), []);
  const nextSlot = useMemo(() => qxQuestionService.getNextSlot(), []);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const refreshBalance = useCallback(async () => {
    if (!user?.id) {
      setBalance(null);
      setUserStats(null);
      setUserRank(null);
      return;
    }

    try {
      const [balanceData, statsData, rankData] = await Promise.all([
        qxBalanceService.getBalance(user.id),
        qxPredictionService.getUserStats(user.id),
        qxBalanceService.getUserRank(user.id),
      ]);

      setBalance(balanceData);
      setUserStats(statsData);
      setUserRank(rankData);
    } catch (err) {
      console.error('[QX Oracle] Error refreshing balance:', err);
    }
  }, [user?.id]);

  const refreshQuestions = useCallback(async () => {
    try {
      const [active, upcoming, resolved, todays] = await Promise.all([
        qxQuestionService.getActiveQuestions(),
        qxQuestionService.getUpcomingQuestions(5),
        qxQuestionService.getResolvedQuestions(10),
        qxQuestionService.getTodaysQuestions(),
      ]);

      setActiveQuestions(active);
      setUpcomingQuestions(upcoming);
      setResolvedQuestions(resolved);
      setTodaysQuestions(todays);
    } catch (err) {
      console.error('[QX Oracle] Error refreshing questions:', err);
    }
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    try {
      const data = await qxBalanceService.getLeaderboard(50);
      setLeaderboard(data);
    } catch (err) {
      console.error('[QX Oracle] Error refreshing leaderboard:', err);
    }
  }, []);

  const refreshUserPredictions = useCallback(async () => {
    if (!user?.id) {
      setUserPredictions([]);
      return;
    }

    try {
      const predictions = await qxPredictionService.getUserPredictions(user.id, {
        limit: 50,
        includeQuestions: true,
      });
      setUserPredictions(predictions);
    } catch (err) {
      console.error('[QX Oracle] Error refreshing predictions:', err);
    }
  }, [user?.id]);

  const refreshGlobalStats = useCallback(async () => {
    try {
      const stats = await qxBalanceService.getGlobalStats();
      setGlobalStats(stats);
    } catch (err) {
      console.error('[QX Oracle] Error refreshing global stats:', err);
    }
  }, []);

  const refreshPhase = useCallback(async () => {
    try {
      const phaseData = await qxBalanceService.getCurrentPhase();
      if (phaseData) {
        const endsAt = phaseData.endsAt ? new Date(phaseData.endsAt) : null;
        const daysRemaining = endsAt
          ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        setPhase({
          name: phaseData.name,
          endsAt: phaseData.endsAt,
          dailyPool: phaseData.dailyPool,
          daysRemaining,
        });
      }
    } catch (err) {
      console.error('[QX Oracle] Error refreshing phase:', err);
    }
  }, []);

  // =====================================================
  // ACTIONS
  // =====================================================

  const makePrediction = useCallback(async (questionId: string, optionId: string) => {
    if (!user?.id) {
      return { success: false, error: 'Please sign in to make predictions' };
    }

    // Check if user can predict
    const canPredict = await qxPredictionService.canUserPredict(user.id);
    if (!canPredict.allowed) {
      return { success: false, error: canPredict.reason };
    }

    const result = await qxPredictionService.makePrediction(user.id, questionId, optionId);

    if (result.success) {
      // Refresh data after successful prediction
      await Promise.all([
        refreshBalance(),
        refreshQuestions(),
        refreshUserPredictions(),
      ]);
    }

    return {
      success: result.success,
      error: result.error,
      isEarlyBird: result.isEarlyBird,
      potentialReward: result.potentialReward?.totalPotential,
    };
  }, [user?.id, refreshBalance, refreshQuestions, refreshUserPredictions]);

  const getUserPrediction = useCallback((questionId: string): QXPrediction | undefined => {
    return userPredictions.find(p => p.questionId === questionId);
  }, [userPredictions]);

  // =====================================================
  // EFFECTS
  // =====================================================

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Start question lifecycle manager
        qxQuestionService.start();

        // Generate today's questions if needed
        await qxQuestionService.generateDailyQuestions();

        // Fetch all data in parallel
        await Promise.all([
          refreshBalance(),
          refreshQuestions(),
          refreshLeaderboard(),
          refreshUserPredictions(),
          refreshGlobalStats(),
          refreshPhase(),
        ]);
      } catch (err) {
        console.error('[QX Oracle] Error loading initial data:', err);
        setError('Failed to load prediction market data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Cleanup
    return () => {
      qxQuestionService.stop();
    };
  }, [
    refreshBalance,
    refreshQuestions,
    refreshLeaderboard,
    refreshUserPredictions,
    refreshGlobalStats,
    refreshPhase,
  ]);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(qxQuestionService.getTimeUntilNextQuestion());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh questions every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshQuestions();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshQuestions]);

  // Refresh user data when user changes
  useEffect(() => {
    if (user?.id) {
      refreshBalance();
      refreshUserPredictions();
    }
  }, [user?.id, refreshBalance, refreshUserPredictions]);

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // State
    balance,
    userStats,
    userRank,
    userPredictions,
    activeQuestions,
    upcomingQuestions,
    resolvedQuestions,
    todaysQuestions,
    leaderboard,
    globalStats,
    currentSlot,
    nextSlot,
    countdown,
    phase,
    loading,
    error,

    // Actions
    makePrediction,
    refreshBalance,
    refreshQuestions,
    refreshLeaderboard,
    getUserPrediction,
  };
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Hook for a single question with live prediction distribution
 */
export function useQXQuestion(questionId: string) {
  const [question, setQuestion] = useState<QXQuestion | null>(null);
  const [distribution, setDistribution] = useState<{
    total: number;
    distribution: Record<string, number>;
    earlyBirds: number;
  }>({ total: 0, distribution: {}, earlyBirds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [q, d] = await Promise.all([
          qxQuestionService.getQuestion(questionId),
          qxPredictionService.getQuestionPredictions(questionId),
        ]);
        setQuestion(q);
        setDistribution(d);
      } catch (err) {
        console.error('[QX Question] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 10 seconds for live odds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [questionId]);

  const odds = useMemo(() => {
    if (!question) return [];
    return qxPredictionService.calculateOdds(
      distribution.total,
      distribution.distribution,
      question.options
    );
  }, [question, distribution]);

  return { question, distribution, odds, loading };
}

export default useQXOracle;

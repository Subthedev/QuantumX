/**
 * QX PREDICTION SERVICE
 *
 * Handles user predictions for the QuantumX Oracle Challenge.
 * Manages prediction submission, validation, and history.
 */

import { supabase } from '@/integrations/supabase/client';
import { qxBalanceService } from './qxBalanceService';
import { qxQuestionService, type QXQuestion } from './qxQuestionService';

// =====================================================
// TYPES
// =====================================================

export interface QXPrediction {
  id: string;
  userId: string;
  questionId: string;
  selectedOption: string;
  confidence: number;
  predictedAt: string;
  isEarlyBird: boolean;
  earlyBirdRank: number | null;
  isCorrect: boolean | null;
  baseReward: number;
  streakMultiplier: number;
  earlyBirdBonus: number;
  totalReward: number;
  streakAtPrediction: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  question?: QXQuestion;
}

export interface PredictionResult {
  success: boolean;
  prediction?: QXPrediction;
  error?: string;
  isEarlyBird?: boolean;
  earlyBirdRank?: number;
  potentialReward?: {
    baseReward: number;
    streakMultiplier: number;
    streakTitle: string;
    earlyBirdBonus: number;
    totalPotential: number;
  };
}

export interface UserPredictionStats {
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  maxStreak: number;
  accuracyPercent: number;
  totalEarned: number;
  pendingPredictions: number;
}

// =====================================================
// SERVICE CLASS
// =====================================================

class QXPredictionService {
  /**
   * Submit a prediction for a question
   */
  async makePrediction(
    userId: string,
    questionId: string,
    selectedOption: string,
    confidence: number = 100
  ): Promise<PredictionResult> {
    try {
      // 1. Validate user has a balance record
      const balance = await qxBalanceService.getBalance(userId);
      if (!balance) {
        return { success: false, error: 'Please sign in to make predictions' };
      }

      // 2. Get the question
      const question = await qxQuestionService.getQuestion(questionId);
      if (!question) {
        return { success: false, error: 'Question not found' };
      }

      // 3. Validate question is open
      if (question.status !== 'OPEN') {
        return { success: false, error: `This prediction is ${question.status.toLowerCase()}` };
      }

      // 4. Validate option exists
      const validOption = question.options.find(o => o.id === selectedOption);
      if (!validOption) {
        return { success: false, error: 'Invalid option selected' };
      }

      // 5. Check if user already predicted
      const existingPrediction = await this.getUserPrediction(userId, questionId);
      if (existingPrediction) {
        return { success: false, error: 'You have already made a prediction for this question' };
      }

      // 6. Get current streak for potential reward calculation
      const currentStreak = balance.currentStreak;

      // 7. Insert prediction
      const { data, error } = await supabase
        .from('qx_predictions')
        .insert({
          user_id: userId,
          question_id: questionId,
          selected_option: selectedOption,
          confidence: Math.max(1, Math.min(100, confidence)),
          streak_at_prediction: currentStreak,
        })
        .select()
        .single();

      if (error) {
        console.error('[QX Prediction] Error inserting prediction:', error);
        if (error.code === '23505') {
          return { success: false, error: 'You have already made a prediction for this question' };
        }
        return { success: false, error: 'Failed to submit prediction' };
      }

      const prediction = this.mapDbToPrediction(data);

      // 8. Calculate potential reward
      const potentialReward = qxBalanceService.calculateTotalReward(
        question.baseReward,
        currentStreak,
        prediction.isEarlyBird ? prediction.earlyBirdRank : null,
        1.0 // Phase multiplier
      );

      console.log(`[QX Prediction] User ${userId} predicted ${selectedOption} for question ${questionId}`);

      return {
        success: true,
        prediction,
        isEarlyBird: prediction.isEarlyBird,
        earlyBirdRank: prediction.earlyBirdRank || undefined,
        potentialReward: {
          baseReward: potentialReward.baseReward,
          streakMultiplier: potentialReward.streakMultiplier,
          streakTitle: potentialReward.streakTitle,
          earlyBirdBonus: potentialReward.earlyBirdBonus,
          totalPotential: potentialReward.totalReward,
        },
      };
    } catch (err) {
      console.error('[QX Prediction] Error:', err);
      return { success: false, error: 'An error occurred while submitting your prediction' };
    }
  }

  /**
   * Get a user's prediction for a specific question
   */
  async getUserPrediction(userId: string, questionId: string): Promise<QXPrediction | null> {
    try {
      const { data, error } = await supabase
        .from('qx_predictions')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[QX Prediction] Error fetching prediction:', error);
        return null;
      }

      return this.mapDbToPrediction(data);
    } catch (err) {
      console.error('[QX Prediction] Error:', err);
      return null;
    }
  }

  /**
   * Get all predictions for a user with optional filtering
   */
  async getUserPredictions(
    userId: string,
    options: {
      limit?: number;
      status?: 'pending' | 'resolved' | 'all';
      includeQuestions?: boolean;
    } = {}
  ): Promise<QXPrediction[]> {
    const { limit = 50, status = 'all', includeQuestions = false } = options;

    try {
      let query = supabase
        .from('qx_predictions')
        .select(includeQuestions ? '*, qx_questions(*)' : '*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status === 'pending') {
        query = query.is('is_correct', null);
      } else if (status === 'resolved') {
        query = query.not('is_correct', 'is', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[QX Prediction] Error fetching predictions:', error);
        return [];
      }

      return (data || []).map(row => {
        const prediction = this.mapDbToPrediction(row);
        if (includeQuestions && row.qx_questions) {
          prediction.question = this.mapDbToQuestion(row.qx_questions);
        }
        return prediction;
      });
    } catch (err) {
      console.error('[QX Prediction] Error:', err);
      return [];
    }
  }

  /**
   * Get predictions for a specific question (for showing distribution)
   */
  async getQuestionPredictions(questionId: string): Promise<{
    total: number;
    distribution: Record<string, number>;
    earlyBirds: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('qx_predictions')
        .select('selected_option, is_early_bird')
        .eq('question_id', questionId);

      if (error) {
        console.error('[QX Prediction] Error fetching question predictions:', error);
        return { total: 0, distribution: {}, earlyBirds: 0 };
      }

      const predictions = data || [];
      const distribution: Record<string, number> = {};
      let earlyBirds = 0;

      for (const p of predictions) {
        distribution[p.selected_option] = (distribution[p.selected_option] || 0) + 1;
        if (p.is_early_bird) earlyBirds++;
      }

      return {
        total: predictions.length,
        distribution,
        earlyBirds,
      };
    } catch (err) {
      console.error('[QX Prediction] Error:', err);
      return { total: 0, distribution: {}, earlyBirds: 0 };
    }
  }

  /**
   * Get user's prediction stats
   */
  async getUserStats(userId: string): Promise<UserPredictionStats> {
    try {
      const balance = await qxBalanceService.getBalance(userId);
      if (!balance) {
        return {
          totalPredictions: 0,
          correctPredictions: 0,
          currentStreak: 0,
          maxStreak: 0,
          accuracyPercent: 0,
          totalEarned: 0,
          pendingPredictions: 0,
        };
      }

      // Count pending predictions
      const { count: pendingCount } = await supabase
        .from('qx_predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('is_correct', null);

      return {
        totalPredictions: balance.totalPredictions,
        correctPredictions: balance.correctPredictions,
        currentStreak: balance.currentStreak,
        maxStreak: balance.maxStreak,
        accuracyPercent: balance.accuracyPercent,
        totalEarned: balance.totalEarned,
        pendingPredictions: pendingCount || 0,
      };
    } catch (err) {
      console.error('[QX Prediction] Error:', err);
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        currentStreak: 0,
        maxStreak: 0,
        accuracyPercent: 0,
        totalEarned: 0,
        pendingPredictions: 0,
      };
    }
  }

  /**
   * Get recent winning predictions (for social proof)
   */
  async getRecentWins(limit: number = 10): Promise<{
    prediction: QXPrediction;
    username: string;
    question: QXQuestion;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('qx_predictions')
        .select('*, qx_questions(*)')
        .eq('is_correct', true)
        .gt('total_reward', 0)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[QX Prediction] Error fetching recent wins:', error);
        return [];
      }

      const results = await Promise.all(
        (data || []).map(async (row) => {
          // Get username
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('id', row.user_id)
            .single();

          return {
            prediction: this.mapDbToPrediction(row),
            username: profile?.username || `User ${(row.user_id as string).slice(0, 8)}`,
            question: this.mapDbToQuestion(row.qx_questions),
          };
        })
      );

      return results;
    } catch (err) {
      console.error('[QX Prediction] Error:', err);
      return [];
    }
  }

  /**
   * Get live odds for a question (based on prediction distribution)
   */
  calculateOdds(
    totalPredictions: number,
    distribution: Record<string, number>,
    options: { id: string; text: string }[]
  ): { id: string; text: string; percentage: number; odds: number }[] {
    if (totalPredictions === 0) {
      // Equal odds when no predictions
      const equalPercent = 100 / options.length;
      return options.map(opt => ({
        ...opt,
        percentage: equalPercent,
        odds: options.length,
      }));
    }

    return options.map(opt => {
      const count = distribution[opt.id] || 0;
      const percentage = (count / totalPredictions) * 100;
      // Odds calculation: inverse of probability (higher = less popular = higher payout)
      // Fixed: Use Math.round instead of toFixed to ensure proper number type
      const odds = percentage > 0 ? Math.max(1.1, Math.round((100 / percentage) * 100) / 100) : 10;

      return {
        ...opt,
        percentage: Math.round(percentage * 10) / 10,
        odds: Math.min(10, odds),
      };
    });
  }

  /**
   * Check if user can predict (not banned, account age, etc.)
   */
  async canUserPredict(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check if user has balance record
      const balance = await qxBalanceService.getBalance(userId);
      if (!balance) {
        return { allowed: false, reason: 'Please sign in to make predictions' };
      }

      // Check account age (minimum 1 hour for anti-gaming)
      const createdAt = new Date(balance.createdAt);
      const minAge = 60 * 60 * 1000; // 1 hour
      if (Date.now() - createdAt.getTime() < minAge) {
        const minutesLeft = Math.ceil((minAge - (Date.now() - createdAt.getTime())) / 60000);
        return {
          allowed: false,
          reason: `New accounts must wait ${minutesLeft} minutes before predicting`,
        };
      }

      // Check daily prediction limit (to prevent spam)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('qx_predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      const dailyLimit = 20; // Max 20 predictions per day
      if ((count || 0) >= dailyLimit) {
        return {
          allowed: false,
          reason: `Daily prediction limit reached (${dailyLimit}/day)`,
        };
      }

      return { allowed: true };
    } catch (err) {
      console.error('[QX Prediction] Error checking prediction eligibility:', err);
      return { allowed: true }; // Allow on error to not block users
    }
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private mapDbToPrediction(row: any): QXPrediction {
    return {
      id: row.id,
      userId: row.user_id,
      questionId: row.question_id,
      selectedOption: row.selected_option,
      confidence: row.confidence || 100,
      predictedAt: row.predicted_at,
      isEarlyBird: row.is_early_bird || false,
      earlyBirdRank: row.early_bird_rank,
      isCorrect: row.is_correct,
      baseReward: row.base_reward || 0,
      streakMultiplier: row.streak_multiplier || 1.0,
      earlyBirdBonus: row.early_bird_bonus || 0,
      totalReward: row.total_reward || 0,
      streakAtPrediction: row.streak_at_prediction || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDbToQuestion(row: any): QXQuestion {
    return {
      id: row.id,
      category: row.category,
      difficulty: row.difficulty,
      title: row.title,
      questionText: row.question_text,
      options: row.options || [],
      correctAnswer: row.correct_answer,
      resolutionData: row.resolution_data,
      baseReward: row.base_reward,
      prizePool: row.prize_pool || 0,
      scheduledSlot: row.scheduled_slot,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      resolvesAt: row.resolves_at,
      resolutionType: row.resolution_type,
      resolutionParams: row.resolution_params,
      totalPredictions: row.total_predictions || 0,
      predictionDistribution: row.prediction_distribution || {},
      status: row.status,
      isFeatured: row.is_featured || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const qxPredictionService = new QXPredictionService();
export default qxPredictionService;

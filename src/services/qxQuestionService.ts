/**
 * QX QUESTION SERVICE
 *
 * Handles question generation, scheduling, and auto-resolution
 * for the QuantumX Oracle Challenge prediction market.
 */

import { supabase } from '@/integrations/supabase/client';
import { arenaQuantEngine } from './arenaQuantEngine';
import { qxBalanceService } from './qxBalanceService';

// =====================================================
// TYPES
// =====================================================

export type QuestionCategory = 'AGENT' | 'PRICE' | 'MARKET' | 'STRATEGY' | 'SPECIAL';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'JACKPOT';
export type QuestionStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESOLVING' | 'RESOLVED' | 'CANCELLED';
export type ResolutionType = 'AGENT_WINNER' | 'AGENT_COMPARISON' | 'PRICE_DIRECTION' | 'PRICE_THRESHOLD' | 'PRICE_RANGE' | 'MARKET_STATE' | 'VOLATILITY' | 'STRATEGY_WINNER' | 'MANUAL';

export interface QuestionOption {
  id: string;
  text: string;
  odds?: number;
}

export interface QXQuestion {
  id: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  title: string;
  questionText: string;
  options: QuestionOption[];
  correctAnswer: string | null;
  resolutionData: Record<string, any> | null;
  baseReward: number;
  prizePool: number;
  scheduledSlot: number;
  opensAt: string;
  closesAt: string;
  resolvesAt: string;
  resolutionType: ResolutionType;
  resolutionParams: Record<string, any> | null;
  totalPredictions: number;
  predictionDistribution: Record<string, number>;
  status: QuestionStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionTemplate {
  id: string;
  slot: number;
  name: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  titleTemplate: string;
  questionTemplate: string;
  optionsTemplate: QuestionOption[];
  resolutionType: ResolutionType;
  resolutionParamsTemplate: Record<string, any> | null;
  baseReward: number;
  isActive: boolean;
  rotationWeight: number;
}

// Slot schedule: 12 slots, every 2 hours
const SLOT_SCHEDULE = [
  { slot: 0, hour: 0, name: 'Midnight Oracle' },
  { slot: 1, hour: 2, name: 'Agent Duel' },
  { slot: 2, hour: 4, name: 'Volatility Vision' },
  { slot: 3, hour: 6, name: 'Sunrise Prediction' },
  { slot: 4, hour: 8, name: 'Market Mood' },
  { slot: 5, hour: 10, name: 'Agent Showdown' },
  { slot: 6, hour: 12, name: 'Noon Challenge' },
  { slot: 7, hour: 14, name: 'Strategy Pick' },
  { slot: 8, hour: 16, name: 'Alt Season' },
  { slot: 9, hour: 18, name: 'Evening Oracle' },
  { slot: 10, hour: 20, name: 'Agent Finale' },
  { slot: 11, hour: 22, name: 'Night Owl' },
];

// Binance API for live prices
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';

// =====================================================
// SERVICE CLASS
// =====================================================

class QXQuestionService {
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private PRICE_CACHE_TTL = 10000; // 10 seconds
  private isRunning = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Get current slot based on time
   */
  getCurrentSlot(): { slot: number; name: string; opensAt: Date; closesAt: Date } {
    const now = new Date();
    const hour = now.getUTCHours();
    const slotIndex = Math.floor(hour / 2);
    const schedule = SLOT_SCHEDULE[slotIndex];

    const opensAt = new Date(now);
    opensAt.setUTCHours(schedule.hour, 0, 0, 0);

    const closesAt = new Date(opensAt);
    closesAt.setUTCHours(schedule.hour + 2, 0, 0, 0);

    return {
      slot: schedule.slot,
      name: schedule.name,
      opensAt,
      closesAt,
    };
  }

  /**
   * Get next slot
   */
  getNextSlot(): { slot: number; name: string; opensAt: Date } {
    const current = this.getCurrentSlot();
    const nextSlotIndex = (current.slot + 1) % 12;
    const schedule = SLOT_SCHEDULE[nextSlotIndex];

    const opensAt = new Date();
    if (nextSlotIndex === 0) {
      // Next day
      opensAt.setUTCDate(opensAt.getUTCDate() + 1);
    }
    opensAt.setUTCHours(schedule.hour, 0, 0, 0);

    return {
      slot: schedule.slot,
      name: schedule.name,
      opensAt,
    };
  }

  /**
   * Get time until next question
   */
  getTimeUntilNextQuestion(): { hours: number; minutes: number; seconds: number } {
    const nextSlot = this.getNextSlot();
    const now = Date.now();
    const diff = nextSlot.opensAt.getTime() - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * Get active questions (currently open for predictions)
   */
  async getActiveQuestions(): Promise<QXQuestion[]> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('status', 'OPEN')
        .order('closes_at', { ascending: true });

      if (error) {
        console.error('[QX Questions] Error fetching active questions:', error);
        return [];
      }

      return (data || []).map(this.mapDbToQuestion);
    } catch (err) {
      console.error('[QX Questions] Error:', err);
      return [];
    }
  }

  /**
   * Get upcoming questions (scheduled but not yet open)
   */
  async getUpcomingQuestions(limit: number = 5): Promise<QXQuestion[]> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('status', 'SCHEDULED')
        .order('opens_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[QX Questions] Error fetching upcoming questions:', error);
        return [];
      }

      return (data || []).map(this.mapDbToQuestion);
    } catch (err) {
      console.error('[QX Questions] Error:', err);
      return [];
    }
  }

  /**
   * Get recently resolved questions
   */
  async getResolvedQuestions(limit: number = 10): Promise<QXQuestion[]> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('status', 'RESOLVED')
        .order('resolves_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[QX Questions] Error fetching resolved questions:', error);
        return [];
      }

      return (data || []).map(this.mapDbToQuestion);
    } catch (err) {
      console.error('[QX Questions] Error:', err);
      return [];
    }
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(questionId: string): Promise<QXQuestion | null> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) {
        console.error('[QX Questions] Error fetching question:', error);
        return null;
      }

      return this.mapDbToQuestion(data);
    } catch (err) {
      console.error('[QX Questions] Error:', err);
      return null;
    }
  }

  /**
   * Get today's questions (all 12 slots)
   */
  async getTodaysQuestions(): Promise<QXQuestion[]> {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .gte('opens_at', today.toISOString())
        .lt('opens_at', tomorrow.toISOString())
        .order('scheduled_slot', { ascending: true });

      if (error) {
        console.error('[QX Questions] Error fetching today\'s questions:', error);
        return [];
      }

      return (data || []).map(this.mapDbToQuestion);
    } catch (err) {
      console.error('[QX Questions] Error:', err);
      return [];
    }
  }

  /**
   * Generate questions for a specific day
   * Called by a cron job or manually
   */
  async generateDailyQuestions(date: Date = new Date()): Promise<number> {
    try {
      const templates = await this.getActiveTemplates();
      if (templates.length === 0) {
        console.warn('[QX Questions] No active templates found');
        return 0;
      }

      let generated = 0;

      for (const schedule of SLOT_SCHEDULE) {
        // Check if question already exists for this slot
        const opensAt = new Date(date);
        opensAt.setUTCHours(schedule.hour, 0, 0, 0);

        const existing = await this.checkQuestionExists(schedule.slot, opensAt);
        if (existing) {
          continue;
        }

        // Find template for this slot
        const slotTemplates = templates.filter(t => t.slot === schedule.slot);
        if (slotTemplates.length === 0) {
          continue;
        }

        // Weighted random selection
        const template = this.selectWeightedTemplate(slotTemplates);
        if (!template) continue;

        // Generate question from template
        const question = await this.generateQuestionFromTemplate(template, opensAt);
        if (question) {
          generated++;
        }
      }

      console.log(`[QX Questions] Generated ${generated} questions for ${date.toDateString()}`);
      return generated;
    } catch (err) {
      console.error('[QX Questions] Error generating daily questions:', err);
      return 0;
    }
  }

  /**
   * Start the question lifecycle manager
   * Runs every 30 seconds to check for status transitions
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[QX Questions] Starting question lifecycle manager');

    // Run immediately
    this.runLifecycleCheck();

    // Then every 30 seconds
    this.checkInterval = setInterval(() => {
      this.runLifecycleCheck();
    }, 30000);
  }

  /**
   * Stop the lifecycle manager
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[QX Questions] Stopped question lifecycle manager');
  }

  /**
   * Run lifecycle check for all questions
   */
  private async runLifecycleCheck(): Promise<void> {
    const now = new Date();

    // 1. Open SCHEDULED questions that are due
    await this.openScheduledQuestions(now);

    // 2. Close OPEN questions that have expired
    await this.closeExpiredQuestions(now);

    // 3. Resolve CLOSED questions that are due
    await this.resolveClosedQuestions(now);
  }

  /**
   * Open scheduled questions that are due
   */
  private async openScheduledQuestions(now: Date): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('status', 'SCHEDULED')
        .lte('opens_at', now.toISOString());

      if (error || !data) return;

      for (const row of data) {
        await supabase
          .from('qx_questions')
          .update({ status: 'OPEN', updated_at: now.toISOString() })
          .eq('id', row.id);

        console.log(`[QX Questions] Opened question: ${row.title}`);
      }
    } catch (err) {
      console.error('[QX Questions] Error opening questions:', err);
    }
  }

  /**
   * Close open questions that have expired
   */
  private async closeExpiredQuestions(now: Date): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('status', 'OPEN')
        .lte('closes_at', now.toISOString());

      if (error || !data) return;

      for (const row of data) {
        await supabase
          .from('qx_questions')
          .update({ status: 'CLOSED', updated_at: now.toISOString() })
          .eq('id', row.id);

        console.log(`[QX Questions] Closed question: ${row.title}`);
      }
    } catch (err) {
      console.error('[QX Questions] Error closing questions:', err);
    }
  }

  /**
   * Resolve closed questions that are due
   */
  private async resolveClosedQuestions(now: Date): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('qx_questions')
        .select('*')
        .eq('status', 'CLOSED')
        .lte('resolves_at', now.toISOString());

      if (error || !data) return;

      for (const row of data) {
        await this.resolveQuestion(row);
      }
    } catch (err) {
      console.error('[QX Questions] Error resolving questions:', err);
    }
  }

  /**
   * Resolve a specific question
   */
  private async resolveQuestion(questionRow: any): Promise<void> {
    try {
      const question = this.mapDbToQuestion(questionRow);

      // Mark as resolving
      await supabase
        .from('qx_questions')
        .update({ status: 'RESOLVING' })
        .eq('id', question.id);

      // Determine correct answer based on resolution type
      const resolution = await this.determineAnswer(question);
      if (!resolution) {
        console.error(`[QX Questions] Could not determine answer for ${question.title}`);
        return;
      }

      // Update question with answer
      await supabase
        .from('qx_questions')
        .update({
          correct_answer: resolution.answer,
          resolution_data: resolution.data,
          status: 'RESOLVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', question.id);

      console.log(`[QX Questions] Resolved question: ${question.title} -> ${resolution.answer}`);

      // Distribute rewards to winners
      await this.distributeRewards(question.id, resolution.answer, question.baseReward);

    } catch (err) {
      console.error('[QX Questions] Error resolving question:', err);
    }
  }

  /**
   * Determine the correct answer for a question
   */
  private async determineAnswer(question: QXQuestion): Promise<{ answer: string; data: Record<string, any> } | null> {
    const params = question.resolutionParams || {};

    switch (question.resolutionType) {
      case 'AGENT_WINNER':
        return this.resolveAgentWinner(params);

      case 'AGENT_COMPARISON':
        return this.resolveAgentComparison(params);

      case 'PRICE_DIRECTION':
        return this.resolvePriceDirection(params);

      case 'PRICE_THRESHOLD':
        return this.resolvePriceThreshold(params);

      case 'MARKET_STATE':
        return this.resolveMarketState(params);

      case 'VOLATILITY':
        return this.resolveVolatility(params);

      case 'STRATEGY_WINNER':
        return this.resolveStrategyWinner(params);

      default:
        console.warn(`[QX Questions] Unknown resolution type: ${question.resolutionType}`);
        return null;
    }
  }

  /**
   * Resolve: Which agent performed best
   */
  private async resolveAgentWinner(_params: any): Promise<{ answer: string; data: Record<string, any> }> {
    const agents = arenaQuantEngine.getAgents();

    // Sort by P&L
    const sorted = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
    const winner = sorted[0];

    // Check if it's a ranking question
    if (_params.rank_all) {
      const ranking = sorted.map(a => a.id.toUpperCase().replace('X', '')).join('');
      return {
        answer: ranking,
        data: {
          rankings: sorted.map(a => ({ id: a.id, name: a.name, pnl: a.totalPnLPercent })),
        },
      };
    }

    return {
      answer: winner.id.toUpperCase(),
      data: {
        winner: { id: winner.id, name: winner.name, pnl: winner.totalPnLPercent },
        agents: sorted.map(a => ({ id: a.id, name: a.name, pnl: a.totalPnLPercent })),
      },
    };
  }

  /**
   * Resolve: Compare two agents
   */
  private async resolveAgentComparison(params: any): Promise<{ answer: string; data: Record<string, any> }> {
    const agents = arenaQuantEngine.getAgents();
    const agent1 = agents.find(a => a.id === params.agent1);
    const agent2 = agents.find(a => a.id === params.agent2);

    if (!agent1 || !agent2) {
      return { answer: 'TIE', data: { error: 'Agent not found' } };
    }

    const diff = Math.abs(agent1.totalPnLPercent - agent2.totalPnLPercent);

    let answer: string;
    if (diff < 0.1) {
      answer = 'TIE';
    } else if (agent1.totalPnLPercent > agent2.totalPnLPercent) {
      answer = agent1.id.toUpperCase();
    } else {
      answer = agent2.id.toUpperCase();
    }

    return {
      answer,
      data: {
        agent1: { id: agent1.id, name: agent1.name, pnl: agent1.totalPnLPercent },
        agent2: { id: agent2.id, name: agent2.name, pnl: agent2.totalPnLPercent },
        difference: diff,
      },
    };
  }

  /**
   * Resolve: Price direction
   */
  private async resolvePriceDirection(params: any): Promise<{ answer: string; data: Record<string, any> }> {
    const symbol = params.symbol || 'BTC';
    const threshold = params.threshold_percent || 0.5;

    const price = await this.getCurrentPrice(`${symbol}USDT`);
    const baseline = params.baseline_price || price;

    const change = ((price - baseline) / baseline) * 100;

    let answer: string;
    if (change >= threshold) {
      answer = params.symbol2 ? `${symbol}` : 'UP';
    } else if (change <= -threshold) {
      answer = params.symbol2 ? params.symbol2 : 'DOWN';
    } else {
      answer = params.symbol2 ? 'TIE' : 'FLAT';
    }

    // Handle multi-tier price predictions
    if (params.timeframe_hours === 8 && !params.symbol2) {
      if (change >= 2) answer = 'PUMP';
      else if (change >= 0.5) answer = 'SLIGHT_UP';
      else if (change >= -0.5) answer = 'FLAT';
      else if (change >= -2) answer = 'SLIGHT_DOWN';
      else answer = 'DUMP';
    }

    return {
      answer,
      data: {
        symbol,
        baselinePrice: baseline,
        currentPrice: price,
        changePercent: change,
      },
    };
  }

  /**
   * Resolve: Price threshold
   */
  private async resolvePriceThreshold(params: any): Promise<{ answer: string; data: Record<string, any> }> {
    const symbol = params.symbol || 'BTC';
    const price = await this.getCurrentPrice(`${symbol}USDT`);
    const resistance = params.resistance;
    const support = params.support;

    let answer: string;
    if (resistance && price >= resistance) {
      answer = 'ABOVE';
    } else if (support && price <= support) {
      answer = 'BELOW';
    } else {
      answer = 'NEITHER';
    }

    return {
      answer,
      data: {
        symbol,
        currentPrice: price,
        resistance,
        support,
      },
    };
  }

  /**
   * Resolve: Market state
   */
  private async resolveMarketState(_params: any): Promise<{ answer: string; data: Record<string, any> }> {
    const marketState = arenaQuantEngine.getCurrentMarketState();

    return {
      answer: marketState,
      data: {
        state: marketState,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Resolve: Volatility
   */
  private async resolveVolatility(params: any): Promise<{ answer: string; data: Record<string, any> }> {
    const threshold = params.threshold_percent || 2;

    // Get BTC 24h data
    const data = await this.get24hData('BTCUSDT');
    const range = ((data.high - data.low) / data.price) * 100;

    const answer = range >= threshold ? 'HIGH' : 'LOW';

    return {
      answer,
      data: {
        range24h: range,
        threshold,
        high: data.high,
        low: data.low,
      },
    };
  }

  /**
   * Resolve: Strategy winner
   */
  private async resolveStrategyWinner(_params: any): Promise<{ answer: string; data: Record<string, any> }> {
    // Analyze agent strategies
    const agents = arenaQuantEngine.getAgents();

    // Map agents to strategy types
    const strategies = {
      MOMENTUM: { pnl: 0, trades: 0 },
      REVERSION: { pnl: 0, trades: 0 },
      BREAKOUT: { pnl: 0, trades: 0 },
    };

    for (const agent of agents) {
      if (agent.id === 'alphax') {
        strategies.MOMENTUM.pnl += agent.totalPnLPercent;
        strategies.MOMENTUM.trades += agent.totalTrades;
      } else if (agent.id === 'betax') {
        strategies.REVERSION.pnl += agent.totalPnLPercent;
        strategies.REVERSION.trades += agent.totalTrades;
      } else if (agent.id === 'gammax') {
        strategies.BREAKOUT.pnl += agent.totalPnLPercent;
        strategies.BREAKOUT.trades += agent.totalTrades;
      }
    }

    // Find winner
    let winner = 'MOMENTUM';
    let bestPnl = strategies.MOMENTUM.pnl;

    for (const [name, data] of Object.entries(strategies)) {
      if (data.pnl > bestPnl) {
        winner = name;
        bestPnl = data.pnl;
      }
    }

    return {
      answer: winner,
      data: { strategies },
    };
  }

  /**
   * Distribute rewards to winning predictors
   */
  private async distributeRewards(questionId: string, correctAnswer: string, baseReward: number): Promise<void> {
    try {
      // Get all predictions for this question
      const { data: predictions, error } = await supabase
        .from('qx_predictions')
        .select('*')
        .eq('question_id', questionId);

      if (error || !predictions) return;

      // Get current phase for bonus multiplier
      const phase = await qxBalanceService.getCurrentPhase();
      const phaseMultiplier = phase?.bonusMultiplier || 1.0;

      // Process each prediction
      for (const prediction of predictions) {
        const isCorrect = prediction.selected_option === correctAnswer;

        // Calculate reward
        let totalReward = 0;
        let streakMultiplier = 1.0;
        let earlyBirdBonus = 0;

        if (isCorrect) {
          const streakInfo = qxBalanceService.getStreakMultiplier(prediction.streak_at_prediction || 0);
          streakMultiplier = streakInfo.multiplier;

          if (prediction.is_early_bird && prediction.early_bird_rank) {
            earlyBirdBonus = qxBalanceService.getEarlyBirdBonus(prediction.early_bird_rank, baseReward);
          }

          const rewardCalc = qxBalanceService.calculateTotalReward(
            baseReward,
            prediction.streak_at_prediction || 0,
            prediction.early_bird_rank,
            phaseMultiplier
          );

          totalReward = rewardCalc.totalReward;
        }

        // Update prediction with result
        await supabase
          .from('qx_predictions')
          .update({
            is_correct: isCorrect,
            base_reward: isCorrect ? baseReward : 0,
            streak_multiplier: streakMultiplier,
            early_bird_bonus: earlyBirdBonus,
            total_reward: totalReward,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prediction.id);

      }

      const winners = predictions.filter(p => p.selected_option === correctAnswer).length;
      console.log(`[QX Questions] Distributed rewards to ${winners} winners for question ${questionId}`);

    } catch (err) {
      console.error('[QX Questions] Error distributing rewards:', err);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async getActiveTemplates(): Promise<QuestionTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('qx_question_templates')
        .select('*')
        .eq('is_active', true);

      if (error) return [];

      return (data || []).map(row => ({
        id: row.id,
        slot: row.slot,
        name: row.name,
        category: row.category,
        difficulty: row.difficulty,
        titleTemplate: row.title_template,
        questionTemplate: row.question_template,
        optionsTemplate: row.options_template,
        resolutionType: row.resolution_type,
        resolutionParamsTemplate: row.resolution_params_template,
        baseReward: row.base_reward,
        isActive: row.is_active,
        rotationWeight: row.rotation_weight,
      }));
    } catch (err) {
      return [];
    }
  }

  private selectWeightedTemplate(templates: QuestionTemplate[]): QuestionTemplate | null {
    if (templates.length === 0) return null;
    if (templates.length === 1) return templates[0];

    const totalWeight = templates.reduce((sum, t) => sum + t.rotationWeight, 0);
    let random = Math.random() * totalWeight;

    for (const template of templates) {
      random -= template.rotationWeight;
      if (random <= 0) return template;
    }

    return templates[0];
  }

  private async checkQuestionExists(slot: number, opensAt: Date): Promise<boolean> {
    const { count } = await supabase
      .from('qx_questions')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_slot', slot)
      .eq('opens_at', opensAt.toISOString());

    return (count || 0) > 0;
  }

  private async generateQuestionFromTemplate(template: QuestionTemplate, opensAt: Date): Promise<boolean> {
    try {
      const closesAt = new Date(opensAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      const resolvesAt = new Date(closesAt.getTime() + (template.resolutionParamsTemplate?.timeframe_hours || 2) * 60 * 60 * 1000);

      // Get current price for dynamic placeholders
      const btcPrice = await this.getCurrentPrice('BTCUSDT');
      const resistance = Math.ceil(btcPrice * 1.02 / 100) * 100; // 2% above, rounded
      const support = Math.floor(btcPrice * 0.98 / 100) * 100; // 2% below, rounded

      // Replace placeholders in templates
      let title = template.titleTemplate;
      let questionText = template.questionTemplate;
      let options = JSON.parse(JSON.stringify(template.optionsTemplate)); // Deep clone

      // Replace {{resistance}} and {{support}}
      title = title.replace(/\{\{resistance\}\}/g, `$${resistance.toLocaleString()}`);
      title = title.replace(/\{\{support\}\}/g, `$${support.toLocaleString()}`);
      questionText = questionText.replace(/\{\{resistance\}\}/g, `$${resistance.toLocaleString()}`);
      questionText = questionText.replace(/\{\{support\}\}/g, `$${support.toLocaleString()}`);

      for (const opt of options) {
        opt.text = opt.text.replace(/\{\{resistance\}\}/g, `$${resistance.toLocaleString()}`);
        opt.text = opt.text.replace(/\{\{support\}\}/g, `$${support.toLocaleString()}`);
      }

      // Resolution params with current price
      const resolutionParams = {
        ...template.resolutionParamsTemplate,
        baseline_price: btcPrice,
        resistance,
        support,
        generated_at: Date.now(),
      };

      const { error } = await supabase
        .from('qx_questions')
        .insert({
          category: template.category,
          difficulty: template.difficulty,
          title,
          question_text: questionText,
          options,
          base_reward: template.baseReward,
          scheduled_slot: template.slot,
          opens_at: opensAt.toISOString(),
          closes_at: closesAt.toISOString(),
          resolves_at: resolvesAt.toISOString(),
          resolution_type: template.resolutionType,
          resolution_params: resolutionParams,
          status: 'SCHEDULED',
        });

      if (error) {
        console.error('[QX Questions] Error creating question:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[QX Questions] Error generating question:', err);
      return false;
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // Check cache
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached.price;
    }

    try {
      const response = await fetch(`${BINANCE_API}?symbol=${symbol}`);
      const data = await response.json();
      const price = parseFloat(data.lastPrice);

      this.priceCache.set(symbol, { price, timestamp: Date.now() });
      return price;
    } catch (err) {
      console.error('[QX Questions] Error fetching price:', err);
      return cached?.price || 0;
    }
  }

  private async get24hData(symbol: string): Promise<{ price: number; high: number; low: number; volume: number }> {
    try {
      const response = await fetch(`${BINANCE_API}?symbol=${symbol}`);
      const data = await response.json();

      return {
        price: parseFloat(data.lastPrice),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
      };
    } catch (err) {
      return { price: 0, high: 0, low: 0, volume: 0 };
    }
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

export const qxQuestionService = new QXQuestionService();
export default qxQuestionService;

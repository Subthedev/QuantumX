/**
 * ORACLE QUESTION ENGINE v3.0 - CONTEXT-AWARE DYNAMIC QUESTIONS
 *
 * Key Design Principles:
 * 1. SHOW CONTEXT FIRST - User sees current state before predicting
 * 2. SHORT WINDOWS - 30 min resolution, not 2 hours (keeps engagement)
 * 3. BINARY CHOICES - Simple YES/NO makes decisions easier
 * 4. SKILL ELEMENT - Observable patterns, not pure luck
 * 5. DYNAMIC GENERATION - Questions based on CURRENT agent/market state
 *
 * Inspired by Polymarket (real-time odds) and Probo (gamification)
 */

import { arenaQuantEngine, type QuantAgent } from './arenaQuantEngine';

// =====================================================
// TYPES
// =====================================================

export type QuestionTier = 'ARENA' | 'CRYPTO' | 'HYBRID';
export type QuestionType =
  | 'MOMENTUM_CHECK'      // Will agent stay positive/negative?
  | 'STREAK_CONTINUE'     // Will streak continue or break?
  | 'LEADER_DEFENSE'      // Will leader maintain lead?
  | 'TRADE_OUTCOME'       // Will current trade profit?
  | 'RECOVERY'            // Will agent recover?
  | 'NEXT_TRADE_WIN'      // Will next trade be a win?
  | 'COMBINED_PNL'        // Will combined PnL be positive?
  | 'BEAT_LEADER'         // Will underdog beat leader?
  | 'WINRATE_HOLD'        // Will win rate stay above threshold?
  | 'TRADE_COUNT';        // Will trades exceed threshold?

export interface OracleQuestion {
  id: string;
  slot: number;
  tier: QuestionTier;
  type: QuestionType;
  title: string;
  question: string;
  context: string;                      // Shows current state to user
  options: { id: string; text: string; emoji?: string }[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  baseReward: number;
  opensAt: Date;
  closesAt: Date;
  resolvesAt: Date;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
  correctAnswer?: string;
  // Snapshot data for resolution
  snapshot: {
    agentId?: string;
    agentName?: string;
    currentPnL?: number;
    currentPnLPercent?: number;
    currentStreak?: number;
    streakType?: 'WIN' | 'LOSS' | null;
    currentLeader?: string;
    leaderLead?: number;
    winRate?: number;
    tradeCount?: number;
    combinedPnL?: number;
  };
}

export interface UserPrediction {
  questionId: string;
  selectedOption: string;
  predictedAt: number;
  potentialReward: number;
}

export interface UserStats {
  totalQXEarned: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  bestStreak: number;
  accuracy: number;
}

// =====================================================
// QUESTION GENERATORS - CONTEXT-AWARE
// =====================================================

/**
 * Generates a MOMENTUM question based on current agent state
 * "AlphaX is UP +1.8%. Will AlphaX stay positive in 30 min?"
 */
function generateMomentumQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  // Find an agent with notable performance (positive or negative)
  const sortedByPnL = [...agents].sort((a, b) => Math.abs(b.totalPnLPercent) - Math.abs(a.totalPnLPercent));
  const target = sortedByPnL[0];

  const isPositive = target.totalPnLPercent >= 0;
  const pnlDisplay = target.totalPnLPercent >= 0
    ? `+${target.totalPnLPercent.toFixed(2)}%`
    : `${target.totalPnLPercent.toFixed(2)}%`;

  return {
    type: 'MOMENTUM_CHECK',
    tier: 'ARENA',
    title: `${target.name} Momentum`,
    question: isPositive
      ? `Will ${target.name} STAY POSITIVE in 30 minutes?`
      : `Will ${target.name} RECOVER to positive in 30 minutes?`,
    context: `${target.name} is currently at ${pnlDisplay} with ${target.wins}W/${target.losses}L record`,
    options: [
      { id: 'yes', text: isPositive ? 'YES - Stays Positive' : 'YES - Recovers', emoji: '✅' },
      { id: 'no', text: isPositive ? 'NO - Goes Negative' : 'NO - Stays Negative', emoji: '❌' },
    ],
    difficulty: 'EASY',
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      currentPnL: target.totalPnL,
      currentPnLPercent: target.totalPnLPercent,
    },
  };
}

/**
 * Generates a STREAK question when an agent has a notable streak
 * "BetaX is on a 4-WIN streak. Will the streak continue?"
 */
function generateStreakQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  // Find agent with longest streak (min 2 for it to be meaningful)
  const withStreaks = agents.filter(a => a.streakCount >= 2);
  const target = withStreaks.length > 0
    ? withStreaks.sort((a, b) => b.streakCount - a.streakCount)[0]
    : agents[0];

  const streakText = target.streakType === 'WIN' ? 'WINNING' : 'LOSING';
  const hasStreak = target.streakCount >= 2;

  return {
    type: 'STREAK_CONTINUE',
    tier: 'ARENA',
    title: hasStreak ? `${target.name} ${streakText} Streak` : `${target.name} Next Trade`,
    question: hasStreak
      ? `${target.name} is on a ${target.streakCount}-${target.streakType} streak. Will it CONTINUE?`
      : `Will ${target.name}'s next trade be a WIN?`,
    context: hasStreak
      ? `${target.name} has won ${target.streakType === 'WIN' ? 'last ' + target.streakCount : '0 of last ' + target.streakCount} trades`
      : `${target.name} has ${target.wins}W/${target.losses}L (${target.winRate.toFixed(0)}% win rate)`,
    options: [
      { id: 'yes', text: hasStreak ? 'YES - Streak Continues' : 'YES - Next trade wins', emoji: '🔥' },
      { id: 'no', text: hasStreak ? 'NO - Streak Breaks' : 'NO - Next trade loses', emoji: '💨' },
    ],
    difficulty: hasStreak ? 'MEDIUM' : 'EASY',
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      currentStreak: target.streakCount,
      streakType: target.streakType,
      winRate: target.winRate,
    },
  };
}

/**
 * Generates a LEADER question about the current top performer
 * "GammaX leads by $350. Will GammaX maintain the lead?"
 */
function generateLeaderQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
  const leader = sorted[0];
  const second = sorted[1];
  const lead = leader.totalPnL - second.totalPnL;

  return {
    type: 'LEADER_DEFENSE',
    tier: 'ARENA',
    title: 'Leader Challenge',
    question: `${leader.name} leads by $${lead.toFixed(0)}. Will ${leader.name} MAINTAIN the lead?`,
    context: `1st: ${leader.name} ($${leader.totalPnL.toFixed(0)}) | 2nd: ${second.name} ($${second.totalPnL.toFixed(0)})`,
    options: [
      { id: 'yes', text: `YES - ${leader.name} stays #1`, emoji: '👑' },
      { id: 'no', text: `NO - ${second.name} takes over`, emoji: '⚔️' },
    ],
    difficulty: lead > 200 ? 'EASY' : 'HARD',
    snapshot: {
      agentId: leader.id,
      agentName: leader.name,
      currentLeader: leader.id,
      leaderLead: lead,
      currentPnL: leader.totalPnL,
    },
  };
}

/**
 * Generates a TRADE OUTCOME question when an agent has an open position
 * "AlphaX just opened LONG on BTC. Will this trade profit?"
 */
function generateTradeOutcomeQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  // Find agent with open position
  const withPosition = agents.filter(a => a.currentPosition !== null);

  if (withPosition.length > 0) {
    const target = withPosition[0];
    const pos = target.currentPosition!;

    return {
      type: 'TRADE_OUTCOME',
      tier: 'ARENA',
      title: 'Live Trade Prediction',
      question: `${target.name} is ${pos.direction} on ${pos.displaySymbol}. Will this trade PROFIT?`,
      context: `Entry: $${pos.entryPrice.toFixed(2)} | Current: $${pos.currentPrice.toFixed(2)} | PnL: ${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%`,
      options: [
        { id: 'yes', text: 'YES - Trade profits', emoji: '💰' },
        { id: 'no', text: 'NO - Trade loses', emoji: '📉' },
      ],
      difficulty: 'MEDIUM',
      snapshot: {
        agentId: target.id,
        agentName: target.name,
        currentPnL: pos.pnl,
        currentPnLPercent: pos.pnlPercent,
      },
    };
  }

  // Fallback: Will next trade be a win?
  const target = agents[slot % 3];
  return {
    type: 'NEXT_TRADE_WIN',
    tier: 'ARENA',
    title: `${target.name} Next Trade`,
    question: `Will ${target.name}'s next trade be a WIN?`,
    context: `${target.name} win rate: ${target.winRate.toFixed(0)}% | Recent: ${target.wins}W/${target.losses}L`,
    options: [
      { id: 'yes', text: 'YES - Next trade wins', emoji: '✅' },
      { id: 'no', text: 'NO - Next trade loses', emoji: '❌' },
    ],
    difficulty: 'EASY',
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      winRate: target.winRate,
      tradeCount: target.totalTrades,
    },
  };
}

/**
 * Generates a COMBINED performance question
 * "Will total agent portfolio end positive after 30 min?"
 */
function generateCombinedQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  const totalPnL = agents.reduce((sum, a) => sum + a.totalPnL, 0);
  const isPositive = totalPnL >= 0;

  return {
    type: 'COMBINED_PNL',
    tier: 'HYBRID',
    title: 'Combined Performance',
    question: `Will TOTAL portfolio be ${isPositive ? 'HIGHER' : 'POSITIVE'} in 30 minutes?`,
    context: `Combined PnL: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)} | Avg Win Rate: ${(agents.reduce((s, a) => s + a.winRate, 0) / 3).toFixed(0)}%`,
    options: [
      { id: 'yes', text: isPositive ? 'YES - Even higher' : 'YES - Recovers positive', emoji: '📈' },
      { id: 'no', text: isPositive ? 'NO - Drops lower' : 'NO - Stays negative', emoji: '📉' },
    ],
    difficulty: 'MEDIUM',
    snapshot: {
      combinedPnL: totalPnL,
    },
  };
}

/**
 * Generates a WIN RATE threshold question
 * "GammaX has 68% win rate. Will it stay above 65%?"
 */
function generateWinRateQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  // Find agent with highest win rate
  const sorted = [...agents].sort((a, b) => b.winRate - a.winRate);
  const target = sorted[0];

  // Set threshold slightly below current (makes it achievable)
  const threshold = Math.floor(target.winRate / 5) * 5; // Round to nearest 5

  return {
    type: 'WINRATE_HOLD',
    tier: 'ARENA',
    title: `${target.name} Win Rate`,
    question: `${target.name} has ${target.winRate.toFixed(0)}% win rate. Will it stay ABOVE ${threshold}%?`,
    context: `${target.name}: ${target.wins}W/${target.losses}L | Strategy: ${target.riskProfile}`,
    options: [
      { id: 'yes', text: `YES - Stays above ${threshold}%`, emoji: '🎯' },
      { id: 'no', text: `NO - Drops below ${threshold}%`, emoji: '📉' },
    ],
    difficulty: 'HARD',
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      winRate: target.winRate,
      tradeCount: target.totalTrades,
    },
  };
}

/**
 * Generates an UNDERDOG question
 * "BetaX trails by $400. Can BetaX close the gap by 50%?"
 */
function generateUnderdogQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
  const leader = sorted[0];
  const underdog = sorted[2]; // Last place
  const gap = leader.totalPnL - underdog.totalPnL;

  return {
    type: 'BEAT_LEADER',
    tier: 'ARENA',
    title: 'Underdog Rally',
    question: `${underdog.name} trails ${leader.name} by $${gap.toFixed(0)}. Can ${underdog.name} close 50% of the gap?`,
    context: `${underdog.name}: $${underdog.totalPnL.toFixed(0)} | ${leader.name}: $${leader.totalPnL.toFixed(0)} | Gap: $${gap.toFixed(0)}`,
    options: [
      { id: 'yes', text: `YES - ${underdog.name} catches up`, emoji: '🚀' },
      { id: 'no', text: `NO - Gap stays or widens`, emoji: '😤' },
    ],
    difficulty: 'HARD',
    snapshot: {
      agentId: underdog.id,
      agentName: underdog.name,
      currentLeader: leader.id,
      leaderLead: gap,
      currentPnL: underdog.totalPnL,
    },
  };
}

/**
 * Generates a TRADE COUNT question
 * "Agents have made 25 trades. Will they hit 30 in the next 30 min?"
 */
function generateTradeCountQuestion(agents: QuantAgent[], slot: number): Partial<OracleQuestion> {
  const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
  const target = totalTrades + 5; // 5 more trades as threshold

  return {
    type: 'TRADE_COUNT',
    tier: 'HYBRID',
    title: 'Trading Activity',
    question: `Agents have made ${totalTrades} trades. Will they reach ${target} in 30 min?`,
    context: `Current pace: ${(totalTrades / Math.max(1, Math.floor((Date.now() - agents[0].lastTradeTime) / 60000))).toFixed(1)} trades/min`,
    options: [
      { id: 'yes', text: `YES - Reach ${target}+ trades`, emoji: '⚡' },
      { id: 'no', text: `NO - Stay under ${target}`, emoji: '🐢' },
    ],
    difficulty: 'MEDIUM',
    snapshot: {
      tradeCount: totalTrades,
    },
  };
}

// =====================================================
// QUESTION POOL - CYCLES THROUGH 8 TYPES
// =====================================================

// 8 question types that cycle through 48 daily slots (24h / 30min = 48 slots)
const QUESTION_GENERATORS: Array<(agents: QuantAgent[], slot: number) => Partial<OracleQuestion>> = [
  generateMomentumQuestion,      // 0: "Will agent stay positive?"
  generateStreakQuestion,        // 1: "Will streak continue?"
  generateLeaderQuestion,        // 2: "Will leader defend?"
  generateTradeOutcomeQuestion,  // 3: "Will this trade profit?"
  generateCombinedQuestion,      // 4: "Will combined PnL go up?"
  generateWinRateQuestion,       // 5: "Will win rate hold?"
  generateUnderdogQuestion,      // 6: "Can underdog catch up?"
  generateTradeCountQuestion,    // 7: "Will trades hit target?"
];

// Get generator for any slot (cycles through the 8 types)
function getQuestionGenerator(slot: number): (agents: QuantAgent[], slot: number) => Partial<OracleQuestion> {
  return QUESTION_GENERATORS[slot % QUESTION_GENERATORS.length];
}

// Total slots per day (24 hours / 30 minutes = 48 slots)
const TOTAL_DAILY_SLOTS = 48;

// =====================================================
// MAIN ENGINE CLASS
// =====================================================

class OracleQuestionEngine {
  private questions: Map<string, OracleQuestion> = new Map();
  private userPredictions: Map<string, UserPrediction> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private currentSlot: number = 0;
  private lastSlot: number = -1; // Track slot changes
  private onSlotChangeCallbacks: Array<(newSlot: number) => void> = [];

  // Resolution time = 30 minutes per slot
  private SLOT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private BETTING_WINDOW_MS = 10 * 60 * 1000; // 10 min betting window

  /**
   * Initialize the engine
   */
  start(): void {
    this.loadUserPredictions(); // Load from localStorage
    this.generateTodaysQuestions();
    this.updateQuestionStatuses();

    // Update statuses every 1 second for better sync
    this.updateInterval = setInterval(() => {
      this.updateQuestionStatuses();
    }, 1000);
  }

  /**
   * Load user predictions from localStorage
   */
  private loadUserPredictions(): void {
    try {
      const stored = JSON.parse(localStorage.getItem('qx_predictions') || '{}');
      Object.entries(stored).forEach(([questionId, prediction]) => {
        this.userPredictions.set(questionId, prediction as UserPrediction);
      });
    } catch (e) {
      console.error('[Oracle] Error loading predictions:', e);
    }
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Generate all 48 questions for today (24h / 30min = 48 slots)
   * Questions are generated dynamically with fresh agent data
   */
  private generateTodaysQuestions(): void {
    const agents = arenaQuantEngine.getAgents();
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    // Generate 48 slots for the full 24-hour day
    for (let slot = 0; slot < TOTAL_DAILY_SLOTS; slot++) {
      const opensAt = new Date(dayStart.getTime() + slot * this.SLOT_DURATION_MS);
      const closesAt = new Date(opensAt.getTime() + this.BETTING_WINDOW_MS);
      const resolvesAt = new Date(opensAt.getTime() + this.SLOT_DURATION_MS);

      // Generate context-aware question (cycles through 8 types)
      const generator = getQuestionGenerator(slot);
      const questionData = generator(agents, slot);

      const question: OracleQuestion = {
        id: `q-${dayStart.toISOString().split('T')[0]}-${slot}`,
        slot,
        tier: questionData.tier || 'ARENA',
        type: questionData.type || 'MOMENTUM_CHECK',
        title: questionData.title || 'Agent Challenge',
        question: questionData.question || 'Will the agent perform well?',
        context: questionData.context || '',
        options: questionData.options || [
          { id: 'yes', text: 'YES', emoji: '✅' },
          { id: 'no', text: 'NO', emoji: '❌' },
        ],
        difficulty: questionData.difficulty || 'EASY',
        baseReward: 500,
        opensAt,
        closesAt,
        resolvesAt,
        status: 'UPCOMING',
        snapshot: questionData.snapshot || {},
      };

      this.questions.set(question.id, question);
    }
  }

  /**
   * Calculate current slot based on current time
   */
  private calculateCurrentSlot(): number {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - dayStart.getTime()) / this.SLOT_DURATION_MS);
  }

  /**
   * Update question statuses and resolve completed ones
   */
  private updateQuestionStatuses(): void {
    const now = new Date();
    const calculatedSlot = this.calculateCurrentSlot();

    // Detect slot change
    if (calculatedSlot !== this.lastSlot) {
      console.log(`[Oracle] SLOT CHANGED: ${this.lastSlot} -> ${calculatedSlot}`);
      this.lastSlot = calculatedSlot;
      this.currentSlot = calculatedSlot;

      // Regenerate the new slot's question with fresh agent data
      this.regenerateSlotQuestion(calculatedSlot);

      // Notify callbacks
      this.onSlotChangeCallbacks.forEach(cb => cb(calculatedSlot));
    }

    this.questions.forEach((q, id) => {
      if (q.status === 'RESOLVED') return;

      if (now >= q.resolvesAt) {
        // Time to resolve
        this.resolveQuestion(id);
      } else if (now >= q.closesAt) {
        if (q.status !== 'CLOSED') {
          q.status = 'CLOSED';
          console.log(`[Oracle] Question ${q.slot} CLOSED`);
        }
      } else if (now >= q.opensAt) {
        if (q.status !== 'OPEN') {
          q.status = 'OPEN';
          console.log(`[Oracle] Question ${q.slot} OPENED`);
          // Refresh context when status changes to OPEN
          this.refreshQuestionContext(id);
        }
      }
    });

    // Update current slot
    this.currentSlot = calculatedSlot;
  }

  /**
   * Regenerate a specific slot's question with fresh agent data
   */
  private regenerateSlotQuestion(slot: number): void {
    const agents = arenaQuantEngine.getAgents();
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    const opensAt = new Date(dayStart.getTime() + slot * this.SLOT_DURATION_MS);
    const closesAt = new Date(opensAt.getTime() + this.BETTING_WINDOW_MS);
    const resolvesAt = new Date(opensAt.getTime() + this.SLOT_DURATION_MS);

    // Generate fresh context-aware question (cycles through 8 types)
    const generator = getQuestionGenerator(slot);
    const questionData = generator(agents, slot);

    const question: OracleQuestion = {
      id: `q-${dayStart.toISOString().split('T')[0]}-${slot}`,
      slot,
      tier: questionData.tier || 'ARENA',
      type: questionData.type || 'MOMENTUM_CHECK',
      title: questionData.title || 'Agent Challenge',
      question: questionData.question || 'Will the agent perform well?',
      context: questionData.context || '',
      options: questionData.options || [
        { id: 'yes', text: 'YES', emoji: '✅' },
        { id: 'no', text: 'NO', emoji: '❌' },
      ],
      difficulty: questionData.difficulty || 'EASY',
      baseReward: 500,
      opensAt,
      closesAt,
      resolvesAt,
      status: now >= closesAt ? 'CLOSED' : (now >= opensAt ? 'OPEN' : 'UPCOMING'),
      snapshot: questionData.snapshot || {},
    };

    this.questions.set(question.id, question);
    console.log(`[Oracle] Regenerated question for slot ${slot}:`, question.title);
  }

  /**
   * Refresh question context with latest agent data
   */
  private refreshQuestionContext(questionId: string): void {
    const q = this.questions.get(questionId);
    if (!q) return;

    const agents = arenaQuantEngine.getAgents();

    // Update context based on question type
    switch (q.type) {
      case 'MOMENTUM_CHECK': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const pnlDisplay = agent.totalPnLPercent >= 0
            ? `+${agent.totalPnLPercent.toFixed(2)}%`
            : `${agent.totalPnLPercent.toFixed(2)}%`;
          q.context = `${agent.name} is currently at ${pnlDisplay} with ${agent.wins}W/${agent.losses}L record`;
        }
        break;
      }
      case 'LEADER_DEFENSE': {
        const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
        q.context = `1st: ${sorted[0].name} ($${sorted[0].totalPnL.toFixed(0)}) | 2nd: ${sorted[1].name} ($${sorted[1].totalPnL.toFixed(0)})`;
        break;
      }
      case 'COMBINED_PNL': {
        const totalPnL = agents.reduce((sum, a) => sum + a.totalPnL, 0);
        q.context = `Combined PnL: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)} | Avg Win Rate: ${(agents.reduce((s, a) => s + a.winRate, 0) / 3).toFixed(0)}%`;
        break;
      }
    }
  }

  /**
   * Resolve a question based on current agent state
   */
  private resolveQuestion(questionId: string): void {
    const q = this.questions.get(questionId);
    if (!q || q.status === 'RESOLVED') return;

    const agents = arenaQuantEngine.getAgents();
    let correctAnswer: string = 'no';

    switch (q.type) {
      case 'MOMENTUM_CHECK': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const wasPositive = (q.snapshot.currentPnLPercent || 0) >= 0;
          const isPositive = agent.totalPnLPercent >= 0;
          // If was positive: YES means stayed positive
          // If was negative: YES means recovered to positive
          correctAnswer = wasPositive
            ? (isPositive ? 'yes' : 'no')
            : (isPositive ? 'yes' : 'no');
        }
        break;
      }

      case 'STREAK_CONTINUE': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const oldStreak = q.snapshot.currentStreak || 0;
          const oldType = q.snapshot.streakType;
          // Streak continued if count increased or stayed same with same type
          const continued = agent.streakType === oldType && agent.streakCount >= oldStreak;
          correctAnswer = continued ? 'yes' : 'no';
        }
        break;
      }

      case 'LEADER_DEFENSE': {
        const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
        const stillLeader = sorted[0].id === q.snapshot.agentId;
        correctAnswer = stillLeader ? 'yes' : 'no';
        break;
      }

      case 'TRADE_OUTCOME':
      case 'NEXT_TRADE_WIN': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          // Check if PnL improved (simplified check)
          const pnlImproved = agent.totalPnL > (q.snapshot.currentPnL || 0);
          correctAnswer = pnlImproved ? 'yes' : 'no';
        }
        break;
      }

      case 'COMBINED_PNL': {
        const totalPnL = agents.reduce((sum, a) => sum + a.totalPnL, 0);
        const wasPositive = (q.snapshot.combinedPnL || 0) >= 0;
        const improved = totalPnL > (q.snapshot.combinedPnL || 0);
        // YES means higher/recovered
        correctAnswer = improved ? 'yes' : 'no';
        break;
      }

      case 'WINRATE_HOLD': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const threshold = Math.floor((q.snapshot.winRate || 50) / 5) * 5;
          correctAnswer = agent.winRate >= threshold ? 'yes' : 'no';
        }
        break;
      }

      case 'BEAT_LEADER': {
        const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
        const underdog = agents.find(a => a.id === q.snapshot.agentId);
        if (underdog) {
          const leader = sorted[0];
          const currentGap = leader.totalPnL - underdog.totalPnL;
          const oldGap = q.snapshot.leaderLead || 0;
          const closedGap = oldGap - currentGap;
          // Closed 50% of gap?
          correctAnswer = closedGap >= oldGap * 0.5 ? 'yes' : 'no';
        }
        break;
      }

      case 'TRADE_COUNT': {
        const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
        const target = (q.snapshot.tradeCount || 0) + 5;
        correctAnswer = totalTrades >= target ? 'yes' : 'no';
        break;
      }
    }

    q.correctAnswer = correctAnswer;
    q.status = 'RESOLVED';

    console.log(`[Oracle] Resolved ${questionId}: ${correctAnswer}`);
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getCurrentQuestion(): OracleQuestion | null {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const currentSlot = this.calculateCurrentSlot();

    // Get question for current slot by ID (most reliable)
    const currentQuestionId = `q-${dayStart.toISOString().split('T')[0]}-${currentSlot}`;
    const currentQuestion = this.questions.get(currentQuestionId);

    if (currentQuestion) {
      return currentQuestion;
    }

    // Fallback: search by slot
    for (const q of this.questions.values()) {
      if (q.slot === currentSlot) {
        return q;
      }
    }

    // Last fallback: return any OPEN or CLOSED question
    for (const q of this.questions.values()) {
      if (q.status === 'OPEN' || (q.status === 'CLOSED' && now < q.resolvesAt)) {
        return q;
      }
    }

    return null;
  }

  /**
   * Register a callback for slot changes
   */
  onSlotChange(callback: (newSlot: number) => void): () => void {
    this.onSlotChangeCallbacks.push(callback);
    return () => {
      const index = this.onSlotChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onSlotChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get the current slot number (0-11)
   */
  getCurrentSlot(): number {
    return this.calculateCurrentSlot();
  }

  /**
   * Check if the slot has changed since last check
   */
  hasSlotChanged(): boolean {
    return this.calculateCurrentSlot() !== this.lastSlot;
  }

  getTodaysQuestions(): OracleQuestion[] {
    return Array.from(this.questions.values()).sort((a, b) => a.slot - b.slot);
  }

  getQuestion(id: string): OracleQuestion | null {
    return this.questions.get(id) || null;
  }

  makePrediction(questionId: string, optionId: string): { success: boolean; error?: string } {
    const question = this.questions.get(questionId);

    if (!question) {
      return { success: false, error: 'Question not found' };
    }

    if (question.status !== 'OPEN') {
      return { success: false, error: 'Betting window closed' };
    }

    if (this.userPredictions.has(questionId)) {
      return { success: false, error: 'Already predicted on this question' };
    }

    const prediction: UserPrediction = {
      questionId,
      selectedOption: optionId,
      predictedAt: Date.now(),
      potentialReward: question.baseReward,
    };

    this.userPredictions.set(questionId, prediction);

    // Persist to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('qx_predictions') || '{}');
      stored[questionId] = prediction;
      localStorage.setItem('qx_predictions', JSON.stringify(stored));
    } catch (e) {}

    return { success: true };
  }

  getUserPrediction(questionId: string): UserPrediction | null {
    // First check memory
    if (this.userPredictions.has(questionId)) {
      return this.userPredictions.get(questionId)!;
    }

    // Check localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('qx_predictions') || '{}');
      if (stored[questionId]) {
        this.userPredictions.set(questionId, stored[questionId]);
        return stored[questionId];
      }
    } catch (e) {}

    return null;
  }

  getTimeUntilNextSlot(): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    // Calculate next slot, wrapping to next day if we're at the last slot
    const nextSlot = (this.currentSlot + 1) % TOTAL_DAILY_SLOTS;
    const nextSlotDay = nextSlot === 0 ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : dayStart;
    const nextSlotStart = new Date(nextSlotDay.getTime() + nextSlot * this.SLOT_DURATION_MS);

    const diff = Math.max(0, nextSlotStart.getTime() - now.getTime());

    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  }

  getCurrentSlotInfo(): { slot: number; name: string; totalSlots: number } {
    // 8 slot types that cycle through 48 daily slots
    const slotTypes = [
      'Momentum Check',    // 0: Will agent stay positive?
      'Streak Watch',      // 1: Will streak continue?
      'Leader Defense',    // 2: Will leader maintain?
      'Trade Outcome',     // 3: Will trade profit?
      'Combined PnL',      // 4: Will combined go up?
      'Win Rate Hold',     // 5: Will win rate hold?
      'Underdog Rally',    // 6: Can underdog catch up?
      'Trading Activity',  // 7: Will trades hit target?
    ];

    // Use modulo to cycle through 8 types for all 48 slots
    const slotType = slotTypes[this.currentSlot % slotTypes.length];

    return {
      slot: this.currentSlot,
      name: slotType,
      totalSlots: TOTAL_DAILY_SLOTS,
    };
  }

  /**
   * Get total number of daily slots
   */
  getTotalDailySlots(): number {
    return TOTAL_DAILY_SLOTS;
  }

  /**
   * Get user's prediction statistics calculated from localStorage
   * Returns real-time stats based on resolved predictions
   *
   * Reward Structure:
   * - 500 QX for correct prediction
   * - 100 QX for participation (trying, even if wrong)
   * - 50 QX bonus for every 3 consecutive wins
   */
  getUserStats(): UserStats {
    const predictions = Array.from(this.userPredictions.values());

    let totalPredictions = predictions.length;
    let correctPredictions = 0;
    let totalQXEarned = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let streakBonusCount = 0;

    // Match predictions with resolved questions to calculate stats
    const sortedPredictions = predictions
      .map(p => {
        const question = this.questions.get(p.questionId);
        return { prediction: p, question };
      })
      .filter(p => p.question?.status === 'RESOLVED')
      .sort((a, b) => (a.question?.slot || 0) - (b.question?.slot || 0));

    sortedPredictions.forEach(({ prediction, question }) => {
      if (!question) return;

      const isCorrect = prediction.selectedOption === question.correctAnswer;

      // Participation bonus: 100 QX for trying
      totalQXEarned += 100;

      if (isCorrect) {
        correctPredictions++;
        // Win bonus: 500 QX for correct prediction
        totalQXEarned += 500;
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);

        // Streak bonus: 50 QX for every 3 consecutive wins
        if (tempStreak > 0 && tempStreak % 3 === 0) {
          totalQXEarned += 50;
          streakBonusCount++;
        }
      } else {
        tempStreak = 0;
      }
    });

    // Current streak is the last consecutive wins
    currentStreak = tempStreak;

    // Calculate accuracy (only from resolved predictions)
    const resolvedPredictions = sortedPredictions.length;
    const accuracy = resolvedPredictions > 0
      ? Math.round((correctPredictions / resolvedPredictions) * 100)
      : 0;

    return {
      totalQXEarned,
      totalPredictions,
      correctPredictions,
      currentStreak,
      bestStreak,
      accuracy,
    };
  }

  /**
   * Get all predictions the user has made
   */
  getAllUserPredictions(): Array<{ prediction: UserPrediction; question: OracleQuestion | null }> {
    return Array.from(this.userPredictions.entries()).map(([questionId, prediction]) => ({
      prediction,
      question: this.questions.get(questionId) || null,
    }));
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const oracleQuestionEngine = new OracleQuestionEngine();
export default oracleQuestionEngine;

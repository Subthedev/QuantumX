/**
 * ORACLE QUESTION ENGINE v5.0 - PROGRESSIVE PREDICTION SYSTEM
 *
 * 48 Slots with PROGRESSIVE DIFFICULTY (1-48):
 * - AGENTIC (Slots 1-16): Agent trading fundamentals
 * - MARKET (Slots 17-32): Market analysis concepts
 * - AGENTS VS MARKET (Slots 33-48): Advanced comparative analysis
 *
 * Key Features:
 * - Progressive difficulty from slot 1 (easiest) to slot 48 (hardest)
 * - Intuitive, clear predictions
 * - Learning progression from basics to advanced concepts
 * - Professional minimal design (no emojis)
 */

import { arenaQuantEngine, type QuantAgent } from './arenaQuantEngine';

// =====================================================
// TYPES
// =====================================================

export type QuestionTier = 'AGENTIC' | 'MARKET' | 'AGENTS_VS_MARKET';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5; // 1=Beginner, 5=Expert

export type QuestionType =
  // AGENTIC (Agent Trading) types - Fundamentals
  | 'AGENT_MOMENTUM'
  | 'AGENT_STREAK'
  | 'AGENT_WINRATE'
  | 'AGENT_NEXT_TRADE'
  | 'AGENT_LEADER'
  | 'AGENT_RECOVERY'
  // MARKET types - Intermediate
  | 'MARKET_DIRECTION'
  | 'MARKET_VOLATILITY'
  | 'MARKET_DOMINANCE'
  | 'MARKET_SENTIMENT'
  | 'MARKET_ALTCOIN'
  // AGENTS VS MARKET types - Advanced
  | 'AVM_BEAT_BTC'
  | 'AVM_BEAT_MARKET'
  | 'AVM_ALPHA_GENERATION'
  | 'AVM_CORRELATION'
  | 'AVM_OUTPERFORM';

export interface LiveHintData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  unit?: string;
  highlight?: boolean;
  _tick?: number; // Internal: Forces React re-render by changing every update
  isLive?: boolean; // Marks this hint as live-updating (boxes 3-4)
}

export interface OracleQuestion {
  id: string;
  slot: number;
  tier: QuestionTier;
  tierIndex: number;
  type: QuestionType;
  title: string;
  question: string;
  context: string;
  liveHints: LiveHintData[];
  learningInsight: string;
  difficultyLevel: DifficultyLevel;
  options: { id: string; text: string }[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  baseReward: number;
  opensAt: Date;
  closesAt: Date;
  resolvesAt: Date;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
  correctAnswer?: string;
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
    btcPrice?: number;
    btcChange24h?: number;
    marketSentiment?: number;
    agentVsMarket?: number;
  };
}

export interface UserPrediction {
  questionId: string;
  selectedOption: string;
  predictedAt: number;
  potentialReward: number;
  // Persisted outcome fields - updated when question resolves
  isCorrect?: boolean | null;
  correctAnswer?: string;
  resolvedAt?: number;
  earnedReward?: number;
}

export interface UserStats {
  totalQXEarned: number;
  totalPredictions: number;
  correctPredictions: number;
  resolvedPredictions: number;
  currentStreak: number;
  bestStreak: number;
  accuracy: number;
}

export interface MarketData {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  marketCap: number;
  dominance: number;
  fearGreedIndex: number;
  volume24h: number;
}

// =====================================================
// TIER CONFIGURATION (Professional - No Emojis)
// =====================================================

const TIER_CONFIG = {
  AGENTIC: {
    slots: [0, 15],
    color: 'emerald',
    name: 'Agentic',
    description: 'Agent trading performance',
  },
  MARKET: {
    slots: [16, 31],
    color: 'blue',
    name: 'Market',
    description: 'Market movement analysis',
  },
  AGENTS_VS_MARKET: {
    slots: [32, 47],
    color: 'violet',
    name: 'Agents vs Market',
    description: 'Comparative performance analysis',
  },
};

// Get tier from slot number
function getTierFromSlot(slot: number): QuestionTier {
  if (slot <= 15) return 'AGENTIC';
  if (slot <= 31) return 'MARKET';
  return 'AGENTS_VS_MARKET';
}

// Get tier index (0-15 within each tier)
function getTierIndex(slot: number): number {
  if (slot <= 15) return slot;
  if (slot <= 31) return slot - 16;
  return slot - 32;
}

// Calculate difficulty level (1-5) based on slot position
function getDifficultyLevel(slot: number): DifficultyLevel {
  // Progressive: slots 0-9 = L1, 10-19 = L2, 20-29 = L3, 30-39 = L4, 40-47 = L5
  if (slot < 10) return 1;
  if (slot < 20) return 2;
  if (slot < 30) return 3;
  if (slot < 40) return 4;
  return 5;
}

// Get difficulty label based on level
function getDifficultyLabel(level: DifficultyLevel): 'EASY' | 'MEDIUM' | 'HARD' {
  if (level <= 2) return 'EASY';
  if (level <= 3) return 'MEDIUM';
  return 'HARD';
}

// Calculate reward based on difficulty level
function getBaseReward(level: DifficultyLevel): number {
  const rewards = { 1: 400, 2: 500, 3: 600, 4: 750, 5: 1000 };
  return rewards[level];
}

// Total slots per day
const TOTAL_DAILY_SLOTS = 48;
const SLOTS_PER_TIER = 16;

// =====================================================
// REAL-TIME MARKET DATA SIMULATION
// Stateful simulation with smooth micro-fluctuations
// =====================================================

// Persistent market state for realistic real-time updates
const marketState = {
  btcPrice: 97500,
  btcChange24h: 1.25,
  ethPrice: 3705,
  marketCap: 3.45,
  dominance: 54.2,
  fearGreedIndex: 62,
  volume24h: 125,
  lastUpdate: Date.now(),
  // Micro-tick state for smooth animations
  microTick: 0,
  // Direction biases (change every 10-30 seconds)
  priceBias: 1,
  sentimentBias: 1,
  lastBiasChange: Date.now(),
};

/**
 * Get real-time market data with smooth micro-fluctuations
 * Values change smoothly every call, creating visible real-time updates
 */
function getSimulatedMarketData() {
  const now = Date.now();
  marketState.microTick++;

  // Change direction bias every 10-30 seconds for realistic movement
  if (now - marketState.lastBiasChange > 10000 + Math.random() * 20000) {
    marketState.priceBias = Math.random() > 0.5 ? 1 : -1;
    marketState.sentimentBias = Math.random() > 0.5 ? 1 : -1;
    marketState.lastBiasChange = now;
  }

  // MICRO-FLUCTUATIONS: Small but visible changes on every tick
  // BTC price: ±$5-15 per tick (visible on millisecond updates)
  const btcMicroMove = (Math.random() - 0.45) * 12 * marketState.priceBias;
  marketState.btcPrice = Math.max(95000, Math.min(100000,
    marketState.btcPrice + btcMicroMove
  ));

  // 24h change: ±0.01% per tick
  const changeMicroMove = (Math.random() - 0.48) * 0.03 * marketState.priceBias;
  marketState.btcChange24h = Math.max(-5, Math.min(5,
    marketState.btcChange24h + changeMicroMove
  ));

  // ETH price: follows BTC with slight lag
  const ethMicroMove = (Math.random() - 0.45) * 2 * marketState.priceBias;
  marketState.ethPrice = Math.max(3500, Math.min(4000,
    marketState.ethPrice + ethMicroMove
  ));

  // Market cap: slow drift
  if (marketState.microTick % 10 === 0) {
    marketState.marketCap += (Math.random() - 0.5) * 0.005;
    marketState.marketCap = Math.max(3.3, Math.min(3.6, marketState.marketCap));
  }

  // Dominance: slow drift
  if (marketState.microTick % 15 === 0) {
    marketState.dominance += (Math.random() - 0.48) * 0.05 * marketState.priceBias;
    marketState.dominance = Math.max(52, Math.min(56, marketState.dominance));
  }

  // Fear/Greed: changes every few ticks
  if (marketState.microTick % 8 === 0) {
    marketState.fearGreedIndex += Math.floor((Math.random() - 0.5) * 2) * marketState.sentimentBias;
    marketState.fearGreedIndex = Math.max(25, Math.min(80, marketState.fearGreedIndex));
  }

  // Volume: fluctuates
  if (marketState.microTick % 5 === 0) {
    marketState.volume24h += (Math.random() - 0.5) * 2;
    marketState.volume24h = Math.max(100, Math.min(150, marketState.volume24h));
  }

  marketState.lastUpdate = now;

  return {
    btcPrice: Math.round(marketState.btcPrice * 100) / 100,
    btcChange24h: Math.round(marketState.btcChange24h * 100) / 100,
    ethPrice: Math.round(marketState.ethPrice * 100) / 100,
    marketCap: Math.round(marketState.marketCap * 1000) / 1000,
    dominance: Math.round(marketState.dominance * 10) / 10,
    fearGreedIndex: Math.round(marketState.fearGreedIndex),
    volume24h: Math.round(marketState.volume24h),
  };
}

// =====================================================
// STATIC LIVE HINTS (Always shown - updates with data)
// =====================================================

/**
 * Generate the 2 static hint boxes that appear on all questions
 * Box 1: Active Agents - Shows count and combined P&L
 * Box 2: Total Trades - Shows trade count and overall win rate
 */
function getStaticHints(agents: QuantAgent[]): LiveHintData[] {
  const totalPnL = agents.reduce((sum, a) => sum + a.totalPnL, 0);
  const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
  const totalWins = agents.reduce((sum, a) => sum + a.wins, 0);
  const overallWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const avgPnLPercent = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / agents.length;

  return [
    {
      label: 'Active Agents',
      value: `${agents.length}`,
      trend: avgPnLPercent >= 0 ? 'up' : 'down',
    },
    {
      label: 'Total Trades',
      value: totalTrades,
      trend: overallWinRate >= 55 ? 'up' : overallWinRate < 45 ? 'down' : 'neutral',
    },
  ];
}

// =====================================================
// AGENTIC TIER GENERATORS (Slots 0-15)
// =====================================================

function generateAgentMomentumQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const sortedByPnL = [...agents].sort((a, b) => Math.abs(b.totalPnLPercent) - Math.abs(a.totalPnLPercent));
  const target = sortedByPnL[tierIndex % 3];
  const isPositive = target.totalPnLPercent >= 0;
  const pnlDisplay = `${isPositive ? '+' : ''}${target.totalPnLPercent.toFixed(2)}%`;
  const diffLevel = getDifficultyLevel(tierIndex);

  return {
    type: 'AGENT_MOMENTUM',
    tier: 'AGENTIC',
    title: `${target.name} Performance Direction`,
    question: isPositive
      ? `Will ${target.name} maintain positive returns in the next 30 minutes?`
      : `Will ${target.name} recover to positive returns?`,
    context: `Current: ${pnlDisplay} | Record: ${target.wins}W/${target.losses}L`,
    liveHints: [
      { label: target.name, value: pnlDisplay, trend: isPositive ? 'up' : 'down', highlight: true },
      { label: 'Win Rate', value: `${target.winRate.toFixed(1)}%`, trend: target.winRate >= 55 ? 'up' : target.winRate < 45 ? 'down' : 'neutral' },
      { label: 'Record', value: `${target.wins}W / ${target.losses}L` },
      { label: 'Trades', value: target.totalTrades.toString(), trend: target.totalTrades > 10 ? 'up' : 'neutral' },
    ],
    learningInsight: diffLevel <= 2
      ? `BASICS: Momentum refers to the tendency of performance to persist. Positive P&L often continues due to winning strategies adapting well to current conditions.`
      : `INSIGHT: Statistical momentum in trading shows 60-65% continuation probability. Consider recent trade velocity and market conditions.`,
    options: [
      { id: 'yes', text: isPositive ? 'Yes, maintains positive' : 'Yes, recovers to positive' },
      { id: 'no', text: isPositive ? 'No, turns negative' : 'No, stays negative' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      currentPnL: target.totalPnL,
      currentPnLPercent: target.totalPnLPercent,
    },
  };
}

function generateAgentStreakQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const withStreaks = agents.filter(a => a.streakCount >= 2);
  const target = withStreaks.length > 0
    ? withStreaks.sort((a, b) => b.streakCount - a.streakCount)[0]
    : agents[tierIndex % 3];

  const hasStreak = target.streakCount >= 2;
  const streakText = target.streakType === 'WIN' ? 'winning' : 'losing';
  const diffLevel = getDifficultyLevel(tierIndex);

  return {
    type: 'AGENT_STREAK',
    tier: 'AGENTIC',
    title: hasStreak ? `${target.name} Streak Analysis` : `${target.name} Trade Prediction`,
    question: hasStreak
      ? `${target.name} has a ${target.streakCount}-trade ${streakText} streak. Will it continue?`
      : `Will ${target.name}'s next trade result in a profit?`,
    context: hasStreak
      ? `Active ${target.streakCount}-trade ${streakText} streak`
      : `Win rate: ${target.winRate.toFixed(1)}% across ${target.totalTrades} trades`,
    liveHints: [
      { label: 'Streak', value: `${target.streakCount} ${target.streakType || 'N/A'}`, trend: target.streakType === 'WIN' ? 'up' : 'down', highlight: hasStreak },
      { label: target.name, value: `${target.winRate.toFixed(1)}%`, trend: target.winRate >= 55 ? 'up' : 'neutral' },
      { label: 'Record', value: `${target.wins}W / ${target.losses}L` },
      { label: 'P&L', value: `${target.totalPnLPercent >= 0 ? '+' : ''}${target.totalPnLPercent.toFixed(2)}%`, trend: target.totalPnLPercent >= 0 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 2
      ? `BASICS: A streak is a series of consecutive wins or losses. Streaks are common but statistically tend to break after 3-4 outcomes.`
      : `ADVANCED: Mean reversion suggests extreme streaks are unlikely to persist. However, hot-hand theory argues skilled agents may genuinely perform better when on a roll.`,
    options: [
      { id: 'yes', text: hasStreak ? 'Yes, streak continues' : 'Yes, next trade wins' },
      { id: 'no', text: hasStreak ? 'No, streak breaks' : 'No, next trade loses' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      currentStreak: target.streakCount,
      streakType: target.streakType,
      winRate: target.winRate,
    },
  };
}

function generateAgentWinrateQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const sorted = [...agents].sort((a, b) => b.winRate - a.winRate);
  const target = sorted[tierIndex % 3];
  const threshold = Math.floor(target.winRate / 5) * 5;
  const diffLevel = getDifficultyLevel(tierIndex);

  return {
    type: 'AGENT_WINRATE',
    tier: 'AGENTIC',
    title: `${target.name} Win Rate Threshold`,
    question: `${target.name} currently has a ${target.winRate.toFixed(1)}% win rate. Will it remain above ${threshold}%?`,
    context: `Current: ${target.winRate.toFixed(1)}% | Threshold: ${threshold}%`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Current Rate', value: target.winRate.toFixed(1), unit: '%', highlight: true },
      { label: 'Target', value: threshold, unit: '%' },
    ],
    learningInsight: diffLevel <= 2
      ? `BASICS: Win rate = (Wins / Total Trades) x 100. A 60% win rate means 6 wins out of every 10 trades.`
      : `ADVANCED: Win rate sensitivity: With ${target.totalTrades} trades, one loss changes win rate by ${(100 / (target.totalTrades + 1)).toFixed(1)}%. More trades = more stable rate.`,
    options: [
      { id: 'yes', text: `Yes, stays above ${threshold}%` },
      { id: 'no', text: `No, drops below ${threshold}%` },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      winRate: target.winRate,
      tradeCount: target.totalTrades,
    },
  };
}

function generateAgentLeaderQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
  const leader = sorted[0];
  const second = sorted[1];
  const lead = leader.totalPnL - second.totalPnL;
  const diffLevel = getDifficultyLevel(tierIndex);

  return {
    type: 'AGENT_LEADER',
    tier: 'AGENTIC',
    title: 'Leaderboard Position',
    question: `${leader.name} leads ${second.name} by $${lead.toFixed(0)}. Will ${leader.name} maintain the lead?`,
    context: `1st: ${leader.name} ($${leader.totalPnL.toFixed(0)}) | 2nd: ${second.name} ($${second.totalPnL.toFixed(0)})`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Leader', value: leader.name, highlight: true },
      { label: 'Lead', value: `$${lead.toFixed(0)}`, trend: 'up' },
    ],
    learningInsight: diffLevel <= 2
      ? `BASICS: Leaderboard rankings are based on total P&L (profit & loss). The agent with highest total profit is #1.`
      : `ADVANCED: With a $${lead.toFixed(0)} lead, ${leader.name} has a buffer of approximately ${Math.floor(lead / 50)} losing trades. ${second.name} needs ~${Math.ceil(lead / 100)} profitable trades to overtake.`,
    options: [
      { id: 'yes', text: `Yes, ${leader.name} stays #1` },
      { id: 'no', text: `No, ${second.name} takes the lead` },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: leader.id,
      agentName: leader.name,
      currentLeader: leader.id,
      leaderLead: lead,
      currentPnL: leader.totalPnL,
    },
  };
}

function generateAgentNextTradeQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const target = agents[tierIndex % 3];
  const withPosition = agents.filter(a => a.currentPosition !== null);
  const diffLevel = getDifficultyLevel(tierIndex);

  if (withPosition.length > 0) {
    const activeAgent = withPosition[0];
    const pos = activeAgent.currentPosition!;

    return {
      type: 'AGENT_NEXT_TRADE',
      tier: 'AGENTIC',
      title: 'Active Position Outcome',
      question: `${activeAgent.name} has an active ${pos.direction} position on ${pos.displaySymbol}. Will this trade close in profit?`,
      context: `Entry: $${pos.entryPrice.toFixed(2)} | Current: $${pos.currentPrice.toFixed(2)}`,
      liveHints: [
        ...getStaticHints(agents),
        // Dynamic hints for this question
        { label: 'Position', value: pos.direction, highlight: true },
        { label: 'Unrealized', value: `${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%`, trend: pos.pnlPercent >= 0 ? 'up' : 'down' },
      ],
      learningInsight: diffLevel <= 2
        ? `BASICS: ${pos.direction} means the agent profits when price ${pos.direction === 'LONG' ? 'goes up' : 'goes down'}. Current unrealized P&L shows paper profit/loss before trade closes.`
        : `ADVANCED: Position management includes stop-loss and take-profit levels. Current ${Math.abs(pos.pnlPercent).toFixed(2)}% move suggests ${pos.pnlPercent >= 0 ? 'favorable' : 'adverse'} conditions.`,
      options: [
        { id: 'yes', text: 'Yes, closes in profit' },
        { id: 'no', text: 'No, closes in loss' },
      ],
      difficultyLevel: diffLevel,
      difficulty: getDifficultyLabel(diffLevel),
      baseReward: getBaseReward(diffLevel),
      snapshot: {
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        currentPnL: pos.pnl,
        currentPnLPercent: pos.pnlPercent,
      },
    };
  }

  return {
    type: 'AGENT_NEXT_TRADE',
    tier: 'AGENTIC',
    title: `${target.name} Trade Outcome`,
    question: `Based on ${target.name}'s performance, will the next trade be profitable?`,
    context: `Historical win rate: ${target.winRate.toFixed(1)}% from ${target.totalTrades} trades`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Win Rate', value: target.winRate.toFixed(1), unit: '%', highlight: true },
      { label: 'Record', value: `${target.wins}W / ${target.losses}L` },
    ],
    learningInsight: diffLevel <= 2
      ? `BASICS: Win rate indicates probability. A ${target.winRate.toFixed(0)}% win rate means roughly ${target.winRate.toFixed(0)} out of 100 trades are winners.`
      : `ADVANCED: Past performance doesn't guarantee future results, but consistent win rates above 55% indicate edge in strategy execution.`,
    options: [
      { id: 'yes', text: 'Yes, next trade wins' },
      { id: 'no', text: 'No, next trade loses' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      winRate: target.winRate,
      tradeCount: target.totalTrades,
    },
  };
}

function generateAgentRecoveryQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const negativeAgents = agents.filter(a => a.totalPnLPercent < 0);
  const target = negativeAgents.length > 0
    ? negativeAgents.sort((a, b) => b.totalPnLPercent - a.totalPnLPercent)[0]
    : agents[tierIndex % 3];

  const isNegative = target.totalPnLPercent < 0;
  const diffLevel = getDifficultyLevel(tierIndex);

  return {
    type: 'AGENT_RECOVERY',
    tier: 'AGENTIC',
    title: isNegative ? `${target.name} Recovery Potential` : `${target.name} Continuation`,
    question: isNegative
      ? `${target.name} is down ${Math.abs(target.totalPnLPercent).toFixed(2)}%. Will it recover at least 50% of losses?`
      : `${target.name} is up ${target.totalPnLPercent.toFixed(2)}%. Will gains increase by at least 25%?`,
    context: `Current: ${target.totalPnLPercent >= 0 ? '+' : ''}${target.totalPnLPercent.toFixed(2)}% ($${target.totalPnL.toFixed(0)})`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Current P&L', value: `${target.totalPnLPercent >= 0 ? '+' : ''}${target.totalPnLPercent.toFixed(2)}%`, trend: target.totalPnLPercent >= 0 ? 'up' : 'down', highlight: true },
      { label: 'Win Rate', value: target.winRate.toFixed(1), unit: '%', trend: target.winRate >= 55 ? 'up' : 'neutral' },
    ],
    learningInsight: diffLevel <= 2
      ? `BASICS: ${isNegative ? 'Recovery requires consistent winning trades to offset previous losses.' : 'Continued gains depend on maintaining current strategy effectiveness.'}`
      : `ADVANCED: ${isNegative ? `Recovery requires approximately ${Math.ceil(Math.abs(target.totalPnL) * 0.5 / 50)} winning trades at $50 avg profit.` : 'Diminishing returns and market regime changes often limit extended winning streaks.'}`,
    options: [
      { id: 'yes', text: isNegative ? 'Yes, recovers 50%+' : 'Yes, grows 25%+' },
      { id: 'no', text: isNegative ? 'No, remains in loss' : 'No, gains plateau or decline' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: target.id,
      agentName: target.name,
      currentPnL: target.totalPnL,
      currentPnLPercent: target.totalPnLPercent,
    },
  };
}

// =====================================================
// MARKET TIER GENERATORS (Slots 16-31)
// =====================================================

function generateMarketDirectionQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const market = getSimulatedMarketData();
  const isUp = market.btcChange24h >= 0;
  const diffLevel = getDifficultyLevel(16 + tierIndex);

  return {
    type: 'MARKET_DIRECTION',
    tier: 'MARKET',
    title: 'Bitcoin Price Direction',
    question: `BTC is ${isUp ? 'up' : 'down'} ${Math.abs(market.btcChange24h).toFixed(2)}% today. Will it ${isUp ? 'continue rising' : 'start recovering'}?`,
    context: `Current: $${market.btcPrice.toLocaleString()} | 24h: ${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'BTC Price', value: `$${market.btcPrice.toLocaleString()}`, highlight: true },
      { label: '24h Change', value: `${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`, trend: isUp ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `INTERMEDIATE: Price direction often follows recent momentum. Bullish days tend to continue bullish in the short term ~55% of the time.`
      : `ADVANCED: Momentum persistence varies with volume and volatility. High volume confirms direction; low volume suggests potential reversal.`,
    options: [
      { id: 'yes', text: isUp ? 'Yes, continues up' : 'Yes, recovers' },
      { id: 'no', text: isUp ? 'No, reverses down' : 'No, falls further' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      btcPrice: market.btcPrice,
      btcChange24h: market.btcChange24h,
    },
  };
}

function generateMarketVolatilityQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const market = getSimulatedMarketData();
  const highVolatility = Math.abs(market.btcChange24h) > 2;
  const diffLevel = getDifficultyLevel(16 + tierIndex);

  return {
    type: 'MARKET_VOLATILITY',
    tier: 'MARKET',
    title: 'Volatility Forecast',
    question: `Current volatility is ${highVolatility ? 'elevated' : 'subdued'}. Will volatility increase in the next 30 minutes?`,
    context: `24h range: ${Math.abs(market.btcChange24h * 1.5).toFixed(2)}% | Market state: ${highVolatility ? 'Active' : 'Calm'}`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Volatility', value: highVolatility ? 'High' : 'Low', highlight: true },
      { label: '24h Move', value: `${Math.abs(market.btcChange24h).toFixed(2)}%`, trend: highVolatility ? 'up' : 'neutral' },
    ],
    learningInsight: diffLevel <= 3
      ? `INTERMEDIATE: Volatility measures price movement intensity. High volatility means larger price swings in both directions.`
      : `ADVANCED: Volatility clustering: Periods of high volatility tend to be followed by more volatility. Low volatility often precedes breakouts.`,
    options: [
      { id: 'yes', text: 'Yes, volatility increases' },
      { id: 'no', text: 'No, volatility decreases' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      btcPrice: market.btcPrice,
      btcChange24h: market.btcChange24h,
    },
  };
}

function generateMarketSentimentQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const market = getSimulatedMarketData();
  const sentiment = market.fearGreedIndex;
  const sentimentLabel = sentiment >= 75 ? 'Extreme Greed' : sentiment >= 55 ? 'Greed' : sentiment >= 45 ? 'Neutral' : sentiment >= 25 ? 'Fear' : 'Extreme Fear';
  const diffLevel = getDifficultyLevel(16 + tierIndex);

  return {
    type: 'MARKET_SENTIMENT',
    tier: 'MARKET',
    title: 'Market Sentiment Analysis',
    question: `Market sentiment reads "${sentimentLabel}" (${sentiment}/100). Will the sentiment index rise?`,
    context: `Fear & Greed Index: ${sentiment}/100 | Classification: ${sentimentLabel}`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Sentiment', value: sentimentLabel, highlight: true },
      { label: 'Index Value', value: `${sentiment}/100`, trend: sentiment > 50 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `INTERMEDIATE: The Fear & Greed Index measures market emotion. Scores 0-25 indicate fear, 75-100 indicate greed.`
      : `ADVANCED: Contrarian indicator: Extreme readings (below 20 or above 80) historically precede reversals. Current ${sentimentLabel} suggests ${sentiment > 50 ? 'potential overbuying' : 'potential overselling'}.`,
    options: [
      { id: 'yes', text: 'Yes, sentiment rises' },
      { id: 'no', text: 'No, sentiment falls' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      marketSentiment: sentiment,
      btcChange24h: market.btcChange24h,
    },
  };
}

function generateMarketDominanceQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const market = getSimulatedMarketData();
  const diffLevel = getDifficultyLevel(16 + tierIndex);

  return {
    type: 'MARKET_DOMINANCE',
    tier: 'MARKET',
    title: 'BTC Market Dominance',
    question: `BTC dominance is currently ${market.dominance.toFixed(1)}%. Will it increase in the next 30 minutes?`,
    context: `BTC Market Share: ${market.dominance.toFixed(1)}% of $${market.marketCap.toFixed(2)}T total market`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'BTC Dominance', value: `${market.dominance.toFixed(1)}%`, highlight: true },
      { label: 'Total Market', value: `$${market.marketCap.toFixed(2)}T` },
    ],
    learningInsight: diffLevel <= 3
      ? `INTERMEDIATE: Dominance shows BTC's share of total crypto market cap. Higher dominance means more capital in BTC relative to altcoins.`
      : `ADVANCED: Rising dominance signals risk-off behavior (capital flows to BTC). Falling dominance often precedes "alt season" where smaller coins outperform.`,
    options: [
      { id: 'yes', text: 'Yes, dominance rises' },
      { id: 'no', text: 'No, altcoins gain share' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      btcPrice: market.btcPrice,
      btcChange24h: market.btcChange24h,
    },
  };
}

function generateMarketAltcoinQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const market = getSimulatedMarketData();
  const ethBtcRatio = market.ethPrice / market.btcPrice;
  const diffLevel = getDifficultyLevel(16 + tierIndex);

  return {
    type: 'MARKET_ALTCOIN',
    tier: 'MARKET',
    title: 'Altcoin Relative Performance',
    question: `Will altcoins outperform Bitcoin in the next 30 minutes?`,
    context: `ETH/BTC ratio: ${(ethBtcRatio * 1000).toFixed(3)} | BTC dominance: ${market.dominance.toFixed(1)}%`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'ETH/BTC Ratio', value: (ethBtcRatio * 1000).toFixed(3), highlight: true },
      { label: 'BTC Dominance', value: `${market.dominance.toFixed(1)}%`, trend: market.dominance > 54 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `INTERMEDIATE: Altcoin performance is measured relative to BTC. If alts rise more than BTC (or fall less), they outperform.`
      : `ADVANCED: Alt season typically occurs when BTC dominance drops below 50% with rising total market cap. ETH/BTC ratio is a key indicator of alt strength.`,
    options: [
      { id: 'yes', text: 'Yes, altcoins outperform' },
      { id: 'no', text: 'No, Bitcoin leads' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      btcPrice: market.btcPrice,
      btcChange24h: market.btcChange24h,
    },
  };
}

// =====================================================
// AGENTS VS MARKET TIER GENERATORS (Slots 32-47)
// =====================================================

function generateAvmBeatBtcQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const diffLevel = getDifficultyLevel(tierIndex + 32); // AVM starts at slot 32
  const market = getSimulatedMarketData();
  const combinedAgentReturn = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / 3;
  const agentVsBtc = combinedAgentReturn - market.btcChange24h;
  const avgWinRate = agents.reduce((s, a) => s + a.winRate, 0) / 3;

  return {
    type: 'AVM_BEAT_BTC',
    tier: 'AGENTS_VS_MARKET',
    title: 'Agents vs Bitcoin',
    question: `Agents are ${agentVsBtc >= 0 ? 'beating' : 'trailing'} BTC by ${Math.abs(agentVsBtc).toFixed(2)}%. Will agents outperform Bitcoin in the next 30 minutes?`,
    context: `Agents: ${combinedAgentReturn >= 0 ? '+' : ''}${combinedAgentReturn.toFixed(2)}% | BTC: ${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Agents Return', value: `${combinedAgentReturn >= 0 ? '+' : ''}${combinedAgentReturn.toFixed(2)}%`, trend: combinedAgentReturn >= 0 ? 'up' : 'down', highlight: true },
      { label: 'BTC Return', value: `${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`, trend: market.btcChange24h >= 0 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `BASICS: Alpha measures returns above a benchmark. Agents at ${agentVsBtc >= 0 ? '+' : ''}${agentVsBtc.toFixed(2)}% alpha ${agentVsBtc >= 0 ? 'are adding value beyond Bitcoin' : 'are underperforming a simple buy-and-hold'}.`
      : `ADVANCED: Active trading strategies historically outperform buy-and-hold 55-60% of the time in trending markets, but only 40-45% in ranging conditions. Current alpha: ${agentVsBtc.toFixed(2)}%.`,
    options: [
      { id: 'yes', text: 'Yes, agents outperform BTC' },
      { id: 'no', text: 'No, Bitcoin wins' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      combinedPnL: agents.reduce((sum, a) => sum + a.totalPnL, 0),
      btcPrice: market.btcPrice,
      btcChange24h: market.btcChange24h,
      agentVsMarket: agentVsBtc,
    },
  };
}

function generateAvmAlphaQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const diffLevel = getDifficultyLevel(tierIndex + 32);
  const market = getSimulatedMarketData();
  const combinedAgentReturn = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / 3;
  const alpha = combinedAgentReturn - market.btcChange24h;
  const isGeneratingAlpha = alpha > 0;
  const totalTrades = agents.reduce((s, a) => s + a.totalTrades, 0);

  return {
    type: 'AVM_ALPHA_GENERATION',
    tier: 'AGENTS_VS_MARKET',
    title: 'Alpha Generation',
    question: `Will agents generate positive alpha (beat the market) in the next 30 minutes?`,
    context: `Current alpha: ${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}% | ${isGeneratingAlpha ? 'Outperforming' : 'Underperforming'}`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Alpha', value: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}%`, trend: alpha >= 0 ? 'up' : 'down', highlight: true },
      { label: 'Market', value: `${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`, trend: market.btcChange24h >= 0 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `BASICS: Alpha = Agent Returns - Market Returns. Positive alpha means the agents are adding value beyond simply holding Bitcoin. Current alpha: ${alpha.toFixed(2)}%.`
      : `ADVANCED: Alpha generation requires consistent edge exploitation. With ${totalTrades} trades executed, the agents are ${isGeneratingAlpha ? 'demonstrating' : 'struggling to maintain'} statistical alpha through active position management.`,
    options: [
      { id: 'yes', text: 'Yes, positive alpha' },
      { id: 'no', text: 'No, negative alpha' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      combinedPnL: agents.reduce((sum, a) => sum + a.totalPnL, 0),
      btcChange24h: market.btcChange24h,
      agentVsMarket: alpha,
    },
  };
}

function generateAvmCorrelationQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const diffLevel = getDifficultyLevel(tierIndex + 32);
  const market = getSimulatedMarketData();
  const combinedAgentReturn = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / 3;
  const sameDirection = (combinedAgentReturn >= 0) === (market.btcChange24h >= 0);

  return {
    type: 'AVM_CORRELATION',
    tier: 'AGENTS_VS_MARKET',
    title: 'Correlation Analysis',
    question: `Agents are ${sameDirection ? 'correlated' : 'diverging'} with the market. Will they continue to move ${sameDirection ? 'together' : 'in opposite directions'}?`,
    context: `Agents: ${combinedAgentReturn >= 0 ? 'UP' : 'DOWN'} | Market: ${market.btcChange24h >= 0 ? 'UP' : 'DOWN'} | ${sameDirection ? 'Same direction' : 'Opposite'}`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Correlation', value: sameDirection ? 'Positive' : 'Negative', highlight: true },
      { label: 'Agent Dir.', value: combinedAgentReturn >= 0 ? 'UP' : 'DOWN', trend: combinedAgentReturn >= 0 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `BASICS: Correlation measures if agents move with or against the market. When correlated, both rise and fall together. Divergence means agents are trading independently of market direction.`
      : `ADVANCED: Market-neutral strategies deliberately maintain low correlation, profiting regardless of market direction. Current ${sameDirection ? 'positive' : 'negative'} correlation indicates ${sameDirection ? 'directional exposure' : 'potential hedging'}.`,
    options: [
      { id: 'yes', text: 'Yes, move together' },
      { id: 'no', text: 'No, they diverge' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      combinedPnL: agents.reduce((sum, a) => sum + a.totalPnL, 0),
      btcChange24h: market.btcChange24h,
      agentVsMarket: combinedAgentReturn - market.btcChange24h,
    },
  };
}

function generateAvmOutperformQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const diffLevel = getDifficultyLevel(tierIndex + 32);
  const market = getSimulatedMarketData();
  const sorted = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
  const bestAgent = sorted[0];
  const agentVsBtc = bestAgent.totalPnLPercent - market.btcChange24h;

  return {
    type: 'AVM_OUTPERFORM',
    tier: 'AGENTS_VS_MARKET',
    title: 'Best Agent vs Market',
    question: `${bestAgent.name} (${bestAgent.totalPnLPercent >= 0 ? '+' : ''}${bestAgent.totalPnLPercent.toFixed(2)}%) vs BTC (${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%). Which will end the period with higher returns?`,
    context: `Current edge: ${agentVsBtc >= 0 ? `${bestAgent.name} leads by ${agentVsBtc.toFixed(2)}%` : `BTC leads by ${Math.abs(agentVsBtc).toFixed(2)}%`}`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Best Agent', value: `${bestAgent.totalPnLPercent >= 0 ? '+' : ''}${bestAgent.totalPnLPercent.toFixed(2)}%`, highlight: true },
      { label: 'Edge', value: `${agentVsBtc >= 0 ? '+' : ''}${agentVsBtc.toFixed(2)}%`, trend: agentVsBtc >= 0 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `BASICS: This compares active trading (${bestAgent.name}) vs passive holding (BTC). The agent has ${bestAgent.winRate.toFixed(0)}% win rate across ${bestAgent.totalTrades} trades.`
      : `ADVANCED: Active vs passive debate quantified. ${bestAgent.name}'s ${bestAgent.totalTrades} trades at ${bestAgent.winRate.toFixed(0)}% win rate ${agentVsBtc >= 0 ? 'justifies the trading costs with positive alpha' : 'has not overcome transaction costs and slippage'}.`,
    options: [
      { id: 'agent', text: `${bestAgent.name} wins` },
      { id: 'btc', text: 'Bitcoin wins' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      agentId: bestAgent.id,
      agentName: bestAgent.name,
      currentPnLPercent: bestAgent.totalPnLPercent,
      btcChange24h: market.btcChange24h,
      agentVsMarket: agentVsBtc,
    },
  };
}

function generateAvmBeatMarketQuestion(agents: QuantAgent[], tierIndex: number): Partial<OracleQuestion> {
  const diffLevel = getDifficultyLevel(tierIndex + 32);
  const market = getSimulatedMarketData();
  const marketAvg = (market.btcChange24h + (market.btcChange24h * 0.8)) / 2; // Simplified market avg
  const agentAvg = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / 3;
  const spread = agentAvg - marketAvg;
  const totalTrades = agents.reduce((s, a) => s + a.totalTrades, 0);

  return {
    type: 'AVM_BEAT_MARKET',
    tier: 'AGENTS_VS_MARKET',
    title: 'Ultimate Showdown',
    question: `Agents (${agentAvg >= 0 ? '+' : ''}${agentAvg.toFixed(2)}%) vs Market Average (${marketAvg >= 0 ? '+' : ''}${marketAvg.toFixed(2)}%). Which will have higher returns at period end?`,
    context: `Spread: ${spread >= 0 ? 'Agents leading' : 'Market leading'} by ${Math.abs(spread).toFixed(2)}%`,
    liveHints: [
      ...getStaticHints(agents),
      // Dynamic hints for this question
      { label: 'Agent Avg', value: `${agentAvg >= 0 ? '+' : ''}${agentAvg.toFixed(2)}%`, trend: agentAvg >= 0 ? 'up' : 'down', highlight: true },
      { label: 'Spread', value: `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%`, trend: spread >= 0 ? 'up' : 'down' },
    ],
    learningInsight: diffLevel <= 3
      ? `BASICS: This is the core question of active vs passive investing. Agents trade actively while market average represents holding a diversified portfolio.`
      : `ADVANCED: Across ${totalTrades} combined trades, agents are ${spread >= 0 ? 'generating' : 'failing to generate'} alpha vs market beta. Transaction costs typically require 2-3% annual outperformance to break even.`,
    options: [
      { id: 'agents', text: 'Agents win' },
      { id: 'market', text: 'Market wins' },
    ],
    difficultyLevel: diffLevel,
    difficulty: getDifficultyLabel(diffLevel),
    baseReward: getBaseReward(diffLevel),
    snapshot: {
      combinedPnL: agents.reduce((sum, a) => sum + a.totalPnL, 0),
      btcChange24h: market.btcChange24h,
      agentVsMarket: spread,
    },
  };
}

// =====================================================
// QUESTION GENERATOR MAPPING
// =====================================================

// AGENTIC generators (16 variations cycling through 6 types)
const AGENTIC_GENERATORS = [
  generateAgentMomentumQuestion,   // 0
  generateAgentStreakQuestion,     // 1
  generateAgentWinrateQuestion,    // 2
  generateAgentLeaderQuestion,     // 3
  generateAgentNextTradeQuestion,  // 4
  generateAgentRecoveryQuestion,   // 5
];

// MARKET generators (16 variations cycling through 5 types)
const MARKET_GENERATORS = [
  generateMarketDirectionQuestion,   // 0
  generateMarketVolatilityQuestion,  // 1
  generateMarketSentimentQuestion,   // 2
  generateMarketDominanceQuestion,   // 3
  generateMarketAltcoinQuestion,     // 4
];

// AGENTS_VS_MARKET generators (16 variations cycling through 5 types)
const AVM_GENERATORS = [
  generateAvmBeatBtcQuestion,      // 0
  generateAvmAlphaQuestion,        // 1
  generateAvmCorrelationQuestion,  // 2
  generateAvmOutperformQuestion,   // 3
  generateAvmBeatMarketQuestion,   // 4
];

function getQuestionGenerator(slot: number): (agents: QuantAgent[], tierIndex: number) => Partial<OracleQuestion> {
  const tier = getTierFromSlot(slot);
  const tierIndex = getTierIndex(slot);

  switch (tier) {
    case 'AGENTIC':
      return AGENTIC_GENERATORS[tierIndex % AGENTIC_GENERATORS.length];
    case 'MARKET':
      return MARKET_GENERATORS[tierIndex % MARKET_GENERATORS.length];
    case 'AGENTS_VS_MARKET':
      return AVM_GENERATORS[tierIndex % AVM_GENERATORS.length];
    default:
      return AGENTIC_GENERATORS[0];
  }
}

// =====================================================
// MAIN ENGINE CLASS
// =====================================================

class OracleQuestionEngine {
  private questions: Map<string, OracleQuestion> = new Map();
  private userPredictions: Map<string, UserPrediction> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private liveHintInterval: NodeJS.Timeout | null = null;
  private currentSlot: number = 0;
  private lastSlot: number = -1;
  private currentDayKey: string = ''; // Track current day for auto-reset
  private onSlotChangeCallbacks: Array<(newSlot: number) => void> = [];
  private onLiveHintUpdateCallbacks: Array<(questionId: string, hints: LiveHintData[]) => void> = [];
  private onDayChangeCallbacks: Array<() => void> = []; // New: day change callbacks

  private SLOT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private BETTING_WINDOW_MS = 25 * 60 * 1000; // 25 min betting window (leaves 5 min before resolution)

  start(): void {
    // Set current day key for day-change detection
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    this.currentDayKey = dayStart.toISOString().split('T')[0];
    console.log('[Oracle] Starting engine for day:', this.currentDayKey);

    this.loadUserPredictions();
    this.generateTodaysQuestions();
    this.updateQuestionStatuses();

    // Update statuses every 1 second (includes day-change detection)
    this.updateInterval = setInterval(() => {
      this.checkDayChange(); // Check for day transition
      this.updateQuestionStatuses();
    }, 1000);

    // Update live hints every 1 second for smooth, professional data updates
    // 1-second interval provides visible value changes without excessive re-renders
    this.liveHintInterval = setInterval(() => {
      this.updateLiveHints();
    }, 1000);
  }

  /**
   * Check if a new day has started and reset questions
   */
  private checkDayChange(): void {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const todayKey = dayStart.toISOString().split('T')[0];

    if (todayKey !== this.currentDayKey) {
      console.log(`[Oracle] 🌅 NEW DAY DETECTED: ${this.currentDayKey} -> ${todayKey}`);
      console.log('[Oracle] Resetting questions and predictions for new day...');

      // Update day key
      this.currentDayKey = todayKey;

      // Clear old questions
      this.questions.clear();

      // Regenerate questions for new day
      this.generateTodaysQuestions();

      // Reset slot tracking
      this.lastSlot = -1;
      this.currentSlot = this.calculateCurrentSlot();

      // Notify all day-change callbacks
      this.onDayChangeCallbacks.forEach(cb => cb());

      console.log('[Oracle] ✅ Day change complete. Progress bar reset, new questions generated.');
    }
  }

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
    if (this.liveHintInterval) {
      clearInterval(this.liveHintInterval);
      this.liveHintInterval = null;
    }
  }

  private generateTodaysQuestions(): void {
    const agents = arenaQuantEngine.getAgents();
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    for (let slot = 0; slot < TOTAL_DAILY_SLOTS; slot++) {
      const opensAt = new Date(dayStart.getTime() + slot * this.SLOT_DURATION_MS);
      const closesAt = new Date(opensAt.getTime() + this.BETTING_WINDOW_MS);
      const resolvesAt = new Date(opensAt.getTime() + this.SLOT_DURATION_MS);

      const tier = getTierFromSlot(slot);
      const tierIndex = getTierIndex(slot);
      const generator = getQuestionGenerator(slot);
      const questionData = generator(agents, tierIndex);

      const question: OracleQuestion = {
        id: `q-${dayStart.toISOString().split('T')[0]}-${slot}`,
        slot,
        tier,
        tierIndex,
        type: questionData.type || 'AGENT_MOMENTUM',
        title: questionData.title || 'Prediction Challenge',
        question: questionData.question || 'Make your prediction',
        context: questionData.context || '',
        liveHints: questionData.liveHints || [],
        learningInsight: questionData.learningInsight || '',
        options: questionData.options || [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' },
        ],
        difficulty: questionData.difficulty || 'MEDIUM',
        difficultyLevel: questionData.difficultyLevel || getDifficultyLevel(slot),
        baseReward: questionData.baseReward || getBaseReward(getDifficultyLevel(slot)),
        opensAt,
        closesAt,
        resolvesAt,
        status: 'UPCOMING',
        snapshot: questionData.snapshot || {},
      };

      this.questions.set(question.id, question);
    }
  }

  private calculateCurrentSlot(): number {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - dayStart.getTime()) / this.SLOT_DURATION_MS);
  }

  private updateQuestionStatuses(): void {
    const now = new Date();
    const calculatedSlot = this.calculateCurrentSlot();

    if (calculatedSlot !== this.lastSlot) {
      console.log(`[Oracle] SLOT CHANGED: ${this.lastSlot} -> ${calculatedSlot}`);
      this.lastSlot = calculatedSlot;
      this.currentSlot = calculatedSlot;
      this.regenerateSlotQuestion(calculatedSlot);
      this.onSlotChangeCallbacks.forEach(cb => cb(calculatedSlot));
    }

    this.questions.forEach((q, id) => {
      if (q.status === 'RESOLVED') return;

      if (now >= q.resolvesAt) {
        this.resolveQuestion(id);
      } else if (now >= q.closesAt) {
        if (q.status !== 'CLOSED') {
          q.status = 'CLOSED';
          console.log(`[Oracle] Question ${q.slot} CLOSED (${q.tier})`);
        }
      } else if (now >= q.opensAt) {
        if (q.status !== 'OPEN') {
          q.status = 'OPEN';
          console.log(`[Oracle] Question ${q.slot} OPENED (${q.tier}: ${q.title})`);
        }
      }
    });

    this.currentSlot = calculatedSlot;
  }

  /**
   * Update live hints with fresh data - called every second
   * Now generates hints for ALL statuses (UPCOMING, OPEN, CLOSED) for better UX
   */
  private updateLiveHints(): void {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      return;
    }

    // Get agents and market data
    const agents = arenaQuantEngine.getAgents();
    const market = getSimulatedMarketData();

    let newHints: LiveHintData[];

    // Generate hints even if agents aren't available (use fallback data)
    if (!agents || agents.length === 0) {
      // Generate fallback hints based on question tier
      newHints = this.generateFallbackHints(currentQuestion, market);
    } else {
      newHints = this.generateLiveHints(currentQuestion, agents, market);
    }

    // Always update the question's live hints
    currentQuestion.liveHints = newHints;

    // Notify callbacks (even for UPCOMING questions)
    this.onLiveHintUpdateCallbacks.forEach(cb => cb(currentQuestion.id, newHints));
  }

  /**
   * Generate fallback hints when agents are not available
   */
  private generateFallbackHints(question: OracleQuestion, market: any): LiveHintData[] {
    const tier = question.tier;

    if (tier === 'AGENTIC') {
      return [
        { label: 'Agent Status', value: 'Loading...', trend: 'neutral' as const },
        { label: 'Win Rate', value: '---', trend: 'neutral' as const },
        { label: 'P&L', value: '---', trend: 'neutral' as const },
        { label: 'Trades', value: '---', trend: 'neutral' as const },
      ];
    } else if (tier === 'MARKET') {
      const btcTrend = market.btcChange24h >= 0 ? 'up' : 'down';
      return [
        { label: 'BTC Price', value: `$${market.btcPrice.toLocaleString()}`, trend: btcTrend as 'up' | 'down', highlight: true },
        { label: '24h Change', value: `${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`, trend: btcTrend as 'up' | 'down' },
        { label: 'Dominance', value: `${market.dominance.toFixed(1)}%`, trend: 'neutral' as const },
        { label: 'Sentiment', value: `${market.fearGreedIndex}/100`, trend: market.fearGreedIndex > 50 ? 'up' as const : 'down' as const },
      ];
    } else {
      // AGENTS_VS_MARKET
      return [
        { label: 'Agents Avg', value: 'Loading...', trend: 'neutral' as const },
        { label: 'BTC', value: `${market.btcChange24h >= 0 ? '+' : ''}${market.btcChange24h.toFixed(2)}%`, trend: market.btcChange24h >= 0 ? 'up' as const : 'down' as const },
        { label: 'Alpha', value: '---', trend: 'neutral' as const },
        { label: 'Status', value: 'Calculating...', trend: 'neutral' as const },
      ];
    }
  }

  /**
   * Apply micro-fluctuation to a value for visible real-time updates
   * Ensures visible changes on every tick for a "live" feel
   */
  private microFluctuate(value: number, range: number = 0.05, decimals: number = 2): number {
    // Apply random fluctuation that's always visible (minimum ±0.01)
    const baseFluctuation = (Math.random() - 0.5) * range * 2;
    const minChange = 0.01 * (Math.random() > 0.5 ? 1 : -1); // Ensure minimum visible change
    const fluctuation = Math.abs(baseFluctuation) < 0.005 ? minChange : baseFluctuation;
    const result = value + value * fluctuation;
    const multiplier = Math.pow(10, decimals);
    return Math.round(result * multiplier) / multiplier;
  }

  /**
   * Generate a live-updating timestamp suffix to force React re-renders
   * Returns last 2 digits of milliseconds for visible micro-changes
   */
  private getLiveTimestamp(): string {
    return (Date.now() % 100).toString().padStart(2, '0');
  }

  /**
   * Generate 4 hint boxes: 2 STATIC + 2 LIVE UPDATING
   * Box 1-2: Static data that changes only with question change
   * Box 3-4: Live updating data with micro-fluctuations every second
   */
  private generateLiveHints(question: OracleQuestion, agents: QuantAgent[], market: any): LiveHintData[] {
    const target = agents.find(a => a.id === question.snapshot.agentId) || agents[0];
    const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
    const leader = sorted[0];
    const second = sorted[1];

    // ═══════════════════════════════════════════════════════════════
    // STATIC HINTS (Boxes 1-2): Don't fluctuate, change only with question
    // ═══════════════════════════════════════════════════════════════
    const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
    const totalWins = agents.reduce((sum, a) => sum + a.wins, 0);
    const overallWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const avgPnLPercent = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / agents.length;

    const staticHint1: LiveHintData = {
      label: 'Active Agents',
      value: `${agents.length}`,
      trend: avgPnLPercent >= 0 ? 'up' : 'down',
    };

    const staticHint2: LiveHintData = {
      label: 'Total Trades',
      value: totalTrades.toString(),
      trend: overallWinRate >= 55 ? 'up' : overallWinRate < 45 ? 'down' : 'neutral',
    };

    // ═══════════════════════════════════════════════════════════════
    // LIVE HINTS (Boxes 3-4): Micro-fluctuating values updated every second
    // ═══════════════════════════════════════════════════════════════
    const targetPnLPercent = this.microFluctuate(target.totalPnLPercent, 0.03, 3);
    const targetWinRate = this.microFluctuate(target.winRate, 0.02, 2);
    const leaderPnL = this.microFluctuate(leader.totalPnL, 0.02, 2);
    const secondPnL = this.microFluctuate(second.totalPnL, 0.02, 2);

    // Live market fluctuations for visible updates
    const liveBtcPrice = this.microFluctuate(market.btcPrice, 0.001, 2);
    const liveBtcChange = this.microFluctuate(market.btcChange24h, 0.05, 3);
    const liveVolume = this.microFluctuate(market.volume24h, 0.03, 1);

    const liveAgentAvg = this.microFluctuate(avgPnLPercent, 0.03, 3);
    const alpha = this.microFluctuate(liveAgentAvg - market.btcChange24h, 0.05, 3);

    // Generate 2 LIVE hints based on question TYPE
    let liveHints: LiveHintData[] = [];

    switch (question.type) {
      // ═══════════════════════════════════════════════════════════════
      // AGENTIC TIER - Agent-specific live hints
      // ═══════════════════════════════════════════════════════════════

      case 'AGENT_MOMENTUM':
        liveHints = [
          { label: target.name, value: `${targetPnLPercent >= 0 ? '+' : ''}${targetPnLPercent.toFixed(3)}%`, trend: targetPnLPercent >= 0 ? 'up' : 'down', highlight: true },
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      case 'AGENT_STREAK':
        liveHints = [
          { label: 'P&L', value: `${targetPnLPercent >= 0 ? '+' : ''}${targetPnLPercent.toFixed(3)}%`, trend: targetPnLPercent >= 0 ? 'up' : 'down', highlight: true },
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      case 'AGENT_WINRATE':
        liveHints = [
          { label: 'Win Rate', value: `${targetWinRate.toFixed(2)}%`, trend: targetWinRate >= 55 ? 'up' : 'neutral', highlight: true },
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      case 'AGENT_LEADER': {
        const lead = leaderPnL - secondPnL;
        liveHints = [
          { label: 'Lead Gap', value: `$${lead.toFixed(0)}`, trend: lead > 50 ? 'up' : 'neutral', highlight: true },
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;
      }

      case 'AGENT_NEXT_TRADE': {
        const hasPosition = target.currentPosition !== null;
        if (hasPosition && target.currentPosition) {
          const pos = target.currentPosition;
          const posPnLPercent = this.microFluctuate(pos.pnlPercent, 0.03);
          liveHints = [
            { label: 'Unrealized', value: `${posPnLPercent >= 0 ? '+' : ''}${posPnLPercent.toFixed(2)}%`, trend: posPnLPercent >= 0 ? 'up' : 'down', highlight: true },
            { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
          ];
        } else {
          liveHints = [
            { label: target.name, value: `${targetPnLPercent >= 0 ? '+' : ''}${targetPnLPercent.toFixed(2)}%`, trend: targetPnLPercent >= 0 ? 'up' : 'down', highlight: true },
            { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
          ];
        }
        break;
      }

      case 'AGENT_RECOVERY':
        liveHints = [
          { label: 'P&L', value: `${targetPnLPercent >= 0 ? '+' : ''}${targetPnLPercent.toFixed(2)}%`, trend: targetPnLPercent >= 0 ? 'up' : 'down', highlight: true },
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      // ═══════════════════════════════════════════════════════════════
      // MARKET TIER - Market-specific live hints
      // ═══════════════════════════════════════════════════════════════

      case 'MARKET_DIRECTION': {
        const btcTrend = liveBtcChange >= 0 ? 'up' : 'down';
        liveHints = [
          { label: 'BTC Price', value: `$${liveBtcPrice.toLocaleString()}`, trend: btcTrend as 'up' | 'down', highlight: true },
          { label: '24h Change', value: `${liveBtcChange >= 0 ? '+' : ''}${liveBtcChange.toFixed(3)}%`, trend: btcTrend as 'up' | 'down' },
        ];
        break;
      }

      case 'MARKET_VOLATILITY':
        liveHints = [
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, highlight: true },
          { label: 'Volume', value: `$${liveVolume.toFixed(1)}B`, trend: liveVolume > 100 ? 'up' : 'neutral' },
        ];
        break;

      case 'MARKET_SENTIMENT': {
        const sentiment = market.fearGreedIndex;
        liveHints = [
          { label: 'Sentiment', value: `${sentiment}/100`, trend: sentiment > 50 ? 'up' : 'down', highlight: true },
          { label: 'BTC 24h', value: `${liveBtcChange >= 0 ? '+' : ''}${liveBtcChange.toFixed(3)}%`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;
      }

      case 'MARKET_DOMINANCE':
        liveHints = [
          { label: 'Dominance', value: `${market.dominance.toFixed(1)}%`, trend: market.dominance > 54 ? 'up' : 'down', highlight: true },
          { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      case 'MARKET_ALTCOIN': {
        const ethBtcRatio = market.ethPrice / market.btcPrice;
        liveHints = [
          { label: 'ETH/BTC', value: (ethBtcRatio * 1000).toFixed(3), highlight: true },
          { label: 'BTC Dom', value: `${market.dominance.toFixed(1)}%`, trend: market.dominance > 54 ? 'up' : 'down' },
        ];
        break;
      }

      // ═══════════════════════════════════════════════════════════════
      // AGENTS VS MARKET TIER - Comparative live hints
      // ═══════════════════════════════════════════════════════════════

      case 'AVM_BEAT_BTC':
        liveHints = [
          { label: 'Agents', value: `${liveAgentAvg >= 0 ? '+' : ''}${liveAgentAvg.toFixed(3)}%`, trend: liveAgentAvg >= 0 ? 'up' : 'down', highlight: true },
          { label: 'BTC', value: `${liveBtcChange >= 0 ? '+' : ''}${liveBtcChange.toFixed(3)}%`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      case 'AVM_ALPHA_GENERATION':
        liveHints = [
          { label: 'Alpha', value: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(3)}%`, trend: alpha >= 0 ? 'up' : 'down', highlight: true },
          { label: 'Market', value: `${liveBtcChange >= 0 ? '+' : ''}${liveBtcChange.toFixed(3)}%`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;

      case 'AVM_CORRELATION': {
        const sameDirection = (liveAgentAvg >= 0) === (liveBtcChange >= 0);
        liveHints = [
          { label: 'Agents', value: liveAgentAvg >= 0 ? 'UP' : 'DOWN', trend: liveAgentAvg >= 0 ? 'up' : 'down', highlight: true },
          { label: 'Market', value: liveBtcChange >= 0 ? 'UP' : 'DOWN', trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;
      }

      case 'AVM_OUTPERFORM': {
        const bestAgent = sorted[0];
        const bestAgentPnL = this.microFluctuate(bestAgent.totalPnLPercent, 0.02);
        liveHints = [
          { label: bestAgent.name, value: `${bestAgentPnL >= 0 ? '+' : ''}${bestAgentPnL.toFixed(2)}%`, trend: bestAgentPnL >= 0 ? 'up' : 'down', highlight: true },
          { label: 'BTC', value: `${liveBtcChange >= 0 ? '+' : ''}${liveBtcChange.toFixed(3)}%`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
        ];
        break;
      }

      case 'AVM_BEAT_MARKET': {
        const marketAvg = this.microFluctuate((market.btcChange24h + (market.btcChange24h * 0.8)) / 2, 0.02);
        liveHints = [
          { label: 'Agents Avg', value: `${liveAgentAvg >= 0 ? '+' : ''}${liveAgentAvg.toFixed(2)}%`, trend: liveAgentAvg >= 0 ? 'up' : 'down', highlight: true },
          { label: 'Market Avg', value: `${marketAvg >= 0 ? '+' : ''}${marketAvg.toFixed(2)}%`, trend: marketAvg >= 0 ? 'up' : 'down' },
        ];
        break;
      }

      default:
        // Fallback: Generic 2 live hints based on tier
        if (question.tier === 'AGENTIC') {
          liveHints = [
            { label: target.name, value: `${targetPnLPercent >= 0 ? '+' : ''}${targetPnLPercent.toFixed(2)}%`, trend: targetPnLPercent >= 0 ? 'up' : 'down', highlight: true },
            { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
          ];
        } else if (question.tier === 'MARKET') {
          liveHints = [
            { label: 'BTC', value: `$${liveBtcPrice.toLocaleString()}`, highlight: true },
            { label: '24h', value: `${liveBtcChange >= 0 ? '+' : ''}${liveBtcChange.toFixed(3)}%`, trend: liveBtcChange >= 0 ? 'up' : 'down' },
          ];
        } else {
          liveHints = [
            { label: 'Agents', value: `${liveAgentAvg >= 0 ? '+' : ''}${liveAgentAvg.toFixed(2)}%`, trend: liveAgentAvg >= 0 ? 'up' : 'down', highlight: true },
            { label: 'Alpha', value: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}%`, trend: alpha >= 0 ? 'up' : 'down' },
          ];
        }
        break;
    }

    // RETURN: 2 STATIC + 2 LIVE = 4 hints total
    // Add _tick to live hints to force React re-renders (unique value each update)
    const tick = Date.now();
    const liveHintsWithTick = liveHints.map(hint => ({
      ...hint,
      _tick: tick,
      isLive: true,
    }));
    return [staticHint1, staticHint2, ...liveHintsWithTick];
  }

  private regenerateSlotQuestion(slot: number): void {
    const agents = arenaQuantEngine.getAgents();
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    const opensAt = new Date(dayStart.getTime() + slot * this.SLOT_DURATION_MS);
    const closesAt = new Date(opensAt.getTime() + this.BETTING_WINDOW_MS);
    const resolvesAt = new Date(opensAt.getTime() + this.SLOT_DURATION_MS);

    const tier = getTierFromSlot(slot);
    const tierIndex = getTierIndex(slot);
    const generator = getQuestionGenerator(slot);
    const questionData = generator(agents, tierIndex);

    const question: OracleQuestion = {
      id: `q-${dayStart.toISOString().split('T')[0]}-${slot}`,
      slot,
      tier,
      tierIndex,
      type: questionData.type || 'AGENT_MOMENTUM',
      title: questionData.title || 'Prediction Challenge',
      question: questionData.question || 'Make your prediction',
      context: questionData.context || '',
      liveHints: questionData.liveHints || [],
      learningInsight: questionData.learningInsight || '',
      options: questionData.options || [
        { id: 'yes', text: 'YES', emoji: '✅' },
        { id: 'no', text: 'NO', emoji: '❌' },
      ],
      difficulty: questionData.difficulty || 'MEDIUM',
      baseReward: tier === 'AGENTS_VS_MARKET' ? 750 : tier === 'MARKET' ? 600 : 500,
      opensAt,
      closesAt,
      resolvesAt,
      status: now >= closesAt ? 'CLOSED' : (now >= opensAt ? 'OPEN' : 'UPCOMING'),
      snapshot: questionData.snapshot || {},
    };

    this.questions.set(question.id, question);
    console.log(`[Oracle] Regenerated slot ${slot} (${tier}):`, question.title);
  }

  private resolveQuestion(questionId: string): void {
    const q = this.questions.get(questionId);
    if (!q || q.status === 'RESOLVED') return;

    const agents = arenaQuantEngine.getAgents();
    const market = getSimulatedMarketData();
    let correctAnswer: string = 'no';

    // Resolution logic based on question type
    switch (q.type) {
      case 'AGENT_MOMENTUM': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const wasPositive = (q.snapshot.currentPnLPercent || 0) >= 0;
          const isPositive = agent.totalPnLPercent >= 0;
          correctAnswer = wasPositive ? (isPositive ? 'yes' : 'no') : (isPositive ? 'yes' : 'no');
        }
        break;
      }
      case 'AGENT_STREAK': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const continued = agent.streakType === q.snapshot.streakType && agent.streakCount >= (q.snapshot.currentStreak || 0);
          correctAnswer = continued ? 'yes' : 'no';
        }
        break;
      }
      case 'AGENT_WINRATE': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const threshold = Math.floor((q.snapshot.winRate || 50) / 5) * 5;
          correctAnswer = agent.winRate >= threshold ? 'yes' : 'no';
        }
        break;
      }
      case 'AGENT_LEADER': {
        const sorted = [...agents].sort((a, b) => b.totalPnL - a.totalPnL);
        correctAnswer = sorted[0].id === q.snapshot.agentId ? 'yes' : 'no';
        break;
      }
      case 'AGENT_NEXT_TRADE':
      case 'AGENT_RECOVERY': {
        const agent = agents.find(a => a.id === q.snapshot.agentId);
        if (agent) {
          const improved = agent.totalPnL > (q.snapshot.currentPnL || 0);
          correctAnswer = improved ? 'yes' : 'no';
        }
        break;
      }
      case 'MARKET_DIRECTION':
      case 'MARKET_VOLATILITY':
      case 'MARKET_SENTIMENT':
      case 'MARKET_DOMINANCE':
      case 'MARKET_ALTCOIN': {
        // For market questions, compare current state to snapshot
        const improved = market.btcChange24h > (q.snapshot.btcChange24h || 0);
        correctAnswer = improved ? 'yes' : 'no';
        break;
      }
      case 'AVM_BEAT_BTC':
      case 'AVM_ALPHA_GENERATION':
      case 'AVM_BEAT_MARKET': {
        const agentAvg = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / 3;
        const alpha = agentAvg - market.btcChange24h;
        correctAnswer = alpha > 0 ? 'yes' : 'no';
        break;
      }
      case 'AVM_CORRELATION': {
        const agentAvg = agents.reduce((sum, a) => sum + a.totalPnLPercent, 0) / 3;
        const sameDirection = (agentAvg >= 0) === (market.btcChange24h >= 0);
        correctAnswer = sameDirection ? 'yes' : 'no';
        break;
      }
      case 'AVM_OUTPERFORM': {
        const bestAgent = [...agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent)[0];
        correctAnswer = bestAgent.totalPnLPercent > market.btcChange24h ? 'agent' : 'btc';
        break;
      }
    }

    q.correctAnswer = correctAnswer;
    q.status = 'RESOLVED';
    console.log(`[Oracle] Resolved ${questionId} (${q.tier}): ${correctAnswer}`);

    // CRITICAL: Persist outcome to localStorage for all user predictions on this question
    this.persistPredictionOutcome(questionId, correctAnswer, q.baseReward);
  }

  /**
   * Persist prediction outcome to localStorage when question resolves
   * This ensures stats survive page refresh and show correct win/loss status
   */
  private persistPredictionOutcome(questionId: string, correctAnswer: string, baseReward: number): void {
    const prediction = this.userPredictions.get(questionId);
    if (!prediction) return;

    const isCorrect = prediction.selectedOption === correctAnswer;
    const earnedReward = isCorrect ? baseReward + 100 : 100; // Base reward + participation, or just participation

    // Update in-memory prediction
    prediction.isCorrect = isCorrect;
    prediction.correctAnswer = correctAnswer;
    prediction.resolvedAt = Date.now();
    prediction.earnedReward = earnedReward;

    // Persist to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('qx_predictions') || '{}');
      if (stored[questionId]) {
        stored[questionId] = {
          ...stored[questionId],
          isCorrect,
          correctAnswer,
          resolvedAt: Date.now(),
          earnedReward,
        };
        localStorage.setItem('qx_predictions', JSON.stringify(stored));
        console.log(`[Oracle] Persisted outcome for ${questionId}: ${isCorrect ? 'CORRECT' : 'WRONG'}`);
      }
    } catch (e) {
      console.error('[Oracle] Failed to persist prediction outcome:', e);
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getCurrentQuestion(): OracleQuestion | null {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const currentSlot = this.calculateCurrentSlot();

    const currentQuestionId = `q-${dayStart.toISOString().split('T')[0]}-${currentSlot}`;
    const question = this.questions.get(currentQuestionId);

    // IMPORTANT: Return a shallow clone so React can detect state changes
    // Without this, React's shallow comparison sees the same object reference
    // and won't re-render when status changes from 'UPCOMING' to 'OPEN'
    if (question) {
      return {
        ...question,
        liveHints: [...(question.liveHints || [])],
        options: [...question.options],
      };
    }
    return null;
  }

  onSlotChange(callback: (newSlot: number) => void): () => void {
    this.onSlotChangeCallbacks.push(callback);
    return () => {
      const index = this.onSlotChangeCallbacks.indexOf(callback);
      if (index > -1) this.onSlotChangeCallbacks.splice(index, 1);
    };
  }

  onLiveHintUpdate(callback: (questionId: string, hints: LiveHintData[]) => void): () => void {
    this.onLiveHintUpdateCallbacks.push(callback);
    return () => {
      const index = this.onLiveHintUpdateCallbacks.indexOf(callback);
      if (index > -1) this.onLiveHintUpdateCallbacks.splice(index, 1);
    };
  }

  /**
   * Subscribe to day change events (when 48 questions reset)
   */
  onDayChange(callback: () => void): () => void {
    this.onDayChangeCallbacks.push(callback);
    return () => {
      const index = this.onDayChangeCallbacks.indexOf(callback);
      if (index > -1) this.onDayChangeCallbacks.splice(index, 1);
    };
  }

  getCurrentSlot(): number {
    return this.calculateCurrentSlot();
  }

  getTotalDailySlots(): number {
    return TOTAL_DAILY_SLOTS;
  }

  getTierConfig() {
    return TIER_CONFIG;
  }

  getTodaysQuestions(): OracleQuestion[] {
    return Array.from(this.questions.values()).sort((a, b) => a.slot - b.slot);
  }

  getQuestion(id: string): OracleQuestion | null {
    return this.questions.get(id) || null;
  }

  makePrediction(questionId: string, optionId: string): { success: boolean; error?: string } {
    const question = this.questions.get(questionId);

    if (!question) return { success: false, error: 'Question not found' };
    if (question.status !== 'OPEN') return { success: false, error: 'Betting window closed' };
    if (this.userPredictions.has(questionId)) return { success: false, error: 'Already predicted' };

    const prediction: UserPrediction = {
      questionId,
      selectedOption: optionId,
      predictedAt: Date.now(),
      potentialReward: question.baseReward,
    };

    this.userPredictions.set(questionId, prediction);

    try {
      const stored = JSON.parse(localStorage.getItem('qx_predictions') || '{}');
      stored[questionId] = prediction;
      localStorage.setItem('qx_predictions', JSON.stringify(stored));
    } catch (e) {}

    return { success: true };
  }

  getUserPrediction(questionId: string): UserPrediction | null {
    if (this.userPredictions.has(questionId)) {
      return this.userPredictions.get(questionId)!;
    }

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

  getCurrentSlotInfo(): { slot: number; tier: QuestionTier; tierIndex: number; name: string; totalSlots: number } {
    const tier = getTierFromSlot(this.currentSlot);
    const tierIndex = getTierIndex(this.currentSlot);

    return {
      slot: this.currentSlot,
      tier,
      tierIndex,
      name: TIER_CONFIG[tier].name,
      totalSlots: TOTAL_DAILY_SLOTS,
    };
  }

  getUserStats(): UserStats {
    const predictions = Array.from(this.userPredictions.values());

    let totalPredictions = predictions.length;
    let correctPredictions = 0;
    let totalQXEarned = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let resolvedCount = 0;

    // Sort predictions by slot for streak calculation
    const sortedPredictions = predictions
      .map(p => ({ prediction: p, question: this.questions.get(p.questionId) }))
      .sort((a, b) => (a.question?.slot || 0) - (b.question?.slot || 0));

    sortedPredictions.forEach(({ prediction, question }) => {
      // CRITICAL FIX: Use persisted isCorrect from localStorage, not question.correctAnswer
      // This ensures stats survive page refresh
      const isResolved = prediction.isCorrect !== undefined && prediction.isCorrect !== null;

      if (!isResolved) {
        // Also check if question has resolved but prediction wasn't updated yet
        if (question?.status === 'RESOLVED' && question.correctAnswer) {
          const isCorrect = prediction.selectedOption === question.correctAnswer;
          // Update the prediction with the outcome
          prediction.isCorrect = isCorrect;
          prediction.correctAnswer = question.correctAnswer;
          prediction.earnedReward = isCorrect ? (question.baseReward + 100) : 100;
          prediction.resolvedAt = Date.now();

          // Persist this update to localStorage
          this.persistPredictionOutcome(prediction.questionId, question.correctAnswer, question.baseReward);
        } else {
          return; // Prediction not resolved yet
        }
      }

      resolvedCount++;
      totalQXEarned += 100; // Participation reward

      if (prediction.isCorrect === true) {
        correctPredictions++;
        const baseReward = prediction.earnedReward ? (prediction.earnedReward - 100) : (question?.baseReward || 500);
        totalQXEarned += baseReward;
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
        if (tempStreak > 0 && tempStreak % 3 === 0) {
          totalQXEarned += 50; // Streak bonus
        }
      } else {
        tempStreak = 0;
      }
    });

    currentStreak = tempStreak;
    const accuracy = resolvedCount > 0 ? Math.round((correctPredictions / resolvedCount) * 100) : 0;

    return {
      totalQXEarned,
      totalPredictions,
      correctPredictions,
      resolvedPredictions: resolvedCount,
      currentStreak,
      bestStreak,
      accuracy
    };
  }

  getAllUserPredictions(): Array<{ prediction: UserPrediction; question: OracleQuestion | null }> {
    return Array.from(this.userPredictions.entries()).map(([questionId, prediction]) => ({
      prediction,
      question: this.questions.get(questionId) || null,
    }));
  }

  /**
   * Get current real-time market data for external use
   * Exposes the same data used internally for hint generation
   */
  getMarketData(): MarketData {
    return getSimulatedMarketData();
  }

  /**
   * Subscribe to real-time market data updates (1 second interval)
   * Returns unsubscribe function
   */
  onMarketDataUpdate(callback: (data: MarketData) => void): () => void {
    const interval = setInterval(() => {
      callback(getSimulatedMarketData());
    }, 1000);
    return () => clearInterval(interval);
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const oracleQuestionEngine = new OracleQuestionEngine();
export default oracleQuestionEngine;

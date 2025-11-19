/**
 * ADDICTIVE AGENT CARD - Fast, Clean, Psychologically Engaging
 *
 * White background, orange branding, green/red for trades
 * Large numbers, real-time updates, maximum attention-grabbing
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';
import type { ArenaAgent } from '@/services/arenaService';

interface AgentCardProps {
  agent: ArenaAgent;
  rank?: number;
}

export const AgentCard = React.memo(({ agent, rank }: AgentCardProps) => {
  const isProfitable = agent.totalPnLPercent >= 0;
  const isTrading = agent.isActive && agent.lastTrade;
  const [pulse, setPulse] = useState(false);

  // Pulse animation on P&L change
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 300);
    return () => clearTimeout(timer);
  }, [agent.totalPnLPercent]);

  // Generate agent personality elements
  const getAgentMood = () => {
    if (!agent.lastTrade) return { emoji: '🤔', text: 'ANALYZING', color: 'text-gray-600' };

    const pnl = agent.lastTrade.pnlPercent;
    if (pnl > 5) return { emoji: '🔥', text: 'AGGRESSIVE', color: 'text-red-600' };
    if (pnl > 2) return { emoji: '😎', text: 'CONFIDENT', color: 'text-green-600' };
    if (pnl > 0) return { emoji: '✅', text: 'STEADY', color: 'text-blue-600' };
    if (pnl > -2) return { emoji: '😐', text: 'CAUTIOUS', color: 'text-yellow-600' };
    if (pnl > -5) return { emoji: '😬', text: 'DEFENSIVE', color: 'text-orange-600' };
    return { emoji: '😠', text: 'HUNTING', color: 'text-red-600' };
  };

  const getAgentThought = () => {
    if (!agent.lastTrade) {
      const thoughts = [
        '🎯 Scanning for high-probability setups...',
        '📊 Analyzing market microstructure...',
        '🔍 Waiting for the perfect entry...',
        '⏱️ Patience is my edge...'
      ];
      return thoughts[Math.floor(Date.now() / 10000) % thoughts.length];
    }

    const pnl = agent.lastTrade.pnlPercent;
    const strategy = agent.lastTrade.strategyUsed || '';

    if (pnl > 5) {
      return `🚀 ${strategy} signal paying off massively!`;
    }
    if (pnl > 2) {
      return `✨ Position moving in our favor...`;
    }
    if (pnl > 0) {
      return `📈 Letting winners run...`;
    }
    if (pnl > -2) {
      return `⚖️ Managing risk, staying patient...`;
    }
    if (pnl > -5) {
      return `🛡️ Holding for reversal signal...`;
    }
    return `💪 This is where discipline matters...`;
  };

  const getRiskLevel = () => {
    if (!agent.lastTrade) return 0;
    const pnl = Math.abs(agent.lastTrade.pnlPercent);
    return Math.min(100, Math.floor(pnl * 10));
  };

  const mood = getAgentMood();
  const thought = getAgentThought();
  const riskLevel = getRiskLevel();

  return (
    <Card className={`relative overflow-hidden bg-white border-2 transition-all duration-300 hover:shadow-2xl ${
      rank === 1 ? 'border-yellow-400 shadow-xl shadow-yellow-400/20' :
      rank === 2 ? 'border-gray-300 shadow-xl shadow-gray-300/20' :
      rank === 3 ? 'border-orange-400 shadow-xl shadow-orange-400/20' :
      'border-gray-200 hover:border-orange-400'
    }`}>
      {/* Rank Badge */}
      {rank && rank <= 3 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="text-2xl">
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Agent Header */}
        <div className="flex items-center gap-3">
          <div className="text-4xl">{agent.avatar}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
              {agent.isActive && (
                <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5">
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">{agent.codename}</p>
          </div>
        </div>

        {/* Agent Personality Panel */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-lg border border-orange-200">
          {/* Mood */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{mood.emoji}</span>
              <span className={`text-sm font-bold ${mood.color}`}>{mood.text}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Risk</div>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      riskLevel > 66 ? 'bg-red-500' :
                      riskLevel > 33 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${riskLevel}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">{riskLevel}</span>
              </div>
            </div>
          </div>

          {/* Current Thought */}
          <div className="text-xs text-gray-700 italic flex items-start gap-1.5">
            <span className="flex-shrink-0 mt-0.5">💭</span>
            <span>{thought}</span>
          </div>
        </div>

        {/* Active Trade - THE HOOK */}
        {isTrading && agent.lastTrade && (
          <div className={`relative p-4 rounded-xl border-2 transition-all ${
            agent.lastTrade.direction === 'LONG'
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          }`}>
            {/* Direction Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={`${
                  agent.lastTrade.direction === 'LONG'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                } text-sm font-bold px-3 py-1`}>
                  {agent.lastTrade.direction === 'LONG' ? (
                    <><TrendingUp className="w-4 h-4 mr-1" /> BUY</>
                  ) : (
                    <><TrendingDown className="w-4 h-4 mr-1" /> SELL</>
                  )}
                </Badge>
                <span className="font-bold text-lg text-gray-900">{agent.lastTrade.symbol}</span>
              </div>
            </div>

            {/* Price Grid - ATTENTION GRABBER */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white/60 backdrop-blur rounded-lg p-2">
                <div className="text-xs text-gray-600 mb-1">Entry</div>
                <div className="text-base font-bold text-gray-900">${agent.lastTrade.entry.toFixed(2)}</div>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-lg p-2">
                <div className="text-xs text-gray-600 mb-1">Now</div>
                <div className={`text-base font-bold ${pulse ? 'scale-110' : 'scale-100'} transition-transform`}>
                  ${agent.lastTrade.current.toFixed(2)}
                </div>
              </div>
            </div>

            {/* P&L - THE MONEY SHOT */}
            <div className={`text-center py-3 rounded-lg ${
              agent.lastTrade.pnlPercent >= 0
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              <div className={`text-3xl font-black ${pulse ? 'scale-110' : 'scale-100'} transition-transform`}>
                {agent.lastTrade.pnlPercent >= 0 ? '+' : ''}{agent.lastTrade.pnlPercent.toFixed(2)}%
              </div>
              <div className="text-sm font-semibold opacity-90">
                ${Math.abs(agent.lastTrade.pnl || 0).toFixed(2)} {agent.lastTrade.pnlPercent >= 0 ? 'PROFIT' : 'LOSS'}
              </div>
            </div>

            {/* Strategy Tag */}
            <div className="mt-3 text-center">
              <span className="text-xs font-semibold text-gray-700 bg-white/60 px-3 py-1 rounded-full">
                {agent.lastTrade.strategyUsed}
              </span>
            </div>
          </div>
        )}

        {/* Scanning State - Create FOMO */}
        {!isTrading && (
          <div className="relative p-6 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50">
            <div className="text-center space-y-3">
              <Target className="w-10 h-10 mx-auto text-orange-500" />
              <div className="font-bold text-gray-900">Scanning for signals...</div>
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Overall Performance - Social Proof */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t-2 border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total P&L</div>
            <div className={`text-lg font-black ${
              isProfitable ? 'text-green-600' : 'text-red-600'
            }`}>
              {isProfitable ? '+' : ''}{agent.totalPnLPercent.toFixed(1)}%
            </div>
          </div>
          <div className="text-center border-x border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Win Rate</div>
            <div className="text-lg font-black text-orange-500">{agent.winRate.toFixed(0)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Trades</div>
            <div className="text-lg font-black text-gray-900">{agent.totalTrades}</div>
          </div>
        </div>

        {/* Balance - Show Real Stakes */}
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Portfolio Value</div>
          <div className="text-2xl font-black text-gray-900">
            ${agent.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </Card>
  );
});

AgentCard.displayName = 'AgentCard';

/**
 * PREDICTION PANEL - Core Engagement Mechanic
 *
 * Users predict agent outcomes for XP/rewards
 * Creates "skin in the game" without real money
 * Drives daily checking behavior
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Zap, Timer, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PredictionOption {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  odds: number;
  currentVotes: number;
}

interface ActivePrediction {
  id: string;
  question: string;
  options: PredictionOption[];
  endsAt: Date;
  xpReward: number;
  userPick?: string;
}

export const PredictionPanel: React.FC = () => {
  const { toast } = useToast();
  const [activePrediction, setActivePrediction] = useState<ActivePrediction | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [userStreak, setUserStreak] = useState(0);
  const [dailyPredictions, setDailyPredictions] = useState({ used: 0, limit: 3 });

  useEffect(() => {
    // Load current prediction
    loadActivePrediction();

    // Update countdown every second
    const interval = setInterval(() => {
      if (activePrediction) {
        updateCountdown();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activePrediction]);

  const loadActivePrediction = () => {
    // TODO: Fetch from API
    // For now, create a mock prediction every 5 minutes
    const now = Date.now();
    const roundedTime = Math.floor(now / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const nextPredictionTime = roundedTime + (5 * 60 * 1000);

    setActivePrediction({
      id: `pred-${roundedTime}`,
      question: 'Which agent will perform best in the next hour?',
      options: [
        {
          agentId: 'nexus',
          agentName: 'NEXUS-01',
          agentAvatar: '🔷',
          odds: 2.3,
          currentVotes: 127
        },
        {
          agentId: 'quantum',
          agentName: 'QUANTUM-X',
          agentAvatar: '🔶',
          odds: 1.8,
          currentVotes: 234
        },
        {
          agentId: 'zeonix',
          agentName: 'ZEONIX',
          agentAvatar: '⚡',
          odds: 2.1,
          currentVotes: 156
        }
      ],
      endsAt: new Date(nextPredictionTime),
      xpReward: 50
    });
  };

  const updateCountdown = () => {
    if (!activePrediction) return;

    const now = Date.now();
    const remaining = activePrediction.endsAt.getTime() - now;

    if (remaining <= 0) {
      // Prediction ended, load next one
      loadActivePrediction();
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  const handlePredictionSubmit = async () => {
    if (!selectedAgent || !activePrediction) return;

    // Check daily limit
    if (dailyPredictions.used >= dailyPredictions.limit) {
      toast({
        title: '❌ Daily Limit Reached',
        description: 'Upgrade to Premium for unlimited predictions!',
        variant: 'destructive',
        duration: 5000
      });
      return;
    }

    // TODO: Submit to API
    console.log('[Prediction] Submitted:', selectedAgent);

    toast({
      title: '✅ Prediction Locked In!',
      description: `You picked ${selectedAgent}. Result in ${timeLeft}`,
      duration: 3000
    });

    // Update state
    setActivePrediction(prev => prev ? { ...prev, userPick: selectedAgent } : null);
    setDailyPredictions(prev => ({ ...prev, used: prev.used + 1 }));
    setSelectedAgent(null);
  };

  const getMultiplier = () => {
    if (userStreak >= 5) return '3X';
    if (userStreak >= 3) return '2X';
    return '1X';
  };

  if (!activePrediction) {
    return (
      <Card className="bg-white border-2 border-orange-200 p-6">
        <div className="text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading next prediction...</p>
        </div>
      </Card>
    );
  }

  const hasPredicted = !!activePrediction.userPick;
  const totalVotes = activePrediction.options.reduce((sum, opt) => sum + opt.currentVotes, 0);

  return (
    <Card className="bg-gradient-to-br from-white to-orange-50 border-2 border-orange-300 shadow-lg">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-lg text-gray-900">Make Your Prediction</h3>
          </div>
          <Badge className="bg-orange-500 text-white px-3 py-1 font-bold">
            <Timer className="w-3 h-3 mr-1" />
            {timeLeft}
          </Badge>
        </div>

        {/* Question */}
        <div className="bg-white p-3 rounded-lg border border-orange-200">
          <p className="text-sm font-semibold text-gray-900">{activePrediction.question}</p>
        </div>

        {/* Streak & Rewards Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-600 mb-1">Your Streak</div>
            <div className="text-xl font-black text-orange-600 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />
              {userStreak}
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-3 rounded-lg text-center">
            <div className="text-xs text-gray-600 mb-1">Reward</div>
            <div className="text-xl font-black text-green-600">
              +{activePrediction.xpReward * (userStreak >= 5 ? 3 : userStreak >= 3 ? 2 : 1)} XP
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {activePrediction.options.map((option) => {
            const isSelected = selectedAgent === option.agentId;
            const isUserPick = activePrediction.userPick === option.agentId;
            const votePercentage = totalVotes > 0 ? ((option.currentVotes / totalVotes) * 100).toFixed(0) : '0';

            return (
              <button
                key={option.agentId}
                onClick={() => !hasPredicted && setSelectedAgent(option.agentId)}
                disabled={hasPredicted}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  isUserPick
                    ? 'border-green-500 bg-green-50'
                    : isSelected
                    ? 'border-orange-500 bg-orange-50 scale-105'
                    : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                } ${hasPredicted && !isUserPick ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{option.agentAvatar}</span>
                    <div className="text-left">
                      <div className="font-bold text-gray-900">{option.agentName}</div>
                      <div className="text-xs text-gray-500">
                        {votePercentage}% of users • {option.odds}x odds
                      </div>
                    </div>
                  </div>
                  {isUserPick && (
                    <Badge className="bg-green-500 text-white">
                      YOUR PICK
                    </Badge>
                  )}
                  {isSelected && !isUserPick && (
                    <Badge className="bg-orange-500 text-white">
                      SELECTED
                    </Badge>
                  )}
                </div>

                {/* Vote bar */}
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${votePercentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {!hasPredicted ? (
          <div className="space-y-2">
            <Button
              onClick={handlePredictionSubmit}
              disabled={!selectedAgent}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg"
            >
              <Trophy className="w-5 h-5 mr-2" />
              {selectedAgent ? 'LOCK IN PREDICTION' : 'SELECT AN AGENT'}
            </Button>
            <div className="text-center text-xs text-gray-600">
              {dailyPredictions.used}/{dailyPredictions.limit} predictions used today
              {dailyPredictions.used >= dailyPredictions.limit && (
                <span className="text-orange-600 font-semibold"> • Upgrade for unlimited</span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-300">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-900">Prediction Locked In!</span>
              </div>
              <p className="text-sm text-gray-700">
                You picked <span className="font-bold">{activePrediction.userPick?.toUpperCase()}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Result in {timeLeft} • Check back to see if you won!
              </p>
            </div>
          </div>
        )}

        {/* Streak Bonus Info */}
        {userStreak >= 3 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-gray-900">
                {getMultiplier()} Streak Multiplier Active!
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

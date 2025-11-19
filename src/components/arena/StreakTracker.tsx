/**
 * STREAK TRACKER - Daily Habit Formation
 *
 * Creates "don't break your streak" psychological hook (Duolingo effect)
 * #1 driver of daily retention
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Gift, Zap, Shield, Trophy, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  freezeTokens: number;
  lastVisit: string;
  todayClaimed: boolean;
  nextMilestone: number;
}

export const StreakTracker: React.FC = () => {
  const { toast } = useToast();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 5,
    longestStreak: 12,
    totalDays: 23,
    freezeTokens: 2,
    lastVisit: new Date().toISOString(),
    todayClaimed: false,
    nextMilestone: 7
  });
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Load streak data from localStorage
    loadStreakData();

    // Check if user should get daily reward
    checkDailyReward();
  }, []);

  const loadStreakData = () => {
    try {
      const saved = localStorage.getItem('arena_streak');
      if (saved) {
        const data = JSON.parse(saved);
        setStreakData(data);
      } else {
        // First time visitor
        saveStreakData(streakData);
      }
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const saveStreakData = (data: StreakData) => {
    try {
      localStorage.setItem('arena_streak', JSON.stringify(data));
      setStreakData(data);
    } catch (error) {
      console.error('Error saving streak:', error);
    }
  };

  const checkDailyReward = () => {
    const lastVisit = new Date(streakData.lastVisit);
    const today = new Date();
    const hoursSinceVisit = (today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60);

    // If more than 24 hours, it's a new day
    if (hoursSinceVisit >= 24 && hoursSinceVisit < 48) {
      // Increment streak
      const newStreak = streakData.currentStreak + 1;
      const newData = {
        ...streakData,
        currentStreak: newStreak,
        longestStreak: Math.max(streakData.longestStreak, newStreak),
        totalDays: streakData.totalDays + 1,
        lastVisit: today.toISOString(),
        todayClaimed: false
      };
      saveStreakData(newData);
    } else if (hoursSinceVisit >= 48) {
      // Streak broken
      if (streakData.freezeTokens > 0 && streakData.currentStreak > 0) {
        // Auto-use freeze token
        const newData = {
          ...streakData,
          freezeTokens: streakData.freezeTokens - 1,
          lastVisit: today.toISOString(),
          todayClaimed: false
        };
        saveStreakData(newData);

        toast({
          title: '🛡️ Streak Protected!',
          description: `Used 1 freeze token. You have ${streakData.freezeTokens - 1} left.`,
          duration: 5000
        });
      } else {
        // Streak broken
        const newData = {
          ...streakData,
          currentStreak: 0,
          lastVisit: today.toISOString(),
          todayClaimed: false
        };
        saveStreakData(newData);

        if (streakData.currentStreak > 0) {
          toast({
            title: '💔 Streak Broken',
            description: `Your ${streakData.currentStreak}-day streak ended. Start a new one today!`,
            variant: 'destructive',
            duration: 5000
          });
        }
      }
    }
  };

  const claimDailyReward = () => {
    if (streakData.todayClaimed) {
      toast({
        title: '✅ Already Claimed',
        description: 'Come back tomorrow for another reward!',
        duration: 3000
      });
      return;
    }

    // Calculate reward based on streak
    const baseReward = 50;
    const streakBonus = Math.min(streakData.currentStreak * 10, 200);
    const totalReward = baseReward + streakBonus;

    // Award IGX coins (TODO: Implement IGX system)
    console.log(`[Streak] Awarded ${totalReward} IGX coins`);

    // Update state
    const newData = {
      ...streakData,
      todayClaimed: true
    };
    saveStreakData(newData);

    // Check for milestones
    if (streakData.currentStreak === 7 || streakData.currentStreak === 30 || streakData.currentStreak === 100) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);

      toast({
        title: `🎉 ${streakData.currentStreak}-Day Milestone!`,
        description: `You earned a special badge and +1 freeze token!`,
        duration: 5000
      });

      // Award freeze token at milestones
      newData.freezeTokens += 1;
      saveStreakData(newData);
    } else {
      toast({
        title: '🎁 Daily Reward Claimed!',
        description: `+${totalReward} IGX coins (${baseReward} base + ${streakBonus} streak bonus)`,
        duration: 3000
      });
    }
  };

  const getStreakEmoji = () => {
    if (streakData.currentStreak >= 100) return '💎';
    if (streakData.currentStreak >= 30) return '🔥';
    if (streakData.currentStreak >= 7) return '⚡';
    return '🌟';
  };

  const getNextMilestone = () => {
    if (streakData.currentStreak < 7) return 7;
    if (streakData.currentStreak < 30) return 30;
    if (streakData.currentStreak < 100) return 100;
    return streakData.currentStreak + 100;
  };

  const getMilestoneProgress = () => {
    const milestone = getNextMilestone();
    return ((streakData.currentStreak / milestone) * 100).toFixed(0);
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-orange-50/30 to-amber-50/30 border border-orange-200 hover:border-orange-300 transition-colors relative overflow-hidden shadow-sm">
        {/* Celebration overlay */}
        {showCelebration && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="text-center space-y-4 animate-in zoom-in-50">
              <div className="text-6xl">{getStreakEmoji()}</div>
              <div className="text-2xl font-black text-white">
                {streakData.currentStreak}-DAY MILESTONE!
              </div>
              <div className="text-lg text-white">
                +1 Freeze Token Earned!
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-lg text-gray-900">Watch Streak</h3>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <Badge className="bg-blue-500 text-white">
                {streakData.freezeTokens} Freezes
              </Badge>
            </div>
          </div>

          {/* Current Streak Display - BIG */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 rounded-xl text-center shadow-lg">
            <div className="text-6xl mb-2">{getStreakEmoji()}</div>
            <div className="text-4xl font-black text-white mb-1">
              {streakData.currentStreak}
            </div>
            <div className="text-sm font-semibold text-white/90 uppercase tracking-wide">
              Day Streak
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
              <div className="text-xs text-gray-600 mb-1">Longest</div>
              <div className="text-xl font-black text-orange-600 flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4" />
                {streakData.longestStreak}
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
              <div className="text-xs text-gray-600 mb-1">Total Days</div>
              <div className="text-xl font-black text-gray-900 flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4" />
                {streakData.totalDays}
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
              <div className="text-xs text-gray-600 mb-1">Next Goal</div>
              <div className="text-xl font-black text-blue-600 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />
                {getNextMilestone()}
              </div>
            </div>
          </div>

          {/* Progress to Next Milestone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Progress to {getNextMilestone()}-day milestone</span>
              <span className="font-bold text-orange-600">{getMilestoneProgress()}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${getMilestoneProgress()}%` }}
              />
            </div>
          </div>

          {/* Daily Reward Button */}
          <Button
            onClick={claimDailyReward}
            disabled={streakData.todayClaimed}
            className={`w-full py-6 text-lg font-bold ${
              streakData.todayClaimed
                ? 'bg-gray-400'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
            }`}
          >
            {streakData.todayClaimed ? (
              <>
                <Gift className="w-5 h-5 mr-2" />
                Claimed Today ✓
              </>
            ) : (
              <>
                <Gift className="w-5 h-5 mr-2" />
                Claim Daily Reward (+{50 + Math.min(streakData.currentStreak * 10, 200)} IGX)
              </>
            )}
          </Button>

          {/* Streak Protection Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Shield className="w-4 h-4" />
              Streak Protection
            </div>
            <p className="text-xs text-gray-700">
              Freeze tokens automatically protect your streak if you miss a day.
              Earn more by reaching milestones (7, 30, 100 days).
            </p>
          </div>

          {/* Motivational Message */}
          {streakData.currentStreak > 0 && (
            <div className="text-center p-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg border border-orange-300">
              <p className="text-sm font-semibold text-gray-900">
                {streakData.currentStreak < 7 && "Keep it up! 7-day milestone coming soon 🎯"}
                {streakData.currentStreak >= 7 && streakData.currentStreak < 30 && "You're on fire! 30 days within reach 🔥"}
                {streakData.currentStreak >= 30 && streakData.currentStreak < 100 && "Incredible dedication! Diamond streak ahead 💎"}
                {streakData.currentStreak >= 100 && "LEGENDARY STATUS! You're in the Hall of Fame 👑"}
              </p>
            </div>
          )}

          {/* Come Back Tomorrow */}
          {streakData.todayClaimed && (
            <div className="text-center text-xs text-gray-600">
              Come back tomorrow to claim your next reward!<br/>
              <span className="font-semibold text-orange-600">Don't break the streak!</span>
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

/**
 * QX ORACLE CHALLENGE PAGE
 *
 * The main prediction market interface for QuantumX.
 * 12 daily predictions with real-time odds and rewards.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQXOracle, useQXQuestion } from '@/hooks/useQXOracle';
import { QuantumXLogo } from '@/components/ui/quantumx-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, Trophy, Zap, Target, Users, TrendingUp, Gift,
  ChevronRight, Star, Flame, Crown, AlertCircle, CheckCircle2,
  XCircle, Timer, Coins, Award, BarChart3
} from 'lucide-react';
import type { QXQuestion } from '@/services/qxQuestionService';

// =====================================================
// PREDICTION CARD COMPONENT
// =====================================================

interface PredictionCardProps {
  question: QXQuestion;
  userPrediction?: { selectedOption: string; isCorrect?: boolean | null };
  onPredict: (questionId: string, optionId: string) => Promise<void>;
  disabled?: boolean;
}

const PredictionCard: React.FC<PredictionCardProps> = ({
  question,
  userPrediction,
  onPredict,
  disabled = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { question: liveQuestion, odds, distribution } = useQXQuestion(question.id);

  const displayQuestion = liveQuestion || question;
  const timeUntilClose = new Date(displayQuestion.closesAt).getTime() - Date.now();
  const isExpired = timeUntilClose <= 0;
  const hasUserPredicted = !!userPrediction;

  const formatTime = (ms: number) => {
    if (ms <= 0) return 'Closed';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'HARD': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'JACKPOT': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AGENT': return <Zap className="w-4 h-4" />;
      case 'PRICE': return <TrendingUp className="w-4 h-4" />;
      case 'MARKET': return <BarChart3 className="w-4 h-4" />;
      case 'STRATEGY': return <Target className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || submitting) return;
    setSubmitting(true);
    try {
      await onPredict(displayQuestion.id, selectedOption);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all ${
      displayQuestion.status === 'RESOLVED'
        ? 'bg-slate-800/50 border-slate-700'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/30 hover:border-purple-500/50'
    }`}>
      {/* Status indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        displayQuestion.status === 'OPEN' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        displayQuestion.status === 'CLOSED' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        displayQuestion.status === 'RESOLVED' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
        'bg-gray-600'
      }`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getDifficultyColor(displayQuestion.difficulty)}>
              {displayQuestion.difficulty}
            </Badge>
            <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
              {getCategoryIcon(displayQuestion.category)}
              <span className="ml-1">{displayQuestion.category}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Coins className="w-3 h-3 mr-1" />
              {displayQuestion.baseReward} QX
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-2 text-white">{displayQuestion.title}</CardTitle>
        <p className="text-sm text-slate-400">{displayQuestion.questionText}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Options */}
        <div className="space-y-2">
          {odds.map((option) => {
            const isSelected = selectedOption === option.id;
            const isPredicted = userPrediction?.selectedOption === option.id;
            const isCorrectAnswer = displayQuestion.correctAnswer === option.id;
            const showResult = displayQuestion.status === 'RESOLVED';

            return (
              <button
                key={option.id}
                onClick={() => !hasUserPredicted && !disabled && !isExpired && setSelectedOption(option.id)}
                disabled={hasUserPredicted || disabled || isExpired}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  showResult && isCorrectAnswer
                    ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/50'
                    : showResult && isPredicted && !isCorrectAnswer
                    ? 'bg-red-500/20 border-red-500'
                    : isPredicted
                    ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/50'
                    : isSelected
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                } ${(hasUserPredicted || disabled || isExpired) ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {showResult && isCorrectAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                    {showResult && isPredicted && !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    {isPredicted && !showResult && (
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-white font-medium">{option.text}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400">{option.percentage.toFixed(1)}%</span>
                    <span className="text-amber-400 font-mono">{option.odds.toFixed(1)}x</span>
                  </div>
                </div>
                {/* Progress bar for distribution */}
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isPredicted ? 'bg-purple-500' : 'bg-slate-500'
                    }`}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {distribution.total} predictions
            </span>
            {displayQuestion.status === 'OPEN' && (
              <span className="flex items-center gap-1 text-amber-400">
                <Timer className="w-4 h-4" />
                {formatTime(timeUntilClose)}
              </span>
            )}
          </div>

          {displayQuestion.status === 'OPEN' && !hasUserPredicted && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!selectedOption || submitting || disabled}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              {submitting ? 'Predicting...' : 'Predict'}
            </Button>
          )}

          {hasUserPredicted && displayQuestion.status !== 'RESOLVED' && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Predicted
            </Badge>
          )}

          {displayQuestion.status === 'RESOLVED' && userPrediction && (
            <Badge className={
              userPrediction.isCorrect
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }>
              {userPrediction.isCorrect ? (
                <>
                  <Trophy className="w-3 h-3 mr-1" />
                  Won!
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Lost
                </>
              )}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// =====================================================
// LEADERBOARD COMPONENT
// =====================================================

interface LeaderboardProps {
  entries: Array<{
    rank: number;
    username: string;
    balance: number;
    accuracyPercent: number;
    currentStreak: number;
  }>;
  userRank?: number | null;
  loading?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, userRank, loading }) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-500 font-mono">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 bg-slate-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 10).map((entry) => (
        <div
          key={entry.rank}
          className={`flex items-center justify-between p-3 rounded-lg ${
            (entry.rank ?? 99) <= 3
              ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20'
              : 'bg-slate-800/50 border border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 flex justify-center">
              {getRankIcon(entry.rank ?? 99)}
            </div>
            <div>
              <p className="text-white font-medium">{entry.username || 'Anonymous'}</p>
              <p className="text-xs text-slate-400">
                {(entry.accuracyPercent ?? 0).toFixed(1)}% accuracy
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold font-mono">
              {(entry.balance ?? 0).toLocaleString()} QX
            </p>
            {(entry.currentStreak ?? 0) > 0 && (
              <p className="text-xs text-orange-400 flex items-center justify-end gap-1">
                <Flame className="w-3 h-3" />
                {entry.currentStreak} streak
              </p>
            )}
          </div>
        </div>
      ))}

      {userRank && userRank > 10 && (
        <div className="pt-2 border-t border-slate-700">
          <p className="text-center text-sm text-slate-400">
            Your rank: <span className="text-white font-bold">#{userRank}</span>
          </p>
        </div>
      )}
    </div>
  );
};

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

const QXOracle: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    balance,
    userStats,
    userRank,
    activeQuestions,
    upcomingQuestions,
    resolvedQuestions,
    todaysQuestions,
    leaderboard,
    globalStats,
    countdown,
    phase,
    loading,
    error,
    makePrediction,
    getUserPrediction,
  } = useQXOracle();

  const [activeTab, setActiveTab] = useState('active');

  const handlePredict = async (questionId: string, optionId: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to make predictions',
        variant: 'destructive',
      });
      return;
    }

    const result = await makePrediction(questionId, optionId);

    if (result.success) {
      toast({
        title: result.isEarlyBird ? 'Early Bird Prediction!' : 'Prediction Submitted!',
        description: `Potential reward: ${result.potentialReward?.toLocaleString()} QX`,
      });
    } else {
      toast({
        title: 'Prediction Failed',
        description: result.error || 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <QuantumXLogo size={80} className="mx-auto animate-pulse" />
          <p className="text-slate-400">Loading QX Oracle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QuantumXLogo size={40} />
              <div>
                <h1 className="text-xl font-bold text-white">QX Oracle Challenge</h1>
                <p className="text-xs text-slate-400">Predict. Win. Earn QX.</p>
              </div>
            </div>

            {user && balance && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-amber-400 font-bold text-lg font-mono">
                    {(balance.balance ?? 0).toLocaleString()} QX
                  </p>
                  <p className="text-xs text-slate-400">
                    Rank #{userRank || '-'}
                  </p>
                </div>
                {userStats && (userStats.currentStreak ?? 0) > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    <Flame className="w-3 h-3 mr-1" />
                    {userStats.currentStreak}x streak
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Phase Banner */}
        {phase && (
          <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold">{phase.name || 'Current Phase'}</h2>
                  <p className="text-sm text-slate-400">
                    {(phase.dailyPool ?? 0).toLocaleString()} QX distributed daily
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{phase.daysRemaining ?? 0}</p>
                  <p className="text-xs text-slate-400">Days Left</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {(globalStats?.totalQXDistributed ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">QX Distributed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {(globalStats?.totalUsers ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">Predictors</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Question Countdown */}
        <div className="mb-8 flex items-center justify-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <Clock className="w-5 h-5 text-purple-400" />
          <span className="text-slate-400">Next prediction opens in:</span>
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 px-3 py-1 rounded font-mono text-white">
              {String(countdown?.hours ?? 0).padStart(2, '0')}
            </div>
            <span className="text-slate-500">:</span>
            <div className="bg-slate-900 px-3 py-1 rounded font-mono text-white">
              {String(countdown?.minutes ?? 0).padStart(2, '0')}
            </div>
            <span className="text-slate-500">:</span>
            <div className="bg-slate-900 px-3 py-1 rounded font-mono text-white">
              {String(countdown?.seconds ?? 0).padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-slate-800/50 border border-slate-700">
                <TabsTrigger value="active" className="flex-1">
                  <Zap className="w-4 h-4 mr-2" />
                  Active ({activeQuestions.length})
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="flex-1">
                  <Clock className="w-4 h-4 mr-2" />
                  Upcoming
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4 mt-4">
                {activeQuestions.length === 0 ? (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-white font-medium mb-2">No Active Predictions</h3>
                      <p className="text-slate-400 text-sm">
                        Next prediction opens in {countdown.hours}h {countdown.minutes}m
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  activeQuestions.map((question) => (
                    <PredictionCard
                      key={question.id}
                      question={question}
                      userPrediction={getUserPrediction(question.id)}
                      onPredict={handlePredict}
                      disabled={!user}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {upcomingQuestions.length === 0 ? (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-white font-medium mb-2">No Upcoming Predictions</h3>
                      <p className="text-slate-400 text-sm">Check back later</p>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingQuestions.map((question) => (
                    <Card key={question.id} className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-slate-700/50 text-slate-300">
                            Slot {question.scheduledSlot + 1}
                          </Badge>
                          <span className="text-sm text-slate-400">
                            Opens {new Date(question.opensAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <CardTitle className="text-white">{question.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-400 text-sm">{question.questionText}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge className="bg-amber-500/20 text-amber-400">
                            {question.baseReward} QX
                          </Badge>
                          <Badge variant="outline" className="text-slate-400">
                            {question.difficulty}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="resolved" className="space-y-4 mt-4">
                {resolvedQuestions.length === 0 ? (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-white font-medium mb-2">No Resolved Predictions Yet</h3>
                      <p className="text-slate-400 text-sm">Results will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  resolvedQuestions.map((question) => (
                    <PredictionCard
                      key={question.id}
                      question={question}
                      userPrediction={getUserPrediction(question.id)}
                      onPredict={handlePredict}
                      disabled
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            {user && userStats && (
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Your Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{userStats.totalPredictions}</p>
                      <p className="text-xs text-slate-400">Predictions</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {userStats.accuracyPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-400">Accuracy</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-400">{userStats.currentStreak}</p>
                      <p className="text-xs text-slate-400">Current Streak</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-400">{userStats.maxStreak}</p>
                      <p className="text-xs text-slate-400">Best Streak</p>
                    </div>
                  </div>

                  {balance?.referralCode && (
                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-xs text-purple-400 mb-1">Your Referral Code</p>
                      <p className="text-white font-mono font-bold">{balance.referralCode}</p>
                      <p className="text-xs text-slate-400 mt-1">Share to earn 10% of referral earnings</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Leaderboard */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Top Predictors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard
                  entries={leaderboard}
                  userRank={userRank}
                  loading={loading}
                />
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">1</div>
                  <p className="text-slate-300">12 predictions unlock every 2 hours</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">2</div>
                  <p className="text-slate-300">Predict on agent performance, prices & market</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">3</div>
                  <p className="text-slate-300">Win QX tokens for correct predictions</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                    <Flame className="w-3 h-3" />
                  </div>
                  <p className="text-slate-300">Build streaks for up to 5x multiplier!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QXOracle;

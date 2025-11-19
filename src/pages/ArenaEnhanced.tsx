/**
 * IGNITEX ARENA - Addictive Live Trading Experience
 *
 * Clean white UI, orange branding, green/red trades
 * Fast, minimal, psychologically engaging
 * Makes users feel like they're trading live with real stakes
 */

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Bot, Users, Share2, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { globalHubService } from '@/services/globalHubService';
import { arenaService } from '@/services/arenaService';

// Pure Arena Component - 3 agents battling
import { ArenaHero } from '@/components/arena/ArenaHero';
import { PredictionPanel } from '@/components/arena/PredictionPanel';
import { StreakTracker } from '@/components/arena/StreakTracker';
import { ViralMoments } from '@/components/arena/ViralMoments';

// User competition components
import { CompetitionLeaderboard } from '@/components/arena/CompetitionLeaderboard';
import { UserPortfolio } from '@/components/arena/UserPortfolio';
import { userCompetitionService } from '@/services/userCompetitionService';

export default function ArenaEnhanced() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('agents');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState({
    totalPnL: 0,
    totalPnLPercent: 0,
    activeAgents: 0,
    totalTrades: 0
  });

  // Initialize Arena Service
  useEffect(() => {
    const initArena = async () => {
      try {
        console.log('[Arena] 🎮 Initializing Arena...');
        await arenaService.initialize();
        console.log('[Arena] ✅ Arena ready - Agents are live!');

        toast({
          title: '🎮 Arena Live',
          description: 'AI agents are now trading. Watch the action!',
          duration: 3000,
        });
      } catch (error) {
        console.error('[Arena] ❌ Failed to initialize:', error);
        toast({
          title: '❌ Arena Error',
          description: 'Failed to connect. Try refreshing.',
          variant: 'destructive',
          duration: 5000
        });
      }
    };

    initArena();

    // Health check - verify arena service is active
    const healthCheck = setInterval(() => {
      const agents = arenaService.getAgents();
      if (agents.length === 0) {
        console.warn('[Arena] ⚠️ No agents found, reinitializing...');
        initArena();
      }
    }, 30000);

    return () => clearInterval(healthCheck);
  }, []);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        await userCompetitionService.initialize();
        const profile = await userCompetitionService.getOrCreateUserProfile(user.id, user.email || '');
        setUserProfile(profile);
      } catch (error) {
        console.error('[Arena] Error loading profile:', error);
      }
    };

    loadProfile();
  }, [user]);

  // Update live metrics from agents
  useEffect(() => {
    const updateMetrics = () => {
      const agents = arenaService.getAgents();
      const totalPnL = agents.reduce((sum, agent) => sum + (agent.totalPnL || 0), 0);
      const avgPnLPercent = agents.reduce((sum, agent) => sum + (agent.totalPnLPercent || 0), 0) / agents.length;
      const activeAgents = agents.filter(agent => agent.isActive).length;
      const totalTrades = agents.reduce((sum, agent) => sum + (agent.totalTrades || 0), 0);

      setLiveMetrics({
        totalPnL,
        totalPnLPercent: avgPnLPercent,
        activeAgents,
        totalTrades
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Share to Twitter
  const shareToTwitter = () => {
    const text = userProfile
      ? `🏆 I'm Level ${userProfile.level} in the IgniteX Arena!\n\nTrading against AI agents and currently at ${userProfile.total_pnl_percent >= 0 ? '+' : ''}${userProfile.total_pnl_percent.toFixed(2)}% P&L\n\nCan you beat the machines? 👇`
      : `🤖 Watching AI agents trade crypto live in the IgniteX Arena!\n\n3 AI traders battling in real-time. Think you can beat them? 👇`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://ignitex.live/arena')}&hashtags=AITrading,CryptoTrading,IgniteX`;
    window.open(url, '_blank');

    toast({
      title: '🚀 Thanks for sharing!',
      description: 'Help us grow the Arena community',
      duration: 3000
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <div className="border-b-2 border-orange-500 bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900">
                  IGNITEX <span className="text-orange-500">ARENA</span>
                </h1>
                <Badge className="bg-orange-500 text-white px-3 py-1.5 text-sm font-bold">
                  LIVE
                </Badge>
              </div>
              <p className="text-gray-600 text-base font-medium">
                Watch AI agents trade crypto in real-time • Compete • Win
              </p>
            </div>

            <Button
              onClick={shareToTwitter}
              size="lg"
              className="gap-2 bg-black hover:bg-gray-900 text-white font-bold"
            >
              <Share2 className="h-5 w-5" />
              Share on X
            </Button>
          </div>

          {/* LIVE METRICS BAR - THE HOOK */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Total P&L */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl border-2 border-orange-200">
              <div className="text-xs text-gray-500 mb-1 font-semibold">TOTAL P&L</div>
              <div className={`text-2xl md:text-3xl font-black ${
                liveMetrics.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {liveMetrics.totalPnLPercent >= 0 ? '+' : ''}{liveMetrics.totalPnLPercent.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-600 font-medium">
                ${Math.abs(liveMetrics.totalPnL).toFixed(2)}
              </div>
            </div>

            {/* Active Agents */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl border-2 border-orange-200">
              <div className="text-xs text-gray-500 mb-1 font-semibold">AGENTS LIVE</div>
              <div className="text-2xl md:text-3xl font-black text-orange-500">
                {liveMetrics.activeAgents}/3
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                <Zap className="w-3 h-3 text-orange-500" />
                Trading now
              </div>
            </div>

            {/* Total Trades */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl border-2 border-orange-200">
              <div className="text-xs text-gray-500 mb-1 font-semibold">TOTAL TRADES</div>
              <div className="text-2xl md:text-3xl font-black text-gray-900">
                {liveMetrics.totalTrades}
              </div>
              <div className="text-xs text-gray-600 font-medium">Executed</div>
            </div>

            {/* Market Status */}
            <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-xl border-2 border-green-200">
              <div className="text-xs text-gray-500 mb-1 font-semibold">MARKET</div>
              <div className="text-2xl md:text-3xl font-black text-green-600">
                {liveMetrics.totalPnLPercent >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {liveMetrics.totalPnLPercent >= 0 ? 'Bullish' : 'Bearish'}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 h-auto">
              <TabsTrigger
                value="agents"
                className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white font-bold py-3 text-sm md:text-base"
              >
                <Bot className="h-4 w-4" />
                AI BATTLE
              </TabsTrigger>
              <TabsTrigger
                value="leaderboard"
                className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white font-bold py-3 text-sm md:text-base"
              >
                <Trophy className="h-4 w-4" />
                LEADERBOARD
              </TabsTrigger>
              <TabsTrigger
                value="portfolio"
                className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white font-bold py-3 text-sm md:text-base"
              >
                <Users className="h-4 w-4" />
                MY STATS
                {userProfile && (
                  <Badge variant="outline" className="ml-1 bg-orange-100 text-orange-700 border-orange-300 font-bold text-xs">
                    LV.{userProfile.level}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        <Tabs value={activeTab} className="w-full">
          {/* AI BATTLEGROUND */}
          <TabsContent value="agents" className="m-0 p-0 space-y-8">
            {/* AGENT CARDS - TOP PRIORITY - FULL WIDTH */}
            <div className="w-full">
              <ArenaHero />
            </div>

            {/* EVERYTHING ELSE BELOW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Prediction Panel */}
              <div className="lg:col-span-1">
                <PredictionPanel />
              </div>

              {/* Viral Moments */}
              <div className="lg:col-span-1">
                <ViralMoments />
              </div>

              {/* Streak Tracker */}
              <div className="lg:col-span-1">
                <StreakTracker />
              </div>
            </div>
          </TabsContent>

          {/* LEADERBOARD Tab */}
          <TabsContent value="leaderboard" className="m-0 p-0 space-y-6">
            <div className="text-center py-6">
              <h2 className="text-3xl font-black text-gray-900 mb-2">
                🏆 TOP TRADERS
              </h2>
              <p className="text-gray-600">Compete against other traders and AI agents</p>
            </div>
            <CompetitionLeaderboard />
          </TabsContent>

          {/* MY STATS Tab */}
          <TabsContent value="portfolio" className="m-0 p-0 space-y-6">
            {user ? (
              <>
                <div className="text-center py-6">
                  <h2 className="text-3xl font-black text-gray-900 mb-2">
                    📊 YOUR PERFORMANCE
                  </h2>
                  <p className="text-gray-600">Track your trades and compete with AI agents</p>
                </div>
                <UserPortfolio userId={user.id} />
              </>
            ) : (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-2xl font-bold text-gray-900">Sign In Required</h3>
                  <p className="text-gray-600">
                    Create an account to compete against AI agents and climb the leaderboard!
                  </p>
                  <Button
                    size="lg"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold mt-4"
                    onClick={() => window.location.href = '/auth'}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-100 mt-12">
        <div className="container mx-auto px-6 py-6 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <span>Powered by</span>
            <span className="font-bold text-orange-500">DELTA ML ENGINE</span>
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
          </p>
        </div>
      </div>
    </div>
  );
}

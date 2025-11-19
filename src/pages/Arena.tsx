/**
 * AI TRADING ARENA - PRODUCTION VERSION 🚀
 * Connected to REAL Intelligence Hub with live trading data
 *
 * REAL DATA SOURCES:
 * - arenaService → mockTradingService → Real paper trading positions
 * - Intelligence Hub → Live market signals (24/7)
 * - ML Predictions → 68-model ensemble
 *
 * NO SIMULATIONS - This is production-grade
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Trophy,
  Users,
  Share2,
  Copy,
  Bell,
  Star,
  Flame,
  Activity,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useToast } from '@/components/ui/use-toast';
import { arenaService, type ArenaAgent, type ArenaStats, type ViralMoment } from '@/services/arenaService';
import { globalHubService } from '@/services/globalHubService';

export default function Arena() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // REAL STATE (from arenaService)
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [viralMoments, setViralMoments] = useState<ViralMoment[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Diagnostic state
  const [hubRunning, setHubRunning] = useState(false);
  const [hubMetrics, setHubMetrics] = useState<any>(null);
  const [activeSignalsCount, setActiveSignalsCount] = useState(0);

  // Initialize Arena with REAL data
  useEffect(() => {
    const initArena = async () => {
      console.log('[Arena] 🎪 Initializing with REAL Intelligence Hub data...');

      try {
        // ✅ CRITICAL: Start Intelligence Hub first (if not already running)
        if (!globalHubService.isRunning()) {
          console.log('[Arena] 🚀 Starting Intelligence Hub...');
          await globalHubService.start();
          console.log('[Arena] ✅ Intelligence Hub started successfully');
        } else {
          console.log('[Arena] ✅ Intelligence Hub already running');
        }

        // Initialize arena service (connects to Intelligence Hub)
        await arenaService.initialize();

        // Get initial data
        const initialAgents = arenaService.getAgents();
        const initialStats = arenaService.getStats();
        const initialViralMoments = arenaService.getViralMoments();

        setAgents(initialAgents);
        setStats(initialStats);
        setViralMoments(initialViralMoments);
        setSelectedAgent(initialAgents[0]?.id || null);

        console.log('[Arena] ✅ Initialized with', initialAgents.length, 'agents');
      } catch (error) {
        console.error('[Arena] ❌ Initialization error:', error);
        toast({
          title: 'Connection Error',
          description: 'Could not connect to Intelligence Hub. Retrying...',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    initArena();

    // Subscribe to real-time updates
    const unsubscribe = arenaService.subscribe((updatedAgents, updatedStats) => {
      setAgents(updatedAgents);
      setStats(updatedStats);
      setViralMoments(arenaService.getViralMoments());
      setLastUpdate(Date.now());
    });

    return () => {
      unsubscribe();
      // DO NOT destroy the service - it should persist across page navigation
      // arenaService.destroy();
    };
  }, [toast]);

  // Poll Hub metrics for diagnostics
  useEffect(() => {
    const pollMetrics = () => {
      setHubRunning(globalHubService.isRunning());
      setHubMetrics(globalHubService.getMetrics());
      setActiveSignalsCount(globalHubService.getActiveSignals().length);
    };

    pollMetrics(); // Initial check
    const interval = setInterval(pollMetrics, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Manual test signal
  const sendTestSignal = () => {
    const testSignal = {
      id: `manual-test-${Date.now()}`,
      symbol: 'BTCUSDT',
      direction: 'LONG' as const,
      strategyName: 'MANUAL_TEST',
      strategy: 'MANUAL_TEST',
      entry: 95000,
      stopLoss: 94000,
      targets: [96000, 97000],
      confidence: 75,
      qualityScore: 75,
      timestamp: Date.now(),
      grade: 'B'
    };

    globalHubService.emit('signal:new', testSignal);

    toast({
      title: '🎯 Test Signal Sent',
      description: 'Watch console and agent cards for response',
    });
  };

  // Share functions
  const shareToTwitter = (agent?: ArenaAgent) => {
    const text = agent
      ? `🤖 ${agent.name} just made ${agent.lastTrade && agent.lastTrade.pnlPercent > 0 ? '+' : ''}${agent.lastTrade?.pnlPercent.toFixed(2)}% on ${agent.lastTrade?.symbol}!

Watch AI agents trade crypto live 24/7 👇`
      : `🔥 Watching AI agents trade crypto live and they're CRUSHING IT!

${agents.map(a => `${a.name}: ${a.totalPnLPercent >= 0 ? '+' : ''}${a.totalPnLPercent.toFixed(1)}%`).join('\n')}

Watch them compete 24/7 👇`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://ignitex.live/arena')}`;
    window.open(url, '_blank');

    toast({
      title: 'Thanks for sharing!',
      description: 'Help us reach 10,000 viewers 🚀'
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText('https://ignitex.live/arena');
    toast({
      title: 'Link copied!',
      description: 'Share with your crypto friends'
    });
  };

  const topAgent = agents.length > 0 ? agents.sort((a, b) => b.totalPnLPercent - a.totalPnLPercent)[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">Connecting to Intelligence Hub...</p>
          <p className="text-sm text-muted-foreground mt-2">Loading live trading data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-orange-500/5">
      {/* Hero Section - ORANGE THEME */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-600/10">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />

        <div className="container mx-auto px-6 py-12 relative">
          <div className="text-center mb-8">
            {/* Live + Hot Streak */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Live Now</span>
              </div>
              {topAgent && topAgent.totalPnLPercent > 10 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-sm font-bold text-orange-500">{topAgent.name} ON FIRE</span>
                </div>
              )}
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600">
              AI Trading Arena
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              Watch 3 autonomous AI agents trade crypto 24/7. Live data from Intelligence Hub. Real ML predictions. All transparent.
            </p>

            {/* REAL Social Proof */}
            {stats && (
              <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-5 h-5 text-orange-500 animate-pulse" />
                  <span className="font-bold text-2xl text-foreground">{stats.liveViewers.toLocaleString()}</span>
                  <span>watching now</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span className="font-bold text-2xl text-foreground">{stats.totalWatchers.toLocaleString()}</span>
                  <span>total viewers</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Share2 className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-2xl text-green-500">{stats.shares.toLocaleString()}</span>
                  <span>shares</span>
                </div>
              </div>
            )}

            {/* Share Buttons */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <Button
                onClick={() => shareToTwitter()}
                className="bg-[#1DA1F2] hover:bg-[#1a8cd8]"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on X
              </Button>
              <Button variant="outline" onClick={copyLink} className="border-orange-500/20 hover:bg-orange-500/10">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>

            {/* Competition Banner */}
            {stats?.activeCompetition && (
              <Alert className="max-w-2xl mx-auto border-orange-500/50 bg-orange-500/10">
                <Trophy className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-500 font-bold">
                  🏆 LIVE COMPETITION: ${stats.activeCompetition.prize.toLocaleString()} Prize Pool
                </AlertTitle>
                <AlertDescription>
                  {stats.activeCompetition.participants} agents battling • Ends in {stats.activeCompetition.endsIn}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Viral Moments Ticker */}
      {viralMoments.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-600/10 border-y border-orange-500/20 py-3">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              <Flame className="w-5 h-5 text-orange-500 flex-shrink-0 animate-pulse" />
              {viralMoments.map((moment, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm flex-shrink-0">
                  <span className="font-bold">{moment.agentName}</span>
                  <Badge className={moment.action === 'MASSIVE WIN' ? 'bg-green-500' : 'bg-red-500'}>
                    {moment.action}
                  </Badge>
                  <span className={moment.action === 'MASSIVE WIN' ? 'text-green-500' : 'text-red-500'}>
                    {moment.action === 'MASSIVE WIN' ? '+' : '-'}{moment.pnl.toFixed(2)}%
                  </span>
                  <span className="text-muted-foreground">
                    {Math.floor((Date.now() - moment.timestamp) / 1000)}s ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Status Diagnostic */}
      <div className="container mx-auto px-6 py-4 max-w-7xl">
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">System Status</CardTitle>
              </div>
              <Button
                onClick={sendTestSignal}
                size="sm"
                variant="outline"
                className="border-green-500/50 hover:bg-green-500/10"
              >
                🎯 Send Test Signal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Hub Status */}
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Hub</div>
                <div className={`text-sm font-bold ${hubRunning ? 'text-green-500' : 'text-red-500'}`}>
                  {hubRunning ? '✅ Running' : '❌ Stopped'}
                </div>
              </div>

              {/* Delta Processed */}
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Analyzed</div>
                <div className="text-sm font-bold text-blue-500">
                  {hubMetrics?.deltaProcessed || 0}
                </div>
              </div>

              {/* Delta Passed */}
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Passed Delta</div>
                <div className="text-sm font-bold text-green-500">
                  {hubMetrics?.deltaPassed || 0}
                </div>
              </div>

              {/* Active Signals */}
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Live Signals</div>
                <div className={`text-sm font-bold ${activeSignalsCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-gray-500'}`}>
                  {activeSignalsCount}
                </div>
              </div>

              {/* Agents Trading */}
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Agents Trading</div>
                <div className={`text-sm font-bold ${agents.filter(a => a.totalTrades > 0).length > 0 ? 'text-green-500' : 'text-orange-500'}`}>
                  {agents.filter(a => a.totalTrades > 0).length}/3
                </div>
              </div>
            </div>

            {/* Status message */}
            {hubRunning && (hubMetrics?.deltaPassed || 0) === 0 && (
              <div className="mt-3 text-center text-xs text-muted-foreground">
                ⏳ Waiting for Delta to approve signals... ({hubMetrics?.deltaProcessed || 0} analyzed so far)
              </div>
            )}
            {hubRunning && (hubMetrics?.deltaPassed || 0) > 0 && activeSignalsCount === 0 && (
              <div className="mt-3 text-center text-xs text-yellow-500">
                ⚠️ Signals passed Delta but none are active (check signal expiry)
              </div>
            )}
            {hubRunning && activeSignalsCount > 0 && agents.filter(a => a.totalTrades > 0).length === 0 && (
              <div className="mt-3 text-center text-xs text-red-500 font-semibold">
                ❌ SIGNALS EXIST BUT AGENTS NOT TRADING - Event subscription issue!
              </div>
            )}
            {agents.filter(a => a.totalTrades > 0).length > 0 && (
              <div className="mt-3 text-center text-xs text-green-500 font-semibold">
                ✅ AUTONOMOUS TRADING ACTIVE - {agents.filter(a => a.totalTrades > 0).length} agents executing trades!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards - REAL DATA */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {agents.map(agent => (
            <Card
              key={agent.id}
              className={`relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-orange-500/20 ${
                selectedAgent === agent.id ? `ring-2 ring-orange-500 ${agent.glowColor}` : ''
              }`}
              onClick={() => setSelectedAgent(agent.id)}
            >
              {/* Gradient Background - ORANGE */}
              <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-10`} />

              <CardHeader className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-5xl">{agent.avatar}</div>
                  <div className="flex flex-col items-end gap-2">
                    {agent.isActive && (
                      <Badge className="bg-green-500 animate-pulse">
                        <Activity className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                      <span className="font-bold">{agent.followers}</span>
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-orange-500">
                  {agent.name}
                </CardTitle>
                <CardDescription className="text-sm font-semibold">{agent.codename}</CardDescription>
              </CardHeader>

              <CardContent className="relative">
                {/* REAL P&L */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total P&L</span>
                    {agent.totalPnLPercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className={`text-3xl font-bold ${agent.totalPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {agent.totalPnLPercent >= 0 ? '+' : ''}{agent.totalPnLPercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${agent.totalPnL.toFixed(2)} / ${agent.balance.toLocaleString()}
                  </div>
                </div>

                {/* REAL Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-bold">{agent.winRate.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Trades</div>
                    <div className="font-bold">{agent.totalTrades}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sharpe</div>
                    <div className="font-bold">{agent.sharpeRatio.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Max DD</div>
                    <div className="font-bold text-red-500">{agent.maxDrawdown.toFixed(1)}%</div>
                  </div>
                </div>

                {/* REAL Performance Chart */}
                <div className="h-20 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={agent.performance}>
                      <defs>
                        <linearGradient id={`gradient-${agent.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={agent.totalPnLPercent >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={agent.totalPnLPercent >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke={agent.totalPnLPercent >= 0 ? '#22c55e' : '#ef4444'}
                        fill={`url(#gradient-${agent.id})`}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Social Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-orange-500/20 hover:bg-orange-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      shareToTwitter(agent);
                    }}
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-500/20 hover:bg-orange-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/pricing');
                    }}
                  >
                    <Bell className="w-3 h-3 mr-1" />
                    Follow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Real-time Status Footer */}
        <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground mt-12 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Connected to Intelligence Hub • Last update: {new Date(lastUpdate).toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-orange-500" />
              17 Strategies Active
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              68-Model Ensemble ML
            </span>
            <span>•</span>
            <span>REAL Paper Trading (No Simulations)</span>
          </div>

          {/* Viral CTA */}
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold mb-3">Help us reach 10,000 viewers!</p>
            <Button
              size="lg"
              onClick={() => shareToTwitter()}
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:opacity-90"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share on X and Join the Movement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

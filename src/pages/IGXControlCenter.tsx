/**
 * IGX CONTROL CENTER
 *
 * Ultimate developer command center with stunning black/orange aesthetic
 * Complete remote control for Arena + Intelligence Hub
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Database,
  Activity,
  Terminal,
  AlertCircle,
  CheckCircle,
  Zap,
  Target,
  TrendingUp,
  Download,
  Play,
  Pause,
  SkipForward,
  Flame,
  Cpu,
  HardDrive,
  Brain,
  Filter,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Shield,
  Search
} from 'lucide-react';
import { arenaService } from '@/services/arenaService';
import { globalHubService } from '@/services/globalHubService';
import { deltaV2QualityEngine } from '@/services/deltaV2QualityEngine';
import { igxGammaV2 } from '@/services/igx/IGXGammaV2';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

interface SystemStatus {
  arena: {
    running: boolean;
    agents: number;
    lastUpdate: number;
  };
  hub: {
    running: boolean;
    signals: number;
    lastSignal: number;
  };
  database: {
    connected: boolean;
    latency: number;
  };
}

interface LogEntry {
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'success';
  source: 'arena' | 'hub' | 'system';
  message: string;
}

const CRYPTO_SYMBOLS = ['₿', 'Ξ', '���', '♦', '●', '◆', '○', '▲'];

interface FlowingParticle {
  id: string;
  stage: number;
  progress: number;
  symbol: string;
  speed: number;
  color: string;
  size: 'sm' | 'md' | 'lg';
}

export default function IGXControlCenter() {
  const { toast } = useToast();
  const animationFrameRef = useRef<number>();

  const [status, setStatus] = useState<SystemStatus>({
    arena: { running: false, agents: 0, lastUpdate: 0 },
    hub: { running: false, signals: 0, lastSignal: 0 },
    database: { connected: false, latency: 0 }
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  // Pipeline visualization state
  const [flowingParticles, setFlowingParticles] = useState<FlowingParticle[]>([]);
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);
  const [metrics, setMetrics] = useState(globalHubService.getMetrics());

  // Delta threshold controls
  const [deltaThresholds, setDeltaThresholds] = useState(() => deltaV2QualityEngine.getThresholds());

  // Gamma tier configuration controls
  const [gammaTierConfig, setGammaTierConfig] = useState(() => igxGammaV2.getTierConfig());

  const addLog = (level: LogEntry['level'], source: LogEntry['source'], message: string) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), level, source, message }].slice(-100));
  };

  const checkStatus = async () => {
    try {
      const dbStart = Date.now();
      const { error } = await supabase.from('mock_trading_accounts').select('count').limit(1);
      const dbLatency = Date.now() - dbStart;

      const hubRunning = globalHubService.isRunning();
      const activeSignals = globalHubService.getActiveSignals();
      const agents = arenaService.getAgents();

      setStatus({
        arena: {
          running: agents.length > 0,
          agents: agents.length,
          lastUpdate: Date.now()
        },
        hub: {
          running: hubRunning,
          signals: activeSignals.length,
          lastSignal: activeSignals.length > 0 ? new Date(activeSignals[0].timestamp).getTime() : 0
        },
        database: {
          connected: !error,
          latency: dbLatency
        }
      });
    } catch (err) {
      addLog('error', 'system', 'Failed to check system status');
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 CRITICAL: Refresh metrics from globalHubService every 2 seconds
  // This ensures metrics persist across page refreshes and stay up-to-date
  useEffect(() => {
    const refreshMetrics = () => {
      const latestMetrics = globalHubService.getMetrics();
      setMetrics(latestMetrics);
    };

    // Initial refresh
    refreshMetrics();

    // Refresh every 2 seconds
    const interval = setInterval(refreshMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Force component re-render every 2 seconds to update agent status
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  // ARENA CONTROLS
  const handleStartArena = async () => {
    try {
      addLog('info', 'arena', 'Starting Arena...');
      await arenaService.initialize();
      addLog('success', 'arena', '✅ Arena started successfully');
      checkStatus();
      toast({ title: 'Arena Started', description: 'All systems operational' });
    } catch (err) {
      addLog('error', 'arena', `Failed to start Arena: ${err}`);
      toast({ title: 'Error', description: 'Failed to start Arena', variant: 'destructive' });
    }
  };

  const handleStopArena = () => {
    try {
      addLog('info', 'arena', 'Stopping Arena...');
      arenaService.destroy();
      addLog('success', 'arena', '✅ Arena stopped');
      checkStatus();
      toast({ title: 'Arena Stopped', description: 'System shutdown complete' });
    } catch (err) {
      addLog('error', 'arena', `Failed to stop Arena: ${err}`);
    }
  };

  const handleResetArena = async () => {
    if (!confirm('⚠️ RESET ARENA?\n\nThis will:\n- Clear all agent data\n- Reset balances to $10,000\n- Delete all positions\n\nContinue?')) {
      return;
    }

    try {
      addLog('warning', 'arena', '⚠️ Resetting Arena data...');
      localStorage.removeItem('arena_agents_cache');
      arenaService.destroy();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await arenaService.initialize();
      addLog('success', 'arena', '✅ Arena reset complete - Run SQL cleanup in Supabase');
      toast({
        title: 'Arena Reset',
        description: 'Remember to run SQL cleanup in Database tab',
        duration: 10000
      });
    } catch (err) {
      addLog('error', 'arena', `Failed to reset Arena: ${err}`);
    }
  };

  // HUB CONTROLS
  const handleStartHub = async () => {
    try {
      addLog('info', 'hub', 'Starting Intelligence Hub...');
      await globalHubService.start();
      addLog('success', 'hub', '✅ Intelligence Hub started');
      checkStatus();
      toast({ title: 'Hub Started', description: 'Signal generation active' });
    } catch (err) {
      addLog('error', 'hub', `Failed to start Hub: ${err}`);
      toast({ title: 'Error', description: 'Failed to start Hub', variant: 'destructive' });
    }
  };

  const handleStopHub = () => {
    try {
      addLog('info', 'hub', 'Stopping Intelligence Hub...');
      globalHubService.stop();
      addLog('success', 'hub', '✅ Intelligence Hub stopped');
      checkStatus();
      toast({ title: 'Hub Stopped', description: 'Signal generation paused' });
    } catch (err) {
      addLog('error', 'hub', `Failed to stop Hub: ${err}`);
    }
  };

  const handleClearSignals = () => {
    if (!confirm('⚠️ CLEAR ALL SIGNALS?\n\nThis will remove all active signals and restart signal generation.\n\nContinue?')) {
      return;
    }

    try {
      addLog('warning', 'hub', '⚠️ Clearing all signals...');
      globalHubService.stop();
      setTimeout(() => {
        globalHubService.start();
        addLog('success', 'hub', '✅ Signals cleared - Fresh generation started');
        toast({ title: 'Signals Cleared', description: 'New signals generating...' });
      }, 500);
    } catch (err) {
      addLog('error', 'hub', `Failed to clear signals: ${err}`);
    }
  };

  // DATABASE CONTROLS
  const handleRunSQLCleanup = async () => {
    if (!confirm('⚠️ RUN SQL CLEANUP?\n\nThis will:\n- Delete all agent positions\n- Delete all trade history\n- Reset balances to $10,000\n\nContinue?')) {
      return;
    }

    try {
      addLog('warning', 'system', '⚠️ Running SQL cleanup...');

      await supabase.from('mock_trading_positions').delete().in('user_id', [
        'agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'
      ]);

      await supabase.from('mock_trading_history').delete().in('user_id', [
        'agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'
      ]);

      await supabase.from('mock_trading_accounts').upsert([
        { user_id: 'agent-nexus-01', balance: 10000, initial_balance: 10000, display_name: 'NEXUS-01', total_trades: 0, winning_trades: 0, losing_trades: 0, total_profit_loss: 0 },
        { user_id: 'agent-quantum-x', balance: 10000, initial_balance: 10000, display_name: 'QUANTUM-X', total_trades: 0, winning_trades: 0, losing_trades: 0, total_profit_loss: 0 },
        { user_id: 'agent-zeonix', balance: 10000, initial_balance: 10000, display_name: 'ZEONIX', total_trades: 0, winning_trades: 0, losing_trades: 0, total_profit_loss: 0 }
      ]);

      addLog('success', 'system', '✅ SQL cleanup complete');
      toast({ title: 'Database Cleaned', description: 'All agent data reset' });
    } catch (err) {
      addLog('error', 'system', `SQL cleanup failed: ${err}`);
      toast({ title: 'Error', description: 'SQL cleanup failed', variant: 'destructive' });
    }
  };

  // NUCLEAR RESET
  const handleNuclearReset = async () => {
    if (!confirm('☢️ NUCLEAR RESET?\n\nThis will:\n- Stop all services\n- Clear all caches\n- Reset database\n- Clear browser storage\n- Restart everything\n\nThis is irreversible. Continue?')) {
      return;
    }

    try {
      addLog('error', 'system', '☢️ NUCLEAR RESET INITIATED...');
      globalHubService.stop();
      arenaService.destroy();
      localStorage.clear();
      sessionStorage.clear();
      await handleRunSQLCleanup();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await globalHubService.start();
      await arenaService.initialize();
      addLog('success', 'system', '✅ NUCLEAR RESET COMPLETE - System online');
      toast({
        title: 'Nuclear Reset Complete',
        description: 'All systems restarted with fresh data',
        duration: 10000
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      addLog('error', 'system', `Nuclear reset failed: ${err}`);
      toast({ title: 'Error', description: 'Nuclear reset failed', variant: 'destructive' });
    }
  };

  const handleExportLogs = () => {
    const logsText = logs.map(log =>
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `igx-logs-${Date.now()}.txt`;
    a.click();

    addLog('info', 'system', '📥 Logs exported');
    toast({ title: 'Logs Exported', description: 'Log file downloaded' });
  };

  // PIPELINE HELPER FUNCTIONS
  const fmt = (num: number) => num.toLocaleString();
  const fmtDec = (num: number) => num.toFixed(1);

  const getStagePos = (stage: number): string => {
    const positions = ['6%', '21%', '36%', '51%', '66%', '81%'];
    return positions[Math.min(stage, 5)] || '6%';
  };

  const getParticleSize = (size: string) => {
    if (size === 'lg') return 'text-base';
    if (size === 'md') return 'text-sm';
    return 'text-xs';
  };

  const toggleEngine = (engineName: string) => {
    setExpandedEngine(expandedEngine === engineName ? null : engineName);
  };

  // Delta threshold handlers
  const handleQualityThresholdChange = (value: number[]) => {
    const newQuality = value[0];
    deltaV2QualityEngine.setThresholds(newQuality, deltaThresholds.ml, deltaThresholds.strategyWinRate);
    setDeltaThresholds(deltaV2QualityEngine.getThresholds());
    addLog('success', 'system', `🎚️ Quality threshold updated to ${newQuality}`);
    toast({ title: 'Threshold Updated', description: `Quality threshold set to ${newQuality}` });
  };

  const handleMLThresholdChange = (value: number[]) => {
    const newML = value[0] / 100; // Convert from 0-100 to 0-1
    deltaV2QualityEngine.setThresholds(deltaThresholds.quality, newML, deltaThresholds.strategyWinRate);
    setDeltaThresholds(deltaV2QualityEngine.getThresholds());
    addLog('success', 'system', `🎚️ ML threshold updated to ${(newML * 100).toFixed(0)}%`);
    toast({ title: 'Threshold Updated', description: `ML threshold set to ${(newML * 100).toFixed(0)}%` });
  };

  const handleStrategyWinRateChange = (value: number[]) => {
    const newWinRate = value[0];
    deltaV2QualityEngine.setThresholds(deltaThresholds.quality, deltaThresholds.ml, newWinRate);
    setDeltaThresholds(deltaV2QualityEngine.getThresholds());
    addLog('success', 'system', `🎚️ Strategy win rate threshold updated to ${newWinRate}%`);
    toast({ title: 'Threshold Updated', description: `Strategy win rate veto set to ${newWinRate}%` });
  };

  const resetThresholds = () => {
    deltaV2QualityEngine.setThresholds(30, 0.45, 35);
    setDeltaThresholds(deltaV2QualityEngine.getThresholds());
    addLog('info', 'system', '🔄 Delta thresholds reset to optimized defaults');
    toast({ title: 'Thresholds Reset', description: 'Restored to optimized defaults (Quality: 30, ML: 45%, Win Rate: 35%)' });
  };

  // Gamma tier configuration handlers
  const handleGammaTierToggle = (tier: 'acceptHigh' | 'acceptMedium') => {
    const newConfig = { ...gammaTierConfig, [tier]: !gammaTierConfig[tier] };
    igxGammaV2.setTierConfig(newConfig);
    setGammaTierConfig(newConfig);
    const tierName = tier.replace('accept', '');
    addLog('success', 'system', `🎚️ Gamma ${tierName} tier ${newConfig[tier] ? 'ENABLED' : 'DISABLED'}`);
    toast({
      title: 'Gamma Filter Updated',
      description: `${tierName} tier signals ${newConfig[tier] ? 'will now pass' : 'are now blocked'}`
    });
  };

  const handleHighPriorityToggle = () => {
    const newPriority = gammaTierConfig.highPriority === 'HIGH' ? 'MEDIUM' : 'HIGH';
    const newConfig = { ...gammaTierConfig, highPriority: newPriority };
    igxGammaV2.setTierConfig(newConfig);
    setGammaTierConfig(newConfig);
    addLog('success', 'system', `🎚️ HIGH tier signals now have ${newPriority} priority`);
    toast({
      title: 'Priority Updated',
      description: `HIGH tier signals will be processed as ${newPriority} priority`
    });
  };

  // PARTICLE ANIMATION
  useEffect(() => {
    const colors = ['#f97316', '#ef4444', '#eab308', '#8b5cf6'];
    const sizes: ('sm' | 'md' | 'lg')[] = ['sm', 'sm', 'md'];
    const SPAWN_RATES = [0.7, 0.5, 0.35, 0.2, 0.1, 0.05];

    const animate = () => {
      setFlowingParticles(prev => {
        const particles = [...prev];

        // Spawn particles at each stage
        for (let stage = 0; stage <= 5; stage++) {
          const spawnRate = SPAWN_RATES[stage];
          const maxPerStage = 8;
          const currentCount = particles.filter(p => p.stage === stage).length;

          if (Math.random() < spawnRate && currentCount < maxPerStage && particles.length < 60) {
            particles.push({
              id: `p${Date.now()}${Math.random()}`,
              stage,
              progress: 0,
              symbol: CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)],
              speed: 2.0 + Math.random() * 1.5,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: sizes[Math.floor(Math.random() * sizes.length)]
            });
          }
        }

        // Animate existing particles
        return particles
          .map(p => {
            const newProgress = p.progress + p.speed;
            if (newProgress >= 100) {
              if (p.stage < 5) {
                const nextStage = p.stage + 1;
                const passRate = SPAWN_RATES[nextStage] / SPAWN_RATES[p.stage];
                if (Math.random() < passRate) {
                  return { ...p, stage: nextStage, progress: 0 };
                }
                return null;
              }
              return null;
            }
            return { ...p, progress: newProgress };
          })
          .filter((p): p is FlowingParticle => p !== null);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Update metrics every second
    const metricsInterval = setInterval(() => {
      setMetrics(globalHubService.getMetrics());
    }, 1000);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Fire Animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 blur-3xl opacity-30 animate-pulse"></div>
          <div className="relative flex items-center justify-between p-8 rounded-2xl bg-gradient-to-r from-orange-600/20 via-red-600/20 to-orange-600/20 border-2 border-orange-500/30">
            <div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 animate-gradient">
                IGX CONTROL CENTER
              </h1>
              <p className="text-gray-400 mt-2 font-semibold">Developer Command & Control System</p>
            </div>
            <Button
              onClick={handleNuclearReset}
              variant="destructive"
              size="lg"
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 border-2 border-red-500 shadow-lg shadow-red-500/50"
            >
              <Flame className="w-5 h-5 mr-2" />
              Nuclear Reset
            </Button>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Arena Status */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 shadow-xl shadow-orange-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-orange-400">Arena</h3>
              </div>
              <Badge className={`${status.arena.running ? 'bg-green-500' : 'bg-red-500'} text-white font-bold`}>
                {status.arena.running ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> ONLINE</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> OFFLINE</>
                )}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Agents:</span>
                <span className="font-bold text-white">{status.arena.agents}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Last Update:</span>
                <span className="font-bold text-white text-xs">
                  {status.arena.lastUpdate ? new Date(status.arena.lastUpdate).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Hub Status */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 shadow-xl shadow-orange-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-orange-400">Hub</h3>
              </div>
              <Badge className={`${status.hub.running ? 'bg-green-500' : 'bg-red-500'} text-white font-bold`}>
                {status.hub.running ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> ONLINE</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> OFFLINE</>
                )}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Active Signals:</span>
                <span className="font-bold text-white">{status.hub.signals}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Last Signal:</span>
                <span className="font-bold text-white text-xs">
                  {status.hub.lastSignal ? new Date(status.hub.lastSignal).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Database Status */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 shadow-xl shadow-orange-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-orange-400">Database</h3>
              </div>
              <Badge className={`${status.database.connected ? 'bg-green-500' : 'bg-red-500'} text-white font-bold`}>
                {status.database.connected ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> CONNECTED</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> ERROR</>
                )}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Provider:</span>
                <span className="font-bold text-white">Supabase</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Latency:</span>
                <span className={`font-bold ${
                  status.database.latency < 100 ? 'text-green-400' :
                  status.database.latency < 300 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {status.database.latency}ms
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Control Panels */}
        <Tabs defaultValue="signals" className="w-full">
          <TabsList className="grid grid-cols-6 bg-gray-900 border-2 border-orange-500/30 w-full">
            <TabsTrigger value="signals" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Signal Debug
            </TabsTrigger>
            <TabsTrigger value="arena" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Arena
            </TabsTrigger>
            <TabsTrigger value="hub" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Hub
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Database
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              Logs
            </TabsTrigger>
          </TabsList>

          {/* SIGNAL DEBUG TAB */}
          <TabsContent value="signals" className="space-y-4">
            {/* Top 3 Signals Card */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2 text-orange-400">
                  <Target className="w-6 h-6" />
                  Top 3 Trading Signals (Arena Auto-Trade)
                </h3>
                <Badge className="bg-blue-500 text-white font-bold px-3 py-1">
                  <Activity className="w-3 h-3 mr-1" />
                  Real-Time
                </Badge>
              </div>

              <div className="space-y-4">
                {(() => {
                  const signals = globalHubService.getActiveSignals();
                  const sortedByConfidence = [...signals].sort((a, b) => {
                    const confA = a.confidence || a.qualityScore || 0;
                    const confB = b.confidence || b.qualityScore || 0;
                    return confB - confA;
                  });
                  const top3 = sortedByConfidence.slice(0, 3);

                  if (top3.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-semibold">No Active Signals</p>
                        <p className="text-sm mt-2">Start the Hub to generate signals</p>
                      </div>
                    );
                  }

                  return top3.map((signal, idx) => {
                    const confidence = signal.confidence || signal.qualityScore || 0;
                    const agentNames = ['NEXUS-01', 'QUANTUM-X', 'ZEONIX'];

                    return (
                      <div key={signal.id} className="p-4 bg-gray-800 border-2 border-orange-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-black text-orange-400">#{idx + 1}</div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl font-bold text-white">{signal.symbol}</span>
                                <Badge className={`${signal.direction === 'LONG' ? 'bg-green-500' : 'bg-red-500'} text-white font-bold`}>
                                  {signal.direction}
                                </Badge>
                                <Badge className="bg-blue-500 text-white font-bold">
                                  {confidence}% Confidence
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-400">
                                Strategy: {signal.strategyName || signal.strategy || 'Unknown'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Assigned Agent</div>
                            <div className="text-lg font-bold text-orange-400">{agentNames[idx]}</div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Entry:</span>
                            <span className="ml-2 font-bold text-white">${signal.entry?.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Stop Loss:</span>
                            <span className="ml-2 font-bold text-red-400">${signal.stopLoss?.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Target:</span>
                            <span className="ml-2 font-bold text-green-400">${signal.targets?.[0]?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Signal Count Info */}
              <div className="mt-6 p-4 bg-gray-800 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">Total Active Signals:</span>
                    <span className="font-bold text-white">{globalHubService.getActiveSignals().length}</span>
                  </div>
                  <div className="text-gray-400">
                    Arena only trades Top 3 by confidence
                  </div>
                </div>
              </div>
            </Card>

            {/* Delta Quality Engine Status */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2 text-green-400">
                  <Filter className="w-6 h-6" />
                  Delta V2 Quality Engine Status
                </h3>
                <Badge className="bg-green-500 text-white font-bold px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  ML ACTIVE
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-800 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Signals Processed</div>
                  <div className="text-3xl font-bold text-green-400">{fmt(metrics.deltaProcessed || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Passed to Arena</div>
                  <div className="text-3xl font-bold text-green-400">{fmt(metrics.deltaPassed || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-red-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Rejected (Low Quality)</div>
                  <div className="text-3xl font-bold text-red-400">{fmt(metrics.deltaRejected || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Pass Rate</div>
                  <div className="text-3xl font-bold text-blue-400">{fmtDec(metrics.deltaPassRate || 0)}%</div>
                </div>
              </div>

              {/* Delta Threshold Controls */}
              <div className="mt-6 p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Signal Quality Controls
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetThresholds}
                    className="border-green-500/50 hover:bg-green-500/10 text-green-400"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Reset Defaults
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Quality Threshold Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-300">
                        Minimum Quality Score
                      </label>
                      <div className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <span className="text-lg font-black text-green-400">{deltaThresholds.quality}</span>
                        <span className="text-xs text-gray-400 ml-1">/100</span>
                      </div>
                    </div>
                    <Slider
                      value={[deltaThresholds.quality]}
                      onValueChange={handleQualityThresholdChange}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Lower = More signals (quantity), Higher = Better signals (quality). Default: 52
                    </p>
                  </div>

                  {/* ML Threshold Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-300">
                        Minimum ML Win Probability
                      </label>
                      <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <span className="text-lg font-black text-blue-400">{(deltaThresholds.ml * 100).toFixed(0)}</span>
                        <span className="text-xs text-gray-400 ml-1">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[deltaThresholds.ml * 100]}
                      onValueChange={handleMLThresholdChange}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      ML model's predicted win probability threshold. Default: 50%
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-300 mb-1">How It Works:</p>
                        <p>Signals must pass BOTH thresholds to reach the Arena. Regime-aware adjustments apply automatically based on market conditions.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quality Gate Metrics */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/30 p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-purple-400">
                <CheckCircle className="w-6 h-6" />
                Quality Gate & Regime Matching
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-800 border border-purple-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Signals Received</div>
                  <div className="text-3xl font-bold text-purple-400">{fmt(metrics.qualityGateReceived || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Approved</div>
                  <div className="text-3xl font-bold text-green-400">{fmt(metrics.qualityGateApproved || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-yellow-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Rejected (Quality)</div>
                  <div className="text-3xl font-bold text-yellow-400">{fmt(metrics.qualityGateRejectedQuality || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-red-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Rejected (Regime)</div>
                  <div className="text-3xl font-bold text-red-400">{fmt(metrics.qualityGateRejectedRegime || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Pass Rate</div>
                  <div className="text-3xl font-bold text-blue-400">{fmtDec(metrics.qualityGatePassRate || 0)}%</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="text-xs text-gray-400 mb-2">Quality Gate Flow</div>
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-purple-400">{fmt(metrics.qualityGateReceived || 0)} Received</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400">{fmt(metrics.qualityGateApproved || 0)} Approved</span>
                  <span className="text-gray-500">+</span>
                  <span className="text-yellow-400">{fmt(metrics.qualityGateRejectedQuality || 0)} Low Quality</span>
                  <span className="text-gray-500">+</span>
                  <span className="text-red-400">{fmt(metrics.qualityGateRejectedRegime || 0)} Wrong Regime</span>
                </div>
              </div>
            </Card>

            {/* Publishing Pipeline Metrics */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-emerald-500/30 p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
                <Activity className="w-6 h-6" />
                Publishing Pipeline (Database & UI)
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-4 bg-gray-800 border border-emerald-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Started</div>
                  <div className="text-3xl font-bold text-emerald-400">{fmt(metrics.publishingStarted || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Added to Array</div>
                  <div className="text-3xl font-bold text-blue-400">{fmt(metrics.publishingAddedToArray || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-cyan-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Saved to DB</div>
                  <div className="text-3xl font-bold text-cyan-400">{fmt(metrics.publishingSavedToDB || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-indigo-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Events Emitted</div>
                  <div className="text-3xl font-bold text-indigo-400">{fmt(metrics.publishingEventsEmitted || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Complete</div>
                  <div className="text-3xl font-bold text-green-400">{fmt(metrics.publishingComplete || 0)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-red-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Failed</div>
                  <div className="text-3xl font-bold text-red-400">{fmt(metrics.publishingFailed || 0)}</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="text-xs text-gray-400 mb-2">Publishing Pipeline Flow</div>
                <div className="flex items-center gap-2 text-sm font-mono flex-wrap">
                  <span className="text-emerald-400">{fmt(metrics.publishingStarted || 0)} Started</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-blue-400">{fmt(metrics.publishingAddedToArray || 0)} Array</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-cyan-400">{fmt(metrics.publishingSavedToDB || 0)} DB</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-indigo-400">{fmt(metrics.publishingEventsEmitted || 0)} Events</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400">{fmt(metrics.publishingComplete || 0)} Complete</span>
                  {(metrics.publishingFailed || 0) > 0 && (
                    <>
                      <span className="text-gray-500">|</span>
                      <span className="text-red-400">{fmt(metrics.publishingFailed)} Failed</span>
                    </>
                  )}
                </div>
              </div>

              {/* Success Rate */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Success Rate</div>
                  <div className="text-2xl font-bold text-green-400">
                    {((metrics.publishingComplete || 0) / (metrics.publishingStarted || 1) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Current Active Signals</div>
                  <div className="text-2xl font-bold text-orange-400">{status.hub.signals}</div>
                </div>
              </div>
            </Card>

            {/* System Debug Information */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-orange-400">
                <Terminal className="w-6 h-6" />
                Debug Information
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="text-gray-400">Hub Running:</div>
                  <div className={`font-bold ${status.hub.running ? 'text-green-400' : 'text-red-400'}`}>
                    {status.hub.running ? '✓ YES' : '✗ NO'}
                  </div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="text-gray-400">Arena Running:</div>
                  <div className={`font-bold ${status.arena.running ? 'text-green-400' : 'text-red-400'}`}>
                    {status.arena.running ? '✓ YES' : '✗ NO'}
                  </div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="text-gray-400">Active Agents:</div>
                  <div className="font-bold text-white">{status.arena.agents}</div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="text-gray-400">Total Signals Generated:</div>
                  <div className="font-bold text-white">{fmt(metrics.totalSignals || 0)}</div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="text-gray-400">Signals Passed Delta:</div>
                  <div className="font-bold text-green-400">{fmt(metrics.deltaPassed || 0)}</div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="text-gray-400">Current Active Signals:</div>
                  <div className="font-bold text-orange-400">{status.hub.signals}</div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-yellow-400 mb-2">If Agents Aren't Trading:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                      <li>Ensure Hub is running (Start Hub button)</li>
                      <li>Ensure Arena is running (Start Arena button)</li>
                      <li>Check if Top 3 signals exist above</li>
                      <li>Try "Clear & Restart" in Hub Controls to generate fresh signals</li>
                      <li>Monitor Live Logs tab for agent activity</li>
                    </ol>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ARENA CONTROLS */}
          <TabsContent value="arena" className="space-y-4">
            {/* Live Agent Status */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-blue-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                  <Activity className="w-5 h-5" />
                  Live Agent Status
                </h3>
                <Badge className={`${status.arena.running ? 'bg-green-500' : 'bg-red-500'} text-white font-bold px-3 py-1`}>
                  {status.arena.running ? 'ACTIVE' : 'OFFLINE'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const agents = arenaService.getAgents();
                  const agentNames = ['NEXUS-01', 'QUANTUM-X', 'ZEONIX'];

                  if (agents.length === 0) {
                    return (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No agents initialized</p>
                        <p className="text-sm mt-1">Click "Start Arena" to initialize agents</p>
                      </div>
                    );
                  }

                  return agents.map((agent, idx) => (
                    <div key={agent.id} className={`p-4 rounded-lg border-2 ${
                      agent.isActive
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-gray-800 border-gray-700'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">{agentNames[idx]}</span>
                        {agent.isActive && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Balance:</span>
                          <span className="text-white font-semibold">${agent.balance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">P&L:</span>
                          <span className={`font-semibold ${agent.totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {agent.totalPnLPercent >= 0 ? '+' : ''}{agent.totalPnLPercent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trades:</span>
                          <span className="text-white font-semibold">{agent.totalTrades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Open Positions:</span>
                          <span className={`font-semibold ${agent.openPositions > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                            {agent.openPositions}
                          </span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Agent Trading Status */}
              <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">Trading Status:</span>
                  </div>
                  <span className={`font-bold ${
                    arenaService.getAgents().filter(a => a.totalTrades > 0).length > 0
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}>
                    {arenaService.getAgents().filter(a => a.totalTrades > 0).length > 0
                      ? '✓ Agents have executed trades'
                      : '⏳ Waiting for signals to trade'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-orange-400">
                <Target className="w-6 h-6" />
                Arena Control Panel
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button
                  onClick={handleStartArena}
                  disabled={status.arena.running}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border border-green-500"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Arena
                </Button>

                <Button
                  onClick={handleStopArena}
                  disabled={!status.arena.running}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border border-red-500"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Arena
                </Button>

                <Button
                  onClick={async () => {
                    addLog('info', 'arena', '🔄 Restarting Arena with fresh event subscription...');
                    try {
                      arenaService.destroy();
                      await arenaService.initialize();
                      await checkStatus();
                      addLog('success', 'arena', '✅ Arena restarted with fresh subscription');
                      toast({ title: 'Arena Restarted', description: 'Event subscription renewed' });
                    } catch (error) {
                      addLog('error', 'arena', `❌ Restart failed: ${error}`);
                      toast({ title: 'Restart Failed', description: 'Check logs for details', variant: 'destructive' });
                    }
                  }}
                  variant="outline"
                  className="border-2 border-orange-600 text-orange-400 hover:bg-orange-950"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart & Resubscribe
                </Button>

                <Button
                  onClick={() => {
                    addLog('info', 'arena', '🎯 Emitting test signal to Arena...');
                    const testSignal = {
                      id: `test-${Date.now()}`,
                      symbol: 'BTCUSDT',
                      direction: 'LONG' as const,
                      strategy: 'TEST',
                      strategyName: 'Manual Test Signal',
                      entry: 95000,
                      stopLoss: 94000,
                      targets: [96000, 97000],
                      confidence: 85,
                      qualityScore: 85,
                      timestamp: Date.now(),
                      grade: 'A',
                      image: ''
                    };
                    globalHubService.emit('signal:new', testSignal);
                    addLog('success', 'system', '✅ Test signal emitted - Watch logs for Arena response');
                    toast({ title: 'Test Signal Sent', description: 'Check Live Logs for Arena response' });
                  }}
                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 border border-purple-500"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Force Test Signal
                </Button>

                <Button
                  onClick={async () => {
                    addLog('info', 'arena', '🔍 Checking for existing Hub signals...');
                    const existingSignals = globalHubService.getActiveSignals();

                    if (existingSignals.length === 0) {
                      addLog('warning', 'system', '⚠️ No active signals found - Start Hub first');
                      toast({ title: 'No Signals', description: 'Hub has no active signals. Start Hub first.', variant: 'destructive' });
                      return;
                    }

                    addLog('info', 'arena', `📊 Found ${existingSignals.length} active signals from Hub`);

                    // Sort and get top 3
                    const sortedByConfidence = [...existingSignals].sort((a, b) =>
                      (b.confidence || b.qualityScore || 0) - (a.confidence || a.qualityScore || 0)
                    );
                    const top3 = sortedByConfidence.slice(0, 3);

                    addLog('info', 'system', `🎯 Top 3 Signals:`);
                    top3.forEach((sig, idx) => {
                      const conf = sig.confidence || sig.qualityScore || 0;
                      addLog('info', 'system', `  ${idx + 1}. ${sig.symbol} ${sig.direction} - ${conf}%`);
                    });

                    // Emit each signal to Arena
                    for (const signal of top3) {
                      globalHubService.emit('signal:new', signal);
                      addLog('success', 'system', `✅ Emitted ${signal.symbol} to Arena`);
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    toast({ title: 'Signals Processed', description: `Sent ${top3.length} signals to Arena agents` });
                    addLog('success', 'arena', '✅ All existing signals processed');
                  }}
                  className="bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-700 hover:to-blue-600 border border-cyan-500"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Process Existing Signals
                </Button>

                <Button
                  onClick={() => {
                    localStorage.removeItem('arena_agents_cache');
                    addLog('info', 'arena', '🗑️ Arena cache cleared');
                    toast({ title: 'Cache Cleared', description: 'Arena cache removed' });
                  }}
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-300 hover:bg-gray-900"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>

                <Button
                  onClick={() => {
                    addLog('info', 'system', '🔍🔍🔍 COMPLETE SYSTEM DIAGNOSTIC 🔍🔍🔍');

                    // Check Hub
                    const hubRunning = globalHubService.isRunning();
                    addLog(hubRunning ? 'success' : 'error', 'hub', `Hub Status: ${hubRunning ? 'RUNNING ✅' : 'STOPPED ❌'}`);

                    // Check signals
                    const signals = globalHubService.getActiveSignals();
                    addLog('info', 'hub', `Active Signals: ${signals.length}`);
                    if (signals.length > 0) {
                      const top3 = [...signals].sort((a, b) => (b.confidence || b.qualityScore || 0) - (a.confidence || a.qualityScore || 0)).slice(0, 3);
                      top3.forEach((sig, idx) => {
                        addLog('info', 'hub', `  ${idx+1}. ${sig.symbol} ${sig.direction} - ${sig.confidence || sig.qualityScore}% conf`);
                      });
                    } else {
                      addLog('warning', 'hub', 'No active signals - Hub needs to generate signals');
                    }

                    // Check agents
                    const agents = arenaService.getAgents();
                    addLog('info', 'arena', `Agents: ${agents.length}`);
                    if (agents.length > 0) {
                      agents.forEach((agent) => {
                        addLog('info', 'arena', `  ${agent.name}: $${agent.balance.toFixed(0)}, ${agent.totalTrades} trades, ${agent.openPositions} open`);
                      });
                      const noTrades = agents.filter(a => a.totalTrades === 0);
                      if (noTrades.length > 0) {
                        addLog('warning', 'arena', `⚠️  ${noTrades.length} agent(s) have NO TRADES: ${noTrades.map(a => a.name).join(', ')}`);
                      }
                    } else {
                      addLog('error', 'arena', 'No agents - Arena needs to be started');
                    }

                    // Check event listeners
                    const listenerCount = (globalHubService as any).events?.get('signal:new')?.length || 0;
                    addLog(listenerCount > 0 ? 'success' : 'error', 'system', `Event listeners: ${listenerCount} ${listenerCount > 0 ? '✅' : '❌ NONE!'}`);
                    if (listenerCount === 0) {
                      addLog('error', 'arena', '❌ Arena is NOT subscribed to Hub! Click "Restart & Resubscribe"');
                    }

                    // Summary
                    addLog('info', 'system', '━━━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━━');
                    if (!hubRunning) addLog('error', 'system', '❌ FIX: Start Hub first');
                    if (signals.length === 0) addLog('warning', 'system', '⚠️  FIX: Wait for Hub to generate signals or click "Clear & Restart"');
                    if (agents.length === 0) addLog('error', 'system', '❌ FIX: Start Arena');
                    if (listenerCount === 0) addLog('error', 'system', '❌ FIX: Click "Restart & Resubscribe" in Arena tab');
                    if (agents.some(a => a.totalTrades === 0)) addLog('warning', 'system', '⚠️  FIX: Click "Process Existing Signals"');
                    addLog('success', 'system', '✅ Diagnostic complete - check logs above');

                    toast({ title: 'Diagnostic Complete', description: 'Check Live Logs tab for results' });
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 border border-purple-500"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Complete Diagnostic
                </Button>

                <Button
                  onClick={() => window.open('/arena', '_blank')}
                  variant="outline"
                  className="border-2 border-orange-600 text-orange-400 hover:bg-orange-950"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Open Arena
                </Button>
              </div>

              {/* Diagnostic Info */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-blue-400 mb-2">Troubleshooting Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                      <li>Ensure Hub is running and generating signals (check Hub status above)</li>
                      <li>Check that agents are initialized (should show 3 agents above with $10,000 balance)</li>
                      <li>If Hub was started BEFORE Arena, click "Process Existing Signals" to manually assign signals</li>
                      <li>Use "Force Test Signal" to verify Arena can receive signals</li>
                      <li>Use "Restart & Resubscribe" if agents aren't responding to new signals</li>
                      <li>Monitor Live Logs tab for detailed event flow and trade execution</li>
                    </ol>
                    <p className="text-xs text-gray-400 mt-3">
                      💡 Tip: Arena now auto-processes existing signals on startup, but you can manually trigger with the button if needed.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* HUB CONTROLS */}
          <TabsContent value="hub" className="space-y-4">
            {/* Main Control Panel */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-orange-400">
                <Zap className="w-6 h-6" />
                Intelligence Hub Control Panel
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <Button
                  onClick={handleStartHub}
                  disabled={status.hub.running}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border border-green-500"
                >
                  <Power className="w-4 h-4 mr-2" />
                  Start Hub
                </Button>

                <Button
                  onClick={handleStopHub}
                  disabled={!status.hub.running}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border border-red-500"
                >
                  <PowerOff className="w-4 h-4 mr-2" />
                  Stop Hub
                </Button>

                <Button
                  onClick={handleClearSignals}
                  disabled={!status.hub.running}
                  variant="outline"
                  className="border-2 border-orange-600 text-orange-400 hover:bg-orange-950"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Clear & Restart
                </Button>

                <Button
                  onClick={() => window.open('/intelligence-hub', '_blank')}
                  variant="outline"
                  className="border-2 border-orange-600 text-orange-400 hover:bg-orange-950"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Open Hub
                </Button>

                <Button
                  onClick={() => {
                    const signals = globalHubService.getActiveSignals();
                    addLog('info', 'hub', `Active signals: ${signals.length}`);
                    signals.forEach((s, i) => {
                      addLog('info', 'hub', `  ${i + 1}. ${s.symbol} ${s.direction} (${s.confidence}% confidence)`);
                    });
                    toast({ title: 'Signals Listed', description: `${signals.length} active signals in logs` });
                  }}
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-300 hover:bg-gray-900"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  List Signals
                </Button>

                <Button
                  onClick={checkStatus}
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-300 hover:bg-gray-900"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>

              {/* Real-Time Pipeline Status */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-300">GAMMA</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{metrics.gammaSignalsPassed || 0}</div>
                  <div className="text-xs text-gray-400">Passed / {metrics.gammaSignalsReceived || 0} Total</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.gammaSignalsRejected || 0} Rejected
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-300">DELTA ML</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{metrics.deltaPassed || 0}</div>
                  <div className="text-xs text-gray-400">Passed / {metrics.deltaProcessed || 0} Total</div>
                  <div className="text-xs text-green-400 mt-1">
                    {metrics.deltaPassRate?.toFixed(1) || 0}% Pass Rate
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-300">QUALITY GATE</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{metrics.totalSignals || 0}</div>
                  <div className="text-xs text-gray-400">Published Signals</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Score: {metrics.deltaQualityScore?.toFixed(1) || 'N/A'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-300">ACTIVE</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{globalHubService.getActiveSignals().length}</div>
                  <div className="text-xs text-gray-400">Live Signals</div>
                  <div className="text-xs text-gray-500 mt-1">
                    In Market Now
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800/40 to-gray-700/20 border border-gray-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-300">DATABASE</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                  </div>
                  <div className="text-xs text-gray-400">Polling 2s</div>
                  <div className="text-xs text-green-400 mt-1">
                    Connected
                  </div>
                </div>
              </div>

              {/* Signal Flow Legend */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="text-sm font-semibold text-gray-300 mb-3">📊 Signal Flow Pipeline</div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-blue-400">DATA</span>
                  <span>→</span>
                  <span className="text-purple-400">ALPHA</span>
                  <span>→</span>
                  <span className="text-cyan-400">BETA</span>
                  <span>→</span>
                  <span className="text-blue-400">GAMMA</span>
                  <span>→</span>
                  <span className="text-purple-400">DELTA ML</span>
                  <span>→</span>
                  <span className="text-green-400">QUALITY GATE</span>
                  <span>→</span>
                  <span className="text-orange-400">DATABASE</span>
                  <span>→</span>
                  <span className="text-yellow-400">USER</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Each stage filters signals for quality • Only the best reach users • Check console for detailed flow logs
                </div>
              </div>
            </Card>

            {/* Quality Gate Controls */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/30 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                <Shield className="w-5 h-5" />
                Quality Gate Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">Minimum Quality Score</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="50"
                      className="flex-1"
                      disabled
                    />
                    <span className="text-white font-bold w-12">50</span>
                  </div>
                  <p className="text-xs text-gray-500">Signals below this score are rejected</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">Daily Signal Budget</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      defaultValue="100"
                      className="flex-1"
                      disabled
                    />
                    <span className="text-white font-bold w-12">100</span>
                  </div>
                  <p className="text-xs text-gray-500">Maximum signals published per day</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">Timing Constraints</label>
                  <div className="text-white font-bold">DISABLED (Quality-based)</div>
                  <p className="text-xs text-gray-500">No artificial delays - quality decides publication</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">State Persistence</label>
                  <div className="text-green-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    ENABLED (LocalStorage)
                  </div>
                  <p className="text-xs text-gray-500">Survives page refreshes</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                  <div className="text-xs text-green-300">
                    <strong>Production Configuration Active:</strong> Quality Gate is configured for 24/7 autonomous operation with high signal throughput and intelligent filtering.
                  </div>
                </div>
              </div>
            </Card>

            {/* Debug Console Access */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/30 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                <Terminal className="w-5 h-5" />
                Debug & Monitoring
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => {
                    addLog('info', 'hub', '='.repeat(60));
                    addLog('info', 'hub', '📊 COMPREHENSIVE SIGNAL FLOW GUIDE');
                    addLog('info', 'hub', '='.repeat(60));
                    addLog('info', 'hub', '');
                    addLog('info', 'hub', '🔍 HOW TO DEBUG SIGNAL REJECTIONS:');
                    addLog('info', 'hub', '');
                    addLog('info', 'hub', '1. Open Browser Console (F12 → Console tab)');
                    addLog('info', 'hub', '2. Look for signal flow logs with stages:');
                    addLog('info', 'hub', '   🎯 STAGE 1: Gamma Filter');
                    addLog('info', 'hub', '   🔍 STAGE 2: Delta V2 ML Filter');
                    addLog('info', 'hub', '   💰 STAGE 3: Price Discovery');
                    addLog('info', 'hub', '   🎯 STAGE 4: Quality Gate');
                    addLog('info', 'hub', '   📤 STAGE 5: Publication');
                    addLog('info', 'hub', '');
                    addLog('info', 'hub', '✅ PASSED signals show green checkmarks');
                    addLog('info', 'hub', '❌ REJECTED signals show reasons:');
                    addLog('info', 'hub', '   • Low quality score (< 50)');
                    addLog('info', 'hub', '   • Poor ML prediction');
                    addLog('info', 'hub', '   • Budget exhausted');
                    addLog('info', 'hub', '   • Price fetch failed');
                    addLog('info', 'hub', '');
                    addLog('info', 'hub', '💡 TIP: Each stage has detailed metrics');
                    addLog('info', 'hub', '📊 All rejections are logged with reasons');
                    addLog('info', 'hub', '');
                    addLog('info', 'hub', '='.repeat(60));
                    toast({
                      title: 'Debug Guide Displayed',
                      description: 'Check logs for comprehensive signal flow guide'
                    });
                  }}
                  variant="outline"
                  className="border-2 border-purple-600 text-purple-400 hover:bg-purple-950"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Debug Guide
                </Button>

                <Button
                  onClick={() => {
                    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f97316; font-weight: bold;');
                    console.log('%c🎯 INTELLIGENCE HUB - COMPREHENSIVE STATUS', 'color: #f97316; font-weight: bold; font-size: 16px;');
                    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f97316; font-weight: bold;');
                    console.log('');
                    console.log('%c📊 Pipeline Metrics:', 'color: #60a5fa; font-weight: bold;');
                    console.log('Gamma Passed:', metrics.gammaSignalsPassed || 0, '/', metrics.gammaSignalsReceived || 0);
                    console.log('Delta Passed:', metrics.deltaPassed || 0, '/', metrics.deltaProcessed || 0, `(${metrics.deltaPassRate?.toFixed(1) || 0}%)`);
                    console.log('Quality Gate Published:', metrics.totalSignals || 0);
                    console.log('Active Signals:', globalHubService.getActiveSignals().length);
                    console.log('');
                    console.log('%c🎯 Current Active Signals:', 'color: #10b981; font-weight: bold;');
                    const activeSignals = globalHubService.getActiveSignals();
                    if (activeSignals.length === 0) {
                      console.log('  No active signals');
                    } else {
                      activeSignals.forEach((sig, i) => {
                        console.log(`  ${i + 1}. ${sig.symbol} ${sig.direction} | Score: ${sig.qualityScore?.toFixed(1)} | Strategy: ${sig.strategyName}`);
                      });
                    }
                    console.log('');
                    console.log('%c💡 Next Steps:', 'color: #facc15; font-weight: bold;');
                    console.log('• Check console for signal flow logs (look for stage markers)');
                    console.log('• Rejections show detailed reasons');
                    console.log('• Database polling runs every 2 seconds');
                    console.log('');
                    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f97316; font-weight: bold;');
                    addLog('info', 'hub', '✅ Comprehensive status logged to browser console (F12)');
                    toast({
                      title: 'Status Logged',
                      description: 'Check browser console for full details (F12)'
                    });
                  }}
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-400 hover:bg-blue-950"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Console Status
                </Button>

                <Button
                  onClick={() => {
                    // Clear console
                    console.clear();
                    addLog('success', 'hub', '✅ Browser console cleared');
                    toast({ title: 'Console Cleared', description: 'Fresh logs ready' });
                  }}
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-400 hover:bg-gray-900"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Console
                </Button>

                <Button
                  onClick={() => {
                    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ef4444; font-weight: bold;');
                    console.log('%c🔍 CRITICAL DIAGNOSTIC - Signal Flow Check', 'color: #ef4444; font-weight: bold; font-size: 16px;');
                    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ef4444; font-weight: bold;');
                    console.log('');

                    // Check 1: Hub running status
                    const hubRunning = globalHubService.isRunning();
                    console.log('%c1️⃣ Intelligence Hub Status:', 'color: #3b82f6; font-weight: bold;');
                    console.log('   Running:', hubRunning ? '✅ YES' : '❌ NO');
                    if (!hubRunning) {
                      console.error('   ⚠️  HUB IS NOT RUNNING! Start it first!');
                    }
                    console.log('');

                    // Check 2: Metrics
                    const currentMetrics = globalHubService.getMetrics();
                    console.log('%c2️⃣ Pipeline Metrics:', 'color: #3b82f6; font-weight: bold;');
                    console.log('   Gamma Received:', currentMetrics.gammaSignalsReceived || 0);
                    console.log('   Gamma Passed:', currentMetrics.gammaSignalsPassed || 0);
                    console.log('   Delta Processed:', currentMetrics.deltaProcessed || 0);
                    console.log('   Delta Passed:', currentMetrics.deltaPassed || 0);
                    console.log('   Quality Gate Published:', currentMetrics.totalSignals || 0);
                    console.log('   Active Signals:', globalHubService.getActiveSignals().length);
                    console.log('');

                    // Check 3: Recent console logs hint
                    console.log('%c3️⃣ What to Look For:', 'color: #3b82f6; font-weight: bold;');
                    console.log('   In console logs above, you should see:');
                    console.log('   ✅ "Quality Gate callback successfully registered!"');
                    console.log('   ✅ "🔍 [SIGNAL FLOW] STAGE 2: Delta V2 → ML Quality Filter"');
                    console.log('   ✅ "✅ Delta Decision: PASSED"');
                    console.log('   ✅ "🎯 [SIGNAL FLOW] STAGE 4: Quality Gate → Final Evaluation"');
                    console.log('   ✅ "🚀 [Quality Gate] publishSignal() CALLED"');
                    console.log('   ✅ "🎉 [GlobalHub] QUALITY GATE CALLBACK TRIGGERED!"');
                    console.log('');

                    console.log('%c4️⃣ If Signals Are NOT Appearing:', 'color: #eab308; font-weight: bold;');
                    console.log('   Look for these ERROR messages:');
                    console.log('   ❌ "❌ Delta Decision: REJECTED" - Signal failed ML filter');
                    console.log('   ❌ "❌ [Quality Gate] REJECTED" - Quality score too low');
                    console.log('   ❌ "NO CALLBACK REGISTERED" - Callback setup failed');
                    console.log('   ❌ "Callback FAILED" - Error during signal publication');
                    console.log('');

                    console.log('%c5️⃣ Recommended Actions:', 'color: #10b981; font-weight: bold;');
                    if (!hubRunning) {
                      console.log('   1. START THE HUB (Click "Start Hub" button)');
                    } else {
                      console.log('   1. Wait for Delta to generate signals (happens every 5 seconds)');
                      console.log('   2. Watch console for "STAGE 2: Delta V2" logs');
                      console.log('   3. Check if Delta is PASSING or REJECTING signals');
                      console.log('   4. If PASSING, check if Quality Gate is APPROVING or REJECTING');
                      console.log('   5. If APPROVED, check if callback triggers');
                    }
                    console.log('');

                    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ef4444; font-weight: bold;');

                    addLog('info', 'hub', '✅ Critical diagnostic logged to console (F12)');
                    toast({
                      title: 'Diagnostic Complete',
                      description: 'Check browser console (F12) for detailed analysis',
                      duration: 5000
                    });
                  }}
                  variant="outline"
                  className="border-2 border-red-600 text-red-400 hover:bg-red-950"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Run Diagnostic
                </Button>
              </div>

              <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Terminal className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div className="text-xs text-purple-300">
                    <strong>Pro Tip:</strong> Open browser console (F12) to see real-time signal flow logs with detailed rejection reasons, quality scores, and stage-by-stage progress. All logs are color-coded and structured for easy debugging.
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* PIPELINE MONITOR */}
          <TabsContent value="pipeline" className="space-y-4">
            {/* Pipeline Visualization Card */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2 text-orange-400">
                  <Activity className="w-6 h-6" />
                  Real-Time Signal Pipeline
                </h3>
                <Badge className="bg-green-500 text-white font-bold px-3 py-1">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  LIVE 24/7
                </Badge>
              </div>

              {/* Pipeline Flow */}
              <div className="relative h-40 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-xl border-2 border-orange-500/20 overflow-hidden mb-8">
                {/* Flowing Particles */}
                {flowingParticles.map(p => {
                  const stagePos = parseFloat(getStagePos(p.stage));
                  const nextStagePos = parseFloat(getStagePos(p.stage + 1));
                  const currentLeft = stagePos + (nextStagePos - stagePos) * (p.progress / 100);

                  return (
                    <div
                      key={p.id}
                      className={`absolute ${getParticleSize(p.size)} font-bold pointer-events-none transition-all duration-100 opacity-70`}
                      style={{
                        left: `${currentLeft}%`,
                        top: 'calc(50% - 8px)',
                        color: p.color
                      }}
                    >
                      {p.symbol}
                    </div>
                  );
                })}

                {/* Engine Nodes */}
                {/* Data */}
                <div className="absolute left-[6%] top-1/2 -translate-y-1/2 z-10">
                  <button onClick={() => toggleEngine('data')} className="relative group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                      expandedEngine === 'data'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-500/50'
                        : 'bg-gray-800 border-2 border-orange-500/30 hover:scale-105 hover:border-orange-500'
                    }`}>
                      <Database className={`w-6 h-6 ${expandedEngine === 'data' ? 'text-white' : 'text-orange-400'}`} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-orange-400">
                      Data
                    </div>
                  </button>
                </div>

                {/* Alpha */}
                <div className="absolute left-[21%] top-1/2 -translate-y-1/2 z-10">
                  <button onClick={() => toggleEngine('alpha')} className="relative group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                      expandedEngine === 'alpha'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-500/50'
                        : 'bg-gray-800 border-2 border-purple-500/30 hover:scale-105 hover:border-purple-500'
                    }`}>
                      <Brain className={`w-6 h-6 ${expandedEngine === 'alpha' ? 'text-white' : 'text-purple-400'}`} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-purple-400">
                      Alpha
                    </div>
                  </button>
                </div>

                {/* Beta */}
                <div className="absolute left-[36%] top-1/2 -translate-y-1/2 z-10">
                  <button onClick={() => toggleEngine('beta')} className="relative group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                      expandedEngine === 'beta'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-500/50'
                        : 'bg-gray-800 border-2 border-yellow-500/30 hover:scale-105 hover:border-yellow-500'
                    }`}>
                      <Target className={`w-6 h-6 ${expandedEngine === 'beta' ? 'text-white' : 'text-yellow-400'}`} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-yellow-400">
                      Beta
                    </div>
                  </button>
                </div>

                {/* Gamma */}
                <div className="absolute left-[51%] top-1/2 -translate-y-1/2 z-10">
                  <button onClick={() => toggleEngine('gamma')} className="relative group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                      expandedEngine === 'gamma'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-500/50'
                        : 'bg-gray-800 border-2 border-pink-500/30 hover:scale-105 hover:border-pink-500'
                    }`}>
                      <CheckCircle2 className={`w-6 h-6 ${expandedEngine === 'gamma' ? 'text-white' : 'text-pink-400'}`} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-pink-400">
                      Gamma
                    </div>
                  </button>
                </div>

                {/* Delta */}
                <div className="absolute left-[66%] top-1/2 -translate-y-1/2 z-10">
                  <button onClick={() => toggleEngine('delta')} className="relative group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                      expandedEngine === 'delta'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-500/50'
                        : 'bg-gray-800 border-2 border-green-500/30 hover:scale-105 hover:border-green-500'
                    }`}>
                      <Filter className={`w-6 h-6 ${expandedEngine === 'delta' ? 'text-white' : 'text-green-400'}`} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-green-400">
                      Delta
                    </div>
                  </button>
                </div>

                {/* Zeta */}
                <div className="absolute left-[81%] top-1/2 -translate-y-1/2 z-10">
                  <button onClick={() => toggleEngine('zeta')} className="relative group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                      expandedEngine === 'zeta'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-500/50'
                        : 'bg-gray-800 border-2 border-purple-500/30 hover:scale-105 hover:border-purple-500'
                    }`}>
                      <Brain className={`w-6 h-6 ${expandedEngine === 'zeta' ? 'text-white' : 'text-purple-400'}`} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-purple-400">
                      Zeta
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick Metrics Row */}
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="p-4 bg-gray-800 border border-orange-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Tickers</div>
                  <div className="text-2xl font-bold text-orange-400">{fmt(metrics.totalTickers)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-orange-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Analyses</div>
                  <div className="text-2xl font-bold text-orange-400">{fmt(metrics.totalAnalyses)}</div>
                </div>
                <div className="p-4 bg-gray-800 border border-orange-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Active Strategies</div>
                  <div className="text-2xl font-bold text-orange-400">{metrics.strategiesActive}/17</div>
                </div>
                <div className="p-4 bg-gray-800 border border-orange-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Approval Rate</div>
                  <div className="text-2xl font-bold text-orange-400">{fmtDec(metrics.approvalRate)}%</div>
                </div>
              </div>
            </Card>

            {/* Collapsible Engine Details */}
            {expandedEngine === 'data' && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/50 p-6 shadow-xl shadow-orange-500/20 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-bold text-orange-400">Data Engine</h3>
                    <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500">Live Ingestion</Badge>
                  </div>
                  <button onClick={() => setExpandedEngine(null)} className="text-gray-400 hover:text-orange-400">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Tickers Fetched</div>
                    <div className="text-xl font-bold text-orange-400">{fmt(metrics.dataTickersFetched || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Data Points</div>
                    <div className="text-xl font-bold text-orange-400">{fmt(metrics.dataPointsCollected || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Refresh Rate</div>
                    <div className="text-xl font-bold text-orange-400">{fmtDec(metrics.dataRefreshRate || 0)}/min</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Last Fetch</div>
                    <div className="text-sm font-bold text-gray-300">{metrics.dataLastFetch ? 'Just now' : 'Never'}</div>
                  </div>
                </div>
              </Card>
            )}

            {expandedEngine === 'alpha' && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/50 p-6 shadow-xl shadow-purple-500/20 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-bold text-purple-400">Alpha Engine</h3>
                    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500">Pattern Detection</Badge>
                  </div>
                  <button onClick={() => setExpandedEngine(null)} className="text-gray-400 hover:text-purple-400">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Patterns Detected</div>
                    <div className="text-xl font-bold text-purple-400">{fmt(metrics.alphaPatternsDetected || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Signals Generated</div>
                    <div className="text-xl font-bold text-purple-400">{fmt(metrics.alphaSignalsGenerated || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Active Strategies</div>
                    <div className="text-xl font-bold text-purple-400">{metrics.alphaStrategiesActive || 0}/17</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Detection Rate</div>
                    <div className="text-xl font-bold text-purple-400">{fmtDec(metrics.alphaDetectionRate || 0)}/min</div>
                  </div>
                </div>
              </Card>
            )}

            {expandedEngine === 'beta' && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-yellow-500/50 p-6 shadow-xl shadow-yellow-500/20 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-bold text-yellow-400">Beta Engine</h3>
                    <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500">Scoring & Ranking</Badge>
                  </div>
                  <button onClick={() => setExpandedEngine(null)} className="text-gray-400 hover:text-yellow-400">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="p-3 bg-gray-800 border border-yellow-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Signals Scored</div>
                    <div className="text-xl font-bold text-yellow-400">{fmt(metrics.betaSignalsScored || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-green-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">High Quality</div>
                    <div className="text-xl font-bold text-green-400">{fmt(metrics.betaHighQuality || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Medium Quality</div>
                    <div className="text-xl font-bold text-blue-400">{fmt(metrics.betaMediumQuality || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Low Quality</div>
                    <div className="text-xl font-bold text-orange-400">{fmt(metrics.betaLowQuality || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-yellow-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Avg Confidence</div>
                    <div className="text-xl font-bold text-yellow-400">{fmtDec(metrics.betaAvgConfidence || 0)}%</div>
                  </div>
                </div>
              </Card>
            )}

            {expandedEngine === 'gamma' && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-pink-500/50 p-6 shadow-xl shadow-pink-500/20 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-400" />
                    <h3 className="text-lg font-bold text-pink-400">Gamma V2 Quality Matcher</h3>
                    <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500">Tier-Based Filtering</Badge>
                  </div>
                  <button onClick={() => setExpandedEngine(null)} className="text-gray-400 hover:text-pink-400">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  <div className="p-3 bg-gray-800 border border-pink-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Received</div>
                    <div className="text-xl font-bold text-pink-400">{fmt(metrics.gammaSignalsReceived || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-green-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Passed</div>
                    <div className="text-xl font-bold text-green-400">{fmt(metrics.gammaSignalsPassed || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-red-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Rejected</div>
                    <div className="text-xl font-bold text-red-400">{fmt(metrics.gammaSignalsRejected || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Pass Rate</div>
                    <div className="text-xl font-bold text-blue-400">{fmtDec(metrics.gammaPassRate || 0)}%</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Queue Size</div>
                    <div className="text-xl font-bold text-orange-400">{fmt(metrics.gammaQueueSize || 0)}</div>
                  </div>
                </div>

                {/* Tier Configuration Controls */}
                <div className="p-5 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-2 border-pink-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-pink-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Quality Tier Filter Controls
                    </h4>
                    <div className="text-xs text-gray-400">Enable/disable tiers from Beta</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* HIGH Tier Toggle */}
                    <div className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      gammaTierConfig.acceptHigh
                        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50'
                        : 'bg-gray-800 border-gray-700'
                    }`} onClick={() => handleGammaTierToggle('acceptHigh')}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-green-400">HIGH</span>
                        <div className={`w-10 h-6 rounded-full transition-all ${
                          gammaTierConfig.acceptHigh ? 'bg-green-500' : 'bg-gray-600'
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${
                            gammaTierConfig.acceptHigh ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {gammaTierConfig.acceptHigh ? `Passes with ${gammaTierConfig.highPriority} priority` : 'BLOCKED'}
                      </div>
                      {gammaTierConfig.acceptHigh && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleHighPriorityToggle(); }}
                          className="mt-2 w-full text-xs border-green-500/50 hover:bg-green-500/10"
                        >
                          Priority: {gammaTierConfig.highPriority}
                        </Button>
                      )}
                    </div>

                    {/* MEDIUM Tier Toggle */}
                    <div className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      gammaTierConfig.acceptMedium
                        ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50'
                        : 'bg-gray-800 border-gray-700'
                    }`} onClick={() => handleGammaTierToggle('acceptMedium')}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-blue-400">MEDIUM</span>
                        <div className={`w-10 h-6 rounded-full transition-all ${
                          gammaTierConfig.acceptMedium ? 'bg-blue-500' : 'bg-gray-600'
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${
                            gammaTierConfig.acceptMedium ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {gammaTierConfig.acceptMedium ? 'Passes with MEDIUM priority' : 'BLOCKED'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-800/50 border border-pink-500/30 rounded-lg">
                    <div className="text-xs text-gray-300">
                      <strong className="text-pink-400">How it works:</strong> Beta V5 generates <strong>HIGH, MEDIUM, or LOW</strong> quality tiers for each signal.
                      Gamma filters based on which tiers you enable. LOW tier signals are always rejected. Both HIGH and MEDIUM are enabled by default for optimal signal flow.
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {expandedEngine === 'delta' && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/50 p-6 shadow-xl shadow-green-500/20 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-bold text-green-400">Delta V2 Quality Engine</h3>
                    <Badge className="bg-green-500/20 text-green-300 border border-green-500">ML Active</Badge>
                  </div>
                  <button onClick={() => setExpandedEngine(null)} className="text-gray-400 hover:text-green-400">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  <div className="p-3 bg-gray-800 border border-green-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Processed</div>
                    <div className="text-xl font-bold text-green-400">{fmt(metrics.deltaProcessed || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-green-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Passed</div>
                    <div className="text-xl font-bold text-green-400">{fmt(metrics.deltaPassed || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-red-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Rejected</div>
                    <div className="text-xl font-bold text-red-400">{fmt(metrics.deltaRejected || 0)}</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Pass Rate</div>
                    <div className="text-xl font-bold text-blue-400">{fmtDec(metrics.deltaPassRate || 0)}%</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-orange-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Avg Quality</div>
                    <div className="text-xl font-bold text-orange-400">{fmtDec(metrics.deltaQualityScore || 0)}</div>
                  </div>
                </div>

                {/* Threshold Controls */}
                <div className="p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-green-400 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      ML Filter Controls (Simplified)
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetThresholds}
                      className="border-green-500/50 hover:bg-green-500/10 text-green-400 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Quality Threshold (not used in filtering, for reference only) */}
                    <div className="space-y-2 opacity-50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-300">
                          Quality Score (Reference)
                        </label>
                        <div className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 rounded">
                          <span className="text-sm font-black text-gray-400">{deltaThresholds.quality}</span>
                          <span className="text-xs text-gray-500">/100</span>
                        </div>
                      </div>
                      <Slider
                        value={[deltaThresholds.quality]}
                        onValueChange={handleQualityThresholdChange}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled
                      />
                      <p className="text-xs text-gray-500">
                        Not used in filtering (Gamma handles tier filtering)
                      </p>
                    </div>

                    {/* ML Threshold - PRIMARY FILTER */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-blue-400" />
                          ML Win Probability
                        </label>
                        <div className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded">
                          <span className="text-sm font-black text-blue-400">{(deltaThresholds.ml * 100).toFixed(0)}</span>
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </div>
                      <Slider
                        value={[deltaThresholds.ml * 100]}
                        onValueChange={handleMLThresholdChange}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-green-400 font-semibold">
                        PRIMARY FILTER: ML model's predicted win probability
                      </p>
                    </div>

                    {/* Strategy Win Rate - VETO FILTER */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-orange-400" />
                          Strategy Win Rate Veto
                        </label>
                        <div className="px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded">
                          <span className="text-sm font-black text-orange-400">{deltaThresholds.strategyWinRate}</span>
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </div>
                      <Slider
                        value={[deltaThresholds.strategyWinRate]}
                        onValueChange={handleStrategyWinRateChange}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-orange-400 font-semibold">
                        VETO: Reject if strategy has &lt;{deltaThresholds.strategyWinRate}% win rate
                      </p>
                    </div>
                  </div>

                  {/* Quick presets */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-gray-400">Quick Presets:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        deltaV2QualityEngine.setThresholds(30, 0.60, 50);
                        setDeltaThresholds(deltaV2QualityEngine.getThresholds());
                        addLog('success', 'system', '🎚️ Preset: Strict (ML 60%, Win Rate 50%)');
                        toast({ title: 'Strict Mode', description: 'ML: 60%, Win Rate Veto: 50%' });
                      }}
                      className="border-orange-500/50 hover:bg-orange-500/10 text-orange-400 text-xs h-7"
                    >
                      Strict
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        deltaV2QualityEngine.setThresholds(30, 0.45, 35);
                        setDeltaThresholds(deltaV2QualityEngine.getThresholds());
                        addLog('success', 'system', '🎚️ Preset: Balanced (ML 45%, Win Rate 35%)');
                        toast({ title: 'Balanced Mode', description: 'ML: 45%, Win Rate Veto: 35% (Optimized)' });
                      }}
                      className="border-blue-500/50 hover:bg-blue-500/10 text-blue-400 text-xs h-7"
                    >
                      Balanced
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        deltaV2QualityEngine.setThresholds(30, 0.40, 25);
                        setDeltaThresholds(deltaV2QualityEngine.getThresholds());
                        addLog('success', 'system', '🎚️ Preset: Aggressive (ML 40%, Win Rate 25%)');
                        toast({ title: 'Aggressive Mode', description: 'ML: 40%, Win Rate Veto: 25% (More signals)' });
                      }}
                      className="border-red-500/50 hover:bg-red-500/10 text-red-400 text-xs h-7"
                    >
                      Aggressive
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {expandedEngine === 'zeta' && (
              <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/50 p-6 shadow-xl shadow-purple-500/20 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-bold text-purple-400">Zeta Learning Engine</h3>
                    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500">Learning Active</Badge>
                  </div>
                  <button onClick={() => setExpandedEngine(null)} className="text-gray-400 hover:text-purple-400">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">ML Accuracy</div>
                    <div className="text-xl font-bold text-purple-400">N/A</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Top Strategy</div>
                    <div className="text-sm font-bold text-gray-300 truncate">Learning...</div>
                  </div>
                  <div className="p-3 bg-gray-800 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">System Health</div>
                    <div className="text-sm font-bold text-green-400">OPTIMAL</div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* DATABASE CONTROLS */}
          <TabsContent value="database" className="space-y-4">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-orange-400">
                <Database className="w-6 h-6" />
                Database Control Panel
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button
                  onClick={handleRunSQLCleanup}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border border-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Run SQL Cleanup
                </Button>

                <Button
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  variant="outline"
                  className="border-2 border-orange-600 text-orange-400 hover:bg-orange-950"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Open Supabase
                </Button>

                <Button
                  onClick={checkStatus}
                  variant="outline"
                  className="border-2 border-gray-600 text-gray-300 hover:bg-gray-900"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* LIVE LOGS */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2 text-orange-400">
                  <Terminal className="w-6 h-6" />
                  Live System Logs
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setAutoScroll(!autoScroll)}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-600 text-gray-300"
                  >
                    Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                  </Button>
                  <Button
                    onClick={() => setLogs([])}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-600 text-gray-300"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    onClick={handleExportLogs}
                    variant="outline"
                    size="sm"
                    className="border-2 border-orange-600 text-orange-400"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs border-2 border-gray-800">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-20">
                    No logs yet. System monitoring...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`py-1 ${
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warning' ? 'text-yellow-400' :
                        log.level === 'success' ? 'text-green-400' :
                        'text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      {' '}
                      <span className={`font-bold ${
                        log.source === 'arena' ? 'text-orange-400' :
                        log.source === 'hub' ? 'text-blue-400' :
                        'text-purple-400'
                      }`}>
                        [{log.source.toUpperCase()}]
                      </span>
                      {' '}
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions Footer */}
        <Card className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-orange-600/20 border-2 border-orange-500/30 p-6">
          <h3 className="text-lg font-bold mb-4 text-orange-400">⚡ Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={async () => {
                await handleStartHub();
                await handleStartArena();
              }}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border border-green-500"
            >
              <Play className="w-4 h-4 mr-2" />
              Start All
            </Button>

            <Button
              onClick={() => {
                handleStopHub();
                handleStopArena();
              }}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border border-red-500"
            >
              <Pause className="w-4 h-4 mr-2" />
              Stop All
            </Button>

            <Button
              onClick={() => {
                checkStatus();
                addLog('info', 'system', '🔄 Status refreshed');
              }}
              variant="outline"
              className="border-2 border-orange-600 text-orange-400 hover:bg-orange-950"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>

            <Button
              onClick={handleExportLogs}
              variant="outline"
              className="border-2 border-gray-600 text-gray-300 hover:bg-gray-900"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </Card>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

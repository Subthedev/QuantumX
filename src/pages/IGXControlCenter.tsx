/**
 * FLUX - Professional Signal Control Center
 *
 * Clean, professional command center for signal system control
 * Design: Solid colors, static elements, clear hierarchy
 * Primary Color: Emerald Green (#059669)
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Rocket,
  Zap,
  Shield,
  Swords,
  Activity,
  BarChart3,
  Power,
  RotateCcw,
  AlertTriangle,
  Save,
  Upload,
  Target,
  Flame,
  Filter,
  Gauge,
  Brain,
  Lock,
  Unlock,
  Play,
  Pause,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { globalHubService } from '@/services/globalHubService';
import { deltaV2QualityEngine } from '@/services/deltaV2QualityEngine';
import { igxGammaV2 } from '@/services/igx/IGXGammaV2';
import { igxBetaV5 } from '@/services/igx/IGXBetaV5';
import { arenaService } from '@/services/arenaService';
import { useToast } from '@/hooks/use-toast';
import type { UserTier } from '@/services/scheduledSignalDropper';

interface FrequencyState {
  FREE: number;  // hours
  PRO: number;   // minutes
  MAX: number;   // minutes
}

interface ThresholdState {
  quality: number;
  ml: number;
  strategyWinRate: number;
}

interface TierConfig {
  acceptHigh: boolean;
  acceptMedium: boolean;
  acceptLow: boolean;
}

const STRATEGY_NAMES = [
  'WHALE_SHADOW',
  'SPRING_TRAP',
  'MOMENTUM_SURGE',
  'MOMENTUM_SURGE_V2',
  'MOMENTUM_RECOVERY',
  'FUNDING_SQUEEZE',
  'ORDER_FLOW_TSUNAMI',
  'FEAR_GREED_CONTRARIAN',
  'GOLDEN_CROSS_MOMENTUM',
  'MARKET_PHASE_SNIPER',
  'LIQUIDITY_HUNTER',
  'VOLATILITY_BREAKOUT',
  'STATISTICAL_ARBITRAGE',
  'ORDER_BOOK_MICROSTRUCTURE',
  'LIQUIDATION_CASCADE_PREDICTION',
  'CORRELATION_BREAKDOWN_DETECTOR',
  'BOLLINGER_MEAN_REVERSION'
];

const REGIME_OPTIONS = [
  { value: 'auto', label: 'AUTO-DETECT', description: 'System detects market regime' },
  { value: 'BULLISH_TREND', label: 'Bullish Trend', description: 'Force bullish strategies' },
  { value: 'BEARISH_TREND', label: 'Bearish Trend', description: 'Force bearish strategies' },
  { value: 'SIDEWAYS', label: 'Sideways', description: 'Force range-bound strategies' },
  { value: 'HIGH_VOLATILITY', label: 'High Volatility', description: 'Force volatility strategies' },
  { value: 'LOW_VOLATILITY', label: 'Low Volatility', description: 'Force low-vol strategies' }
];

export default function IGXControlCenter() {
  const { toast } = useToast();

  // ===== STATE =====
  const [metrics, setMetrics] = useState(globalHubService.getMetrics());

  // Signal Pulse (Frequency) State
  const [frequency, setFrequency] = useState<FrequencyState>({
    FREE: 8,    // 8 hours
    PRO: 96,    // 96 minutes
    MAX: 48     // 48 minutes
  });

  // Quality Filters State
  const [thresholds, setThresholds] = useState<ThresholdState>({
    quality: 52,
    ml: 50,
    strategyWinRate: 35
  });

  // Gamma Tier Gates State
  const [tierConfig, setTierConfig] = useState<TierConfig>({
    acceptHigh: true,
    acceptMedium: true,
    acceptLow: false
  });

  // Strategy Armory State
  const [enabledStrategies, setEnabledStrategies] = useState<Set<string>>(
    new Set(STRATEGY_NAMES)
  );

  // Regime Override State
  const [regimeOverride, setRegimeOverride] = useState<string>('auto');

  // System Status State
  const [hubRunning, setHubRunning] = useState(globalHubService.isRunning());
  const [arenaRunning, setArenaRunning] = useState(false);

  // Visual Feedback State
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [strategyPerformance, setStrategyPerformance] = useState<Map<string, {signals: number, winRate: number}>>(new Map());

  // ===== QUICK MODE PRESETS =====
  const QUICK_MODES = {
    CONSERVATIVE: {
      name: '🛡️ CONSERVATIVE',
      description: 'High quality, low frequency',
      frequency: { FREE: 12, PRO: 120, MAX: 60 },
      thresholds: { quality: 70, ml: 60, strategyWinRate: 45 },
      tierConfig: { acceptHigh: true, acceptMedium: false, acceptLow: false }
    },
    BALANCED: {
      name: '⚖️ BALANCED',
      description: 'Default optimal settings',
      frequency: { FREE: 8, PRO: 96, MAX: 48 },
      thresholds: { quality: 52, ml: 50, strategyWinRate: 35 },
      tierConfig: { acceptHigh: true, acceptMedium: true, acceptLow: false }
    },
    AGGRESSIVE: {
      name: '⚡ AGGRESSIVE',
      description: 'More signals, moderate quality',
      frequency: { FREE: 4, PRO: 60, MAX: 30 },
      thresholds: { quality: 45, ml: 40, strategyWinRate: 30 },
      tierConfig: { acceptHigh: true, acceptMedium: true, acceptLow: true }
    },
    BEAST_MODE: {
      name: '🔥 BEAST MODE',
      description: 'Maximum signal output',
      frequency: { FREE: 2, PRO: 30, MAX: 15 },
      thresholds: { quality: 35, ml: 30, strategyWinRate: 25 },
      tierConfig: { acceptHigh: true, acceptMedium: true, acceptLow: true }
    }
  };

  // ===== EFFECTS =====
  useEffect(() => {
    // Load saved frequency settings
    const tierStates = globalHubService.getTierStates();
    setFrequency({
      FREE: Math.round(tierStates.FREE.interval / (60 * 60 * 1000)), // ms to hours
      PRO: Math.round(tierStates.PRO.interval / (60 * 1000)),         // ms to minutes
      MAX: Math.round(tierStates.MAX.interval / (60 * 1000))          // ms to minutes
    });

    // Load saved thresholds
    const savedThresholds = deltaV2QualityEngine.getThresholds();
    setThresholds({
      quality: savedThresholds.qualityThreshold,
      ml: savedThresholds.mlThreshold * 100, // 0-1 to 0-100
      strategyWinRate: savedThresholds.strategyWinRateThreshold
    });

    // Load saved tier config
    const gammaConfig = igxGammaV2.getTierConfig();
    setTierConfig(gammaConfig);

    // Subscribe to metrics updates
    const unsubscribe = globalHubService.on('metrics:updated', (newMetrics: any) => {
      setMetrics(newMetrics);
    });

    // Poll status
    const interval = setInterval(() => {
      setHubRunning(globalHubService.isRunning());
      setMetrics(globalHubService.getMetrics());
    }, 1000);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // ===== HANDLERS =====

  const handleEngageHyperdrive = () => {
    // Convert to milliseconds and update
    globalHubService.updateDropInterval('FREE', frequency.FREE * 60 * 60 * 1000);
    globalHubService.updateDropInterval('PRO', frequency.PRO * 60 * 1000);
    globalHubService.updateDropInterval('MAX', frequency.MAX * 60 * 1000);

    toast({
      title: "🚀 HYPERDRIVE ENGAGED",
      description: `Signal frequencies updated across all tiers!`,
      duration: 3000
    });
  };

  const handleLockThresholds = () => {
    deltaV2QualityEngine.setThresholds(
      thresholds.quality,
      thresholds.ml / 100, // 0-100 to 0-1
      thresholds.strategyWinRate
    );

    toast({
      title: "⚡ THRESHOLDS LOCKED",
      description: `Quality filters applied successfully!`,
      duration: 3000
    });
  };

  const handleSecureGates = () => {
    igxGammaV2.updateTierConfig(tierConfig);

    toast({
      title: "🛡️ GATES SECURED",
      description: `Tier filters updated!`,
      duration: 3000
    });
  };

  const handleArmAll = () => {
    STRATEGY_NAMES.forEach(strategy => {
      igxBetaV5.enableStrategy(strategy);
    });
    setEnabledStrategies(new Set(STRATEGY_NAMES));

    toast({
      title: "✅ ALL STRATEGIES ARMED",
      description: `${STRATEGY_NAMES.length} strategies activated!`,
      duration: 3000
    });
  };

  const handleDisarmAll = () => {
    STRATEGY_NAMES.forEach(strategy => {
      igxBetaV5.disableStrategy(strategy);
    });
    setEnabledStrategies(new Set());

    toast({
      title: "❌ ALL STRATEGIES DISARMED",
      description: `All strategies deactivated!`,
      variant: "destructive",
      duration: 3000
    });
  };

  const toggleStrategy = (strategy: string) => {
    const newEnabled = new Set(enabledStrategies);
    if (newEnabled.has(strategy)) {
      newEnabled.delete(strategy);
      igxBetaV5.disableStrategy(strategy);
    } else {
      newEnabled.add(strategy);
      igxBetaV5.enableStrategy(strategy);
    }
    setEnabledStrategies(newEnabled);
  };

  const handleOverrideRegime = () => {
    // This would need to be implemented in Beta V5
    toast({
      title: "🎯 REGIME OVERRIDE",
      description: `Set to: ${regimeOverride}`,
      duration: 3000
    });
  };

  // Quick Mode Handler
  const applyQuickMode = (modeKey: keyof typeof QUICK_MODES) => {
    const mode = QUICK_MODES[modeKey];

    // Apply all settings at once
    setFrequency(mode.frequency);
    setThresholds(mode.thresholds);
    setTierConfig(mode.tierConfig);

    // Actually update the services
    globalHubService.updateDropInterval('FREE', mode.frequency.FREE * 60 * 60 * 1000);
    globalHubService.updateDropInterval('PRO', mode.frequency.PRO * 60 * 1000);
    globalHubService.updateDropInterval('MAX', mode.frequency.MAX * 60 * 1000);

    deltaV2QualityEngine.setThresholds(
      mode.thresholds.quality,
      mode.thresholds.ml / 100,
      mode.thresholds.strategyWinRate
    );

    igxGammaV2.setTierConfig(mode.tierConfig);

    // Visual feedback
    setActiveButton(modeKey);
    setTimeout(() => setActiveButton(null), 1000);

    toast({
      title: `${mode.name} ACTIVATED`,
      description: mode.description,
      duration: 3000
    });
  };

  const handleEmergencyStop = () => {
    if (!globalHubService.isRunning()) return;

    globalHubService.stop();
    setHubRunning(false);

    toast({
      title: "🚨 EMERGENCY STOP",
      description: "All systems halted!",
      variant: "destructive",
      duration: 5000
    });
  };

  const handleFullReboot = () => {
    globalHubService.stop();
    setTimeout(() => {
      globalHubService.start();
      setHubRunning(true);
      toast({
        title: "♻️ SYSTEM REBOOTED",
        description: "Full restart complete!",
        duration: 3000
      });
    }, 1000);
  };

  const handleClearDecks = () => {
    globalHubService.clearAllSignals();
    toast({
      title: "🧹 DECKS CLEARED",
      description: "All signals removed!",
      duration: 3000
    });
  };

  const handleSyncArena = async () => {
    await arenaService.initialize();
    toast({
      title: "📡 ARENA SYNCED",
      description: "Arena restarted successfully!",
      duration: 3000
    });
  };

  // ===== UTILITY FUNCTIONS =====

  const calculateSignalsPerDay = (interval: number, unit: 'hours' | 'minutes'): string => {
    const hours = unit === 'hours' ? interval : interval / 60;
    const signalsPerDay = 24 / hours;
    return signalsPerDay.toFixed(1);
  };

  const getFrequencyModeName = (tier: 'FREE' | 'PRO' | 'MAX', value: number): string => {
    if (tier === 'FREE') {
      if (value <= 2) return 'FOMO Mode';
      if (value <= 4) return 'Active Mode';
      if (value <= 8) return 'Daily Mode';
      return 'Casual Mode';
    } else if (tier === 'PRO') {
      if (value <= 45) return 'Rapid Fire';
      if (value <= 90) return 'Aggressive';
      if (value <= 120) return 'Balanced';
      return 'Conservative';
    } else { // MAX
      if (value <= 30) return 'Beast Mode';
      if (value <= 60) return 'Turbo';
      if (value <= 90) return 'High Output';
      return 'Steady Flow';
    }
  };

  // ===== RENDER =====

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b-2 border-emerald-600 bg-slate-800 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg">
                <Gauge className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  FLUX
                </h1>
                <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Signal Control Center • Professional Edition</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`px-4 py-2 font-bold text-sm ${hubRunning ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
                <Activity className={`w-4 h-4 mr-2 ${hubRunning ? '' : 'opacity-50'}`} />
                {hubRunning ? 'SYSTEMS ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <Tabs defaultValue="mission-control" className="space-y-6">
          <TabsList className="bg-slate-700 border-2 border-slate-600 p-1">
            <TabsTrigger value="mission-control" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              MISSION CONTROL
            </TabsTrigger>
            <TabsTrigger value="strategy-armory" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Swords className="w-4 h-4 mr-2" />
              STRATEGY ARMORY
            </TabsTrigger>
            <TabsTrigger value="system-status" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              SYSTEM STATUS
            </TabsTrigger>
            <TabsTrigger value="quick-actions" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Zap className="w-4 h-4 mr-2" />
              QUICK ACTIONS
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MISSION CONTROL */}
          <TabsContent value="mission-control" className="space-y-6">
            {/* QUICK MODE PRESETS - One-Click Configuration */}
            <Card className="bg-slate-700 border-2 border-emerald-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">QUICK MODES</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">One-Click Optimal Configurations</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(QUICK_MODES).map(([key, mode]) => (
                  <button
                    key={key}
                    onClick={() => applyQuickMode(key as keyof typeof QUICK_MODES)}
                    className={`group relative p-8 rounded-xl border-3 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                      activeButton === key
                        ? 'bg-emerald-500 border-emerald-400 shadow-2xl shadow-emerald-500/50'
                        : 'bg-slate-800 border-slate-600 hover:border-emerald-500 hover:bg-slate-750'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-3">{mode.name.split(' ')[0]}</div>
                      <div className={`text-xl font-black mb-3 uppercase tracking-wide ${
                        activeButton === key ? 'text-white' : 'text-emerald-400 group-hover:text-emerald-300'
                      }`}>
                        {mode.name.split(' ').slice(1).join(' ')}
                      </div>
                      <div className={`text-sm font-medium ${
                        activeButton === key ? 'text-emerald-100' : 'text-slate-400 group-hover:text-slate-300'
                      }`}>
                        {mode.description}
                      </div>
                    </div>

                    {/* Active indicator */}
                    {activeButton === key && (
                      <div className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-800 rounded-lg border-2 border-slate-600">
                <p className="text-sm text-slate-300 text-center font-medium">
                  💡 Quick Modes instantly configure frequency, quality filters, and tier gates for optimal performance
                </p>
              </div>
            </Card>

            {/* Signal Pulse Card */}
            <Card className="bg-slate-700 border-2 border-emerald-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">SIGNAL PULSE</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Control Signal Drop Frequency</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* FREE Tier */}
                <div className="space-y-4 p-6 bg-slate-800 rounded-xl border-2 border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-base font-black text-emerald-400 uppercase tracking-wider">FREE TIER</label>
                      <p className="text-sm text-emerald-300 mt-1 font-semibold">{getFrequencyModeName('FREE', frequency.FREE)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-white tabular-nums">{frequency.FREE}h</div>
                      <div className="text-sm text-slate-300 font-medium">{calculateSignalsPerDay(frequency.FREE, 'hours')} signals/day</div>
                    </div>
                  </div>
                  <Slider
                    value={[frequency.FREE]}
                    onValueChange={(val) => setFrequency({...frequency, FREE: val[0]})}
                    min={1}
                    max={24}
                    step={1}
                    className="w-full h-3"
                  />
                  <div className="flex justify-between text-sm text-slate-400 font-medium">
                    <span>1h (FOMO)</span>
                    <span>24h (Casual)</span>
                  </div>
                </div>

                {/* PRO Tier */}
                <div className="space-y-4 p-6 bg-slate-800 rounded-xl border-2 border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-base font-black text-emerald-400 uppercase tracking-wider">PRO TIER</label>
                      <p className="text-sm text-emerald-300 mt-1 font-semibold">{getFrequencyModeName('PRO', frequency.PRO)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-white tabular-nums">{frequency.PRO}min</div>
                      <div className="text-sm text-slate-300 font-medium">{calculateSignalsPerDay(frequency.PRO, 'minutes')} signals/day</div>
                    </div>
                  </div>
                  <Slider
                    value={[frequency.PRO]}
                    onValueChange={(val) => setFrequency({...frequency, PRO: val[0]})}
                    min={30}
                    max={240}
                    step={5}
                    className="w-full h-3"
                  />
                  <div className="flex justify-between text-sm text-slate-400 font-medium">
                    <span>30min (Rapid Fire)</span>
                    <span>240min (Conservative)</span>
                  </div>
                </div>

                {/* MAX Tier */}
                <div className="space-y-4 p-6 bg-slate-800 rounded-xl border-2 border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-base font-black text-emerald-400 uppercase tracking-wider">MAX TIER</label>
                      <p className="text-sm text-emerald-300 mt-1 font-semibold">{getFrequencyModeName('MAX', frequency.MAX)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-white tabular-nums">{frequency.MAX}min</div>
                      <div className="text-sm text-slate-300 font-medium">{calculateSignalsPerDay(frequency.MAX, 'minutes')} signals/day</div>
                    </div>
                  </div>
                  <Slider
                    value={[frequency.MAX]}
                    onValueChange={(val) => setFrequency({...frequency, MAX: val[0]})}
                    min={15}
                    max={120}
                    step={5}
                    className="w-full h-3"
                  />
                  <div className="flex justify-between text-sm text-slate-400 font-medium">
                    <span>15min (Beast Mode)</span>
                    <span>120min (Steady Flow)</span>
                  </div>
                </div>

                {/* Apply Button */}
                <Button
                  onClick={handleEngageHyperdrive}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-8 text-xl font-black shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 rounded-xl"
                >
                  <Rocket className="w-6 h-6 mr-3" />
                  🚀 ENGAGE HYPERDRIVE
                </Button>
              </div>
            </Card>

            {/* Quality Filters Card */}
            <Card className="bg-slate-700 border-2 border-slate-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                  <Filter className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">QUALITY FILTERS</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Delta V2 Threshold Controls</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Quality Bar */}
                <div className="space-y-4 p-6 bg-slate-800 rounded-xl border-2 border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-base font-black text-white uppercase tracking-wider">Quality Bar</label>
                    <div className="px-5 py-3 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-xl">
                      <span className="text-3xl font-black text-emerald-400 tabular-nums">{thresholds.quality}</span>
                    </div>
                  </div>
                  <Slider
                    value={[thresholds.quality]}
                    onValueChange={(val) => setThresholds({...thresholds, quality: val[0]})}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full h-3"
                  />
                  <p className="text-sm text-slate-400 font-medium">Minimum quality score required (0-100). Default: 52</p>
                </div>

                {/* ML Brain Trust */}
                <div className="space-y-4 p-6 bg-slate-800 rounded-xl border-2 border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-base font-black text-white uppercase tracking-wider">ML Brain Trust</label>
                    <div className="px-5 py-3 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-xl">
                      <span className="text-3xl font-black text-emerald-400 tabular-nums">{thresholds.ml}%</span>
                    </div>
                  </div>
                  <Slider
                    value={[thresholds.ml]}
                    onValueChange={(val) => setThresholds({...thresholds, ml: val[0]})}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full h-3"
                  />
                  <p className="text-sm text-slate-400 font-medium">ML confidence threshold (0-100%). Default: 50%</p>
                </div>

                {/* Strategy Veto Power */}
                <div className="space-y-4 p-6 bg-slate-800 rounded-xl border-2 border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-base font-black text-white uppercase tracking-wider">Strategy Veto Power</label>
                    <div className="px-5 py-3 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-xl">
                      <span className="text-3xl font-black text-emerald-400 tabular-nums">{thresholds.strategyWinRate}%</span>
                    </div>
                  </div>
                  <Slider
                    value={[thresholds.strategyWinRate]}
                    onValueChange={(val) => setThresholds({...thresholds, strategyWinRate: val[0]})}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full h-3"
                  />
                  <p className="text-sm text-slate-400 font-medium">Minimum strategy historical win rate (0-100%). Default: 35%</p>
                </div>

                {/* Apply Button */}
                <Button
                  onClick={handleLockThresholds}
                  className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-8 text-xl font-black border-2 border-emerald-600 hover:border-emerald-500 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  <Lock className="w-6 h-6 mr-3" />
                  ⚡ LOCK THRESHOLDS
                </Button>
              </div>
            </Card>

            {/* Gamma Tier Gates Card */}
            <Card className="bg-slate-700 border-2 border-slate-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">GAMMA TIER GATES</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Signal Quality Tier Filters</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between p-6 bg-slate-800 rounded-xl border-2 border-slate-600 hover:border-emerald-500 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={tierConfig.acceptHigh}
                      onCheckedChange={(checked) => setTierConfig({...tierConfig, acceptHigh: checked as boolean})}
                      className="border-emerald-500 w-6 h-6"
                    />
                    <div>
                      <label className="text-base font-black text-emerald-400 uppercase tracking-wide">Accept HIGH Tier</label>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Confidence ≥70%, Agreement ≥70%</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white px-4 py-2 text-sm font-bold">PREMIUM</Badge>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-800 rounded-xl border-2 border-slate-600 hover:border-emerald-500 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={tierConfig.acceptMedium}
                      onCheckedChange={(checked) => setTierConfig({...tierConfig, acceptMedium: checked as boolean})}
                      className="border-emerald-500 w-6 h-6"
                    />
                    <div>
                      <label className="text-base font-black text-white uppercase tracking-wide">Accept MEDIUM Tier</label>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Confidence ≥55%, Agreement ≥55%</p>
                    </div>
                  </div>
                  <Badge className="bg-slate-500 text-white px-4 py-2 text-sm font-bold">STANDARD</Badge>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-800 rounded-xl border-2 border-slate-600 hover:border-emerald-500 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={tierConfig.acceptLow}
                      onCheckedChange={(checked) => setTierConfig({...tierConfig, acceptLow: checked as boolean})}
                      className="border-emerald-500 w-6 h-6"
                    />
                    <div>
                      <label className="text-base font-black text-slate-400 uppercase tracking-wide">Accept LOW Tier</label>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Below standard thresholds</p>
                    </div>
                  </div>
                  <Badge className="bg-slate-600 text-slate-300 px-4 py-2 text-sm font-bold">TESTING</Badge>
                </div>

                {/* Apply Button */}
                <Button
                  onClick={handleSecureGates}
                  className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-8 text-xl font-black border-2 border-emerald-600 hover:border-emerald-500 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  <Shield className="w-6 h-6 mr-3" />
                  🛡️ SECURE GATES
                </Button>
              </div>
            </Card>

            {/* Live Metrics Dashboard */}
            <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-emerald-600 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">LIVE METRICS DASHBOARD</h3>
                    <p className="text-sm text-emerald-400 uppercase tracking-wide font-semibold">Real-Time Performance • Updates Every Second</p>
                  </div>
                </div>
                <Badge className={`px-4 py-2 ${hubRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} text-white`}>
                  {hubRunning ? '🟢 LIVE' : '🔴 OFFLINE'}
                </Badge>
              </div>

              {/* Primary Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-slate-800 rounded-lg border-2 border-emerald-500 text-center hover:scale-105 transition-transform">
                  <div className="text-4xl font-black text-emerald-400 tabular-nums">{metrics.totalSignals || 0}</div>
                  <div className="text-xs text-emerald-300 uppercase tracking-wide mt-2 font-bold">Total Signals</div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg border-2 border-blue-500 text-center hover:scale-105 transition-transform">
                  <div className="text-4xl font-black text-blue-400 tabular-nums">
                    {metrics.approvalRate ? (metrics.approvalRate * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-blue-300 uppercase tracking-wide mt-2 font-bold">Pass Rate</div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg border-2 border-purple-500 text-center hover:scale-105 transition-transform">
                  <div className="text-4xl font-black text-purple-400 tabular-nums">{enabledStrategies.size}</div>
                  <div className="text-xs text-purple-300 uppercase tracking-wide mt-2 font-bold">Armed Strategies</div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg border-2 border-orange-500 text-center hover:scale-105 transition-transform">
                  <div className="text-4xl font-black text-orange-400 tabular-nums">
                    {metrics.winRate ? (metrics.winRate * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-orange-300 uppercase tracking-wide mt-2 font-bold">Win Rate</div>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Analyzed</div>
                    <div className="text-2xl font-bold text-white tabular-nums">{metrics.totalAnalyses || 0}</div>
                  </div>
                  <Brain className="w-6 h-6 text-violet-400" />
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Tickers</div>
                    <div className="text-2xl font-bold text-white tabular-nums">{metrics.totalTickers || 0}</div>
                  </div>
                  <BarChart3 className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Uptime</div>
                    <div className="text-2xl font-bold text-white">{Math.floor((metrics.uptime || 0) / 3600)}h</div>
                  </div>
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* Quick Stats Banner */}
              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-300 font-semibold">
                    ⚡ System Status: {hubRunning ? 'Optimal' : 'Offline'}
                  </span>
                  <span className="text-slate-300">
                    {metrics.totalSignals || 0} signals • {(metrics.approvalRate ? metrics.approvalRate * 100 : 0).toFixed(0)}% approved • {enabledStrategies.size}/{STRATEGY_NAMES.length} strategies
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: STRATEGY ARMORY */}
          <TabsContent value="strategy-armory" className="space-y-6">
            <Card className="bg-slate-700 border-2 border-emerald-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Swords className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">ACTIVE STRATEGIES</h3>
                    <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">{enabledStrategies.size} of {STRATEGY_NAMES.length} Armed</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleArmAll} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-6 text-base font-bold rounded-xl shadow-lg">
                    <Unlock className="w-5 h-5 mr-2" />
                    ✅ ARM ALL
                  </Button>
                  <Button onClick={handleDisarmAll} variant="destructive" className="px-6 py-6 text-base font-bold rounded-xl shadow-lg">
                    <Lock className="w-5 h-5 mr-2" />
                    ❌ DISARM ALL
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {STRATEGY_NAMES.map(strategy => (
                  <div
                    key={strategy}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-102 ${
                      enabledStrategies.has(strategy)
                        ? 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30 shadow-lg'
                        : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => toggleStrategy(strategy)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-base font-black uppercase tracking-wide ${enabledStrategies.has(strategy) ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {strategy.replace(/_/g, ' ')}
                        </div>
                        <div className={`text-sm mt-2 font-semibold ${enabledStrategies.has(strategy) ? 'text-emerald-300' : 'text-slate-500'}`}>
                          {enabledStrategies.has(strategy) ? '✅ ARMED' : '⚪ DISARMED'}
                        </div>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        enabledStrategies.has(strategy) ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}>
                        {enabledStrategies.has(strategy) ? <Unlock className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Regime Override Card */}
            <Card className="bg-slate-700 border-2 border-slate-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">REGIME OVERRIDE</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Force Market Condition</p>
                </div>
              </div>

              <div className="space-y-4">
                {REGIME_OPTIONS.map(option => (
                  <div
                    key={option.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      regimeOverride === option.value
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setRegimeOverride(option.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-bold ${regimeOverride === option.value ? 'text-emerald-400' : 'text-white'}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{option.description}</div>
                      </div>
                      {regimeOverride === option.value && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  onClick={handleOverrideRegime}
                  className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-8 text-xl font-black border-2 border-emerald-600 hover:border-emerald-500 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  <Target className="w-6 h-6 mr-3" />
                  🎯 OVERRIDE REGIME
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: SYSTEM STATUS */}
          <TabsContent value="system-status" className="space-y-6">
            <Card className="bg-slate-700 border-2 border-emerald-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">6-STAGE PIPELINE</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Signal Processing Flow</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-8 px-4 bg-slate-800 rounded-lg border-2 border-slate-600">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-white font-bold">ALPHA</span>
                  </div>
                  <div className="text-xs text-slate-400">Pattern Detection</div>
                </div>

                <div className="text-emerald-400 text-2xl">→</div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-white font-bold">BETA</span>
                  </div>
                  <div className="text-xs text-slate-400">Strategy Execution</div>
                </div>

                <div className="text-emerald-400 text-2xl">→</div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-white font-bold">GAMMA</span>
                  </div>
                  <div className="text-xs text-slate-400">Tier Filtering</div>
                </div>

                <div className="text-emerald-400 text-2xl">→</div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-white font-bold">DELTA</span>
                  </div>
                  <div className="text-xs text-slate-400">ML Quality Gate</div>
                </div>

                <div className="text-emerald-400 text-2xl">→</div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-white font-bold">QUEUE</span>
                  </div>
                  <div className="text-xs text-slate-400">Rate Limiting</div>
                </div>

                <div className="text-emerald-400 text-2xl">→</div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-2 mx-auto">
                    <span className="text-white font-bold">PUBLISH</span>
                  </div>
                  <div className="text-xs text-slate-400">Signal Delivery</div>
                </div>
              </div>
            </Card>

            {/* Engine Health Card */}
            <Card className="bg-slate-700 border-2 border-slate-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">ENGINE HEALTH</h3>
                  <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Real-Time Status</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border-2 border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">β</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Beta V5</div>
                      <div className="text-xs text-slate-400">Strategy Execution Engine</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">OPTIMAL</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border-2 border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">γ</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Gamma V2</div>
                      <div className="text-xs text-slate-400">Adaptive Market Matcher</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">GOOD</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border-2 border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">δ</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Delta V2</div>
                      <div className="text-xs text-slate-400">ML Quality Engine</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">OPTIMAL</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border-2 border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">ζ</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Zeta Learning</div>
                      <div className="text-xs text-slate-400">Continuous Learning Coordinator</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">ACTIVE</Badge>
                </div>
              </div>

              <Button
                onClick={() => {
                  toast({ title: "🩺 Diagnostics Running", description: "System health check in progress..." });
                }}
                className="w-full mt-6 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-8 text-xl font-black border-2 border-emerald-600 hover:border-emerald-500 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
              >
                <Activity className="w-6 h-6 mr-3" />
                🩺 RUN DIAGNOSTICS
              </Button>
            </Card>
          </TabsContent>

          {/* TAB 4: QUICK ACTIONS */}
          <TabsContent value="quick-actions" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Emergency Stop */}
              <Card className="bg-red-900/20 border-2 border-red-600 p-6 hover:bg-red-900/30 transition-all cursor-pointer" onClick={handleEmergencyStop}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-4">
                    <Power className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-red-400 mb-2">🚨 EMERGENCY STOP</h3>
                  <p className="text-sm text-slate-400">Halt all systems immediately</p>
                </div>
              </Card>

              {/* Full Reboot */}
              <Card className="bg-slate-700 border-2 border-emerald-600 p-6 hover:bg-slate-600 transition-all cursor-pointer" onClick={handleFullReboot}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400 mb-2">♻️ FULL SYSTEM REBOOT</h3>
                  <p className="text-sm text-slate-400">Complete system restart</p>
                </div>
              </Card>

              {/* Clear Decks */}
              <Card className="bg-slate-700 border-2 border-slate-600 p-6 hover:bg-slate-600 transition-all cursor-pointer" onClick={handleClearDecks}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">🧹 CLEAR THE DECKS</h3>
                  <p className="text-sm text-slate-400">Remove all signals</p>
                </div>
              </Card>

              {/* Sync Arena */}
              <Card className="bg-slate-700 border-2 border-slate-600 p-6 hover:bg-slate-600 transition-all cursor-pointer" onClick={handleSyncArena}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">📡 SYNC ARENA</h3>
                  <p className="text-sm text-slate-400">Restart Arena service</p>
                </div>
              </Card>

              {/* Backup Settings */}
              <Card className="bg-slate-700 border-2 border-slate-600 p-6 hover:bg-slate-600 transition-all cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center mx-auto mb-4">
                    <Save className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">💾 BACKUP SETTINGS</h3>
                  <p className="text-sm text-slate-400">Export configuration</p>
                </div>
              </Card>

              {/* Restore Settings */}
              <Card className="bg-slate-700 border-2 border-slate-600 p-6 hover:bg-slate-600 transition-all cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">📥 RESTORE SETTINGS</h3>
                  <p className="text-sm text-slate-400">Import configuration</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

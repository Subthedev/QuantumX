/**
 * FLUX CONTROL CENTER - Intelligence Hub for QuantumX
 *
 * Comprehensive dev control center with:
 * - Signal mode controls (PUSH/PULL/AUTO)
 * - System statistics
 * - Dev/Admin tools (hamburger menu)
 *
 * NOTE: This is a DEV/ADMIN tool, not for general public use
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  Target,
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  Menu,
  X,
  Settings,
  Brain,
  Database,
  Terminal,
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';
import { quantumXEngine, type QuantumXState } from '@/services/quantumXEngine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FluxRemoteProps {
  compact?: boolean;
  showStats?: boolean;
  className?: string;
}

export default function FluxRemote({
  compact = false,
  showStats = true,
  className = ''
}: FluxRemoteProps) {
  const { toast } = useToast();
  const [state, setState] = useState<QuantumXState>(quantumXEngine.getState());
  const [isPushActive, setIsPushActive] = useState(false);
  const [isPullActive, setIsPullActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = quantumXEngine.subscribe((newState) => {
      setState(newState);
    });

    // Get initial state
    setState(quantumXEngine.getState());

    return () => {
      unsubscribe();
    };
  }, []);

  const handlePush = () => {
    setIsPushActive(true);
    setTimeout(() => setIsPushActive(false), 300);

    quantumXEngine.push();

    toast({
      title: '🚀 PUSH ACTIVATED',
      description: 'High frequency mode - More signals incoming!',
      duration: 3000
    });
  };

  const handlePull = () => {
    setIsPullActive(true);
    setTimeout(() => setIsPullActive(false), 300);

    quantumXEngine.pull();

    toast({
      title: '🎯 PULL ACTIVATED',
      description: 'High quality mode - Only the best signals!',
      duration: 3000
    });
  };

  const handleAuto = () => {
    quantumXEngine.auto();

    toast({
      title: '🤖 AUTO MODE',
      description: 'QuantumX will adapt to market conditions automatically',
      duration: 3000
    });
  };

  const activeMode = state.mode === 'AUTO' ? state.autoDetectedMode : state.mode;
  const volatilityLevel = state.marketVolatility < 30 ? 'LOW' :
                         state.marketVolatility < 60 ? 'MEDIUM' : 'HIGH';

  // Compact version (just buttons)
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={handlePush}
          className={`relative p-3 rounded-full transition-all duration-300 ${
            activeMode === 'PUSH'
              ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
              : 'bg-slate-700 hover:bg-slate-600'
          } ${isPushActive ? 'scale-110' : ''}`}
        >
          <Rocket className={`w-5 h-5 ${activeMode === 'PUSH' ? 'text-white' : 'text-emerald-400'}`} />
          {activeMode === 'PUSH' && (
            <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
          )}
        </button>

        <div className="text-xs text-slate-400 font-bold uppercase">
          {state.mode === 'AUTO' ? 'AUTO' : activeMode}
        </div>

        <button
          onClick={handlePull}
          className={`relative p-3 rounded-full transition-all duration-300 ${
            activeMode === 'PULL'
              ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
              : 'bg-slate-700 hover:bg-slate-600'
          } ${isPullActive ? 'scale-110' : ''}`}
        >
          <Target className={`w-5 h-5 ${activeMode === 'PULL' ? 'text-white' : 'text-blue-400'}`} />
          {activeMode === 'PULL' && (
            <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
          )}
        </button>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="relative p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-all"
        >
          {menuOpen ? (
            <X className="w-5 h-5 text-orange-400" />
          ) : (
            <Menu className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>
    );
  }

  // Full version with hamburger menu
  return (
    <div className={`relative ${className}`}>
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 p-6">
        {/* Header with Hamburger */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">FLUX CONTROL CENTER</h3>
                <Badge className="bg-orange-500 text-white text-[10px] px-2">DEV</Badge>
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Intelligence Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Badge */}
            <Badge className={`px-3 py-1 ${
              state.mode === 'AUTO' ? 'bg-purple-500' :
              activeMode === 'PUSH' ? 'bg-emerald-500' : 'bg-blue-500'
            } text-white font-bold`}>
              {state.mode === 'AUTO' ? '🤖 AUTO' : activeMode === 'PUSH' ? '🚀 PUSH' : '🎯 PULL'}
            </Badge>

            {/* Hamburger Menu Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              className="border-slate-600 hover:border-orange-500 hover:bg-slate-800"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-orange-400" />
              ) : (
                <Menu className="w-5 h-5 text-slate-400" />
              )}
            </Button>
          </div>
        </div>

        {/* Main Controls - PUSH and PULL */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* PUSH Button */}
          <button
            onClick={handlePush}
            className={`relative group p-6 rounded-2xl border-3 transition-all duration-300 ${
              activeMode === 'PUSH'
                ? 'bg-emerald-500 border-emerald-400 shadow-2xl shadow-emerald-500/50'
                : 'bg-slate-800 border-slate-600 hover:border-emerald-500 hover:bg-slate-700'
            } ${isPushActive ? 'scale-105' : 'hover:scale-102'}`}
          >
            <div className="text-center">
              <Rocket className={`w-12 h-12 mx-auto mb-3 ${
                activeMode === 'PUSH' ? 'text-white' : 'text-emerald-400'
              }`} />
              <div className={`text-2xl font-black mb-1 ${
                activeMode === 'PUSH' ? 'text-white' : 'text-emerald-400'
              }`}>
                PUSH
              </div>
              <div className={`text-xs uppercase tracking-wide ${
                activeMode === 'PUSH' ? 'text-emerald-100' : 'text-slate-400'
              }`}>
                More Signals
              </div>
            </div>

            {/* Active indicator */}
            {activeMode === 'PUSH' && (
              <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-pulse" />
            )}
          </button>

          {/* PULL Button */}
          <button
            onClick={handlePull}
            className={`relative group p-6 rounded-2xl border-3 transition-all duration-300 ${
              activeMode === 'PULL'
                ? 'bg-blue-500 border-blue-400 shadow-2xl shadow-blue-500/50'
                : 'bg-slate-800 border-slate-600 hover:border-blue-500 hover:bg-slate-700'
            } ${isPullActive ? 'scale-105' : 'hover:scale-102'}`}
          >
            <div className="text-center">
              <Target className={`w-12 h-12 mx-auto mb-3 ${
                activeMode === 'PULL' ? 'text-white' : 'text-blue-400'
              }`} />
              <div className={`text-2xl font-black mb-1 ${
                activeMode === 'PULL' ? 'text-white' : 'text-blue-400'
              }`}>
                PULL
              </div>
              <div className={`text-xs uppercase tracking-wide ${
                activeMode === 'PULL' ? 'text-blue-100' : 'text-slate-400'
              }`}>
                Best Quality
              </div>
            </div>

            {/* Active indicator */}
            {activeMode === 'PULL' && (
              <div className="absolute inset-0 rounded-2xl bg-blue-400/20 animate-pulse" />
            )}
          </button>
        </div>

        {/* AUTO Mode Toggle */}
        <button
          onClick={handleAuto}
          className={`w-full p-3 rounded-xl border-2 transition-all ${
            state.mode === 'AUTO'
              ? 'bg-purple-500/20 border-purple-500 text-purple-300'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-purple-500'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-bold uppercase">
              {state.mode === 'AUTO' ? 'AUTO MODE ACTIVE' : 'Enable Auto Mode'}
            </span>
          </div>
        </button>

        {/* Stats */}
        {showStats && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            {/* Volatility */}
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <div className="text-xs text-slate-400 mb-1">Volatility</div>
              <div className={`text-lg font-bold ${
                volatilityLevel === 'LOW' ? 'text-emerald-400' :
                volatilityLevel === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {volatilityLevel}
              </div>
            </div>

            {/* Signals Delivered */}
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <div className="text-xs text-slate-400 mb-1">Signals</div>
              <div className="text-lg font-bold text-white">
                {state.arenaSignalsDelivered || 0}
              </div>
            </div>

            {/* Profitability */}
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <div className="text-xs text-slate-400 mb-1">Performance</div>
              <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
                state.arenaAgentProfitability >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {state.arenaAgentProfitability >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {state.arenaAgentProfitability >= 0 ? '+' : ''}{state.arenaAgentProfitability.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Mode Explanation */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400">
            {activeMode === 'PUSH' ? (
              <>
                <span className="text-emerald-400 font-bold">PUSH MODE:</span> High frequency signals for range-bound markets.
                More opportunities, mixed quality. Best when market is stable.
              </>
            ) : (
              <>
                <span className="text-blue-400 font-bold">PULL MODE:</span> Premium quality signals for volatile markets.
                Fewer signals, higher win rate. Best when market is unpredictable.
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Hamburger Menu Panel - Slides from right */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-gradient-to-br from-slate-900 to-slate-950 border-l-2 border-slate-700 shadow-2xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-orange-500" />
                  <h2 className="text-xl font-bold text-white">Intelligence Hub</h2>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-xs text-slate-400">QuantumX Control Center • Dev Tools</p>
            </div>

            {/* Menu Sections */}
            <div className="p-4 space-y-4">
              {/* System Controls Section */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-3">
                  System Controls
                </div>

                <button className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-lg transition-all group">
                  <Settings className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Signal Settings</div>
                    <div className="text-xs text-slate-400">Configure signal parameters</div>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-lg transition-all group">
                  <Database className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Database Sync</div>
                    <div className="text-xs text-slate-400">Manage signal database</div>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-lg transition-all group">
                  <Shield className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Risk Manager</div>
                    <div className="text-xs text-slate-400">Position & risk controls</div>
                  </div>
                </button>
              </div>

              {/* Monitoring Section */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-3">
                  Monitoring
                </div>

                <button className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-lg transition-all group">
                  <BarChart3 className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Analytics Dashboard</div>
                    <div className="text-xs text-slate-400">Performance metrics</div>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-lg transition-all group">
                  <Terminal className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">System Logs</div>
                    <div className="text-xs text-slate-400">Debug & diagnostics</div>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-lg transition-all group">
                  <Zap className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Live Activity Feed</div>
                    <div className="text-xs text-slate-400">Real-time events</div>
                  </div>
                </button>
              </div>

              {/* Dev Info */}
              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-orange-200">
                    <span className="font-bold block mb-1">Developer Mode</span>
                    <span className="text-orange-300/80">
                      Advanced controls for system management. Not intended for public use.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

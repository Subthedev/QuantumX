/**
 * QUANTUMX REMOTE - Simplified PUSH/PULL Controller
 *
 * A dead-simple 2-button controller for the Arena:
 * - PUSH: More signals, higher frequency (range-bound markets)
 * - PULL: Fewer signals, higher quality (volatile markets)
 *
 * Designed to be the "game controller" for Arena profitability
 * Now powered by QuantumX Engine for intelligent auto-adjustment
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Target,
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge
} from 'lucide-react';
import { quantumXEngine, type QuantumXState } from '@/services/quantumXEngine';
import { useToast } from '@/hooks/use-toast';

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
      </div>
    );
  }

  // Full version
  return (
    <Card className={`bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">QUANTUMX CONTROL</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Signal Mode</p>
          </div>
        </div>

        {/* Mode Badge */}
        <Badge className={`px-3 py-1 ${
          state.mode === 'AUTO' ? 'bg-purple-500' :
          activeMode === 'PUSH' ? 'bg-emerald-500' : 'bg-blue-500'
        } text-white font-bold`}>
          {state.mode === 'AUTO' ? '🤖 AUTO' : activeMode === 'PUSH' ? '🚀 PUSH' : '🎯 PULL'}
        </Badge>
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
  );
}

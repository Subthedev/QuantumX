/**
 * IGX INTELLIGENCE HUB - Clean Production Version
 * Displays intelligence signals with pipeline visualization
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Database,
  Brain,
  Target,
  CheckCircle2,
  Circle,
  Filter,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Signal {
  id: string;
  symbol: string;
  signal_type: string;
  direction?: string;
  entry_min: number;
  entry_max: number;
  current_price: number;
  confidence: number;
  status: string;
  created_at: string;
  expires_at: string;
  target_1?: number;
  target_2?: number;
  target_3?: number;
  stop_loss?: number;
  strength: string;
  timeframe: string;
  risk_level: string;
}

interface RejectedSignal {
  id: string;
  symbol: string;
  direction: string;
  rejection_stage: string;
  rejection_reason: string;
  created_at: string;
}

const CRYPTO_SYMBOLS = ['₿', 'Ξ', '◎', '♦', '●', '◆', '○', '▲'];

interface FlowingParticle {
  id: string;
  stage: number;
  progress: number;
  symbol: string;
  speed: number;
  color: string;
  size: 'sm' | 'md' | 'lg';
}

export default function IntelligenceHub() {
  const animationFrameRef = useRef<number>();
  const mountedRef = useRef(true);

  const [signals, setSignals] = useState<Signal[]>([]);
  const [rejectedSignals, setRejectedSignals] = useState<RejectedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSignal, setRecentSignal] = useState<Signal | null>(null);

  // Visual state
  const [flowingParticles, setFlowingParticles] = useState<FlowingParticle[]>([]);
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  // Activity pulses
  const [dataEngineActive, setDataEngineActive] = useState(false);
  const [alphaEngineActive, setAlphaEngineActive] = useState(false);
  const [betaEngineActive, setBetaEngineActive] = useState(false);
  const [gammaEngineActive, setGammaEngineActive] = useState(false);
  const [deltaEngineActive, setDeltaEngineActive] = useState(false);
  const [zetaEngineActive, setZetaEngineActive] = useState(false);

  // Fetch signals
  useEffect(() => {
    fetchSignals();
    fetchRejectedSignals();
    
    const interval = setInterval(() => {
      fetchSignals();
      fetchRejectedSignals();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSignals(data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching signals:', err);
      setLoading(false);
    }
  };

  const fetchRejectedSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('rejected_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRejectedSignals(data || []);
    } catch (err) {
      console.error('Error fetching rejected signals:', err);
    }
  };

  // Particle flow animation
  useEffect(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const sizes: ('sm' | 'md' | 'lg')[] = ['sm', 'sm', 'md'];
    const SPAWN_RATES = [0.9, 0.7, 0.5, 0.35, 0.2, 0.08];

    const animate = () => {
      setFlowingParticles(prev => {
        const particles = [...prev];

        for (let stage = 0; stage <= 5; stage++) {
          const spawnRate = SPAWN_RATES[stage];
          const maxParticlesPerStage = 12;
          const currentStageCount = particles.filter(p => p.stage === stage).length;

          if (Math.random() < spawnRate && currentStageCount < maxParticlesPerStage && particles.length < 80) {
            particles.push({
              id: `p${Date.now()}${Math.random()}`,
              stage: stage,
              progress: 0,
              symbol: CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)],
              speed: 2.0 + Math.random() * 2.0,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: sizes[Math.floor(Math.random() * sizes.length)]
            });
          }
        }

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

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Activity pulses
  useEffect(() => {
    const pulse = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      setter(true);
      setTimeout(() => setter(false), 300);
    };

    const interval = setInterval(() => {
      const engines = [setAlphaEngineActive, setBetaEngineActive];
      const randomEngine = engines[Math.floor(Math.random() * engines.length)];
      if (Math.random() < 0.3) {
        pulse(randomEngine);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStagePos = (stage: number): string => {
    const positions = ['6%', '21%', '36%', '51%', '66%', '81%'];
    return positions[Math.min(stage, 5)] || '6%';
  };

  const getParticleSize = (size: string) => {
    if (size === 'lg') return 'text-base';
    if (size === 'md') return 'text-sm';
    return 'text-xs';
  };

  const fmt = (num: number) => num.toLocaleString();
  const fmtDec = (num: number) => num.toFixed(1);

  const timeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const toggleEngine = (engineName: string) => {
    setExpandedEngine(expandedEngine === engineName ? null : engineName);
  };

  const alphaRejected = rejectedSignals.filter(r => r.rejection_stage === 'ALPHA').length;
  const betaRejected = rejectedSignals.filter(r => r.rejection_stage === 'BETA').length;
  const gammaRejected = rejectedSignals.filter(r => r.rejection_stage === 'GAMMA').length;
  const deltaRejected = rejectedSignals.filter(r => r.rejection_stage === 'DELTA').length;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-medium text-slate-900 tracking-tight mb-2">
                Intelligence Hub
              </h1>
              <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs font-semibold text-emerald-700">
                  <Circle className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Live 24/7
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold">{signals.length}</span> Active Signals
                <span className="text-slate-300">•</span>
                <span className="font-semibold">{rejectedSignals.length}</span> Analyzed Today
              </p>
            </div>
          </div>
        </div>

        {/* PIPELINE VISUALIZATION */}
        <Card className="mb-6 border-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          
          <div className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Real-Time Intelligence Pipeline</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg backdrop-blur">
                  <Circle className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                  <span className="text-xs font-bold text-emerald-300">LIVE 24/7</span>
                </div>
              </div>
            </div>

            {/* Pipeline Flow */}
            <div className="relative h-40 bg-gradient-to-r from-slate-50 via-slate-50/50 to-slate-50 rounded-xl border border-slate-100 overflow-hidden">
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

              {/* Data Engine */}
              <div className="absolute left-[6%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('data')}
                  className={`relative transition-all duration-200 ${dataEngineActive ? 'scale-110' : ''} ${expandedEngine === 'data' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    dataEngineActive ? 'bg-blue-500 border-2 border-blue-400' : expandedEngine === 'data' ? 'bg-blue-100 border-2 border-blue-300' : 'bg-white border-2 border-blue-200'
                  }`}>
                    <Database className={`w-6 h-6 transition-colors ${dataEngineActive ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Data</div>
                  </div>
                </button>
              </div>

              {/* Alpha Engine */}
              <div className="absolute left-[21%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('alpha')}
                  className={`relative transition-all duration-200 ${alphaEngineActive ? 'scale-110' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    alphaEngineActive ? 'bg-blue-500 border-2 border-blue-400' : 'bg-white border-2 border-violet-200'
                  }`}>
                    <Brain className={`w-6 h-6 transition-colors ${alphaEngineActive ? 'text-white' : 'text-violet-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Alpha</div>
                  </div>
                </button>
              </div>

              {/* Beta Engine */}
              <div className="absolute left-[36%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('beta')}
                  className={`relative transition-all duration-200 ${betaEngineActive ? 'scale-110' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    betaEngineActive ? 'bg-blue-500 border-2 border-blue-400' : 'bg-white border-2 border-amber-200'
                  }`}>
                    <Target className={`w-6 h-6 transition-colors ${betaEngineActive ? 'text-white' : 'text-amber-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Beta</div>
                  </div>
                </button>
              </div>

              {/* Gamma Engine */}
              <div className="absolute left-[51%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('gamma')}
                  className={`relative transition-all duration-200 ${gammaEngineActive ? 'scale-110' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    gammaEngineActive ? 'bg-amber-500 border-2 border-amber-400' : 'bg-white border-2 border-amber-200'
                  }`}>
                    <CheckCircle2 className={`w-6 h-6 transition-colors ${gammaEngineActive ? 'text-white' : 'text-amber-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Gamma</div>
                  </div>
                </button>
              </div>

              {/* Delta Filter */}
              <div className="absolute left-[66%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('delta')}
                  className={`relative transition-all duration-200 ${deltaEngineActive ? 'scale-110' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    deltaEngineActive ? 'bg-emerald-500 border-2 border-emerald-400' : 'bg-white border-2 border-emerald-200'
                  }`}>
                    <Filter className={`w-6 h-6 transition-colors ${deltaEngineActive ? 'text-white' : 'text-emerald-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Delta</div>
                  </div>
                </button>
              </div>

              {/* Zeta Learning */}
              <div className="absolute left-[81%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('zeta')}
                  className={`relative transition-all duration-200 ${zetaEngineActive ? 'scale-110' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    zetaEngineActive ? 'bg-violet-500 border-2 border-violet-400' : 'bg-white border-2 border-violet-200'
                  }`}>
                    <Brain className={`w-6 h-6 transition-colors ${zetaEngineActive ? 'text-white' : 'text-violet-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Zeta</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-4 mt-12 pt-6 border-t border-slate-100">
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Active Signals</div>
                <div className="text-xl font-semibold text-blue-600">{signals.length}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Alpha Rejected</div>
                <div className="text-xl font-semibold text-violet-600">{alphaRejected}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Beta Rejected</div>
                <div className="text-xl font-semibold text-amber-600">{betaRejected}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Delta Filtered</div>
                <div className="text-xl font-semibold text-emerald-600">{deltaRejected}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Engine Details - Data */}
        {expandedEngine === 'data' && (
          <Card className="mb-6 border border-blue-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-800">Data Engine</h2>
                  <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700">
                    Live Data Ingestion
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Continuously ingests real-time ticker data from exchanges, building comprehensive market snapshots.
              </p>
            </div>
          </Card>
        )}

        {/* Engine Details - Alpha */}
        {expandedEngine === 'alpha' && (
          <Card className="mb-6 border border-violet-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-violet-600" />
                  <h2 className="text-base font-semibold text-slate-800">Alpha Engine</h2>
                  <Badge className="bg-violet-50 text-violet-700 border-violet-200">Pattern Detection</Badge>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Analyzes market data using multiple strategies to detect tradeable patterns and setups. {alphaRejected} signals rejected at this stage.
              </p>
            </div>
          </Card>
        )}

        {/* Live Signals */}
        <Card className="mb-6 border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800">Live Signals</h2>
                {recentSignal && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse">NEW</Badge>
                )}
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">Real-Time</Badge>
              </div>
              <div className="text-sm text-slate-600 font-medium">{signals.length} Active</div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300 animate-spin" />
                <p className="text-sm text-slate-600 font-medium">Loading signals...</p>
              </div>
            ) : signals.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300 animate-pulse" />
                <p className="text-sm text-slate-600 font-medium">Generating signals...</p>
                <p className="text-xs text-slate-500 mt-1">Next signal coming soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signals.map(sig => {
                  const timeRemaining = new Date(sig.expires_at).getTime() - Date.now();
                  const minutesRemaining = Math.floor(timeRemaining / 60000);
                  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);
                  const isExpiringSoon = minutesRemaining < 5;

                  return (
                    <div
                      key={sig.id}
                      className="p-4 rounded-lg border bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {sig.direction && (
                            <div className={`px-4 py-2 rounded-md text-sm font-bold border-2 ${
                              sig.direction === 'LONG'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}>
                              {sig.direction}
                            </div>
                          )}
                          <div>
                            <div className="text-lg font-bold text-slate-900">{sig.symbol}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{sig.signal_type}</Badge>
                              <span className="text-slate-300">•</span>
                              <div className="text-xs text-slate-600 font-medium">{timeAgo(sig.created_at)}</div>
                            </div>
                          </div>
                        </div>

                        {timeRemaining > 0 && (
                          <div className={`px-3 py-1.5 rounded-md border-2 ${
                            isExpiringSoon
                              ? 'bg-rose-100 border-rose-300 text-rose-700'
                              : 'bg-blue-100 border-blue-300 text-blue-700'
                          }`}>
                            <div className="text-[10px] font-semibold uppercase">Expires In</div>
                            <div className="text-sm font-bold">{minutesRemaining}m {secondsRemaining}s</div>
                          </div>
                        )}
                      </div>

                      {/* Trading Levels */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="p-2 bg-slate-50 rounded border border-slate-200">
                          <div className="text-[10px] text-slate-600 font-semibold uppercase mb-0.5">Entry</div>
                          <div className="text-sm font-bold text-slate-900">
                            ${sig.entry_min.toFixed(2)} - ${sig.entry_max.toFixed(2)}
                          </div>
                        </div>
                        {sig.stop_loss && (
                          <div className="p-2 bg-rose-50 rounded border border-rose-200">
                            <div className="text-[10px] text-rose-600 font-semibold uppercase mb-0.5">Stop Loss</div>
                            <div className="text-sm font-bold text-rose-700">${sig.stop_loss.toFixed(2)}</div>
                          </div>
                        )}
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="text-[10px] text-blue-600 font-semibold uppercase mb-0.5">Current</div>
                          <div className="text-sm font-bold text-blue-700">${sig.current_price.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                          <div className="text-[10px] text-emerald-600 font-semibold uppercase mb-0.5">Confidence</div>
                          <div className="text-sm font-bold text-emerald-700">{sig.confidence}%</div>
                        </div>
                      </div>

                      {/* Targets */}
                      {(sig.target_1 || sig.target_2 || sig.target_3) && (
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-600 font-semibold uppercase">Targets:</div>
                          {sig.target_1 && (
                            <div className="px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                              <span className="text-[10px] text-emerald-600 font-semibold">T1:</span>
                              <span className="text-xs font-bold text-emerald-700 ml-1">${sig.target_1.toFixed(2)}</span>
                            </div>
                          )}
                          {sig.target_2 && (
                            <div className="px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                              <span className="text-[10px] text-emerald-600 font-semibold">T2:</span>
                              <span className="text-xs font-bold text-emerald-700 ml-1">${sig.target_2.toFixed(2)}</span>
                            </div>
                          )}
                          {sig.target_3 && (
                            <div className="px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                              <span className="text-[10px] text-emerald-600 font-semibold">T3:</span>
                              <span className="text-xs font-bold text-emerald-700 ml-1">${sig.target_3.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Rejected Signals */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800">Quality Filter (Recent Rejections)</h2>
                <Badge variant="outline">{rejectedSignals.length} Today</Badge>
              </div>
            </div>

            {rejectedSignals.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No rejected signals yet
              </div>
            ) : (
              <div className="space-y-2">
                {rejectedSignals.slice(0, 10).map(rej => (
                  <div key={rej.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-slate-900">{rej.symbol}</div>
                        <Badge variant="outline" className="text-xs">{rej.rejection_stage}</Badge>
                        {rej.direction && (
                          <Badge className={rej.direction === 'LONG' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                            {rej.direction}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{timeAgo(rej.created_at)}</div>
                    </div>
                    <div className="text-xs text-slate-600 mt-2">{rej.rejection_reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

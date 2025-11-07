/**
 * IGX INTELLIGENCE HUB - Final Production Polish
 *
 * Autonomous 24/7 operation with minimal, elegant design
 * Collapsible engine metrics, smooth animations, buttery performance
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import {
  Activity,
  Database,
  Brain,
  Target,
  CheckCircle2,
  Circle,
  Filter,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle
} from 'lucide-react';

// Global Hub Service (runs in background)
import { globalHubService, HubMetrics, HubSignal } from '@/services/globalHubService';
import { zetaLearningEngine, ZetaMetrics } from '@/services/zetaLearningEngine';
import { supabase } from '@/integrations/supabase/client';

// Rejected Signal Type
interface RejectedSignal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  rejection_stage: 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
  rejection_reason: string;
  quality_score?: number;
  confidence_score?: number;
  data_quality?: number;
  strategy_votes?: any[];
  created_at: string;
}

// ML-based priority classification
function classifyRejectionPriority(signal: RejectedSignal): 'CRITICAL' | 'IMPORTANT' | 'NOISE' {
  const quality = signal.quality_score || 0;
  const confidence = signal.confidence_score || 0;
  
  // CRITICAL: High quality but rejected
  if (quality >= 70 && confidence >= 65) return 'CRITICAL';
  if (signal.rejection_stage === 'DELTA' && quality >= 60) return 'CRITICAL';
  
  // NOISE: Low quality, expected
  if (quality < 40 && confidence < 50) return 'NOISE';
  if (signal.rejection_stage === 'ALPHA' && quality < 30) return 'NOISE';
  
  return 'IMPORTANT';
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
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // State from global service
  const [metrics, setMetrics] = useState<HubMetrics>(globalHubService.getMetrics());
  const [activeSignals, setActiveSignals] = useState<HubSignal[]>(globalHubService.getActiveSignals());
  const signalHistory = globalHubService.getSignalHistory();
  const [zetaMetrics, setZetaMetrics] = useState<ZetaMetrics>(zetaLearningEngine.getMetrics());

  // Visual state
  const [flowingParticles, setFlowingParticles] = useState<FlowingParticle[]>([]);
  const [recentSignal, setRecentSignal] = useState<HubSignal | null>(null);

  // Expanded engine states
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  // Rejected Signals State
  const [rejectedSignals, setRejectedSignals] = useState<RejectedSignal[]>([]);
  const [rejectedFilter, setRejectedFilter] = useState<'ALL' | 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA'>('ALL');

  // Activity pulses (subtle)
  const [dataEngineActive, setDataEngineActive] = useState(false);
  const [alphaEngineActive, setAlphaEngineActive] = useState(false);
  const [betaEngineActive, setBetaEngineActive] = useState(false);
  const [gammaEngineActive, setGammaEngineActive] = useState(false);
  const [deltaEngineActive, setDeltaEngineActive] = useState(false);
  const [zetaEngineActive, setZetaEngineActive] = useState(false);

  // ===== CONNECT TO GLOBAL SERVICE =====
  useEffect(() => {
    mountedRef.current = true;
    console.log('[Hub UI] Connecting to global service...');

    // ✅ CRITICAL FIX: Properly handle async start() method
    const initializeService = async () => {
      // Ensure service is running
      if (!globalHubService.isRunning()) {
        console.log('[Hub UI] Starting global service...');
        await globalHubService.start(); // ✅ AWAIT the async start method
        console.log('[Hub UI] ✅ Global service started successfully');
      } else {
        console.log('[Hub UI] Service already running (auto-started)');
      }

      // ✅ CRITICAL: ALWAYS load initial state (even if service was already running)
      // This fixes the race condition where service auto-starts before UI mounts
      console.log('[Hub UI] 📥 Loading initial state from service...');
      const initialMetrics = globalHubService.getMetrics();
      const initialSignals = globalHubService.getActiveSignals();
      const initialZetaMetrics = zetaLearningEngine.getMetrics();

      console.log('[Hub UI] 📊 Initial metrics loaded:', initialMetrics);
      console.log('[Hub UI] 🔔 Initial active signals loaded:', initialSignals.length);
      console.log('[Hub UI] 🧠 Initial Zeta metrics loaded:', initialZetaMetrics);

      setMetrics(initialMetrics);
      setActiveSignals(initialSignals);
      setZetaMetrics(initialZetaMetrics);
    };

    // Subscribe to updates
    const handleMetricsUpdate = (newMetrics: HubMetrics) => {
      if (!mountedRef.current) return;
      setMetrics(newMetrics);

      // Trigger visual feedback with color
      setDataEngineActive(true);
      setTimeout(() => setDataEngineActive(false), 200);
    };

    const handleSignalLive = (signals: HubSignal[]) => {
      if (!mountedRef.current) return;
      setActiveSignals(signals);
    };

    const handleSignalNew = (signal: HubSignal) => {
      if (!mountedRef.current) return;
      console.log('[Hub UI] New signal:', signal.symbol, signal.direction);

      // Show recent signal highlight
      setRecentSignal(signal);
      setTimeout(() => setRecentSignal(null), 3000);

      // Pipeline pulses: Gamma (assembly) → Delta (filtering) → signal emitted
      setGammaEngineActive(true);
      setTimeout(() => setGammaEngineActive(false), 400);

      // Delta pulse (signal passed quality filter)
      setTimeout(() => {
        setDeltaEngineActive(true);
        setTimeout(() => setDeltaEngineActive(false), 400);
      }, 200);
    };

    const handleSignalOutcome = ({ outcome }: { signalId: string; outcome: 'WIN' | 'LOSS' }) => {
      if (!mountedRef.current) return;
      console.log('[Hub UI] Signal outcome:', outcome);

      // Zeta pulse (learning from outcome)
      setZetaEngineActive(true);
      setTimeout(() => setZetaEngineActive(false), 400);
    };

    const handleZetaMetricsUpdate = (newMetrics: ZetaMetrics) => {
      if (!mountedRef.current) return;
      console.log('[Hub UI] 🧠 Zeta metrics update received:', newMetrics);
      setZetaMetrics(newMetrics);
    };

    // Listen to events
    globalHubService.on('metrics:update', handleMetricsUpdate);
    globalHubService.on('signal:live', handleSignalLive);
    globalHubService.on('signal:new', handleSignalNew);
    globalHubService.on('signal:outcome', handleSignalOutcome);
    zetaLearningEngine.on('metrics:update', handleZetaMetricsUpdate);

    // Call the async initialization (after event listeners are set up)
    initializeService()
      .then(() => {
        console.log('[Hub UI] 🎯 Initialization complete - Setting up polling and animations...');
        console.log('[Hub UI] 📊 Service running:', globalHubService.isRunning());
        console.log('[Hub UI] 📊 Initial metrics:', globalHubService.getMetrics());
        console.log('[Hub UI] 🔔 Initial active signals:', globalHubService.getActiveSignals().length);

        // ✅ CRITICAL: Poll metrics every second for real-time updates (AFTER initialization)
        metricsIntervalRef.current = setInterval(() => {
          if (!mountedRef.current) return;

          const currentMetrics = globalHubService.getMetrics();
          const currentSignals = globalHubService.getActiveSignals();
          const currentZetaMetrics = zetaLearningEngine.getMetrics();

          // Log every 10 seconds to avoid spam
          if (Date.now() % 10000 < 1000) {
            console.log('[Hub UI] 🔄 Polling update - Signals:', currentSignals.length, 'Zeta totalOutcomes:', currentZetaMetrics.totalOutcomes);
          }

          setMetrics(currentMetrics);
          setActiveSignals(currentSignals);
          setZetaMetrics(currentZetaMetrics);

          // ✅ Fetch rejected signals every second for real-time transparency
          fetchRejectedSignals();
        }, 1000);

        // Start animations
        startParticleFlow();
        startActivityPulses();

        console.log('[Hub UI] ✅ Connected to global service - All systems operational');
      })
      .catch((error) => {
        console.error('[Hub UI] ❌ CRITICAL: Failed to initialize service:', error);
        console.error('[Hub UI] Stack trace:', error.stack);
      });

    return () => {
      mountedRef.current = false;
      globalHubService.off('metrics:update', handleMetricsUpdate);
      globalHubService.off('signal:live', handleSignalLive);
      globalHubService.off('signal:new', handleSignalNew);
      globalHubService.off('signal:outcome', handleSignalOutcome);
      zetaLearningEngine.off('metrics:update', handleZetaMetricsUpdate);

      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      console.log('[Hub UI] Disconnected from global service');
    };
  }, []);

  // ===== CONTINUOUS PARTICLE FLOW (24/7) WITH FILTERING FUNNEL =====
  const startParticleFlow = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const sizes: ('sm' | 'md' | 'lg')[] = ['sm', 'sm', 'md'];

    // ✅ SMOOTHER SPAWN RATES - More continuous 24/7 flow with better visual consistency
    // Increased spawn rates for smoother, more continuous particle flow
    const SPAWN_RATES = [
      0.9,  // Stage 0 (Data): 90% - High density (raw data ingestion) - INCREASED for continuous flow
      0.7,  // Stage 1 (Alpha): 70% - Pattern filtering reduces flow - INCREASED
      0.5,  // Stage 2 (Beta): 50% - Scoring reduces further - INCREASED
      0.35, // Stage 3 (Gamma): 35% - Assembly filters more - INCREASED
      0.2,  // Stage 4 (Delta): 20% - ML filter (CRITICAL GATE) - INCREASED
      0.08  // Stage 5 (Zeta): 8% - Learning from passed signals - INCREASED
    ];

    const animate = () => {
      setFlowingParticles(prev => {
        const particles = [...prev];

        // ✅ SPAWN PARTICLES AT EACH STAGE based on filtering logic
        // This creates the visual funnel effect showing data reduction
        for (let stage = 0; stage <= 5; stage++) {
          const spawnRate = SPAWN_RATES[stage];
          const maxParticlesPerStage = 12; // INCREASED for smoother continuous flow
          const currentStageCount = particles.filter(p => p.stage === stage).length;

          // Spawn if: random chance < spawn rate AND not too many particles AND total particles < 80 (INCREASED)
          if (Math.random() < spawnRate && currentStageCount < maxParticlesPerStage && particles.length < 80) {
            // ✅ CONDITIONAL ZETA PARTICLES - Only spawn when Delta has passed signals
            // Zeta only learns from Delta-approved signals, so particles should reflect this
            if (stage === 5) {
              // Only spawn Zeta particles if Delta has processed and passed some signals
              const deltaPassRate = metrics.deltaPassed && metrics.deltaProcessed
                ? metrics.deltaPassed / metrics.deltaProcessed
                : 0;

              // Skip Zeta particle if Delta hasn't passed any signals yet
              if (deltaPassRate === 0 || metrics.deltaPassed === 0) {
                continue;
              }
            }

            particles.push({
              id: `p${Date.now()}${Math.random()}`,
              stage: stage,
              progress: 0,
              symbol: CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)],
              speed: 2.0 + Math.random() * 2.0, // SMOOTHER: Slightly faster, tighter range for more consistent flow
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
              // Particle reached end of current stage
              if (p.stage < 5) {
                // Move to next stage with filtering probability
                const nextStage = p.stage + 1;
                const passRate = SPAWN_RATES[nextStage] / SPAWN_RATES[p.stage];

                // Filtering: particle may not pass to next stage
                if (Math.random() < passRate) {
                  return { ...p, stage: nextStage, progress: 0 };
                }
                // Filtered out - remove particle
                return null;
              }
              // Reached end of Zeta (final stage) - remove
              return null;
            }
            return { ...p, progress: newProgress };
          })
          .filter((p): p is FlowingParticle => p !== null);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  // ===== ACTIVITY PULSES =====
  const startActivityPulses = () => {
    const pulse = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      setter(true);
      setTimeout(() => setter(false), 300);
    };

    const interval = setInterval(() => {
      if (!mountedRef.current) return;

      // Random engine pulses for "alive" feel
      const engines = [setAlphaEngineActive, setBetaEngineActive];
      const randomEngine = engines[Math.floor(Math.random() * engines.length)];

      if (Math.random() < 0.3) {
        pulse(randomEngine);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  // ===== FETCH REJECTED SIGNALS =====
  const fetchRejectedSignals = async () => {
    try {
      const { data, error} = await supabase
        .from('rejected_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // ✅ Professional quant-firm level: Track all rejections for analysis (increased from 100)

      if (error) {
        console.error('[Hub UI] Error fetching rejected signals:', error);
        return;
      }

      if (data) {
        setRejectedSignals(data);
      }
    } catch (err) {
      console.error('[Hub UI] Error fetching rejected signals:', err);
    }
  };

  // ===== HELPER FUNCTIONS =====
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

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Toggle engine expansion
  const toggleEngine = (engineName: string) => {
    setExpandedEngine(expandedEngine === engineName ? null : engineName);
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        {/* HEADER - Clean and professional */}
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
                <span className="font-semibold">{fmt(metrics.totalTickers)}</span> Tickers
                <span className="text-slate-300">•</span>
                <span className="font-semibold">{fmt(metrics.totalAnalyses)}</span> Analyses
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium mb-1">Uptime</div>
                <div className="text-base font-semibold text-slate-900">{formatUptime(metrics.uptime)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium mb-1">Win Rate</div>
                <div className="text-base font-semibold text-emerald-600">{fmtDec(metrics.winRate)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* PIPELINE - Clean flow without overlapping pipes */}
        <Card className="mb-6 border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800">Real-Time Pipeline</h2>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs font-semibold text-emerald-700">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>Active</span>
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">{fmt(metrics.totalSignals)} Total Signals</div>
            </div>

            {/* Pipeline Visualization - Clean minimal design */}
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

              {/* Engine Nodes - Clickable for details */}

              {/* Data Engine (Clickable) */}
              <div className="absolute left-[6%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('data')}
                  className={`relative transition-all duration-200 ${dataEngineActive ? 'scale-110' : ''} ${expandedEngine === 'data' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    dataEngineActive
                      ? 'bg-blue-500 border-2 border-blue-400'
                      : expandedEngine === 'data'
                      ? 'bg-blue-100 border-2 border-blue-300'
                      : 'bg-white border-2 border-blue-200'
                  }`}>
                    <Database className={`w-6 h-6 transition-colors ${dataEngineActive ? 'text-white' : expandedEngine === 'data' ? 'text-blue-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Data</div>
                  </div>
                </button>
              </div>

              {/* Alpha Engine (Clickable) */}
              <div className="absolute left-[21%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('alpha')}
                  className={`relative transition-all duration-200 ${alphaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'alpha' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    alphaEngineActive
                      ? 'bg-blue-500 border-2 border-blue-400'
                      : expandedEngine === 'alpha'
                      ? 'bg-violet-100 border-2 border-violet-300'
                      : 'bg-white border-2 border-violet-200'
                  }`}>
                    <Brain className={`w-6 h-6 transition-colors ${alphaEngineActive ? 'text-white' : expandedEngine === 'alpha' ? 'text-violet-600' : 'text-violet-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Alpha</div>
                  </div>
                </button>
              </div>

              {/* Beta Engine (Clickable) */}
              <div className="absolute left-[36%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('beta')}
                  className={`relative transition-all duration-200 ${betaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'beta' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    betaEngineActive
                      ? 'bg-blue-500 border-2 border-blue-400'
                      : expandedEngine === 'beta'
                      ? 'bg-amber-100 border-2 border-amber-300'
                      : 'bg-white border-2 border-amber-200'
                  }`}>
                    <Target className={`w-6 h-6 transition-colors ${betaEngineActive ? 'text-white' : expandedEngine === 'beta' ? 'text-amber-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Beta</div>
                  </div>
                </button>
              </div>

              {/* Gamma Engine (Clickable) */}
              <div className="absolute left-[51%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('gamma')}
                  className={`relative transition-all duration-200 ${gammaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'gamma' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    gammaEngineActive
                      ? 'bg-amber-500 border-2 border-amber-400'
                      : expandedEngine === 'gamma'
                      ? 'bg-rose-100 border-2 border-rose-300'
                      : 'bg-white border-2 border-amber-200'
                  }`}>
                    <CheckCircle2 className={`w-6 h-6 transition-colors ${gammaEngineActive ? 'text-white' : expandedEngine === 'gamma' ? 'text-rose-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Gamma</div>
                  </div>
                </button>
              </div>

              {/* Delta V2 - Quality Filter (Clickable) */}
              <div className="absolute left-[66%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('delta')}
                  className={`relative transition-all duration-200 ${deltaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'delta' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    deltaEngineActive
                      ? 'bg-emerald-500 border-2 border-emerald-400'
                      : expandedEngine === 'delta'
                      ? 'bg-emerald-100 border-2 border-emerald-300'
                      : 'bg-white border-2 border-emerald-200'
                  }`}>
                    <Filter className={`w-6 h-6 transition-colors ${deltaEngineActive ? 'text-white' : 'text-emerald-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Delta</div>
                  </div>
                </button>
              </div>

              {/* Zeta - Learning Engine (Clickable) */}
              <div className="absolute left-[81%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('zeta')}
                  className={`relative transition-all duration-200 ${zetaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'zeta' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    zetaEngineActive
                      ? 'bg-violet-500 border-2 border-violet-400'
                      : expandedEngine === 'zeta'
                      ? 'bg-violet-100 border-2 border-violet-300'
                      : 'bg-white border-2 border-violet-200'
                  }`}>
                    <Brain className={`w-6 h-6 transition-colors ${zetaEngineActive ? 'text-white' : 'text-violet-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Zeta</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Metrics Row - Minimal */}
            <div className="grid grid-cols-4 gap-4 mt-12 pt-6 border-t border-slate-100">
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Tickers</div>
                <div className="text-xl font-semibold text-blue-600">{fmt(metrics.totalTickers)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Analyses</div>
                <div className="text-xl font-semibold text-blue-600">{fmt(metrics.totalAnalyses)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Strategies</div>
                <div className="text-xl font-semibold text-blue-600">{metrics.strategiesActive}/10</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Approval</div>
                <div className="text-xl font-semibold text-amber-600">{fmtDec(metrics.approvalRate)}%</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Engine Details - Collapsible */}
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

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Continuously ingests real-time ticker data from exchanges, building comprehensive market snapshots.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Tickers Fetched</div>
                  <div className="text-xl font-semibold text-blue-700">{fmt(metrics.dataTickersFetched || 0)}</div>
                </div>
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">Data Points</div>
                  <div className="text-xl font-semibold text-violet-700">{fmt(metrics.dataPointsCollected || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Refresh Rate</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmtDec(metrics.dataRefreshRate || 0)}/min</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Last Fetch</div>
                  <div className="text-sm font-semibold text-slate-700">
                    {metrics.dataLastFetch ? timeAgo(metrics.dataLastFetch) : 'Never'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Alpha Engine Details - Collapsible */}
        {expandedEngine === 'alpha' && (
          <Card className="mb-6 border border-violet-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-violet-600" />
                  <h2 className="text-base font-semibold text-slate-800">Alpha Engine</h2>
                  <div className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded text-xs font-medium text-violet-700">
                    Pattern Detection
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Analyzes market data using {metrics.alphaStrategiesActive || 8} real strategies to detect tradeable patterns and setups.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">Patterns Detected</div>
                  <div className="text-xl font-semibold text-violet-700">{fmt(metrics.alphaPatternsDetected || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Signals Generated</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.alphaSignalsGenerated || 0)}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Active Strategies</div>
                  <div className="text-xl font-semibold text-blue-700">{metrics.alphaStrategiesActive || 0}/10</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Detection Rate</div>
                  <div className="text-xl font-semibold text-amber-700">{fmtDec(metrics.alphaDetectionRate || 0)}/min</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Beta Engine Details - Collapsible */}
        {expandedEngine === 'beta' && (
          <Card className="mb-6 border border-amber-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-semibold text-slate-800">Beta Engine</h2>
                  <div className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                    Scoring & Ranking
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Evaluates and scores all Alpha signals, ranking them by confidence and quality metrics.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Signals Scored</div>
                  <div className="text-xl font-semibold text-slate-800">{fmt(metrics.betaSignalsScored || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">High Quality</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.betaHighQuality || 0)}</div>
                  <div className="text-xs text-slate-500 mt-1">&gt;80%</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Medium Quality</div>
                  <div className="text-xl font-semibold text-blue-700">{fmt(metrics.betaMediumQuality || 0)}</div>
                  <div className="text-xs text-slate-500 mt-1">60-80%</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Low Quality</div>
                  <div className="text-xl font-semibold text-amber-700">{fmt(metrics.betaLowQuality || 0)}</div>
                  <div className="text-xs text-slate-500 mt-1">&lt;60%</div>
                </div>
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">Avg Confidence</div>
                  <div className="text-xl font-semibold text-violet-700">{fmtDec(metrics.betaAvgConfidence || 0)}%</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Gamma Engine Details - Collapsible */}
        {expandedEngine === 'gamma' && (
          <Card className="mb-6 border border-rose-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-rose-600" />
                  <h2 className="text-base font-semibold text-slate-800">Gamma Engine</h2>
                  <div className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded text-xs font-medium text-rose-700">
                    Signal Assembly
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Assembles complete signal packages from scored data, preparing them for final quality filtering.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Received</div>
                  <div className="text-xl font-semibold text-slate-800">{fmt(metrics.gammaSignalsReceived || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Passed</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.gammaSignalsPassed || 0)}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded border border-rose-100 hover:border-rose-200 transition-colors">
                  <div className="text-xs text-rose-600 mb-1.5 font-medium">Rejected</div>
                  <div className="text-xl font-semibold text-rose-700">{fmt(metrics.gammaSignalsRejected || 0)}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Pass Rate</div>
                  <div className="text-xl font-semibold text-blue-700">{fmtDec(metrics.gammaPassRate || 0)}%</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Queue Size</div>
                  <div className="text-xl font-semibold text-amber-700">{fmt(metrics.gammaQueueSize || 0)}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Delta V2 Engine Details - Collapsible */}
        {expandedEngine === 'delta' && (
          <Card className="mb-6 border border-emerald-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-semibold text-slate-800">Delta V2 Quality Engine</h2>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700">
                      ML Active
                    </div>
                    <div className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-medium text-emerald-700">
                      Regime-Aware
                    </div>
                    {metrics.currentRegime && (
                      <div className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded text-xs font-medium text-violet-700">
                        {metrics.currentRegime}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  ML-powered quality filter with regime-aware thresholds. SIDEWAYS/LOW_VOL: Accepts quality ≥50 (MEDIUM). TRENDING/HIGH_VOL: Requires quality ≥60 (HIGH only).
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Processed</div>
                  <div className="text-xl font-semibold text-slate-800">{fmt(metrics.deltaProcessed || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Passed</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.deltaPassed || 0)}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded border border-rose-100 hover:border-rose-200 transition-colors">
                  <div className="text-xs text-rose-600 mb-1.5 font-medium">Rejected</div>
                  <div className="text-xl font-semibold text-rose-700">{fmt(metrics.deltaRejected || 0)}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Pass Rate</div>
                  <div className="text-xl font-semibold text-blue-700">{fmtDec(metrics.deltaPassRate || 0)}%</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Avg Quality</div>
                  <div className="text-xl font-semibold text-amber-700">{fmtDec(metrics.deltaQualityScore || 0)}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Zeta Learning Engine Details - Collapsible */}
        {expandedEngine === 'zeta' && (
          <Card className="mb-6 border border-violet-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-violet-600" />
                  <h2 className="text-base font-semibold text-slate-800">Zeta Learning Engine</h2>
                  <div className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded text-xs font-medium text-violet-700">
                    Learning Active
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Continuous Learning: Trains ML models from real outcomes, adapts strategy weights, optimizes thresholds.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">ML Accuracy</div>
                  <div className="text-xl font-semibold text-violet-700">{zetaMetrics.mlAccuracy.toFixed(1)}%</div>
                  <div className="text-xs text-slate-500 mt-1">{zetaMetrics.trainingCount} trainings</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Top Strategy</div>
                  <div className="text-sm font-semibold text-emerald-700 truncate">{zetaMetrics.topStrategy}</div>
                  <div className="text-xs text-slate-500 mt-1">{zetaMetrics.totalOutcomes} outcomes</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">System Health</div>
                  <div className="text-sm font-semibold text-slate-700">{zetaMetrics.health}</div>
                  <div className={`text-xs mt-1 font-medium ${
                    zetaMetrics.health === 'OPTIMAL' ? 'text-emerald-600' :
                    zetaMetrics.health === 'GOOD' ? 'text-blue-600' :
                    zetaMetrics.health === 'FAIR' ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>
                    {zetaMetrics.health === 'OPTIMAL' ? '✓ Excellent' :
                     zetaMetrics.health === 'GOOD' ? '✓ Good' :
                     zetaMetrics.health === 'FAIR' ? '⚠ Fair' :
                     '✗ Degraded'}
                  </div>
                </div>
              </div>
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
                  <div className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-medium text-emerald-700 animate-pulse">
                    NEW
                  </div>
                )}
                <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700">
                  Real-Time
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">{activeSignals.length} Active</div>
            </div>

            {activeSignals.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300 animate-pulse" />
                <p className="text-sm text-slate-600 font-medium">Generating signals...</p>
                <p className="text-xs text-slate-500 mt-1">Next signal in a few seconds</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSignals.slice(0, 8).map(sig => {
                  // Calculate time remaining
                  const timeRemaining = sig.expiresAt ? sig.expiresAt - Date.now() : 0;
                  const minutesRemaining = Math.floor(timeRemaining / 60000);
                  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);
                  const isExpiringSoon = minutesRemaining < 5;

                  return (
                    <div
                      key={sig.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        recentSignal?.id === sig.id
                          ? 'bg-blue-50/50 border-blue-300 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-md flex items-center justify-center text-sm font-bold border-2 ${
                            sig.direction === 'LONG'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {sig.direction}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-slate-900">{sig.symbol}</div>
                              {sig.marketRegime && (
                                <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 border border-violet-300 rounded-full font-semibold">
                                  {sig.marketRegime}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className={`text-xs font-semibold ${
                                sig.grade?.includes('A') ? 'text-emerald-600' :
                                sig.grade?.includes('B') ? 'text-blue-600' :
                                'text-amber-600'
                              }`}>
                                Grade {sig.grade}
                              </div>
                              <span className="text-slate-300">•</span>
                              <div className="text-xs text-slate-600 font-medium">{timeAgo(sig.timestamp)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Time Remaining */}
                        {sig.expiresAt && timeRemaining > 0 && (
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
                        {sig.entry && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <div className="text-[10px] text-slate-600 font-semibold uppercase mb-0.5">Entry</div>
                            <div className="text-sm font-bold text-slate-900">${sig.entry.toFixed(2)}</div>
                          </div>
                        )}
                        {sig.stopLoss && (
                          <div className="p-2 bg-rose-50 rounded border border-rose-200">
                            <div className="text-[10px] text-rose-600 font-semibold uppercase mb-0.5">Stop Loss</div>
                            <div className="text-sm font-bold text-rose-700">${sig.stopLoss.toFixed(2)}</div>
                          </div>
                        )}
                        {sig.riskRewardRatio && (
                          <div className="p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-[10px] text-blue-600 font-semibold uppercase mb-0.5">R:R</div>
                            <div className="text-sm font-bold text-blue-700">{sig.riskRewardRatio.toFixed(1)}:1</div>
                          </div>
                        )}
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                          <div className="text-[10px] text-emerald-600 font-semibold uppercase mb-0.5">Quality</div>
                          <div className="text-sm font-bold text-emerald-700">{sig.confidence}%</div>
                        </div>
                      </div>

                      {/* Targets */}
                      {sig.targets && sig.targets.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-600 font-semibold uppercase">Targets:</div>
                          {sig.targets.map((target, idx) => (
                            <div key={idx} className="px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                              <span className="text-[10px] text-emerald-600 font-semibold">T{idx + 1}:</span>
                              <span className="text-xs font-bold text-emerald-700 ml-1">${target.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Strategy and ML Info */}
                      {(sig.strategy || sig.qualityScore || sig.mlProbability) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                          {sig.strategy && (
                            <span className="text-[10px] px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded font-semibold">
                              {sig.strategy.replace('_', ' ')}
                            </span>
                          )}
                          {sig.qualityScore && (
                            <div className="text-[10px] text-slate-600">
                              <span className="font-semibold">Quality:</span> <span className="font-bold text-violet-600">{sig.qualityScore.toFixed(1)}</span>
                            </div>
                          )}
                          {sig.mlProbability && (
                            <div className="text-[10px] text-slate-600">
                              <span className="font-semibold">ML:</span> <span className="font-bold text-blue-600">{(sig.mlProbability * 100).toFixed(1)}%</span>
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

        {/* Signal History */}
        <Card className="border border-slate-200 shadow-sm bg-white mb-6 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Signal History</h2>
              <div className="text-sm text-slate-600 font-medium">{signalHistory.length} Total</div>
            </div>

            {signalHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-600 font-medium">No signals yet</p>
                <p className="text-xs text-slate-500 mt-1">Signals will appear as they're generated</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {signalHistory.slice().reverse().slice(0, 50).map(sig => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-16 h-10 rounded-md flex items-center justify-center text-sm font-semibold border ${
                        sig.direction === 'LONG'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {sig.direction}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-800">{sig.symbol}</div>
                        <div className="text-xs text-slate-600 font-medium">
                          {timeAgo(sig.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-semibold text-slate-800">{sig.confidence}%</div>
                        <div className={`text-xs font-medium ${
                          sig.grade.includes('A') ? 'text-emerald-600' :
                          sig.grade.includes('B') ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          Grade {sig.grade}
                        </div>
                      </div>
                      {sig.outcome && (
                        <div className={`px-3 py-1 rounded border text-xs font-semibold ${
                          sig.outcome === 'WIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {sig.outcome}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Rejected Signals - Institutional Transparency */}
        <Card className="border border-orange-200 shadow-sm bg-white mb-6 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-semibold text-slate-800">Rejected Signals</h2>
                <div className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs font-medium text-orange-700">
                  Transparency Log
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">{rejectedSignals.length} Total</div>
            </div>

            {/* Statistics */}
            {rejectedSignals.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-600 font-semibold uppercase">Total</div>
                  <div className="text-lg font-bold text-slate-800">{rejectedSignals.length}</div>
                </div>
                <div className="p-2 bg-violet-50 rounded border border-violet-200">
                  <div className="text-[10px] text-violet-600 font-semibold uppercase">Alpha</div>
                  <div className="text-lg font-bold text-violet-700">{rejectedSignals.filter(s => s.rejection_stage === 'ALPHA').length}</div>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="text-[10px] text-amber-600 font-semibold uppercase">Beta</div>
                  <div className="text-lg font-bold text-amber-700">{rejectedSignals.filter(s => s.rejection_stage === 'BETA').length}</div>
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-200">
                  <div className="text-[10px] text-rose-600 font-semibold uppercase">Gamma</div>
                  <div className="text-lg font-bold text-rose-700">{rejectedSignals.filter(s => s.rejection_stage === 'GAMMA').length}</div>
                </div>
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-[10px] text-red-600 font-semibold uppercase">Delta</div>
                  <div className="text-lg font-bold text-red-700">{rejectedSignals.filter(s => s.rejection_stage === 'DELTA').length}</div>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              {['ALL', 'ALPHA', 'BETA', 'GAMMA', 'DELTA'].map(stage => {
                const stageCount = stage === 'ALL'
                  ? rejectedSignals.length
                  : rejectedSignals.filter(s => s.rejection_stage === stage).length;

                return (
                  <button
                    key={stage}
                    onClick={() => setRejectedFilter(stage as typeof rejectedFilter)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      rejectedFilter === stage
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {stage} ({stageCount})
                  </button>
                );
              })}
            </div>

            {rejectedSignals.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">No rejections yet</p>
                <p className="text-xs text-slate-500 mt-1">All signals are passing quality filters</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rejectedSignals
                  .filter(sig => rejectedFilter === 'ALL' || sig.rejection_stage === rejectedFilter)
                  .slice(0, 50)
                  .map(sig => {
                    const priority = classifyRejectionPriority(sig);
                    // Stage color mapping
                    const stageColors = {
                      'ALPHA': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
                      'BETA': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                      'GAMMA': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
                      'DELTA': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
                    };
                    const colors = stageColors[sig.rejection_stage];

                    return (
                      <div
                        key={sig.id}
                        className="flex items-start justify-between p-3 rounded-lg border bg-white border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {/* Stage Badge */}
                          <div className={`w-16 h-10 rounded-md flex items-center justify-center text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {sig.rejection_stage}
                          </div>

                          <div className="flex-1">
                            {/* Symbol + Direction + Priority */}
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-base font-semibold text-slate-800">{sig.symbol}</div>
                              <div className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                sig.direction === 'LONG' ? 'bg-emerald-50 text-emerald-700' :
                                sig.direction === 'SHORT' ? 'bg-rose-50 text-rose-700' :
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {sig.direction}
                              </div>
                              {/* ML Priority Badge */}
                              <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                                priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-300' :
                                priority === 'IMPORTANT' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}>
                                {priority === 'CRITICAL' ? '🔴' : priority === 'IMPORTANT' ? '🟡' : '⚪'} {priority}
                              </div>
                            </div>

                            {/* Rejection Reason */}
                            <div className="text-xs text-slate-600 mb-1.5 line-clamp-2">
                              {sig.rejection_reason}
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{timeAgo(new Date(sig.created_at).getTime())}</span>
                              {sig.confidence_score !== undefined && sig.confidence_score !== null && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Conf: {sig.confidence_score.toFixed(0)}%</span>
                                </>
                              )}
                              {sig.quality_score !== undefined && sig.quality_score !== null && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Quality: {sig.quality_score.toFixed(0)}</span>
                                </>
                              )}
                              {sig.data_quality !== undefined && sig.data_quality !== null && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Data: {sig.data_quality.toFixed(0)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Summary Stats */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Alpha Rejects</div>
                <div className="text-lg font-semibold text-violet-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'ALPHA').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Beta Rejects</div>
                <div className="text-lg font-semibold text-amber-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'BETA').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Gamma Rejects</div>
                <div className="text-lg font-semibold text-rose-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'GAMMA').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Delta Rejects</div>
                <div className="text-lg font-semibold text-red-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'DELTA').length}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center pb-6">
          <p className="text-sm text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded">
              <Circle className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-700 font-semibold">
                Autonomous 24/7 Operation
              </span>
            </span>
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{fmt(metrics.totalSignals)}</span> Signals
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{formatUptime(metrics.uptime)}</span> Uptime
          </p>
        </div>
      </div>
    </div>
  );
}

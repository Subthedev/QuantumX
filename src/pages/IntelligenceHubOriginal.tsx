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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
  TrendingUpIcon,
  Coins
} from 'lucide-react';

// Global Hub Service (runs in background)
import { globalHubService, HubMetrics, HubSignal, MonthlyStats } from '@/services/globalHubService';
import { zetaLearningEngine, ZetaMetrics } from '@/services/zetaLearningEngine';
import { supabase } from '@/integrations/supabase/client';
import { STRATEGY_METADATA, type StrategyName, type StrategyPerformance } from '@/services/strategies/strategyTypes';
import { strategyPerformanceTracker } from '@/services/strategies/strategyPerformanceTracker';
import { DiagnosticPanel } from '@/components/hub/DiagnosticPanel';

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
  const allSignalHistory = globalHubService.getSignalHistory();
  const [zetaMetrics, setZetaMetrics] = useState<ZetaMetrics>(zetaLearningEngine.getMetrics());

  // Strategy performance state
  const [strategyPerformances, setStrategyPerformances] = useState<StrategyPerformance[]>([]);

  // Filter signal history for last 24 hours only (for main dashboard)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const signalHistory = allSignalHistory.filter(signal => {
    const signalAge = Date.now() - (signal.outcomeTimestamp || signal.timestamp);
    return signalAge <= TWENTY_FOUR_HOURS;
  });

  // Visual state
  const [flowingParticles, setFlowingParticles] = useState<FlowingParticle[]>([]);
  const [recentSignal, setRecentSignal] = useState<HubSignal | null>(null);

  // Expanded engine states
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  // Rejected Signals State
  const [rejectedSignals, setRejectedSignals] = useState<RejectedSignal[]>([]);
  const [rejectedFilter, setRejectedFilter] = useState<'ALL' | 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA'>('ALL');

  // Pagination State for Signal History
  const [currentPage, setCurrentPage] = useState(1);
  const SIGNALS_PER_PAGE = 20;

  // Signal expansion state for detailed view
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);

  // Monthly Stats State
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthlyStats | null>(null);
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Activity pulses (subtle)
  const [dataEngineActive, setDataEngineActive] = useState(false);
  const [alphaEngineActive, setAlphaEngineActive] = useState(false);
  const [betaEngineActive, setBetaEngineActive] = useState(false);
  const [gammaEngineActive, setGammaEngineActive] = useState(false);
  const [deltaEngineActive, setDeltaEngineActive] = useState(false);
  const [zetaEngineActive, setZetaEngineActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ===== TIMER UPDATE FOR COUNTDOWN =====
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

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

      // Load strategy performances
      console.log('[Hub UI] 📈 Loading strategy performances...');
      try {
        const performances = await strategyPerformanceTracker.getAllStrategyPerformances();
        console.log('[Hub UI] ✅ Strategy performances loaded:', performances.length);
        setStrategyPerformances(performances);
      } catch (error) {
        console.error('[Hub UI] ❌ Error loading strategy performances:', error);
      }
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
        console.log('[Hub UI] 📚 Signal history:', globalHubService.getState().signalHistory.length);

        // ✅ CRITICAL: Poll metrics every second for real-time updates (AFTER initialization)
        metricsIntervalRef.current = setInterval(() => {
          if (!mountedRef.current) return;

          const currentMetrics = globalHubService.getMetrics();
          const currentSignals = globalHubService.getActiveSignals();
          const currentZetaMetrics = zetaLearningEngine.getMetrics();
          const monthlyStats = globalHubService.getCurrentMonthStats();

          // Reduced logging: Only log every 60 seconds instead of 10 to reduce console spam
          if (Date.now() % 60000 < 1000) {
            console.log('[Hub UI] 🔄 Polling update - Active signals:', currentSignals.length, 'Zeta outcomes:', currentZetaMetrics.totalOutcomes);
          }

          setMetrics(currentMetrics);
          setActiveSignals(currentSignals);
          setZetaMetrics(currentZetaMetrics);
          setCurrentMonthStats(monthlyStats);

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

  // Reset expanded signal when page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setExpandedSignalId(null); // Close any expanded signal when navigating
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

        {/* DIAGNOSTIC PANEL - Visual debugging interface */}
        <DiagnosticPanel />

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
                <div className="text-xl font-semibold text-blue-600">{metrics.strategiesActive}/17</div>
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
                  Analyzes market data using {metrics.alphaStrategiesActive || 17} institutional-grade strategies to detect tradeable patterns and setups.
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
                  <div className="text-xl font-semibold text-blue-700">{metrics.alphaStrategiesActive || 0}/17</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Detection Rate</div>
                  <div className="text-xl font-semibold text-amber-700">{fmtDec(metrics.alphaDetectionRate || 0)}/min</div>
                </div>
              </div>

              {/* 17 Strategy Breakdown with Performance Metrics */}
              <div className="mt-6 pt-6 border-t border-violet-100">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-800">17 Institutional-Grade Strategies</h3>
                  <div className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600">
                    Ranked by Performance
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    // Merge strategy metadata with performance data
                    const strategiesWithPerformance = Object.values(STRATEGY_METADATA).map(strategy => {
                      const performance = strategyPerformances.find(p => p.strategyName === strategy.name);
                      return { strategy, performance };
                    });

                    // Sort by success rate (descending), then by total signals (for strategies with no data)
                    const sortedStrategies = strategiesWithPerformance.sort((a, b) => {
                      const aRate = a.performance?.successRate || 0;
                      const bRate = b.performance?.successRate || 0;
                      const aSignals = a.performance?.totalSignals || 0;
                      const bSignals = b.performance?.totalSignals || 0;

                      // If both have data, sort by success rate
                      if (aSignals > 0 && bSignals > 0) {
                        return bRate - aRate;
                      }
                      // If only one has data, prioritize it
                      if (aSignals > 0) return -1;
                      if (bSignals > 0) return 1;
                      // If neither has data, maintain original order
                      return 0;
                    });

                    return sortedStrategies.map(({ strategy, performance }, index) => {
                      const hasData = performance && performance.totalSignals > 0;
                      const winRate = performance?.successRate || 0;
                      const totalSignals = performance?.totalSignals || 0;

                      return (
                        <div key={strategy.name} className="p-3 bg-slate-50 rounded border border-slate-200 hover:border-violet-300 transition-all group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {/* Rank Badge */}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  index === 0 && hasData ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                  index === 1 && hasData ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                  index === 2 && hasData ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                                  'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  #{index + 1}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">{strategy.displayName}</span>
                                {/* Win Rate Badge */}
                                {hasData ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    winRate >= 70 ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                                    winRate >= 55 ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                                    winRate >= 45 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                    'bg-rose-100 text-rose-700 border border-rose-300'
                                  }`}>
                                    {winRate.toFixed(1)}% WR
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px] font-medium">
                                    No data yet
                                  </span>
                                )}
                                {/* Signal Count */}
                                {hasData && (
                                  <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded text-[10px] font-medium">
                                    {totalSignals} signals
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">{strategy.description}</p>
                              <p className="text-[10px] text-violet-600 mt-1 font-medium">Best for: {strategy.bestFor}</p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Institutional Features */}
                <div className="mt-4 p-3 bg-gradient-to-r from-violet-50 to-blue-50 rounded border border-violet-200">
                  <div className="text-xs font-semibold text-slate-800 mb-2">Anti-Manipulation Features</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Spoofing Detection (Order Flow Tsunami)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> OI Validation (Funding Squeeze)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Multi-Exchange Consensus
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Coin Deduplication (1 signal/coin)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Beta Consensus (65% threshold)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Delta Win Rate Filter (52%+)
                    </div>
                  </div>
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

        {/* 🔴 LIVE SIGNALS - Active Positions */}
        {activeSignals.length > 0 && (
          <Card className="border-2 border-emerald-300 shadow-lg bg-gradient-to-br from-emerald-50 to-white mb-6 hover:shadow-xl transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                      Live Signals
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full animate-pulse">
                        LIVE
                      </span>
                    </h2>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Real-time active positions • {activeSignals.length} signal{activeSignals.length !== 1 ? 's' : ''} in play
                    </p>
                  </div>
                </div>
                <div className="text-xs text-emerald-700 font-semibold">
                  Updated {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {activeSignals.map(sig => {
                  const confidence = sig.confidence || sig.qualityScore || 0;
                  const isHighConfidence = confidence >= 80;
                  const isMediumConfidence = confidence >= 70;

                  return (
                    <div
                      key={sig.id}
                      className="rounded-lg border-2 border-emerald-200 bg-white hover:border-emerald-400 transition-all p-4 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Crypto Logo */}
                          {sig.image && (
                            <img
                              src={sig.image}
                              alt={sig.symbol}
                              className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-emerald-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}

                          {/* Direction Badge */}
                          <div className={`w-20 h-12 rounded-lg flex items-center justify-center text-sm font-bold border-2 shadow-sm ${
                            sig.direction === 'LONG'
                              ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {sig.direction}
                          </div>

                          {/* Symbol and Strategy */}
                          <div className="flex-1">
                            <div className="text-lg font-bold text-slate-900">{sig.symbol}</div>
                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                              {sig.strategyName || sig.strategy || 'Unknown Strategy'}
                            </div>
                            <div className="text-xs text-emerald-600 font-semibold mt-1">
                              Started {timeAgo(sig.timestamp)}
                            </div>
                          </div>
                        </div>

                        {/* Trading Levels */}
                        <div className="flex items-center gap-6 mr-6">
                          <div className="text-center">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Entry</div>
                            <div className="text-sm font-bold text-slate-800">
                              ${sig.entry?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-rose-500 font-semibold uppercase mb-1">Stop Loss</div>
                            <div className="text-sm font-bold text-rose-600">
                              ${sig.stopLoss?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-emerald-500 font-semibold uppercase mb-1">Target</div>
                            <div className="text-sm font-bold text-emerald-600">
                              ${(sig.targets && sig.targets[0])?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Confidence and Grade */}
                        <div className="text-right">
                          <div className={`text-2xl font-bold mb-1 ${
                            isHighConfidence ? 'text-emerald-600' :
                            isMediumConfidence ? 'text-blue-600' :
                            'text-amber-600'
                          }`}>
                            {confidence}%
                          </div>
                          <div className={`text-xs font-bold mb-2 ${
                            isHighConfidence ? 'text-emerald-500' :
                            isMediumConfidence ? 'text-blue-500' :
                            'text-amber-500'
                          }`}>
                            {isHighConfidence ? '🟢 EXCELLENT' :
                             isMediumConfidence ? '🟡 GOOD' :
                             '🟠 ACCEPTABLE'}
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold shadow-sm ${
                            sig.grade?.includes('A') ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            sig.grade?.includes('B') ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            Grade {sig.grade || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Signal History - Last 24 Hours */}
        <Card className="border border-slate-200 shadow-sm bg-white mb-6 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Signal History - Last 24 Hours</h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time performance tracking • {signalHistory.length} signals</p>
              </div>
              <a
                href="/intelligence-hub/monthly"
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-xs font-semibold text-indigo-700 transition-colors"
              >
                View Monthly Stats →
              </a>
            </div>

            {/* 24-Hour Performance Summary */}
            {signalHistory.length > 0 && (() => {
              const completed = signalHistory.filter(s => s.outcome && s.outcome !== 'PENDING');
              const wins = completed.filter(s => s.outcome === 'WIN').length;
              const losses = completed.filter(s => s.outcome === 'LOSS').length;
              const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
              const totalReturn = completed.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
              const avgReturn = completed.length > 0 ? totalReturn / completed.length : 0;

              return (
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-emerald-900">
                      24-Hour Performance
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {/* Total Signals */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">
                        Total Signals
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {completed.length}
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="p-3 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-emerald-600 font-semibold uppercase mb-1">
                        Win Rate
                      </div>
                      <div className="text-2xl font-bold text-emerald-700">
                        {winRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {wins}W / {losses}L
                      </div>
                    </div>

                    {/* Total Return */}
                    <div className={`p-3 bg-white rounded-lg border ${
                      totalReturn >= 0 ? 'border-emerald-200' : 'border-rose-200'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase mb-1 ${
                        totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        Total Return
                      </div>
                      <div className={`text-2xl font-bold flex items-center gap-1 ${
                        totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {totalReturn >= 0 ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                        {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(1)}%
                      </div>
                    </div>

                    {/* Avg Return per Trade */}
                    <div className={`p-3 bg-white rounded-lg border ${
                      avgReturn >= 0 ? 'border-emerald-200' : 'border-rose-200'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase mb-1 ${
                        avgReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        Avg Return/Trade
                      </div>
                      <div className={`text-2xl font-bold flex items-center gap-1 ${
                        avgReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {avgReturn >= 0 ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                        {avgReturn > 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {signalHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-600 font-medium">No signals yet</p>
                <p className="text-xs text-slate-500 mt-1">Signals will appear as they're generated</p>
              </div>
            ) : (
              <div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {signalHistory.slice((currentPage - 1) * SIGNALS_PER_PAGE, currentPage * SIGNALS_PER_PAGE).map(sig => {
                    const isExpanded = expandedSignalId === sig.id;

                    return (
                      <div
                        key={sig.id}
                        className="rounded-lg border bg-white border-slate-100 hover:border-slate-300 transition-all overflow-hidden"
                      >
                        {/* Main Signal Row - Clickable */}
                        <button
                          onClick={() => setExpandedSignalId(isExpanded ? null : sig.id)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Crypto Logo - Dashboard style */}
                            {sig.image && (
                              <img
                                src={sig.image}
                                alt={sig.symbol}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}

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
                              <div className="text-right">
                                <div className={`px-3 py-1 rounded border text-xs font-semibold ${
                                  sig.outcome === 'WIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  sig.outcome === 'LOSS' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {sig.outcome}
                                </div>
                                {sig.actualReturn !== undefined && (
                                  <div className={`text-xs font-bold mt-1 ${
                                    sig.actualReturn > 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {sig.actualReturn > 0 ? '+' : ''}{sig.actualReturn.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3 animate-in slide-in-from-top duration-200">
                            {/* Trading Levels */}
                            <div>
                              <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Trading Levels</div>
                              <div className="grid grid-cols-4 gap-2">
                                {sig.entry && (
                                  <div className="p-2 bg-white rounded border border-slate-200">
                                    <div className="text-[10px] text-slate-600 font-semibold uppercase mb-0.5">Entry</div>
                                    <div className="text-sm font-bold text-slate-900">${sig.entry.toFixed(2)}</div>
                                  </div>
                                )}
                                {sig.stopLoss && (
                                  <div className="p-2 bg-white rounded border border-rose-200">
                                    <div className="text-[10px] text-rose-600 font-semibold uppercase mb-0.5">Stop Loss</div>
                                    <div className="text-sm font-bold text-rose-700">${sig.stopLoss.toFixed(2)}</div>
                                  </div>
                                )}
                                {sig.riskRewardRatio && (
                                  <div className="p-2 bg-white rounded border border-blue-200">
                                    <div className="text-[10px] text-blue-600 font-semibold uppercase mb-0.5">R:R</div>
                                    <div className="text-sm font-bold text-blue-700">{sig.riskRewardRatio.toFixed(1)}:1</div>
                                  </div>
                                )}
                                {sig.qualityScore && (
                                  <div className="p-2 bg-white rounded border border-emerald-200">
                                    <div className="text-[10px] text-emerald-600 font-semibold uppercase mb-0.5">Quality</div>
                                    <div className="text-sm font-bold text-emerald-700">{sig.qualityScore.toFixed(0)}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Outcome Metrics for Zeta Learning */}
                            {sig.outcome && (
                              <div className="bg-white rounded-lg border border-slate-200 p-3">
                                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Outcome Metrics</div>
                                <div className="grid grid-cols-4 gap-2">
                                  {sig.actualReturn !== undefined && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Return</div>
                                      <div className={`text-sm font-bold ${
                                        sig.actualReturn > 0 ? 'text-emerald-600' : 'text-rose-600'
                                      }`}>
                                        {sig.actualReturn > 0 ? '+' : ''}{sig.actualReturn.toFixed(2)}%
                                      </div>
                                    </div>
                                  )}
                                  {sig.exitPrice && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Exit Price</div>
                                      <div className="text-sm font-bold text-slate-900">${sig.exitPrice.toFixed(2)}</div>
                                    </div>
                                  )}
                                  {sig.holdDuration && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Duration</div>
                                      <div className="text-sm font-bold text-slate-900">{Math.floor(sig.holdDuration / 60000)}m</div>
                                    </div>
                                  )}
                                  {sig.exitReason && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Exit</div>
                                      <div className="text-xs font-bold text-blue-600">{sig.exitReason.replace(/_/g, ' ')}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Targets */}
                            {sig.targets && sig.targets.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Targets</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {sig.targets.map((target, idx) => (
                                    <div key={idx} className="px-2 py-1 bg-white rounded border border-emerald-200">
                                      <span className="text-[10px] text-emerald-600 font-semibold">T{idx + 1}:</span>
                                      <span className="text-xs font-bold text-emerald-700 ml-1">${target.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Strategy & Technical Details */}
                            <div>
                              <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Technical Details</div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {sig.strategy && (
                                  <span className="text-[10px] px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded font-semibold">
                                    {sig.strategy.replace(/_/g, ' ')}
                                  </span>
                                )}
                                {sig.marketRegime && (
                                  <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold">
                                    {sig.marketRegime}
                                  </span>
                                )}
                                {sig.mlProbability && (
                                  <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">
                                    ML: {(sig.mlProbability * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Outcome Details (if available) */}
                            {sig.outcome && (
                              <div>
                                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Outcome</div>
                                <div className="p-3 bg-white rounded border border-slate-200">
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Result</div>
                                      <div className={`text-sm font-bold ${
                                        sig.outcome === 'WIN' ? 'text-emerald-600' :
                                        sig.outcome === 'LOSS' ? 'text-rose-600' :
                                        'text-amber-600'
                                      }`}>
                                        {sig.outcome}
                                      </div>
                                    </div>
                                    {sig.actualReturn !== undefined && (
                                      <div>
                                        <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Return</div>
                                        <div className={`text-sm font-bold ${
                                          sig.actualReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                          {sig.actualReturn >= 0 ? '+' : ''}{sig.actualReturn.toFixed(2)}%
                                        </div>
                                      </div>
                                    )}
                                    {sig.exitPrice && (
                                      <div>
                                        <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Exit Price</div>
                                        <div className="text-sm font-bold text-slate-800">
                                          ${sig.exitPrice.toFixed(2)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-[10px] text-slate-500">
                                Generated: {new Date(sig.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              {/* Pagination Controls */}
              {(() => {
                const totalPages = Math.ceil(signalHistory.length / SIGNALS_PER_PAGE);
                if (totalPages <= 1) return null;

                return (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === 1
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <div className="text-sm font-medium text-slate-600">
                      Page {currentPage} of {totalPages}
                    </div>

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === totalPages
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
                      }`}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}
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

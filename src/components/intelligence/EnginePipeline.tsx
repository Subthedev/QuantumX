/**
 * EnginePipeline — CANONICAL design for the five-brain pipeline visualization.
 *
 * ─── DO NOT REPLACE ──────────────────────────────────────────────────────
 * This is the approved, final design. Earlier iterations (3D bezier flow,
 * synthetic-counter version, generic-stats version) were explicitly rejected
 * by the project owner. If a request comes in to "improve" or "redesign" the
 * pipeline visualization, the answer is no — propose an addition, not a
 * replacement.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Layout: five white-card engine nodes (Alpha → Beta → Gamma → Delta → Zeta)
 * spaced evenly along a single straight gradient line. Tiny Unicode symbols
 * flow along the line as particles, with spawn rates that taper across
 * stages — visually echoing the filtering funnel as raw data narrows
 * into approved signals.
 *
 * Each engine node is clickable: it toggles a detail panel below the canvas
 * showing the ACTUAL metrics that engine has produced — pulled live from
 * `globalHubService.getMetrics()` and `zetaLearningEngine.getMetrics()`.
 * Per-engine field mapping lives in `getStageTiles()` below; mirror the
 * shape of `HubMetrics` / `ZetaMetrics` if those interfaces evolve.
 *
 * Hard rules:
 *   • Five brains, in this order: Alpha · Beta · Gamma · Delta · Zeta.
 *   • Single straight gradient line — no bezier arcs, no 3D, no orbit.
 *   • Real metrics on click; never synthetic counters tied to particle flow.
 *   • Particles are decorative only (visualization layer).
 *   • Honors `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Brain,
  ChevronUp,
  Filter,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { globalHubService, type HubMetrics } from '@/services/globalHubService';
import { zetaLearningEngine, type ZetaMetrics } from '@/services/zetaLearningEngine';

interface FlowingParticle {
  id: string;
  stage: number;
  progress: number;
  symbol: string;
  size: 'sm' | 'md';
  speed: number;
}

interface Stage {
  key: string;
  name: string;
  role: string;
  description: string;
  icon: typeof Brain;
  iconClass: string;
  borderClass: string;
  expandedBorderClass: string;
  ringClass: string;
  activeBg: string;
  tileBg: string;
  tileText: string;
  badgeClass: string;
}

const STAGES: Stage[] = [
  {
    key: 'alpha',
    name: 'Alpha',
    role: 'Predictive',
    description:
      'Analyzes market data through 17 institutional-grade strategies to detect tradeable patterns and setups.',
    icon: Brain,
    iconClass: 'text-violet-600',
    borderClass: 'border-violet-200',
    expandedBorderClass: 'border-violet-300',
    ringClass: 'ring-violet-200',
    activeBg: 'bg-violet-500',
    tileBg: 'bg-violet-50 border-violet-100',
    tileText: 'text-violet-700',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    key: 'beta',
    name: 'Beta',
    role: 'Scoring',
    description:
      'Scores raw signals by confidence — separates noise from high-conviction setups before they continue downstream.',
    icon: Target,
    iconClass: 'text-amber-600',
    borderClass: 'border-amber-200',
    expandedBorderClass: 'border-amber-300',
    ringClass: 'ring-amber-200',
    activeBg: 'bg-amber-500',
    tileBg: 'bg-amber-50 border-amber-100',
    tileText: 'text-amber-700',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'gamma',
    name: 'Gamma',
    role: 'Assembly',
    description:
      'Assembles surviving signals and confirms regime / quality fit before passing them to the final filter.',
    icon: TrendingUp,
    iconClass: 'text-rose-600',
    borderClass: 'border-rose-200',
    expandedBorderClass: 'border-rose-300',
    ringClass: 'ring-rose-200',
    activeBg: 'bg-rose-500',
    tileBg: 'bg-rose-50 border-rose-100',
    tileText: 'text-rose-700',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    key: 'delta',
    name: 'Delta',
    role: 'Quality Gate',
    description:
      'ML quality filter with regime-aware thresholds — only signals scoring above the live threshold are published.',
    icon: Filter,
    iconClass: 'text-emerald-600',
    borderClass: 'border-emerald-200',
    expandedBorderClass: 'border-emerald-300',
    ringClass: 'ring-emerald-200',
    activeBg: 'bg-emerald-500',
    tileBg: 'bg-emerald-50 border-emerald-100',
    tileText: 'text-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'zeta',
    name: 'Zeta',
    role: 'Learning',
    description:
      'Continuous learning loop. Trains the ML model from realised outcomes and feeds calibration back upstream.',
    icon: Sparkles,
    iconClass: 'text-cyan-600',
    borderClass: 'border-cyan-200',
    expandedBorderClass: 'border-cyan-300',
    ringClass: 'ring-cyan-200',
    activeBg: 'bg-cyan-500',
    tileBg: 'bg-cyan-50 border-cyan-100',
    tileText: 'text-cyan-700',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
];

// Engine center positions across the canvas (matches the leftmost/rightmost
// gradient-line endpoints below: left-[8%] right-[8%]).
const STAGE_CENTERS = [8, 29, 50, 71, 92] as const;

// Per-stage particle spawn rates — taper across the pipeline so each
// successive engine receives fewer particles than the previous one.
// This is the "filtering funnel" effect: raw data → fewer approved signals.
const SPAWN_RATES = [0.85, 0.65, 0.45, 0.25, 0.1];

const PARTICLE_SYMBOLS = ['₿', 'Ξ', '◎', '♦', '●', '◆', '○', '▲'];

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString();
const fmtDec = (n: number | undefined, digits = 1) =>
  (n ?? 0).toFixed(digits);

interface Tile {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean; // tint with the engine's color
}

// Map current Hub + Zeta metrics to the four-to-five tiles displayed in
// each engine's expanded panel. Mirrors the original IntelligenceHub.
function getStageTiles(
  stageKey: string,
  hub: HubMetrics,
  zeta: ZetaMetrics,
): Tile[] {
  switch (stageKey) {
    case 'alpha':
      return [
        { label: 'Patterns Detected', value: fmt(hub.alphaPatternsDetected), accent: true },
        { label: 'Signals Generated', value: fmt(hub.alphaSignalsGenerated) },
        { label: 'Active Strategies', value: `${hub.alphaStrategiesActive ?? 0}/17` },
        { label: 'Detection Rate', value: `${fmtDec(hub.alphaDetectionRate)}/min` },
      ];
    case 'beta':
      return [
        { label: 'Signals Scored', value: fmt(hub.betaSignalsScored), accent: true },
        { label: 'High Quality', value: fmt(hub.betaHighQuality), hint: '> 80%' },
        { label: 'Medium Quality', value: fmt(hub.betaMediumQuality), hint: '60–80%' },
        { label: 'Avg Confidence', value: `${fmtDec(hub.betaAvgConfidence)}%` },
      ];
    case 'gamma':
      return [
        { label: 'Received', value: fmt(hub.gammaSignalsReceived), accent: true },
        { label: 'Passed', value: fmt(hub.gammaSignalsPassed) },
        { label: 'Rejected', value: fmt(hub.gammaSignalsRejected) },
        { label: 'Pass Rate', value: `${fmtDec(hub.gammaPassRate)}%` },
      ];
    case 'delta':
      return [
        { label: 'Processed', value: fmt(hub.deltaProcessed), accent: true },
        { label: 'Passed', value: fmt(hub.deltaPassed) },
        { label: 'Rejected', value: fmt(hub.deltaRejected) },
        { label: 'Pass Rate', value: `${fmtDec(hub.deltaPassRate)}%` },
        { label: 'Avg Quality', value: fmtDec(hub.deltaQualityScore) },
      ];
    case 'zeta':
      return [
        {
          label: 'ML Accuracy',
          value: `${fmtDec(zeta.mlAccuracy)}%`,
          hint: `${zeta.trainingCount ?? 0} trainings`,
          accent: true,
        },
        {
          label: 'Outcomes Learned',
          value: fmt(zeta.totalOutcomes),
        },
        {
          label: 'Top Strategy',
          value: zeta.topStrategy || '—',
        },
        {
          label: 'System Health',
          value: zeta.health || '—',
        },
      ];
    default:
      return [];
  }
}

export default function EnginePipeline() {
  const [particles, setParticles] = useState<FlowingParticle[]>([]);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  // Live metrics — pulled from the real services, kept fresh via events
  // (and a polling fallback in case an event is missed).
  const [hubMetrics, setHubMetrics] = useState<HubMetrics>(() =>
    globalHubService.getMetrics(),
  );
  const [zetaMetrics, setZetaMetrics] = useState<ZetaMetrics>(() =>
    zetaLearningEngine.getMetrics(),
  );

  const rafRef = useRef<number>();

  // ─── Real metric subscription ──────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const onHubUpdate = (m: HubMetrics) => {
      if (alive) setHubMetrics(m);
    };
    const onZetaUpdate = (m: ZetaMetrics) => {
      if (alive) setZetaMetrics(m);
    };

    globalHubService.on('metrics:update', onHubUpdate);
    zetaLearningEngine.on('metrics:update', onZetaUpdate);

    // Polling fallback — guarantees the panel reflects current state
    // even if an upstream emit is missed during a heavy frame.
    const poll = setInterval(() => {
      if (!alive) return;
      setHubMetrics(globalHubService.getMetrics());
      setZetaMetrics(zetaLearningEngine.getMetrics());
    }, 2000);

    return () => {
      alive = false;
      globalHubService.off('metrics:update', onHubUpdate);
      zetaLearningEngine.off('metrics:update', onZetaUpdate);
      clearInterval(poll);
    };
  }, []);

  // ─── Decorative particle flow (visualization only) ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tick = () => {
      setParticles(prev => {
        const next = [...prev];

        for (let stage = 0; stage < STAGES.length; stage++) {
          const stageCount = next.filter(p => p.stage === stage).length;
          if (
            Math.random() < SPAWN_RATES[stage] &&
            stageCount < 6 &&
            next.length < 40
          ) {
            next.push({
              id: `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
              stage,
              progress: 0,
              symbol:
                PARTICLE_SYMBOLS[
                  Math.floor(Math.random() * PARTICLE_SYMBOLS.length)
                ],
              size: Math.random() < 0.7 ? 'sm' : 'md',
              speed: 1.2 + Math.random() * 1.4,
            });
          }
        }

        return next
          .map(p => {
            const newProgress = p.progress + p.speed;
            if (newProgress < 100) return { ...p, progress: newProgress };

            const isLastLeg = p.stage >= STAGES.length - 1;
            if (isLastLeg) return null;

            const passRate = SPAWN_RATES[p.stage + 1] / SPAWN_RATES[p.stage];
            if (Math.random() < passRate) {
              return { ...p, stage: p.stage + 1, progress: 0 };
            }
            return null;
          })
          .filter((p): p is FlowingParticle => p !== null);
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Random pulse on engine cards for "alive" feel ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.45) {
        const stage = Math.floor(Math.random() * STAGES.length);
        setActiveStage(stage);
        window.setTimeout(() => {
          setActiveStage(prev => (prev === stage ? null : prev));
        }, 320);
      }
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  const toggleStage = (idx: number) => {
    setExpandedStage(prev => (prev === idx ? null : idx));
  };

  const expanded = expandedStage !== null ? STAGES[expandedStage] : null;
  const expandedTiles =
    expanded ? getStageTiles(expanded.key, hubMetrics, zetaMetrics) : [];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Autonomous Pipeline
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Five-brain signal flow · Alpha → Beta → Gamma → Delta → Zeta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full font-bold text-emerald-700">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </div>
            <div className="text-slate-500 font-semibold tabular-nums">
              {fmt(hubMetrics.totalSignals)} signals
            </div>
          </div>
        </div>

        {/* Pipeline canvas */}
        <div className="relative h-32 bg-gradient-to-r from-violet-50/40 via-slate-50/30 to-cyan-50/40 rounded-xl border border-slate-100/80 overflow-hidden">
          {/* Single straight gradient line connecting all five engines */}
          <div className="absolute top-1/2 left-[8%] right-[8%] h-0.5 -translate-y-1/2 bg-gradient-to-r from-violet-200 via-amber-200 via-50% to-cyan-200 opacity-70 rounded-full" />

          {/* Flowing particles */}
          {particles.map(p => {
            const fromPct = STAGE_CENTERS[p.stage];
            const toPct = STAGE_CENTERS[Math.min(p.stage + 1, STAGES.length - 1)];
            const left = fromPct + (toPct - fromPct) * (p.progress / 100);
            return (
              <div
                key={p.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 font-bold pointer-events-none text-slate-500/80 ${p.size === 'md' ? 'text-sm' : 'text-xs'}`}
                style={{ left: `${left}%`, top: '50%' }}
              >
                {p.symbol}
              </div>
            );
          })}

          {/* Engine nodes */}
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isPulsing = activeStage === idx;
            const isExpanded = expandedStage === idx;
            return (
              <div
                key={stage.key}
                className="absolute top-1/2 z-10"
                style={{
                  left: `${STAGE_CENTERS[idx]}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleStage(idx)}
                  aria-pressed={isExpanded}
                  aria-label={`${stage.name} engine — ${stage.role}`}
                  className="relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 rounded-xl"
                >
                  <div
                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center shadow-md border-2 cursor-pointer [transition:transform_var(--duration-fast)_var(--ease-out),background-color_var(--duration-fast)_var(--ease-out),border-color_var(--duration-fast)_var(--ease-out)] active:scale-[0.96] ${
                      isPulsing
                        ? `${stage.activeBg} border-transparent scale-110`
                        : isExpanded
                          ? `bg-white ${stage.expandedBorderClass} ring-2 ${stage.ringClass} scale-[1.04]`
                          : `bg-white ${stage.borderClass} hover:scale-[1.04]`
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 [transition:color_var(--duration-fast)_var(--ease-out)] ${
                        isPulsing ? 'text-white' : stage.iconClass
                      }`}
                    />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-slate-600">
                    {stage.name}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Spacer for the engine name labels that sit below the canvas */}
        <div className="h-6" />

        {/* Expanded engine detail panel — wired to real services */}
        {expanded && (
          <div
            className={`mt-4 rounded-xl border ${expanded.expandedBorderClass} bg-white shadow-sm animate-in slide-in-from-top-2 fade-in-0 [animation-duration:200ms]`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <expanded.icon className={`w-4 h-4 ${expanded.iconClass}`} />
                  <h3 className="text-sm font-semibold text-slate-800">
                    {expanded.name} Engine
                  </h3>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${expanded.badgeClass}`}
                  >
                    {expanded.role}
                  </div>
                  {expanded.key === 'delta' && hubMetrics.currentRegime && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-50 text-slate-700 border-slate-200">
                      {hubMetrics.currentRegime}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedStage(null)}
                  className="text-slate-400 hover:text-slate-600 [transition:color_var(--duration-fast)_var(--ease-out)] active:scale-[0.94]"
                  aria-label="Close engine details"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 mb-4">{expanded.description}</p>

              <div
                className={`grid grid-cols-2 ${expandedTiles.length === 5 ? 'sm:grid-cols-3 md:grid-cols-5' : 'sm:grid-cols-4'} gap-2.5`}
              >
                {expandedTiles.map(tile => (
                  <div
                    key={tile.label}
                    className={`p-3 rounded-lg border ${tile.accent ? expanded.tileBg : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                      {tile.label}
                    </div>
                    <div
                      className={`text-base font-bold tabular-nums truncate ${tile.accent ? expanded.tileText : 'text-slate-700'}`}
                      title={tile.value}
                    >
                      {tile.value}
                    </div>
                    {tile.hint && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {tile.hint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

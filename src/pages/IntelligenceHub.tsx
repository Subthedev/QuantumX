/**
 * INTELLIGENCE HUB — Redesigned Command Center
 * Dark, cinematic trading terminal. Clean signal flow.
 */

import { useState, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import {
  Activity, Database, Brain, Target, Filter, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Zap, Radio, Clock, BarChart3
} from 'lucide-react';

import { globalHubService, HubMetrics, HubSignal } from '@/services/globalHubService';
import { zetaLearningEngine, ZetaMetrics } from '@/services/zetaLearningEngine';
import { scheduledSignalDropper } from '@/services/scheduledSignalDropper';
import { cryptoSentimentService } from '@/services/cryptoSentimentService';
import { AlertTriangle } from 'lucide-react';

// Google Font for distinctive typography
const fontLink = typeof document !== 'undefined' && !document.getElementById('hub-font') ? (() => {
  const link = document.createElement('link');
  link.id = 'hub-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
  return link;
})() : null;

export default function IntelligenceHub({ embedded = false }: { embedded?: boolean }) {
  const mountedRef = useRef(true);
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  const [metrics, setMetrics] = useState<HubMetrics>(globalHubService.getMetrics());
  const [activeSignals, setActiveSignals] = useState<HubSignal[]>(globalHubService.getActiveSignals());
  const allSignalHistory = globalHubService.getSignalHistory();
  const [zetaMetrics, setZetaMetrics] = useState<ZetaMetrics>(zetaLearningEngine.getMetrics());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const SIGNALS_PER_PAGE = 15;

  // Filter 24h history
  const signalHistory = allSignalHistory.filter(s => {
    const age = Date.now() - (s.outcomeTimestamp || s.timestamp);
    return age <= 24 * 60 * 60 * 1000;
  });

  // Timer
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Service connection
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      if (!globalHubService.isRunning()) await globalHubService.start();
      setMetrics(globalHubService.getMetrics());
      setActiveSignals(globalHubService.getActiveSignals());
      setZetaMetrics(zetaLearningEngine.getMetrics());
    };

    const onMetrics = (m: HubMetrics) => { if (mountedRef.current) setMetrics(m); };
    const onSignalLive = (s: HubSignal[]) => { if (mountedRef.current) setActiveSignals(s); };
    const onZeta = (m: ZetaMetrics) => { if (mountedRef.current) setZetaMetrics(m); };

    globalHubService.on('metrics:update', onMetrics);
    globalHubService.on('signal:live', onSignalLive);
    zetaLearningEngine.on('metrics:update', onZeta);

    init().then(() => {
      metricsIntervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setMetrics(globalHubService.getMetrics());
        setActiveSignals(globalHubService.getActiveSignals());
        setZetaMetrics(zetaLearningEngine.getMetrics());
      }, 2000);
    });

    return () => {
      mountedRef.current = false;
      globalHubService.off('metrics:update', onMetrics);
      globalHubService.off('signal:live', onSignalLive);
      zetaLearningEngine.off('metrics:update', onZeta);
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
    };
  }, []);

  // Helpers
  const fmt = (n: number) => n.toLocaleString();
  const fmtDec = (n: number) => n.toFixed(1);
  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  };
  const formatUptime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  // Pipeline health
  const pipelineHealth = (() => {
    const up = metrics.uptime / 60000;
    const score = (metrics.dataTickersFetched > 0 ? 25 : 0) + (metrics.totalSignals > 0 ? 25 : 0)
      + (metrics.winRate >= 55 ? 25 : 0) + (metrics.approvalRate >= 50 ? 25 : 0);
    if (up < 1) return { label: 'STARTING', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    if (score >= 75) return { label: 'OPTIMAL', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    if (score >= 50) return { label: 'GOOD', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
    if (score >= 25) return { label: 'FAIR', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    return { label: 'DEGRADED', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
  })();

  // Sentiment
  const sentiment = (() => {
    try {
      const s = cryptoSentimentService.getSentimentData();
      const c = s.label.includes('FEAR') ? 'text-rose-400' : s.label.includes('GREED') ? 'text-emerald-400' : 'text-amber-400';
      return { label: s.label.replace('_', ' '), value: Math.round(s.fearGreedIndex), color: c };
    } catch { return null; }
  })();

  // Next signal countdown
  const countdown = (() => {
    try {
      const stats = scheduledSignalDropper.getStats('FREE');
      if (stats?.nextDropTime) {
        const rem = Math.max(0, stats.nextDropTime - currentTime);
        return { mins: Math.floor(rem / 60000), secs: Math.floor((rem % 60000) / 1000), buffer: stats.bufferSize || 0, total: rem };
      }
    } catch {}
    return null;
  })();

  // 24h stats
  const dayStats = (() => {
    const completed = signalHistory.filter(s => s.outcome && s.outcome !== 'PENDING');
    const wins = completed.filter(s => s.outcome === 'WIN').length;
    const losses = completed.filter(s => s.outcome === 'LOSS').length;
    const wr = completed.length > 0 ? (wins / completed.length) * 100 : 0;
    const totalRet = completed.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
    return { completed: completed.length, wins, losses, winRate: wr, totalReturn: totalRet };
  })();

  // Pipeline stages
  const stages = [
    { name: 'DATA', icon: Database, value: fmt(metrics.dataTickersFetched || 0), label: 'fetched', color: 'text-cyan-400' },
    { name: 'ALPHA', icon: Brain, value: fmt(metrics.alphaSignalsGenerated || 0), label: 'signals', color: 'text-violet-400' },
    { name: 'BETA', icon: Target, value: `${fmtDec(metrics.betaAvgConfidence || 0)}%`, label: 'avg conf', color: 'text-amber-400' },
    { name: 'GAMMA', icon: Zap, value: `${fmtDec(metrics.gammaPassRate || 0)}%`, label: 'pass rate', color: 'text-rose-400' },
    { name: 'DELTA', icon: Filter, value: fmt(metrics.deltaPassed || 0), label: 'passed', color: 'text-emerald-400' },
    { name: 'ZETA', icon: Brain, value: `${fmtDec(zetaMetrics.mlAccuracy)}%`, label: 'ML acc', color: 'text-fuchsia-400' },
  ];

  // Recent signals: show latest from history when no active signals
  const recentSignals = activeSignals.length === 0
    ? allSignalHistory
        .filter(s => Date.now() - s.timestamp < 12 * 60 * 60 * 1000) // last 12h
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
    : [];

  const totalPages = Math.ceil(signalHistory.length / SIGNALS_PER_PAGE);

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#08090d]'} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {!embedded && <AppHeader />}

      <div className={embedded ? '' : 'mx-auto max-w-[1400px] px-4 sm:px-6 py-6'}>

        {/* ═══ AI MODEL DISCLAIMER ═══ */}
        <div className="mb-5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-amber-400 mb-1">AI Learning Model — Not Financial Advice</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Signals are generated by an experimental open-source AI model currently in its learning phase.
                This system analyzes market data across 17 strategies and learns from real outcomes — accuracy improves over time.
                <span className="text-amber-400/80 font-semibold"> Do not take trading actions based on these signals.</span> They are for educational and research purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Intelligence Hub
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-bold uppercase tracking-wider ${pipelineHealth.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {pipelineHealth.label}
              </span>
              <span className="text-slate-500 text-xs font-mono">{formatUptime(metrics.uptime)} uptime</span>
              {sentiment && (
                <span className={`text-xs font-bold ${sentiment.color}`}>{sentiment.label} ({sentiment.value})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Win Rate</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">{fmtDec(metrics.winRate)}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Signals</div>
              <div className="text-xl font-bold text-cyan-400 font-mono">{fmt(metrics.totalSignals)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Strategies</div>
              <div className="text-xl font-bold text-violet-400 font-mono">{metrics.strategiesActive}/17</div>
            </div>
          </div>
        </div>

        {/* ═══ PIPELINE STRIP ═══ */}
        <div className="mb-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[600px]">
            {stages.map((stage, i) => (
              <div key={stage.name} className="flex items-center flex-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex-1 min-w-0">
                  <stage.icon className={`w-3.5 h-3.5 flex-shrink-0 ${stage.color}`} />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stage.name}</div>
                    <div className={`text-sm font-bold font-mono ${stage.color}`}>{stage.value}</div>
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div className="text-slate-600 px-1 flex-shrink-0">
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ MAIN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

          {/* LEFT: Live Signals (2/3) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Next Signal Countdown + Live Badge */}
            <div className="rounded-xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Radio className={`w-5 h-5 ${activeSignals.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                    <h2 className="text-lg font-bold text-white">Live Signals</h2>
                    {activeSignals.length > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        {activeSignals.length} Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-700/50 border border-slate-600/30 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        Scanning
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{new Date().toLocaleTimeString()}</span>
                </div>

                {/* Empty state: show countdown + recent signals from history */}
                {activeSignals.length === 0 && (
                  <div>
                    {/* Countdown bar */}
                    <div className="text-center py-6 border border-dashed border-slate-700/50 rounded-xl bg-slate-900/30 mb-4">
                      <Clock className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                      <div className="text-xs text-slate-400 font-semibold mb-2">Next Signal Window</div>
                      {countdown ? (
                        <>
                          <div className="text-3xl font-bold text-white font-mono tracking-tight">
                            {countdown.mins}:{countdown.secs.toString().padStart(2, '0')}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1.5">
                            {countdown.buffer > 0 ? `${countdown.buffer} signal${countdown.buffer > 1 ? 's' : ''} queued` : 'Pipeline analyzing markets'}
                          </div>
                          <div className="w-40 mx-auto mt-2.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-1000"
                              style={{ width: `${Math.min(100, Math.max(3, (1 - countdown.total / (10 * 60000)) * 100))}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500">Scanning {fmt(metrics.totalTickers)} tickers across 17 strategies</div>
                      )}
                    </div>

                    {/* Recent signals from history */}
                    {recentSignals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Recent Signals</span>
                        </div>
                        <div className="space-y-2">
                          {recentSignals.map(sig => (
                            <div key={sig.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-700/30 bg-slate-800/20">
                              <div className="flex items-center gap-3">
                                {sig.image && (
                                  <img src={sig.image} alt={sig.symbol} className="w-7 h-7 rounded-full border border-slate-700" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                )}
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sig.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {sig.direction}
                                </div>
                                <span className="text-sm font-bold text-white">{sig.symbol}</span>
                                <span className="text-xs text-slate-500 font-mono">{timeAgo(sig.timestamp)} ago</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-white font-mono">{sig.confidence}%</span>
                                {sig.outcome && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    sig.outcome === 'WIN' ? 'bg-emerald-500/10 text-emerald-400' :
                                    sig.outcome === 'LOSS' ? 'bg-rose-500/10 text-rose-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {sig.outcome}{sig.actualReturn !== undefined ? ` ${sig.actualReturn > 0 ? '+' : ''}${sig.actualReturn.toFixed(1)}%` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Signals */}
                {activeSignals.length > 0 && (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {activeSignals.map(sig => {
                      const conf = sig.confidence || sig.qualityScore || 0;
                      const expAt = sig.expiresAt || (sig.timestamp + (sig.timeLimit || 14400000));
                      const rem = Math.max(0, expAt - currentTime);
                      const remMins = Math.floor(rem / 60000);
                      const remSecs = Math.floor((rem % 60000) / 1000);
                      const isUrgent = rem < 300000;

                      return (
                        <div key={sig.id} className="rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-all p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {sig.image && (
                                <img src={sig.image} alt={sig.symbol} className="w-10 h-10 rounded-full border border-slate-700" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                                sig.direction === 'LONG'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {sig.direction}
                              </div>
                              <div className="min-w-0">
                                <div className="text-base font-bold text-white">{sig.symbol}</div>
                                <div className="text-xs text-slate-400">{sig.strategyName || sig.strategy || 'Multi-Strategy'} &middot; {timeAgo(sig.timestamp)} ago</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-5 flex-wrap">
                              {/* Levels */}
                              <div className="hidden sm:flex items-center gap-4 text-center">
                                <div>
                                  <div className="text-[9px] text-slate-500 uppercase font-bold">Entry</div>
                                  <div className="text-sm font-bold text-white font-mono">${sig.entry?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-rose-400 uppercase font-bold">SL</div>
                                  <div className="text-sm font-bold text-rose-400 font-mono">${sig.stopLoss?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-emerald-400 uppercase font-bold">Target</div>
                                  <div className="text-sm font-bold text-emerald-400 font-mono">${sig.targets?.[0]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</div>
                                </div>
                              </div>

                              {/* Confidence + Expiry */}
                              <div className="text-right">
                                <div className={`text-2xl font-extrabold font-mono ${conf >= 80 ? 'text-emerald-400' : conf >= 70 ? 'text-cyan-400' : 'text-amber-400'}`}>
                                  {conf}%
                                </div>
                                <div className={`text-[10px] font-bold font-mono ${isUrgent ? 'text-rose-400' : 'text-slate-500'}`}>
                                  {rem <= 0 ? 'EXPIRED' : `${remMins}:${remSecs.toString().padStart(2, '0')}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Stats Panel (1/3) */}
          <div className="space-y-5">
            {/* 24h Performance */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">24h Performance</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Signals</div>
                  <div className="text-2xl font-bold text-white font-mono">{dayStats.completed}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{fmtDec(dayStats.winRate)}%</div>
                  <div className="text-[10px] text-slate-500 font-mono">{dayStats.wins}W / {dayStats.losses}L</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 col-span-2">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total Return</div>
                  <div className={`text-2xl font-bold font-mono flex items-center gap-1.5 ${dayStats.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dayStats.totalReturn >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    {dayStats.totalReturn > 0 ? '+' : ''}{fmtDec(dayStats.totalReturn)}%
                  </div>
                </div>
              </div>
            </div>

            {/* ML Engine */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">ML Engine</h3>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${
                  zetaMetrics.health === 'OPTIMAL' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                  zetaMetrics.health === 'GOOD' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' :
                  zetaMetrics.health === 'FAIR' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                  'text-rose-400 border-rose-500/30 bg-rose-500/10'
                }`}>
                  {zetaMetrics.health}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Accuracy</span>
                  <span className="text-sm font-bold text-fuchsia-400 font-mono">{fmtDec(zetaMetrics.mlAccuracy)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Outcomes Learned</span>
                  <span className="text-sm font-bold text-white font-mono">{zetaMetrics.totalOutcomes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Top Strategy</span>
                  <span className="text-xs font-bold text-violet-400 truncate max-w-[140px]">{zetaMetrics.topStrategy || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Training Cycles</span>
                  <span className="text-sm font-bold text-white font-mono">{zetaMetrics.trainingCount}</span>
                </div>
                {metrics.currentRegime && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Market Regime</span>
                    <span className="text-xs font-bold text-cyan-400 uppercase">{metrics.currentRegime}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline Stats */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pipeline</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tickers Scanned</span>
                  <span className="font-bold text-cyan-400 font-mono">{fmt(metrics.totalTickers)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Analyses</span>
                  <span className="font-bold text-white font-mono">{fmt(metrics.totalAnalyses)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Approval Rate</span>
                  <span className="font-bold text-amber-400 font-mono">{fmtDec(metrics.approvalRate)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Delta Pass Rate</span>
                  <span className="font-bold text-emerald-400 font-mono">{fmtDec(metrics.deltaPassRate || 0)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Avg Latency</span>
                  <span className="font-bold text-white font-mono">{metrics.avgLatency ? `${metrics.avgLatency.toFixed(0)}ms` : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SIGNAL HISTORY ═══ */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Signal History</h2>
                <span className="text-xs text-slate-500 font-mono">{signalHistory.length} signals &middot; 24h</span>
              </div>
              <a href="/intelligence-hub/monthly" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                Monthly Stats &rarr;
              </a>
            </div>
          </div>

          {signalHistory.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium">No signals yet</p>
              <p className="text-xs text-slate-500 mt-1">Signals will appear as the pipeline generates them</p>
            </div>
          ) : (
            <div>
              <div className="divide-y divide-slate-800/40">
                {signalHistory.slice((currentPage - 1) * SIGNALS_PER_PAGE, currentPage * SIGNALS_PER_PAGE).map(sig => {
                  const isExpanded = expandedSignalId === sig.id;

                  return (
                    <div key={sig.id}>
                      <button
                        onClick={() => setExpandedSignalId(isExpanded ? null : sig.id)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {sig.image && (
                            <img src={sig.image} alt={sig.symbol} className="w-8 h-8 rounded-full border border-slate-700 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          <div className={`w-14 text-center py-1 rounded text-xs font-bold ${
                            sig.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {sig.direction}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-white">{sig.symbol}</span>
                            <span className="text-xs text-slate-500 ml-2 font-mono">{timeAgo(sig.timestamp)} ago</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-white font-mono">{sig.confidence}%</span>
                          {sig.outcome && (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sig.outcome === 'WIN' ? 'bg-emerald-500/10 text-emerald-400' :
                                sig.outcome === 'LOSS' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>
                                {sig.outcome}
                              </span>
                              {sig.actualReturn !== undefined && (
                                <span className={`text-xs font-bold font-mono ${sig.actualReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {sig.actualReturn > 0 ? '+' : ''}{sig.actualReturn.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-5 pb-4 border-t border-slate-800/30 bg-slate-900/30 animate-in slide-in-from-top-2 duration-200">
                          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {sig.entry && (
                              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
                                <div className="text-[9px] text-slate-500 uppercase font-bold">Entry</div>
                                <div className="text-sm font-bold text-white font-mono">${sig.entry.toFixed(2)}</div>
                              </div>
                            )}
                            {sig.stopLoss && (
                              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-rose-500/20">
                                <div className="text-[9px] text-rose-400 uppercase font-bold">Stop Loss</div>
                                <div className="text-sm font-bold text-rose-400 font-mono">${sig.stopLoss.toFixed(2)}</div>
                              </div>
                            )}
                            {sig.riskRewardRatio && (
                              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-cyan-500/20">
                                <div className="text-[9px] text-cyan-400 uppercase font-bold">R:R</div>
                                <div className="text-sm font-bold text-cyan-400 font-mono">{sig.riskRewardRatio.toFixed(1)}:1</div>
                              </div>
                            )}
                            {sig.qualityScore && (
                              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-emerald-500/20">
                                <div className="text-[9px] text-emerald-400 uppercase font-bold">Quality</div>
                                <div className="text-sm font-bold text-emerald-400 font-mono">{sig.qualityScore.toFixed(0)}</div>
                              </div>
                            )}
                          </div>
                          {sig.targets && sig.targets.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {sig.targets.map((t, i) => (
                                <span key={i} className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 font-mono">
                                  T{i + 1}: ${t.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {sig.strategy && <span className="text-[10px] px-2 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded font-bold">{(sig.strategy as string).replace(/_/g, ' ')}</span>}
                            {sig.marketRegime && <span className="text-[10px] px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold">{sig.marketRegime}</span>}
                            {sig.mlProbability && <span className="text-[10px] px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 rounded font-bold font-mono">ML: {(sig.mlProbability * 100).toFixed(1)}%</span>}
                            {sig.exitReason && <span className="text-[10px] px-2 py-1 bg-slate-700/50 text-slate-300 border border-slate-600/30 rounded font-bold">{sig.exitReason.replace(/_/g, ' ')}</span>}
                          </div>
                          <div className="mt-3 text-[10px] text-slate-500 font-mono">
                            {new Date(sig.timestamp).toLocaleString()}
                            {sig.holdDuration && ` · held ${sig.holdDuration >= 3600000 ? `${(sig.holdDuration / 3600000).toFixed(1)}h` : `${Math.floor(sig.holdDuration / 60000)}m`}`}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/40">
                  <button
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setExpandedSignalId(null); }}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currentPage === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <span className="text-xs text-slate-500 font-mono">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setExpandedSignalId(null); }}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currentPage === totalPages ? 'text-slate-600 cursor-not-allowed' : 'text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20'
                    }`}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="text-center pb-6">
          <div className="inline-flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-slate-400">Autonomous 24/7</span>
            </span>
            <span className="text-slate-700">&middot;</span>
            <span className="font-mono">{fmt(metrics.totalSignals)} signals</span>
            <span className="text-slate-700">&middot;</span>
            <span className="font-mono">{formatUptime(metrics.uptime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

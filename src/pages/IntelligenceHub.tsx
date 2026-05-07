/**
 * IGX INTELLIGENCE HUB — Server-driven view of the autonomous trading stack
 *
 * Source of truth: `intelligence_signals` (cron-published, outcome-resolved by
 * signal-tick) + `arena_agent_sessions` + `arena_active_positions`
 * (cron-managed by trade-tick).
 *
 * No more legacy globalHubService noise. Every number on this page comes from
 * Supabase, every outcome is a real TP/SL/expiry resolution.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import {
  Activity,
  Brain,
  Target,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Shield,
  Clock,
  Sparkles,
  Bot,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { useServerSignals, type ServerSignal } from '@/hooks/useServerSignals';
import { supabase } from '@/integrations/supabase/client';
import { CryptoLogo } from '@/utils/cryptoLogos';

// ────────────────────────────────────────────────────────────────────────────
// Types pulled from arena_* tables (read-only here, written by trade-tick).
// ────────────────────────────────────────────────────────────────────────────

interface AgentSessionRow {
  agent_id: string;
  trades: number;
  wins: number;
  pnl: number;
  balance_delta: number;
  consecutive_losses: number;
  circuit_breaker_level: string;
  halted_until: string | null;
  last_trade_time: string | null;
}

interface ActivePositionRow {
  agent_id: string;
  symbol: string;
  display_symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  current_price: number;
  take_profit_price: number;
  stop_loss_price: number;
  strategy: string;
  market_state_at_entry: string;
  entry_time: string;
}

interface MarketStateRow {
  state: string;
  confidence: number;
  volatility: number;
  trend_strength: number;
  updated_at: string;
}

interface BrainStateRow {
  strategyBias?: Record<string, number>;
  intelStats?: Record<string, { sentiment: { trades: number; wins: number; contribution: number }; cascade: { trades: number; wins: number; contribution: number } }>;
  confidenceCal?: Record<string, { trades: number; wins: number }>;
  brainLastUpdate?: number;
}

const AGENT_LABELS: Record<string, { name: string; color: string; type: string }> = {
  alphax: { name: 'AlphaX',  color: 'bg-rose-500',    type: 'AGGRESSIVE'   },
  betax:  { name: 'BetaX',   color: 'bg-amber-500',   type: 'BALANCED'     },
  gammax: { name: 'GammaX',  color: 'bg-emerald-500', type: 'CONSERVATIVE' },
};

const INITIAL_BALANCE = 10_000;

// ────────────────────────────────────────────────────────────────────────────
// Small hooks — keep all server reads contained.
// ────────────────────────────────────────────────────────────────────────────

function useArenaState() {
  const [sessions, setSessions] = useState<AgentSessionRow[]>([]);
  const [positions, setPositions] = useState<ActivePositionRow[]>([]);
  const [market, setMarket] = useState<MarketStateRow | null>(null);
  const [brain, setBrain] = useState<BrainStateRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const [sRes, pRes, mRes, bRes] = await Promise.all([
        supabase.from('arena_agent_sessions').select('*'),
        supabase.from('arena_active_positions').select('*'),
        supabase.from('arena_market_state').select('*').limit(1).maybeSingle(),
        supabase.from('autonomous_state').select('state').eq('id', 'singleton').maybeSingle(),
      ]);
      if (!alive) return;
      setSessions((sRes.data ?? []) as AgentSessionRow[]);
      setPositions((pRes.data ?? []) as ActivePositionRow[]);
      setMarket((mRes.data as MarketStateRow) ?? null);
      setBrain(((bRes.data as any)?.state as BrainStateRow) ?? null);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 15_000); // refresh every 15s

    // Realtime subscription on positions so the panel reacts to opens/closes
    const channel = supabase
      .channel('arena-state-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_active_positions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_agent_sessions'   }, () => load())
      .subscribe();

    return () => {
      alive = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { sessions, positions, market, brain, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n >= 100 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(6);
}

function fmtPct(n: number | null | undefined, signed = true): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = signed && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function timeUntil(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function regimeBadgeStyle(state: string | null | undefined): { bg: string; text: string; label: string } {
  if (!state) return { bg: 'bg-slate-100',  text: 'text-slate-600',   label: 'UNKNOWN' };
  if (state.startsWith('BULLISH'))  return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: state };
  if (state.startsWith('BEARISH'))  return { bg: 'bg-rose-50',    text: 'text-rose-700',    label: state };
  return { bg: 'bg-slate-100', text: 'text-slate-700', label: state };
}

interface OutcomeStats {
  total: number;
  tp1: number;
  tp2: number;
  sl: number;
  expired: number;
  active: number;
  hitRate: number;       // (tp1+tp2) / (tp1+tp2+sl) — only counts resolved with TP/SL
  avgPL: number;         // average profit_loss_percent across resolved
  totalPL: number;       // sum of profit_loss_percent across resolved
  avgConfidence: number;
}

function computeStats(signals: ServerSignal[]): OutcomeStats {
  const stats: OutcomeStats = {
    total: signals.length, tp1: 0, tp2: 0, sl: 0, expired: 0, active: 0,
    hitRate: 0, avgPL: 0, totalPL: 0, avgConfidence: 0,
  };
  let plSum = 0;
  let plCount = 0;
  let confSum = 0;
  for (const s of signals) {
    confSum += s.confidence;
    if (s.status === 'active') { stats.active++; continue; }
    if (s.hitTarget === 2)        stats.tp2++;
    else if (s.hitTarget === 1)   stats.tp1++;
    else if (s.hitStopLoss)       stats.sl++;
    else                          stats.expired++;
    if (s.profitLossPercent != null) {
      plSum += s.profitLossPercent;
      plCount++;
    }
  }
  const wins = stats.tp1 + stats.tp2;
  const decided = wins + stats.sl;
  stats.hitRate = decided > 0 ? (wins / decided) * 100 : 0;
  stats.avgPL = plCount > 0 ? plSum / plCount : 0;
  stats.totalPL = plSum;
  stats.avgConfidence = signals.length > 0 ? confSum / signals.length : 0;
  return stats;
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function IntelligenceHub({ embedded = false }: { embedded?: boolean }) {
  const { signals, loading: signalsLoading, error, realtimeConnected } = useServerSignals({
    status: 'any',
    limit: 100,
  });
  const { sessions, positions, market, brain, loading: arenaLoading } = useArenaState();

  // Force rerender every second so countdowns tick.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const activeSignals = useMemo(() => signals.filter(s => s.status === 'active'), [signals]);
  const closedSignals = useMemo(() => signals.filter(s => s.status !== 'active'), [signals]);
  const stats24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return computeStats(signals.filter(s => new Date(s.createdAt).getTime() >= cutoff));
  }, [signals, tick]);
  const statsAll = useMemo(() => computeStats(signals), [signals]);

  const tradedAgents = sessions.filter(s => (s.trades ?? 0) > 0);
  const totalAgentTrades = tradedAgents.reduce((s, x) => s + (x.trades ?? 0), 0);
  const totalAgentWins = tradedAgents.reduce((s, x) => s + (x.wins ?? 0), 0);
  const totalBalanceDelta = sessions.reduce((s, x) => s + Number(x.balance_delta ?? 0), 0);
  const agentWinRate = totalAgentTrades > 0 ? (totalAgentWins / totalAgentTrades) * 100 : 0;

  const haltedAgents = sessions.filter(s => s.circuit_breaker_level && s.circuit_breaker_level !== 'ACTIVE').length;

  const regime = regimeBadgeStyle(market?.state);

  const intelRegimes = brain?.intelStats ? Object.entries(brain.intelStats) : [];
  const confCalBins = brain?.confidenceCal ? Object.entries(brain.confidenceCal) : [];
  const biasCells = brain?.strategyBias ? Object.keys(brain.strategyBias).length : 0;

  const Header = (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Brain className="h-6 w-6 text-orange-500" />
          Intelligence Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Server-resolved signals + autonomous trading agents. Updates every 5 minutes.
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          {realtimeConnected ? 'Realtime connected' : 'Connecting…'}
        </div>
        <div className={`px-2 py-1 rounded-md ${regime.bg} ${regime.text} text-[11px] font-semibold`}>
          {regime.label}
        </div>
      </div>
    </div>
  );

  const KPIs = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Signals 24h</span>
          <Sparkles className="h-4 w-4 text-orange-500" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{stats24h.total}</div>
        <div className="text-[11px] text-slate-500 mt-1">
          {stats24h.active} active · {stats24h.tp1 + stats24h.tp2} won · {stats24h.sl} lost · {stats24h.expired} expired
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Hit Rate 24h</span>
          <Target className="h-4 w-4 text-emerald-500" />
        </div>
        <div className={`text-2xl font-bold mt-1 ${stats24h.hitRate >= 50 ? 'text-emerald-600' : stats24h.hitRate > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          {stats24h.tp1 + stats24h.tp2 + stats24h.sl > 0 ? `${stats24h.hitRate.toFixed(0)}%` : '—'}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {stats24h.tp2}× TP2 · {stats24h.tp1}× TP1 · {stats24h.sl}× SL
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Avg Outcome P/L</span>
          {stats24h.avgPL >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-rose-500" />}
        </div>
        <div className={`text-2xl font-bold mt-1 ${stats24h.avgPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {fmtPct(stats24h.avgPL)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Σ {fmtPct(stats24h.totalPL)} across {stats24h.tp1 + stats24h.tp2 + stats24h.sl + stats24h.expired} resolved
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Agent W/L</span>
          <Bot className="h-4 w-4 text-sky-500" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">
          {totalAgentTrades > 0 ? `${agentWinRate.toFixed(0)}%` : '—'}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {totalAgentWins}W / {totalAgentTrades - totalAgentWins}L · Δ ${fmt(totalBalanceDelta, 0)}
        </div>
      </Card>
    </div>
  );

  const ActiveSignals = (
    <Card className="p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-500" />
          Active Signals ({activeSignals.length})
        </h2>
        <span className="text-[11px] text-slate-500">TTL 4h · resolves to TP1/TP2/SL/EXPIRED</span>
      </div>

      {signalsLoading ? (
        <div className="text-sm text-slate-500 py-6 text-center">Loading signals…</div>
      ) : activeSignals.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">
          No active signals. Next scan in ≤5 min.
        </div>
      ) : (
        <div className="space-y-2">
          {activeSignals.slice(0, 8).map(s => {
            const isLong = s.signalType === 'LONG';
            return (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <CryptoLogo symbol={s.symbol} size={28} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{s.symbol}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isLong ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {s.signalType}
                      </span>
                      <span className="text-[11px] text-slate-500">conf {s.confidence}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[420px]">
                      {s.thesis ?? '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right text-xs">
                  <div>
                    <div className="text-slate-500">Entry</div>
                    <div className="font-mono text-slate-800">{fmtPrice(s.currentPrice)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">TP1 / SL</div>
                    <div className="font-mono">
                      <span className="text-emerald-600">{fmtPrice(s.target1)}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-rose-600">{fmtPrice(s.stopLoss)}</span>
                    </div>
                  </div>
                  <div className="w-20">
                    <div className="text-slate-500 flex items-center justify-end gap-1"><Clock className="h-3 w-3" />Expires</div>
                    <div className="font-mono text-slate-800">{timeUntil(s.expiresAt)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const RecentOutcomes = (
    <Card className="p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Recent Outcomes ({closedSignals.length})
        </h2>
        <span className="text-[11px] text-slate-500">Resolved on real OHLC, not last-tick</span>
      </div>

      {error && (
        <div className="text-xs text-rose-600 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          {error.message}
        </div>
      )}

      {closedSignals.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">
          No resolved signals yet. The first batch resolves within one full TTL window (≤4h).
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
          {closedSignals.slice(0, 30).map(s => {
            const win = (s.hitTarget ?? 0) > 0;
            const sl = s.hitStopLoss;
            const expired = !win && !sl;
            const tag = win ? `TP${s.hitTarget}` : sl ? 'SL' : 'EXPIRED';
            const tagBg = win ? 'bg-emerald-100 text-emerald-700' : sl ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500';
            const plColor = (s.profitLossPercent ?? 0) > 0 ? 'text-emerald-600' : (s.profitLossPercent ?? 0) < 0 ? 'text-rose-600' : 'text-slate-500';

            return (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded border border-slate-100 hover:bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <CryptoLogo symbol={s.symbol} size={18} />
                  <span className="font-semibold text-xs text-slate-900 w-10">{s.symbol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.signalType === 'LONG' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {s.signalType}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tagBg}`}>{tag}</span>
                  <span className="text-[11px] text-slate-400 truncate">{s.regime ?? '—'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">conf {s.confidence}</span>
                  <span className="font-mono text-slate-600">
                    {fmtPrice(s.currentPrice)} → {fmtPrice(s.exitPrice)}
                  </span>
                  <span className={`font-mono font-semibold w-16 text-right ${plColor}`}>
                    {fmtPct(s.profitLossPercent)}
                  </span>
                  <span className="text-[10px] text-slate-400 w-14 text-right">{timeAgo(s.completedAt ?? s.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const Agents = (
    <Card className="p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Bot className="h-4 w-4 text-sky-500" />
          Autonomous Agents
        </h2>
        <span className="text-[11px] text-slate-500">
          {haltedAgents > 0 ? `${haltedAgents} halted` : 'all live'}
        </span>
      </div>

      {arenaLoading ? (
        <div className="text-sm text-slate-500 py-6 text-center">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(AGENT_LABELS).map(([id, label]) => {
            const session = sessions.find(s => s.agent_id === id);
            const pos = positions.find(p => p.agent_id === id);
            const trades = session?.trades ?? 0;
            const wins = session?.wins ?? 0;
            const wr = trades > 0 ? (wins / trades) * 100 : 0;
            const balance = INITIAL_BALANCE + Number(session?.balance_delta ?? 0);
            const halted = session && session.circuit_breaker_level !== 'ACTIVE';

            return (
              <div key={id} className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${label.color}`} />
                    <span className="font-semibold text-sm text-slate-900">{label.name}</span>
                    <span className="text-[10px] text-slate-500">{label.type}</span>
                  </div>
                  {halted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {session?.circuit_breaker_level}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Trades</div>
                    <div className="font-bold text-slate-900">{trades}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Win Rate</div>
                    <div className={`font-bold ${trades > 0 && wr >= 50 ? 'text-emerald-600' : trades > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {trades > 0 ? `${wr.toFixed(0)}%` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Balance</div>
                    <div className={`font-bold ${balance > INITIAL_BALANCE ? 'text-emerald-600' : balance < INITIAL_BALANCE ? 'text-rose-600' : 'text-slate-700'}`}>
                      ${fmt(balance, 0)}
                    </div>
                  </div>
                </div>
                {pos ? (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Open</span>
                      <span className="font-mono text-slate-700">
                        {pos.direction} {pos.display_symbol} @ {fmtPrice(pos.entry_price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-slate-500">Strategy</span>
                      <span className="text-slate-600">{pos.strategy}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                    Idle — waiting for next setup
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const Brainpan = (
    <Card className="p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Brain className="h-4 w-4 text-orange-500" />
          Continuous Learning Brain
        </h2>
        <span className="text-[11px] text-slate-500">
          {biasCells} bias cells · {intelRegimes.length} regimes · {confCalBins.length} confidence bins
        </span>
      </div>

      {biasCells === 0 && intelRegimes.length === 0 && confCalBins.length === 0 ? (
        <div className="text-sm text-slate-500 py-4 text-center">
          Brain is cold-starting. The first ~10 closed trades populate strategy bias and confidence calibration.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Confidence Calibration</div>
            {confCalBins.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic">no data yet</div>
            ) : (
              <div className="space-y-1">
                {confCalBins.sort(([a], [b]) => a.localeCompare(b)).map(([bin, cal]) => {
                  const wr = cal.trades > 0 ? (cal.wins / cal.trades) * 100 : 0;
                  return (
                    <div key={bin} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-slate-50">
                      <span className="font-mono text-slate-600">{bin}</span>
                      <span className="text-slate-700">{cal.wins}/{cal.trades} = <span className={`font-bold ${wr >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{wr.toFixed(0)}%</span></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Intel Source × Regime</div>
            {intelRegimes.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic">no data yet</div>
            ) : (
              <div className="space-y-1">
                {intelRegimes.map(([regimeName, stats]) => (
                  <div key={regimeName} className="text-[11px] py-1 px-2 rounded bg-slate-50">
                    <div className="font-semibold text-slate-700 mb-0.5">{regimeName}</div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>sentiment</span>
                      <span>{stats.sentiment.wins}/{stats.sentiment.trades} · contrib <span className="font-mono">{stats.sentiment.contribution.toFixed(2)}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>cascade</span>
                      <span>{stats.cascade.wins}/{stats.cascade.trades} · contrib <span className="font-mono">{stats.cascade.contribution.toFixed(2)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );

  const PipelineSummary = (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          All-time Stats
        </h2>
        <span className="text-[11px] text-slate-500">
          since first signal
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total signals"   value={`${statsAll.total}`} />
        <Stat label="Wins (TP1+TP2)"  value={`${statsAll.tp1 + statsAll.tp2}`} good={statsAll.tp1 + statsAll.tp2 > statsAll.sl} />
        <Stat label="Losses (SL)"     value={`${statsAll.sl}`} bad={statsAll.sl > statsAll.tp1 + statsAll.tp2} />
        <Stat label="Hit Rate"        value={statsAll.tp1 + statsAll.tp2 + statsAll.sl > 0 ? `${statsAll.hitRate.toFixed(0)}%` : '—'} />
        <Stat label="Σ P/L"           value={fmtPct(statsAll.totalPL)} good={statsAll.totalPL > 0} bad={statsAll.totalPL < 0} />
      </div>
    </Card>
  );

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-orange-50/30 via-white to-slate-50/50'}>
      {!embedded && <AppHeader />}
      <div className={embedded ? '' : 'container mx-auto px-6 py-8 max-w-[1400px]'}>
        {Header}
        {KPIs}
        {ActiveSignals}
        {RecentOutcomes}
        {Agents}
        {Brainpan}
        {PipelineSummary}
      </div>
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  const color = good ? 'text-emerald-600' : bad ? 'text-rose-600' : 'text-slate-900';
  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white">
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}


/**
 * useServerSignals — subscribe to server-generated intelligence_signals.
 *
 * Phase 2 hook. The Vercel cron `/api/agents/signal-tick` writes to the
 * `intelligence_signals` table every 5 minutes. This hook:
 *   - Loads currently-active signals on mount
 *   - Subscribes to Realtime INSERTs so new server signals appear in ~1s
 *   - Returns them in newest-first order
 *
 * This hook is independent of globalHubService (which is the legacy
 * browser-side pipeline). The browser pipeline is being phased out — once
 * IntelligenceHub.tsx adopts this hook as its source of truth, the browser
 * pipeline can be deleted entirely.
 *
 * Usage in any component:
 *   const { signals, loading } = useServerSignals();
 *   signals.map(s => <SignalCard signal={s} />);
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServerSignal {
  id: string;
  symbol: string;             // 'BTC' (no USDT suffix)
  signalType: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  currentPrice: number;
  entryMin: number;
  entryMax: number;
  target1: number | null;
  target2: number | null;
  stopLoss: number | null;
  riskLevel: string;
  strength: string;
  status: string;             // 'active' | 'expired' | 'completed'
  expiresAt: string;
  createdAt: string;
  // Phase 0 extension columns
  regime: string | null;
  fearGreedIndex: number | null;
  fundingRate: number | null;
  thesis: string | null;
  invalidation: string | null;
}

function rowToSignal(row: any): ServerSignal {
  return {
    id: row.id,
    symbol: row.symbol,
    signalType: row.signal_type,
    confidence: Number(row.confidence ?? 0),
    currentPrice: Number(row.current_price ?? 0),
    entryMin: Number(row.entry_min ?? 0),
    entryMax: Number(row.entry_max ?? 0),
    target1: row.target_1 != null ? Number(row.target_1) : null,
    target2: row.target_2 != null ? Number(row.target_2) : null,
    stopLoss: row.stop_loss != null ? Number(row.stop_loss) : null,
    riskLevel: row.risk_level ?? 'MEDIUM',
    strength: String(row.strength ?? '5'),
    status: row.status ?? 'active',
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    regime: row.regime ?? null,
    fearGreedIndex: row.fear_greed_index != null ? Number(row.fear_greed_index) : null,
    fundingRate: row.funding_rate != null ? Number(row.funding_rate) : null,
    thesis: row.thesis ?? null,
    invalidation: row.invalidation ?? null,
  };
}

export interface UseServerSignalsOptions {
  /** Maximum signals to keep in memory. Default 20. */
  limit?: number;
  /** Only return signals matching this status. Default 'active'. */
  status?: 'active' | 'expired' | 'completed' | 'any';
}

export interface UseServerSignalsResult {
  signals: ServerSignal[];
  loading: boolean;
  error: Error | null;
  /** True once Realtime channel has confirmed subscription. */
  realtimeConnected: boolean;
}

export function useServerSignals(opts: UseServerSignalsOptions = {}): UseServerSignalsResult {
  const limit = opts.limit ?? 20;
  const status = opts.status ?? 'active';

  const [signals, setSignals] = useState<ServerSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    // Initial load
    (async () => {
      try {
        let q = supabase
          .from('intelligence_signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (status !== 'any') {
          q = q.eq('status', status);
        }
        const { data, error: fetchError } = await q;
        if (!alive) return;
        if (fetchError) throw fetchError;
        setSignals((data ?? []).map(rowToSignal));
        setLoading(false);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err : new Error('Failed to load server signals'));
        setLoading(false);
      }
    })();

    // Realtime subscription — INSERTs from cron land here within ~1s
    const channel = supabase
      .channel('intelligence-signals-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'intelligence_signals' },
        (payload: any) => {
          if (!alive) return;
          const row = payload.new;
          if (!row) return;
          if (status !== 'any' && row.status !== status) return;
          const signal = rowToSignal(row);
          setSignals(prev => {
            // Dedup by id (in case of replay)
            if (prev.some(s => s.id === signal.id)) return prev;
            return [signal, ...prev].slice(0, limit);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'intelligence_signals' },
        (payload: any) => {
          if (!alive) return;
          const row = payload.new;
          if (!row) return;
          // If signal flipped to expired/completed and we filter by 'active', drop it
          setSignals(prev => {
            const updated = rowToSignal(row);
            const filtered = status !== 'any' && updated.status !== status
              ? prev.filter(s => s.id !== updated.id)
              : prev.map(s => s.id === updated.id ? updated : s);
            return filtered;
          });
        },
      )
      .subscribe(s => {
        if (s === 'SUBSCRIBED') setRealtimeConnected(true);
      });

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [limit, status]);

  return { signals, loading, error, realtimeConnected };
}

/**
 * USE TIERED SIGNALS HOOK
 *
 * Manages tier-based signal fetching and quota tracking
 * Integrates with Supabase user_signals table
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { tieredSignalGate, type UserTier } from '@/services/tieredSignalGate';

export interface TieredSignal {
  id: string;
  signal_id: string;
  symbol: string;
  signal_type: 'LONG' | 'SHORT';
  confidence: number;
  quality_score: number;
  entry_price: number | null;
  take_profit: number[] | null;
  stop_loss: number | null;
  expires_at: string;
  metadata: any;
  full_details: boolean;
  viewed: boolean;
  clicked: boolean;
  created_at: string;
  tier: UserTier;
}

export interface QuotaStatus {
  tier: UserTier;
  limit: number;
  used: number;
  remaining: number;
}

export interface MissedSignal {
  symbol: string;
  signalType: 'LONG' | 'SHORT';
  confidence: number;
  tier: 'PRO' | 'MAX';
  timestamp: string;
}

export function useTieredSignals() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<TieredSignal[]>([]);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [missedSignals, setMissedSignals] = useState<MissedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's signals from database
  const fetchSignals = async () => {
    if (!user) {
      setSignals([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_signals')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching tiered signals:', fetchError);
        setError(fetchError.message);
        return;
      }

      setSignals(data || []);
      setError(null);
    } catch (err) {
      console.error('Error in fetchSignals:', err);
      setError('Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  };

  // Fetch quota status
  const fetchQuotaStatus = async () => {
    if (!user) {
      setQuotaStatus(null);
      return;
    }

    try {
      const status = await tieredSignalGate.getUserQuotaStatus(user.id);
      setQuotaStatus(status);
    } catch (err) {
      console.error('Error fetching quota status:', err);
    }
  };

  // Fetch missed signals (signals sent to higher tiers)
  const fetchMissedSignals = async () => {
    if (!user || !quotaStatus) return;

    // Only show missed signals to FREE users
    if (quotaStatus.tier !== 'FREE') {
      setMissedSignals([]);
      return;
    }

    try {
      // Get all signals from PRO/MAX tiers created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error: missedError } = await supabase
        .from('user_signals')
        .select('symbol, signal_type, confidence, tier, created_at')
        .in('tier', ['PRO', 'MAX'])
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (missedError) {
        console.error('Error fetching missed signals:', missedError);
        return;
      }

      // Convert to MissedSignal format
      const missed: MissedSignal[] =
        data?.map((s) => ({
          symbol: s.symbol,
          signalType: s.signal_type as 'LONG' | 'SHORT',
          confidence: s.confidence,
          tier: s.tier as 'PRO' | 'MAX',
          timestamp: s.created_at,
        })) || [];

      setMissedSignals(missed);
    } catch (err) {
      console.error('Error in fetchMissedSignals:', err);
    }
  };

  // Mark signal as viewed
  const markViewed = async (signalId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_signals')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', signalId)
        .eq('user_id', user.id);

      // Update local state
      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, viewed: true } : s))
      );
    } catch (err) {
      console.error('Error marking signal as viewed:', err);
    }
  };

  // Mark signal as clicked
  const markClicked = async (signalId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_signals')
        .update({ clicked: true, clicked_at: new Date().toISOString() })
        .eq('id', signalId)
        .eq('user_id', user.id);

      // Update local state
      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, clicked: true } : s))
      );
    } catch (err) {
      console.error('Error marking signal as clicked:', err);
    }
  };

  // Subscribe to real-time signal updates
  useEffect(() => {
    if (!user) return;

    fetchSignals();
    fetchQuotaStatus();
    fetchMissedSignals();

    // Set up real-time subscription
    const channel = supabase
      .channel('user-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_signals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🎯 New tiered signal received:', payload.new);
          setSignals((prev) => [payload.new as TieredSignal, ...prev]);
          fetchQuotaStatus(); // Update quota
        }
      )
      .subscribe();

    // Polling backup (every 10 seconds)
    const interval = setInterval(() => {
      fetchSignals();
      fetchQuotaStatus();
    }, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  // Refresh missed signals when quota changes
  useEffect(() => {
    if (quotaStatus) {
      fetchMissedSignals();
    }
  }, [quotaStatus?.tier]);

  return {
    signals,
    quotaStatus,
    missedSignals,
    loading,
    error,
    markViewed,
    markClicked,
    refresh: fetchSignals,
  };
}

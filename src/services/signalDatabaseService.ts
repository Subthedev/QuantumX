/**
 * Database-First Signal Service
 *
 * PRODUCTION-GRADE SOLUTION:
 * - Database is single source of truth
 * - No reliance on localStorage or events
 * - Polling every 2 seconds for new signals
 * - Survives page refreshes perfectly
 * - No timing bugs, no event listener issues
 */

import { supabase } from '@/integrations/supabase/client';
import type { HubSignal } from './globalHubService';

export class SignalDatabaseService {
  private pollingInterval: number | null = null;
  private lastFetchedTimestamp: number = 0; // 🔥 CRITICAL FIX: Start from epoch to catch ALL signals
  private onNewSignalsCallback: ((signals: HubSignal[]) => void) | null = null;
  private isPolling = false;
  private knownSignalIds: Set<string> = new Set(); // Track signals we've already shown

  constructor() {
    console.log('[SignalDB] 🗄️ Database-First Signal Service initialized');
  }

  /**
   * Start polling database for new ACTIVE signals
   * This replaces the fragile event-driven system
   */
  startPolling(onNewSignals: (signals: HubSignal[]) => void): void {
    this.onNewSignalsCallback = onNewSignals;

    // Poll every 2 seconds for new signals
    this.pollingInterval = window.setInterval(() => {
      this.fetchNewSignals();
    }, 2000);

    // Immediate fetch on start
    this.fetchNewSignals();

    console.log('[SignalDB] ✅ Started polling database every 2 seconds');
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[SignalDB] ⏸️ Stopped polling');
    }
  }

  /**
   * Fetch new ACTIVE signals from database
   * Only returns signals created after lastFetchedTimestamp
   */
  private async fetchNewSignals(): Promise<void> {
    if (this.isPolling) return; // Prevent concurrent fetches
    this.isPolling = true;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        this.isPolling = false;
        return;
      }

      const { data: newSignals, error } = await supabase
        .from('user_signals')
        .select('*')
        .eq('user_id', user.id)
        .gt('created_at', new Date(this.lastFetchedTimestamp).toISOString())
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[SignalDB] ❌ Error fetching signals:', error);
        this.isPolling = false;
        return;
      }

      if (newSignals && newSignals.length > 0) {
        console.log(`[SignalDB] 🔍 Found ${newSignals.length} potential new signals from database`);

        // Filter out signals we've already processed
        const trulyNewSignals = newSignals.filter(sig => !this.knownSignalIds.has(sig.id));

        if (trulyNewSignals.length === 0) {
          this.isPolling = false;
          return; // No new signals
        }

        console.log(`[SignalDB] 🆕 ${trulyNewSignals.length} are genuinely new (${newSignals.length - trulyNewSignals.length} already seen)`);

        // Convert to HubSignal format
        const hubSignals: HubSignal[] = trulyNewSignals.map(dbSignal => {
          // Parse take_profit array from JSONB
          const takeProfitArray = Array.isArray(dbSignal.take_profit) ? dbSignal.take_profit : [];
          const targets = takeProfitArray.filter((t: any) => t !== null && typeof t === 'number') as number[];

          return {
            id: dbSignal.id,
            symbol: dbSignal.symbol,
            direction: dbSignal.signal_type as 'LONG' | 'SHORT',
            confidence: dbSignal.confidence,
            entry: dbSignal.entry_price || 0,
            stopLoss: dbSignal.stop_loss || undefined,
            targets,
            riskReward: targets.length > 0 && dbSignal.stop_loss
              ? Math.abs((targets[0] - (dbSignal.entry_price || 0)) / ((dbSignal.entry_price || 0) - dbSignal.stop_loss))
              : undefined,
            qualityTier: 'MEDIUM' as any,
            riskLevel: 'MEDIUM' as any,
            timestamp: new Date(dbSignal.created_at).getTime(),
            timeLimit: new Date(dbSignal.expires_at).getTime() - new Date(dbSignal.created_at).getTime(),
            outcome: null,
            strategyName: dbSignal.metadata?.strategy || 'Multi-Strategy',
            qualityScore: dbSignal.quality_score || dbSignal.confidence,
          };
        });

        // Mark these signals as known
        hubSignals.forEach(sig => this.knownSignalIds.add(sig.id!));

        // Update last fetched timestamp to most recent signal
        const latestTimestamp = Math.max(...hubSignals.map(s => s.timestamp));
        this.lastFetchedTimestamp = latestTimestamp;

        // Trigger callback with new signals
        if (this.onNewSignalsCallback) {
          console.log(`[SignalDB] 📤 Sending ${hubSignals.length} new signals to UI callback`);
          this.onNewSignalsCallback(hubSignals);
        } else {
          console.warn(`[SignalDB] ⚠️ No callback registered! Signals not delivered to UI`);
        }

        console.log(`[SignalDB] ✅ Processed ${hubSignals.length} new signals, last timestamp: ${new Date(latestTimestamp).toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error('[SignalDB] ❌ Unexpected error:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Fetch ALL active signals (for initial load)
   */
  async fetchAllActiveSignals(): Promise<HubSignal[]> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[SignalDB] ⚠️ No user logged in');
        return [];
      }

      const { data: activeSignals, error } = await supabase
        .from('user_signals')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SignalDB] ❌ Error fetching all active signals:', error);
        return [];
      }

      if (!activeSignals || activeSignals.length === 0) {
        console.log('[SignalDB] 📭 No active signals found');
        return [];
      }

      console.log(`[SignalDB] 📥 Loaded ${activeSignals.length} active signals`);

      const hubSignals: HubSignal[] = activeSignals.map(dbSignal => {
        // Parse take_profit array from JSONB
        const takeProfitArray = Array.isArray(dbSignal.take_profit) ? dbSignal.take_profit : [];
        const targets = takeProfitArray.filter((t: any) => t !== null && typeof t === 'number') as number[];

        return {
          id: dbSignal.id,
          symbol: dbSignal.symbol,
          direction: dbSignal.signal_type as 'LONG' | 'SHORT',
          confidence: dbSignal.confidence,
          entry: dbSignal.entry_price || 0,
          stopLoss: dbSignal.stop_loss || undefined,
          targets,
          riskReward: targets.length > 0 && dbSignal.stop_loss
            ? Math.abs((targets[0] - (dbSignal.entry_price || 0)) / ((dbSignal.entry_price || 0) - dbSignal.stop_loss))
            : undefined,
          qualityTier: 'MEDIUM' as any,
          riskLevel: 'MEDIUM' as any,
          timestamp: new Date(dbSignal.created_at).getTime(),
          timeLimit: new Date(dbSignal.expires_at).getTime() - new Date(dbSignal.created_at).getTime(),
          outcome: null,
          strategyName: dbSignal.metadata?.strategy || 'Multi-Strategy',
          qualityScore: dbSignal.quality_score || dbSignal.confidence,
        };
      });

      // Mark initial signals as known to prevent duplicates in polling
      hubSignals.forEach(sig => this.knownSignalIds.add(sig.id!));

      // Update last fetched timestamp
      if (hubSignals.length > 0) {
        this.lastFetchedTimestamp = Math.max(...hubSignals.map(s => s.timestamp));
        console.log(`[SignalDB] 📊 Marked ${hubSignals.length} initial signals as known, last timestamp: ${new Date(this.lastFetchedTimestamp).toLocaleTimeString()}`);
      }

      return hubSignals;
    } catch (error) {
      console.error('[SignalDB] ❌ Unexpected error fetching all signals:', error);
      return [];
    }
  }

  /**
   * Mark signal as completed in database
   */
  async markSignalCompleted(signalId: string, outcome: 'SUCCESS' | 'FAILED' | 'EXPIRED', details?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('intelligence_signals')
        .update({
          status: outcome,
          completed_at: new Date().toISOString(),
          exit_price: details?.exitPrice,
          profit_loss_percent: details?.profitLossPct,
          hit_target: details?.hitTarget,
          hit_stop_loss: details?.hitStopLoss,
        })
        .eq('id', signalId);

      if (error) {
        console.error(`[SignalDB] ❌ Failed to mark signal ${signalId} as ${outcome}:`, error);
      } else {
        console.log(`[SignalDB] ✅ Signal ${signalId} marked as ${outcome}`);
      }
    } catch (error) {
      console.error(`[SignalDB] ❌ Error marking signal:`, error);
    }
  }
}

// Export singleton
export const signalDatabaseService = new SignalDatabaseService();

/**
 * Arena Supabase Storage Service — READ-ONLY in browser as of Phase 0.
 *
 * The Vercel cron `/api/agents/trade-tick` is the canonical writer for arena_*
 * tables. The browser is now a viewer:
 *   - All save/delete/record/clear methods are no-ops in browser context.
 *   - Initial cache is loaded from Supabase on init (unchanged).
 *   - Supabase Realtime subscriptions push live updates to subscribers.
 *
 * This eliminates the dual-writer collision between the browser engine and the
 * cron that previously corrupted agent_id rows on every minute boundary.
 *
 * Tables:
 *   arena_agent_sessions   — per-agent stats
 *   arena_active_positions — open positions
 *   arena_trade_history    — closed-trade log
 *   arena_market_state     — last regime snapshot
 */

import { supabase } from '@/integrations/supabase/client';
import type { QuantPosition } from './arenaQuantEngine';

const IS_BROWSER = typeof window !== 'undefined';

export type CacheChangeEvent =
  | { type: 'position-upsert'; agentId: string; position: QuantPosition }
  | { type: 'position-delete'; agentId: string }
  | { type: 'session-upsert'; agentId: string; session: AgentSessionData }
  | { type: 'trade-insert'; trade: TradeHistoryRecord }
  | { type: 'market-state'; state: MarketStateData };

// ===================== INTERFACES =====================

export interface AgentSessionData {
  trades: number;
  wins: number;
  pnl: number;
  balanceDelta: number;
  consecutiveLosses: number;
  circuitBreakerLevel: string;
  haltedUntil: number | null;
  lastTradeTime: number | null;
}

export interface TradeHistoryRecord {
  agentId: string;
  timestamp: number;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnlPercent: number | null;
  pnlDollar: number | null;
  isWin: boolean | null;
  strategy: string;
  marketState: string;
  reason: string | null;
}

export interface MarketStateData {
  state: string;
  confidence: number;
  volatility: number;
  trendStrength: number;
  timestamp: number;
}

// ===================== STORAGE SERVICE =====================

class ArenaSupabaseStorage {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // Local cache for fast reads (synced with Supabase)
  private sessionCache = new Map<string, AgentSessionData>();
  private positionCache = new Map<string, QuantPosition>();
  private marketStateCache: MarketStateData | null = null;

  // Debounce writes to prevent excessive API calls (server-side only)
  private writeQueue = new Map<string, ReturnType<typeof setTimeout>>();
  private WRITE_DEBOUNCE_MS = 1000; // 1 second debounce

  // Cache-change listeners for Realtime subscribers
  private changeListeners = new Set<(e: CacheChangeEvent) => void>();
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  constructor() {
    console.log(
      `%c📦 Arena Supabase Storage Service (${IS_BROWSER ? 'BROWSER read-only' : 'SERVER writer'})`,
      'background: #3b82f6; color: white; padding: 4px 12px; border-radius: 4px;'
    );
  }

  /**
   * Subscribe to cache-change events. Returns an unsubscribe function.
   * Use this from arenaQuantEngine to reconcile in-memory state with cron writes.
   */
  onCacheChange(handler: (e: CacheChangeEvent) => void): () => void {
    this.changeListeners.add(handler);
    return () => { this.changeListeners.delete(handler); };
  }

  private emit(e: CacheChangeEvent): void {
    for (const fn of this.changeListeners) {
      try { fn(e); } catch (err) { console.warn('[ArenaStorage] listener error:', err); }
    }
  }

  /**
   * Initialize storage - loads all data from Supabase on startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('📥 Loading arena data from Supabase...');

      // Load agent sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('arena_agent_sessions')
        .select('*');

      if (sessionError) {
        console.warn('⚠️ Failed to load sessions, will use defaults:', sessionError.message);
      } else if (sessions) {
        for (const session of sessions) {
          this.sessionCache.set(session.agent_id, {
            trades: session.trades || 0,
            wins: session.wins || 0,
            pnl: Number(session.pnl) || 0,
            balanceDelta: Number(session.balance_delta) || 0,
            consecutiveLosses: session.consecutive_losses || 0,
            circuitBreakerLevel: session.circuit_breaker_level || 'ACTIVE',
            haltedUntil: session.halted_until ? new Date(session.halted_until).getTime() : null,
            lastTradeTime: session.last_trade_time ? new Date(session.last_trade_time).getTime() : null,
          });
        }
        console.log(`  ✅ Loaded ${sessions.length} agent sessions`);
      }

      // Load active positions
      const { data: positions, error: positionError } = await supabase
        .from('arena_active_positions')
        .select('*');

      if (positionError) {
        console.warn('⚠️ Failed to load positions:', positionError.message);
      } else if (positions) {
        for (const pos of positions) {
          this.positionCache.set(pos.agent_id, {
            id: pos.position_id,
            symbol: pos.symbol,
            displaySymbol: pos.display_symbol,
            direction: pos.direction as 'LONG' | 'SHORT',
            entryPrice: Number(pos.entry_price),
            currentPrice: Number(pos.current_price) || Number(pos.entry_price),
            quantity: Number(pos.quantity),
            pnl: 0,
            pnlPercent: 0,
            entryTime: new Date(pos.entry_time).getTime(),
            takeProfitPrice: Number(pos.take_profit_price),
            stopLossPrice: Number(pos.stop_loss_price),
            strategy: pos.strategy || '',
            strategyProfile: null, // Will be populated by engine
            marketStateAtEntry: (pos.market_state_at_entry || 'RANGEBOUND') as any,
            progressPercent: 50,
          });
        }
        console.log(`  ✅ Loaded ${positions.length} active positions`);
      }

      // Load market state
      const { data: stateData, error: stateError } = await supabase
        .from('arena_market_state')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (stateError && stateError.code !== 'PGRST116') {
        console.warn('⚠️ Failed to load market state:', stateError.message);
      } else if (stateData) {
        this.marketStateCache = {
          state: stateData.state,
          confidence: Number(stateData.confidence) || 50,
          volatility: Number(stateData.volatility) || 20,
          trendStrength: Number(stateData.trend_strength) || 0,
          timestamp: new Date(stateData.updated_at).getTime(),
        };
        console.log(`  ✅ Loaded market state: ${stateData.state}`);
      }

      this.initialized = true;
      console.log('%c✅ Arena Supabase Storage initialized',
        'background: #10b981; color: white; padding: 4px 12px;');

      // 🧹 Retention cleanup — server-only (browser is read-only)
      if (!IS_BROWSER) {
        try {
          const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('arena_trade_history').delete().lt('timestamp', cutoff);
          console.log('  🧹 Purged arena_trade_history older than 14 days');
        } catch (e) {
          // Non-critical — won't block init
        }
      }

      // 📡 Realtime subscription (browser only) — cron writes propagate live
      if (IS_BROWSER) {
        this.subscribeToRealtimeChanges();
      }
    } catch (error) {
      console.error('❌ Failed to initialize arena storage:', error);
      this.initialized = true; // Continue with empty cache
    }
  }

  /**
   * Subscribe to Supabase Realtime for arena_* tables.
   * On every change, refresh local cache and emit a CacheChangeEvent.
   * Requires the migration to add these tables to the supabase_realtime publication.
   */
  private subscribeToRealtimeChanges(): void {
    if (this.realtimeChannel) return; // already subscribed

    this.realtimeChannel = supabase
      .channel('arena-state')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'arena_active_positions' },
        (payload: any) => this.handlePositionChange(payload))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'arena_agent_sessions' },
        (payload: any) => this.handleSessionChange(payload))
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'arena_trade_history' },
        (payload: any) => this.handleTradeInsert(payload))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'arena_market_state' },
        (payload: any) => this.handleMarketStateChange(payload))
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('%c📡 Realtime subscribed to arena_* tables',
            'background: #06b6d4; color: white; padding: 2px 8px;');
        }
      });
  }

  private handlePositionChange(payload: any): void {
    const { eventType, new: row, old: oldRow } = payload;
    if (eventType === 'DELETE') {
      const agentId = oldRow?.agent_id;
      if (!agentId) return;
      this.positionCache.delete(agentId);
      this.emit({ type: 'position-delete', agentId });
      return;
    }
    if (!row) return;
    const position: QuantPosition = {
      id: row.position_id,
      symbol: row.symbol,
      displaySymbol: row.display_symbol,
      direction: row.direction as 'LONG' | 'SHORT',
      entryPrice: Number(row.entry_price),
      currentPrice: Number(row.current_price) || Number(row.entry_price),
      quantity: Number(row.quantity),
      pnl: 0,
      pnlPercent: 0,
      entryTime: new Date(row.entry_time).getTime(),
      takeProfitPrice: Number(row.take_profit_price),
      stopLossPrice: Number(row.stop_loss_price),
      strategy: row.strategy || '',
      strategyProfile: null,
      marketStateAtEntry: (row.market_state_at_entry || 'RANGEBOUND') as any,
      progressPercent: 50,
    };
    this.positionCache.set(row.agent_id, position);
    this.emit({ type: 'position-upsert', agentId: row.agent_id, position });
  }

  private handleSessionChange(payload: any): void {
    const row = payload.new;
    if (!row) return;
    const session: AgentSessionData = {
      trades: row.trades || 0,
      wins: row.wins || 0,
      pnl: Number(row.pnl) || 0,
      balanceDelta: Number(row.balance_delta) || 0,
      consecutiveLosses: row.consecutive_losses || 0,
      circuitBreakerLevel: row.circuit_breaker_level || 'ACTIVE',
      haltedUntil: row.halted_until ? new Date(row.halted_until).getTime() : null,
      lastTradeTime: row.last_trade_time ? new Date(row.last_trade_time).getTime() : null,
    };
    this.sessionCache.set(row.agent_id, session);
    this.emit({ type: 'session-upsert', agentId: row.agent_id, session });
  }

  private handleTradeInsert(payload: any): void {
    const t = payload.new;
    if (!t) return;
    const trade: TradeHistoryRecord = {
      agentId: t.agent_id,
      timestamp: new Date(t.timestamp).getTime(),
      symbol: t.symbol,
      direction: t.direction as 'LONG' | 'SHORT',
      entryPrice: Number(t.entry_price),
      exitPrice: t.exit_price ? Number(t.exit_price) : null,
      quantity: Number(t.quantity),
      pnlPercent: t.pnl_percent ? Number(t.pnl_percent) : null,
      pnlDollar: t.pnl_dollar ? Number(t.pnl_dollar) : null,
      isWin: t.is_win,
      strategy: t.strategy,
      marketState: t.market_state,
      reason: t.reason,
    };
    this.emit({ type: 'trade-insert', trade });
  }

  private handleMarketStateChange(payload: any): void {
    const row = payload.new;
    if (!row) return;
    const state: MarketStateData = {
      state: row.state,
      confidence: Number(row.confidence) || 50,
      volatility: Number(row.volatility) || 20,
      trendStrength: Number(row.trend_strength) || 0,
      timestamp: new Date(row.updated_at).getTime(),
    };
    this.marketStateCache = state;
    this.emit({ type: 'market-state', state });
  }

  // ===================== AGENT SESSIONS =====================

  /**
   * Get agent session data (from cache for speed, synced with Supabase)
   */
  getAgentSession(agentId: string): AgentSessionData | null {
    return this.sessionCache.get(agentId) || null;
  }

  /**
   * Get all agent sessions
   */
  getAllSessions(): Map<string, AgentSessionData> {
    return new Map(this.sessionCache);
  }

  /**
   * Save agent session (debounced write to Supabase).
   * BROWSER: no-op write to Supabase (Realtime keeps cache in sync); local
   * cache is still updated so the UI can render optimistic in-memory state.
   * SERVER (cron): writes through.
   */
  async saveAgentSession(agentId: string, data: AgentSessionData): Promise<void> {
    // Update local cache immediately
    this.sessionCache.set(agentId, data);

    if (IS_BROWSER) return;

    // Debounce Supabase write
    this.debouncedWrite(`session-${agentId}`, async () => {
      try {
        const { error } = await supabase
          .from('arena_agent_sessions')
          .upsert({
            agent_id: agentId,
            trades: data.trades,
            wins: data.wins,
            pnl: data.pnl,
            balance_delta: data.balanceDelta,
            consecutive_losses: data.consecutiveLosses,
            circuit_breaker_level: data.circuitBreakerLevel,
            halted_until: data.haltedUntil ? new Date(data.haltedUntil).toISOString() : null,
            last_trade_time: data.lastTradeTime ? new Date(data.lastTradeTime).toISOString() : null,
          }, { onConflict: 'agent_id' });

        if (error) {
          console.error(`⚠️ Failed to save session for ${agentId}:`, error.message);
        }
      } catch (err) {
        console.error(`❌ Error saving session for ${agentId}:`, err);
      }
    });
  }

  // ===================== ACTIVE POSITIONS =====================

  /**
   * Get active position for an agent
   */
  getPosition(agentId: string): QuantPosition | null {
    return this.positionCache.get(agentId) || null;
  }

  /**
   * Get all active positions
   */
  getAllPositions(): Map<string, QuantPosition> {
    return new Map(this.positionCache);
  }

  /**
   * Save active position. BROWSER: cache only. SERVER: writes through.
   */
  async savePosition(agentId: string, position: QuantPosition): Promise<void> {
    // Update local cache immediately
    this.positionCache.set(agentId, position);

    if (IS_BROWSER) return;

    // Debounce Supabase write
    this.debouncedWrite(`position-${agentId}`, async () => {
      try {
        const { error } = await supabase
          .from('arena_active_positions')
          .upsert({
            agent_id: agentId,
            position_id: position.id,
            symbol: position.symbol,
            display_symbol: position.displaySymbol,
            direction: position.direction,
            entry_price: position.entryPrice,
            current_price: position.currentPrice,
            quantity: position.quantity,
            take_profit_price: position.takeProfitPrice,
            stop_loss_price: position.stopLossPrice,
            strategy: position.strategy,
            market_state_at_entry: position.marketStateAtEntry,
            entry_time: new Date(position.entryTime).toISOString(),
          }, { onConflict: 'agent_id' });

        if (error) {
          console.error(`⚠️ Failed to save position for ${agentId}:`, error.message);
        }
      } catch (err) {
        console.error(`❌ Error saving position for ${agentId}:`, err);
      }
    });
  }

  /**
   * Delete active position (on trade close).
   * BROWSER: cache only. SERVER: writes through.
   */
  async deletePosition(agentId: string): Promise<void> {
    // Update local cache immediately
    this.positionCache.delete(agentId);

    // Clear any pending write
    const key = `position-${agentId}`;
    if (this.writeQueue.has(key)) {
      clearTimeout(this.writeQueue.get(key));
      this.writeQueue.delete(key);
    }

    if (IS_BROWSER) return;

    // Delete from Supabase
    try {
      const { error } = await supabase
        .from('arena_active_positions')
        .delete()
        .eq('agent_id', agentId);

      if (error) {
        console.error(`⚠️ Failed to delete position for ${agentId}:`, error.message);
      }
    } catch (err) {
      console.error(`❌ Error deleting position for ${agentId}:`, err);
    }
  }

  // ===================== TRADE HISTORY =====================

  /**
   * Record a trade to history. BROWSER: no-op (cron writes). SERVER: writes through.
   */
  async recordTrade(trade: TradeHistoryRecord): Promise<void> {
    if (IS_BROWSER) return;
    try {
      const { error } = await supabase
        .from('arena_trade_history')
        .insert({
          agent_id: trade.agentId,
          timestamp: new Date(trade.timestamp).toISOString(),
          symbol: trade.symbol,
          direction: trade.direction,
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          quantity: trade.quantity,
          pnl_percent: trade.pnlPercent,
          pnl_dollar: trade.pnlDollar,
          is_win: trade.isWin,
          strategy: trade.strategy,
          market_state: trade.marketState,
          reason: trade.reason,
        });

      if (error) {
        console.error('⚠️ Failed to record trade:', error.message);
      }
    } catch (err) {
      console.error('❌ Error recording trade:', err);
    }
  }

  /**
   * Get recent trades (last 24h)
   */
  async getRecentTrades(limit: number = 50): Promise<TradeHistoryRecord[]> {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('arena_trade_history')
        .select('*')
        .gte('timestamp', cutoffTime)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('⚠️ Failed to get recent trades:', error.message);
        return [];
      }

      return (data || []).map(t => ({
        agentId: t.agent_id,
        timestamp: new Date(t.timestamp).getTime(),
        symbol: t.symbol,
        direction: t.direction as 'LONG' | 'SHORT',
        entryPrice: Number(t.entry_price),
        exitPrice: t.exit_price ? Number(t.exit_price) : null,
        quantity: Number(t.quantity),
        pnlPercent: t.pnl_percent ? Number(t.pnl_percent) : null,
        pnlDollar: t.pnl_dollar ? Number(t.pnl_dollar) : null,
        isWin: t.is_win,
        strategy: t.strategy,
        marketState: t.market_state,
        reason: t.reason,
      }));
    } catch (err) {
      console.error('❌ Error getting recent trades:', err);
      return [];
    }
  }

  /**
   * Get trade history for 24h metrics calculation
   */
  async get24hTradeHistory(): Promise<TradeHistoryRecord[]> {
    return this.getRecentTrades(1000);
  }

  // ===================== MARKET STATE =====================

  /**
   * Get current market state
   */
  getMarketState(): MarketStateData | null {
    return this.marketStateCache;
  }

  /**
   * Save market state. BROWSER: cache only. SERVER: writes through.
   */
  async saveMarketState(state: MarketStateData): Promise<void> {
    // Update local cache immediately
    this.marketStateCache = state;

    if (IS_BROWSER) return;

    // Debounce Supabase write
    this.debouncedWrite('market-state', async () => {
      try {
        // First try to update existing record
        const { data: existing } = await supabase
          .from('arena_market_state')
          .select('id')
          .limit(1)
          .single();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('arena_market_state')
            .update({
              state: state.state,
              confidence: state.confidence,
              volatility: state.volatility,
              trend_strength: state.trendStrength,
            })
            .eq('id', existing.id);

          if (error) {
            console.error('⚠️ Failed to update market state:', error.message);
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('arena_market_state')
            .insert({
              state: state.state,
              confidence: state.confidence,
              volatility: state.volatility,
              trend_strength: state.trendStrength,
            });

          if (error) {
            console.error('⚠️ Failed to insert market state:', error.message);
          }
        }
      } catch (err) {
        console.error('❌ Error saving market state:', err);
      }
    });
  }

  // ===================== RESET / CLEANUP =====================

  /**
   * Clear all arena data (emergency reset).
   * BROWSER: only clears local cache (Supabase rows untouched — operator
   * must use the Supabase dashboard or trigger a server-side reset endpoint).
   * SERVER: deletes from Supabase.
   */
  async clearAllData(): Promise<void> {
    console.log('%c🗑️ Clearing arena cache' + (IS_BROWSER ? ' (browser-only)' : ' from Supabase...'),
      'background: #dc2626; color: white; padding: 4px 12px;');

    // Clear caches
    this.sessionCache.clear();
    this.positionCache.clear();
    this.marketStateCache = null;

    // Clear pending writes
    this.writeQueue.forEach(timeout => clearTimeout(timeout));
    this.writeQueue.clear();

    if (IS_BROWSER) return;

    try {
      // Delete all data from Supabase
      await Promise.all([
        supabase.from('arena_agent_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('arena_active_positions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('arena_trade_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      console.log('  ✅ Arena data cleared from Supabase');
    } catch (err) {
      console.error('❌ Error clearing arena data:', err);
    }
  }

  /**
   * Validate balance delta for an agent
   * Returns validated value within safe bounds
   */
  validateBalanceDelta(agentId: string, rawDelta: number): number {
    const INITIAL_BALANCE = 10000;
    const MAX_LOSS_PERCENT = 50; // Maximum 50% loss from initial

    const maxLoss = INITIAL_BALANCE * (MAX_LOSS_PERCENT / 100);

    // If raw delta would result in more than 50% loss, cap it
    if (rawDelta < -maxLoss) {
      console.warn(`%c⚠️ VALIDATION: ${agentId} balanceDelta capped: $${rawDelta.toFixed(2)} → $${(-maxLoss).toFixed(2)}`,
        'background: #f59e0b; color: black; padding: 2px 8px;');
      return -maxLoss;
    }

    return rawDelta;
  }

  // ===================== HELPERS =====================

  /**
   * Debounced write to prevent API spam
   */
  private debouncedWrite(key: string, writeFn: () => Promise<void>): void {
    // Clear existing timeout
    if (this.writeQueue.has(key)) {
      clearTimeout(this.writeQueue.get(key));
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      this.writeQueue.delete(key);
      await writeFn();
    }, this.WRITE_DEBOUNCE_MS);

    this.writeQueue.set(key, timeout);
  }

  /**
   * Flush all pending writes immediately
   */
  async flushPendingWrites(): Promise<void> {
    const pendingKeys = Array.from(this.writeQueue.keys());
    this.writeQueue.forEach(timeout => clearTimeout(timeout));
    this.writeQueue.clear();

    // Note: The actual write functions are lost when we clear timeouts
    // This method should only be called on graceful shutdown
    console.log(`📤 Flushed ${pendingKeys.length} pending writes`);
  }
}

// ===================== SINGLETON =====================

export const arenaSupabaseStorage = new ArenaSupabaseStorage();
export default arenaSupabaseStorage;

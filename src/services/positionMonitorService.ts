/**
 * Position Monitor Service
 *
 * Autonomous service that continuously monitors ALL open mock trading positions
 * and automatically closes them when:
 * 1. Stop Loss is hit
 * 2. Take Profit is hit
 * 3. Position is older than 24 hours (stale timeout)
 *
 * Runs every 5 seconds for near-real-time monitoring.
 *
 * CRITICAL FIX: Previously, TP/SL checks existed but NEVER executed because
 * they were in updateBatchPositionPrices() which is only called for display,
 * not monitoring. This service provides dedicated autonomous monitoring.
 */

import { supabase } from '@/integrations/supabase/client';
import type { MockTradingPosition } from './mockTradingService';

// ===== CONSTANTS =====

const MONITOR_INTERVAL_MS = 5000; // Check every 5 seconds
const POSITION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours max position age

// ===== INTERFACES =====

interface MonitorStats {
  totalPositionsChecked: number;
  positionsClosed: number;
  stopLossHits: number;
  takeProfitHits: number;
  timeoutHits: number;
  lastCheckTime: number;
}

export interface PositionCloseEvent {
  positionId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  closePrice: number;
  pnl: number;
  pnlPercent: number;
  reason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIMEOUT';
  timestamp: number;
}

type PositionCloseListener = (event: PositionCloseEvent) => void;

// ===== POSITION MONITOR SERVICE =====

export class PositionMonitorService {
  private monitorInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: MonitorStats = {
    totalPositionsChecked: 0,
    positionsClosed: 0,
    stopLossHits: 0,
    takeProfitHits: 0,
    timeoutHits: 0,
    lastCheckTime: 0
  };

  // ✅ EVENT EMITTER: For real-time notifications
  private listeners: PositionCloseListener[] = [];

  /**
   * Start the position monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('[PositionMonitor] ✅ Already running');
      return;
    }

    console.log('[PositionMonitor] 🚀 Starting autonomous position monitoring (every 5s)');
    this.isRunning = true;

    // Initial check
    this.checkAllPositions();

    // Set up recurring checks
    this.monitorInterval = setInterval(() => {
      this.checkAllPositions();
    }, MONITOR_INTERVAL_MS);
  }

  /**
   * Stop the position monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[PositionMonitor] 🛑 Stopping position monitoring');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.isRunning = false;
  }

  /**
   * Get current monitoring statistics
   */
  getStats(): MonitorStats {
    return { ...this.stats };
  }

  /**
   * Main monitoring loop - check all open positions
   */
  private async checkAllPositions(): Promise<void> {
    const startTime = Date.now();

    try {
      // Query ALL open positions from database (batch query - no N+1)
      const { data: positions, error } = await supabase
        .from('mock_trading_positions')
        .select('*')
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: true });

      if (error) {
        console.error('[PositionMonitor] ❌ Database error:', error);
        return;
      }

      if (!positions || positions.length === 0) {
        // No positions to monitor - silent return
        this.stats.lastCheckTime = startTime;
        return;
      }

      console.log(`[PositionMonitor] 🔍 Checking ${positions.length} open positions...`);
      this.stats.totalPositionsChecked += positions.length;

      // Get real-time prices for all unique symbols (batch query)
      const uniqueSymbols = [...new Set(positions.map(p => p.symbol))];
      const priceMap = await this.getBatchPrices(uniqueSymbols);

      // Check each position for triggers
      let closedCount = 0;
      for (const position of positions) {
        const currentPrice = priceMap.get(position.symbol);

        if (!currentPrice) {
          console.warn(`[PositionMonitor] ⚠️ No price data for ${position.symbol}`);
          continue;
        }

        // Check for stop loss trigger
        if (await this.checkStopLoss(position, currentPrice)) {
          closedCount++;
          this.stats.stopLossHits++;
          this.stats.positionsClosed++;
          continue;
        }

        // Check for take profit trigger
        if (await this.checkTakeProfit(position, currentPrice)) {
          closedCount++;
          this.stats.takeProfitHits++;
          this.stats.positionsClosed++;
          continue;
        }

        // Check for timeout (24-hour stale positions)
        if (await this.checkTimeout(position)) {
          closedCount++;
          this.stats.timeoutHits++;
          this.stats.positionsClosed++;
          continue;
        }
      }

      const duration = Date.now() - startTime;
      this.stats.lastCheckTime = startTime;

      if (closedCount > 0) {
        console.log(
          `[PositionMonitor] ✅ Closed ${closedCount} positions in ${duration}ms | ` +
          `SL: ${this.stats.stopLossHits}, TP: ${this.stats.takeProfitHits}, Timeout: ${this.stats.timeoutHits}`
        );
      }

    } catch (error) {
      console.error('[PositionMonitor] ❌ Error checking positions:', error);
    }
  }

  /**
   * Get current prices for multiple symbols (batch query for efficiency)
   * ✅ With exponential backoff retry logic
   */
  private async getBatchPrices(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    try {
      // Dynamically import to avoid circular dependencies
      const { multiExchangeAggregatorV4 } = await import('./dataStreams/multiExchangeAggregatorV4');

      // ✅ RETRY LOGIC: Exponential backoff for price fetching
      const maxRetries = 3;
      const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

      // Get prices for all symbols with retry logic
      for (const symbol of symbols) {
        let priceUpdated = false;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const marketData = await multiExchangeAggregatorV4.getAggregatedData(symbol);

            if (marketData && marketData.currentPrice) {
              priceMap.set(symbol, marketData.currentPrice);
              priceUpdated = true;

              if (attempt > 0) {
                console.log(`[PositionMonitor] ✅ Price fetched after ${attempt} ${attempt === 1 ? 'retry' : 'retries'} for ${symbol}`);
              }

              break; // Success - move to next symbol
            } else if (attempt < maxRetries) {
              console.warn(`[PositionMonitor] ⚠️ No price data for ${symbol} (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
              await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            }
          } catch (error) {
            if (attempt < maxRetries) {
              console.warn(`[PositionMonitor] ⚠️ Error fetching price for ${symbol} (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
              await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            } else {
              console.error(`[PositionMonitor] ❌ All ${maxRetries + 1} attempts failed for ${symbol}:`, error);
            }
          }
        }

        if (!priceUpdated) {
          console.warn(`[PositionMonitor] 🔄 Could not fetch price for ${symbol} after ${maxRetries + 1} attempts - position will be skipped this cycle`);
        }
      }

    } catch (error) {
      console.error('[PositionMonitor] ❌ Error in batch price fetching:', error);
    }

    return priceMap;
  }

  /**
   * Check if stop loss is triggered
   */
  private async checkStopLoss(position: any, currentPrice: number): Promise<boolean> {
    if (!position.stop_loss) {
      return false; // No SL set
    }

    const isTriggered =
      (position.side === 'BUY' && currentPrice <= position.stop_loss) ||
      (position.side === 'SELL' && currentPrice >= position.stop_loss);

    if (isTriggered) {
      console.log(
        `[PositionMonitor] 🛑 STOP LOSS HIT | ${position.symbol} ${position.side} | ` +
        `Entry: $${position.entry_price.toFixed(2)}, SL: $${position.stop_loss.toFixed(2)}, ` +
        `Current: $${currentPrice.toFixed(2)}`
      );

      await this.closePosition(position.id, position.user_id, currentPrice, 'STOP_LOSS', position);
      return true;
    }

    return false;
  }

  /**
   * Check if take profit is triggered
   */
  private async checkTakeProfit(position: any, currentPrice: number): Promise<boolean> {
    if (!position.take_profit) {
      return false; // No TP set
    }

    const isTriggered =
      (position.side === 'BUY' && currentPrice >= position.take_profit) ||
      (position.side === 'SELL' && currentPrice <= position.take_profit);

    if (isTriggered) {
      console.log(
        `[PositionMonitor] 🎯 TAKE PROFIT HIT | ${position.symbol} ${position.side} | ` +
        `Entry: $${position.entry_price.toFixed(2)}, TP: $${position.take_profit.toFixed(2)}, ` +
        `Current: $${currentPrice.toFixed(2)}`
      );

      await this.closePosition(position.id, position.user_id, currentPrice, 'TAKE_PROFIT', position);
      return true;
    }

    return false;
  }

  /**
   * Check if position has timed out (24 hours)
   */
  private async checkTimeout(position: any): Promise<boolean> {
    const openedAt = new Date(position.opened_at).getTime();
    const age = Date.now() - openedAt;

    if (age > POSITION_TIMEOUT_MS) {
      const ageHours = Math.floor(age / (60 * 60 * 1000));

      console.log(
        `[PositionMonitor] ⏰ TIMEOUT (${ageHours}h) | ${position.symbol} ${position.side} | ` +
        `Force closing stale position`
      );

      // Get current price for this symbol
      const { multiExchangeAggregatorV4 } = await import('./dataStreams/multiExchangeAggregatorV4');
      const marketData = await multiExchangeAggregatorV4.getAggregatedData(position.symbol);
      const currentPrice = marketData?.currentPrice || position.entry_price;

      await this.closePosition(position.id, position.user_id, currentPrice, 'TIMEOUT', position);
      return true;
    }

    return false;
  }

  /**
   * Close a position and emit event for real-time notifications
   */
  private async closePosition(
    positionId: string,
    userId: string,
    closePrice: number,
    reason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIMEOUT',
    position?: any  // Optional position data for event emission
  ): Promise<void> {
    try {
      // Import mockTradingService dynamically to avoid circular dependencies
      const { mockTradingService } = await import('./mockTradingService');

      // Close the position using the existing service method
      await mockTradingService.closePosition(userId, positionId, closePrice);

      console.log(
        `[PositionMonitor] ✅ Position closed | ID: ${positionId.slice(0, 8)}... | ` +
        `Reason: ${reason} | Price: $${closePrice.toFixed(2)}`
      );

      // ✅ EMIT EVENT: For real-time notifications
      if (position) {
        const pnl = (closePrice - position.entry_price) * position.quantity;
        const actualPnl = position.side === 'SELL' ? -pnl : pnl;
        const pnlPercent = ((closePrice - position.entry_price) / position.entry_price) * 100;
        const actualPnlPercent = position.side === 'SELL' ? -pnlPercent : pnlPercent;

        const event: PositionCloseEvent = {
          positionId,
          userId,
          symbol: position.symbol,
          side: position.side,
          entryPrice: position.entry_price,
          closePrice,
          pnl: actualPnl,
          pnlPercent: actualPnlPercent,
          reason,
          timestamp: Date.now()
        };

        this.emitPositionClose(event);
      }

    } catch (error) {
      console.error(`[PositionMonitor] ❌ Error closing position ${positionId}:`, error);
    }
  }

  /**
   * Subscribe to position close events
   */
  on(event: 'position:closed', callback: PositionCloseListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit position close event to all listeners
   */
  private emitPositionClose(event: PositionCloseEvent): void {
    console.log(`[PositionMonitor] 📢 Broadcasting position close event: ${event.symbol} ${event.reason}`);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[PositionMonitor] ❌ Error in event listener:', error);
      }
    });
  }

  /**
   * Force check all positions immediately (useful for testing)
   */
  async forceCheck(): Promise<void> {
    console.log('[PositionMonitor] 🔄 Force checking all positions...');
    await this.checkAllPositions();
  }
}

// Export singleton instance
export const positionMonitorService = new PositionMonitorService();

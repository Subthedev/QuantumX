// Arena Trade Logger Service
// Logs Arena agent trades to Supabase for marketing analytics

import { supabase } from '@/integrations/supabase/client'

export interface CompletedTrade {
  agentId: string
  symbol: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  entryTime: number
  exitTime: number
  pnlPercent: number
  pnlUsd: number
  strategy: string
  confidence: number
}

export interface ActivePosition {
  agentId: string
  symbol: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  currentPrice: number
  entryTime: number
  stopLoss?: number
  takeProfit?: number
  strategy: string
  confidence: number
  unrealizedPnlPercent: number
  unrealizedPnlUsd: number
}

export const arenaTradeLogger = {
  /**
   * Log a completed trade (when position closes)
   * Call this immediately after a trade exits
   */
  async logCompletedTrade(trade: CompletedTrade) {
    try {
      const { data, error } = await supabase.functions.invoke('arena-trade-logger', {
        body: {
          action: 'log_trade',
          data: {
            agentId: trade.agentId,
            symbol: trade.symbol,
            direction: trade.direction,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            entryTime: trade.entryTime,
            exitTime: trade.exitTime,
            pnlPercent: trade.pnlPercent,
            pnlUsd: trade.pnlUsd,
            strategy: trade.strategy,
            confidence: trade.confidence
          }
        }
      })

      if (error) {
        console.error('[Arena Logger] Failed to log trade:', error)
        return { success: false, error }
      }

      console.log(`[Arena Logger] ✅ Logged ${trade.agentId} trade: ${trade.symbol} ${trade.direction} ${trade.pnlPercent > 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%`)
      return { success: true, data }
    } catch (error) {
      console.error('[Arena Logger] Error logging trade:', error)
      return { success: false, error }
    }
  },

  /**
   * Update active position (call periodically for open trades)
   * Updates current price and P&L for marketing live stats
   */
  async updatePosition(position: ActivePosition) {
    try {
      await supabase.functions.invoke('arena-trade-logger', {
        body: {
          action: 'update_position',
          data: {
            agentId: position.agentId,
            symbol: position.symbol,
            direction: position.direction,
            entryPrice: position.entryPrice,
            currentPrice: position.currentPrice,
            entryTime: position.entryTime,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            strategy: position.strategy,
            confidence: position.confidence,
            unrealizedPnlPercent: position.unrealizedPnlPercent,
            unrealizedPnlUsd: position.unrealizedPnlUsd
          }
        }
      })
    } catch (error) {
      // Silent fail - position updates are non-critical
      console.debug('[Arena Logger] Failed to update position:', error)
    }
  },

  /**
   * Close active position (remove from tracking)
   * Call this when a trade exits
   */
  async closePosition(agentId: string, symbol: string) {
    try {
      await supabase.functions.invoke('arena-trade-logger', {
        body: {
          action: 'close_position',
          data: { agentId, symbol }
        }
      })

      console.log(`[Arena Logger] ✅ Closed position: ${agentId} ${symbol}`)
    } catch (error) {
      console.error('[Arena Logger] Failed to close position:', error)
    }
  },

  /**
   * Batch log multiple trades (for backfilling or bulk operations)
   */
  async logBatchTrades(trades: CompletedTrade[]) {
    const results = await Promise.allSettled(
      trades.map(trade => this.logCompletedTrade(trade))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[Arena Logger] Batch logged ${successful} trades, ${failed} failed`)

    return {
      successful,
      failed,
      total: trades.length
    }
  }
}

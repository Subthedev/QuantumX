import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'log_trade': {
        // Log completed trade - UPDATED TO MATCH NEW SCHEMA
        const { error } = await supabaseClient
          .from('arena_trade_history')
          .insert({
            agent_id: data.agentId,
            timestamp: new Date(data.exitTime || Date.now()).toISOString(),
            symbol: data.symbol,
            direction: data.direction,
            entry_price: data.entryPrice,
            exit_price: data.exitPrice,
            quantity: 1.0, // Default quantity
            pnl_percent: data.pnlPercent,
            pnl_dollar: data.pnlUsd,
            is_win: data.pnlPercent > 0,
            strategy: data.strategy || 'Unknown',
            market_state: 'RANGEBOUND', // Default market state
            reason: data.pnlPercent > 0 ? 'TP' : 'SL'
          })

        if (error) {
          console.error('Failed to insert trade:', error)
          throw error
        }

        // Update agent session stats
        await updateAgentSession(supabaseClient, data.agentId, data)

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_position': {
        // Update or insert active position - UPDATED TO MATCH NEW SCHEMA
        const { error } = await supabaseClient
          .from('arena_active_positions')
          .upsert({
            agent_id: data.agentId,
            position_id: `pos-${data.agentId}-${Date.now()}`,
            symbol: data.symbol.replace('/', ''), // 'BTCUSD'
            display_symbol: data.symbol, // 'BTC/USD'
            direction: data.direction,
            entry_price: data.entryPrice,
            current_price: data.currentPrice || data.entryPrice,
            quantity: 1.0, // Default quantity
            take_profit_price: data.takeProfit || 0,
            stop_loss_price: data.stopLoss || 0,
            strategy: data.strategy || 'Unknown',
            market_state_at_entry: 'RANGEBOUND',
            entry_time: new Date(data.entryTime || Date.now()).toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'agent_id'
          })

        if (error) {
          console.error('Failed to update position:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'close_position': {
        // Remove from active positions when trade closes
        const { error } = await supabaseClient
          .from('arena_active_positions')
          .delete()
          .eq('agent_id', data.agentId)

        if (error) {
          console.error('Failed to close position:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Arena trade logger error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// UPDATED TO MATCH NEW SCHEMA
async function updateAgentSession(supabaseClient: any, agentId: string, tradeData: any) {
  // Get or create current session
  const { data: session, error: fetchError } = await supabaseClient
    .from('arena_agent_sessions')
    .select('*')
    .eq('agent_id', agentId)
    .single()

  const isWin = tradeData.pnlPercent > 0

  if (!session || fetchError) {
    // Create new session - MATCH NEW SCHEMA
    await supabaseClient
      .from('arena_agent_sessions')
      .insert({
        agent_id: agentId,
        trades: 1,
        wins: isWin ? 1 : 0,
        pnl: tradeData.pnlPercent,
        balance_delta: tradeData.pnlUsd || 0,
        consecutive_losses: isWin ? 0 : 1,
        circuit_breaker_level: 'ACTIVE',
        halted_until: null,
        last_trade_time: new Date().toISOString()
      })
  } else {
    // Update existing session - MATCH NEW SCHEMA
    await supabaseClient
      .from('arena_agent_sessions')
      .update({
        trades: session.trades + 1,
        wins: session.wins + (isWin ? 1 : 0),
        pnl: session.pnl + tradeData.pnlPercent,
        balance_delta: session.balance_delta + (tradeData.pnlUsd || 0),
        consecutive_losses: isWin ? 0 : session.consecutive_losses + 1,
        last_trade_time: new Date().toISOString()
      })
      .eq('agent_id', agentId)
  }
}

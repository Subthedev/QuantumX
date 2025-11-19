/**
 * SIGNAL GENERATOR - Server-Side 24/7 Signal Generation
 * SIMPLIFIED VERSION - Always generates at least one signal
 */

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
    console.log('[Signal Generator] 🚀 Starting')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get MAX tier users
    const { data: maxUsers } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('tier', 'MAX')
      .eq('status', 'active')

    if (!maxUsers || maxUsers.length === 0) {
      console.log('[Signal Generator] No MAX users found')
      return new Response(
        JSON.stringify({ success: true, signalsGenerated: 0, message: 'No MAX users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch BTC price from Binance
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
    const data = await response.json()
    const price = parseFloat(data.lastPrice)
    const priceChange = parseFloat(data.priceChangePercent)

    // Always generate a BTC signal
    const signal = {
      symbol: 'BTCUSDT',
      direction: priceChange >= 0 ? 'LONG' : 'SHORT',
      confidence: 75,
      quality_score: 80,
      entry_price: price,
      take_profit: [price * 1.02, price * 1.04],
      stop_loss: price * 0.98,
      strategy: 'Momentum Surge',
      timeframe: '15m'
    }

    let signalsGenerated = 0

    // Distribute to all MAX users
    for (const user of maxUsers) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('user_signals')
        .insert({
          user_id: user.user_id,
          signal_id: `${signal.symbol}-${Date.now()}`,
          tier: 'MAX',
          symbol: signal.symbol,
          signal_type: signal.direction,
          confidence: signal.confidence,
          quality_score: signal.quality_score,
          entry_price: signal.entry_price,
          take_profit: signal.take_profit,
          stop_loss: signal.stop_loss,
          expires_at: expiresAt,
          metadata: {
            strategy: signal.strategy,
            timeframe: signal.timeframe,
            generatedBy: 'edge-function',
            timestamp: new Date().toISOString()
          },
          full_details: true,
          viewed: false,
          clicked: false
        })

      if (!error) {
        signalsGenerated++
        console.log(`[Signal Generator] ✅ Signal sent to user ${user.user_id}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signalsGenerated,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Signal Generator] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

/**
 * TELEGRAM SIGNAL PUBLISHER - QuantumX Autonomous Signal Pipeline
 *
 * Receives trading signals from Arena agents and publishes them to Telegram channel.
 * Part of the 24/7 autonomous trading signal system.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Signal format for Telegram
 */
interface TelegramSignal {
  agentName: string;
  agentId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfit: number[];
  stopLoss: number;
  strategy: string;
  confidence: number;
  marketState?: string;
  timestamp: string;
  type: 'ENTRY' | 'EXIT';
  pnlPercent?: number;
  reason?: string;
}

/**
 * Format number with proper decimal places
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else {
    return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  }
}

/**
 * Format signal for Telegram message - Clean & Professional
 * Balanced design with analysis details
 */
function formatSignalMessage(signal: TelegramSignal): string {
  const isLong = signal.direction === 'LONG';
  const directionEmoji = isLong ? '🟢' : '🔴';

  // Clean agent names
  const agentTag = signal.agentName.includes('Alpha') ? 'ALPHAX' :
                   signal.agentName.includes('Beta') ? 'BETAX' : 'GAMMAX';

  // Confidence stars
  const getStars = (conf: number) => {
    if (conf >= 90) return '⭐⭐⭐⭐⭐';
    if (conf >= 80) return '⭐⭐⭐⭐';
    if (conf >= 70) return '⭐⭐⭐';
    if (conf >= 60) return '⭐⭐';
    return '⭐';
  };

  // Format timestamp
  const timestamp = new Date(signal.timestamp).toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  if (signal.type === 'ENTRY') {
    const tp1 = signal.takeProfit[0];
    const tp2 = signal.takeProfit.length > 1 ? signal.takeProfit[1] : null;

    // Calculate R:R
    const slDistance = Math.abs(signal.entryPrice - signal.stopLoss);
    const tp1Distance = Math.abs(tp1 - signal.entryPrice);
    const riskReward = slDistance > 0 ? (tp1Distance / slDistance).toFixed(1) : '1.0';

    // Calculate potential %
    const potentialTP1 = Math.abs((tp1 - signal.entryPrice) / signal.entryPrice * 100).toFixed(1);

    let message = `${directionEmoji} <b>${signal.direction}</b> · ${signal.symbol}

<b>Entry:</b> <code>$${formatPrice(signal.entryPrice)}</code>
<b>TP1:</b> <code>$${formatPrice(tp1)}</code> <i>(+${potentialTP1}%)</i>${tp2 ? `
<b>TP2:</b> <code>$${formatPrice(tp2)}</code>` : ''}
<b>SL:</b> <code>$${formatPrice(signal.stopLoss)}</code>

📐 <b>R:R Ratio:</b> 1:${riskReward}
🎪 <b>Strategy:</b> ${signal.strategy}
⚡ <b>Confidence:</b> ${signal.confidence}% ${getStars(signal.confidence)}${signal.marketState ? `
🌊 <b>Market:</b> ${signal.marketState}` : ''}

🤖 ${agentTag} · ⏰ ${timestamp} UTC

⚠️ <i>Educational only. DYOR. Not financial advice.</i>

#QuantumX #${signal.symbol.replace('/', '')} #${signal.direction} #Crypto`;

    return message;
  } else {
    // Exit Signal
    const pnl = signal.pnlPercent || 0;
    const resultEmoji = pnl >= 0 ? '✅' : '❌';
    const perfEmoji = pnl >= 2 ? '🚀' : pnl >= 1 ? '🔥' : pnl >= 0 ? '✨' : '📉';

    let message = `${resultEmoji} <b>CLOSED</b> · ${signal.symbol}

${perfEmoji} <b>Result:</b> <code>${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%</code>
📍 <b>Reason:</b> ${signal.reason || 'Target Hit'}
🎪 <b>Strategy:</b> ${signal.strategy}

🤖 ${agentTag} · ⏰ ${timestamp} UTC

#QuantumX #${signal.symbol.replace('/', '')} #TradeResult`;

    return message;
  }
}

/**
 * Send message to Telegram channel
 */
async function sendToTelegram(message: string, botToken: string, channelId: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram Signal] Failed to send:', error);
      return false;
    }

    const result = await response.json();
    console.log('[Telegram Signal] Message sent successfully:', result.result?.message_id);
    return true;
  } catch (error) {
    console.error('[Telegram Signal] Error sending to Telegram:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Telegram Signal] 🚀 Processing signal request');

    // Get environment variables
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const channelId = Deno.env.get('TELEGRAM_CHANNEL_ID') || '@agentquantumx';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!botToken) {
      console.error('[Telegram Signal] Missing TELEGRAM_BOT_TOKEN');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram bot not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse the signal from request body
    const signal: TelegramSignal = await req.json();

    console.log(`[Telegram Signal] Processing ${signal.type} signal: ${signal.agentName} ${signal.direction} ${signal.symbol}`);

    // Format and send the message
    const message = formatSignalMessage(signal);
    const sent = await sendToTelegram(message, botToken, channelId);

    if (!sent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send to Telegram' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Log signal to database for tracking
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('telegram_signals')
      .insert({
        agent_id: signal.agentId,
        agent_name: signal.agentName,
        symbol: signal.symbol,
        direction: signal.direction,
        entry_price: signal.entryPrice,
        take_profit: signal.takeProfit,
        stop_loss: signal.stopLoss,
        strategy: signal.strategy,
        confidence: signal.confidence,
        signal_type: signal.type,
        pnl_percent: signal.pnlPercent,
        market_state: signal.marketState,
        sent_at: new Date().toISOString()
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[Telegram Signal] Failed to log signal:', error.message);
        } else {
          console.log('[Telegram Signal] Signal logged to database');
        }
      });

    console.log('[Telegram Signal] ✅ Signal published successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signal sent to Telegram',
        signalType: signal.type,
        agent: signal.agentName,
        symbol: signal.symbol
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Telegram Signal] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

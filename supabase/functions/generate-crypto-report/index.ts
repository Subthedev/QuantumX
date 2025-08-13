import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cmcApiKey = Deno.env.get('CMC_API_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RequestBody {
  coin: 'BTC' | 'ETH';
  userId: string;
  timeframe?: '4H';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coin, userId, timeframe }: RequestBody = await req.json();

    const tf = timeframe || '4H';

    console.log(`Generating report for ${coin} for user ${userId}`);

    // Validate input
    if (!coin || !userId || !['BTC', 'ETH'].includes(coin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coin or userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user can generate a report (24h limit)
    const { data: canGenerate, error: checkError } = await supabase
      .rpc('can_generate_report', {
        user_uuid: userId,
        coin: coin
      });

    if (checkError) {
      console.error('Error checking report eligibility:', checkError);
      throw checkError;
    }

    if (!canGenerate) {
      return new Response(
        JSON.stringify({ error: 'Report limit reached. You can only generate one report per coin every 24 hours.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch real-time market data and generate professional analysis
    const prediction = await generateProfessionalReport(coin, tf);

    // Save the report to the database
    const { data: report, error: insertError } = await supabase
      .from('crypto_reports')
      .insert({
        user_id: userId,
        coin_symbol: coin,
        prediction_summary: prediction.summary,
        confidence_score: prediction.confidence,
        report_data: prediction.data
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting report:', insertError);
      throw insertError;
    }

    console.log(`Report generated successfully for ${coin}`);

    return new Response(
      JSON.stringify(report),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-crypto-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchCMCData(symbol: string) {
  const cmcSymbol = symbol === 'BTC' ? 'bitcoin' : 'ethereum';
  
  try {
    // Fetch current price and market data
    const quoteResponse = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`, {
      headers: {
        'X-CMC_PRO_API_KEY': cmcApiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!quoteResponse.ok) {
      throw new Error(`CMC API error: ${quoteResponse.status}`);
    }
    
    const quoteData = await quoteResponse.json();
    const coinData = quoteData.data[symbol];
    
    // Fetch additional market info
    const infoResponse = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${symbol}`, {
      headers: {
        'X-CMC_PRO_API_KEY': cmcApiKey,
        'Accept': 'application/json'
      }
    });
    
    const infoData = await infoResponse.json();
    const coinInfo = infoData.data[symbol];
    
    return {
      price: coinData.quote.USD.price,
      marketCap: coinData.quote.USD.market_cap,
      volume24h: coinData.quote.USD.volume_24h,
      percentChange1h: coinData.quote.USD.percent_change_1h,
      percentChange24h: coinData.quote.USD.percent_change_24h,
      percentChange7d: coinData.quote.USD.percent_change_7d,
      percentChange30d: coinData.quote.USD.percent_change_30d,
      circulatingSupply: coinData.circulating_supply,
      totalSupply: coinData.total_supply,
      maxSupply: coinData.max_supply,
      description: coinInfo.description,
      symbol: symbol,
      name: coinInfo.name
    };
  } catch (error) {
    console.error('Error fetching CMC data:', error);
    throw error;
  }
}

// Binance data fetchers and indicator calculators for 4H signal engine
async function fetchBinanceKlines(symbol: string, interval: string, limit = 200) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  // Each kline: [openTime, open, high, low, close, volume, ...]
  const data: any[] = await res.json();
  return data.map((k) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

async function fetchFundingRate(symbol: string) {
  // Futures funding rate (no key required)
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length) {
    const fr = parseFloat(data[0].fundingRate);
    return isFinite(fr) ? fr : null;
  }
  return null;
}

async function fetchOrderbookImbalance(symbol: string) {
  const url = `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const bids = (data.bids || []).reduce((sum: number, b: any) => sum + parseFloat(b[1] || 0), 0);
  const asks = (data.asks || []).reduce((sum: number, a: any) => sum + parseFloat(a[1] || 0), 0);
  if (bids + asks === 0) return 0;
  return ((bids - asks) / (bids + asks)) * 100; // percentage imbalance
}

function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  let emaVal = values[0];
  const out: number[] = [emaVal];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
    out.push(emaVal);
  }
  return out;
}

function rsi(values: number[], period = 14) {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const out: number[] = [];
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / (avgLoss || 1e-9);
    const rsi = 100 - 100 / (1 + rs);
    out.push(rsi);
  }
  return out;
}

function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine: number[] = values.map((_, i) => (emaFast[i] ?? 0) - (emaSlow[i] ?? 0));
  const signalLine = ema(macdLine.slice(Math.max(0, slow - 1)), signal);
  const hist: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    const idx = i + Math.max(0, slow - 1);
    hist.push((macdLine[idx] ?? 0) - signalLine[i]);
  }
  return { macdLine, signalLine, hist };
}

function atr(highs: number[], lows: number[], closes: number[], period = 14) {
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  // Wilder's smoothing
  let avgTR = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out: number[] = [avgTR];
  for (let i = period; i < trs.length; i++) {
    avgTR = (avgTR * (period - 1) + trs[i]) / period;
    out.push(avgTR);
  }
  return out;
}


async function generateProfessionalReport(coin: 'BTC' | 'ETH', timeframe: '4H') {
  try {
    console.log(`Fetching comprehensive market data for ${coin}...`);
    const marketData = await fetchCMCData(coin);

    // Map to Binance symbols
    const binanceSymbol = coin === 'BTC' ? 'BTCUSDT' : 'ETHUSDT';
    const interval = timeframe === '4H' ? '4h' : '4h';

    // Fetch 4H OHLCV + derivatives data
    const klines = await fetchBinanceKlines(binanceSymbol, interval, 300);
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);

    // Indicators
    const rsiVals = rsi(closes, 14);
    const rsiNow = rsiVals[rsiVals.length - 1] ?? 50;

    const { hist: macdHist } = macd(closes);
    const macdHistNow = macdHist[macdHist.length - 1] ?? 0;

    const atrVals = atr(highs, lows, closes, 14);
    const atrNow = atrVals[atrVals.length - 1] ?? (closes[closes.length - 1] * 0.01);
    const priceNow = closes[closes.length - 1] ?? marketData.price;
    const atrPct = (atrNow / priceNow) * 100;

    const ema50 = ema(closes, 50);
    const ema200 = ema(closes, 200);
    const ema50Now = ema50[ema50.length - 1] ?? priceNow;
    const ema200Now = ema200[ema200.length - 1] ?? priceNow;
    const ema50Above200 = ema50Now > ema200Now;

    const fundingRate = await fetchFundingRate(binanceSymbol);
    const obImbalance = await fetchOrderbookImbalance(binanceSymbol);

    // Scoring engine to reduce HOLD bias
    let bullish = 0, bearish = 0;
    // Trend bias
    if (ema50Above200) bullish += 2; else bearish += 2;
    // Momentum
    if (macdHistNow > 0) bullish += 1; else bearish += 1;
    // RSI zones
    if (rsiNow >= 55 && rsiNow <= 70) bullish += 1;
    if (rsiNow <= 45 && rsiNow >= 30) bearish += 1;
    if (rsiNow > 75) bearish += 1; // overbought
    if (rsiNow < 25) bullish += 1; // oversold
    // Orderbook imbalance
    if ((obImbalance ?? 0) > 5) bullish += 1;
    if ((obImbalance ?? 0) < -5) bearish += 1;
    // Funding rate heuristics
    if ((fundingRate ?? 0) > 0.01) bearish += 1; // crowded longs
    if ((fundingRate ?? 0) < -0.005) bullish += 1; // crowded shorts

    const scoreDiff = bullish - bearish;

    let direction: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
    if (scoreDiff >= 1) direction = 'LONG';
    if (scoreDiff <= -1) direction = 'SHORT';

    // Confidence mapping (prefer >=70 when directional)
    const alignedSignals = Math.max(bullish, bearish);
    let confidence = Math.min(95, Math.max(50, 60 + alignedSignals * 5 - Math.abs(atrPct - 3))); // favor 70+
    if (direction === 'HOLD') confidence = Math.min(confidence, 65);

    // Build 4H signal execution levels using ATR
    const entry = direction === 'LONG' ? priceNow - 0.3 * atrNow : direction === 'SHORT' ? priceNow + 0.3 * atrNow : priceNow;
    const stop = direction === 'LONG' ? priceNow - 1.0 * atrNow : direction === 'SHORT' ? priceNow + 1.0 * atrNow : priceNow - 1.0 * atrNow;
    const tp1 = direction === 'LONG' ? priceNow + 0.5 * atrNow : priceNow - 0.5 * atrNow;
    const tp2 = direction === 'LONG' ? priceNow + 1.0 * atrNow : priceNow - 1.0 * atrNow;
    const tp3 = direction === 'LONG' ? priceNow + 1.5 * atrNow : priceNow - 1.5 * atrNow;

    // Existing broader analysis (kept for compatibility)
    // Enhanced market analysis calculations
    const volatilityScore = Math.abs(marketData.percentChange7d) + Math.abs(marketData.percentChange24h);
    const momentumScore = (marketData.percentChange1h + marketData.percentChange24h + marketData.percentChange7d) / 3;
    const volumeStrength = marketData.volume24h / marketData.marketCap * 100; // Volume to market cap ratio
    const marketDirection = momentumScore > 2 ? 'strong_bullish' : momentumScore > 0 ? 'bullish' : momentumScore > -2 ? 'neutral' : momentumScore > -5 ? 'bearish' : 'strong_bearish';

    // Dynamic confidence base (used for narrative)
    const baseConfidence = Math.round(confidence);

    console.log(`Generating institution-grade AI analysis for ${coin} with 4H signal ${direction} @ conf ${baseConfidence}%`);

    const prompt = `You are a senior quantitative analyst...`;
    // Reuse existing OpenAI call and parsing logic below unchanged

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'o3-2025-04-16',
        messages: [
          { role: 'system', content: 'You are a senior quantitative analyst at a tier-1 institutional trading firm specializing in cryptocurrency markets. Your analysis combines technical indicators, fundamental metrics, sentiment analysis, and quantitative risk models to provide actionable investment insights. Always provide multi-directional analysis with specific probability assessments.' },
          { role: 'user', content: `FOCUS: 4H timeframe direct trading signal.\nAsset: ${coin}\nPrice: ${priceNow.toFixed(2)}\nRSI14: ${rsiNow.toFixed(1)}\nMACD hist: ${macdHistNow.toFixed(4)}\nEMA50>${ema50Above200 ? '' : 'not '}EMA200\nATR%: ${atrPct.toFixed(2)}\nFunding: ${fundingRate ?? 'n/a'}\nOrderbook imbalance: ${(obImbalance ?? 0).toFixed(2)}%\nDirection decided: ${direction} with confidence ${baseConfidence}%.\nProvide concise multi-scenario quantitative summary following the JSON schema shared earlier; keep HOLD minimal.` }
        ],
        temperature: 0.15,
        max_tokens: 2500
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0].message.content;

    let analysis;
    try {
      let cleanedResponse = analysisText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      analysis = JSON.parse(cleanedResponse);
    } catch (_) {
      // fallback similar to previous structure if parsing fails
      analysis = {
        summary: `${coin} 4H signal: ${direction}. RSI ${rsiNow.toFixed(1)}, MACD hist ${macdHistNow.toFixed(4)}, ATR ${atrPct.toFixed(2)}%.` ,
        confidence: baseConfidence,
        market_direction: marketDirection,
        analysis: {
          technical: {
            primary_trend: marketDirection,
            support_levels: `$${(priceNow * 0.97).toFixed(2)}, $${(priceNow * 0.94).toFixed(2)}, $${(priceNow * 0.91).toFixed(2)}`,
            resistance_levels: `$${(priceNow * 1.03).toFixed(2)}, $${(priceNow * 1.06).toFixed(2)}, $${(priceNow * 1.09).toFixed(2)}`,
            key_indicators: `RSI ${rsiNow.toFixed(1)}, MACD hist ${macdHistNow.toFixed(4)}, ATR% ${atrPct.toFixed(2)}`,
            breakout_scenarios: `Bullish above $${(priceNow * 1.02).toFixed(2)}, Bearish below $${(priceNow * 0.98).toFixed(2)}`
          },
          fundamental: { macro_environment: 'Stable', institutional_flow: 'Mixed', network_health: '', competitive_landscape: '', catalysts: '' },
          sentiment: { market_sentiment: 'Neutral', fear_greed_analysis: '', social_metrics: '', options_flow: '', contrarian_indicators: '' },
          multi_directional_signals: {
            bullish_scenario: { probability: direction==='LONG'? `${Math.max(55, baseConfidence)}%` : '35%', triggers: `Close > ${ (priceNow*1.01).toFixed(2) } with volume`, targets: `TP1 ${ (tp1).toFixed(2) }, TP2 ${ (tp2).toFixed(2) }, TP3 ${ (tp3).toFixed(2) }`, timeframe: '1-3 days', risk_factors: 'Macro shocks' },
            bearish_scenario: { probability: direction==='SHORT'? `${Math.max(55, baseConfidence)}%` : '35%', triggers: `Close < ${ (priceNow*0.99).toFixed(2) } with volume`, targets: `TP1 ${ (tp1).toFixed(2) }, TP2 ${ (tp2).toFixed(2) }, TP3 ${ (tp3).toFixed(2) }`, timeframe: '1-3 days', risk_factors: 'Short squeezes' },
            neutral_scenario: { probability: '10-20%', range: `$${(priceNow*0.99).toFixed(2)}-$${(priceNow*1.01).toFixed(2)}`, duration: '1-2 days', breakout_catalysts: 'High impact news' }
          }
        },
        quantitative_metrics: { sharpe_ratio_estimate: 'n/a', max_drawdown_probability: 'n/a', volatility_forecast: 'n/a', correlation_factors: 'n/a' },
        execution_strategy: { entry_zones: 'n/a', position_sizing: 'n/a', stop_loss_strategy: 'n/a', profit_taking: 'n/a', hedging_options: 'n/a' },
        risk_assessment: { tail_risks: '', correlation_risks: '', liquidity_risks: '', regulatory_risks: '', technical_risks: '' }
      };
    }

    const signal4h = {
      timeframe: '4H',
      direction,
      confidence: Math.round(baseConfidence),
      entry: parseFloat(entry.toFixed(2)),
      stop_loss: parseFloat(stop.toFixed(2)),
      take_profits: [parseFloat(tp1.toFixed(2)), parseFloat(tp2.toFixed(2)), parseFloat(tp3.toFixed(2))],
      indicators: {
        rsi14: parseFloat(rsiNow.toFixed(2)),
        macd_hist: parseFloat(macdHistNow.toFixed(6)),
        ema50_above_ema200: ema50Above200,
        atr_percent: parseFloat(atrPct.toFixed(2)),
        funding_rate: fundingRate,
        orderbook_imbalance_pct: obImbalance
      },
      reasoning: [
        `Trend: EMA50 ${ema50Above200 ? 'above' : 'below'} EMA200`,
        `Momentum: MACD histogram ${macdHistNow >= 0 ? 'positive' : 'negative'}`,
        `RSI14 ${rsiNow.toFixed(1)}`,
        `ATR ${atrPct.toFixed(2)}% for sizing`,
        `OB imbalance ${(obImbalance ?? 0).toFixed(2)}%`,
        `Funding ${fundingRate ?? 'n/a'}`
      ]
    };

    return {
      summary: analysis.summary,
      confidence: analysis.confidence,
      data: {
        ...analysis,
        signal_4h: signal4h,
        market_data: {
          price: parseFloat(marketData.price.toFixed(2)),
          percentChange24h: parseFloat(marketData.percentChange24h.toFixed(2)),
          volume24h: marketData.volume24h,
          marketCap: marketData.marketCap,
          name: marketData.name,
          symbol: marketData.symbol
        },
        timestamp: new Date().toISOString(),
        coin: coin
      }
    };

  } catch (error) {
    console.error('Error generating professional report:', error);
    throw error;
  }
}
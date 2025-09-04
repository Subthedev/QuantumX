import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const cmcApiKey = Deno.env.get('CMC_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase environment variables');
  throw new Error('Server configuration error');
}

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

// Cache for market data
const marketDataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

async function fetchCoinGeckoData(symbol: string) {
  const coinId = symbol === 'BTC' ? 'bitcoin' : 'ethereum';
  
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const coinData = data[coinId];
    
    return {
      price: coinData.usd,
      marketCap: coinData.usd_market_cap,
      volume24h: coinData.usd_24h_vol,
      percentChange24h: coinData.usd_24h_change,
      percentChange1h: 0, // CoinGecko doesn't provide 1h change in simple endpoint
      percentChange7d: 0, // Would need different endpoint
      percentChange30d: 0,
      circulatingSupply: 0,
      totalSupply: 0,
      maxSupply: symbol === 'BTC' ? 21000000 : null,
      description: '',
      symbol: symbol,
      name: symbol === 'BTC' ? 'Bitcoin' : 'Ethereum'
    };
  } catch (error) {
    console.error('Error fetching CoinGecko data:', error);
    throw error;
  }
}

async function fetchCMCData(symbol: string) {
  // Skip CMC if API key is not available
  if (!cmcApiKey) {
    console.log('CMC API key not configured, skipping CMC data fetch');
    throw new Error('CMC API key not configured');
  }
  
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

// Fetch market data with caching and fallback
async function fetchMarketData(symbol: string) {
  const cacheKey = `market_${symbol}`;
  const cached = marketDataCache.get(cacheKey);
  
  // Return cached data if still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached market data for ${symbol}`);
    return cached.data;
  }
  
  try {
    // Try CMC first (more comprehensive data)
    const data = await fetchCMCData(symbol);
    marketDataCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (cmcError) {
    console.error('CMC failed, trying CoinGecko:', cmcError);
    
    try {
      // Fallback to CoinGecko
      const data = await fetchCoinGeckoData(symbol);
      marketDataCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (geckoError) {
      console.error('Both APIs failed:', geckoError);
      
      // Return cached data even if stale
      if (cached) {
        console.log('Returning stale cached data');
        return cached.data;
      }
      
      throw new Error('Unable to fetch market data from any source');
    }
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
    const marketData = await fetchMarketData(coin); // Now uses caching and fallback

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

    // Enhanced scoring engine for higher confidence signals
    let bullish = 0, bearish = 0;
    // Trend bias (weighted more heavily)
    if (ema50Above200) bullish += 3; else bearish += 3;
    // Momentum (weighted)
    if (macdHistNow > 0) bullish += 2; else bearish += 2;
    // RSI zones (refined for stronger signals)
    if (rsiNow >= 60 && rsiNow <= 70) bullish += 2;
    if (rsiNow <= 40 && rsiNow >= 30) bearish += 2;
    if (rsiNow > 80) bearish += 2; // strong overbought
    if (rsiNow < 20) bullish += 2; // strong oversold
    // Orderbook imbalance (stronger thresholds)
    if ((obImbalance ?? 0) > 10) bullish += 2;
    if ((obImbalance ?? 0) < -10) bearish += 2;
    // Funding rate heuristics
    if ((fundingRate ?? 0) > 0.01) bearish += 1; // crowded longs
    if ((fundingRate ?? 0) < -0.005) bullish += 1; // crowded shorts

    const scoreDiff = bullish - bearish;

    // Require stronger conviction for directional trades
    let direction: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
    if (scoreDiff >= 3) direction = 'LONG';
    if (scoreDiff <= -3) direction = 'SHORT';

    // Enhanced confidence calculation for institutional-grade signals
    const alignedSignals = Math.max(bullish, bearish);
    let confidence = Math.min(95, Math.max(50, 65 + alignedSignals * 4 - Math.abs(atrPct - 2.5)));
    
    // Boost confidence for strong directional alignment
    if (Math.abs(scoreDiff) >= 5) confidence = Math.min(95, confidence + 10);
    if (direction === 'HOLD') confidence = Math.min(confidence, 70);

    // Professional trading levels with risk management
    const entry = direction === 'LONG' ? priceNow - 0.2 * atrNow : direction === 'SHORT' ? priceNow + 0.2 * atrNow : priceNow;
    const stop = direction === 'LONG' ? priceNow - 0.8 * atrNow : direction === 'SHORT' ? priceNow + 0.8 * atrNow : priceNow - 0.8 * atrNow;
    const tp1 = direction === 'LONG' ? priceNow + 0.5 * atrNow : priceNow - 0.5 * atrNow;
    const tp2 = direction === 'LONG' ? priceNow + 1.0 * atrNow : priceNow - 1.0 * atrNow;
    const tp3 = direction === 'LONG' ? priceNow + 1.5 * atrNow : priceNow - 1.5 * atrNow;

    // Calculate risk/reward ratios
    const riskAmount = Math.abs(entry - stop);
    const reward1 = Math.abs(tp1 - entry);
    const reward2 = Math.abs(tp2 - entry);
    const reward3 = Math.abs(tp3 - entry);
    const riskRewardRatio1 = reward1 / riskAmount;
    const riskRewardRatio2 = reward2 / riskAmount;
    const riskRewardRatio3 = reward3 / riskAmount;

    // Position sizing based on risk (2% rule)
    const accountBalance = 10000; // Default for demo, can be parameterized
    const riskPercentage = 0.02; // 2% risk per trade
    const dollarRisk = accountBalance * riskPercentage;
    const positionSize = dollarRisk / riskAmount;

    // Validation checks
    const validationResults = {
      confidenceCheck: confidence >= 75,
      entryPriceCheck: Math.abs((entry - priceNow) / priceNow) <= 0.02,
      riskRewardCheck: riskRewardRatio1 >= 1.5,
      stopLossCheck: Math.abs((stop - entry) / entry) <= 0.05,
      overallValid: false
    };
    
    validationResults.overallValid = 
      validationResults.confidenceCheck &&
      validationResults.entryPriceCheck &&
      validationResults.riskRewardCheck &&
      validationResults.stopLossCheck;

    // Existing broader analysis (kept for compatibility)
    // Enhanced market analysis calculations
    const volatilityScore = Math.abs(marketData.percentChange7d) + Math.abs(marketData.percentChange24h);
    const momentumScore = (marketData.percentChange1h + marketData.percentChange24h + marketData.percentChange7d) / 3;
    const volumeStrength = marketData.volume24h / marketData.marketCap * 100; // Volume to market cap ratio
    const marketDirection = momentumScore > 2 ? 'strong_bullish' : momentumScore > 0 ? 'bullish' : momentumScore > -2 ? 'neutral' : momentumScore > -5 ? 'bearish' : 'strong_bearish';

    // Dynamic confidence base (used for narrative)
    const baseConfidence = Math.round(confidence);

    console.log(`Generating institution-grade AI analysis for ${coin} with 4H signal ${direction} @ conf ${baseConfidence}%`);

    const systemPrompt = 'You are a senior quantitative analyst at a tier-1 institutional trading firm specializing in cryptocurrency markets. Your analysis combines technical indicators, fundamental metrics, sentiment analysis, and quantitative risk models to provide actionable investment insights. Always provide multi-directional analysis with specific probability assessments. Output strictly valid JSON matching the schema used previously.';
    const userPrompt = `FOCUS: 4H timeframe direct trading signal.\nAsset: ${coin}\nPrice: ${priceNow.toFixed(2)}\nRSI14: ${rsiNow.toFixed(1)}\nMACD hist: ${macdHistNow.toFixed(4)}\nEMA50>${ema50Above200 ? '' : 'not '}EMA200\nATR%: ${atrPct.toFixed(2)}\nFunding: ${fundingRate ?? 'n/a'}\nOrderbook imbalance: ${(obImbalance ?? 0).toFixed(2)}%\nDirection decided: ${direction} with confidence ${baseConfidence}%.\nProvide concise multi-scenario quantitative summary following the JSON schema shared earlier; keep HOLD minimal.`;

    async function generateWithResponses(model: string) {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_completion_tokens: 1500
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error(`[OpenAI Responses] ${model} failed`, res.status, txt);
        throw new Error(`OpenAI Responses ${model} error: ${res.status}`);
      }
      const data = await res.json();
      // Robust parsing across possible shapes
      const text = data.output_text
        ?? data.content?.[0]?.text
        ?? data.output?.[0]?.content?.map((c: any) => c.text || c)?.join('')
        ?? data.choices?.[0]?.message?.content
        ?? '';
      return String(text);
    }

    async function generateWithChat(model: string, temperature: number = 0.1) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: model === 'gpt-4-turbo-preview' ? 2000 : 1500
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error(`[OpenAI Chat] ${model} failed`, res.status, txt);
        throw new Error(`OpenAI Chat ${model} error: ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    }

    let analysisText: string | null = null;
    
    // Check if OpenAI API key is configured
    if (!openaiApiKey) {
      console.log('OpenAI API key not configured, using deterministic fallback');
      analysisText = null;
    } else {
      try {
        // 1) Primary: Use GPT-4-turbo-preview with low temperature for financial analysis
        console.log('Attempting GPT-4-turbo-preview...');
        analysisText = await generateWithChat('gpt-4-turbo-preview', 0.1);
      } catch (e1) {
        console.error('GPT-4-turbo-preview failed:', e1);
        try {
          // 2) Fallback to GPT-4o-mini which is more reliable
          console.log('Attempting GPT-4o-mini fallback...');
          analysisText = await generateWithChat('gpt-4o-mini');
        } catch (e2) {
          console.error('All OpenAI calls failed, using deterministic fallback:', e2);
          analysisText = null;
        }
      }
    }

    let analysis: any;
    if (analysisText) {
      try {
        let cleanedResponse = analysisText.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        analysis = JSON.parse(cleanedResponse);
      } catch (parseErr) {
        console.warn('AI JSON parse failed; using structured fallback.', parseErr);
        analysis = undefined;
      }
    }

    if (!analysis) {
      // Enhanced deterministic fallback with complete data for all 6 sections
      const bullishSignals = bullish;
      const bearishSignals = bearish;
      const totalSignals = Math.max(bullishSignals + bearishSignals, 1);
      
      analysis = {
        summary: `${coin} shows ${direction} signal at ${priceNow.toFixed(2)} with ${baseConfidence}% confidence. Technical indicators: RSI ${rsiNow.toFixed(1)}, MACD ${macdHistNow > 0 ? 'bullish' : 'bearish'}, ATR ${atrPct.toFixed(2)}%. ${direction === 'LONG' ? 'Bullish momentum building.' : direction === 'SHORT' ? 'Bearish pressure increasing.' : 'Market consolidating.'}`,
        confidence: baseConfidence,
        market_direction: marketDirection,
        analysis: {
          technical: {
            trend: direction === 'LONG' ? 'Bullish' : direction === 'SHORT' ? 'Bearish' : 'Neutral',
            primary_trend: marketDirection.includes('bullish') ? 'Bullish' : marketDirection.includes('bearish') ? 'Bearish' : 'Neutral',
            support_levels: [(priceNow * 0.97), (priceNow * 0.94), (priceNow * 0.91)],
            resistance_levels: [(priceNow * 1.03), (priceNow * 1.06), (priceNow * 1.09)],
            indicators: [
              `RSI(14): ${rsiNow.toFixed(1)}`,
              `MACD: ${macdHistNow > 0 ? 'Bullish' : 'Bearish'} (${macdHistNow.toFixed(4)})`,
              `EMA Cross: ${ema50Above200 ? 'Bullish' : 'Bearish'}`,
              `ATR: ${atrPct.toFixed(2)}%`,
              `Volume: ${marketData.volume24h > marketData.marketCap * 0.1 ? 'High' : 'Normal'}`
            ],
            key_indicators: `RSI at ${rsiNow.toFixed(1)} ${rsiNow > 70 ? '(overbought)' : rsiNow < 30 ? '(oversold)' : '(neutral)'}, MACD ${macdHistNow > 0 ? 'positive' : 'negative'}, ${ema50Above200 ? 'EMA50 above EMA200' : 'EMA50 below EMA200'}`,
            breakout_scenarios: `Watch for breakout above $${(priceNow * 1.02).toFixed(2)} for bullish continuation or below $${(priceNow * 0.98).toFixed(2)} for bearish breakdown. Key level: $${priceNow.toFixed(2)}`
          },
          fundamental: {
            strengths: [
              coin === 'BTC' ? 'Market leader with highest liquidity' : 'Leading smart contract platform',
              `Market cap dominance: ${coin === 'BTC' ? '45-50%' : '15-20%'}`,
              'Strong institutional adoption',
              marketDirection.includes('bullish') ? 'Positive market sentiment' : 'Oversold conditions creating opportunity'
            ],
            weaknesses: [
              volatilityScore > 20 ? 'High volatility risk' : 'Moderate volatility',
              rsiNow > 70 ? 'Overbought conditions' : rsiNow < 30 ? 'Oversold pressure' : 'Consolidation phase',
              'Regulatory uncertainty',
              'Correlation with macro markets'
            ],
            market_position: `${coin} is ${marketDirection.includes('bullish') ? 'showing strength' : marketDirection.includes('bearish') ? 'under pressure' : 'consolidating'} with ${volumeStrength.toFixed(2)}% volume/mcap ratio`,
            adoption_metrics: `Trading volume ${marketData.volume24h > 1e9 ? 'exceeds $1B' : 'moderate'}, ${marketData.percentChange24h > 0 ? 'positive' : 'negative'} 24h momentum`,
            competitive_position: coin === 'BTC' ? 'Dominant store of value' : 'Leading DeFi ecosystem',
            macro_environment: `${momentumScore > 0 ? 'Risk-on' : 'Risk-off'} environment, ${volatilityScore > 15 ? 'high' : 'moderate'} volatility regime`,
            institutional_flow: fundingRate && fundingRate > 0.01 ? 'High long interest' : fundingRate && fundingRate < -0.005 ? 'Short interest building' : 'Balanced positioning',
            network_health: 'Active development, strong hash rate' + (coin === 'ETH' ? ', high gas activity' : ''),
            competitive_landscape: coin === 'BTC' ? 'Unchallenged as digital gold' : 'Competition from L2s and alt-L1s',
            catalysts: 'Upcoming: ETF flows, halving effects, institutional adoption milestones'
          },
          sentiment: {
            overall: sentimentScore > 70 ? 'Bullish' : sentimentScore > 55 ? 'Slightly Bullish' : sentimentScore > 45 ? 'Neutral' : sentimentScore > 30 ? 'Slightly Bearish' : 'Bearish',
            factors: [
              `Technical alignment: ${bullishSignals}/${totalSignals} bullish signals`,
              `Price action: ${marketData.percentChange24h > 0 ? 'Positive' : 'Negative'} 24h change (${marketData.percentChange24h.toFixed(2)}%)`,
              `Volume trend: ${volumeStrength > 5 ? 'Above average' : 'Normal'} activity`,
              `Market structure: ${ema50Above200 ? 'Bullish' : 'Bearish'} trend`,
              obImbalance ? `Order book: ${obImbalance > 0 ? 'Buy' : 'Sell'} pressure (${Math.abs(obImbalance).toFixed(1)}%)` : 'Order book: Balanced'
            ],
            risk_level: riskRewardRatio1 >= 2 ? 'Low' : riskRewardRatio1 >= 1.5 ? 'Medium' : 'High',
            market_sentiment: `Market ${momentumScore > 2 ? 'strongly bullish' : momentumScore > 0 ? 'mildly bullish' : momentumScore > -2 ? 'neutral' : 'bearish'}`,
            fear_greed_analysis: `${rsiNow > 75 ? 'Extreme greed' : rsiNow > 60 ? 'Greed' : rsiNow > 40 ? 'Neutral' : rsiNow > 25 ? 'Fear' : 'Extreme fear'} zone (RSI: ${rsiNow.toFixed(1)})`,
            social_metrics: 'Moderate social activity, standard mention volume',
            options_flow: fundingRate ? `Funding ${fundingRate > 0 ? 'positive' : 'negative'} at ${(fundingRate * 100).toFixed(3)}%` : 'No derivatives data',
            contrarian_indicators: rsiNow > 80 || rsiNow < 20 ? 'Extreme levels suggest reversal potential' : 'No extreme readings'
          },
          multi_directional_signals: {
            bullish_scenario: {
              probability: direction === 'LONG' ? `${Math.min(75, baseConfidence)}%` : '30%',
              triggers: `Break above $${(priceNow * 1.01).toFixed(2)} with volume`,
              targets: `$${tp1.toFixed(2)}, $${tp2.toFixed(2)}, $${tp3.toFixed(2)}`,
              timeframe: '4-12 hours',
              risk_factors: 'Rejection at resistance, macro headwinds'
            },
            bearish_scenario: {
              probability: direction === 'SHORT' ? `${Math.min(75, baseConfidence)}%` : '30%',
              triggers: `Break below $${(priceNow * 0.99).toFixed(2)} with volume`,
              targets: `$${tp1.toFixed(2)}, $${tp2.toFixed(2)}, $${tp3.toFixed(2)}`,
              timeframe: '4-12 hours',
              risk_factors: 'Support bounce, short squeeze risk'
            },
            neutral_scenario: {
              probability: direction === 'HOLD' ? '40%' : '20%',
              range: `$${(priceNow * 0.98).toFixed(2)} - $${(priceNow * 1.02).toFixed(2)}`,
              duration: '2-6 hours',
              breakout_catalysts: 'Volume spike, news catalyst, Bitcoin move'
            }
          }
        },
        targets: {
          take_profit_1: tp1,
          take_profit_2: tp2,
          take_profit_3: tp3,
          stop_loss: stop,
          target_timeframe: '4-8 hours'
        },
        risk_management: {
          position_size: `${(positionSize / accountBalance * 100).toFixed(2)}% of account`,
          risk_reward_ratio: `1:${riskRewardRatio1.toFixed(2)}`,
          max_drawdown: `${((Math.abs(stop - entry) / entry) * 100).toFixed(2)}%`
        },
        quantitative_metrics: {
          sharpe_ratio_estimate: 'Not calculated',
          max_drawdown_probability: `${validationResults.overallValid ? 'Low' : 'Medium'}`,
          volatility_forecast: `${atrPct.toFixed(2)}% ATR-based volatility`,
          correlation_factors: 'BTC correlation: High'
        },
        execution_strategy: {
          entry_zones: `Primary: $${entry.toFixed(2)}, Secondary: $${(entry * (direction === 'LONG' ? 0.995 : 1.005)).toFixed(2)}`,
          position_sizing: `Risk 1-2% per trade, size: ${positionSize.toFixed(4)} units`,
          stop_loss_strategy: `Initial: $${stop.toFixed(2)}, Trail after TP1`,
          profit_taking: '40% at TP1, 30% at TP2, 30% at TP3',
          hedging_options: 'Consider opposite position at extreme levels'
        },
        risk_assessment: {
          tail_risks: 'Black swan events, regulatory changes',
          correlation_risks: 'High correlation with traditional markets during stress',
          liquidity_risks: volumeStrength < 2 ? 'Low liquidity warning' : 'Adequate liquidity',
          regulatory_risks: 'Policy changes, exchange restrictions',
          technical_risks: 'False breakouts, stop hunting'
        }
      };
      
      // Calculate proper sentiment score for the overall market
      const sentimentScore = (bullishSignals / totalSignals) * 100;
    }

    // Normalize confidence to a number for DB
    const numericConfidence = Number(String(analysis.confidence).toString().replace('%',''));
    if (!Number.isFinite(numericConfidence)) {
      analysis.confidence = baseConfidence;
    } else {
      analysis.confidence = Math.round(Math.min(99, Math.max(1, numericConfidence)));
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

    // Add validation and risk metrics to the response
    const signalValidation = {
      passed: validationResults.overallValid,
      checks: validationResults,
      warnings: [],
      status: validationResults.overallValid ? 'APPROVED' : 'REVIEW_REQUIRED'
    };
    
    if (!validationResults.confidenceCheck) {
      signalValidation.warnings.push(`Confidence ${confidence}% is below 75% threshold`);
    }
    if (!validationResults.entryPriceCheck) {
      signalValidation.warnings.push('Entry price is more than 2% from current price');
    }
    if (!validationResults.riskRewardCheck) {
      signalValidation.warnings.push(`Risk/Reward ratio ${riskRewardRatio1.toFixed(2)} is below 1.5:1`);
    }
    if (!validationResults.stopLossCheck) {
      signalValidation.warnings.push('Stop loss is more than 5% from entry');
    }

    // Ensure we always have a robust non-empty summary for DB NOT NULL constraint
    const robustSummary = (typeof analysis.summary === 'string' && analysis.summary.trim().length > 0)
      ? analysis.summary.trim()
      : `${coin} ${timeframe} signal: ${direction} @ ${Math.round(analysis.confidence)}% conf. Price $${priceNow.toFixed(2)} | RSI ${rsiNow.toFixed(1)} | MACD ${macdHistNow.toFixed(4)} | ATR ${atrPct.toFixed(2)}%.`;

    return {
      summary: robustSummary,
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
        risk_metrics: {
          risk_reward_ratios: {
            tp1: parseFloat(riskRewardRatio1.toFixed(2)),
            tp2: parseFloat(riskRewardRatio2.toFixed(2)),
            tp3: parseFloat(riskRewardRatio3.toFixed(2))
          },
          position_size: parseFloat(positionSize.toFixed(4)),
          dollar_risk: parseFloat(dollarRisk.toFixed(2)),
          risk_percentage: riskPercentage,
          max_loss: parseFloat((riskAmount * positionSize).toFixed(2))
        },
        validation: signalValidation,
        timestamp: new Date().toISOString(),
        signal_expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        coin: coin
      }
    };

  } catch (error) {
    console.error('Error generating professional report:', error);
    throw error;
  }
}
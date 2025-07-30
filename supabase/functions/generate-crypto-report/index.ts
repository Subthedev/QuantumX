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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coin, userId }: RequestBody = await req.json();

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
    const prediction = await generateProfessionalReport(coin);

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

async function generateProfessionalReport(coin: 'BTC' | 'ETH') {
  try {
    console.log(`Fetching market data for ${coin}...`);
    const marketData = await fetchCMCData(coin);
    
    console.log(`Generating AI analysis for ${coin}...`);
    const prompt = `
You are a professional cryptocurrency analyst. Based on the following real-time market data for ${marketData.name} (${coin}), provide a comprehensive trading report in JSON format.

Market Data:
- Current Price: $${marketData.price.toFixed(2)}
- Market Cap: $${marketData.marketCap.toLocaleString()}
- 24h Volume: $${marketData.volume24h.toLocaleString()}
- 1h Change: ${marketData.percentChange1h.toFixed(2)}%
- 24h Change: ${marketData.percentChange24h.toFixed(2)}%
- 7d Change: ${marketData.percentChange7d.toFixed(2)}%
- 30d Change: ${marketData.percentChange30d.toFixed(2)}%
- Circulating Supply: ${marketData.circulatingSupply.toLocaleString()}

Please provide a comprehensive analysis in this exact JSON structure:
{
  "summary": "Executive summary of the analysis (2-3 sentences)",
  "confidence": number between 60-95,
  "analysis": {
    "technical": {
      "trend": "bullish" | "bearish" | "neutral",
      "support_levels": [number, number, number],
      "resistance_levels": [number, number, number],
      "indicators": ["RSI analysis", "Moving averages", "Volume analysis", "Momentum indicators"]
    },
    "fundamental": {
      "strengths": ["strength 1", "strength 2", "strength 3"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "market_position": "Description of market position and dominance"
    },
    "sentiment": {
      "overall": "bullish" | "bearish" | "neutral",
      "factors": ["factor 1", "factor 2", "factor 3"],
      "risk_level": "low" | "medium" | "high"
    }
  },
  "targets": {
    "take_profit_1": number,
    "take_profit_2": number,
    "take_profit_3": number,
    "stop_loss": number,
    "target_timeframe": "7-14 days" | "2-4 weeks" | "1-2 months"
  },
  "risk_management": {
    "position_size": "Recommended position size as % of portfolio",
    "risk_reward_ratio": "X:Y format",
    "max_drawdown": "Expected maximum drawdown percentage"
  }
}

Base your analysis on current market conditions, technical indicators, and fundamental factors. Make the targets realistic based on historical volatility and current price action.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional cryptocurrency analyst with 10+ years of experience in technical analysis, fundamental analysis, and risk management. Provide detailed, actionable insights.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0].message.content;
    
    // Parse the JSON response from OpenAI
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback analysis structure
      analysis = {
        summary: `${marketData.name} analysis based on current market conditions showing ${marketData.percentChange24h >= 0 ? 'positive' : 'negative'} momentum.`,
        confidence: 75,
        analysis: {
          technical: {
            trend: marketData.percentChange24h >= 0 ? "bullish" : "bearish",
            support_levels: [marketData.price * 0.95, marketData.price * 0.90, marketData.price * 0.85],
            resistance_levels: [marketData.price * 1.05, marketData.price * 1.10, marketData.price * 1.15],
            indicators: ["Technical analysis pending", "Volume analysis in progress"]
          },
          fundamental: {
            strengths: ["Market leader", "Strong adoption"],
            weaknesses: ["Regulatory uncertainty"],
            market_position: "Leading cryptocurrency with strong market presence"
          },
          sentiment: {
            overall: marketData.percentChange7d >= 0 ? "bullish" : "bearish",
            factors: ["Market conditions", "Recent performance"],
            risk_level: "medium"
          }
        },
        targets: {
          take_profit_1: marketData.price * 1.05,
          take_profit_2: marketData.price * 1.10,
          take_profit_3: marketData.price * 1.15,
          stop_loss: marketData.price * 0.95,
          target_timeframe: "2-4 weeks"
        },
        risk_management: {
          position_size: "2-5% of portfolio",
          risk_reward_ratio: "1:2",
          max_drawdown: "15-20%"
        }
      };
    }

    return {
      summary: analysis.summary,
      confidence: analysis.confidence,
      data: {
        ...analysis,
        market_data: marketData,
        timestamp: new Date().toISOString(),
        coin: coin
      }
    };

  } catch (error) {
    console.error('Error generating professional report:', error);
    throw error;
  }
}
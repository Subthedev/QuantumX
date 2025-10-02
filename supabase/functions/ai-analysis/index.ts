import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coin, detailedData, analysisType } = await req.json();
    
    console.log('Generating AI analysis for:', coin.symbol, 'Type:', analysisType);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare market data context
    const marketContext = {
      name: coin.name,
      symbol: coin.symbol,
      price: coin.current_price,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      priceChange24h: coin.price_change_percentage_24h,
      priceChange7d: coin.price_change_percentage_7d_in_currency,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      ath: coin.ath,
      athDate: coin.ath_date,
      atl: coin.atl,
      atlDate: coin.atl_date,
      sparklineData: coin.sparkline_in_7d?.price || [],
      marketCapRank: coin.market_cap_rank,
      detailedMetrics: detailedData,
    };

    // Generate analysis prompt based on type
    let systemPrompt = `You are a professional cryptocurrency analyst with expertise in ${analysisType} analysis. Provide comprehensive, actionable insights based on real market data.`;
    let userPrompt = '';

    switch (analysisType) {
      case 'technical':
        userPrompt = `Perform a detailed technical analysis for ${coin.name} (${coin.symbol.toUpperCase()}):

Market Data:
- Current Price: $${coin.current_price}
- 24h Change: ${coin.price_change_percentage_24h}%
- 7d Change: ${coin.price_change_percentage_7d_in_currency}%
- 24h High/Low: $${coin.high_24h} / $${coin.low_24h}
- Volume: $${coin.total_volume}
- ATH: $${coin.ath} (${coin.ath_date})

Analyze:
1. Price Action & Trend Direction
2. Support and Resistance Levels
3. Volume Analysis
4. Momentum Indicators (RSI, MACD implied from price action)
5. Chart Patterns
6. Entry/Exit Points
7. Risk/Reward Setup

Provide specific price targets and stop-loss levels.`;
        break;

      case 'fundamental':
        userPrompt = `Perform a comprehensive fundamental analysis for ${coin.name} (${coin.symbol.toUpperCase()}):

Key Metrics:
- Market Cap: $${coin.market_cap} (Rank #${coin.market_cap_rank})
- Circulating Supply: ${coin.circulating_supply}
- Max Supply: ${coin.max_supply || 'Unlimited'}
- Market Cap to Volume Ratio: ${(coin.market_cap / coin.total_volume).toFixed(2)}

Analyze:
1. Tokenomics & Supply Dynamics
2. Market Position & Competitive Advantage
3. Use Case & Real-World Adoption
4. Development Activity & Roadmap
5. Partnership & Ecosystem Growth
6. Revenue Model & Sustainability
7. Investment Thesis

Provide valuation assessment and long-term outlook.`;
        break;

      case 'sentiment':
        userPrompt = `Perform a sentiment analysis for ${coin.name} (${coin.symbol.toUpperCase()}):

Market Performance:
- 24h Price Change: ${coin.price_change_percentage_24h}%
- 7d Price Change: ${coin.price_change_percentage_7d_in_currency}%
- Volume Change: Analyze based on $${coin.total_volume}
- Distance from ATH: ${((1 - coin.current_price / coin.ath) * 100).toFixed(2)}%

Analyze:
1. Overall Market Sentiment (Bullish/Bearish/Neutral)
2. Price-Volume Relationship
3. Momentum Analysis
4. Market Psychology & Investor Behavior
5. Fear & Greed Indicators
6. Social Sentiment Implications
7. Contrarian Opportunities

Provide sentiment score and trading recommendations.`;
        break;

      case 'onchain':
        userPrompt = `Perform on-chain analysis for ${coin.name} (${coin.symbol.toUpperCase()}):

Supply Metrics:
- Circulating Supply: ${coin.circulating_supply}
- Total Supply: ${coin.total_supply}
- Max Supply: ${coin.max_supply || 'Unlimited'}
- Supply Ratio: ${((coin.circulating_supply / (coin.max_supply || coin.total_supply)) * 100).toFixed(2)}%

Analyze:
1. Supply Distribution & Whale Activity
2. Network Activity Trends
3. Exchange Flow Analysis
4. Holder Behavior Patterns
5. Smart Money Movement
6. Network Health Metrics
7. Accumulation/Distribution Phases

Provide on-chain signals and investor positioning insights.`;
        break;

      case 'etf':
        userPrompt = `Analyze ETF and institutional flow data for ${coin.name} (${coin.symbol.toUpperCase()}):

Market Context:
- Market Cap: $${coin.market_cap}
- Daily Volume: $${coin.total_volume}
- Market Dominance: ${((coin.market_cap / 4000000000000) * 100).toFixed(3)}%

Analyze:
1. ETF Availability & Products
2. Institutional Interest Indicators
3. Spot vs Derivatives Volume
4. Premium/Discount Analysis
5. Flow Direction & Size
6. Regulatory Impact
7. Traditional Finance Integration

Provide institutional sentiment and flow-based predictions.`;
        break;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error('Failed to generate analysis');
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Extract key points from the analysis
    const keyPoints = [];
    const lines = analysis.split('\n');
    for (const line of lines) {
      if (line.match(/^[1-9]\.|^-|^•/) && line.length > 20 && line.length < 150) {
        keyPoints.push(line.replace(/^[1-9]\.|^-|^•/, '').trim());
        if (keyPoints.length >= 5) break;
      }
    }

    // Calculate confidence based on data quality and market conditions
    let confidence = 75;
    if (coin.market_cap_rank <= 10) confidence += 10;
    if (coin.total_volume > 1000000000) confidence += 5;
    if (Math.abs(coin.price_change_percentage_24h) < 5) confidence += 5;
    if (coin.sparkline_in_7d?.price?.length > 150) confidence += 5;
    confidence = Math.min(confidence, 95);

    // Extract metrics based on analysis type
    const metrics: Record<string, any> = {};
    
    switch (analysisType) {
      case 'technical':
        metrics.trend = coin.price_change_percentage_7d_in_currency > 0 ? 'Bullish' : 'Bearish';
        metrics.volatility = ((coin.high_24h - coin.low_24h) / coin.current_price * 100).toFixed(2) + '%';
        metrics.volume_ratio = (coin.total_volume / coin.market_cap).toFixed(4);
        break;
      case 'fundamental':
        metrics.mcap_rank = coin.market_cap_rank;
        metrics.supply_ratio = coin.max_supply ? 
          ((coin.circulating_supply / coin.max_supply) * 100).toFixed(2) + '%' : 'Unlimited';
        metrics.market_dominance = ((coin.market_cap / 4000000000000) * 100).toFixed(3) + '%';
        break;
      case 'sentiment':
        metrics.price_momentum = coin.price_change_percentage_24h > 0 ? 'Positive' : 'Negative';
        metrics.volume_trend = 'Normal';
        metrics.distance_from_ath = ((1 - coin.current_price / coin.ath) * 100).toFixed(2) + '%';
        break;
      case 'onchain':
        metrics.circulating_supply = coin.circulating_supply?.toLocaleString() || 'N/A';
        metrics.supply_issued = coin.max_supply ? 
          ((coin.circulating_supply / coin.max_supply) * 100).toFixed(2) + '%' : 'N/A';
        break;
      case 'etf':
        metrics.market_cap = '$' + (coin.market_cap / 1000000000).toFixed(2) + 'B';
        metrics.daily_volume = '$' + (coin.total_volume / 1000000000).toFixed(2) + 'B';
        metrics.volume_mcap_ratio = (coin.total_volume / coin.market_cap).toFixed(4);
        break;
    }

    return new Response(
      JSON.stringify({
        analysis,
        keyPoints,
        confidence,
        metrics,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
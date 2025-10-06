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

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
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

    // Generate analysis prompt based on type with current date
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let systemPrompt = `You are a professional cryptocurrency analyst with expertise in ${analysisType} analysis. 

CRITICAL REQUIREMENTS:
- Today's date is ${currentDate}. All analysis must reflect current market conditions as of this date.
- Provide actionable insights that save traders time by doing the analysis for them.
- Reference quality data sources: CoinGecko API, on-chain metrics, market depth, and trading volume.
- Be specific with price levels, percentages, and timeframes.
- Focus on what traders should DO, not just what's happening.
- Include risk factors and confidence levels in your assessment.`;

    let userPrompt = '';

    switch (analysisType) {
      case 'technical':
        userPrompt = `Perform a detailed technical analysis for ${coin.name} (${coin.symbol.toUpperCase()}) as of ${currentDate}:

REAL-TIME MARKET DATA (Source: CoinGecko API):
- Current Price: $${coin.current_price.toLocaleString()}
- 24h Change: ${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
- 7d Change: ${coin.price_change_percentage_7d_in_currency > 0 ? '+' : ''}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%
- 24h High/Low: $${coin.high_24h.toLocaleString()} / $${coin.low_24h.toLocaleString()}
- 24h Volume: $${coin.total_volume.toLocaleString()}
- Market Cap: $${coin.market_cap.toLocaleString()} (Rank #${coin.market_cap_rank})
- All-Time High: $${coin.ath.toLocaleString()} (${new Date(coin.ath_date).toLocaleDateString()})
- Distance from ATH: ${((1 - coin.current_price / coin.ath) * 100).toFixed(1)}%

REQUIRED OUTPUT:
1. **Price Action & Trend**: Current momentum, trend strength, and timeframe analysis
2. **Key Levels**: Specific support levels (at least 2) and resistance levels (at least 2) with exact prices
3. **Volume Profile**: Compare current vs average volume, identify accumulation/distribution
4. **Entry Strategy**: 2-3 specific entry price points with reasoning
5. **Exit Strategy**: Take-profit levels and stop-loss recommendations
6. **Risk/Reward**: Calculate R:R ratio for recommended trades
7. **Timeframe**: Short-term (1-7 days) and medium-term (1-4 weeks) outlook

Be specific with dollar amounts and percentages. This analysis should save the trader hours of chart reading.`;
        break;

      case 'fundamental':
        userPrompt = `Perform a comprehensive fundamental analysis for ${coin.name} (${coin.symbol.toUpperCase()}) as of ${currentDate}:

KEY METRICS (Source: CoinGecko):
- Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B (Rank #${coin.market_cap_rank})
- Fully Diluted Valuation: $${coin.fully_diluted_valuation ? (coin.fully_diluted_valuation / 1e9).toFixed(2) + 'B' : 'N/A'}
- Circulating Supply: ${coin.circulating_supply?.toLocaleString() || 'N/A'}
- Total Supply: ${coin.total_supply?.toLocaleString() || 'N/A'}
- Max Supply: ${coin.max_supply ? coin.max_supply.toLocaleString() : 'Unlimited'}
- Supply Ratio: ${coin.max_supply ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1) : 'N/A'}%
- Volume/MCap Ratio: ${(coin.total_volume / coin.market_cap).toFixed(4)}
- Liquidity Score: ${coin.total_volume > coin.market_cap * 0.1 ? 'High' : coin.total_volume > coin.market_cap * 0.05 ? 'Medium' : 'Low'}

REQUIRED ANALYSIS:
1. **Tokenomics Assessment**: Supply dynamics, inflation rate, token utility
2. **Market Position**: Competitive advantages, market share, category leadership
3. **Adoption Metrics**: Real-world use cases, transaction volume trends, user growth
4. **Development Activity**: Recent updates, roadmap progress, GitHub activity (if available)
5. **Ecosystem Strength**: Partnerships, integrations, community size
6. **Valuation**: Compare to competitors, assess if overvalued/undervalued
7. **Investment Thesis**: Bull and bear cases, 6-12 month outlook

Provide specific valuation targets and investment timeframe recommendations.`;
        break;

      case 'sentiment':
        userPrompt = `Perform a sentiment analysis for ${coin.name} (${coin.symbol.toUpperCase()}) as of ${currentDate}:

MARKET PERFORMANCE INDICATORS:
- 24h Price Change: ${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
- 7d Price Change: ${coin.price_change_percentage_7d_in_currency > 0 ? '+' : ''}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%
- 30d Price Change: ${coin.price_change_percentage_30d_in_currency > 0 ? '+' : ''}${(coin.price_change_percentage_30d_in_currency || 0).toFixed(2)}%
- 24h Volume: $${coin.total_volume.toLocaleString()}
- Distance from ATH: ${((1 - coin.current_price / coin.ath) * 100).toFixed(1)}% below
- Distance from ATL: ${((coin.current_price / coin.atl - 1) * 100).toFixed(0)}% above

SENTIMENT ANALYSIS FRAMEWORK:
1. **Overall Sentiment Score**: Rate as Extremely Bullish/Bullish/Neutral/Bearish/Extremely Bearish
2. **Price-Volume Divergence**: Analyze if volume supports price movement
3. **Momentum Status**: Identify if momentum is accelerating, decelerating, or stable
4. **Market Psychology**: Fear vs Greed based on price action and ATH distance
5. **Crowd Positioning**: Are retail/institutions accumulating or distributing?
6. **Contrarian Signals**: Identify oversold/overbought opportunities
7. **Catalyst Events**: Recent news, updates, or events affecting sentiment

ACTIONABLE OUTPUT:
- Sentiment score (0-100)
- Recommended position: Accumulate/Hold/Reduce/Avoid
- Timeframe for reassessment
- Key price levels that would change sentiment`;
        break;

      case 'onchain':
        userPrompt = `Perform on-chain analysis for ${coin.name} (${coin.symbol.toUpperCase()}) as of ${currentDate}:

SUPPLY METRICS (Source: CoinGecko):
- Circulating Supply: ${coin.circulating_supply?.toLocaleString() || 'N/A'}
- Total Supply: ${coin.total_supply?.toLocaleString() || 'N/A'}
- Max Supply: ${coin.max_supply ? coin.max_supply.toLocaleString() : 'Unlimited'}
- Supply Issued: ${coin.max_supply ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1) : 'N/A'}%
- Remaining to Issue: ${coin.max_supply ? (((coin.max_supply - coin.circulating_supply) / coin.max_supply) * 100).toFixed(1) : 'N/A'}%

MARKET DEPTH:
- 24h Trading Volume: $${coin.total_volume.toLocaleString()}
- Volume/Market Cap: ${((coin.total_volume / coin.market_cap) * 100).toFixed(2)}%
- Market Cap Rank: #${coin.market_cap_rank}

ON-CHAIN ANALYSIS FRAMEWORK:
1. **Supply Distribution**: Analyze concentration risk and decentralization
2. **Whale Activity Signals**: Infer large holder behavior from price/volume patterns
3. **Exchange Flow Pattern**: Volume trends suggesting accumulation or distribution
4. **Holder Behavior**: Long-term holders vs short-term traders based on volatility
5. **Smart Money Indicators**: Volume spikes, support/resistance tests, OI changes
6. **Network Health**: Transaction volume trends, active address growth
7. **Accumulation Phases**: Identify if we're in markup, distribution, or accumulation

ACTIONABLE INSIGHTS:
- Current phase: Accumulation/Distribution/Markup/Markdown
- Whale positioning: Buying/Selling/Neutral
- Recommended action based on on-chain signals
- Risk factors from supply dynamics`;
        break;

      case 'etf':
        userPrompt = `Analyze ETF and institutional flow implications for ${coin.name} (${coin.symbol.toUpperCase()}) as of ${currentDate}:

MARKET CONTEXT (Source: CoinGecko):
- Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B (Rank #${coin.market_cap_rank})
- 24h Volume: $${(coin.total_volume / 1e9).toFixed(2)}B
- Market Dominance: ${((coin.market_cap / 2500000000000) * 100).toFixed(2)}% of total crypto market
- Liquidity Grade: ${coin.total_volume / coin.market_cap > 0.1 ? 'Excellent' : coin.total_volume / coin.market_cap > 0.05 ? 'Good' : 'Fair'}

ETF & INSTITUTIONAL ANALYSIS:
1. **ETF Availability**: Current spot ETF products, approval status, AUM estimates
2. **Institutional Interest**: Volume patterns suggesting institutional accumulation
3. **Spot vs Derivatives**: Analyze spot volume vs futures OI for institutional sentiment
4. **Premium/Discount Patterns**: Compare spot price action to futures for institutional positioning
5. **Flow Direction Analysis**: Infer net inflows/outflows from volume and price patterns
6. **Regulatory Landscape**: Impact of recent regulatory developments on institutional access
7. **TradFi Integration**: Adoption by traditional finance institutions, custody solutions

INSTITUTIONAL SENTIMENT INDICATORS:
- Volume consistency (institutions trade in size consistently)
- Price stability during high volume (institutional accumulation)
- Support level strength (institutional bid zones)
- Correlation with institutional hours (9am-4pm ET vs 24/7 retail)

ACTIONABLE OUTLOOK:
- Institutional sentiment: Bullish/Neutral/Bearish
- Flow prediction: Net Inflows/Outflows/Sideways
- Impact on retail traders: Front-run institutional moves or follow
- Timeframe for institutional positioning to play out`;
        break;
    }

    // Use Claude with structured output via tool calling
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          name: "provide_crypto_analysis",
          description: "Provide structured cryptocurrency analysis with actionable insights",
          input_schema: {
            type: "object",
            properties: {
              executive_summary: {
                type: "string",
                description: "2-3 sentence summary of the key finding and recommendation"
              },
              market_outlook: {
                type: "string",
                description: "Overall bullish/bearish/neutral outlook with reasoning"
              },
              key_insights: {
                type: "array",
                items: { type: "string" },
                description: "5-7 bullet points of actionable insights"
              },
              price_targets: {
                type: "object",
                properties: {
                  short_term: { type: "string" },
                  medium_term: { type: "string" },
                  support_level: { type: "string" },
                  resistance_level: { type: "string" }
                }
              },
              risk_assessment: {
                type: "object",
                properties: {
                  level: { type: "string", enum: ["Low", "Medium", "High"] },
                  factors: { type: "array", items: { type: "string" } }
                }
              },
              actionable_recommendations: {
                type: "array",
                items: { type: "string" },
                description: "3-5 specific actions traders should consider"
              },
              data_sources: {
                type: "array",
                items: { type: "string" },
                description: "List of data points and sources used in analysis"
              },
              detailed_analysis: {
                type: "string",
                description: "Comprehensive analysis with technical details"
              }
            },
            required: ["executive_summary", "market_outlook", "key_insights", "actionable_recommendations", "detailed_analysis"]
          }
        }],
        tool_choice: { type: "tool", name: "provide_crypto_analysis" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Failed to generate analysis: ${response.status}`);
    }

    const data = await response.json();
    const toolUse = data.content.find((c: any) => c.type === 'tool_use');
    
    console.log('Claude API full response:', JSON.stringify(data, null, 2));
    console.log('Tool use content:', JSON.stringify(toolUse, null, 2));
    
    if (!toolUse || !toolUse.input) {
      console.error('No tool use found in response. Content:', data.content);
      throw new Error('No structured output received from AI');
    }

    const structuredAnalysis = toolUse.input;
    
    console.log('Extracted structured analysis:', JSON.stringify(structuredAnalysis, null, 2));
    
    // Validate that required fields are arrays
    if (!Array.isArray(structuredAnalysis.key_insights)) {
      console.warn('key_insights is not an array:', structuredAnalysis.key_insights);
      structuredAnalysis.key_insights = [];
    }
    if (!Array.isArray(structuredAnalysis.actionable_recommendations)) {
      console.warn('actionable_recommendations is not an array:', structuredAnalysis.actionable_recommendations);
      structuredAnalysis.actionable_recommendations = [];
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

    // Return structured analysis with timestamp
    return new Response(
      JSON.stringify({
        structuredAnalysis,
        confidence,
        metrics,
        timestamp: new Date().toISOString(),
        coinData: {
          name: coin.name,
          symbol: coin.symbol,
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          marketCap: coin.market_cap,
          volume: coin.total_volume
        }
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

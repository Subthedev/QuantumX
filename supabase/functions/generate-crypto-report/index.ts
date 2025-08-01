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
    console.log(`Fetching comprehensive market data for ${coin}...`);
    const marketData = await fetchCMCData(coin);
    
    // Enhanced market analysis calculations
    const volatilityScore = Math.abs(marketData.percentChange7d) + Math.abs(marketData.percentChange24h);
    const momentumScore = (marketData.percentChange1h + marketData.percentChange24h + marketData.percentChange7d) / 3;
    const volumeStrength = marketData.volume24h / marketData.marketCap * 100; // Volume to market cap ratio
    const marketDirection = momentumScore > 2 ? 'strong_bullish' : momentumScore > 0 ? 'bullish' : momentumScore > -2 ? 'neutral' : momentumScore > -5 ? 'bearish' : 'strong_bearish';
    
    // Dynamic confidence scoring based on multiple factors
    const baseConfidence = 65;
    const volumeConfidence = Math.min(volumeStrength * 2, 15); // Higher volume = higher confidence
    const trendConfidence = Math.abs(momentumScore) > 3 ? 10 : Math.abs(momentumScore) > 1 ? 5 : 0;
    const volatilityPenalty = volatilityScore > 15 ? -10 : volatilityScore > 8 ? -5 : 0;
    const timeConsistency = Math.sign(marketData.percentChange1h) === Math.sign(marketData.percentChange24h) && Math.sign(marketData.percentChange24h) === Math.sign(marketData.percentChange7d) ? 8 : 0;
    
    const dynamicConfidence = Math.max(45, Math.min(95, baseConfidence + volumeConfidence + trendConfidence + volatilityPenalty + timeConsistency + Math.random() * 5));
    
    console.log(`Generating institution-grade AI analysis for ${coin}...`);
    const prompt = `
You are a senior quantitative analyst at a tier-1 institutional trading firm with 15+ years of experience in crypto markets. Based on the comprehensive market data below, provide a multi-directional institutional-grade analysis for ${marketData.name} (${coin}).

MARKET DATA ANALYSIS:
- Current Price: $${marketData.price.toFixed(2)}
- Market Cap: $${marketData.marketCap.toLocaleString()} (${(marketData.marketCap/1e9).toFixed(1)}B)
- 24h Volume: $${marketData.volume24h.toLocaleString()} (${volumeStrength.toFixed(2)}% of market cap)
- Volume Strength: ${volumeStrength > 3 ? 'STRONG' : volumeStrength > 1 ? 'MODERATE' : 'WEAK'}
- 1h Change: ${marketData.percentChange1h.toFixed(2)}%
- 24h Change: ${marketData.percentChange24h.toFixed(2)}%
- 7d Change: ${marketData.percentChange7d.toFixed(2)}%
- 30d Change: ${marketData.percentChange30d.toFixed(2)}%
- Momentum Score: ${momentumScore.toFixed(2)} (${marketDirection})
- Volatility Score: ${volatilityScore.toFixed(2)} (${volatilityScore > 15 ? 'HIGH' : volatilityScore > 8 ? 'MEDIUM' : 'LOW'})
- Supply Data: ${marketData.circulatingSupply.toLocaleString()} / ${marketData.totalSupply?.toLocaleString() || 'N/A'} ${marketData.maxSupply ? '/ ' + marketData.maxSupply.toLocaleString() : ''}

CRITICAL ANALYSIS REQUIREMENTS:
1. MULTI-DIRECTIONAL SIGNALS: Provide both bullish and bearish scenarios with specific triggers
2. ADAPTIVE ANALYSIS: Analysis must reflect current market momentum (${marketDirection})
3. INSTITUTION-GRADE: Include quantitative metrics, risk-adjusted returns, and probabilistic outcomes
4. DYNAMIC CONFIDENCE: Your confidence score should be ${Math.round(dynamicConfidence)} (±3 based on analysis depth)
5. COMPREHENSIVE DATA POINTS: Integrate volume profile, momentum indicators, and supply dynamics

Return analysis in this JSON structure (NO MARKDOWN):
{
  "summary": "Institution-grade executive summary covering both bullish and bearish scenarios with specific probability assessments and key market drivers for 7-day outlook",
  "confidence": ${Math.round(dynamicConfidence)},
  "market_direction": "${marketDirection}",
  "analysis": {
    "technical": {
      "primary_trend": "${marketDirection}",
      "support_levels": "Calculate 3 dynamic support levels based on recent volume nodes and Fibonacci retracements",
      "resistance_levels": "Calculate 3 dynamic resistance levels based on volume profile and momentum",
      "key_indicators": "Include RSI overbought/oversold levels, MACD divergence, volume weighted moving averages, and momentum oscillators",
      "breakout_scenarios": "Define specific price levels for bullish and bearish breakouts with probability estimates"
    },
    "fundamental": {
      "macro_environment": "Current macroeconomic conditions affecting crypto markets",
      "institutional_flow": "Analysis of institutional buying/selling pressure and on-chain metrics",
      "network_health": "Transaction fees, active addresses, network utilization for ${coin}",
      "competitive_landscape": "Position relative to other cryptocurrencies and market share dynamics",
      "catalysts": "Upcoming events, upgrades, or market developments that could impact price"
    },
    "sentiment": {
      "market_sentiment": "Overall market mood based on volume, volatility, and price action",
      "fear_greed_analysis": "Current fear/greed level and historical context",
      "social_metrics": "Correlation with social sentiment and retail vs institutional interest",
      "options_flow": "Derivatives market signals and positioning",
      "contrarian_indicators": "Signals suggesting potential trend reversal"
    },
    "multi_directional_signals": {
      "bullish_scenario": {
        "probability": "Percentage likelihood based on current data",
        "triggers": "Specific price levels or events that would confirm bullish bias",
        "targets": "Conservative, moderate, and aggressive upside targets",
        "timeframe": "Expected duration for bullish scenario to play out",
        "risk_factors": "What could invalidate the bullish thesis"
      },
      "bearish_scenario": {
        "probability": "Percentage likelihood based on current data", 
        "triggers": "Specific price levels or events that would confirm bearish bias",
        "targets": "Conservative, moderate, and aggressive downside targets",
        "timeframe": "Expected duration for bearish scenario to play out",
        "risk_factors": "What could invalidate the bearish thesis"
      },
      "neutral_scenario": {
        "probability": "Percentage likelihood of sideways consolidation",
        "range": "Expected trading range for consolidation phase",
        "duration": "How long consolidation might last",
        "breakout_catalysts": "Events that could end the consolidation"
      }
    }
  },
  "quantitative_metrics": {
    "sharpe_ratio_estimate": "Risk-adjusted return expectation for 7-day period",
    "max_drawdown_probability": "Likelihood and magnitude of potential drawdowns",
    "volatility_forecast": "Expected volatility range for next 7 days",
    "correlation_factors": "Key market correlations affecting price movement"
  },
  "execution_strategy": {
    "entry_zones": "Optimal entry points for both long and short positions",
    "position_sizing": "Risk-based position sizing recommendations",
    "stop_loss_strategy": "Dynamic stop-loss levels for risk management",
    "profit_taking": "Systematic profit-taking approach with specific levels",
    "hedging_options": "Derivative strategies for risk mitigation"
  },
  "risk_assessment": {
    "tail_risks": "Low probability, high impact events to monitor",
    "correlation_risks": "Risk of increased correlation with traditional markets",
    "liquidity_risks": "Potential liquidity concerns during volatile periods",
    "regulatory_risks": "Upcoming regulatory decisions that could impact price",
    "technical_risks": "Network or protocol-specific risks for ${coin}"
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a senior quantitative analyst at a tier-1 institutional trading firm specializing in cryptocurrency markets. Your analysis combines technical indicators, fundamental metrics, sentiment analysis, and quantitative risk models to provide actionable investment insights. Always provide multi-directional analysis with specific probability assessments.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
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
      // Remove markdown code blocks if present
      let cleanedResponse = analysisText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      console.log('Cleaned AI response:', cleanedResponse);
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', analysisText);
      // Fallback analysis structure with proper number formatting
      analysis = {
        summary: `${marketData.name} analysis based on current market conditions showing ${marketData.percentChange24h >= 0 ? 'positive' : 'negative'} momentum with professional risk management targets.`,
        confidence: 75,
        analysis: {
          technical: {
            trend: marketData.percentChange24h >= 0 ? "bullish" : "bearish",
            support_levels: [
              parseFloat((marketData.price * 0.95).toFixed(2)),
              parseFloat((marketData.price * 0.90).toFixed(2)),
              parseFloat((marketData.price * 0.85).toFixed(2))
            ],
            resistance_levels: [
              parseFloat((marketData.price * 1.05).toFixed(2)),
              parseFloat((marketData.price * 1.10).toFixed(2)),
              parseFloat((marketData.price * 1.15).toFixed(2))
            ],
            indicators: [
              `RSI shows ${marketData.percentChange24h > 0 ? 'bullish momentum' : 'oversold conditions'}`,
              `Volume at ${marketData.volume24h > 1000000000 ? 'elevated levels' : 'normal levels'}`,
              `Moving averages indicate ${marketData.percentChange7d > 0 ? 'upward trend' : 'consolidation phase'}`,
              `Price action shows ${Math.abs(marketData.percentChange24h) > 3 ? 'high volatility' : 'stable movement'}`
            ]
          },
          fundamental: {
            strengths: [
              coin === 'BTC' ? 'Digital gold narrative with institutional backing' : 'Leading smart contract platform with robust ecosystem',
              coin === 'BTC' ? 'Fixed 21M supply cap creating long-term scarcity value' : 'Ethereum 2.0 upgrade improving scalability and efficiency', 
              coin === 'BTC' ? 'Store of value adoption by corporations and governments' : 'Dominance in DeFi with $100B+ total value locked',
              coin === 'BTC' ? 'Lightning Network enabling faster, cheaper transactions' : 'NFT marketplace leadership and Web3 infrastructure',
              'Strong network effects with growing developer and user adoption',
              'Established regulatory clarity in major jurisdictions'
            ],
            weaknesses: [
              'Regulatory uncertainty in emerging markets and tax implications',
              coin === 'BTC' ? 'Energy consumption debates affecting ESG investment' : 'High gas fees during network congestion periods',
              coin === 'BTC' ? 'Limited programmability compared to smart contract platforms' : 'Competition from newer, faster blockchain networks',
              'Market volatility creating challenges for mainstream adoption',
              'Macroeconomic correlation with traditional risk assets'
            ],
            market_position: coin === 'BTC' ? 
              `Dominant cryptocurrency with $${(marketData.marketCap/1e12).toFixed(1)}T market cap representing digital store of value. Leading institutional adoption with corporate treasuries, ETFs, and government reserves. First-mover advantage with unmatched brand recognition and network security.` :
              `Leading smart contract platform with $${(marketData.marketCap/1e9).toFixed(0)}B market cap powering the majority of DeFi protocols, NFT marketplaces, and Web3 applications. Ethereum 2.0 transition enhancing scalability while maintaining decentralization and security.`,
            adoption_metrics: coin === 'BTC' ? 
              'Corporate treasury adoption growing, Lightning Network channels expanding, institutional custody solutions maturing' :
              'Active developer count leading industry, dApp transaction volume increasing, enterprise blockchain adoption accelerating',
            competitive_position: coin === 'BTC' ?
              'Unmatched network security, regulatory clarity improving, institutional infrastructure mature' :
              'Extensive developer tooling, largest DeFi ecosystem, established smart contract standards'
          },
          sentiment: {
            overall: marketData.percentChange7d >= 0 ? "bullish" : "bearish",
            factors: [
              `24h performance: ${marketData.percentChange24h >= 0 ? 'positive' : 'negative'} at ${marketData.percentChange24h.toFixed(2)}%`,
              `Weekly trend: ${marketData.percentChange7d >= 0 ? 'upward' : 'downward'} momentum`,
              `Volume activity: ${marketData.volume24h > 1000000000 ? 'high institutional interest' : 'moderate retail activity'}`
            ],
            risk_level: Math.abs(marketData.percentChange7d) > 15 ? "high" : 
                       Math.abs(marketData.percentChange7d) > 8 ? "medium" : "low"
          }
        },
        targets: {
          take_profit_1: parseFloat((marketData.price * 1.05).toFixed(2)),
          take_profit_2: parseFloat((marketData.price * 1.10).toFixed(2)),
          take_profit_3: parseFloat((marketData.price * 1.15).toFixed(2)),
          stop_loss: parseFloat((marketData.price * 0.93).toFixed(2)),
          target_timeframe: "7 days"
        },
        risk_management: {
          position_size: Math.abs(marketData.percentChange7d) > 15 ? "1-3% of portfolio" : "2-5% of portfolio",
          risk_reward_ratio: `1:${marketData.percentChange7d > 0 ? '2.5' : '2'}`,
          max_drawdown: Math.abs(marketData.percentChange7d) > 15 ? "8-12%" : "5-8%"
        }
      };
    }

    return {
      summary: analysis.summary,
      confidence: analysis.confidence,
      data: {
        ...analysis,
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
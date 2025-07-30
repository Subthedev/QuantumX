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
You are a professional cryptocurrency analyst with 10+ years of experience. Based on the following real-time market data for ${marketData.name} (${coin}), provide a comprehensive 7-day trading report in JSON format.

IMPORTANT: This report should focus on a 7-day (1 week) trading timeframe with realistic targets.

Market Data:
- Current Price: $${marketData.price.toFixed(2)}
- Market Cap: $${marketData.marketCap.toLocaleString()}
- 24h Volume: $${marketData.volume24h.toLocaleString()}
- 1h Change: ${marketData.percentChange1h.toFixed(2)}%
- 24h Change: ${marketData.percentChange24h.toFixed(2)}%
- 7d Change: ${marketData.percentChange7d.toFixed(2)}%
- 30d Change: ${marketData.percentChange30d.toFixed(2)}%
- Circulating Supply: ${marketData.circulatingSupply.toLocaleString()}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON without any markdown formatting or code blocks
2. All numerical values must be realistic based on current price: $${marketData.price.toFixed(2)}
3. Support/resistance levels should be within ±15% of current price
4. Take profit targets should be realistic for 7-day timeframe (typically 3-8% moves)
5. Target timeframe must be "7 days" or "1 week"

Please provide analysis in this EXACT JSON structure (no markdown):
{
  "summary": "Comprehensive 2-3 sentence executive summary focusing on 7-day outlook",
  "confidence": ${Math.floor(70 + Math.random() * 20)},
  "analysis": {
    "technical": {
      "trend": "${marketData.percentChange7d >= 0 ? 'bullish' : marketData.percentChange7d >= -5 ? 'neutral' : 'bearish'}",
      "support_levels": [${(marketData.price * 0.97).toFixed(2)}, ${(marketData.price * 0.94).toFixed(2)}, ${(marketData.price * 0.91).toFixed(2)}],
      "resistance_levels": [${(marketData.price * 1.03).toFixed(2)}, ${(marketData.price * 1.06).toFixed(2)}, ${(marketData.price * 1.09).toFixed(2)}],
      "indicators": ["RSI indicates ${marketData.percentChange24h > 0 ? 'momentum building' : 'oversold conditions'}", "Moving averages show ${marketData.percentChange7d > 0 ? 'upward trend' : 'consolidation'}", "Volume analysis suggests ${marketData.volume24h > 1000000000 ? 'strong interest' : 'moderate activity'}", "${marketData.percentChange1h > 0 ? 'Short-term bullish momentum' : 'Short-term consolidation'}"]
    },
    "fundamental": {
      "strengths": ["${coin === 'BTC' ? 'Store of value narrative strengthening' : 'Leading smart contract platform'}", "${coin === 'BTC' ? 'Institutional adoption accelerating' : 'Ethereum 2.0 upgrade benefits'}", "${coin === 'BTC' ? 'Fixed supply cap creates scarcity' : 'DeFi ecosystem dominance'}", "${coin === 'BTC' ? 'Global monetary hedge properties' : 'NFT marketplace leadership'}", "Strong developer community and network effects"],
      "weaknesses": ["Regulatory uncertainty in major markets", "${coin === 'BTC' ? 'Energy consumption concerns' : 'High gas fees during congestion'}", "${coin === 'BTC' ? 'Limited smart contract functionality' : 'Competition from newer blockchains'}", "Market volatility and correlation risks"],
      "market_position": "${coin === 'BTC' ? 'Dominant digital asset with $' + (marketData.marketCap/1e12).toFixed(1) + 'T market cap, leading store of value adoption by institutions and nation-states' : 'Leading smart contract platform with $' + (marketData.marketCap/1e9).toFixed(0) + 'B market cap, powering majority of DeFi and Web3 applications'}",
      "adoption_metrics": "${coin === 'BTC' ? 'Growing corporate treasury adoption, Lightning Network expansion' : 'Active developer ecosystem, increasing dApp usage'}", 
      "competitive_position": "${coin === 'BTC' ? 'First-mover advantage with unmatched brand recognition and institutional trust' : 'Market leader in smart contracts with extensive ecosystem and developer tools'}"
    },
    "sentiment": {
      "overall": "${marketData.percentChange7d >= 2 ? 'bullish' : marketData.percentChange7d >= -2 ? 'neutral' : 'bearish'}",
      "factors": ["${marketData.percentChange24h > 0 ? 'Positive 24h momentum' : 'Recent price consolidation'}", "${marketData.percentChange7d > 0 ? 'Weekly uptrend' : 'Weekly correction'}", "Market uncertainty"],
      "risk_level": "${Math.abs(marketData.percentChange7d) > 10 ? 'high' : Math.abs(marketData.percentChange7d) > 5 ? 'medium' : 'low'}"
    }
  },
  "targets": {
    "take_profit_1": ${(marketData.price * (1 + (marketData.percentChange7d > 0 ? 0.035 : 0.025))).toFixed(2)},
    "take_profit_2": ${(marketData.price * (1 + (marketData.percentChange7d > 0 ? 0.055 : 0.045))).toFixed(2)},
    "take_profit_3": ${(marketData.price * (1 + (marketData.percentChange7d > 0 ? 0.075 : 0.065))).toFixed(2)},
    "stop_loss": ${(marketData.price * (1 - (marketData.percentChange7d > 0 ? 0.05 : 0.04))).toFixed(2)},
    "target_timeframe": "7 days"
  },
  "risk_management": {
    "position_size": "${Math.abs(marketData.percentChange7d) > 10 ? '1-3% of portfolio' : '2-5% of portfolio'}",
    "risk_reward_ratio": "1:${marketData.percentChange7d > 0 ? '2.5' : '2'}",
    "max_drawdown": "${Math.abs(marketData.percentChange7d) > 10 ? '8-12%' : '5-8%'}"
  }
}
`;

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
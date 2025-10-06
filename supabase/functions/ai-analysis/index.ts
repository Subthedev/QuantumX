import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getToolName(analysisType: string): string {
  const toolNames: Record<string, string> = {
    technical: 'provide_technical_analysis',
    fundamental: 'provide_fundamental_analysis',
    sentiment: 'provide_sentiment_analysis',
    onchain: 'provide_onchain_analysis',
    etf: 'provide_etf_analysis'
  };
  return toolNames[analysisType] || 'provide_technical_analysis';
}

function getAnalysisSchema(analysisType: string) {
  switch (analysisType) {
    case 'technical':
      return {
        name: "provide_technical_analysis",
        description: "Provide technical analysis with price action, indicators, and trading levels",
        input_schema: {
          type: "object",
          properties: {
            trend_analysis: {
              type: "object",
              properties: {
                current_trend: { type: "string", enum: ["Strong Uptrend", "Uptrend", "Sideways", "Downtrend", "Strong Downtrend"] },
                momentum: { type: "string", enum: ["Accelerating", "Stable", "Decelerating"] },
                strength_score: { type: "number", description: "0-100 trend strength" }
              },
              required: ["current_trend", "momentum", "strength_score"]
            },
            price_levels: {
              type: "object",
              properties: {
                immediate_support: { type: "string" },
                strong_support: { type: "string" },
                immediate_resistance: { type: "string" },
                strong_resistance: { type: "string" }
              },
              required: ["immediate_support", "strong_support", "immediate_resistance", "strong_resistance"]
            },
            volume_analysis: {
              type: "object",
              properties: {
                volume_trend: { type: "string", enum: ["Rising", "Falling", "Stable"] },
                volume_quality: { type: "string", enum: ["Strong", "Average", "Weak"] },
                accumulation_distribution: { type: "string", enum: ["Accumulation", "Distribution", "Neutral"] }
              },
              required: ["volume_trend", "volume_quality", "accumulation_distribution"]
            },
            chart_patterns: {
              type: "array",
              items: { type: "string" },
              description: "Identified chart patterns"
            },
            indicators: {
              type: "object",
              properties: {
                rsi_level: { type: "string" },
                macd_signal: { type: "string" },
                moving_averages: { type: "string" }
              }
            },
            trading_zones: {
              type: "object",
              properties: {
                optimal_entry: { type: "array", items: { type: "string" } },
                take_profit_levels: { type: "array", items: { type: "string" } },
                stop_loss: { type: "string" }
              },
              required: ["optimal_entry", "take_profit_levels", "stop_loss"]
            },
            timeframe_outlook: {
              type: "object",
              properties: {
                short_term: { type: "string", description: "1-7 days" },
                medium_term: { type: "string", description: "1-4 weeks" }
              },
              required: ["short_term", "medium_term"]
            },
            key_insights: {
              type: "array",
              items: { type: "string" },
              description: "5-7 technical insights"
            },
            risk_reward: {
              type: "object",
              properties: {
                ratio: { type: "string" },
                risk_level: { type: "string", enum: ["Low", "Medium", "High"] }
              },
              required: ["ratio", "risk_level"]
            }
          },
          required: ["trend_analysis", "price_levels", "volume_analysis", "trading_zones", "timeframe_outlook", "key_insights", "risk_reward"]
        }
      };

    case 'fundamental':
      return {
        name: "provide_fundamental_analysis",
        description: "Provide fundamental analysis covering tokenomics, valuation, and ecosystem",
        input_schema: {
          type: "object",
          properties: {
            tokenomics: {
              type: "object",
              properties: {
                supply_model: { type: "string", enum: ["Deflationary", "Inflationary", "Fixed Supply", "Elastic"] },
                inflation_rate: { type: "string" },
                token_utility: { type: "array", items: { type: "string" } },
                supply_health: { type: "string", enum: ["Excellent", "Good", "Fair", "Poor"] }
              },
              required: ["supply_model", "token_utility", "supply_health"]
            },
            valuation_metrics: {
              type: "object",
              properties: {
                mcap_fdv_ratio: { type: "string" },
                volume_liquidity_score: { type: "string", enum: ["Excellent", "Good", "Fair", "Poor"] },
                relative_valuation: { type: "string", enum: ["Undervalued", "Fair Value", "Overvalued"] },
                price_to_sales: { type: "string" }
              },
              required: ["mcap_fdv_ratio", "volume_liquidity_score", "relative_valuation"]
            },
            market_position: {
              type: "object",
              properties: {
                category_rank: { type: "string" },
                competitive_advantages: { type: "array", items: { type: "string" } },
                market_share: { type: "string" }
              },
              required: ["category_rank", "competitive_advantages"]
            },
            ecosystem_health: {
              type: "object",
              properties: {
                developer_activity: { type: "string", enum: ["High", "Medium", "Low"] },
                partnerships: { type: "array", items: { type: "string" } },
                adoption_metrics: { type: "string" }
              },
              required: ["developer_activity", "adoption_metrics"]
            },
            investment_thesis: {
              type: "object",
              properties: {
                bull_case: { type: "array", items: { type: "string" } },
                bear_case: { type: "array", items: { type: "string" } },
                catalyst_events: { type: "array", items: { type: "string" } }
              },
              required: ["bull_case", "bear_case"]
            },
            price_targets: {
              type: "object",
              properties: {
                conservative: { type: "string" },
                base_case: { type: "string" },
                optimistic: { type: "string" },
                timeframe: { type: "string" }
              },
              required: ["conservative", "base_case", "optimistic", "timeframe"]
            },
            overall_rating: {
              type: "object",
              properties: {
                score: { type: "number", description: "0-100" },
                recommendation: { type: "string", enum: ["Strong Accumulate", "Accumulate", "Hold", "Reduce", "Avoid"] }
              },
              required: ["score", "recommendation"]
            }
          },
          required: ["tokenomics", "valuation_metrics", "market_position", "ecosystem_health", "investment_thesis", "price_targets", "overall_rating"]
        }
      };

    case 'sentiment':
      return {
        name: "provide_sentiment_analysis",
        description: "Provide market sentiment analysis with crowd psychology and contrarian signals",
        input_schema: {
          type: "object",
          properties: {
            sentiment_score: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "0-100, where 0=Extreme Fear, 100=Extreme Greed" },
                sentiment_label: { type: "string", enum: ["Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"] },
                trend: { type: "string", enum: ["Improving", "Stable", "Deteriorating"] }
              },
              required: ["overall_score", "sentiment_label", "trend"]
            },
            market_psychology: {
              type: "object",
              properties: {
                fear_greed_analysis: { type: "string" },
                crowd_emotion: { type: "string" },
                contrarian_opportunity: { type: "boolean" }
              },
              required: ["fear_greed_analysis", "crowd_emotion", "contrarian_opportunity"]
            },
            momentum_indicators: {
              type: "object",
              properties: {
                price_momentum: { type: "string", enum: ["Strong Positive", "Positive", "Neutral", "Negative", "Strong Negative"] },
                volume_momentum: { type: "string", enum: ["Increasing", "Stable", "Decreasing"] },
                momentum_divergence: { type: "string" }
              },
              required: ["price_momentum", "volume_momentum"]
            },
            positioning: {
              type: "object",
              properties: {
                retail_positioning: { type: "string", enum: ["Heavy Long", "Long", "Neutral", "Short", "Heavy Short"] },
                smart_money_signals: { type: "string" },
                crowd_consensus: { type: "string" }
              },
              required: ["retail_positioning", "smart_money_signals"]
            },
            sentiment_drivers: {
              type: "array",
              items: { type: "string" },
              description: "Key events or news driving sentiment"
            },
            contrarian_signals: {
              type: "array",
              items: { type: "string" },
              description: "Contrarian trading opportunities"
            },
            sentiment_outlook: {
              type: "object",
              properties: {
                next_7_days: { type: "string" },
                key_levels_to_watch: { type: "array", items: { type: "string" } },
                sentiment_change_triggers: { type: "array", items: { type: "string" } }
              },
              required: ["next_7_days", "key_levels_to_watch"]
            },
            recommended_stance: {
              type: "string",
              enum: ["Aggressive Accumulation", "Moderate Accumulation", "Hold & Monitor", "Reduce Exposure", "Defensive"]
            }
          },
          required: ["sentiment_score", "market_psychology", "momentum_indicators", "positioning", "sentiment_drivers", "sentiment_outlook", "recommended_stance"]
        }
      };

    case 'onchain':
      return {
        name: "provide_onchain_analysis",
        description: "Provide on-chain analysis with network metrics and smart money signals",
        input_schema: {
          type: "object",
          properties: {
            network_health: {
              type: "object",
              properties: {
                activity_trend: { type: "string", enum: ["Growing", "Stable", "Declining"] },
                network_usage: { type: "string" },
                congestion_level: { type: "string", enum: ["High", "Medium", "Low"] }
              },
              required: ["activity_trend", "network_usage"]
            },
            supply_dynamics: {
              type: "object",
              properties: {
                circulating_percentage: { type: "string" },
                supply_concentration: { type: "string", enum: ["Highly Concentrated", "Moderately Concentrated", "Well Distributed"] },
                inflation_pressure: { type: "string" }
              },
              required: ["circulating_percentage", "supply_concentration"]
            },
            whale_activity: {
              type: "object",
              properties: {
                large_holder_trend: { type: "string", enum: ["Accumulating", "Distributing", "Holding"] },
                whale_transaction_analysis: { type: "string" },
                top_holder_concentration: { type: "string" }
              },
              required: ["large_holder_trend", "whale_transaction_analysis"]
            },
            exchange_flows: {
              type: "object",
              properties: {
                net_flow: { type: "string", enum: ["Strong Inflows", "Inflows", "Neutral", "Outflows", "Strong Outflows"] },
                flow_interpretation: { type: "string" },
                exchange_balance_trend: { type: "string" }
              },
              required: ["net_flow", "flow_interpretation"]
            },
            holder_behavior: {
              type: "object",
              properties: {
                holding_time_analysis: { type: "string" },
                long_term_holder_trend: { type: "string", enum: ["Increasing", "Stable", "Decreasing"] },
                short_term_speculation: { type: "string" }
              },
              required: ["holding_time_analysis", "long_term_holder_trend"]
            },
            smart_money_signals: {
              type: "array",
              items: { type: "string" },
              description: "Signals indicating institutional or smart money activity"
            },
            accumulation_phase: {
              type: "object",
              properties: {
                current_phase: { type: "string", enum: ["Accumulation", "Markup", "Distribution", "Markdown"] },
                phase_confidence: { type: "string", enum: ["High", "Medium", "Low"] },
                phase_analysis: { type: "string" }
              },
              required: ["current_phase", "phase_confidence", "phase_analysis"]
            },
            onchain_outlook: {
              type: "object",
              properties: {
                bullish_signals: { type: "array", items: { type: "string" } },
                bearish_signals: { type: "array", items: { type: "string" } },
                key_metrics_to_monitor: { type: "array", items: { type: "string" } }
              },
              required: ["bullish_signals", "bearish_signals"]
            }
          },
          required: ["network_health", "supply_dynamics", "whale_activity", "exchange_flows", "holder_behavior", "smart_money_signals", "accumulation_phase", "onchain_outlook"]
        }
      };

    case 'etf':
      return {
        name: "provide_etf_analysis",
        description: "Provide ETF and institutional flow analysis",
        input_schema: {
          type: "object",
          properties: {
            etf_landscape: {
              type: "object",
              properties: {
                spot_etf_status: { type: "string" },
                futures_etf_products: { type: "array", items: { type: "string" } },
                total_aum_estimate: { type: "string" },
                approval_probability: { type: "string", enum: ["Very High", "High", "Medium", "Low", "Very Low"] }
              },
              required: ["spot_etf_status", "approval_probability"]
            },
            institutional_flows: {
              type: "object",
              properties: {
                flow_direction: { type: "string", enum: ["Strong Inflows", "Moderate Inflows", "Neutral", "Moderate Outflows", "Strong Outflows"] },
                weekly_flow_estimate: { type: "string" },
                cumulative_flows: { type: "string" },
                flow_sustainability: { type: "string", enum: ["Sustainable", "Moderate", "Unsustainable"] }
              },
              required: ["flow_direction", "flow_sustainability"]
            },
            spot_vs_derivatives: {
              type: "object",
              properties: {
                futures_oi: { type: "string" },
                spot_volume: { type: "string" },
                basis_analysis: { type: "string" },
                institutional_preference: { type: "string" }
              },
              required: ["futures_oi", "spot_volume", "basis_analysis"]
            },
            premium_discount: {
              type: "object",
              properties: {
                current_premium: { type: "string" },
                premium_trend: { type: "string", enum: ["Expanding", "Stable", "Contracting"] },
                arbitrage_opportunities: { type: "string" }
              },
              required: ["current_premium", "premium_trend"]
            },
            institutional_sentiment: {
              type: "object",
              properties: {
                sentiment: { type: "string", enum: ["Very Bullish", "Bullish", "Neutral", "Bearish", "Very Bearish"] },
                positioning: { type: "string" },
                risk_appetite: { type: "string", enum: ["Aggressive", "Moderate", "Conservative"] }
              },
              required: ["sentiment", "positioning", "risk_appetite"]
            },
            tradfi_integration: {
              type: "object",
              properties: {
                custody_solutions: { type: "array", items: { type: "string" } },
                banking_partnerships: { type: "array", items: { type: "string" } },
                payment_integrations: { type: "array", items: { type: "string" } }
              }
            },
            regulatory_landscape: {
              type: "object",
              properties: {
                regulatory_clarity: { type: "string", enum: ["High", "Medium", "Low"] },
                recent_developments: { type: "array", items: { type: "string" } },
                impact_assessment: { type: "string" }
              },
              required: ["regulatory_clarity", "impact_assessment"]
            },
            institutional_outlook: {
              type: "object",
              properties: {
                next_30_days: { type: "string" },
                next_90_days: { type: "string" },
                catalysts: { type: "array", items: { type: "string" } },
                risks: { type: "array", items: { type: "string" } }
              },
              required: ["next_30_days", "next_90_days"]
            }
          },
          required: ["etf_landscape", "institutional_flows", "spot_vs_derivatives", "institutional_sentiment", "regulatory_landscape", "institutional_outlook"]
        }
      };

    default:
      return getAnalysisSchema('technical');
  }
}

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
        tools: [getAnalysisSchema(analysisType)],
        tool_choice: { type: "tool", name: getToolName(analysisType) }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Failed to generate analysis: ${response.status}`);
    }

    const data = await response.json();
    const toolUse = data.content.find((c: any) => c.type === 'tool_use');
    
    console.log('Claude API response for', analysisType, ':', JSON.stringify(data, null, 2));
    
    if (!toolUse || !toolUse.input) {
      console.error('No tool use found in response. Content:', data.content);
      throw new Error('No structured output received from AI');
    }

    const structuredAnalysis = toolUse.input;

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
        analysisType,
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

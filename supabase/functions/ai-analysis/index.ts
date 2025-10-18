import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { rateLimitMiddleware, getClientIP, getUserId } from "../_shared/rate-limiter.ts";
import {
  selectOptimalModel,
  getCompressedSystemPrompt,
  getCompressedUserPrompt,
  buildCachedRequest,
  estimateCostSavings
} from "../_shared/claude-optimizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
  console.log('🚀 AI Analysis function called - Method:', req.method, 'URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check rate limits
    const userId = getUserId(req);
    const clientIP = getClientIP(req);
    console.log('👤 Request from:', userId || clientIP);
    const rateLimitCheck = rateLimitMiddleware(userId, clientIP);

    if (!rateLimitCheck.allowed) {
      console.warn('Rate limit exceeded for:', userId || clientIP);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimitCheck.reason,
          resetAt: rateLimitCheck.headers['X-RateLimit-Reset']
        }),
        {
          status: 429,
          headers: { ...corsHeaders, ...rateLimitCheck.headers, 'Content-Type': 'application/json' }
        }
      );
    }

    const { coin, detailedData, analysisType } = await req.json();

    console.log('Generating AI analysis for:', coin.symbol, 'Type:', analysisType);

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Prepare market data context
    // Note: detailedData is optional and not used in compressed prompts
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
      // detailedMetrics not included - not used in compressed prompts
    };

    // Select optimal model and get compressed prompts (80% cost reduction)
    const modelConfig = selectOptimalModel({
      analysisType,
      complexity: 'simple', // Use Haiku for single-type analysis
      enableCaching: true
    });

    const systemPrompt = getCompressedSystemPrompt(analysisType);
    const userPrompt = getCompressedUserPrompt(analysisType, coin, marketContext);

    console.log(`Using ${modelConfig.model} for ${analysisType} analysis (estimated ${estimateCostSavings(analysisType, true).estimatedSavings}% cost savings)`);

    // Legacy system prompt for reference - removed to save tokens
    /* OLD VERSION WAS 500-900 LINES - NOW 20 LINES
    let systemPrompt = `You are an elite cryptocurrency trading analyst powered by IgniteX AI with 10+ years of market experience.

    */

    // Old verbose user prompts removed - now using compressed versions from claude-optimizer
    /* switch (analysisType) {
      case 'technical':
        const volatility24h = ((coin.high_24h - coin.low_24h) / coin.current_price * 100).toFixed(1);
        const volumeToMcap = (coin.total_volume / coin.market_cap * 100).toFixed(2);
        const athDrawdown = ((1 - coin.current_price / coin.ath) * 100).toFixed(1);

        userPrompt = `TRADING DESK: ${coin.name} (${coin.symbol.toUpperCase()}) - ${currentDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 LIVE MARKET SNAPSHOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price: $${coin.current_price.toLocaleString()}
24h Range: $${coin.low_24h.toLocaleString()} → $${coin.high_24h.toLocaleString()} (${volatility24h}% volatility)
24h Move: ${coin.price_change_percentage_24h > 0 ? '📈 +' : '📉 '}${coin.price_change_percentage_24h.toFixed(2)}%
7d Move: ${coin.price_change_percentage_7d_in_currency > 0 ? '📈 +' : '📉 '}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%

Volume: $${(coin.total_volume / 1e9).toFixed(2)}B (${volumeToMcap}% of market cap)
Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B (#${coin.market_cap_rank} globally)
ATH: $${coin.ath.toLocaleString()} → Currently ${athDrawdown}% below ATH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ YOUR TASK: ACTIONABLE TECHNICAL ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze this data and provide a COMPLETE TRADING PLAN:

1. **TREND ASSESSMENT**
   - What's the current trend? (use price action + volume to confirm)
   - Momentum status: Accelerating/Stable/Decelerating?
   - Trend strength score: 0-100 (be specific)

2. **CRITICAL PRICE LEVELS** (exact dollar amounts)
   - Immediate Resistance: $XXX (why this level matters)
   - Strong Resistance: $XXX (what happens if we break it?)
   - Immediate Support: $XXX (where buyers step in)
   - Strong Support: $XXX (last line of defense)

3. **VOLUME ANALYSIS**
   - Is current volume above/below average? By how much?
   - Volume quality: Strong/Average/Weak conviction?
   - Are we seeing accumulation or distribution? Evidence?

4. **TRADE SETUP** (be extremely specific)
   - ENTRY ZONES: Give 2-3 exact price levels
     Example: "Buy Zone 1: $42,800-$43,200 (retest of broken resistance)"
   - STOP LOSS: Exact price (explain why this invalidates the trade)
   - TAKE PROFIT: 2-3 targets with percentages
     Example: "TP1: $45,500 (+6.2%), TP2: $48,200 (+12.8%)"

5. **RISK/REWARD**
   - Calculate exact R:R ratio for this setup
   - Position size recommendation (% of portfolio)
   - Risk level: Low/Medium/High?

6. **TIME HORIZON**
   - Short-term (1-7 days): Specific price prediction with catalyst
   - Medium-term (1-4 weeks): Where could we be and why?

7. **KEY INSIGHTS** (5-7 bullets of EDGE)
   - What patterns do you see?
   - Any divergences or unusual signals?
   - What could invalidate this analysis?
   - What news/events should traders watch?

Remember: Traders will execute based on your analysis. Be precise, confident, and risk-aware.`;
        break;

      case 'fundamental':
        const fdvMultiple = coin.fully_diluted_valuation ? (coin.fully_diluted_valuation / coin.market_cap).toFixed(2) : 'N/A';
        const supplyIssued = coin.max_supply ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1) : 'N/A';
        const liquidityGrade = coin.total_volume > coin.market_cap * 0.1 ? '🟢 Excellent' :
                               coin.total_volume > coin.market_cap * 0.05 ? '🟡 Good' : '🔴 Poor';

        userPrompt = `INVESTMENT RESEARCH: ${coin.name} (${coin.symbol.toUpperCase()}) - ${currentDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 FUNDAMENTAL DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B (Global Rank #${coin.market_cap_rank})
FDV: $${coin.fully_diluted_valuation ? (coin.fully_diluted_valuation / 1e9).toFixed(2) + 'B' : 'N/A'} (${fdvMultiple}x current mcap)
Daily Volume: $${(coin.total_volume / 1e9).toFixed(2)}B
Liquidity: ${liquidityGrade} (${(coin.total_volume / coin.market_cap * 100).toFixed(1)}% volume/mcap)

Supply Metrics:
• Circulating: ${coin.circulating_supply ? (coin.circulating_supply / 1e9).toFixed(2) + 'B' : 'N/A'}
• Max Supply: ${coin.max_supply ? (coin.max_supply / 1e9).toFixed(2) + 'B' : '♾️ Unlimited'}
• Issued: ${supplyIssued}% ${supplyIssued !== 'N/A' ? `(${100 - parseFloat(supplyIssued)}% left to unlock)` : ''}

Price History:
• ATH: $${coin.ath.toLocaleString()} (${new Date(coin.ath_date).toLocaleDateString()})
• ATL: $${coin.atl.toLocaleString()} (${new Date(coin.atl_date).toLocaleDateString()})
• Current vs ATH: ${athDrawdown}% drawdown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR TASK: INVESTMENT GRADE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provide a COMPLETE INVESTMENT THESIS:

1. **TOKENOMICS HEALTH CHECK**
   - Supply model: Deflationary/Inflationary/Fixed/Elastic?
   - Inflation rate: Is new supply diluting holders?
   - Token utility: What does the token actually DO? (be specific)
   - Supply health: Excellent/Good/Fair/Poor? Why?

2. **VALUATION ANALYSIS**
   - MCap/FDV Ratio: Is this overvalued based on unlock schedule?
   - Volume/Liquidity: Can large investors enter/exit easily?
   - Relative valuation: Undervalued/Fair Value/Overvalued vs competitors?
   - Price/Sales or other relevant metrics

3. **MARKET POSITION**
   - What category/sector? (DeFi, L1, L2, Gaming, AI, etc.)
   - Category rank: Top 3? Top 10? Underdog?
   - Competitive advantages: What makes this unique?
   - Market share: Growing or losing ground?

4. **ECOSYSTEM STRENGTH**
   - Developer activity: Active development or ghost chain?
   - Partnerships: Any major integrations or collaborations?
   - Adoption metrics: Real users or bot activity?
   - Network effects: Is growth accelerating?

5. **INVESTMENT THESIS**
   BULL CASE (3-5 reasons why this could 3x-10x):
   - Specific catalysts, partnerships, technical milestones

   BEAR CASE (3-5 risks that could tank this):
   - Competition, token unlocks, regulatory risks, tech failures

   CATALYST EVENTS (upcoming):
   - Token unlocks, protocol upgrades, partnership announcements

6. **PRICE TARGETS** (be specific)
   - Conservative (6mo): $XXX (+XX%)
   - Base Case (6mo): $XXX (+XX%)
   - Optimistic (6mo): $XXX (+XX%)
   - Timeframe justification

7. **INVESTMENT RECOMMENDATION**
   - Rating: Strong Accumulate/Accumulate/Hold/Reduce/Avoid
   - Score: X/100
   - Position size: X% of crypto portfolio
   - Time horizon: Short-term trade or long-term hold?

Focus on ASYMMETRIC OPPORTUNITIES - where risk/reward is heavily skewed to upside.`;
        break;

      case 'sentiment':
        const atlGain = ((coin.current_price / coin.atl - 1) * 100).toFixed(0);

        userPrompt = `SENTIMENT PULSE: ${coin.name} (${coin.symbol.toUpperCase()}) - ${currentDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 MARKET PSYCHOLOGY INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recent Performance:
• 24h: ${coin.price_change_percentage_24h > 0 ? '🟢 +' : '🔴 '}${coin.price_change_percentage_24h.toFixed(2)}%
• 7d: ${coin.price_change_percentage_7d_in_currency > 0 ? '🟢 +' : '🔴 '}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%
• 30d: ${coin.price_change_percentage_30d_in_currency > 0 ? '🟢 +' : '🔴 '}${(coin.price_change_percentage_30d_in_currency || 0).toFixed(2)}%

Position vs Extremes:
• From ATH: -${athDrawdown}% (${athDrawdown > 50 ? 'DEEP DISCOUNT' : athDrawdown > 25 ? 'Moderate pullback' : 'Near highs'})
• From ATL: +${atlGain}% (${atlGain > 10000 ? 'Massive rally' : atlGain > 1000 ? 'Strong rally' : 'Early recovery'})

Volume Signal:
• 24h Volume: $${(coin.total_volume / 1e9).toFixed(2)}B
• Volume Quality: ${coin.total_volume / coin.market_cap > 0.1 ? 'HIGH - Strong conviction' : coin.total_volume / coin.market_cap > 0.05 ? 'MEDIUM - Normal activity' : 'LOW - Weak conviction'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR TASK: MARKET SENTIMENT DECODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read between the lines and provide ACTIONABLE PSYCHOLOGY ANALYSIS:

1. **SENTIMENT SCORE & LABEL**
   - Overall score: 0-100 (0=Extreme Fear, 100=Extreme Greed)
   - Sentiment label: Extreme Fear/Fear/Neutral/Greed/Extreme Greed
   - Trend: Improving/Stable/Deteriorating?

2. **MARKET PSYCHOLOGY**
   - Fear vs Greed: What emotion is driving price?
   - Crowd emotion: FOMO? Panic? Apathy? Uncertainty?
   - Contrarian opportunity: Is everyone on the same side of the boat?

3. **MOMENTUM INDICATORS**
   - Price momentum: Strong Positive/Positive/Neutral/Negative/Strong Negative
   - Volume momentum: Increasing/Stable/Decreasing?
   - Divergence alert: Price up but volume down (or vice versa)?

4. **POSITIONING ANALYSIS**
   - Retail positioning: Heavy Long/Long/Neutral/Short/Heavy Short?
   - Smart money signals: What are whales/institutions doing?
   - Crowd consensus: Is everyone bullish or bearish? (Contrarian signal!)

5. **SENTIMENT DRIVERS** (3-5 specific events)
   - Recent news, partnerships, protocol updates
   - Macro events (BTC moves, Fed decisions, regulations)
   - Social media buzz or influencer narratives

6. **CONTRARIAN SIGNALS** (opportunities against the herd)
   - Examples: "Extreme fear + strong fundamentals = buy zone"
   - "Euphoria + overextension = take profits"

7. **OUTLOOK & TRIGGERS**
   - Next 7 days: Where is sentiment heading?
   - Key levels to watch: What prices would flip sentiment?
   - Change triggers: Events that could shift market mood

8. **RECOMMENDED STANCE**
   - Action: Aggressive Accumulation/Moderate Accumulation/Hold & Monitor/Reduce Exposure/Defensive
   - Rationale: Why this stance based on sentiment?

Remember: Be contrarian when you have an edge. When everyone is greedy, be fearful. When everyone is fearful, be greedy.`;
        break;

      case 'onchain':
        const supplyRemaining = coin.max_supply ? (((coin.max_supply - coin.circulating_supply) / coin.max_supply) * 100).toFixed(1) : 'N/A';
        const volumeMcapRatio = ((coin.total_volume / coin.market_cap) * 100).toFixed(2);

        userPrompt = `ON-CHAIN INTEL: ${coin.name} (${coin.symbol.toUpperCase()}) - ${currentDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛓️ BLOCKCHAIN DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Supply Dynamics:
• Circulating: ${coin.circulating_supply ? (coin.circulating_supply / 1e9).toFixed(2) + 'B' : 'N/A'} tokens
• Max Supply: ${coin.max_supply ? (coin.max_supply / 1e9).toFixed(2) + 'B' : '♾️ Unlimited'}
• Issued: ${supplyIssued}% | Remaining: ${supplyRemaining}%
${supplyRemaining !== 'N/A' && parseFloat(supplyRemaining) > 20 ? '⚠️ SIGNIFICANT UNLOCK RISK AHEAD' : ''}

Market Depth:
• 24h Volume: $${(coin.total_volume / 1e9).toFixed(2)}B
• Vol/MCap: ${volumeMcapRatio}% ${parseFloat(volumeMcapRatio) < 5 ? '(🔴 Low liquidity)' : parseFloat(volumeMcapRatio) > 10 ? '(🟢 High liquidity)' : '(🟡 Normal)'}
• Rank: #${coin.market_cap_rank}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR TASK: DECODE BLOCKCHAIN SIGNALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use volume, price action, and supply data to infer on-chain behavior:

1. **NETWORK HEALTH**
   - Activity trend: Growing/Stable/Declining?
   - Network usage: Based on volume patterns
   - Congestion level: High/Medium/Low (infer from volatility)

2. **SUPPLY DYNAMICS**
   - Circulating %: What % is in circulation vs locked?
   - Supply concentration: Highly Concentrated/Moderately Concentrated/Well Distributed?
   - Inflation pressure: Are unlocks diluting holders?

3. **WHALE ACTIVITY** (infer from price/volume)
   - Large holder trend: Accumulating/Distributing/Holding?
   - Whale signals: Sudden volume spikes = whale movement
   - Top holder risk: Concentration in few wallets?

4. **EXCHANGE FLOWS** (infer from volume patterns)
   - Net flow: Strong Inflows/Inflows/Neutral/Outflows/Strong Outflows
   - Interpretation: Inflows = selling pressure, Outflows = hodling
   - Exchange balance trend: Growing (bearish) or Shrinking (bullish)?

5. **HOLDER BEHAVIOR**
   - Holding time: Are holders patient or trigger-happy?
   - Long-term holder trend: Increasing/Stable/Decreasing?
   - Short-term speculation: High volatility = speculation

6. **SMART MONEY SIGNALS** (3-5 signals)
   - Volume spikes during consolidation = accumulation
   - Strong support holding = institutional bids
   - Low volume rallies = weak hands, likely reversal

7. **ACCUMULATION PHASE**
   - Current phase: Accumulation/Markup/Distribution/Markdown?
   - Confidence: High/Medium/Low?
   - Phase analysis: Why this phase and what's next?

8. **ON-CHAIN OUTLOOK**
   - Bullish signals: (3-5 data points supporting upside)
   - Bearish signals: (3-5 data points suggesting downside)
   - Key metrics to monitor: What should traders watch?

Focus on ACTIONABLE SIGNALS that give traders an informational edge over the market.`;
        break;

      case 'etf':
        const marketDominance = ((coin.market_cap / 2500000000000) * 100).toFixed(2);
        const liquidityScore = coin.total_volume / coin.market_cap > 0.1 ? '🟢 Excellent' : coin.total_volume / coin.market_cap > 0.05 ? '🟡 Good' : '🔴 Fair';

        userPrompt = `INSTITUTIONAL FLOW ANALYSIS: ${coin.name} (${coin.symbol.toUpperCase()}) - ${currentDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 TRADFI & INSTITUTIONAL METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Market Size:
• Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B (#${coin.market_cap_rank} globally)
• Market Dominance: ${marketDominance}% of total crypto market
• 24h Volume: $${(coin.total_volume / 1e9).toFixed(2)}B
• Liquidity Grade: ${liquidityScore}

Institutional Accessibility:
• ETF Products: ${coin.market_cap_rank <= 5 ? 'Likely available for BTC/ETH' : 'Limited/None for smaller caps'}
• Volume/MCap: ${((coin.total_volume / coin.market_cap) * 100).toFixed(2)}% (${coin.total_volume / coin.market_cap > 0.1 ? 'Institutions CAN move size' : 'Low liquidity for large players'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR TASK: INSTITUTIONAL FLOW INTEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze institutional and ETF dynamics for trading edge:

1. **ETF LANDSCAPE**
   - Spot ETF status: Available? Approved? Pending?
   - Futures ETF products: What derivative products exist?
   - Total AUM estimate: How much institutional money?
   - Approval probability: Very High/High/Medium/Low/Very Low (if pending)

2. **INSTITUTIONAL FLOWS**
   - Flow direction: Strong Inflows/Moderate Inflows/Neutral/Moderate Outflows/Strong Outflows
   - Weekly flow estimate: Based on volume trends
   - Cumulative flows: YTD institutional positioning
   - Flow sustainability: Sustainable/Moderate/Unsustainable?

3. **SPOT VS DERIVATIVES**
   - Futures OI: Is it growing or shrinking?
   - Spot volume: Real buying or paper trading?
   - Basis analysis: Contango (bullish) or backwardation (bearish)?
   - Institutional preference: Are they spot or futures players?

4. **PREMIUM/DISCOUNT ANALYSIS**
   - Current premium: ETF trading at premium or discount to NAV?
   - Premium trend: Expanding/Stable/Contracting?
   - Arbitrage opportunities: Can retail exploit mispricings?

5. **INSTITUTIONAL SENTIMENT**
   - Sentiment: Very Bullish/Bullish/Neutral/Bearish/Very Bearish
   - Positioning: How are institutions positioned?
   - Risk appetite: Aggressive/Moderate/Conservative?

6. **TRADFI INTEGRATION**
   - Custody solutions: Which big players offer custody?
   - Banking partnerships: Any major bank partnerships?
   - Payment integrations: Real-world utility driving adoption?

7. **REGULATORY LANDSCAPE**
   - Regulatory clarity: High/Medium/Low?
   - Recent developments: Any new rules or enforcement actions?
   - Impact assessment: Bullish or bearish for institutional adoption?

8. **INSTITUTIONAL OUTLOOK**
   - Next 30 days: Where are institutions heading?
   - Next 90 days: Medium-term flow prediction?
   - Catalysts: What events could drive institutional flows?
   - Risks: What could reverse institutional interest?

TRADING STRATEGY:
- Should retail front-run institutions or follow them?
- What price levels indicate institutional accumulation?
- Time horizon for institutional thesis to play out?

    */

    // Use Claude with optimized model selection, prompt caching, and compressed prompts
    // Cost savings: 80% reduction (Haiku: 87% cheaper, Caching: 90% on repeated content, Compression: 70% fewer tokens)
    const requestBody = buildCachedRequest(
      modelConfig,
      systemPrompt,
      userPrompt,
      [getAnalysisSchema(analysisType)],
      { type: "tool", name: getToolName(analysisType) }
    );

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      console.error('Request body:', JSON.stringify(requestBody, null, 2));
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
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

    // Calculate optimization metadata
    const costSavings = estimateCostSavings(analysisType, true);
    const usageMetadata = data.usage || {};

    // Return structured analysis with timestamp and optimization info
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
        },
        // Optimization metadata for user visibility
        optimization: {
          model: costSavings.model,
          estimatedSavings: `${costSavings.estimatedSavings}%`,
          responseTime: costSavings.responseTime,
          tokensUsed: {
            input: usageMetadata.input_tokens || 0,
            output: usageMetadata.output_tokens || 0,
            cacheCreation: usageMetadata.cache_creation_input_tokens || 0,
            cacheRead: usageMetadata.cache_read_input_tokens || 0
          }
        }
      }),
      {
        headers: { ...corsHeaders, ...rateLimitCheck.headers, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in ai-analysis function:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        errorType: error.name,
        details: error.stack?.split('\n')?.[0] || 'No additional details'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

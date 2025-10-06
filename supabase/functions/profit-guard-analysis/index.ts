import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coinId, coinSymbol, entryPrice, timeframe, investmentPeriod } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Fetch current market data for the coin
    const marketResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    );
    const marketData = await marketResponse.json();

    const timeframeContext = {
      'short-term': 'Focus on quick profits within days to 2 weeks. Consider day-to-day volatility and immediate resistance levels.',
      'medium-term': 'Balance between quick gains and sustained growth over weeks to months. Consider weekly trends and key support/resistance zones.',
      'long-term': 'Strategic profit-taking over months. Focus on major trend reversals and psychological price levels.'
    };

    const systemPrompt = `You are IgniteX AI, an expert crypto trading analyst specializing in profit protection strategies. Your role is to analyze market conditions and recommend optimal profit-taking levels to help traders lock in gains and avoid the common mistake of losing profits due to greed.

Key principles:
- Provide realistic profit targets based on current market conditions, volatility, and momentum
- Consider the user's timeframe (${timeframe}) and investment period (${investmentPeriod} days)
- ${timeframeContext[timeframe as keyof typeof timeframeContext]}
- Recommend gradual profit-taking: never suggest selling everything at once
- Factor in support/resistance levels, market sentiment, and historical price patterns
- Be conservative but not overly cautious - help users secure profits while maintaining upside potential
- Each profit level should have clear reasoning based on technical and market analysis

Your recommendations will help users avoid the #1 mistake: holding too long and watching profits evaporate.`;

    const currentPrice = marketData.market_data.current_price.usd;
    const currentProfit = ((currentPrice - entryPrice) / entryPrice) * 100;
    const athDistance = ((marketData.market_data.ath.usd - currentPrice) / currentPrice) * 100;
    
    const userPrompt = `Analyze ${coinSymbol.toUpperCase()} and provide detailed profit-taking strategy.

POSITION DETAILS:
- Entry Price: $${entryPrice}
- Current Price: $${currentPrice}
- Current Profit: ${currentProfit.toFixed(2)}%
- Investment Timeframe: ${timeframe}
- Investment Period: ${investmentPeriod} days

MARKET DATA:
- 24h Change: ${marketData.market_data.price_change_percentage_24h?.toFixed(2)}%
- 7d Change: ${marketData.market_data.price_change_percentage_7d?.toFixed(2)}%
- 30d Change: ${marketData.market_data.price_change_percentage_30d?.toFixed(2)}%
- All-Time High: $${marketData.market_data.ath.usd}
- Distance from ATH: ${athDistance.toFixed(2)}%
- Market Cap Rank: #${marketData.market_cap_rank}
- 24h Volume: $${marketData.market_data.total_volume.usd.toLocaleString()}
- Market Cap: $${marketData.market_data.market_cap.usd.toLocaleString()}
- Volatility (24h high/low): ${(((marketData.market_data.high_24h.usd - marketData.market_data.low_24h.usd) / marketData.market_data.low_24h.usd) * 100).toFixed(2)}%

ANALYSIS REQUIREMENTS:
1. Provide 3-5 profit levels optimized for the ${timeframe} timeframe
2. Consider the ${investmentPeriod}-day investment horizon
3. Each level must include profit percentage, target price, percentage to sell (must total 100%), and detailed reasoning
4. Base recommendations on current market momentum, volatility, and technical levels
5. Factor in psychological price levels and resistance zones
6. Ensure the strategy protects profits while maintaining upside potential

Return ONLY a JSON object with this EXACT structure (no markdown, no extra text):
{
  "analysis": "2-3 sentence detailed market analysis covering current momentum, volatility assessment, and key technical levels. Explain why this is a good/bad time to take profits.",
  "profit_levels": [
    {
      "percentage": 15,
      "target_price": 1150.50,
      "quantity_to_sell": 20,
      "reasoning": "Detailed reasoning: why this level, what technical/market factors support it, what could happen if price reaches here"
    }
  ],
  "risk_assessment": "low|medium|high",
  "recommendation": "Clear 2-3 sentence actionable recommendation. Should users be more aggressive or conservative? What's the overall strategy?"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      throw new Error("Failed to generate analysis");
    }

    const aiResponse = await response.json();
    const content = aiResponse.content[0].text;
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in profit-guard-analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

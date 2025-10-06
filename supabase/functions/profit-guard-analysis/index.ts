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
    const { coinId, coinSymbol, entryPrice } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Fetch current market data for the coin
    const marketResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    );
    const marketData = await marketResponse.json();

    const systemPrompt = `You are an expert crypto trading analyst specializing in profit protection strategies. Your role is to analyze market conditions and recommend optimal profit-taking levels to help traders lock in gains and avoid losing profits due to greed.

Key principles:
- Focus on realistic profit targets based on market conditions
- Consider volatility, momentum, and support/resistance levels
- Recommend gradual profit-taking to balance risk and reward
- Account for both short-term and medium-term market dynamics
- Never suggest holding indefinitely or being overly greedy

Analyze the provided market data and recommend 3-5 profit levels with specific percentages and the portion of position to sell at each level.`;

    const userPrompt = `Analyze ${coinSymbol} and recommend profit-taking levels.

Entry Price: $${entryPrice}
Current Price: $${marketData.market_data.current_price.usd}
24h Change: ${marketData.market_data.price_change_percentage_24h}%
7d Change: ${marketData.market_data.price_change_percentage_7d}%
30d Change: ${marketData.market_data.price_change_percentage_30d}%
ATH: $${marketData.market_data.ath.usd}
ATL: $${marketData.market_data.atl.usd}
Market Cap Rank: #${marketData.market_cap_rank}
24h Volume: $${marketData.market_data.total_volume.usd}
Market Cap: $${marketData.market_data.market_cap.usd}

Provide profit-taking recommendations considering:
1. Current market momentum and volatility
2. Historical price movements and patterns
3. Risk management best practices
4. Gradual profit-taking strategy to avoid FOMO

Return ONLY a JSON object with this exact structure:
{
  "analysis": "Brief market analysis and reasoning",
  "profit_levels": [
    {
      "percentage": 20,
      "target_price": 1200.50,
      "quantity_to_sell": 25,
      "reasoning": "First resistance level"
    }
  ],
  "risk_assessment": "low|medium|high",
  "recommendation": "Overall strategy recommendation"
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

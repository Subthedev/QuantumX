import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Generate mock AI prediction (In a real app, this would call a real AI service)
    const prediction = generateMockPrediction(coin);

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

function generateMockPrediction(coin: 'BTC' | 'ETH') {
  // Mock prediction data - in a real app, this would come from an AI service
  const btcPredictions = [
    {
      summary: "Bitcoin shows strong bullish momentum with potential for 15-25% upside in the next 30 days. Technical indicators suggest a breakout above key resistance levels.",
      confidence: 78,
      trend: "bullish",
      key_insights: [
        "Strong institutional buying pressure observed",
        "Technical breakout above $45,000 resistance",
        "Positive correlation with traditional markets weakening",
        "On-chain metrics showing accumulation phase"
      ]
    },
    {
      summary: "Bitcoin faces short-term consolidation with mixed signals. Expect sideways movement between $40,000-$48,000 with potential for volatility.",
      confidence: 65,
      trend: "neutral",
      key_insights: [
        "Mixed technical signals across timeframes",
        "Decreasing trading volume suggests consolidation",
        "Regulatory uncertainty creating market hesitancy",
        "Macro economic factors remain uncertain"
      ]
    }
  ];

  const ethPredictions = [
    {
      summary: "Ethereum demonstrates strong fundamentals with upcoming network upgrades driving bullish sentiment. Expect 20-30% gains in the coming weeks.",
      confidence: 82,
      trend: "bullish", 
      key_insights: [
        "Ethereum 2.0 staking rewards attracting investors",
        "DeFi ecosystem growth supporting price action",
        "Network usage metrics at all-time highs",
        "Developer activity showing strong momentum"
      ]
    },
    {
      summary: "Ethereum shows signs of overextension in the short term. Potential for 10-15% correction before resuming upward trend.",
      confidence: 71,
      trend: "bearish",
      key_insights: [
        "RSI showing overbought conditions",
        "High gas fees creating user friction",
        "Profit-taking observed from long-term holders",
        "Competition from other smart contract platforms"
      ]
    }
  ];

  const predictions = coin === 'BTC' ? btcPredictions : ethPredictions;
  const randomPrediction = predictions[Math.floor(Math.random() * predictions.length)];

  return {
    summary: randomPrediction.summary,
    confidence: randomPrediction.confidence,
    data: {
      trend: randomPrediction.trend,
      key_insights: randomPrediction.key_insights,
      timestamp: new Date().toISOString(),
      coin: coin
    }
  };
}
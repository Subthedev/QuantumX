import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const coinId = url.searchParams.get('coinId')
    const days = url.searchParams.get('days') || '7'
    const endpoint = url.searchParams.get('endpoint') || 'ohlc' // 'ohlc' or 'market_chart'

    if (!coinId) {
      return new Response(
        JSON.stringify({ error: 'coinId parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let apiUrl: string

    if (endpoint === 'market_chart') {
      apiUrl = `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    } else {
      apiUrl = `${COINGECKO_API_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
    }

    console.log('Fetching from CoinGecko:', apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status, response.statusText)
      return new Response(
        JSON.stringify({
          error: `CoinGecko API returned ${response.status}`,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache for 1 minute
        }
      }
    )

  } catch (error) {
    console.error('Error in crypto-ohlc function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

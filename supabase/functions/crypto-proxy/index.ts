/**
 * Crypto Data Proxy
 *
 * Solves CORS issues by proxying CoinGecko requests server-side
 * Combines Binance real-time data with CoinGecko comprehensive data
 * Implements intelligent caching and fallback strategies
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 60 seconds

interface CryptoListParams {
  vs_currency?: string;
  order?: string;
  per_page?: number;
  page?: number;
  sparkline?: boolean;
}

interface CryptoDetailsParams {
  localization?: boolean;
  tickers?: boolean;
  market_data?: boolean;
  community_data?: boolean;
  developer_data?: boolean;
  sparkline?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const coinId = url.searchParams.get('coinId');

    console.log(`📡 Crypto proxy request: ${endpoint}, coin: ${coinId || 'list'}`);

    // Get list of cryptocurrencies
    if (endpoint === 'list') {
      return await handleCryptoList(url);
    }

    // Get detailed coin data
    if (endpoint === 'details' && coinId) {
      return await handleCoinDetails(coinId, url);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('❌ Crypto proxy error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: "Use Binance data"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCryptoList(url: URL): Promise<Response> {
  const params: CryptoListParams = {
    vs_currency: url.searchParams.get('vs_currency') || 'usd',
    order: url.searchParams.get('order') || 'market_cap_desc',
    per_page: parseInt(url.searchParams.get('per_page') || '100'),
    page: parseInt(url.searchParams.get('page') || '1'),
    sparkline: url.searchParams.get('sparkline') === 'true'
  };

  const cacheKey = `list-${JSON.stringify(params)}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ Cache HIT:', cacheKey);
    return new Response(
      JSON.stringify({
        data: cached.data,
        cached: true,
        source: 'cache'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch from CoinGecko
  try {
    const queryParams = new URLSearchParams({
      vs_currency: params.vs_currency,
      order: params.order,
      per_page: params.per_page.toString(),
      page: params.page.toString(),
      sparkline: params.sparkline.toString()
    });

    const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?${queryParams}`;
    console.log('🔍 Fetching from CoinGecko:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter out stablecoins
    const stablecoins = ['usdt', 'usdc', 'dai', 'busd', 'tusd', 'usdp', 'gusd', 'frax', 'usdd', 'paxg', 'xaut'];
    const filtered = data.filter((coin: any) =>
      !stablecoins.includes(coin.symbol.toLowerCase())
    );

    // Cache the result
    cache.set(cacheKey, { data: filtered, timestamp: Date.now() });
    console.log('💾 Cached:', cacheKey, `(${filtered.length} coins)`);

    return new Response(
      JSON.stringify({
        data: filtered,
        cached: false,
        source: 'coingecko'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ CoinGecko fetch error:', error);

    // Return cached data even if expired
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('⚠️ Returning stale cache due to error');
      return new Response(
        JSON.stringify({
          data: cached.data,
          cached: true,
          stale: true,
          source: 'stale-cache'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw error;
  }
}

async function handleCoinDetails(coinId: string, url: URL): Promise<Response> {
  const params: CryptoDetailsParams = {
    localization: url.searchParams.get('localization') !== 'false',
    tickers: url.searchParams.get('tickers') !== 'false',
    market_data: url.searchParams.get('market_data') !== 'false',
    community_data: url.searchParams.get('community_data') !== 'false',
    developer_data: url.searchParams.get('developer_data') !== 'false',
    sparkline: url.searchParams.get('sparkline') !== 'false'
  };

  const cacheKey = `details-${coinId}-${JSON.stringify(params)}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ Cache HIT:', cacheKey);
    return new Response(
      JSON.stringify({
        data: cached.data,
        cached: true,
        source: 'cache'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch from CoinGecko
  try {
    const queryParams = new URLSearchParams({
      localization: params.localization.toString(),
      tickers: params.tickers.toString(),
      market_data: params.market_data.toString(),
      community_data: params.community_data.toString(),
      developer_data: params.developer_data.toString(),
      sparkline: params.sparkline.toString()
    });

    const apiUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?${queryParams}`;
    console.log('🔍 Fetching coin details:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });
    console.log('💾 Cached details:', coinId);

    return new Response(
      JSON.stringify({
        data,
        cached: false,
        source: 'coingecko'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ CoinGecko details fetch error:', error);

    // Return cached data even if expired
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('⚠️ Returning stale cache due to error');
      return new Response(
        JSON.stringify({
          data: cached.data,
          cached: true,
          stale: true,
          source: 'stale-cache'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw error;
  }
}

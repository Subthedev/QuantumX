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

// Symbol to CoinGecko ID mapping
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Major coins
  'btc': 'bitcoin',
  'btcusdt': 'bitcoin',
  'eth': 'ethereum',
  'ethusdt': 'ethereum',
  'bnb': 'binancecoin',
  'bnbusdt': 'binancecoin',
  'xrp': 'ripple',
  'xrpusdt': 'ripple',
  'ada': 'cardano',
  'adausdt': 'cardano',
  'doge': 'dogecoin',
  'dogeusdt': 'dogecoin',
  'sol': 'solana',
  'solusdt': 'solana',
  'dot': 'polkadot',
  'dotusdt': 'polkadot',
  'trx': 'tron',
  'trxusdt': 'tron',
  'matic': 'polygon',
  'maticusdt': 'polygon',
  'ltc': 'litecoin',
  'ltcusdt': 'litecoin',
  'shib': 'shiba-inu',
  'shibusdt': 'shiba-inu',
  'avax': 'avalanche-2',
  'avaxusdt': 'avalanche-2',
  'link': 'chainlink',
  'linkusdt': 'chainlink',
  'atom': 'cosmos',
  'atomusdt': 'cosmos',
  'uni': 'uniswap',
  'uniusdt': 'uniswap',
  'etc': 'ethereum-classic',
  'etcusdt': 'ethereum-classic',
  'xmr': 'monero',
  'xmrusdt': 'monero',
  'xlm': 'stellar',
  'xlmusdt': 'stellar',
  'bch': 'bitcoin-cash',
  'bchusdt': 'bitcoin-cash',
  'algo': 'algorand',
  'algousdt': 'algorand',
  'vet': 'vechain',
  'vetusdt': 'vechain',
  'icp': 'internet-computer',
  'icpusdt': 'internet-computer',
  'fil': 'filecoin',
  'filusdt': 'filecoin',
  'hbar': 'hedera-hashgraph',
  'hbarusdt': 'hedera-hashgraph',
  'apt': 'aptos',
  'aptusdt': 'aptos',
  'near': 'near',
  'nearusdt': 'near',
  'arb': 'arbitrum',
  'arbusdt': 'arbitrum',
  'op': 'optimism',
  'opusdt': 'optimism',
  'sui': 'sui',
  'suiusdt': 'sui',
  'inj': 'injective-protocol',
  'injusdt': 'injective-protocol',
  'ton': 'the-open-network',
  'tonusdt': 'the-open-network',
  'stx': 'blockstack',
  'stxusdt': 'blockstack',
  'rune': 'thorchain',
  'runeusdt': 'thorchain',
  'imx': 'immutable-x',
  'imxusdt': 'immutable-x',
  'grt': 'the-graph',
  'grtusdt': 'the-graph',
  'mana': 'decentraland',
  'manausdt': 'decentraland',
  'sand': 'the-sandbox',
  'sandusdt': 'the-sandbox',
  'axs': 'axie-infinity',
  'axsusdt': 'axie-infinity',
  'theta': 'theta-token',
  'thetausdt': 'theta-token',
  'ftm': 'fantom',
  'ftmusdt': 'fantom',
  'egld': 'elrond-erd-2',
  'egldusdt': 'elrond-erd-2',
  'kava': 'kava',
  'kavausdt': 'kava',
  'flow': 'flow',
  'flowusdt': 'flow',
  'hnt': 'helium',
  'hntusdt': 'helium',
  'ksm': 'kusama',
  'ksmusdt': 'kusama',
  'xtz': 'tezos',
  'xtzusdt': 'tezos',
  'zec': 'zcash',
  'zecusdt': 'zcash',
  'dash': 'dash',
  'dashusdt': 'dash',
  'waves': 'waves',
  'wavesusdt': 'waves',
  'neo': 'neo',
  'neousdt': 'neo',
  'qtum': 'qtum',
  'qtumusdt': 'qtum'
};

function normalizeCoinId(coinId: string): string {
  const normalized = coinId.toLowerCase().trim();
  
  // If it's already a valid CoinGecko ID (no USDT suffix), return it
  if (!normalized.includes('usdt') && !SYMBOL_TO_COINGECKO_ID[normalized]) {
    return normalized;
  }
  
  // Try to find mapping
  const mapped = SYMBOL_TO_COINGECKO_ID[normalized];
  if (mapped) {
    console.log(`🔄 Mapped ${coinId} -> ${mapped}`);
    return mapped;
  }
  
  // If no mapping found, remove 'usdt' suffix and return
  const withoutUsdt = normalized.replace(/usdt$/, '');
  console.log(`⚠️ No mapping for ${coinId}, trying: ${withoutUsdt}`);
  return withoutUsdt;
}

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
    // Parse request body (supabase.functions.invoke sends data in body)
    const body = await req.json();
    const endpoint = body.endpoint;
    const coinId = body.coinId;

    console.log(`📡 Crypto proxy request: ${endpoint}, coin: ${coinId || 'list'}`, body);

    // Get list of cryptocurrencies
    if (endpoint === 'list') {
      return await handleCryptoList(body);
    }

    // Get detailed coin data
    if (endpoint === 'details' && coinId) {
      return await handleCoinDetails(coinId, body);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint. Use endpoint: "list" or "details"', received: body }),
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

async function handleCryptoList(body: any): Promise<Response> {
  const params: CryptoListParams = {
    vs_currency: body.vs_currency || 'usd',
    order: body.order || 'market_cap_desc',
    per_page: parseInt(body.per_page || '100'),
    page: parseInt(body.page || '1'),
    sparkline: body.sparkline !== false
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

async function handleCoinDetails(coinId: string, body: any): Promise<Response> {
  // Normalize the coin ID to CoinGecko format
  const normalizedCoinId = normalizeCoinId(coinId);
  
  const params: CryptoDetailsParams = {
    localization: body.localization !== false,
    tickers: body.tickers !== false,
    market_data: body.market_data !== false,
    community_data: body.community_data !== false,
    developer_data: body.developer_data !== false,
    sparkline: body.sparkline !== false
  };

  const cacheKey = `details-${normalizedCoinId}-${JSON.stringify(params)}`;

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

    const apiUrl = `https://api.coingecko.com/api/v3/coins/${normalizedCoinId}?${queryParams}`;
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
    console.log('💾 Cached details:', normalizedCoinId);

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

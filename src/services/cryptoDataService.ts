import { supabase } from '@/integrations/supabase/client';

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  sparkline_in_7d?: {
    price: number[];
  };
  price_change_percentage_7d_in_currency?: number;
}

class CryptoDataService {
  private cache: Map<string, { data: CryptoData[], timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map(); // Request deduplication
  private CACHE_DURATION = 2000; // 2 seconds cache for near real-time updates
  private USE_PROXY = true; // Use Supabase proxy to avoid CORS issues

  async getTopCryptos(limit: number = 100): Promise<CryptoData[]> {
    const cacheKey = `top-${limit}`;

    // 1. Check cache first (instant response)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('✅ Cache HIT:', cacheKey, `(age: ${Math.floor((Date.now() - cached.timestamp) / 1000)}s)`);
      return cached.data;
    }

    // 2. Deduplicate concurrent requests (prevent hammering API)
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🔄 Request DEDUP:', cacheKey, '(waiting for in-flight request)');
      return this.pendingRequests.get(cacheKey)!;
    }

    // 3. Create new request and store as pending
    const request = (async () => {
      console.log('📡 API CALL via Supabase proxy:', cacheKey);

      try {
        // Fetch more coins to account for filtered stablecoins, wrapped tokens, and unsupported coins
        const fetchLimit = limit + 70;

        // Use Supabase proxy to avoid CORS issues
        const { data: proxyData, error } = await supabase.functions.invoke('crypto-proxy', {
          body: {
            endpoint: 'list',
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: fetchLimit,
            page: 1,
            sparkline: true
          }
        });

        if (error) {
          console.error('❌ Proxy error:', error);
          throw new Error('Failed to fetch crypto data via proxy');
        }

        let data: CryptoData[] = proxyData.data;

      // Filter out unwanted coins: stablecoins, wrapped tokens, bridged tokens, and unsupported coins
      const excludedCoins = [
        // USD Stablecoins & Yield tokens
        'usdt', 'usdc', 'busd', 'dai', 'tusd', 'usdp', 'gusd', 'frax', 'usdd', 'paxg', 'xaut',
        'pax', 'fdusd', 'pyusd', 'usdt0', 'usds', 'usde', 'usdx', 'usdk', 'usdj', 'usdn',
        'rlusd', 'usdy', 'ustb', 'ousg', // Ripple USD, Ondo USD Yield, USTB, OUSG
        // Wrapped versions (duplicates of native coins)
        'wbtc', 'weth', 'steth', 'reth', 'cbeth', 'wbnb', 'wmatic', 'wsteth', 'eeth', 'weeth',
        'clbtc', 'msol', 'cgeth.hashkey', 'sn117', // Wrapped BTC, staked SOL, wrapped ETH variants
        // Bridged tokens (cross-chain duplicates)
        'btcb', 'eth.b', 'weth.e', 'usdt.e', 'usdc.e',
        // Coins with no CryptoCompare support or problematic symbols
        'xpl', 's', // Plasma, Sonic (too short/unsupported)
      ];

      data = data.filter(coin => {
        const symbol = coin.symbol.toLowerCase();
        const name = coin.name.toLowerCase();
        const id = coin.id.toLowerCase();

        // Filter by symbol
        if (excludedCoins.includes(symbol)) return false;

        // Filter by coin ID patterns
        if (id.includes('wrapped-') && (id.includes('eth') || id.includes('btc') || id.includes('sol'))) return false;
        if (id.includes('staked-ether')) return false;
        if (id.includes('wrapped-beacon-eth')) return false;
        if (id.includes('ethena-usde')) return false;
        if (id.includes('figure-heloc')) return false;
        if (id.includes('bridged-weth')) return false;
        if (id.includes('usd-yield')) return false;
        if (id.includes('ripple-usd')) return false;
        if (id.includes('l2-standard-bridged')) return false;

        // Filter by name patterns (catches variants like "Binance Bridged USDT")
        if (name.includes('wrapped') && (name.includes('bitcoin') || name.includes('ethereum') || name.includes('eth') || name.includes('solana'))) return false;
        if (name.includes('staked ether') || name.includes('staked sol')) return false;
        if (name.includes('bridged') && (name.includes('usdt') || name.includes('usdc') || name.includes('weth'))) return false;
        if (name.includes('usd') && name.includes('pegged')) return false;
        if (name.includes('usd') && name.includes('yield')) return false;
        if (name.includes('dollar yield')) return false;
        if (name.startsWith('ethena') && name.includes('usd')) return false;
        if (name.includes('government securities')) return false;
        if (name.includes('short duration')) return false;

        return true;
      });

        // Limit to requested amount after filtering
        data = data.slice(0, limit);

        // Cache the data
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        console.log('💾 Cached:', cacheKey, `(${data.length} coins)`);

        return data;
      } catch (error) {
        console.error('❌ API Error:', cacheKey, error);
        throw error;
      }
    })();

    // 4. Store pending request
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;
      return data;
    } finally {
      // 5. Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  async getCryptoDetails(coinId: string): Promise<any> {
    try {
      console.log('🔍 Fetching details for:', coinId, 'via Supabase proxy');

      // Use Supabase proxy to avoid CORS issues
      const { data: proxyData, error } = await supabase.functions.invoke('crypto-proxy', {
        body: {
          endpoint: 'details',
          coinId,
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: true
        }
      });

      if (error) {
        console.error('❌ Proxy error for coin details:', error);
        throw new Error(`Failed to fetch ${coinId} details via proxy`);
      }

      console.log('✅ Received details for:', coinId, proxyData.source);
      return proxyData.data;
    } catch (error) {
      console.error('Error fetching crypto details:', error);
      throw error;
    }
  }

  formatNumber(num: number): string {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }

  formatPercentage(percent: number): string {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  }

  getCoinLogoUrl(coinId: string): string {
    // Use CoinGecko's image API or Cryptoicons CDN
    return `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
  }
}

export const cryptoDataService = new CryptoDataService();
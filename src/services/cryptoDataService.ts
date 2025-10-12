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
  private CACHE_DURATION = 1800000; // 30 minutes cache - optimized for production
  private COINGECKO_API = 'https://api.coingecko.com/api/v3';

  async getTopCryptos(limit: number = 100): Promise<CryptoData[]> {
    const cacheKey = `top-${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Fetch more coins to account for filtered stablecoins
      const fetchLimit = limit + 20;
      const response = await fetch(
        `${this.COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${fetchLimit}&page=1&sparkline=true&price_change_percentage=7d`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto data');
      }
      
      let data: CryptoData[] = await response.json();
      
      // Filter out USD stablecoins
      const stablecoins = ['usdt', 'usdc', 'busd', 'dai', 'tusd', 'usdp', 'gusd', 'frax', 'usdd', 'paxg', 'xaut'];
      data = data.filter(coin => !stablecoins.includes(coin.symbol.toLowerCase()));
      
      // Limit to requested amount after filtering
      data = data.slice(0, limit);
      
      // Cache the data
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      throw error;
    }
  }

  async getCryptoDetails(coinId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto details');
      }
      
      return await response.json();
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
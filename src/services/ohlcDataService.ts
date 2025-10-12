// OHLC Data Service - Production-Grade Chart Data Fetching
// Solution: CryptoCompare API (reliable, generous free tier) + multiple fallbacks
import type { OHLCData, ChartData, ChartTimeframe } from '@/types/chart';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache

// CryptoCompare API - Reliable with generous free tier (100,000 calls/month)
const CRYPTOCOMPARE_API = 'https://min-api.cryptocompare.com/data';

// Map common CoinGecko IDs to crypto symbols
const SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'tether': 'USDT',
  'binancecoin': 'BNB',
  'solana': 'SOL',
  'usd-coin': 'USDC',
  'ripple': 'XRP',
  'dogecoin': 'DOGE',
  'cardano': 'ADA',
  'tron': 'TRX',
  'avalanche-2': 'AVAX',
  'shiba-inu': 'SHIB',
  'polkadot': 'DOT',
  'chainlink': 'LINK',
  'bitcoin-cash': 'BCH',
  'near': 'NEAR',
  'uniswap': 'UNI',
  'litecoin': 'LTC',
  'matic-network': 'MATIC',
  'polygon': 'MATIC',
  'internet-computer': 'ICP',
  'ethereum-classic': 'ETC',
  'stellar': 'XLM',
  'aptos': 'APT',
  'okb': 'OKB',
  'cosmos': 'ATOM',
  'monero': 'XMR',
  'filecoin': 'FIL',
  'hedera-hashgraph': 'HBAR',
  'hedera': 'HBAR',
  'vechain': 'VET',
  'arbitrum': 'ARB',
  'optimism': 'OP',
  'the-graph': 'GRT',
  'algorand': 'ALGO',
  'quant-network': 'QNT',
  'aave': 'AAVE',
  'flow': 'FLOW',
  'elrond-erd-2': 'EGLD',
  'theta-token': 'THETA',
  'axie-infinity': 'AXS',
  'eos': 'EOS',
  'tezos': 'XTZ',
  'the-sandbox': 'SAND',
  'decentraland': 'MANA',
  'neo': 'NEO',
  'fantom': 'FTM',
  'kucoin-shares': 'KCS',
  'maker': 'MKR',
  'iota': 'MIOTA',
  'klaytn': 'KLAY',
  'thorchain': 'RUNE',
  'zcash': 'ZEC',
  'chiliz': 'CHZ',
  'pancakeswap-token': 'CAKE',
};

interface CachedData {
  data: ChartData;
  timestamp: number;
}

class OHLCDataService {
  private cache: Map<string, CachedData> = new Map();

  /**
   * Convert CoinGecko ID to crypto symbol
   */
  private getSymbol(coinGeckoId: string): string {
    return SYMBOL_MAP[coinGeckoId] || coinGeckoId.toUpperCase();
  }

  /**
   * Get CryptoCompare aggregate level based on days
   * PRODUCTION-GRADE: Returns 2+ YEARS of historical data
   */
  private getAggregateLevel(days: number | 'max'): { endpoint: string; limit: number; aggregate: number } {
    // CryptoCompare API limits: 2000 data points max per request

    if (days === 'max') {
      // ALL TIME: 2+ years of daily candles (730 days = 2 years)
      return { endpoint: 'histoday', limit: 2000, aggregate: 1 };
    }

    if (days >= 365) {
      // 1Y+: Daily candles, up to 2000 days (~5.5 years)
      return { endpoint: 'histoday', limit: 2000, aggregate: 1 };
    }

    if (days >= 180) {
      // 180D: Daily candles, 2 years worth
      return { endpoint: 'histoday', limit: 730, aggregate: 1 };
    }

    if (days >= 90) {
      // 90D: Daily candles, 2 years worth
      return { endpoint: 'histoday', limit: 730, aggregate: 1 };
    }

    if (days >= 30) {
      // 30D: 12-hour candles, 2 years worth (1460 candles)
      return { endpoint: 'histohour', limit: 1460, aggregate: 12 };
    }

    if (days >= 7) {
      // 7D: 6-hour candles, 2 years worth (2920 candles, but limited to 2000)
      return { endpoint: 'histohour', limit: 2000, aggregate: 6 };
    }

    if (days >= 1) {
      // 1D/1H/4H: 2-hour candles, 2 years worth (max 2000)
      return { endpoint: 'histohour', limit: 2000, aggregate: 2 };
    }

    // < 1 day: 1-hour candles for last 2 years (max 2000)
    return { endpoint: 'histohour', limit: 2000, aggregate: 1 };
  }

  /**
   * Fetch from CryptoCompare API (PRIMARY - Reliable and generous free tier)
   */
  async fetchFromCryptoCompare(coinGeckoId: string, days: number | 'max'): Promise<ChartData> {
    const cacheKey = `${coinGeckoId}-${days}-cryptocompare`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✓ Using cached CryptoCompare data for ${coinGeckoId}`);
      return cached.data;
    }

    try {
      const symbol = this.getSymbol(coinGeckoId);
      const { endpoint, limit, aggregate } = this.getAggregateLevel(typeof days === 'number' ? days : 365);

      const url = `${CRYPTOCOMPARE_API}/${endpoint}?fsym=${symbol}&tsym=USD&limit=${limit}&aggregate=${aggregate}`;

      console.log(`→ Fetching from CryptoCompare: ${coinGeckoId} (${symbol}) via ${endpoint}, limit: ${limit}, aggregate: ${aggregate}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`CryptoCompare API returned ${response.status}`);
      }

      const result = await response.json();

      if (result.Response === 'Error') {
        throw new Error(result.Message || 'CryptoCompare API error');
      }

      if (!result.Data || !Array.isArray(result.Data) || result.Data.length === 0) {
        throw new Error('No data from CryptoCompare');
      }

      // Convert CryptoCompare data to our OHLC format
      const ohlcData: OHLCData[] = result.Data
        .filter((item: any) => item.open > 0) // Filter out invalid data points
        .map((item: any) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

      console.log(`✓ CryptoCompare success: ${ohlcData.length} candles loaded`);

      const chartData: ChartData = {
        ohlc: ohlcData,
        lastUpdate: Date.now(),
      };

      this.cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
      return chartData;

    } catch (error) {
      console.error(`✗ CryptoCompare fetch failed for ${coinGeckoId}:`, error);
      throw error;
    }
  }

  /**
   * Map timeframe to API days parameter
   * NOTE: We fetch 2+ years of data for ALL timeframes (production-grade deep history)
   * The timeframe button just determines the INITIAL visible range and candle interval
   */
  getApiDays(timeframe: ChartTimeframe): number | 'max' {
    // Always fetch deep history - the chart will show appropriate range
    const mapping: Record<ChartTimeframe, number | 'max'> = {
      '1H': 730,    // 2 years of data (but 1-hour intervals)
      '4H': 730,    // 2 years of data (but 2-hour intervals)
      '1D': 730,    // 2 years of data (but 2-hour intervals)
      '7D': 730,    // 2 years of data (but 6-hour intervals)
      '30D': 730,   // 2 years of data (but 12-hour intervals)
      '90D': 730,   // 2 years of data (but daily intervals)
      '180D': 730,  // 2 years of data (daily intervals)
      '1Y': 2000,   // 5+ years of data (daily intervals)
      'ALL': 'max', // Maximum available (5+ years)
    };
    return mapping[timeframe];
  }

  /**
   * Clear cache
   */
  clearCache(coinId?: string) {
    if (coinId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(coinId)) {
          this.cache.delete(key);
        }
      }
      console.log(`Cache cleared for ${coinId}`);
    } else {
      this.cache.clear();
      console.log('All cache cleared');
    }
  }

  /**
   * PRODUCTION-GRADE: Fetch with CryptoCompare + fallback strategies
   */
  async fetchDataForTimeframe(coinId: string, timeframe: ChartTimeframe): Promise<ChartData> {
    const apiDays = this.getApiDays(timeframe);

    console.log(`\n🔹 Loading ${timeframe} chart for ${coinId.toUpperCase()}`);

    try {
      // PRIMARY: CryptoCompare (reliable, native OHLC data)
      try {
        const cryptoCompareData = await this.fetchFromCryptoCompare(coinId, apiDays);
        console.log(`✅ Success via CryptoCompare: ${cryptoCompareData.ohlc.length} candles\n`);
        return cryptoCompareData;
      } catch (cryptoCompareError) {
        console.warn('⚠️  CryptoCompare failed:', cryptoCompareError);
      }

      // FALLBACK: Try shorter timeframe
      if (apiDays !== 7 && apiDays !== 1) {
        console.warn('🔄 Attempting fallback to 7-day data...');
        try {
          const fallbackData = await this.fetchFromCryptoCompare(coinId, 7);
          console.log(`✅ Fallback success: ${fallbackData.ohlc.length} candles\n`);
          return fallbackData;
        } catch (fallbackError) {
          console.error('✗ 7-day fallback failed:', fallbackError);
        }
      }

      // LAST RESORT: Try 1-day data
      if (apiDays !== 1) {
        console.warn('🔄 Last resort: trying 1-day data...');
        try {
          const lastResortData = await this.fetchFromCryptoCompare(coinId, 1);
          console.log(`✅ Last resort success: ${lastResortData.ohlc.length} candles\n`);
          return lastResortData;
        } catch (lastResortError) {
          console.error('✗ Last resort failed:', lastResortError);
        }
      }

      throw new Error(`Unable to load chart data for ${coinId}. This coin may not be supported or there's a network issue.`);

    } catch (error) {
      console.error(`❌ All strategies failed for ${coinId}\n`);
      throw error;
    }
  }
}

export const ohlcDataService = new OHLCDataService();

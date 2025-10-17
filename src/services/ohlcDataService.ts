// OHLC Data Service - Production-Grade Chart Data Fetching
// Solution: CryptoCompare API (reliable, generous free tier) + multiple fallbacks
import type { OHLCData, ChartData, ChartTimeframe, VolumeData } from '@/types/chart';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache

// CryptoCompare API - Reliable with generous free tier (100,000 calls/month)
const CRYPTOCOMPARE_API = 'https://min-api.cryptocompare.com/data';

// Comprehensive CoinGecko ID to CryptoCompare Symbol mapping (200+ coins)
// NOTE: Stablecoins (USDT, USDC, DAI, etc.) are excluded as they provide no value to users
const SYMBOL_MAP: Record<string, string> = {
  // Top 10
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'binancecoin': 'BNB',
  'solana': 'SOL',
  'ripple': 'XRP',
  'dogecoin': 'DOGE',
  'cardano': 'ADA',
  'tron': 'TRX',

  // Top 20
  'avalanche-2': 'AVAX',
  'shiba-inu': 'SHIB',
  'polkadot': 'DOT',
  'chainlink': 'LINK',
  'bitcoin-cash': 'BCH',
  'near-protocol': 'NEAR',
  'near': 'NEAR',
  'uniswap': 'UNI',
  'litecoin': 'LTC',
  'matic-network': 'MATIC',

  // Top 30
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

  // Top 50
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
  'multiversx-egld': 'EGLD',
  'theta-token': 'THETA',
  'theta': 'THETA',
  'axie-infinity': 'AXS',
  'eos': 'EOS',
  'tezos': 'XTZ',
  'the-sandbox': 'SAND',
  'decentraland': 'MANA',
  'neo': 'NEO',
  'fantom': 'FTM',

  // Top 70
  'kucoin-shares': 'KCS',
  'kucoin-token': 'KCS',
  'maker': 'MKR',
  'iota': 'IOTA',
  'miota': 'IOTA',
  'klaytn': 'KLAY',
  'thorchain': 'RUNE',
  'zcash': 'ZEC',
  'chiliz': 'CHZ',
  'pancakeswap-token': 'CAKE',
  'cake': 'CAKE',
  'stacks': 'STX',
  'immutable-x': 'IMX',
  'injective-protocol': 'INJ',
  'sei-network': 'SEI',
  'sui': 'SUI',
  'render-token': 'RNDR',
  'render': 'RNDR',
  'casper-network': 'CSPR',
  'gala': 'GALA',

  // Top 100
  'crypto-com-chain': 'CRO',
  'cronos': 'CRO',
  'bittorrent': 'BTT',
  'synthetix-network-token': 'SNX',
  'curve-dao-token': 'CRV',
  'compound-ether': 'CETH',
  'dash': 'DASH',
  'zilliqa': 'ZIL',
  'enjincoin': 'ENJ',
  'basic-attention-token': 'BAT',
  'bat': 'BAT',
  'decred': 'DCR',
  'waves': 'WAVES',
  'ravencoin': 'RVN',
  '0x': 'ZRX',
  'zrx': 'ZRX',
  'icon': 'ICX',
  'ontology': 'ONT',
  'qtum': 'QTUM',
  'sushi': 'SUSHI',
  'compound': 'COMP',

  // DeFi & Layer 2
  'lido-dao': 'LDO',
  'yearn-finance': 'YFI',
  'gmx': 'GMX',
  'blur': 'BLUR',
  'convex-finance': 'CVX',
  'rocket-pool': 'RPL',
  'frax-share': 'FXS',
  'balancer': 'BAL',
  '1inch': '1INCH',
  'loopring': 'LRC',
  'dydx': 'DYDX',
  'gnosis': 'GNO',
  'aerodrome-finance': 'AERO',

  // Meme & Community
  'pepe': 'PEPE',
  'floki': 'FLOKI',
  'bonk': 'BONK',
  'baby-doge-coin': 'BABYDOGE',
  'safemoon': 'SAFEMOON',
  'dogelon-mars': 'ELON',

  // Gaming & Metaverse
  'apecoin': 'APE',
  'ape': 'APE',
  'stepn': 'GMT',
  'illuvium': 'ILV',
  'aavegotchi': 'GHST',
  'smooth-love-potion': 'SLP',
  'enjin': 'ENJ',
  'ultra': 'UOS',
  'wax': 'WAXP',
  'my-neighbor-alice': 'ALICE',

  // AI & Data
  'fetch-ai': 'FET',
  'singularitynet': 'AGIX',
  'ocean-protocol': 'OCEAN',
  'numeraire': 'NMR',

  // Privacy
  'zcoin': 'FIRO',
  'firo': 'FIRO',
  'dash-2': 'DASH',
  'secret': 'SCRT',
  'oasis-network': 'ROSE',

  // Others
  'helium': 'HNT',
  'arweave': 'AR',
  'kusama': 'KSM',
  'mina-protocol': 'MINA',
  'celo': 'CELO',
  'harmony': 'ONE',
  'osmosis': 'OSMO',
  'kava': 'KAVA',
  'band-protocol': 'BAND',
  'uma': 'UMA',
  'livepeer': 'LPT',
  'ankr': 'ANKR',
  'nervos-network': 'CKB',
  'holo': 'HOT',
  'holochain': 'HOT',

  // Additional popular coins
  'wemix-token': 'WEMIX',
  'wemix': 'WEMIX',
  'nexo': 'NEXO',
  'trust-wallet-token': 'TWT',
  'twt': 'TWT',
  'huobi-token': 'HT',
  'bitdao': 'BIT',
  'olympus': 'OHM',
  'olympus-v2': 'OHM',
  'terra-luna-2': 'LUNA',
  'terra-luna': 'LUNC',
  'luna': 'LUNA',
  'celestia': 'TIA',
  'pyth-network': 'PYTH',
  'pendle': 'PENDLE',
  'worldcoin': 'WLD',
  'wld': 'WLD',
  'mantle': 'MNT',
  'celestia-tia': 'TIA',
  'starknet': 'STRK',
  'jito': 'JTO',
  'jupiter': 'JUP',
  'jupiter-exchange-solana': 'JUP',
  'wormhole': 'W',
  'dymension': 'DYM',
  'manta-network': 'MANTA',
  'altlayer': 'ALT',
  'ethena': 'ENA',
  'saga': 'SAGA',
  'omni-network': 'OMNI',
  'io': 'IO',
  'notcoin': 'NOT',
  'zksync': 'ZK',
  'hamster-kombat': 'HMSTR',
  'eigen': 'EIGEN',
  'dogs': 'DOGS',
  'catizen': 'CATI',
  'scroll': 'SCR',
  'memecoin': 'MEME',
  'goatseus-maximus': 'GOAT',
  'fartcoin': 'FART',
  'moo-deng': 'MOODENG',
  'peanut-the-squirrel': 'PNUT',
  'act-i-the-ai-prophecy': 'ACT',
  'hyperliquid': 'HYPE',
};

interface CachedData {
  data: ChartData;
  timestamp: number;
}

class OHLCDataService {
  private cache: Map<string, CachedData> = new Map();

  /**
   * Convert CoinGecko ID to crypto symbol with smart fallbacks
   */
  private getSymbol(coinGeckoId: string): string {
    // Try direct mapping first
    if (SYMBOL_MAP[coinGeckoId]) {
      return SYMBOL_MAP[coinGeckoId];
    }

    // Smart fallback: Convert coin ID to likely symbol
    // Examples: "bitcoin-cash" -> "BCH", "wrapped-bitcoin" -> "WBTC"
    const cleanId = coinGeckoId
      .replace(/^wrapped-/, 'W')
      .replace(/-token$/, '')
      .replace(/-coin$/, '')
      .replace(/-network$/, '')
      .replace(/-protocol$/, '')
      .replace(/-dao$/, '')
      .replace(/-finance$/, '');

    // Try common symbol patterns
    const symbolPatterns = [
      coinGeckoId.toUpperCase(), // Direct uppercase
      cleanId.toUpperCase(), // Cleaned uppercase
      coinGeckoId.split('-')[0].toUpperCase(), // First word
      coinGeckoId.replace(/-/g, '').toUpperCase(), // Remove dashes
    ];

    console.log(`⚠️  No mapping for "${coinGeckoId}", trying symbols:`, symbolPatterns);

    // Return the first pattern as best guess
    return symbolPatterns[0];
  }

  /**
   * Get CryptoCompare aggregate level based on days
   * Returns appropriate candle intervals for each timeframe
   */
  private getAggregateLevel(days: number | 'max'): { endpoint: string; limit: number; aggregate: number } {
    // CryptoCompare API limits: 2000 data points max per request

    if (days === 'max' || days >= 2000) {
      // ALL: Daily candles for maximum history
      return { endpoint: 'histoday', limit: 2000, aggregate: 1 };
    }

    if (days >= 365) {
      // 1Y/90D/180D: Daily candles
      return { endpoint: 'histoday', limit: Math.min(days, 2000), aggregate: 1 };
    }

    if (days >= 180) {
      // 180D: Daily candles
      return { endpoint: 'histoday', limit: Math.min(days, 2000), aggregate: 1 };
    }

    if (days >= 90) {
      // 90D: Daily candles
      return { endpoint: 'histoday', limit: Math.min(days, 2000), aggregate: 1 };
    }

    if (days >= 30) {
      // 30D: 6-hour candles (4 per day = 120 candles for 30 days)
      return { endpoint: 'histohour', limit: Math.min(days * 4, 2000), aggregate: 6 };
    }

    if (days >= 7) {
      // 7D: 2-hour candles (12 per day = 84 candles for 7 days)
      return { endpoint: 'histohour', limit: Math.min(days * 12, 2000), aggregate: 2 };
    }

    if (days >= 1) {
      // 1D/1H/4H: 1-hour candles (24 per day)
      return { endpoint: 'histohour', limit: Math.min(days * 24, 2000), aggregate: 1 };
    }

    // < 1 day: 15-minute candles
    return { endpoint: 'histominute', limit: 96, aggregate: 15 };
  }

  /**
   * Try fetching with a specific symbol with retry logic
   */
  private async tryFetchWithSymbol(
    symbol: string,
    endpoint: string,
    limit: number,
    aggregate: number,
    retries: number = 3
  ): Promise<any> {
    const url = `${CRYPTOCOMPARE_API}/${endpoint}?fsym=${symbol}&tsym=USD&limit=${limit}&aggregate=${aggregate}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`    [${symbol}] Attempt ${attempt}/${retries}: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.Response === 'Error') {
          throw new Error(result.Message || 'API error');
        }

        if (!result.Data || !Array.isArray(result.Data) || result.Data.length === 0) {
          throw new Error('No data returned from API');
        }

        console.log(`    [${symbol}] ✓ Success: ${result.Data.length} data points`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.log(`    [${symbol}] ✗ Attempt ${attempt} failed: ${lastError.message}`);

        // If this isn't the last attempt, wait before retrying with exponential backoff
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`    [${symbol}] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Fetch from CryptoCompare API (PRIMARY - Reliable and generous free tier)
   * WITH ROBUST SYMBOL FALLBACK for all 104 coins
   */
  async fetchFromCryptoCompare(coinGeckoId: string, days: number | 'max'): Promise<ChartData> {
    const cacheKey = `${coinGeckoId}-${days}-cryptocompare`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✓ Using cached CryptoCompare data for ${coinGeckoId}`);
      return cached.data;
    }

    const { endpoint, limit, aggregate } = this.getAggregateLevel(typeof days === 'number' ? days : 365);

    // Generate multiple symbol attempts
    const primarySymbol = this.getSymbol(coinGeckoId);

    // Alternative symbols to try if primary fails
    const symbolAttempts = [
      primarySymbol,
      coinGeckoId.toUpperCase(), // Direct uppercase
      coinGeckoId.split('-')[0].toUpperCase(), // First word only
      coinGeckoId.replace(/-/g, '').toUpperCase().slice(0, 5), // Remove dashes, max 5 chars
      coinGeckoId.split('-').map(w => w[0]).join('').toUpperCase(), // Acronym (e.g., "basic-attention-token" -> "BAT")
    ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

    console.log(`\n🔍 Fetching chart for: ${coinGeckoId}`);
    console.log(`📊 Timeframe: ${days} days | Endpoint: ${endpoint} | Limit: ${limit}`);
    console.log(`🎯 Symbol attempts: ${symbolAttempts.join(', ')}`);

    let allErrors: string[] = [];

    // Try each symbol until one works
    for (let i = 0; i < symbolAttempts.length; i++) {
      const symbol = symbolAttempts[i];

      try {
        console.log(`\n  🔹 Symbol attempt ${i + 1}/${symbolAttempts.length}: ${symbol}`);

        const result = await this.tryFetchWithSymbol(symbol, endpoint, limit, aggregate);

        // Convert CryptoCompare data to our OHLC format with volume
        const ohlcData: OHLCData[] = result.Data
          .filter((item: any) => item.close > 0) // Filter out invalid data points
          .map((item: any) => ({
            time: item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

        // Extract volume data
        const volumeData: VolumeData[] = result.Data
          .filter((item: any) => item.close > 0)
          .map((item: any) => ({
            time: item.time,
            value: item.volumefrom || 0,
            color: item.close >= item.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }));

        console.log(`  ✅ SUCCESS with "${symbol}": ${ohlcData.length} candles, ${volumeData.length} volume points\n`);

        const chartData: ChartData = {
          ohlc: ohlcData,
          volume: volumeData,
          lastUpdate: Date.now(),
        };

        this.cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
        return chartData;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        allErrors.push(`${symbol}: ${errorMsg}`);
        console.log(`  ❌ Failed with "${symbol}": ${errorMsg}`);

        // If this was the last attempt, throw detailed error
        if (i === symbolAttempts.length - 1) {
          const detailedError = `Unable to fetch chart data for "${coinGeckoId}".\n\nTried ${symbolAttempts.length} symbols: ${symbolAttempts.join(', ')}\n\nErrors:\n${allErrors.join('\n')}`;
          console.error(`\n❌ ALL ATTEMPTS FAILED for ${coinGeckoId}\n${detailedError}\n`);
          throw new Error(detailedError);
        }
        // Otherwise continue to next symbol attempt
      }
    }

    throw new Error(`All symbol attempts exhausted for ${coinGeckoId}`);
  }

  /**
   * Map timeframe to API days parameter
   * Fetches appropriate historical depth for each timeframe
   */
  getApiDays(timeframe: ChartTimeframe): number | 'max' {
    const mapping: Record<ChartTimeframe, number | 'max'> = {
      '1H': 1,      // 1 day with 1-hour candles
      '4H': 7,      // 7 days with 2-hour candles
      '1D': 30,     // 30 days with 2-hour candles
      '7D': 90,     // 90 days with 6-hour candles
      '30D': 180,   // 180 days with 12-hour candles
      '90D': 365,   // 1 year with daily candles
      '180D': 730,  // 2 years with daily candles
      '1Y': 365,    // 1 year with daily candles
      'ALL': 2000,  // Maximum available (~5+ years with daily candles)
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

/**
 * Intelligence Hub Service
 * Unified data aggregation engine combining all 19 IgniteX services
 * Provides consolidated crypto intelligence with smart caching and parallel fetching
 */

import { cryptoDataService } from './cryptoDataService';
import { enrichedCryptoDataService } from './enhancedCryptoDataService';
import { ohlcDataService } from './ohlcDataService';
import { onChainDataService } from './onChainDataService';
import { fundingRateService } from './fundingRateService';
import { marketIndicesService } from './marketIndicesService';
import { binanceOrderBookService } from './binanceOrderBookService';
import type { OrderBookData } from './orderBookService';

/**
 * Unified intelligence data structure combining all data sources
 */
export interface UnifiedIntelligenceData {
  symbol: string;
  timestamp: number;

  // Market Data (CoinGecko)
  marketData: {
    price: number;
    marketCap: number;
    volume24h: number;
    priceChange24h: number;
    priceChangePercentage24h: number;
    circulatingSupply: number;
    totalSupply: number;
    maxSupply: number | null;
    ath: number;
    athChangePercentage: number;
    atl: number;
    atlChangePercentage: number;
  } | null;

  // OHLC Data (CryptoCompare)
  ohlcData: {
    timeframe: string;
    candles: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  } | null;

  // On-Chain Data (Blockchain.com, Etherscan)
  onChainData: {
    activeAddresses?: number;
    transactionCount?: number;
    hashRate?: number;
    difficulty?: number;
    networkValue?: number;
    gasPrice?: number;
    blockTime?: number;
  } | null;

  // Funding Rates (Binance)
  fundingRate: {
    rate: number;
    nextFundingTime: number;
    markPrice: number;
  } | null;

  // Order Book Data (Binance)
  orderBook: OrderBookData | null;

  // Market Indices (Alternative.me)
  marketSentiment: {
    fearGreedIndex: number;
    fearGreedClassification: string;
    bitcoinDominance: number;
    marketTrend: string;
  } | null;

  // Data Quality Score
  dataQuality: {
    score: number; // 0-100
    availableSources: string[];
    missingSources: string[];
    lastUpdated: number;
  };
}

/**
 * Intelligence fetch options
 */
export interface IntelligenceFetchOptions {
  symbol: string;
  includeOHLC?: boolean;
  ohlcTimeframe?: '1h' | '4h' | '1d';
  includeOnChain?: boolean;
  includeOrderBook?: boolean;
  orderBookLimit?: number;
  includeFundingRate?: boolean;
  includeMarketSentiment?: boolean;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: UnifiedIntelligenceData;
  timestamp: number;
  expiresAt: number;
}

class IntelligenceHub {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<UnifiedIntelligenceData>> = new Map();
  private readonly CACHE_DURATION_MS = 60000; // 1 minute cache

  /**
   * Fetch unified intelligence data for a cryptocurrency
   */
  async fetchIntelligence(options: IntelligenceFetchOptions): Promise<UnifiedIntelligenceData> {
    const {
      symbol,
      includeOHLC = true,
      ohlcTimeframe = '4h',
      includeOnChain = true,
      includeOrderBook = true,
      orderBookLimit = 20,
      includeFundingRate = true,
      includeMarketSentiment = true
    } = options;

    const cacheKey = this.getCacheKey(options);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Deduplicate concurrent requests
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create new aggregation request
    const request = this.aggregateIntelligence(options);
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION_MS
      });

      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Aggregate intelligence from all sources in parallel
   */
  private async aggregateIntelligence(options: IntelligenceFetchOptions): Promise<UnifiedIntelligenceData> {
    const {
      symbol,
      includeOHLC,
      ohlcTimeframe,
      includeOnChain,
      includeOrderBook,
      orderBookLimit,
      includeFundingRate,
      includeMarketSentiment
    } = options;

    const startTime = Date.now();
    const availableSources: string[] = [];
    const missingSources: string[] = [];

    // Fetch all data sources in parallel
    const [
      marketDataResult,
      ohlcDataResult,
      onChainDataResult,
      fundingRateResult,
      orderBookResult,
      marketSentimentResult
    ] = await Promise.allSettled([
      // Market Data (CoinGecko) - Always fetch
      this.fetchMarketData(symbol),

      // OHLC Data (CryptoCompare) - Optional
      includeOHLC ? this.fetchOHLCData(symbol, ohlcTimeframe!) : Promise.resolve(null),

      // On-Chain Data - Optional
      includeOnChain ? this.fetchOnChainData(symbol) : Promise.resolve(null),

      // Funding Rate (Binance) - Optional
      includeFundingRate ? this.fetchFundingRate(symbol) : Promise.resolve(null),

      // Order Book (Binance) - Optional
      includeOrderBook ? this.fetchOrderBook(symbol, orderBookLimit!) : Promise.resolve(null),

      // Market Sentiment - Optional
      includeMarketSentiment ? this.fetchMarketSentiment() : Promise.resolve(null)
    ]);

    // Process results and track quality
    const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : null;
    if (marketData) availableSources.push('market_data'); else missingSources.push('market_data');

    const ohlcData = ohlcDataResult.status === 'fulfilled' ? ohlcDataResult.value : null;
    if (ohlcData && includeOHLC) availableSources.push('ohlc_data');
    else if (includeOHLC) missingSources.push('ohlc_data');

    const onChainData = onChainDataResult.status === 'fulfilled' ? onChainDataResult.value : null;
    if (onChainData && includeOnChain) availableSources.push('onchain_data');
    else if (includeOnChain) missingSources.push('onchain_data');

    const fundingRate = fundingRateResult.status === 'fulfilled' ? fundingRateResult.value : null;
    if (fundingRate && includeFundingRate) availableSources.push('funding_rate');
    else if (includeFundingRate) missingSources.push('funding_rate');

    const orderBook = orderBookResult.status === 'fulfilled' ? orderBookResult.value : null;
    if (orderBook && includeOrderBook) availableSources.push('order_book');
    else if (includeOrderBook) missingSources.push('order_book');

    const marketSentiment = marketSentimentResult.status === 'fulfilled' ? marketSentimentResult.value : null;
    if (marketSentiment && includeMarketSentiment) availableSources.push('market_sentiment');
    else if (includeMarketSentiment) missingSources.push('market_sentiment');

    // Calculate data quality score (0-100)
    const totalSources = availableSources.length + missingSources.length;
    const dataQualityScore = totalSources > 0 ? (availableSources.length / totalSources) * 100 : 0;

    return {
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
      marketData,
      ohlcData,
      onChainData,
      fundingRate,
      orderBook,
      marketSentiment,
      dataQuality: {
        score: Math.round(dataQualityScore),
        availableSources,
        missingSources,
        lastUpdated: Date.now()
      }
    };
  }

  /**
   * Fetch market data from CoinGecko
   */
  private async fetchMarketData(symbol: string) {
    try {
      const coinId = this.getCoinGeckoId(symbol);
      const details = await cryptoDataService.getCryptoDetails(coinId);

      if (!details) return null;

      return {
        price: details.market_data?.current_price?.usd || 0,
        marketCap: details.market_data?.market_cap?.usd || 0,
        volume24h: details.market_data?.total_volume?.usd || 0,
        priceChange24h: details.market_data?.price_change_24h || 0,
        priceChangePercentage24h: details.market_data?.price_change_percentage_24h || 0,
        circulatingSupply: details.market_data?.circulating_supply || 0,
        totalSupply: details.market_data?.total_supply || 0,
        maxSupply: details.market_data?.max_supply || null,
        ath: details.market_data?.ath?.usd || 0,
        athChangePercentage: details.market_data?.ath_change_percentage?.usd || 0,
        atl: details.market_data?.atl?.usd || 0,
        atlChangePercentage: details.market_data?.atl_change_percentage?.usd || 0
      };
    } catch (error) {
      console.error(`Failed to fetch market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch OHLC data from CryptoCompare
   */
  private async fetchOHLCData(symbol: string, timeframe: string) {
    try {
      const data = await ohlcDataService.fetchOHLC(symbol, timeframe);
      if (!data || data.length === 0) return null;

      return {
        timeframe,
        candles: data.map(candle => ({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volumefrom || 0
        }))
      };
    } catch (error) {
      console.error(`Failed to fetch OHLC data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch on-chain data
   */
  private async fetchOnChainData(symbol: string) {
    try {
      const normalizedSymbol = symbol.toUpperCase();

      if (normalizedSymbol === 'BTC') {
        const data = await onChainDataService.fetchBitcoinOnChainData();
        return data || null;
      } else if (normalizedSymbol === 'ETH') {
        const data = await onChainDataService.fetchEthereumOnChainData();
        return data || null;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch on-chain data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch funding rate from Binance
   */
  private async fetchFundingRate(symbol: string) {
    try {
      const data = await fundingRateService.fetchFundingRate(symbol);
      if (!data) return null;

      return {
        rate: data.fundingRate,
        nextFundingTime: data.nextFundingTime,
        markPrice: data.markPrice
      };
    } catch (error) {
      console.error(`Failed to fetch funding rate for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch order book from Binance
   */
  private async fetchOrderBook(symbol: string, limit: number) {
    try {
      const data = await binanceOrderBookService.fetchOrderBook(symbol, limit);
      return data || null;
    } catch (error) {
      console.error(`Failed to fetch order book for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch market sentiment data
   */
  private async fetchMarketSentiment() {
    try {
      const indices = await marketIndicesService.fetchMarketIndices();
      if (!indices) return null;

      return {
        fearGreedIndex: indices.fearGreedIndex?.value || 50,
        fearGreedClassification: indices.fearGreedIndex?.valueClassification || 'Neutral',
        bitcoinDominance: indices.bitcoinDominance || 0,
        marketTrend: indices.trend || 'neutral'
      };
    } catch (error) {
      console.error('Failed to fetch market sentiment:', error);
      return null;
    }
  }

  /**
   * Get CoinGecko ID from symbol
   */
  private getCoinGeckoId(symbol: string): string {
    const symbolMap: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      SOL: 'solana',
      XRP: 'ripple',
      ADA: 'cardano',
      AVAX: 'avalanche-2',
      DOT: 'polkadot',
      MATIC: 'matic-network',
      LINK: 'chainlink',
      UNI: 'uniswap',
      ATOM: 'cosmos',
      LTC: 'litecoin',
      ETC: 'ethereum-classic',
      XLM: 'stellar',
      ALGO: 'algorand',
      VET: 'vechain',
      ICP: 'internet-computer',
      FIL: 'filecoin',
      HBAR: 'hedera-hashgraph'
    };

    return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Generate cache key from options
   */
  private getCacheKey(options: IntelligenceFetchOptions): string {
    const {
      symbol,
      includeOHLC,
      ohlcTimeframe,
      includeOnChain,
      includeOrderBook,
      orderBookLimit,
      includeFundingRate,
      includeMarketSentiment
    } = options;

    return `${symbol}-${includeOHLC}-${ohlcTimeframe}-${includeOnChain}-${includeOrderBook}-${orderBookLimit}-${includeFundingRate}-${includeMarketSentiment}`;
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache(cacheKey: string): UnifiedIntelligenceData | null {
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Fetch intelligence for multiple symbols in parallel
   */
  async fetchMultipleIntelligence(
    symbols: string[],
    options: Omit<IntelligenceFetchOptions, 'symbol'> = {}
  ): Promise<UnifiedIntelligenceData[]> {
    const requests = symbols.map(symbol =>
      this.fetchIntelligence({ ...options, symbol })
    );

    const results = await Promise.allSettled(requests);

    return results
      .filter((result): result is PromiseFulfilledResult<UnifiedIntelligenceData> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Clear cache for specific symbol or all
   */
  clearCache(symbol?: string) {
    if (symbol) {
      const symbolUpper = symbol.toUpperCase();
      for (const key of this.cache.keys()) {
        if (key.startsWith(symbolUpper)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, entry]) => now < entry.expiresAt).length,
      expiredEntries: entries.filter(([_, entry]) => now >= entry.expiresAt).length,
      symbols: [...new Set(entries.map(([key]) => key.split('-')[0]))],
      oldestEntry: Math.min(...entries.map(([_, entry]) => entry.timestamp)),
      newestEntry: Math.max(...entries.map(([_, entry]) => entry.timestamp))
    };
  }
}

// Export singleton instance
export const intelligenceHub = new IntelligenceHub();

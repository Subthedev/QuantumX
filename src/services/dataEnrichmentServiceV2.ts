/**
 * DATA ENRICHMENT SERVICE V2
 * Production-grade data pipeline with comprehensive data aggregation
 *
 * Features:
 * - Multi-exchange data aggregation with fallbacks
 * - Real-time order book depth analysis
 * - Funding rate aggregation from multiple sources
 * - On-chain data integration
 * - Market phase detection
 * - Smart money divergence calculation
 * - Advanced technical indicators with OHLC bootstrapping
 * - Data quality scoring and validation
 * - Persistent 24-hour statistics
 */

import { multiExchangeAggregatorV2 } from './dataStreams/multiExchangeAggregatorV2';
import { multiExchangeAggregatorV4 } from './dataStreams/multiExchangeAggregatorV4';
import { directDataIntegration } from './directDataIntegration';
import { ohlcDataManager } from './ohlcDataManager';
import { marketPhaseDetector } from './marketPhaseDetector';
import { fundingRateService } from './fundingRateService';
import { onChainDataService } from './onChainDataService';
import { intelligenceHub } from './intelligenceHub';
import type { CanonicalTicker } from './dataStreams/canonicalDataTypes';
// import type { MarketDataInput } from './smartMoneySignalEngine';
import type { MarketPhase } from './marketPhaseDetector';

type MarketDataInput = any; // Type placeholder

interface EnrichmentStats {
  totalEnrichments: number;
  avgEnrichmentTime: number;
  dataCompleteness: number;
  cachingEfficiency: number;
  errorRate: number;
  lastUpdate: number;
}

interface DataQualityScore {
  overall: number; // 0-100
  ticker: number;
  orderBook: number;
  fundingRates: number;
  onChain: number;
  technical: number;
  sentiment: number;
  sources: number; // Number of active data sources
}

export class DataEnrichmentServiceV2 {
  private priceHistory: Map<string, number[]> = new Map();
  private enrichmentCache: Map<string, CachedEnrichment> = new Map();
  private stats: EnrichmentStats;
  private readonly STATS_KEY = 'igx-enrichment-stats-v2';
  private readonly CACHE_TTL = 3000; // 3 second cache for enriched data
  private readonly PRICE_HISTORY_SIZE = 200; // Keep more history for better indicators
  private readonly MIN_PRICE_HISTORY = 14; // Minimum for RSI calculation

  // Advanced caching layers
  private fearGreedCache: { value: number; timestamp: number } | null = null;
  private fundingRateCache: Map<string, { rates: any; timestamp: number }> = new Map();
  private onChainCache: Map<string, { data: any; timestamp: number }> = new Map();
  private orderBookCache: Map<string, { data: any; timestamp: number }> = new Map();

  // Cache TTLs for different data types
  private readonly FEAR_GREED_TTL = 300000; // 5 minutes
  private readonly FUNDING_RATE_TTL = 60000; // 1 minute
  private readonly ON_CHAIN_TTL = 120000; // 2 minutes
  private readonly ORDER_BOOK_TTL = 5000; // 5 seconds

  constructor() {
    this.stats = this.loadStats();
    this.bootstrapPriceHistory();
  }

  /**
   * Main enrichment method - provides ALL data required by strategies
   */
  async enrichMarketData(ticker: CanonicalTicker): Promise<MarketDataInput> {
    const startTime = Date.now();
    const symbol = ticker.symbol;

    try {
      // Update price history
      this.updatePriceHistory(symbol, ticker.price);

      // Check cache first
      const cached = this.getCachedEnrichment(symbol);
      if (cached) {
        this.updateStats(Date.now() - startTime, true);
        return cached;
      }

      // Parallel data fetching for speed
      const [
        orderBookData,
        fundingRates,
        onChainData,
        fearGreed,
        marketPhase,
        ohlcData
      ] = await Promise.all([
        this.fetchOrderBookData(symbol, ticker),
        this.fetchFundingRates(symbol),
        this.fetchOnChainData(symbol),
        this.getFearGreedIndex(),
        this.detectMarketPhase(symbol, ticker),
        this.getOHLCData(symbol)
      ]);

      // Calculate technical indicators with OHLC bootstrapping
      const technicalData = this.calculateAdvancedTechnicals(symbol, ticker, ohlcData);

      // Calculate smart money divergence
      const smartMoneyDivergence = this.calculateSmartMoneyDivergence(
        onChainData,
        orderBookData,
        fearGreed,
        marketPhase
      );

      // Build comprehensive enriched data
      const enrichedData: MarketDataInput = {
        // Core ticker data (always available from multi-exchange aggregator)
        symbol,
        price: ticker.price,
        volume24h: ticker.volume24h,
        priceChange24h: ticker.priceChange24h,
        priceChangePercent24h: ticker.priceChangePercent24h,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        timestamp: ticker.timestamp,

        // OHLC data (critical for pattern strategies)
        ohlcData,

        // Market data with guaranteed current_price
        marketData: {
          current_price: ticker.price, // Always populated
          priceChangePercentage24h: ticker.priceChangePercent24h,
          marketCap: onChainData.marketCap || 0,
          totalVolume: ticker.volume24h,
          circulatingSupply: onChainData.circulatingSupply || 0,
          maxSupply: onChainData.maxSupply || 0
        },

        // Order book data (comprehensive with depth analysis)
        orderBookData: {
          bidAskImbalance: orderBookData.bidAskImbalance,
          buyPressure: orderBookData.buyPressure, // CRITICAL: Required by 5+ strategies
          bidAskRatio: orderBookData.bidAskRatio, // CRITICAL: Required by ORDER_FLOW_TSUNAMI
          spread: orderBookData.spread,
          spreadPercent: orderBookData.spreadPercent,
          bidVolume: orderBookData.bidVolume,
          askVolume: orderBookData.askVolume,
          largeOrders: orderBookData.largeOrders || [],
          depth: orderBookData.depth || { bids: [], asks: [] }
        },

        // Funding rates (aggregated from multiple exchanges)
        fundingRates,

        // On-chain data (exchange flows, smart money metrics)
        onChainData: {
          exchangeFlowRatio: onChainData.exchangeFlowRatio,
          smartMoneyDivergence, // Enhanced calculation
          activeAddresses: onChainData.activeAddresses,
          largeTransactions: onChainData.largeTransactions || 0,
          whaleAccumulation: onChainData.whaleAccumulation || 0,
          retailActivity: onChainData.retailActivity || 0
        },

        // Technical indicators (comprehensive set)
        technicalData,

        // Sentiment data
        sentimentData: {
          fearGreedIndex: fearGreed,
          socialVolume: this.estimateSocialVolume(ticker),
          redditSentiment: 0.5, // TODO: Integrate Reddit API
          twitterSentiment: 0.5, // TODO: Integrate Twitter API
          newsScore: 0.5 // TODO: Integrate news sentiment
        },

        // Market phase (CRITICAL for MARKET_PHASE_SNIPER strategy)
        marketPhase,

        // Data quality metrics
        dataQuality: this.calculateDataQuality(
          ticker,
          orderBookData,
          fundingRates,
          onChainData,
          technicalData
        )
      };

      // Cache the enriched data
      this.cacheEnrichment(symbol, enrichedData);

      // Update statistics
      this.updateStats(Date.now() - startTime, false);

      // Emit enrichment event
      this.emitEnrichmentEvent(symbol, enrichedData);

      return enrichedData;

    } catch (error) {
      console.error(`[EnrichmentV2] Error enriching data for ${symbol}:`, error);

      // Return minimal viable data on error
      return this.createFallbackData(ticker);
    }
  }

  /**
   * Fetch comprehensive order book data with depth analysis
   */
  private async fetchOrderBookData(symbol: string, ticker: CanonicalTicker): Promise<any> {
    // Check cache first
    const cached = this.orderBookCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.ORDER_BOOK_TTL) {
      return cached.data;
    }

    // ✅ CRITICAL FIX: V4 aggregator doesn't have getOrderBookDepth() method!
    // Go directly to Binance order book service (guaranteed real data)
    try {
      const directData = await directDataIntegration.getOrderBookDirect(symbol);

      if (directData.sources > 0) {
        console.log(`[EnrichmentV2] ✅ Order book data fetched directly from Binance for ${symbol}`);

        return {
          buyPressure: directData.buyPressure,
          bidAskRatio: directData.bidAskRatio,
          bidAskImbalance: this.calculateBidAskImbalance(ticker),
          spread: directData.spread,
          spreadPercent: directData.spreadPercent,
          bidVolume: directData.bidVolume,
          askVolume: directData.askVolume,
          totalVolume: directData.bidVolume + directData.askVolume,
          largeOrders: [],
          depth: directData.depth,
          sources: directData.sources,
          timestamp: Date.now()
        };
      }
    } catch (directError) {
      console.error(`[EnrichmentV2] ❌ Direct fallback also failed:`, directError);
    }

    // Final fallback to ticker-based calculations
    console.log(`[EnrichmentV2] ⚠️ Using ticker-based calculations for ${symbol} order book`);
    return {
      buyPressure: this.calculateBuyPressure(ticker),
      bidAskRatio: this.calculateBidAskRatio(ticker),
      bidAskImbalance: this.calculateBidAskImbalance(ticker),
      spread: ticker.ask - ticker.bid,
      spreadPercent: ticker.bid ? ((ticker.ask - ticker.bid) / ticker.bid) * 100 : 0,
      bidVolume: 0,
      askVolume: 0,
      totalVolume: 0,
      largeOrders: [],
      depth: { bids: [], asks: [] },
      sources: 1,
      timestamp: Date.now()
    };
  }

  /**
   * Fetch funding rates from multiple exchanges
   */
  private async fetchFundingRates(symbol: string): Promise<any> {
    // Check cache first
    const cached = this.fundingRateCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.FUNDING_RATE_TTL) {
      return cached.rates;
    }

    // ✅ CRITICAL FIX: V4 aggregator doesn't have getFundingRates() method!
    // Go directly to funding rate service (guaranteed real data)
    try {
      const directRates = await directDataIntegration.getFundingRatesDirect(symbol);

      if (directRates.sources > 0) {
        console.log(`[EnrichmentV2] ✅ Funding rate fetched directly from Binance for ${symbol}: ${(directRates.average * 100).toFixed(4)}%`);

        this.fundingRateCache.set(symbol, { rates: directRates, timestamp: Date.now() });
        return directRates;
      }
    } catch (directError) {
      console.error(`[EnrichmentV2] ❌ Direct fallback also failed:`, directError);
    }

    // Final fallback to default rates
    console.log(`[EnrichmentV2] ⚠️ Using default funding rates for ${symbol}`);
    return {
      binance: 0,
      bybit: 0,
      okx: 0,
      average: 0,
      sources: 0
    };
  }

  /**
   * Fetch on-chain data with multiple provider fallbacks
   */
  private async fetchOnChainData(symbol: string): Promise<any> {
    // Check cache first
    const cached = this.onChainCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.ON_CHAIN_TTL) {
      return cached.data;
    }

    try {
      // Try primary on-chain service
      const exchangeFlow = await onChainDataService.getExchangeFlowRatio(symbol);
      const smartMoneyFlow = 0; // Legacy method removed

      // Try intelligence hub for additional data (optional, not critical)
      let intelligenceData: any = null;
      try {
        intelligenceData = await intelligenceHub.fetchIntelligence({ symbol });
      } catch (error) {
        // Intelligence hub data is optional, continue without it
      }

      const data = {
        exchangeFlowRatio: exchangeFlow || intelligenceData?.onChain?.exchangeFlowRatio || 0,
        smartMoneyFlow: smartMoneyFlow || 0,
        activeAddresses: intelligenceData?.onChain?.activeAddresses || 0,
        largeTransactions: intelligenceData?.onChain?.largeTransactions || 0,
        whaleAccumulation: this.estimateWhaleAccumulation(exchangeFlow),
        retailActivity: this.estimateRetailActivity(intelligenceData),
        marketCap: intelligenceData?.marketData?.marketCap || 0,
        circulatingSupply: intelligenceData?.marketData?.circulatingSupply || 0,
        maxSupply: intelligenceData?.marketData?.maxSupply || 0
      };

      // Cache the data
      this.onChainCache.set(symbol, { data, timestamp: Date.now() });

      return data;

    } catch (error) {
      console.warn(`[EnrichmentV2] Error fetching on-chain data for ${symbol}:`, error);
    }

    // Return default on-chain data
    return {
      exchangeFlowRatio: 0,
      smartMoneyFlow: 0,
      activeAddresses: 0,
      largeTransactions: 0,
      whaleAccumulation: 0,
      retailActivity: 0.5,
      marketCap: 0,
      circulatingSupply: 0,
      maxSupply: 0
    };
  }

  /**
   * Get Fear & Greed Index with caching
   */
  private async getFearGreedIndex(): Promise<number> {
    const now = Date.now();

    // Return cached value if recent
    if (this.fearGreedCache && now - this.fearGreedCache.timestamp < this.FEAR_GREED_TTL) {
      return this.fearGreedCache.value;
    }

    try {
      // Primary source: Alternative.me Fear & Greed Index
      const response = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await response.json();

      if (data.data && data.data[0]) {
        const value = parseInt(data.data[0].value);
        this.fearGreedCache = { value, timestamp: now };
        return value;
      }
    } catch (error) {
      console.warn('[EnrichmentV2] Fear & Greed API error, trying fallback');
    }

    // Fallback: Calculate from market metrics
    return this.calculateFearGreedFromMarket();
  }

  /**
   * Detect market phase using advanced analysis
   */
  private async detectMarketPhase(symbol: string, ticker: CanonicalTicker): Promise<MarketPhase> {
    try {
      // Get current fear & greed index
      const fearGreed = await this.getFearGreedIndex();

      // Get exchange flow ratio
      const onChainData = await this.fetchOnChainData(symbol);
      const exchangeFlowRatio = onChainData.exchangeFlowRatio;

      // Get funding rate
      const fundingRates = await this.fetchFundingRates(symbol);
      const avgFundingRate = fundingRates.average || 0;

      // Get order book imbalance
      const orderBookData = await this.fetchOrderBookData(symbol, ticker);
      const orderBookImbalance = orderBookData.bidAskRatio;

      // ✅ FIX: Calculate priceVolatility (required by PhaseIndicators)
      // Use 24h price change as volatility proxy
      const priceVolatility = Math.abs(ticker.priceChangePercent24h || 0);

      // ✅ FIX: Determine volumeTrend (required by PhaseIndicators)
      // If we don't have historical volume, use 'stable' as default
      const volumeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

      // ✅ CRITICAL FIX: marketPhaseDetector.detectPhase() expects a SINGLE object parameter
      // NOT 5 separate parameters!
      const phaseIndicators = {
        fearGreedIndex: fearGreed,
        exchangeFlowRatio: exchangeFlowRatio,
        fundingRate: avgFundingRate,
        priceVolatility: priceVolatility,
        volumeTrend: volumeTrend,
        priceMomentum: ticker.priceChangePercent24h || 0,
        orderBookImbalance: orderBookImbalance
      };

      // ✅ CRITICAL FIX: Method returns PhaseDetectionResult object, not just the phase string
      // Must access .phase property from the result
      const phaseResult = marketPhaseDetector.detectPhase(phaseIndicators);

      console.log(
        `[EnrichmentV2] 📊 Market Phase Detection: ${phaseResult.phase} ` +
        `(${phaseResult.confidence}% confidence) | ${symbol}`
      );

      return phaseResult.phase;

    } catch (error) {
      console.warn(`[EnrichmentV2] Error detecting market phase:`, error);
      return 'ACCUMULATION' as MarketPhase; // Default to ACCUMULATION (safer than NORMAL)
    }
  }

  /**
   * Get OHLC data with fallback to generation from price history
   */
  private async getOHLCData(symbol: string): Promise<any> {
    // ✅ CRITICAL FIX: Convert ticker symbol to CoinGecko ID
    // OHLC Manager is keyed by CoinGecko IDs (bitcoin, ethereum, etc.)
    // But we receive ticker symbols (BTCUSDT, ETHUSDT, etc.)
    const coinGeckoId = this.symbolToCoinGeckoId(symbol);

    console.log(`[EnrichmentV2] 🔍 OHLC lookup: ${symbol} → ${coinGeckoId}`);

    // Try to get from OHLC manager first
    const ohlcData = ohlcDataManager.getDataset(coinGeckoId);

    if (ohlcData && ohlcData.candles && ohlcData.candles.length > 0) {
      console.log(`[EnrichmentV2] ✅ Found ${ohlcData.candles.length} OHLC candles for ${coinGeckoId}`);
      return ohlcData;
    }

    // ✅ INSTITUTIONAL-GRADE: NO SYNTHETIC DATA - Reject if no real OHLC
    console.log(`[EnrichmentV2] ❌ NO REAL OHLC DATA for ${symbol} (${coinGeckoId}) - Signal will be rejected`);
    console.warn(`[EnrichmentV2] ⚠️ QUALITY ALERT: ${symbol} missing real OHLC candles from Binance`);

    // Return empty dataset
    return {
      symbol,
      candles: [],
      lastUpdate: Date.now(),
      interval: '15m'
    };
  }

  /**
   * Convert ticker symbol to CoinGecko ID
   * Maps Binance-style symbols (BTCUSDT) to CoinGecko IDs (bitcoin)
   */
  private symbolToCoinGeckoId(symbol: string): string {
    // Remove USDT suffix if present
    const baseSymbol = symbol.replace(/USDT$/, '').toUpperCase();

    // Mapping from ticker symbols to CoinGecko IDs
    const mappings: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'ATOM': 'cosmos',
      'UNI': 'uniswap',
      'DOGE': 'dogecoin',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'ETC': 'ethereum-classic',
      'XLM': 'stellar',
      'XMR': 'monero',
      'FIL': 'filecoin',
      'TRX': 'tron',
      'VET': 'vechain',
      'ALGO': 'algorand',
      'XTZ': 'tezos',
      'APT': 'aptos',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'NEAR': 'near',
      'IMX': 'immutable-x',
      'GRT': 'the-graph',
      'FTM': 'fantom',
      'AAVE': 'aave',
      'MKR': 'maker',
      'CRV': 'curve-dao-token',
      'SNX': 'synthetix-network-token',
      'COMP': 'compound-governance-token',
      'SUSHI': 'sushi',
      'MANA': 'decentraland',
      'SAND': 'the-sandbox',
      'AXS': 'axie-infinity',
      'GALA': 'gala',
      'ENJ': 'enjincoin',
      'FLOW': 'flow',
      'BAT': 'basic-attention-token',
      'ZIL': 'zilliqa',
      'IOTA': 'iota',
      'NEO': 'neo',
      'QTUM': 'qtum',
      'WAVES': 'waves',
      'ZRX': '0x',
      'OMG': 'omisego',
      'BNT': 'bancor',
      'LRC': 'loopring',
      'RNDR': 'render-token',
      'INJ': 'injective-protocol'
    };

    // Return mapped ID or fallback to lowercase symbol
    return mappings[baseSymbol] || symbol.toLowerCase();
  }

  /**
   * Calculate advanced technical indicators with OHLC bootstrapping
   */
  private calculateAdvancedTechnicals(symbol: string, ticker: CanonicalTicker, ohlcData: any): any {
    const prices = this.priceHistory.get(symbol) || [];

    // Bootstrap from OHLC if price history is insufficient
    if (prices.length < this.MIN_PRICE_HISTORY && ohlcData?.candles?.length > 0) {
      this.bootstrapPriceHistoryFromOHLC(symbol, ohlcData.candles);
    }

    const updatedPrices = this.priceHistory.get(symbol) || [];

    if (updatedPrices.length < this.MIN_PRICE_HISTORY) {
      // Return neutral indicators if insufficient data
      return this.getNeutralTechnicals(ticker.price);
    }

    // Calculate comprehensive technical indicators
    const rsi = this.calculateRSI(updatedPrices, 14);
    const macd = this.calculateMACD(updatedPrices);
    const ema20 = this.calculateEMA(updatedPrices, 20);
    const ema50 = this.calculateEMA(updatedPrices, 50);
    const ema200 = this.calculateEMA(updatedPrices, 200);
    const bollingerBands = this.calculateBollingerBands(updatedPrices, 20);
    const atr = this.calculateATR(ohlcData?.candles || [], 14);
    const stochastic = this.calculateStochastic(updatedPrices, 14);
    const obv = this.calculateOBV(ohlcData?.candles || []);

    return {
      rsi,
      macd,
      ema20,
      ema50,
      ema200,
      bollingerBands,
      atr,
      stochastic,
      obv,
      sma20: this.calculateSMA(updatedPrices, 20),
      sma50: this.calculateSMA(updatedPrices, 50),
      momentum: this.calculateMomentum(updatedPrices, 10),
      roc: this.calculateROC(updatedPrices, 10)
    };
  }

  /**
   * Calculate smart money divergence
   */
  private calculateSmartMoneyDivergence(
    onChainData: any,
    orderBookData: any,
    fearGreed: number,
    marketPhase: MarketPhase
  ): number {
    // Smart money divergence occurs when:
    // 1. Fear + Accumulation (negative exchange flow) = Bullish divergence
    // 2. Greed + Distribution (positive exchange flow) = Bearish divergence

    const exchangeFlow = onChainData.exchangeFlowRatio || 0;
    const buyPressure = orderBookData.buyPressure || 50;

    // Calculate divergence score (-100 to +100)
    let divergence = 0;

    // Bullish divergence: Fear + Accumulation
    if (fearGreed < 30 && exchangeFlow < -1.0 && buyPressure > 55) {
      divergence = Math.min(100, (30 - fearGreed) * 2 + Math.abs(exchangeFlow) * 20);
    }
    // Bearish divergence: Greed + Distribution
    else if (fearGreed > 70 && exchangeFlow > 1.0 && buyPressure < 45) {
      divergence = Math.max(-100, -(fearGreed - 70) * 2 - exchangeFlow * 20);
    }
    // Moderate divergences
    else if (fearGreed < 45 && exchangeFlow < 0) {
      divergence = Math.min(50, (45 - fearGreed) + Math.abs(exchangeFlow) * 10);
    }
    else if (fearGreed > 55 && exchangeFlow > 0) {
      divergence = Math.max(-50, -(fearGreed - 55) - exchangeFlow * 10);
    }

    // Adjust for market phase
    if (marketPhase === 'ACCUMULATION' && divergence > 0) {
      divergence *= 1.2; // Amplify bullish divergence in accumulation
    } else if (marketPhase === 'DISTRIBUTION' && divergence < 0) {
      divergence *= 1.2; // Amplify bearish divergence in distribution
    }

    return Math.max(-100, Math.min(100, divergence));
  }

  /**
   * Bootstrap price history from OHLC candles
   */
  private bootstrapPriceHistoryFromOHLC(symbol: string, candles: any[]) {
    if (!candles || candles.length === 0) return;

    const prices: number[] = [];

    // Use close prices from candles
    for (const candle of candles.slice(-this.PRICE_HISTORY_SIZE)) {
      if (candle.close) {
        prices.push(candle.close);
      }
    }

    // Update price history
    if (prices.length > 0) {
      const existing = this.priceHistory.get(symbol) || [];
      const combined = [...prices, ...existing].slice(-this.PRICE_HISTORY_SIZE);
      this.priceHistory.set(symbol, combined);

      console.log(`[EnrichmentV2] Bootstrapped ${prices.length} prices for ${symbol} from OHLC`);
    }
  }

  /**
   * Bootstrap price history on initialization
   */
  private async bootstrapPriceHistory() {
    // This will be called on startup to pre-populate price history
    console.log('[EnrichmentV2] Bootstrapping price history from OHLC data...');

    const symbols = ['bitcoin', 'ethereum', 'solana']; // Add more as needed

    for (const symbol of symbols) {
      const ohlcData = ohlcDataManager.getDataset(symbol);
      if (ohlcData?.candles?.length > 0) {
        this.bootstrapPriceHistoryFromOHLC(symbol, ohlcData.candles);
      }
    }
  }

  /**
   * Calculate buy pressure from ticker
   */
  private calculateBuyPressure(ticker: CanonicalTicker): number {
    if (!ticker.bid || !ticker.ask || ticker.bid === 0 || ticker.ask === 0) {
      return 50.0; // Neutral
    }

    const bidAskRatio = ticker.bid / ticker.ask;
    const buyPressure = (bidAskRatio / (bidAskRatio + 1)) * 100;

    return Math.max(0, Math.min(100, buyPressure));
  }

  /**
   * Calculate bid/ask ratio
   */
  private calculateBidAskRatio(ticker: CanonicalTicker): number {
    if (!ticker.bid || !ticker.ask || ticker.bid === 0 || ticker.ask === 0) {
      return 1.0; // Neutral
    }

    return ticker.bid / ticker.ask;
  }

  /**
   * Calculate bid/ask imbalance
   */
  private calculateBidAskImbalance(ticker: CanonicalTicker): number {
    if (!ticker.bid || !ticker.ask || ticker.bid === 0 || ticker.ask === 0) {
      return 1.0; // Neutral
    }

    const spread = ticker.ask - ticker.bid;
    const midpoint = (ticker.ask + ticker.bid) / 2;
    const spreadPercent = (spread / midpoint) * 100;

    return Math.max(0.5, Math.min(2.0, 1.0 + (spreadPercent * 0.1)));
  }

  /**
   * Detect large orders in order book
   */
  private detectLargeOrders(orderBook: any): any[] {
    const largeOrders = [];

    if (!orderBook || (!orderBook.bids && !orderBook.asks)) {
      return largeOrders;
    }

    // Calculate average order size
    const allOrders = [...(orderBook.bids || []), ...(orderBook.asks || [])];
    const avgSize = allOrders.reduce((sum, [price, volume]) => sum + volume, 0) / allOrders.length;

    // Detect orders > 3x average
    for (const [price, volume] of (orderBook.bids || [])) {
      if (volume > avgSize * 3) {
        largeOrders.push({ side: 'buy', price, volume, ratio: volume / avgSize });
      }
    }

    for (const [price, volume] of (orderBook.asks || [])) {
      if (volume > avgSize * 3) {
        largeOrders.push({ side: 'sell', price, volume, ratio: volume / avgSize });
      }
    }

    return largeOrders.slice(0, 10); // Top 10 large orders
  }

  /**
   * Calculate Fear & Greed from market metrics
   */
  private calculateFearGreedFromMarket(): number {
    // Simple calculation based on available market data
    // This is a fallback when API is unavailable

    // TODO: Implement proper calculation based on:
    // - Volatility
    // - Market momentum
    // - Volume
    // - Social sentiment
    // - Dominance

    return 50; // Neutral default
  }

  /**
   * Estimate whale accumulation
   */
  private estimateWhaleAccumulation(exchangeFlow: number): number {
    // Negative flow = accumulation (coins leaving exchanges)
    // Positive flow = distribution (coins entering exchanges)

    if (exchangeFlow < -2.0) return 0.9; // Heavy accumulation
    if (exchangeFlow < -1.0) return 0.7; // Moderate accumulation
    if (exchangeFlow < -0.5) return 0.6; // Light accumulation
    if (exchangeFlow > 2.0) return 0.1; // Heavy distribution
    if (exchangeFlow > 1.0) return 0.3; // Moderate distribution
    if (exchangeFlow > 0.5) return 0.4; // Light distribution

    return 0.5; // Neutral
  }

  /**
   * Estimate retail activity
   */
  private estimateRetailActivity(intelligenceData: any): number {
    // Use social volume and small transaction metrics as proxy

    const socialVolume = intelligenceData.socialData?.volume || 50;
    const smallTx = intelligenceData.onChain?.smallTransactions || 0.5;

    return (socialVolume / 100 + smallTx) / 2;
  }

  /**
   * Estimate social volume from ticker data
   */
  private estimateSocialVolume(ticker: CanonicalTicker): number {
    // Higher volume and volatility = more social attention
    const normalized = Math.min(ticker.volume24h / 1e9, 100);
    const volatility = Math.abs(ticker.priceChangePercent24h);

    return Math.round((normalized + volatility) / 2);
  }

  // ... [Technical indicator calculations - RSI, MACD, EMA, etc.]
  // (These remain the same as in the original service)

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 10) / 10;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return Math.round(ema * 100) / 100;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.9;
    const histogram = macdLine - signalLine;

    return {
      value: Math.round(macdLine * 100) / 100,
      signal: Math.round(signalLine * 100) / 100,
      histogram: Math.round(histogram * 100) / 100
    };
  }

  private calculateBollingerBands(prices: number[], period: number = 20) {
    if (prices.length < period) {
      const price = prices[prices.length - 1];
      return {
        upper: price * 1.02,
        middle: price,
        lower: price * 0.98
      };
    }

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, p) => sum + p, 0) / period;
    const squaredDiffs = recentPrices.map(p => Math.pow(p - sma, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2)
    };
  }

  private calculateATR(candles: any[], period: number = 14): number {
    if (!candles || candles.length < period + 1) return 0;

    const trueRanges = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return 0;

    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
  }

  private calculateStochastic(prices: number[], period: number = 14): any {
    if (prices.length < period) {
      return { k: 50, d: 50 };
    }

    const recentPrices = prices.slice(-period);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);
    const current = prices[prices.length - 1];

    const k = ((current - low) / (high - low)) * 100;
    const d = k * 0.9; // Simplified

    return {
      k: Math.round(k * 10) / 10,
      d: Math.round(d * 10) / 10
    };
  }

  private calculateOBV(candles: any[]): number {
    if (!candles || candles.length === 0) return 0;

    let obv = 0;

    for (let i = 1; i < candles.length; i++) {
      if (candles[i].close > candles[i - 1].close) {
        obv += candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        obv -= candles[i].volume;
      }
    }

    return obv;
  }

  private calculateMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period + 1) return 0;

    const current = prices[prices.length - 1];
    const past = prices[prices.length - period - 1];

    return ((current - past) / past) * 100;
  }

  private calculateROC(prices: number[], period: number = 10): number {
    return this.calculateMomentum(prices, period); // Same calculation
  }

  /**
   * Get neutral technical indicators
   */
  private getNeutralTechnicals(currentPrice: number): any {
    return {
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      ema20: currentPrice,
      ema50: currentPrice,
      ema200: currentPrice,
      bollingerBands: {
        upper: currentPrice * 1.02,
        middle: currentPrice,
        lower: currentPrice * 0.98
      },
      atr: 0,
      stochastic: { k: 50, d: 50 },
      obv: 0,
      sma20: currentPrice,
      sma50: currentPrice,
      momentum: 0,
      roc: 0
    };
  }

  // ✅ REMOVED: generateSyntheticOHLC() - Institutional-grade systems use REAL DATA ONLY
  // Synthetic OHLC with volume=0 is unreliable for quant strategies
  // If no real OHLC available, signal is rejected (fail-safe approach)

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(
    ticker: any,
    orderBook: any,
    fundingRates: any,
    onChain: any,
    technical: any
  ): DataQualityScore {
    let overall = 0;
    let count = 0;

    // Ticker quality (always high from multi-exchange)
    const tickerQuality = ticker.bid && ticker.ask ? 100 : 80;
    overall += tickerQuality;
    count++;

    // Order book quality
    const orderBookQuality = orderBook.depth?.bids?.length > 0 ? 90 : 50;
    overall += orderBookQuality;
    count++;

    // Funding rates quality
    const fundingQuality = fundingRates.sources > 0 ? 80 : 30;
    overall += fundingQuality;
    count++;

    // On-chain quality
    const onChainQuality = onChain.exchangeFlowRatio !== 0 ? 70 : 40;
    overall += onChainQuality;
    count++;

    // Technical quality
    const techQuality = technical.rsi !== 50 ? 85 : 60;
    overall += techQuality;
    count++;

    // Sentiment quality (basic for now)
    const sentimentQuality = 60;
    overall += sentimentQuality;
    count++;

    // Get active source count (using V4)
    const sources = multiExchangeAggregatorV4.getStats().connectedExchanges;

    return {
      overall: Math.round(overall / count),
      ticker: tickerQuality,
      orderBook: orderBookQuality,
      fundingRates: fundingQuality,
      onChain: onChainQuality,
      technical: techQuality,
      sentiment: sentimentQuality,
      sources
    };
  }

  /**
   * Create fallback data on error
   */
  private createFallbackData(ticker: CanonicalTicker): MarketDataInput {
    return {
      symbol: ticker.symbol,
      price: ticker.price,
      volume24h: ticker.volume24h,
      priceChange24h: ticker.priceChange24h,
      priceChangePercent24h: ticker.priceChangePercent24h,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      timestamp: ticker.timestamp,

      ohlcData: {
        symbol: ticker.symbol,
        candles: [],
        lastUpdate: Date.now(),
        interval: '15m'
      },

      marketData: {
        current_price: ticker.price,
        priceChangePercentage24h: ticker.priceChangePercent24h,
        marketCap: 0,
        totalVolume: ticker.volume24h,
        circulatingSupply: 0,
        maxSupply: 0
      },

      orderBookData: {
        bidAskImbalance: 1.0,
        buyPressure: 50,
        bidAskRatio: 1.0,
        spread: ticker.ask - ticker.bid,
        spreadPercent: 0,
        bidVolume: 0,
        askVolume: 0,
        largeOrders: [],
        depth: { bids: [], asks: [] }
      },

      fundingRates: {
        binance: 0,
        bybit: 0,
        okx: 0,
        average: 0,
        sources: 0
      },

      onChainData: {
        exchangeFlowRatio: 0,
        smartMoneyDivergence: 0,
        activeAddresses: 0,
        largeTransactions: 0,
        whaleAccumulation: 0,
        retailActivity: 0.5
      },

      technicalData: this.getNeutralTechnicals(ticker.price),

      sentimentData: {
        fearGreedIndex: 50,
        socialVolume: 50,
        redditSentiment: 0.5,
        twitterSentiment: 0.5,
        newsScore: 0.5
      },

      marketPhase: 'NORMAL' as MarketPhase,

      dataQuality: {
        overall: 30,
        ticker: 80,
        orderBook: 20,
        fundingRates: 20,
        onChain: 20,
        technical: 30,
        sentiment: 30,
        sources: 1
      }
    };
  }

  /**
   * Update price history
   */
  private updatePriceHistory(symbol: string, price: number) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol)!;
    history.push(price);

    if (history.length > this.PRICE_HISTORY_SIZE) {
      history.shift();
    }
  }

  /**
   * Cache enriched data
   */
  private cacheEnrichment(symbol: string, data: MarketDataInput) {
    this.enrichmentCache.set(symbol, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old cache entries
    setTimeout(() => {
      this.enrichmentCache.delete(symbol);
    }, this.CACHE_TTL);
  }

  /**
   * Get cached enrichment
   */
  private getCachedEnrichment(symbol: string): MarketDataInput | null {
    const cached = this.enrichmentCache.get(symbol);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    return null;
  }

  /**
   * Load statistics from localStorage
   */
  private loadStats(): EnrichmentStats {
    if (typeof window === 'undefined') {
      return this.createFreshStats();
    }

    try {
      const saved = localStorage.getItem(this.STATS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[EnrichmentV2] Error loading stats:', error);
    }

    return this.createFreshStats();
  }

  /**
   * Create fresh statistics
   */
  private createFreshStats(): EnrichmentStats {
    return {
      totalEnrichments: 0,
      avgEnrichmentTime: 0,
      dataCompleteness: 0,
      cachingEfficiency: 0,
      errorRate: 0,
      lastUpdate: Date.now()
    };
  }

  /**
   * Update statistics
   */
  private updateStats(enrichmentTime: number, fromCache: boolean) {
    this.stats.totalEnrichments++;

    // Update average enrichment time (EMA)
    this.stats.avgEnrichmentTime =
      (this.stats.avgEnrichmentTime * 0.95) + (enrichmentTime * 0.05);

    // Update caching efficiency
    if (fromCache) {
      this.stats.cachingEfficiency =
        (this.stats.cachingEfficiency * 0.99) + 0.01;
    } else {
      this.stats.cachingEfficiency =
        (this.stats.cachingEfficiency * 0.99);
    }

    this.stats.lastUpdate = Date.now();

    // Save stats periodically
    if (this.stats.totalEnrichments % 100 === 0) {
      this.saveStats();
    }
  }

  /**
   * Save statistics to localStorage
   */
  private saveStats() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('[EnrichmentV2] Error saving stats:', error);
    }
  }

  /**
   * Emit enrichment event
   */
  private emitEnrichmentEvent(symbol: string, data: MarketDataInput) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-data-enriched', {
        detail: {
          symbol,
          dataQuality: data.dataQuality,
          timestamp: Date.now()
        }
      }));
    }
  }

  /**
   * Get current statistics
   */
  getStats(): EnrichmentStats {
    return {
      ...this.stats,
      dataCompleteness: this.calculateDataCompleteness(),
      errorRate: this.calculateErrorRate()
    };
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateDataCompleteness(): number {
    // Check how many data sources are providing data (using V4)
    const pipelineStats = multiExchangeAggregatorV4.getStats();
    const completeness = (pipelineStats.connectedExchanges / pipelineStats.activeConnections) * 100;

    return Math.round(completeness);
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const pipelineStats = multiExchangeAggregatorV4.getStats();

    if (pipelineStats.totalDataPoints === 0) return 0;

    return (pipelineStats.totalErrors / pipelineStats.totalDataPoints) * 100;
  }
}

// Cached enrichment interface
interface CachedEnrichment {
  data: MarketDataInput;
  timestamp: number;
}

// Singleton instance
export const dataEnrichmentServiceV2 = new DataEnrichmentServiceV2();
/**
 * DIRECT DATA INTEGRATION SERVICE
 *
 * Provides direct fallback access to individual data services when aggregator fails.
 * This ensures strategies ALWAYS get some data, even if aggregator has issues.
 *
 * Architecture:
 * - Primary: multiExchangeAggregatorV4 (comprehensive multi-source)
 * - Fallback: Direct service calls (single-source, guaranteed data)
 *
 * Services Integrated:
 * - binanceOrderBookService (order book depth)
 * - fundingRateService (funding rates from Binance)
 * - onChainDataService (exchange flows from Etherscan/Solscan)
 * - etfDataService (Bitcoin ETF flows)
 */

import { binanceOrderBookService } from './binanceOrderBookService';
import { fundingRateService } from './fundingRateService';
import { onChainDataService } from './onChainDataService';
import { etfDataService } from './etfDataService';

interface DirectOrderBookData {
  bidVolume: number;
  askVolume: number;
  bidAskRatio: number;
  buyPressure: number;
  spread: number;
  spreadPercent: number;
  depth: {
    bids: [number, number][];
    asks: [number, number][];
  };
  sources: number;
}

interface DirectFundingRates {
  binance: number;
  bybit: number;
  okx: number;
  average: number;
  sources: number;
}

interface DirectOnChainData {
  exchangeFlowRatio: number;
  smartMoneyFlow: number;
  activeAddresses: number;
  largeTransactions: number;
  whaleAccumulation: number;
  retailActivity: number;
}

interface DirectETFData {
  netFlow: number;
  totalAUM: number;
  dailyVolume: number;
  institutionalDemand: number;
}

class DirectDataIntegrationService {
  private readonly CACHE_TTL = 30000; // 30 seconds for direct calls

  // Caches
  private orderBookCache: Map<string, { data: DirectOrderBookData; timestamp: number }> = new Map();
  private fundingCache: Map<string, { data: DirectFundingRates; timestamp: number }> = new Map();
  private onChainCache: Map<string, { data: DirectOnChainData; timestamp: number }> = new Map();
  private etfCache: { data: DirectETFData; timestamp: number } | null = null;

  /**
   * Get order book data directly from Binance service
   * Fallback when aggregator fails
   */
  async getOrderBookDirect(symbol: string): Promise<DirectOrderBookData> {
    // Check cache
    const cached = this.orderBookCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      console.log(`[DirectData] 📊 Fetching order book directly from Binance for ${symbol}`);

      // ✅ FIX: binanceOrderBookService expects base coin only (TRX, not TRXUSDT)
      // And the method is called fetchOrderBook, not getOrderBookDepth
      const baseCoin = symbol.replace(/USDT$/i, '');
      const orderBook = await binanceOrderBookService.fetchOrderBook(baseCoin, 20);

      if (orderBook && orderBook.bids && orderBook.asks && orderBook.bids.length > 0) {
        // ✅ FIX: binanceOrderBookService returns {price, quantity, total} objects, not [price, quantity] tuples
        const bidVolume = orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
        const askVolume = orderBook.asks.reduce((sum, ask) => sum + ask.quantity, 0);
        const bidAskRatio = bidVolume && askVolume ? bidVolume / askVolume : 1.0;
        const buyPressure = (bidAskRatio / (bidAskRatio + 1)) * 100;

        const bestBid = orderBook.bids[0]?.price || 0;
        const bestAsk = orderBook.asks[0]?.price || 0;
        const spread = bestAsk - bestBid;
        const spreadPercent = bestBid ? (spread / bestBid) * 100 : 0;

        // Convert to [price, quantity] tuple format for compatibility
        const bidsAsTuples: [number, number][] = orderBook.bids.slice(0, 20).map(b => [b.price, b.quantity]);
        const asksAsTuples: [number, number][] = orderBook.asks.slice(0, 20).map(a => [a.price, a.quantity]);

        const data: DirectOrderBookData = {
          bidVolume,
          askVolume,
          bidAskRatio,
          buyPressure,
          spread,
          spreadPercent,
          depth: {
            bids: bidsAsTuples,
            asks: asksAsTuples
          },
          sources: 1 // Single source (Binance)
        };

        // Cache the data
        this.orderBookCache.set(symbol, { data, timestamp: Date.now() });

        console.log(`[DirectData] ✅ Order book fetched: Buy Pressure ${buyPressure.toFixed(1)}%, Spread ${spreadPercent.toFixed(3)}%`);

        return data;
      }
    } catch (error) {
      console.error(`[DirectData] ❌ Order book fetch failed for ${symbol}:`, error);
    }

    // Return neutral defaults on failure
    return this.getNeutralOrderBook();
  }

  /**
   * Get funding rates directly from funding rate service
   * Fallback when aggregator fails
   */
  async getFundingRatesDirect(symbol: string): Promise<DirectFundingRates> {
    // Check cache
    const cached = this.fundingCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      console.log(`[DirectData] 💰 Fetching funding rates directly from Binance for ${symbol}`);

      // ✅ FIX: fundingRateService.fetchFundingRate() adds "USDT" to the symbol
      // So we need to pass just the base coin (TRX, not TRXUSDT)
      const baseCoin = symbol.replace(/USDT$/i, '');

      const fundingData = await fundingRateService.fetchFundingRate(baseCoin);

      if (fundingData && fundingData.fundingRate !== undefined) {
        const data: DirectFundingRates = {
          binance: fundingData.fundingRate,
          bybit: 0, // Direct service only has Binance
          okx: 0,   // Direct service only has Binance
          average: fundingData.fundingRate,
          sources: 1
        };

        // Cache the data
        this.fundingCache.set(symbol, { data, timestamp: Date.now() });

        console.log(`[DirectData] ✅ Funding rate fetched: ${(fundingData.fundingRate * 100).toFixed(4)}%`);

        return data;
      }
    } catch (error) {
      console.error(`[DirectData] ❌ Funding rate fetch failed for ${symbol}:`, error);
    }

    // Return neutral defaults on failure
    return {
      binance: 0,
      bybit: 0,
      okx: 0,
      average: 0,
      sources: 0
    };
  }

  /**
   * Get on-chain data directly from on-chain service
   * Fallback when aggregator fails
   */
  async getOnChainDataDirect(symbol: string): Promise<DirectOnChainData> {
    // Check cache
    const cached = this.onChainCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      console.log(`[DirectData] ⛓️ Fetching on-chain data directly for ${symbol}`);

      const [exchangeFlow, smartMoneyFlow] = await Promise.all([
        onChainDataService.getExchangeFlowRatio(symbol),
        onChainDataService.getSmartMoneyFlow ?
          onChainDataService.getSmartMoneyFlow(symbol) :
          Promise.resolve(0)
      ]);

      // Estimate whale accumulation from exchange flow
      const whaleAccumulation = this.estimateWhaleAccumulation(exchangeFlow);

      const data: DirectOnChainData = {
        exchangeFlowRatio: exchangeFlow,
        smartMoneyFlow: smartMoneyFlow || 0,
        activeAddresses: 0, // Not available from direct service
        largeTransactions: 0, // Not available from direct service
        whaleAccumulation,
        retailActivity: 0.5 // Neutral default
      };

      // Cache the data
      this.onChainCache.set(symbol, { data, timestamp: Date.now() });

      console.log(`[DirectData] ✅ On-chain data fetched: Exchange Flow ${exchangeFlow.toFixed(2)}`);

      return data;
    } catch (error) {
      console.error(`[DirectData] ❌ On-chain data fetch failed for ${symbol}:`, error);
    }

    // Return neutral defaults on failure
    return {
      exchangeFlowRatio: 0,
      smartMoneyFlow: 0,
      activeAddresses: 0,
      largeTransactions: 0,
      whaleAccumulation: 0.5,
      retailActivity: 0.5
    };
  }

  /**
   * Get ETF flow data directly (Bitcoin only)
   */
  async getETFDataDirect(): Promise<DirectETFData> {
    // Check cache
    if (this.etfCache && Date.now() - this.etfCache.timestamp < this.CACHE_TTL) {
      return this.etfCache.data;
    }

    try {
      console.log(`[DirectData] 🏦 Fetching ETF data directly`);

      const etfData = null; // Legacy method - ETF data disabled

      if (etfData) {
        const data: DirectETFData = {
          netFlow: etfData.netFlow || 0,
          totalAUM: etfData.totalAUM || 0,
          dailyVolume: etfData.dailyVolume || 0,
          institutionalDemand: this.calculateInstitutionalDemand(etfData.netFlow)
        };

        // Cache the data
        this.etfCache = { data, timestamp: Date.now() };

        console.log(`[DirectData] ✅ ETF data fetched: Net Flow $${(etfData.netFlow / 1e6).toFixed(1)}M`);

        return data;
      }
    } catch (error) {
      console.error(`[DirectData] ❌ ETF data fetch failed:`, error);
    }

    // Return neutral defaults on failure
    return {
      netFlow: 0,
      totalAUM: 0,
      dailyVolume: 0,
      institutionalDemand: 0.5
    };
  }

  /**
   * Normalize funding rate symbol format
   * Fixes bug: BNBUSDTUSDT → BNBUSDT
   */
  private normalizeFundingSymbol(symbol: string): string {
    // Remove USDT suffix if present, then add it back
    const baseSymbol = symbol.replace(/USDT$/i, '').toUpperCase();
    return `${baseSymbol}USDT`;
  }

  /**
   * Estimate whale accumulation from exchange flow
   */
  private estimateWhaleAccumulation(exchangeFlow: number): number {
    if (exchangeFlow < -2.0) return 0.9; // Heavy accumulation
    if (exchangeFlow < -1.0) return 0.7; // Moderate accumulation
    if (exchangeFlow < -0.5) return 0.6; // Light accumulation
    if (exchangeFlow > 2.0) return 0.1;  // Heavy distribution
    if (exchangeFlow > 1.0) return 0.3;  // Moderate distribution
    if (exchangeFlow > 0.5) return 0.4;  // Light distribution
    return 0.5; // Neutral
  }

  /**
   * Calculate institutional demand from ETF flows
   */
  private calculateInstitutionalDemand(netFlow: number): number {
    // Net flow in millions
    const flowMillion = netFlow / 1e6;

    if (flowMillion > 500) return 0.95;  // Very high demand
    if (flowMillion > 200) return 0.85;  // High demand
    if (flowMillion > 50) return 0.70;   // Moderate demand
    if (flowMillion > 0) return 0.60;    // Slight demand
    if (flowMillion > -50) return 0.40;  // Slight selling
    if (flowMillion > -200) return 0.30; // Moderate selling
    return 0.15; // Heavy selling
  }

  /**
   * Get neutral order book data (fallback)
   */
  private getNeutralOrderBook(): DirectOrderBookData {
    return {
      bidVolume: 0,
      askVolume: 0,
      bidAskRatio: 1.0,
      buyPressure: 50,
      spread: 0,
      spreadPercent: 0,
      depth: { bids: [], asks: [] },
      sources: 0
    };
  }

  /**
   * Check if services are healthy
   */
  async healthCheck(): Promise<{
    orderBook: boolean;
    funding: boolean;
    onChain: boolean;
    etf: boolean;
  }> {
    const results = await Promise.allSettled([
      this.getOrderBookDirect('BTCUSDT'),
      this.getFundingRatesDirect('BTCUSDT'),
      this.getOnChainDataDirect('bitcoin'),
      this.getETFDataDirect()
    ]);

    return {
      orderBook: results[0].status === 'fulfilled' && results[0].value.sources > 0,
      funding: results[1].status === 'fulfilled' && results[1].value.sources > 0,
      onChain: results[2].status === 'fulfilled' && results[2].value.exchangeFlowRatio !== 0,
      etf: results[3].status === 'fulfilled' && results[3].value.netFlow !== 0
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.orderBookCache.clear();
    this.fundingCache.clear();
    this.onChainCache.clear();
    this.etfCache = null;
    console.log('[DirectData] 🧹 Cache cleared');
  }
}

// Singleton instance
export const directDataIntegration = new DirectDataIntegrationService();

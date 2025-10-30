/**
 * Exchange Manager
 * Coordinates multiple exchange adapters and provides unified access
 */

import { binanceAdapter } from './BinanceAdapter';
import { coinbaseAdapter } from './CoinbaseAdapter';
import { bybitAdapter } from './BybitAdapter';
import {
  ExchangeAdapter,
  OrderBookData,
  FundingRateData,
  ExchangeComparison,
  ArbitrageOpportunity,
  ExchangeInfo
} from './types';

class ExchangeManager {
  private adapters: Map<string, ExchangeAdapter> = new Map();

  constructor() {
    // Register all available adapters
    this.registerAdapter(binanceAdapter);
    this.registerAdapter(coinbaseAdapter);
    this.registerAdapter(bybitAdapter);
  }

  /**
   * Register an exchange adapter
   */
  private registerAdapter(adapter: ExchangeAdapter): void {
    this.adapters.set(adapter.exchangeId, adapter);
    console.log(`✅ Registered exchange adapter: ${adapter.exchangeName}`);
  }

  /**
   * Get adapter by exchange ID
   */
  getAdapter(exchangeId: string): ExchangeAdapter | undefined {
    return this.adapters.get(exchangeId);
  }

  /**
   * Get all registered exchanges
   */
  getExchanges(): ExchangeInfo[] {
    return Array.from(this.adapters.values()).map(adapter => ({
      id: adapter.exchangeId,
      name: adapter.exchangeName,
      logo: `/exchanges/${adapter.exchangeId}.svg`,
      supported: true,
      features: {
        orderBook: true,
        fundingRates: adapter.exchangeId !== 'coinbase', // Coinbase is spot-only
        websocket: adapter.exchangeId === 'binance' // Only Binance has WebSocket for now
      }
    }));
  }

  /**
   * Fetch order book from specific exchange
   */
  async getOrderBook(exchangeId: string, symbol: string): Promise<OrderBookData> {
    const adapter = this.getAdapter(exchangeId);
    if (!adapter) {
      throw new Error(`Exchange ${exchangeId} not supported`);
    }

    return adapter.getOrderBook(symbol);
  }

  /**
   * Fetch funding rate from specific exchange
   */
  async getFundingRate(exchangeId: string, symbol: string): Promise<FundingRateData> {
    const adapter = this.getAdapter(exchangeId);
    if (!adapter) {
      throw new Error(`Exchange ${exchangeId} not supported`);
    }

    return adapter.getFundingRate(symbol);
  }

  /**
   * Compare order books across multiple exchanges
   */
  async compareOrderBooks(symbol: string, exchangeIds?: string[]): Promise<ExchangeComparison> {
    const targetExchanges = exchangeIds || Array.from(this.adapters.keys());

    const results = await Promise.allSettled(
      targetExchanges.map(async (exchangeId) => {
        const adapter = this.adapters.get(exchangeId);
        if (!adapter) {
          return {
            exchangeId,
            exchangeName: exchangeId,
            available: false,
            error: 'Adapter not found'
          };
        }

        try {
          const orderBook = await adapter.getOrderBook(symbol);
          return {
            exchangeId: adapter.exchangeId,
            exchangeName: adapter.exchangeName,
            orderBook,
            available: true
          };
        } catch (error: any) {
          return {
            exchangeId: adapter.exchangeId,
            exchangeName: adapter.exchangeName,
            available: false,
            error: error.message
          };
        }
      })
    );

    return {
      symbol,
      timestamp: Date.now(),
      exchanges: results.map(result =>
        result.status === 'fulfilled' ? result.value : {
          exchangeId: 'unknown',
          exchangeName: 'Unknown',
          available: false,
          error: 'Request failed'
        }
      )
    };
  }

  /**
   * Compare funding rates across multiple exchanges
   */
  async compareFundingRates(symbol: string, exchangeIds?: string[]): Promise<ExchangeComparison> {
    const targetExchanges = exchangeIds || Array.from(this.adapters.keys())
      .filter(id => id !== 'coinbase'); // Exclude Coinbase (spot-only)

    const results = await Promise.allSettled(
      targetExchanges.map(async (exchangeId) => {
        const adapter = this.adapters.get(exchangeId);
        if (!adapter) {
          return {
            exchangeId,
            exchangeName: exchangeId,
            available: false,
            error: 'Adapter not found'
          };
        }

        try {
          const fundingRate = await adapter.getFundingRate(symbol);
          return {
            exchangeId: adapter.exchangeId,
            exchangeName: adapter.exchangeName,
            fundingRate,
            available: true
          };
        } catch (error: any) {
          return {
            exchangeId: adapter.exchangeId,
            exchangeName: adapter.exchangeName,
            available: false,
            error: error.message
          };
        }
      })
    );

    return {
      symbol,
      timestamp: Date.now(),
      exchanges: results.map(result =>
        result.status === 'fulfilled' ? result.value : {
          exchangeId: 'unknown',
          exchangeName: 'Unknown',
          available: false,
          error: 'Request failed'
        }
      )
    };
  }

  /**
   * Find funding rate arbitrage opportunities
   */
  async findArbitrageOpportunities(symbol: string): Promise<ArbitrageOpportunity[]> {
    const comparison = await this.compareFundingRates(symbol);

    const availableRates = comparison.exchanges
      .filter(ex => ex.available && ex.fundingRate)
      .map(ex => ({
        exchangeId: ex.exchangeId,
        exchangeName: ex.exchangeName,
        rate: ex.fundingRate!.fundingRate
      }))
      .sort((a, b) => a.rate - b.rate); // Sort by rate ascending

    const opportunities: ArbitrageOpportunity[] = [];

    // Find opportunities (long on lowest rate, short on highest rate)
    for (let i = 0; i < availableRates.length; i++) {
      for (let j = i + 1; j < availableRates.length; j++) {
        const longEx = availableRates[i];
        const shortEx = availableRates[j];
        const netGain = shortEx.rate - longEx.rate;

        // Only include if net gain > 0.01% (worthwhile opportunity)
        if (netGain > 0.01) {
          // Annualized return: funding every 8 hours = 3x per day = ~1095x per year
          const annualizedReturn = netGain * 3 * 365;

          // Confidence based on spread size
          const confidence = Math.min(100, (netGain / 0.1) * 100);

          opportunities.push({
            symbol,
            type: 'funding',
            longExchange: longEx.exchangeName,
            shortExchange: shortEx.exchangeName,
            longRate: longEx.rate,
            shortRate: shortEx.rate,
            netGain,
            annualizedReturn,
            confidence,
            timestamp: Date.now()
          });
        }
      }
    }

    // Sort by net gain descending
    return opportunities.sort((a, b) => b.netGain - a.netGain);
  }

  /**
   * Get best price across exchanges (for price arbitrage)
   */
  async getBestPrices(symbol: string): Promise<{
    bestBid: { exchange: string; price: number };
    bestAsk: { exchange: string; price: number };
    spreadArbitrage: number;
  } | null> {
    const comparison = await this.compareOrderBooks(symbol);

    const availablePrices = comparison.exchanges
      .filter(ex => ex.available && ex.orderBook)
      .map(ex => ({
        exchangeName: ex.exchangeName,
        bestBid: ex.orderBook!.bids[0]?.price || 0,
        bestAsk: ex.orderBook!.asks[0]?.price || 0
      }));

    if (availablePrices.length < 2) {
      return null;
    }

    // Find highest bid and lowest ask
    const bestBid = availablePrices.reduce((best, curr) =>
      curr.bestBid > best.bestBid ? curr : best
    );

    const bestAsk = availablePrices.reduce((best, curr) =>
      curr.bestAsk < best.bestAsk ? curr : best
    );

    // Arbitrage exists if you can buy on one exchange cheaper than you can sell on another
    const spreadArbitrage = bestBid.bestBid - bestAsk.bestAsk;

    return {
      bestBid: { exchange: bestBid.exchangeName, price: bestBid.bestBid },
      bestAsk: { exchange: bestAsk.exchangeName, price: bestAsk.bestAsk },
      spreadArbitrage
    };
  }
}

// Singleton instance
export const exchangeManager = new ExchangeManager();

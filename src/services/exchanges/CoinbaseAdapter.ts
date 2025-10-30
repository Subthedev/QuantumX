/**
 * Coinbase Exchange Adapter
 * Implements unified exchange interface for Coinbase Advanced Trade
 */

import {
  ExchangeAdapter,
  OrderBookData,
  FundingRateData,
  OrderBookLevel,
  OrderBookMetrics
} from './types';

export class CoinbaseAdapter implements ExchangeAdapter {
  readonly exchangeId = 'coinbase';
  readonly exchangeName = 'Coinbase';

  private readonly API_BASE = 'https://api.exchange.coinbase.com';
  private readonly PRODUCT_API = 'https://api.coinbase.com/api/v3/brokerage';

  /**
   * Fetch order book from Coinbase
   */
  async getOrderBook(symbol: string): Promise<OrderBookData> {
    try {
      const productId = this.normalizeSymbol(symbol);
      const response = await fetch(
        `${this.API_BASE}/products/${productId}/book?level=2`
      );

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Coinbase format to our unified format
      const bids: OrderBookLevel[] = data.bids.slice(0, 15).map((bid: string[], index: number) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1]),
        total: data.bids.slice(0, index + 1).reduce((sum: number, b: string[]) => sum + parseFloat(b[1]), 0)
      }));

      const asks: OrderBookLevel[] = data.asks.slice(0, 15).map((ask: string[], index: number) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1]),
        total: data.asks.slice(0, index + 1).reduce((sum: number, a: string[]) => sum + parseFloat(a[1]), 0)
      }));

      const metrics = this.calculateMetrics(bids, asks);

      return {
        symbol: productId,
        exchange: this.exchangeId,
        bids,
        asks,
        lastUpdateId: data.sequence || Date.now(),
        timestamp: Date.now(),
        metrics,
        status: 'connected'
      };
    } catch (error) {
      console.error(`Coinbase: Failed to fetch order book for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Coinbase doesn't offer perpetual futures funding rates
   * Return empty data with appropriate message
   */
  async getFundingRate(symbol: string): Promise<FundingRateData> {
    throw new Error('Coinbase does not support perpetual futures or funding rates');
  }

  async getAllFundingRates(): Promise<FundingRateData[]> {
    // Coinbase is spot-only, no funding rates
    return [];
  }

  /**
   * Check if symbol is supported on Coinbase
   */
  async isSymbolSupported(symbol: string): Promise<boolean> {
    try {
      const productId = this.normalizeSymbol(symbol);
      const response = await fetch(`${this.API_BASE}/products/${productId}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported trading pairs from Coinbase
   */
  async getSupportedSymbols(): Promise<string[]> {
    try {
      const response = await fetch(`${this.API_BASE}/products`);

      if (!response.ok) {
        throw new Error('Failed to fetch Coinbase products');
      }

      const products = await response.json();

      // Filter for USD/USDT pairs only
      return products
        .filter((p: any) =>
          (p.quote_currency === 'USD' || p.quote_currency === 'USDT') &&
          p.status === 'online'
        )
        .map((p: any) => p.id);
    } catch (error) {
      console.error('Coinbase: Failed to fetch supported symbols:', error);
      return [];
    }
  }

  /**
   * Calculate order book metrics
   */
  private calculateMetrics(bids: OrderBookLevel[], asks: OrderBookLevel[]): OrderBookMetrics {
    const totalBidVolume = bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = asks.reduce((sum, ask) => sum + ask.quantity, 0);

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;

    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = (spread / midPrice) * 100;

    const totalVolume = totalBidVolume + totalAskVolume;
    const buyPressure = totalVolume > 0 ? (totalBidVolume / totalVolume) * 100 : 50;
    const sellPressure = 100 - buyPressure;
    const bidAskRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 1;

    return {
      totalBidVolume,
      totalAskVolume,
      spread,
      spreadPercent,
      midPrice,
      buyPressure,
      sellPressure,
      bidAskRatio
    };
  }

  /**
   * Normalize symbol format (BTC -> BTC-USD)
   */
  private normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes('-')) {
      return upper;
    }
    // Coinbase uses BTC-USD format
    return `${upper}-USD`;
  }
}

// Singleton instance
export const coinbaseAdapter = new CoinbaseAdapter();

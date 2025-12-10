/**
 * Bybit Exchange Adapter
 * Implements unified exchange interface for Bybit
 */

import {
  ExchangeAdapter,
  OrderBookData,
  FundingRateData,
  OrderBookLevel,
  OrderBookMetrics
} from './types';

export class BybitAdapter implements ExchangeAdapter {
  readonly exchangeId = 'bybit';
  readonly exchangeName = 'Bybit';

  private readonly API_BASE = 'https://api.bybit.com';

  /**
   * Fetch order book from Bybit
   */
  async getOrderBook(symbol: string): Promise<OrderBookData> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const response = await fetch(
        `${this.API_BASE}/v5/market/orderbook?category=linear&symbol=${normalizedSymbol}&limit=25`
      );

      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.statusText}`);
      }

      const json = await response.json();

      if (json.retCode !== 0) {
        throw new Error(json.retMsg || 'Bybit API error');
      }

      const data = json.result;

      // Transform Bybit format to our unified format
      const bids: OrderBookLevel[] = data.b.slice(0, 15).map((bid: string[], index: number) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1]),
        total: data.b.slice(0, index + 1).reduce((sum: number, b: string[]) => sum + parseFloat(b[1]), 0)
      }));

      const asks: OrderBookLevel[] = data.a.slice(0, 15).map((ask: string[], index: number) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1]),
        total: data.a.slice(0, index + 1).reduce((sum: number, a: string[]) => sum + parseFloat(a[1]), 0)
      }));

      const metrics = this.calculateMetrics(bids, asks);

      return {
        symbol: normalizedSymbol,
        exchange: this.exchangeId,
        bids,
        asks,
        lastUpdateId: parseInt(data.u) || Date.now(),
        timestamp: parseInt(data.ts) || Date.now(),
        metrics,
        status: 'connected'
      };
    } catch (error) {
      console.error(`Bybit: Failed to fetch order book for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch funding rate from Bybit
   */
  async getFundingRate(symbol: string): Promise<FundingRateData> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);

      const response = await fetch(
        `${this.API_BASE}/v5/market/funding/history?category=linear&symbol=${normalizedSymbol}&limit=48`
      );

      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.statusText}`);
      }

      const json = await response.json();

      if (json.retCode !== 0) {
        throw new Error(json.retMsg || 'Bybit API error');
      }

      const data = json.result.list;

      if (!data || data.length === 0) {
        throw new Error(`No funding rate data for ${normalizedSymbol} on Bybit`);
      }

      // Get current and historical rates
      const currentRate = parseFloat(data[0].fundingRate) * 100;
      const rates24h = data.slice(0, 3).map((r: any) => parseFloat(r.fundingRate) * 100);
      const rates7d = data.map((r: any) => parseFloat(r.fundingRate) * 100);

      const avg24h = rates24h.reduce((sum, r) => sum + r, 0) / rates24h.length;
      const avg7d = rates7d.reduce((sum, r) => sum + r, 0) / rates7d.length;

      // Determine trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (rates24h.length >= 2) {
        const recent = rates24h[0];
        const previous = rates24h[1];
        const diff = recent - previous;
        if (diff > 0.001) trend = 'increasing';
        else if (diff < -0.001) trend = 'decreasing';
      }

      // Get ticker for mark price
      const tickerResponse = await fetch(
        `${this.API_BASE}/v5/market/tickers?category=linear&symbol=${normalizedSymbol}`
      );
      const tickerJson = await tickerResponse.json();
      const markPrice = parseFloat(tickerJson.result.list[0]?.markPrice || '0');

      return {
        symbol: normalizedSymbol,
        exchange: this.exchangeId,
        coinName: symbol.toUpperCase(),
        fundingRate: currentRate,
        fundingTime: parseInt(data[0].fundingRateTimestamp),
        markPrice,
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000, // Bybit funds every 8 hours
        predictedFundingRate: currentRate, // Bybit doesn't provide predicted rate
        avg24h,
        avg7d,
        trend
      };
    } catch (error) {
      console.error(`Bybit: Failed to fetch funding rate for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get all funding rates from Bybit
   */
  async getAllFundingRates(): Promise<FundingRateData[]> {
    try {
      // Get all tickers to find active symbols
      const response = await fetch(
        `${this.API_BASE}/v5/market/tickers?category=linear`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Bybit tickers');
      }

      const json = await response.json();
      const tickers = json.result.list;

      // Filter for USDT perpetuals only
      const usdtSymbols = tickers
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .slice(0, 50); // Limit to top 50 to avoid rate limits

      // Fetch funding rates in batches
      const fundingPromises = usdtSymbols.map(async (ticker: any) => {
        try {
          const symbol = ticker.symbol.replace('USDT', '');
          return await this.getFundingRate(symbol);
        } catch {
          return null;
        }
      });

      const results = await Promise.all(fundingPromises);
      return results.filter((r): r is FundingRateData => r !== null);
    } catch (error) {
      console.error('Bybit: Failed to fetch all funding rates:', error);
      return [];
    }
  }

  /**
   * Check if symbol is supported
   */
  async isSymbolSupported(symbol: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const response = await fetch(
        `${this.API_BASE}/v5/market/tickers?category=linear&symbol=${normalizedSymbol}`
      );
      const json = await response.json();
      return json.retCode === 0 && json.result.list.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported symbols
   */
  async getSupportedSymbols(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.API_BASE}/v5/market/instruments-info?category=linear`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Bybit instruments');
      }

      const json = await response.json();
      const instruments = json.result.list;

      return instruments
        .filter((i: any) => i.symbol.endsWith('USDT') && i.status === 'Trading')
        .map((i: any) => i.symbol);
    } catch (error) {
      console.error('Bybit: Failed to fetch supported symbols:', error);
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
   * Normalize symbol format (BTC -> BTCUSDT)
   */
  private normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith('USDT')) {
      return upper;
    }
    return `${upper}USDT`;
  }
}

// Singleton instance
export const bybitAdapter = new BybitAdapter();

/**
 * Binance Exchange Adapter
 * Implements unified exchange interface for Binance
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ExchangeAdapter,
  OrderBookData,
  FundingRateData,
  OrderBookMetrics,
  OrderBookLevel
} from './types';
import { enhancedFundingRateService } from '@/services/enhancedFundingRateService';

export class BinanceAdapter implements ExchangeAdapter {
  readonly exchangeId = 'binance';
  readonly exchangeName = 'Binance';

  private symbolCache: string[] | null = null;
  private symbolCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch order book from Binance via Supabase edge function
   */
  async getOrderBook(symbol: string): Promise<OrderBookData> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);

      const { data, error } = await supabase.functions.invoke<OrderBookData>(
        `binance-orderbook?symbol=${normalizedSymbol.toLowerCase()}`
      );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No order book data received from Binance');
      }

      // Ensure exchange is set
      return {
        ...data,
        exchange: this.exchangeId,
        symbol: normalizedSymbol
      };
    } catch (error) {
      console.error(`Binance: Failed to fetch order book for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch single funding rate
   */
  async getFundingRate(symbol: string): Promise<FundingRateData> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const allRates = await enhancedFundingRateService.getAllFundingRates();

      const rate = allRates.find(r =>
        r.symbol.toUpperCase() === normalizedSymbol.toUpperCase()
      );

      if (!rate) {
        throw new Error(`Funding rate not found for ${normalizedSymbol} on Binance`);
      }

      return {
        ...rate,
        exchange: this.exchangeId
      };
    } catch (error) {
      console.error(`Binance: Failed to fetch funding rate for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get all funding rates from Binance
   */
  async getAllFundingRates(): Promise<FundingRateData[]> {
    try {
      const rates = await enhancedFundingRateService.getAllFundingRates();
      return rates.map(rate => ({
        ...rate,
        exchange: this.exchangeId
      }));
    } catch (error) {
      console.error('Binance: Failed to fetch all funding rates:', error);
      throw error;
    }
  }

  /**
   * Check if symbol is supported
   */
  async isSymbolSupported(symbol: string): Promise<boolean> {
    const supportedSymbols = await this.getSupportedSymbols();
    const normalizedSymbol = this.normalizeSymbol(symbol);
    return supportedSymbols.includes(normalizedSymbol);
  }

  /**
   * Get all supported symbols (with caching)
   */
  async getSupportedSymbols(): Promise<string[]> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.symbolCache && (now - this.symbolCacheTime) < this.CACHE_DURATION) {
      return this.symbolCache;
    }

    try {
      const rates = await this.getAllFundingRates();
      this.symbolCache = rates.map(r => r.symbol);
      this.symbolCacheTime = now;
      return this.symbolCache;
    } catch (error) {
      console.error('Binance: Failed to fetch supported symbols:', error);
      // Return empty array on error, will retry next time
      return [];
    }
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
export const binanceAdapter = new BinanceAdapter();

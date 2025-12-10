/**
 * Historical Data Service
 * Manages storage and retrieval of historical order book and funding rate data
 */

import { supabase } from '@/integrations/supabase/client';
import { OrderBookData, FundingRateData } from './exchanges/types';

export interface OrderBookHistoryEntry {
  id: string;
  symbol: string;
  exchange: string;
  timestamp: string;
  mid_price: number;
  spread: number;
  spread_percent: number;
  total_bid_volume: number;
  total_ask_volume: number;
  buy_pressure: number;
  sell_pressure: number;
  bid_ask_ratio: number;
  bids: any;
  asks: any;
  created_at: string;
}

export interface FundingRateHistoryEntry {
  id: string;
  symbol: string;
  exchange: string;
  timestamp: string;
  funding_rate: number;
  funding_time: number;
  mark_price: number;
  avg_24h?: number;
  avg_7d?: number;
  trend?: string;
  created_at: string;
}

export interface HistoricalChartData {
  timestamp: number;
  value: number;
  label?: string;
}

class HistoricalDataService {
  /**
   * Save order book snapshot to history
   */
  async saveOrderBookSnapshot(orderBook: OrderBookData): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_book_history')
        .insert({
          symbol: orderBook.symbol,
          exchange: orderBook.exchange,
          timestamp: new Date(orderBook.timestamp).toISOString(),
          mid_price: orderBook.metrics.midPrice,
          spread: orderBook.metrics.spread,
          spread_percent: orderBook.metrics.spreadPercent,
          total_bid_volume: orderBook.metrics.totalBidVolume,
          total_ask_volume: orderBook.metrics.totalAskVolume,
          buy_pressure: orderBook.metrics.buyPressure,
          sell_pressure: orderBook.metrics.sellPressure,
          bid_ask_ratio: orderBook.metrics.bidAskRatio,
          bids: orderBook.bids,
          asks: orderBook.asks,
          last_update_id: orderBook.lastUpdateId
        });

      if (error) {
        console.error('Failed to save order book snapshot:', error);
      }
    } catch (error) {
      console.error('Error saving order book snapshot:', error);
    }
  }

  /**
   * Save funding rate snapshot to history
   */
  async saveFundingRateSnapshot(fundingRate: FundingRateData): Promise<void> {
    try {
      const { error } = await supabase
        .from('funding_rate_history')
        .insert({
          symbol: fundingRate.symbol,
          exchange: fundingRate.exchange,
          timestamp: new Date().toISOString(),
          funding_rate: fundingRate.fundingRate,
          funding_time: fundingRate.fundingTime,
          mark_price: fundingRate.markPrice,
          next_funding_time: fundingRate.nextFundingTime,
          predicted_funding_rate: fundingRate.predictedFundingRate,
          avg_24h: fundingRate.avg24h,
          avg_7d: fundingRate.avg7d,
          trend: fundingRate.trend,
          market_cap: fundingRate.marketCap,
          market_cap_rank: fundingRate.marketCapRank
        });

      if (error) {
        console.error('Failed to save funding rate snapshot:', error);
      }
    } catch (error) {
      console.error('Error saving funding rate snapshot:', error);
    }
  }

  /**
   * Get order book history for a symbol
   */
  async getOrderBookHistory(
    symbol: string,
    exchange: string,
    hoursBack: number = 24
  ): Promise<OrderBookHistoryEntry[]> {
    try {
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('order_book_history')
        .select('*')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to fetch order book history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching order book history:', error);
      return [];
    }
  }

  /**
   * Get funding rate history for a symbol
   */
  async getFundingRateHistory(
    symbol: string,
    exchange: string,
    hoursBack: number = 168 // 7 days default
  ): Promise<FundingRateHistoryEntry[]> {
    try {
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('funding_rate_history')
        .select('*')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to fetch funding rate history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching funding rate history:', error);
      return [];
    }
  }

  /**
   * Get spread history chart data
   */
  async getSpreadHistory(
    symbol: string,
    exchange: string,
    hoursBack: number = 24
  ): Promise<HistoricalChartData[]> {
    const history = await this.getOrderBookHistory(symbol, exchange, hoursBack);

    return history.map(entry => ({
      timestamp: new Date(entry.timestamp).getTime(),
      value: entry.spread_percent,
      label: `${entry.spread_percent.toFixed(4)}%`
    }));
  }

  /**
   * Get buy pressure history chart data
   */
  async getBuyPressureHistory(
    symbol: string,
    exchange: string,
    hoursBack: number = 24
  ): Promise<HistoricalChartData[]> {
    const history = await this.getOrderBookHistory(symbol, exchange, hoursBack);

    return history.map(entry => ({
      timestamp: new Date(entry.timestamp).getTime(),
      value: entry.buy_pressure,
      label: `${entry.buy_pressure.toFixed(2)}%`
    }));
  }

  /**
   * Get funding rate history chart data
   */
  async getFundingRateChartData(
    symbol: string,
    exchange: string,
    hoursBack: number = 168
  ): Promise<HistoricalChartData[]> {
    const history = await this.getFundingRateHistory(symbol, exchange, hoursBack);

    return history.map(entry => ({
      timestamp: new Date(entry.timestamp).getTime(),
      value: entry.funding_rate,
      label: `${entry.funding_rate.toFixed(4)}%`
    }));
  }

  /**
   * Get price history from funding rate data
   */
  async getPriceHistory(
    symbol: string,
    exchange: string,
    hoursBack: number = 168
  ): Promise<HistoricalChartData[]> {
    const history = await this.getFundingRateHistory(symbol, exchange, hoursBack);

    return history.map(entry => ({
      timestamp: new Date(entry.timestamp).getTime(),
      value: entry.mark_price,
      label: `$${entry.mark_price.toLocaleString()}`
    }));
  }

  /**
   * Get statistics for a time period
   */
  async getOrderBookStats(
    symbol: string,
    exchange: string,
    hoursBack: number = 24
  ): Promise<{
    avgSpread: number;
    minSpread: number;
    maxSpread: number;
    avgBuyPressure: number;
    avgSellPressure: number;
  }> {
    const history = await this.getOrderBookHistory(symbol, exchange, hoursBack);

    if (history.length === 0) {
      return {
        avgSpread: 0,
        minSpread: 0,
        maxSpread: 0,
        avgBuyPressure: 50,
        avgSellPressure: 50
      };
    }

    const spreads = history.map(h => h.spread_percent);
    const buyPressures = history.map(h => h.buy_pressure);
    const sellPressures = history.map(h => h.sell_pressure);

    return {
      avgSpread: spreads.reduce((sum, s) => sum + s, 0) / spreads.length,
      minSpread: Math.min(...spreads),
      maxSpread: Math.max(...spreads),
      avgBuyPressure: buyPressures.reduce((sum, p) => sum + p, 0) / buyPressures.length,
      avgSellPressure: sellPressures.reduce((sum, p) => sum + p, 0) / sellPressures.length
    };
  }

  /**
   * Get funding rate statistics
   */
  async getFundingRateStats(
    symbol: string,
    exchange: string,
    hoursBack: number = 168
  ): Promise<{
    avgRate: number;
    minRate: number;
    maxRate: number;
    currentTrend: string;
  }> {
    const history = await this.getFundingRateHistory(symbol, exchange, hoursBack);

    if (history.length === 0) {
      return {
        avgRate: 0,
        minRate: 0,
        maxRate: 0,
        currentTrend: 'stable'
      };
    }

    const rates = history.map(h => h.funding_rate);

    return {
      avgRate: rates.reduce((sum, r) => sum + r, 0) / rates.length,
      minRate: Math.min(...rates),
      maxRate: Math.max(...rates),
      currentTrend: history[history.length - 1]?.trend || 'stable'
    };
  }
}

export const historicalDataService = new HistoricalDataService();

/**
 * Historical Data Service - STUB
 * Legacy service - disabled
 */

export interface OrderBookHistoryEntry {
  symbol: string;
  exchange: string;
  timestamp: number;
  mid_price: number;
  spread: number;
  bid_depth: number;
  ask_depth: number;
  imbalance: number;
}

export interface FundingRateHistoryEntry {
  symbol: string;
  exchange: string;
  timestamp: number;
  funding_rate: number;
  predicted_rate: number;
  next_funding_time: number;
}

export interface HistoricalChartData {
  timestamp: number;
  value: number;
  label?: string;
}

class HistoricalDataService {
  async getOrderBookHistory(): Promise<OrderBookHistoryEntry[]> {
    return [];
  }

  async getFundingRateHistory(): Promise<FundingRateHistoryEntry[]> {
    return [];
  }

  async saveOrderBookSnapshot(): Promise<void> {}
  async saveFundingRateSnapshot(): Promise<void> {}
}

export const historicalDataService = new HistoricalDataService();

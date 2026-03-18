/**
 * Historical Data Types
 * Type definitions retained for FundingRateChart component
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

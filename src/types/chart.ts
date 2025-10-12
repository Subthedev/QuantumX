// Chart-related TypeScript interfaces for TradingView integration

export interface OHLCData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeData {
  time: number;
  value: number;
  color?: string;
}

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type ChartType = 'candlestick' | 'line' | 'area';

export type ChartTimeframe = '1H' | '4H' | '1D' | '7D' | '30D' | '90D' | '180D' | '1Y' | 'ALL';

export interface ChartConfig {
  type: ChartType;
  showVolume: boolean;
  showMA: boolean;
  theme: 'dark' | 'light';
  autoRefresh: boolean;
}

export interface TimeframeConfig {
  label: string;
  value: ChartTimeframe;
  days: number;
  apiDays: number; // Days param for CoinGecko API
}

export interface ChartData {
  ohlc: OHLCData[];
  volume?: VolumeData[];
  lastUpdate: number;
}

export interface PriceInfo {
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
}

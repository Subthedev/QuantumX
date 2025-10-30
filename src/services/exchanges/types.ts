/**
 * Unified Exchange Types
 * Common interfaces for all exchange integrations
 */

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBookMetrics {
  totalBidVolume: number;
  totalAskVolume: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
  buyPressure: number;
  sellPressure: number;
  bidAskRatio: number;
}

export interface OrderBookData {
  symbol: string;
  exchange: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
  timestamp: number;
  metrics: OrderBookMetrics;
  status: 'connected' | 'connecting' | 'initializing' | 'error';
  latency_ms?: string;
  message?: string;
}

export interface FundingRateData {
  symbol: string;
  exchange: string;
  coinName: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  nextFundingTime: number;
  predictedFundingRate: number;
  avg24h: number;
  avg7d: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  marketCap?: number;
  marketCapRank?: number;
  image?: string;
  coinId?: string;
}

export interface ExchangeInfo {
  id: string;
  name: string;
  logo: string;
  supported: boolean;
  features: {
    orderBook: boolean;
    fundingRates: boolean;
    websocket: boolean;
  };
}

/**
 * Unified Exchange Adapter Interface
 * All exchange implementations must conform to this interface
 */
export interface ExchangeAdapter {
  readonly exchangeId: string;
  readonly exchangeName: string;

  /**
   * Fetch real-time order book data
   */
  getOrderBook(symbol: string): Promise<OrderBookData>;

  /**
   * Fetch funding rate data
   */
  getFundingRate(symbol: string): Promise<FundingRateData>;

  /**
   * Get all available funding rates
   */
  getAllFundingRates(): Promise<FundingRateData[]>;

  /**
   * Check if symbol is supported on this exchange
   */
  isSymbolSupported(symbol: string): Promise<boolean>;

  /**
   * Get list of all supported symbols
   */
  getSupportedSymbols(): Promise<string[]>;
}

/**
 * Multi-exchange comparison data
 */
export interface ExchangeComparison {
  symbol: string;
  timestamp: number;
  exchanges: {
    exchangeId: string;
    exchangeName: string;
    orderBook?: OrderBookData;
    fundingRate?: FundingRateData;
    available: boolean;
    error?: string;
  }[];
}

/**
 * Arbitrage opportunity
 */
export interface ArbitrageOpportunity {
  symbol: string;
  type: 'funding' | 'price';
  longExchange: string;
  shortExchange: string;
  longRate: number;
  shortRate: number;
  netGain: number;
  annualizedReturn: number;
  confidence: number;
  timestamp: number;
}

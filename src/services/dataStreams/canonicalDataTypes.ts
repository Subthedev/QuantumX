/**
 * CANONICAL DATA SCHEMA
 * Unified data model for all exchange sources
 * ALL incoming data MUST be normalized to this schema
 */

export interface CanonicalTicker {
  // Identification
  symbol: string;           // Normalized: "BTCUSDT", "ETHUSDT"
  exchange: ExchangeSource; // Source exchange

  // Pricing (USD normalized)
  price: number;            // Current price in USD
  bid: number;              // Best bid price
  ask: number;              // Best ask price

  // Volume (24h, USD normalized)
  volume24h: number;        // 24h volume in USD
  volumeQuote: number;      // Quote currency volume

  // Price Changes
  priceChange24h: number;   // Absolute 24h change
  priceChangePercent24h: number; // Percentage 24h change
  priceChange1h?: number;   // 1h change (if available)

  // High/Low
  high24h: number;          // 24h high
  low24h: number;           // 24h low

  // Timestamps (UTC Unix milliseconds)
  timestamp: number;        // Data timestamp
  receivedAt: number;       // When we received it

  // Data Quality
  quality: DataQuality;
}

export interface CanonicalTrade {
  symbol: string;
  exchange: ExchangeSource;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  tradeId: string;
  isMaker: boolean;
}

export interface CanonicalOrderBook {
  symbol: string;
  exchange: ExchangeSource;
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][];
  timestamp: number;
  lastUpdateId: number;
}

export interface CanonicalKline {
  symbol: string;
  exchange: ExchangeSource;
  interval: string;         // "1m", "5m", "15m", "1h", "4h", "1d"
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

export type ExchangeSource =
  | 'BINANCE'
  | 'OKX'
  | 'COINBASE'
  | 'COINGECKO'
  | 'AGGREGATED';

export type DataQuality =
  | 'HIGH'      // Real-time WebSocket, <1s latency
  | 'MEDIUM'    // HTTP polling, <10s latency
  | 'LOW'       // Fallback source, >10s latency
  | 'STALE';    // Data older than 30s

/**
 * Symbol mapping for exchange normalization
 */
export const SYMBOL_MAPPING: Record<string, ExchangeSymbolMap> = {
  'bitcoin': {
    coinGeckoId: 'bitcoin',
    binance: 'BTCUSDT',
    okx: 'BTC-USDT',
    coinbase: 'BTC-USD'
  },
  'ethereum': {
    coinGeckoId: 'ethereum',
    binance: 'ETHUSDT',
    okx: 'ETH-USDT',
    coinbase: 'ETH-USD'
  },
  'binancecoin': {
    coinGeckoId: 'binancecoin',
    binance: 'BNBUSDT',
    okx: 'BNB-USDT',
    coinbase: null
  },
  'solana': {
    coinGeckoId: 'solana',
    binance: 'SOLUSDT',
    okx: 'SOL-USDT',
    coinbase: 'SOL-USD'
  },
  'ripple': {
    coinGeckoId: 'ripple',
    binance: 'XRPUSDT',
    okx: 'XRP-USDT',
    coinbase: 'XRP-USD'
  },
  'cardano': {
    coinGeckoId: 'cardano',
    binance: 'ADAUSDT',
    okx: 'ADA-USDT',
    coinbase: 'ADA-USD'
  },
  'avalanche-2': {
    coinGeckoId: 'avalanche-2',
    binance: 'AVAXUSDT',
    okx: 'AVAX-USDT',
    coinbase: 'AVAX-USD'
  },
  'polkadot': {
    coinGeckoId: 'polkadot',
    binance: 'DOTUSDT',
    okx: 'DOT-USDT',
    coinbase: 'DOT-USD'
  },
  'chainlink': {
    coinGeckoId: 'chainlink',
    binance: 'LINKUSDT',
    okx: 'LINK-USDT',
    coinbase: 'LINK-USD'
  },
  'polygon': {
    coinGeckoId: 'polygon',
    binance: 'MATICUSDT',
    okx: 'MATIC-USDT',
    coinbase: 'MATIC-USD'
  },
  'uniswap': {
    coinGeckoId: 'uniswap',
    binance: 'UNIUSDT',
    okx: 'UNI-USDT',
    coinbase: 'UNI-USD'
  },
  'litecoin': {
    coinGeckoId: 'litecoin',
    binance: 'LTCUSDT',
    okx: 'LTC-USDT',
    coinbase: 'LTC-USD'
  },
  'cosmos': {
    coinGeckoId: 'cosmos',
    binance: 'ATOMUSDT',
    okx: 'ATOM-USDT',
    coinbase: 'ATOM-USD'
  },
  'near': {
    coinGeckoId: 'near',
    binance: 'NEARUSDT',
    okx: 'NEAR-USDT',
    coinbase: 'NEAR-USD'
  },
  'aptos': {
    coinGeckoId: 'aptos',
    binance: 'APTUSDT',
    okx: 'APT-USDT',
    coinbase: 'APT-USD'
  },
  'arbitrum': {
    coinGeckoId: 'arbitrum',
    binance: 'ARBUSDT',
    okx: 'ARB-USDT',
    coinbase: 'ARB-USD'
  },
  'optimism': {
    coinGeckoId: 'optimism',
    binance: 'OPUSDT',
    okx: 'OP-USDT',
    coinbase: 'OP-USD'
  },
  'sui': {
    coinGeckoId: 'sui',
    binance: 'SUIUSDT',
    okx: 'SUI-USDT',
    coinbase: null
  },
  'injective-protocol': {
    coinGeckoId: 'injective-protocol',
    binance: 'INJUSDT',
    okx: 'INJ-USDT',
    coinbase: null
  },
  'render-token': {
    coinGeckoId: 'render-token',
    binance: 'RENDERUSDT',
    okx: 'RENDER-USDT',
    coinbase: null
  },
  'sei-network': {
    coinGeckoId: 'sei-network',
    binance: 'SEIUSDT',
    okx: 'SEI-USDT',
    coinbase: null
  },
  'starknet': {
    coinGeckoId: 'starknet',
    binance: 'STRKUSDT',
    okx: 'STRK-USDT',
    coinbase: null
  },
  'immutable-x': {
    coinGeckoId: 'immutable-x',
    binance: 'IMXUSDT',
    okx: 'IMX-USDT',
    coinbase: 'IMX-USD'
  },
  'the-graph': {
    coinGeckoId: 'the-graph',
    binance: 'GRTUSDT',
    okx: 'GRT-USDT',
    coinbase: 'GRT-USD'
  },
  'theta-network': {
    coinGeckoId: 'theta-network',
    binance: 'THETAUSDT',
    okx: 'THETA-USDT',
    coinbase: null
  },
  'flow': {
    coinGeckoId: 'flow',
    binance: 'FLOWUSDT',
    okx: 'FLOW-USDT',
    coinbase: 'FLOW-USD'
  },
  'sandbox': {
    coinGeckoId: 'sandbox',
    binance: 'SANDUSDT',
    okx: 'SAND-USDT',
    coinbase: 'SAND-USD'
  },
  'decentraland': {
    coinGeckoId: 'decentraland',
    binance: 'MANAUSDT',
    okx: 'MANA-USDT',
    coinbase: 'MANA-USD'
  },
  'gala': {
    coinGeckoId: 'gala',
    binance: 'GALAUSDT',
    okx: 'GALA-USDT',
    coinbase: 'GALA-USD'
  },
  'enjincoin': {
    coinGeckoId: 'enjincoin',
    binance: 'ENJUSDT',
    okx: 'ENJ-USDT',
    coinbase: 'ENJ-USD'
  }
};

export interface ExchangeSymbolMap {
  coinGeckoId: string;
  binance: string | null;
  okx: string | null;
  coinbase: string | null;
}

/**
 * Get exchange symbol for a coin
 */
export function getExchangeSymbol(coinGeckoId: string, exchange: 'binance' | 'okx' | 'coinbase'): string | null {
  return SYMBOL_MAPPING[coinGeckoId]?.[exchange] || null;
}

/**
 * Get CoinGecko ID from exchange symbol
 */
export function getCoinGeckoId(exchangeSymbol: string, exchange: 'binance' | 'okx' | 'coinbase'): string | null {
  for (const [geckoId, mapping] of Object.entries(SYMBOL_MAPPING)) {
    if (mapping[exchange] === exchangeSymbol) {
      return geckoId;
    }
  }
  return null;
}

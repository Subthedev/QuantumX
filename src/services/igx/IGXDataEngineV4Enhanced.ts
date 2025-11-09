// Legacy service - stub
export interface EnhancedEngineStats {
  tickersReceived: number;
  dataPoints: number;
  sourcesActive: number;
}

export interface IGXTicker {
  symbol: string;
  price: number;
  volume24h: number;
  timestamp: number;
  high24h?: number;
  low24h?: number;
  priceChangePercent24h?: number;
  change24h?: number;
  exchangeSources?: string[];
  smartMoneyFlow?: number;
}

export class IGXDataEngineV4Enhanced {
  async start() {}
  async stop() {}
  getStats(): EnhancedEngineStats {
    return { tickersReceived: 0, dataPoints: 0, sourcesActive: 0 };
  }
}

export const igxDataEngineV4Enhanced = new IGXDataEngineV4Enhanced();

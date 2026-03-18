/**
 * MULTI-EXCHANGE FUNDING RATE AGGREGATOR
 *
 * Aggregates funding rates from Binance, Bybit, and OKX into a composite signal.
 * All endpoints are FREE, no API keys required.
 *
 * Signal value:
 * - Extreme positive funding (>0.05%) = overleveraged longs → SHORT signal
 * - Extreme negative funding (<-0.05%) = overleveraged shorts → LONG signal
 * - Cross-exchange divergence = arbitrage opportunity
 *
 * Endpoints:
 * - Binance: https://fapi.binance.com/fapi/v1/premiumIndex
 * - Bybit:   https://api.bybit.com/v5/market/tickers?category=linear
 * - OKX:     https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP
 */

export interface ExchangeFunding {
  exchange: 'binance' | 'bybit' | 'okx';
  symbol: string;
  fundingRate: number; // As percentage (e.g., 0.01 = 0.01%)
  nextFundingTime: number;
  timestamp: number;
}

export interface CompositeFunding {
  symbol: string;
  avgFundingRate: number;       // Average across exchanges
  maxFundingRate: number;       // Highest funding (most leveraged direction)
  minFundingRate: number;       // Lowest funding
  divergence: number;           // Spread between max and min (arb signal)
  sentiment: 'EXTREME_LONG' | 'LEVERAGED_LONG' | 'NEUTRAL' | 'LEVERAGED_SHORT' | 'EXTREME_SHORT';
  exchanges: ExchangeFunding[];
  mlFeature: number;            // -1 to +1 (negative = overleveraged longs, positive = overleveraged shorts)
}

export interface FundingSnapshot {
  composites: Map<string, CompositeFunding>;
  marketWideFunding: number;    // Average funding across ALL symbols
  extremeCount: number;         // Number of symbols with extreme funding
  lastUpdate: number;
}

const TRACKED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];

class MultiExchangeFundingService {
  private snapshot: FundingSnapshot;
  private cache: { data: ExchangeFunding[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 60000; // 1 minute
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.snapshot = {
      composites: new Map(),
      marketWideFunding: 0,
      extremeCount: 0,
      lastUpdate: 0
    };
  }

  /**
   * Start periodic funding rate polling (every 60s)
   */
  start(): void {
    this.refresh();
    this.pollInterval = setInterval(() => this.refresh(), this.CACHE_DURATION);
    console.log('[FundingAgg] Started multi-exchange funding rate aggregation');
  }

  /**
   * Fetch from all 3 exchanges and compute composites
   */
  async refresh(): Promise<void> {
    const [binance, bybit, okx] = await Promise.allSettled([
      this.fetchBinance(),
      this.fetchBybit(),
      this.fetchOKX()
    ]);

    const allRates: ExchangeFunding[] = [
      ...(binance.status === 'fulfilled' ? binance.value : []),
      ...(bybit.status === 'fulfilled' ? bybit.value : []),
      ...(okx.status === 'fulfilled' ? okx.value : [])
    ];

    this.cache = { data: allRates, timestamp: Date.now() };
    this.computeComposites(allRates);
  }

  private async fetchBinance(): Promise<ExchangeFunding[]> {
    const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter((d: any) => TRACKED_SYMBOLS.includes(d.symbol))
      .map((d: any) => ({
        exchange: 'binance' as const,
        symbol: d.symbol,
        fundingRate: parseFloat(d.lastFundingRate) * 100,
        nextFundingTime: d.nextFundingTime,
        timestamp: Date.now()
      }));
  }

  private async fetchBybit(): Promise<ExchangeFunding[]> {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.result?.list || [];
    return list
      .filter((d: any) => TRACKED_SYMBOLS.includes(d.symbol))
      .map((d: any) => ({
        exchange: 'bybit' as const,
        symbol: d.symbol,
        fundingRate: parseFloat(d.fundingRate || '0') * 100,
        nextFundingTime: parseInt(d.nextFundingTime || '0'),
        timestamp: Date.now()
      }));
  }

  private async fetchOKX(): Promise<ExchangeFunding[]> {
    const results: ExchangeFunding[] = [];
    // OKX uses different symbol format: BTC-USDT-SWAP
    const okxSymbols = TRACKED_SYMBOLS.map(s => s.replace('USDT', '-USDT-SWAP'));

    for (const instId of okxSymbols) {
      try {
        const res = await fetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const item = data?.data?.[0];
        if (item) {
          const symbol = instId.replace('-USDT-SWAP', 'USDT');
          results.push({
            exchange: 'okx',
            symbol,
            fundingRate: parseFloat(item.fundingRate || '0') * 100,
            nextFundingTime: parseInt(item.nextFundingTime || '0'),
            timestamp: Date.now()
          });
        }
      } catch {}
    }
    return results;
  }

  /**
   * Compute composite funding per symbol
   */
  private computeComposites(allRates: ExchangeFunding[]): void {
    const bySymbol = new Map<string, ExchangeFunding[]>();
    for (const rate of allRates) {
      const existing = bySymbol.get(rate.symbol) || [];
      existing.push(rate);
      bySymbol.set(rate.symbol, existing);
    }

    let totalFunding = 0;
    let symbolCount = 0;
    let extremeCount = 0;

    for (const [symbol, rates] of bySymbol) {
      const fundingValues = rates.map(r => r.fundingRate);
      const avg = fundingValues.reduce((a, b) => a + b, 0) / fundingValues.length;
      const max = Math.max(...fundingValues);
      const min = Math.min(...fundingValues);

      let sentiment: CompositeFunding['sentiment'] = 'NEUTRAL';
      if (avg > 0.05) sentiment = 'EXTREME_LONG';
      else if (avg > 0.02) sentiment = 'LEVERAGED_LONG';
      else if (avg < -0.05) sentiment = 'EXTREME_SHORT';
      else if (avg < -0.02) sentiment = 'LEVERAGED_SHORT';

      // ML feature: -1 (extreme longs = bearish) to +1 (extreme shorts = bullish)
      // Inverted because extreme longs predict REVERSAL DOWN
      const mlFeature = Math.max(-1, Math.min(1, -avg / 0.1));

      if (Math.abs(avg) > 0.05) extremeCount++;

      this.snapshot.composites.set(symbol, {
        symbol,
        avgFundingRate: avg,
        maxFundingRate: max,
        minFundingRate: min,
        divergence: max - min,
        sentiment,
        exchanges: rates,
        mlFeature
      });

      totalFunding += avg;
      symbolCount++;
    }

    this.snapshot.marketWideFunding = symbolCount > 0 ? totalFunding / symbolCount : 0;
    this.snapshot.extremeCount = extremeCount;
    this.snapshot.lastUpdate = Date.now();
  }

  /**
   * Get composite funding for a symbol (sync)
   */
  getComposite(symbol: string): CompositeFunding | null {
    return this.snapshot.composites.get(symbol) || null;
  }

  /**
   * Get ML feature for a symbol (-1 to +1)
   */
  getMLFeature(symbol: string): number {
    return this.snapshot.composites.get(symbol)?.mlFeature || 0;
  }

  /**
   * Get market-wide funding sentiment
   */
  getMarketFunding(): { avgFunding: number; extremeCount: number; sentiment: string } {
    const avg = this.snapshot.marketWideFunding;
    return {
      avgFunding: avg,
      extremeCount: this.snapshot.extremeCount,
      sentiment: avg > 0.03 ? 'OVERLEVERAGED_LONG' :
                 avg < -0.03 ? 'OVERLEVERAGED_SHORT' : 'BALANCED'
    };
  }

  getSnapshot(): FundingSnapshot {
    return this.snapshot;
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}

export const multiExchangeFundingService = new MultiExchangeFundingService();

/**
 * STABLECOIN FLOW TRACKER — Macro Market Direction Signal
 *
 * Uses DeFiLlama free API (no API key, no rate limit published).
 *
 * Signal value:
 * - Rising stablecoin supply = new capital entering crypto → BULLISH
 * - Falling stablecoin supply = capital leaving crypto → BEARISH
 * - Stablecoins moving to exchanges = buying pressure incoming → BULLISH
 *
 * Endpoints:
 * - https://stablecoins.llama.fi/stablecoins?includePrices=true
 * - https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=1 (USDT)
 */

export interface StablecoinData {
  name: string;
  symbol: string;
  circulating: number;        // Current circulating supply (USD)
  circulatingPrev7d: number;  // 7 days ago
  change7d: number;           // % change in 7 days
  change30d: number;          // % change in 30 days
}

export interface StablecoinFlowState {
  totalSupply: number;           // Total stablecoin market cap
  supplyChange7d: number;        // % change in total supply over 7 days
  supplyChange30d: number;       // % change over 30 days
  topStables: StablecoinData[];  // USDT, USDC, DAI, BUSD
  flowSignal: 'STRONG_INFLOW' | 'INFLOW' | 'NEUTRAL' | 'OUTFLOW' | 'STRONG_OUTFLOW';
  mlFeature: number;             // -1 to +1 (negative = capital leaving, positive = capital entering)
  lastUpdate: number;
}

class StablecoinFlowService {
  private state: StablecoinFlowState;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL = 300000; // 5 minutes (stablecoins don't change fast)

  constructor() {
    this.state = {
      totalSupply: 0,
      supplyChange7d: 0,
      supplyChange30d: 0,
      topStables: [],
      flowSignal: 'NEUTRAL',
      mlFeature: 0,
      lastUpdate: 0
    };
  }

  start(): void {
    this.refresh();
    this.pollInterval = setInterval(() => this.refresh(), this.POLL_INTERVAL);
    console.log('[StablecoinFlow] Started stablecoin flow tracking via DeFiLlama');
  }

  async refresh(): Promise<void> {
    try {
      const res = await fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true');
      if (!res.ok) return;
      const data = await res.json();

      const stables = (data.peggedAssets || [])
        .filter((s: any) => s.circulating?.peggedUSD > 100000000) // Only >$100M stables
        .map((s: any) => {
          const current = s.circulating?.peggedUSD || 0;
          const prev7d = current / (1 + (s.circulatingPrevDay?.peggedUSD ? (current - s.circulatingPrevDay.peggedUSD) / s.circulatingPrevDay.peggedUSD * 7 : 0));
          return {
            name: s.name,
            symbol: s.symbol,
            circulating: current,
            circulatingPrev7d: prev7d,
            change7d: s.change_7d || 0,
            change30d: s.change_1m || 0
          };
        })
        .sort((a: StablecoinData, b: StablecoinData) => b.circulating - a.circulating);

      const totalSupply = stables.reduce((sum: number, s: StablecoinData) => sum + s.circulating, 0);
      const avgChange7d = stables.length > 0
        ? stables.slice(0, 5).reduce((sum: number, s: StablecoinData) => sum + s.change7d, 0) / Math.min(stables.length, 5)
        : 0;
      const avgChange30d = stables.length > 0
        ? stables.slice(0, 5).reduce((sum: number, s: StablecoinData) => sum + s.change30d, 0) / Math.min(stables.length, 5)
        : 0;

      // Determine flow signal
      let flowSignal: StablecoinFlowState['flowSignal'] = 'NEUTRAL';
      if (avgChange7d > 2) flowSignal = 'STRONG_INFLOW';
      else if (avgChange7d > 0.5) flowSignal = 'INFLOW';
      else if (avgChange7d < -2) flowSignal = 'STRONG_OUTFLOW';
      else if (avgChange7d < -0.5) flowSignal = 'OUTFLOW';

      // ML feature: -1 (capital fleeing) to +1 (capital flooding in)
      const mlFeature = Math.max(-1, Math.min(1, avgChange7d / 5));

      this.state = {
        totalSupply,
        supplyChange7d: avgChange7d,
        supplyChange30d: avgChange30d,
        topStables: stables.slice(0, 5),
        flowSignal,
        mlFeature,
        lastUpdate: Date.now()
      };

      console.log(`[StablecoinFlow] Total: $${(totalSupply / 1e9).toFixed(1)}B | 7d: ${avgChange7d > 0 ? '+' : ''}${avgChange7d.toFixed(2)}% | Signal: ${flowSignal}`);
    } catch (err) {
      console.warn('[StablecoinFlow] Refresh failed:', err);
    }
  }

  getState(): StablecoinFlowState {
    return { ...this.state };
  }

  getMLFeature(): number {
    return this.state.mlFeature;
  }

  getFlowSignal(): StablecoinFlowState['flowSignal'] {
    return this.state.flowSignal;
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}

export const stablecoinFlowService = new StablecoinFlowService();

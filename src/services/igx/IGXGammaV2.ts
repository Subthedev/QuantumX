// Legacy service - stub
export class IGXGammaV2 {
  async start() {}
  async stop() {}
  getStats() {
    return { approvedSignals: 0, rejectedSignals: 0 };
  }
}

export interface GammaFilterDecision {
  approved: boolean;
}

export interface AlphaMarketCondition {
  regime: string;
}

export interface DataEngineMetrics {
  sourcesActive: number;
}

export const igxGammaV2 = new IGXGammaV2();

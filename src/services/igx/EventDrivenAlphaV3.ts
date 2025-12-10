// Legacy service - stub
export interface AlphaInsights {
  mode: string;
  confidence: number;
}

export class EventDrivenAlphaV3 {
  async start() {}
  async stop() {}
  getInsights(): AlphaInsights {
    return { mode: 'disabled', confidence: 0 };
  }
}

export const eventDrivenAlphaV3 = new EventDrivenAlphaV3();

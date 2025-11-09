// Legacy service - stub
export class IGXBetaV5 {
  async start() {}
  async stop() {}
  getStats() {
    return { signalsGenerated: 0, patternsDetected: 0 };
  }
}

export const igxBetaV5 = new IGXBetaV5();

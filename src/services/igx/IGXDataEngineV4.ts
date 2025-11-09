// Legacy service - stub
export class IGXDataEngineV4 {
  async start() {}
  async stop() {}
  getStats() {
    return { tickersReceived: 0, sourcesActive: 0 };
  }
}

export const igxDataEngineV4 = new IGXDataEngineV4();

// Legacy service - stub
export class IGXBackgroundService {
  async start() {}
  async stop() {}
  getStatus() {
    return { running: false };
  }
}

export const igxBackgroundService = new IGXBackgroundService();

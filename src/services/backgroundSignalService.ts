// Legacy service - temporarily stubbed
export class BackgroundSignalService {
  start() {}
  stop() {}
  
  getStatus() {
    return { 
      running: false,
      isRunning: false,
      lastUpdate: Date.now(),
      lastHealthCheck: Date.now(),
      errors: []
    };
  }
}

export const backgroundSignalService = new BackgroundSignalService();

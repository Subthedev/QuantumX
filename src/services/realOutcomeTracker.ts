/**
 * REAL OUTCOME TRACKER - Minimal Stub
 * This stub provides type exports for compatibility
 * Outcome tracking handled server-side in production
 */

import type { HubSignal } from './globalHubService';

class RealOutcomeTracker {
  trackSignal(signal: HubSignal) {}
  getOutcome(signalId: string) {
    return null;
  }
  getStats() {
    return {
      totalTracked: 0,
      completed: 0,
      pending: 0,
      winRate: 0
    };
  }
  on(event: string, handler: Function) {}
  off(event: string, handler: Function) {}
}

export const realOutcomeTracker = new RealOutcomeTracker();

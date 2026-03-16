/**
 * IGX BACKGROUND SERVICE - App-Wide Signal Pipeline Activator
 *
 * Imported by App.tsx on every page load. Ensures the full 8-stage signal
 * generation pipeline (globalHubService) runs 24/7 regardless of which
 * page the user is on.
 *
 * Pipeline: Data → 17 Strategies → Beta Scoring → Gamma Filtering →
 *           Delta ML Gate → Publishing → Outcome Tracking → ML Learning
 */

import { globalHubService } from '../globalHubService';

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

export class IGXBackgroundService {
  private retryCount = 0;
  private starting = false;

  constructor() {
    console.log('[IGXBackground] Service constructed - scheduling pipeline activation');
    // Start immediately (no delay) - React hydration doesn't block service init
    this.start();
  }

  async start(): Promise<void> {
    if (this.starting) {
      console.log('[IGXBackground] Start already in progress, skipping');
      return;
    }
    if (globalHubService.isRunning()) {
      console.log('[IGXBackground] Pipeline already running');
      return;
    }

    this.starting = true;

    try {
      console.log('[IGXBackground] ====================================');
      console.log('[IGXBackground] Activating 8-stage signal pipeline...');
      console.log('[IGXBackground] ====================================');
      await globalHubService.start();
      console.log('[IGXBackground] ====================================');
      console.log('[IGXBackground] Pipeline LIVE - signals generating');
      console.log('[IGXBackground] ====================================');
      this.retryCount = 0;
    } catch (error) {
      const msg = (error as Error).message;
      const stack = (error as Error).stack;
      console.error('[IGXBackground] Pipeline activation FAILED:', msg);
      console.error('[IGXBackground] Stack:', stack);

      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        console.log(`[IGXBackground] Retry ${this.retryCount}/${MAX_RETRIES} in ${RETRY_DELAY / 1000}s...`);
        setTimeout(() => {
          this.starting = false;
          this.start();
        }, RETRY_DELAY);
        return;
      }

      console.error('[IGXBackground] All retries exhausted. Pipeline NOT running.');
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    globalHubService.stop();
    console.log('[IGXBackground] Pipeline stopped');
  }

  getStatus() {
    return {
      running: globalHubService.isRunning(),
      metrics: globalHubService.isRunning() ? globalHubService.getMetrics() : null
    };
  }
}

export const igxBackgroundService = new IGXBackgroundService();

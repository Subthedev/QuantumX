/**
 * ZETA LEARNING ENGINE - Minimal Stub
 * This stub provides type exports for compatibility
 * Learning functionality disabled in production (server-side signals)
 */

export interface ZetaMetrics {
  totalRejections: number;
  rejectionRate: number;
  improvementRate: number;
  modelAccuracy: number;
  lastLearningCycle: number;
  cyclesCompleted: number;
}

class ZetaLearningEngine {
  getMetrics(): ZetaMetrics {
    return {
      totalRejections: 0,
      rejectionRate: 0,
      improvementRate: 0,
      modelAccuracy: 0,
      lastLearningCycle: Date.now(),
      cyclesCompleted: 0
    };
  }

  on(event: string, handler: Function) {}
  off(event: string, handler: Function) {}
}

export const zetaLearningEngine = new ZetaLearningEngine();

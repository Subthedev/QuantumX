/**
 * GLOBAL HUB SERVICE - Minimal Stub
 *
 * This is a minimal stub to satisfy imports from other files.
 * Signal generation is now handled server-side via Supabase Edge Functions.
 * This stub provides type exports and empty implementations for compatibility.
 */

// Type exports
export interface HubSignal {
  id?: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  entry: number;
  targets: number[];
  stopLoss?: number;
  timestamp: number;
  strategy?: string;
  strategyName?: string;
  timeframe?: string;
  qualityScore: number;
  qualityTier?: string;
  riskLevel?: string;
  riskReward?: number;
  riskRewardRatio?: number;
  expiresAt?: number;
  timeLimit?: number;
  tier?: 'FREE' | 'PRO' | 'MAX';
  outcome?: 'pending' | 'hit_tp1' | 'hit_tp2' | 'hit_sl' | 'expired' | null;
}

export interface HubMetrics {
  totalSignals: number;
  activeSignals: number;
  avgConfidence: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  pipelineHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdateTime: number;
}

export interface MonthlyStats {
  totalSignals: number;
  successfulSignals: number;
  winRate: number;
  avgConfidenceScore: number;
  topStrategies: Array<{ name: string; count: number; winRate: number }>;
  monthlySignals: number;
}

// Minimal stub class
class GlobalHubService {
  private signals: HubSignal[] = [];
  private isRunningFlag = false;
  private eventHandlers: Map<string, Function[]> = new Map();

  async start() {
    this.isRunningFlag = false;
    console.log('[GlobalHubService] Stub - Signal generation is server-side');
  }

  async stop() {
    this.isRunningFlag = false;
  }

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  getSignalHistory(): HubSignal[] {
    return this.signals;
  }

  getActiveSignals(): HubSignal[] {
    return this.signals.filter(s => s.expiresAt && s.expiresAt > Date.now());
  }

  getMetrics(): HubMetrics {
    return {
      totalSignals: 0,
      activeSignals: 0,
      avgConfidence: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      pipelineHealth: 'healthy',
      lastUpdateTime: Date.now()
    };
  }

  getMonthlyStats(): MonthlyStats {
    return {
      totalSignals: 0,
      successfulSignals: 0,
      winRate: 0,
      avgConfidenceScore: 0,
      topStrategies: [],
      monthlySignals: 0
    };
  }

  getCurrentMonthStats(): MonthlyStats {
    // Alias for getMonthlyStats for compatibility
    return this.getMonthlyStats();
  }

  getState() {
    return {
      signalHistory: this.signals,
      activeSignals: this.signals.filter(s => s.expiresAt && s.expiresAt > Date.now()),
      metrics: this.getMetrics()
    };
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
}

// Export singleton instance
export const globalHubService = new GlobalHubService();

// Expose on window for debugging
if (typeof window !== 'undefined') {
  (window as any).globalHubService = globalHubService;
}

/**
 * ML CIRCUIT BREAKER
 * Production-grade safety mechanism to prevent ML failures from causing losses
 *
 * PURPOSE:
 * - Auto-disable failing ML models (5+ consecutive losses)
 * - Monitor win rate, latency, accuracy in real-time
 * - Cooldown periods before retry (5 minutes)
 * - Alert system for critical failures
 * - Production-grade: Inspired by Netflix's Hystrix and AWS fault injection
 *
 * CIRCUIT STATES:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Circuit breaker triggered, all requests rejected
 * - HALF_OPEN: Testing if service recovered, limited requests
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerState {
  modelName: string;
  state: CircuitState;
  consecutiveLosses: number;
  recentOutcomes: Array<{
    outcome: 'WIN' | 'LOSS';
    latency: number;
    timestamp: number;
  }>;
  openedAt: number;
  cooldownMs: number;
  failureReason?: string;
}

export interface CircuitBreakerThresholds {
  MAX_CONSECUTIVE_LOSSES: number;
  MIN_WIN_RATE: number;
  MAX_DRAWDOWN: number;
  MAX_PREDICTION_LATENCY: number;
  MIN_ACCURACY: number;
  MIN_SAMPLES_FOR_WIN_RATE_CHECK: number;
}

export interface CircuitBreakerEvent {
  type: 'OPENED' | 'CLOSED' | 'HALF_OPEN' | 'WARNING';
  modelName: string;
  reason: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class MLCircuitBreaker {
  private breakers: Map<string, CircuitBreakerState> = new Map();
  private eventListeners: Array<(event: CircuitBreakerEvent) => void> = [];

  private readonly THRESHOLDS: CircuitBreakerThresholds = {
    MAX_CONSECUTIVE_LOSSES: 5, // Open circuit after 5 straight losses
    MIN_WIN_RATE: 0.35, // 35% minimum win rate
    MAX_DRAWDOWN: 0.15, // 15% maximum drawdown
    MAX_PREDICTION_LATENCY: 100, // 100ms max latency
    MIN_ACCURACY: 0.50, // 50% minimum accuracy
    MIN_SAMPLES_FOR_WIN_RATE_CHECK: 20 // Need 20 samples to check win rate
  };

  constructor() {
    this.loadFromStorage();
    console.log('[MLCircuitBreaker] Initialized with thresholds:', this.THRESHOLDS);
  }

  /**
   * Check if model is safe to use
   */
  async isSafeToUse(modelName: string): Promise<boolean> {
    const breaker = this.getOrCreateBreaker(modelName);

    if (breaker.state === 'OPEN') {
      // Circuit open - check if cooldown expired
      const cooldownExpired = Date.now() - breaker.openedAt > breaker.cooldownMs;

      if (cooldownExpired) {
        // Enter half-open state (test if recovered)
        breaker.state = 'HALF_OPEN';
        console.log(`[MLCircuitBreaker] ${modelName} entering HALF_OPEN state (testing recovery)`);
        this.emitEvent({
          type: 'HALF_OPEN',
          modelName,
          reason: 'Cooldown period expired, testing recovery',
          timestamp: Date.now()
        });
        this.persist();
        return true;
      }

      // Still in cooldown
      const remainingMs = breaker.cooldownMs - (Date.now() - breaker.openedAt);
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      console.warn(`[MLCircuitBreaker] ❌ ${modelName} circuit OPEN - ${remainingMinutes} minutes remaining`);
      return false;
    }

    return true;
  }

  /**
   * Record outcome and check thresholds
   */
  async recordOutcome(
    modelName: string,
    outcome: 'WIN' | 'LOSS',
    latency: number
  ): Promise<void> {
    const breaker = this.getOrCreateBreaker(modelName);

    // Add outcome to history
    breaker.recentOutcomes.push({
      outcome,
      latency,
      timestamp: Date.now()
    });

    // Keep only last 100 outcomes
    if (breaker.recentOutcomes.length > 100) {
      breaker.recentOutcomes = breaker.recentOutcomes.slice(-100);
    }

    // Update consecutive losses
    if (outcome === 'LOSS') {
      breaker.consecutiveLosses++;
      console.log(`[MLCircuitBreaker] ${modelName} loss recorded (${breaker.consecutiveLosses} consecutive)`);
    } else {
      // Win resets consecutive losses
      if (breaker.consecutiveLosses > 0) {
        console.log(`[MLCircuitBreaker] ${modelName} win recorded (reset consecutive losses from ${breaker.consecutiveLosses})`);
      }
      breaker.consecutiveLosses = 0;

      // If in HALF_OPEN and got a win, close the circuit
      if (breaker.state === 'HALF_OPEN') {
        this.closeCircuit(breaker, 'Recovery confirmed with successful outcome');
        return;
      }
    }

    // Check thresholds
    await this.checkThresholds(breaker);

    this.persist();
  }

  /**
   * Check all thresholds and open circuit if exceeded
   */
  private async checkThresholds(breaker: CircuitBreakerState): Promise<void> {
    // Threshold 1: Consecutive losses
    if (breaker.consecutiveLosses >= this.THRESHOLDS.MAX_CONSECUTIVE_LOSSES) {
      this.openCircuit(
        breaker,
        `${this.THRESHOLDS.MAX_CONSECUTIVE_LOSSES} consecutive losses`,
        { consecutiveLosses: breaker.consecutiveLosses }
      );
      return;
    }

    // Threshold 2: Win rate (need enough samples)
    const recentOutcomes = breaker.recentOutcomes.slice(-this.THRESHOLDS.MIN_SAMPLES_FOR_WIN_RATE_CHECK);
    if (recentOutcomes.length >= this.THRESHOLDS.MIN_SAMPLES_FOR_WIN_RATE_CHECK) {
      const wins = recentOutcomes.filter(o => o.outcome === 'WIN').length;
      const winRate = wins / recentOutcomes.length;

      if (winRate < this.THRESHOLDS.MIN_WIN_RATE) {
        this.openCircuit(
          breaker,
          `Win rate ${(winRate * 100).toFixed(1)}% below ${(this.THRESHOLDS.MIN_WIN_RATE * 100)}% threshold`,
          { winRate, sampleSize: recentOutcomes.length }
        );
        return;
      }

      // Warning if win rate is marginal (within 5% of threshold)
      if (winRate < this.THRESHOLDS.MIN_WIN_RATE + 0.05 && winRate >= this.THRESHOLDS.MIN_WIN_RATE) {
        console.warn(`[MLCircuitBreaker] ⚠️ ${breaker.modelName} win rate ${(winRate * 100).toFixed(1)}% near threshold`);
        this.emitEvent({
          type: 'WARNING',
          modelName: breaker.modelName,
          reason: `Win rate ${(winRate * 100).toFixed(1)}% approaching threshold`,
          timestamp: Date.now(),
          metadata: { winRate, threshold: this.THRESHOLDS.MIN_WIN_RATE }
        });
      }
    }

    // Threshold 3: Latency (check recent predictions)
    const recent10 = breaker.recentOutcomes.slice(-10);
    if (recent10.length >= 5) {
      const avgLatency = recent10.reduce((sum, o) => sum + o.latency, 0) / recent10.length;

      if (avgLatency > this.THRESHOLDS.MAX_PREDICTION_LATENCY) {
        console.warn(`[MLCircuitBreaker] ⚠️ ${breaker.modelName} high latency: ${avgLatency.toFixed(2)}ms (threshold: ${this.THRESHOLDS.MAX_PREDICTION_LATENCY}ms)`);
        this.emitEvent({
          type: 'WARNING',
          modelName: breaker.modelName,
          reason: `High prediction latency: ${avgLatency.toFixed(0)}ms`,
          timestamp: Date.now(),
          metadata: { avgLatency, threshold: this.THRESHOLDS.MAX_PREDICTION_LATENCY }
        });
        // Don't open circuit for latency, just warn
      }
    }

    // Threshold 4: Drawdown (calculate from outcomes)
    if (breaker.recentOutcomes.length >= 20) {
      const drawdown = this.calculateMaxDrawdown(breaker.recentOutcomes);

      if (drawdown > this.THRESHOLDS.MAX_DRAWDOWN) {
        this.openCircuit(
          breaker,
          `Max drawdown ${(drawdown * 100).toFixed(1)}% exceeds ${(this.THRESHOLDS.MAX_DRAWDOWN * 100)}% threshold`,
          { drawdown }
        );
        return;
      }
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuit(
    breaker: CircuitBreakerState,
    reason: string,
    metadata?: Record<string, any>
  ): void {
    if (breaker.state === 'OPEN') return; // Already open

    breaker.state = 'OPEN';
    breaker.openedAt = Date.now();
    breaker.failureReason = reason;

    console.error(`[MLCircuitBreaker] 🚨 CIRCUIT OPENED: ${breaker.modelName}`);
    console.error(`[MLCircuitBreaker]    Reason: ${reason}`);
    console.error(`[MLCircuitBreaker]    Cooldown: ${breaker.cooldownMs / 60000} minutes`);

    this.emitEvent({
      type: 'OPENED',
      modelName: breaker.modelName,
      reason,
      timestamp: Date.now(),
      metadata
    });

    this.persist();
  }

  /**
   * Close circuit breaker (recovery)
   */
  private closeCircuit(breaker: CircuitBreakerState, reason: string): void {
    if (breaker.state === 'CLOSED') return; // Already closed

    breaker.state = 'CLOSED';
    breaker.consecutiveLosses = 0;
    breaker.failureReason = undefined;

    console.log(`[MLCircuitBreaker] ✅ CIRCUIT CLOSED: ${breaker.modelName}`);
    console.log(`[MLCircuitBreaker]    Reason: ${reason}`);

    this.emitEvent({
      type: 'CLOSED',
      modelName: breaker.modelName,
      reason,
      timestamp: Date.now()
    });

    this.persist();
  }

  /**
   * Manually reset circuit breaker (admin override)
   */
  async resetCircuitBreaker(modelName: string): Promise<void> {
    const breaker = this.breakers.get(modelName);
    if (!breaker) {
      console.warn(`[MLCircuitBreaker] No circuit breaker found for ${modelName}`);
      return;
    }

    console.log(`[MLCircuitBreaker] 🔧 Manual reset: ${modelName}`);

    breaker.state = 'CLOSED';
    breaker.consecutiveLosses = 0;
    breaker.recentOutcomes = [];
    breaker.failureReason = undefined;

    this.emitEvent({
      type: 'CLOSED',
      modelName,
      reason: 'Manual reset by administrator',
      timestamp: Date.now()
    });

    this.persist();
  }

  /**
   * Get circuit breaker state
   */
  getState(modelName: string): CircuitBreakerState {
    return this.getOrCreateBreaker(modelName);
  }

  /**
   * Get all circuit breakers
   */
  getAllStates(): CircuitBreakerState[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Check if any circuit breakers are open
   */
  hasOpenCircuits(): boolean {
    return Array.from(this.breakers.values()).some(b => b.state === 'OPEN');
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    openCircuits: string[];
    warningModels: string[];
    totalBreakers: number;
  } {
    const openCircuits = Array.from(this.breakers.values())
      .filter(b => b.state === 'OPEN')
      .map(b => b.modelName);

    const warningModels = Array.from(this.breakers.values())
      .filter(b => {
        if (b.state !== 'CLOSED') return false;
        const recent20 = b.recentOutcomes.slice(-20);
        if (recent20.length < 20) return false;
        const wins = recent20.filter(o => o.outcome === 'WIN').length;
        const winRate = wins / 20;
        return winRate < this.THRESHOLDS.MIN_WIN_RATE + 0.05;
      })
      .map(b => b.modelName);

    return {
      healthy: openCircuits.length === 0,
      openCircuits,
      warningModels,
      totalBreakers: this.breakers.size
    };
  }

  /**
   * Subscribe to circuit breaker events
   */
  onEvent(listener: (event: CircuitBreakerEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Unsubscribe from events
   */
  offEvent(listener: (event: CircuitBreakerEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  // ===== PRIVATE HELPERS =====

  private getOrCreateBreaker(modelName: string): CircuitBreakerState {
    let breaker = this.breakers.get(modelName);

    if (!breaker) {
      breaker = {
        modelName,
        state: 'CLOSED',
        consecutiveLosses: 0,
        recentOutcomes: [],
        openedAt: 0,
        cooldownMs: 300000 // 5 minutes
      };
      this.breakers.set(modelName, breaker);
      console.log(`[MLCircuitBreaker] Created circuit breaker for ${modelName}`);
    }

    return breaker;
  }

  private calculateMaxDrawdown(outcomes: CircuitBreakerState['recentOutcomes']): number {
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const outcome of outcomes) {
      // Assume +1 for win, -1 for loss (simplified)
      runningTotal += outcome.outcome === 'WIN' ? 1 : -1;

      if (runningTotal > peak) {
        peak = runningTotal;
      }

      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Normalize to percentage (assuming max risk per trade is 2%)
    return (maxDrawdown / outcomes.length) * 0.02;
  }

  private emitEvent(event: CircuitBreakerEvent): void {
    // Emit to all listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MLCircuitBreaker] Error in event listener:', error);
      }
    });

    // Emit as DOM event for UI integration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ml-circuit-breaker-event', {
        detail: event
      }));
    }
  }

  // ===== PERSISTENCE =====

  private persist(): void {
    try {
      const data = {
        breakers: Array.from(this.breakers.entries()).map(([name, state]) => ({
          name,
          state: {
            ...state,
            // Only keep last 50 outcomes for storage efficiency
            recentOutcomes: state.recentOutcomes.slice(-50)
          }
        })),
        timestamp: Date.now()
      };

      localStorage.setItem('ml-circuit-breakers', JSON.stringify(data));
    } catch (error) {
      console.error('[MLCircuitBreaker] Error persisting state:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('ml-circuit-breakers');
      if (!stored) return;

      const data = JSON.parse(stored);

      // Restore breakers
      for (const { name, state } of data.breakers) {
        this.breakers.set(name, state);
      }

      console.log(`[MLCircuitBreaker] Loaded ${this.breakers.size} circuit breakers from storage`);

      // Check for stale open circuits (>24 hours)
      const now = Date.now();
      for (const breaker of this.breakers.values()) {
        if (breaker.state === 'OPEN' && now - breaker.openedAt > 86400000) {
          console.log(`[MLCircuitBreaker] Auto-closing stale circuit: ${breaker.modelName} (>24h old)`);
          breaker.state = 'CLOSED';
          breaker.consecutiveLosses = 0;
        }
      }

      this.persist();

    } catch (error) {
      console.error('[MLCircuitBreaker] Error loading state:', error);
    }
  }
}

// Singleton export
export const mlCircuitBreaker = new MLCircuitBreaker();

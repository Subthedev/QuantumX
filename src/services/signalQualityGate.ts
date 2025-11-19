/**
 * Signal Quality Gate - Intelligent Signal Selection & Budget Management
 *
 * PURPOSE: Transform the Intelligence Hub from "spray and pray" to precision trading
 *
 * PROBLEM:
 * - Random signal generation creates noise, not alpha
 * - Too many signals = user overwhelm + poor metrics
 * - No quality control = timeouts dominate
 *
 * SOLUTION:
 * 1. Quality Scoring: Rank every potential signal (0-100)
 * 2. Daily Budget: Limit signals to sweet spot (e.g., 15-20 per day)
 * 3. Signal Spacing: No clustering, minimum 30-60 min between signals
 * 4. Smart Selection: Publish only the BEST signals from candidates
 *
 * RESULT: Higher win rate, better user experience, impressive hub metrics
 */

import type { HubSignal } from './globalHubService';
import type { ZetaMetrics } from './zetaLearningEngine';

// ===== CONFIGURATION =====

export interface QualityGateConfig {
  // Daily Budget
  maxSignalsPerDay: number;              // Max signals in 24 hours (default: 20)
  targetSignalsPerDay: number;           // Ideal signal count (default: 15)

  // Quality Thresholds
  minQualityScore: number;               // Minimum score to publish (default: 65)
  excellentScoreThreshold: number;       // Score for "excellent" signals (default: 85)

  // Timing Controls
  minTimeBetweenSignals: number;         // Minimum minutes between signals (default: 30)
  maxSignalsPerHour: number;             // Max signals per hour (default: 3)

  // Queue Management
  maxQueueSize: number;                  // Max pending candidates (default: 10)
  queueFlushInterval: number;            // How often to evaluate queue (ms) (default: 60000)
}

export const DEFAULT_CONFIG: QualityGateConfig = {
  maxSignalsPerDay: 100,  // PRODUCTION: High limit for continuous trading
  targetSignalsPerDay: 50,  // PRODUCTION: Target 2 signals per hour
  minQualityScore: 50,  // Only filter very low quality
  excellentScoreThreshold: 75,
  minTimeBetweenSignals: 0,  // 🔥 CRITICAL: REMOVE timing constraints - let quality decide!
  maxSignalsPerHour: 30,  // 🔥 CRITICAL: Remove hourly limit - database handles this
  maxQueueSize: 15,
  queueFlushInterval: 45000
};

// ===== QUALITY SCORING =====

export interface QualityFactors {
  confidence: number;              // Signal confidence (0-100)
  zetaPrediction: number;          // Zeta learning prediction (0-1)
  volatilityScore: number;         // Is volatility adequate? (0-1)
  marketRegimeScore: number;       // Is market regime favorable? (0-1)
  riskRewardRatio: number;         // R:R ratio (e.g., 2.0 = 2:1)
  strategyWinRate: number;         // Historical win rate of strategy (0-1)
  timeOfDay: number;               // Is it a good time? (0-1)
  recentPerformance: number;       // Recent signal quality (0-1)
}

export interface QualityScore {
  totalScore: number;              // Overall score (0-100)
  factors: QualityFactors;
  breakdown: string;               // Human-readable explanation
  recommendation: 'PUBLISH' | 'QUEUE' | 'REJECT';
}

// ===== CANDIDATE SIGNAL =====

export interface SignalCandidate {
  signal: HubSignal;
  qualityScore: QualityScore;
  receivedAt: number;              // When candidate was submitted
  priority: number;                // Calculated priority (higher = better)
}

// ===== BUDGET STATUS =====

export interface BudgetStatus {
  // Today's Usage
  signalsPublishedToday: number;
  signalsRemainingToday: number;
  budgetUsedPercent: number;

  // Timing
  lastSignalTime: number | null;
  minutesSinceLastSignal: number | null;
  canPublishNow: boolean;
  nextAvailableTime: number | null;

  // Queue
  queuedCandidates: number;
  topQueuedScore: number | null;

  // Performance
  todayWinRate: number;
  todayAvgReturn: number;
  qualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

// ===== SIGNAL QUALITY GATE =====

export class SignalQualityGate {
  private config: QualityGateConfig;

  // State
  private signalQueue: SignalCandidate[] = [];
  private publishedSignals: Array<{ timestamp: number; score: number }> = [];
  private lastFlushTime = Date.now();

  // Callbacks
  private onSignalPublished: ((signal: HubSignal) => Promise<void> | void) | null = null;

  // LocalStorage keys
  private readonly STORAGE_KEY_PUBLISHED = 'quality-gate-published-signals';
  private readonly STORAGE_KEY_LAST_FLUSH = 'quality-gate-last-flush';

  constructor(config: Partial<QualityGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[Quality Gate] Initialized with config:', this.config);

    // ✅ CRITICAL: Load persisted state from localStorage
    this.loadPersistedState();
  }

  /**
   * Load quality gate state from localStorage to survive page refreshes
   * CRITICAL: Without this, budget/timing tracking resets on refresh!
   */
  private loadPersistedState(): void {
    try {
      // Load published signals history
      const publishedStr = localStorage.getItem(this.STORAGE_KEY_PUBLISHED);
      if (publishedStr) {
        const published = JSON.parse(publishedStr);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Only keep signals from last 24 hours
        this.publishedSignals = published.filter((s: any) => s.timestamp > oneDayAgo);

        console.log(`[Quality Gate] 📥 Loaded ${this.publishedSignals.length} published signals from localStorage`);
        if (this.publishedSignals.length > 0) {
          const lastSignal = this.publishedSignals[this.publishedSignals.length - 1];
          const minutesAgo = Math.floor((Date.now() - lastSignal.timestamp) / 60000);
          console.log(`[Quality Gate] 📊 Last published signal: ${minutesAgo} minutes ago`);
        }
      } else {
        console.log(`[Quality Gate] 📥 No persisted state found - starting fresh`);
      }

      // Load last flush time
      const lastFlushStr = localStorage.getItem(this.STORAGE_KEY_LAST_FLUSH);
      if (lastFlushStr) {
        this.lastFlushTime = parseInt(lastFlushStr, 10);
      }
    } catch (error) {
      console.error('[Quality Gate] ❌ Error loading persisted state:', error);
    }
  }

  /**
   * Save quality gate state to localStorage
   */
  private savePersistedState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_PUBLISHED, JSON.stringify(this.publishedSignals));
      localStorage.setItem(this.STORAGE_KEY_LAST_FLUSH, this.lastFlushTime.toString());
    } catch (error) {
      console.error('[Quality Gate] ❌ Error saving persisted state:', error);
    }
  }

  /**
   * Submit a potential signal for evaluation
   *
   * Flow:
   * 1. Score the signal quality (0-100)
   * 2. Check if it meets minimum threshold
   * 3. Check budget and timing constraints
   * 4. Either publish immediately, queue, or reject
   */
  async submitCandidate(
    signal: HubSignal,
    factors: Partial<QualityFactors>
  ): Promise<{ accepted: boolean; reason: string; score?: number }> {

    // Step 1: Calculate quality score
    const qualityScore = this.calculateQualityScore(signal, factors);

    console.log(
      `\n[Quality Gate] 🎯 Evaluating ${signal.symbol} ${signal.direction}\n` +
      `   Total Score: ${qualityScore.totalScore.toFixed(1)}/100\n` +
      `   Recommendation: ${qualityScore.recommendation}\n` +
      `   Breakdown:\n` +
      `     • Confidence: ${(qualityScore.factors.confidence * 100).toFixed(1)}%\n` +
      `     • ML Prediction: ${(qualityScore.factors.zetaPrediction * 100).toFixed(1)}%\n` +
      `     • Volatility: ${(qualityScore.factors.volatilityScore * 100).toFixed(1)}%\n` +
      `     • Market Regime: ${(qualityScore.factors.marketRegimeScore * 100).toFixed(1)}%\n` +
      `     • Risk/Reward: ${(qualityScore.factors.riskRewardRatio * 100).toFixed(1)}%\n` +
      `     • Strategy Win Rate: ${(qualityScore.factors.strategyWinRate * 100).toFixed(1)}%`
    );

    // Step 2: Check minimum quality threshold
    if (qualityScore.totalScore < this.config.minQualityScore) {
      console.log(
        `\n❌ [Quality Gate] REJECTED: ${signal.symbol}\n` +
        `   Reason: Quality too low\n` +
        `   Score: ${qualityScore.totalScore.toFixed(1)} < ${this.config.minQualityScore} (minimum)\n` +
        `   This signal did NOT meet the quality threshold\n`
      );
      return {
        accepted: false,
        reason: `Quality too low (${qualityScore.totalScore.toFixed(1)} < ${this.config.minQualityScore})`,
        score: qualityScore.totalScore
      };
    }

    // Step 3: Check budget
    const budget = this.getBudgetStatus();

    console.log(
      `[Quality Gate] 📊 Budget Status: ${budget.signalsPublishedToday}/${this.config.maxSignalsPerDay} daily | ` +
      `Last signal: ${budget.minutesSinceLastSignal || 'never'}m ago | ` +
      `Can publish: ${budget.canPublishNow ? '✅' : '❌'}`
    );

    if (budget.signalsRemainingToday <= 0) {
      console.log(`[Quality Gate] ⛔ REJECTED ${signal.symbol} - Daily budget exhausted (${budget.signalsPublishedToday}/${this.config.maxSignalsPerDay})`);
      return {
        accepted: false,
        reason: 'Daily budget exhausted',
        score: qualityScore.totalScore
      };
    }

    // Step 4: Check timing constraints
    if (!budget.canPublishNow) {
      console.log(
        `[Quality Gate] ⏰ Timing constraint: ${signal.symbol} too soon | ` +
        `${budget.minutesSinceLastSignal}m since last < ${this.config.minTimeBetweenSignals}m required`
      );

      // Try to queue if excellent quality
      if (qualityScore.totalScore >= this.config.excellentScoreThreshold) {
        console.log(`[Quality Gate] 📥 Queuing ${signal.symbol} (excellent quality: ${qualityScore.totalScore.toFixed(1)})`);
        return this.addToQueue(signal, qualityScore);
      }

      console.log(`[Quality Gate] ⛔ REJECTED ${signal.symbol} - Too soon and quality not excellent enough`);
      return {
        accepted: false,
        reason: `Too soon (${budget.minutesSinceLastSignal}m < ${this.config.minTimeBetweenSignals}m)`,
        score: qualityScore.totalScore
      };
    }

    // Step 5: ALL approved signals publish immediately (continuous pipeline!)
    // No queueing - we need outcomes to learn from in this volatile market
    if (qualityScore.recommendation === 'PUBLISH' || qualityScore.recommendation === 'QUEUE') {
      console.log(
        `\n✅ [Quality Gate] APPROVED: ${signal.symbol} ${signal.direction}\n` +
        `   Score: ${qualityScore.totalScore.toFixed(1)}/100\n` +
        `   Action: Publishing immediately to database\n` +
        `   This signal PASSED all quality checks!\n` +
        `   🔄 Continuous pipeline: Signal will generate outcomes for learning\n`
      );
      await this.publishSignal(signal, qualityScore);
      return {
        accepted: true,
        reason: `Published (score: ${qualityScore.totalScore.toFixed(1)})`,
        score: qualityScore.totalScore
      };
    }

    // Step 7: Below threshold - reject
    console.log(
      `\n❌ [Quality Gate] REJECTED: ${signal.symbol}\n` +
      `   Score: ${qualityScore.totalScore.toFixed(1)}/100\n` +
      `   Reason: Below quality threshold\n`
    );
    return {
      accepted: false,
      reason: 'Quality below threshold',
      score: qualityScore.totalScore
    };
  }

  /**
   * Calculate comprehensive quality score
   *
   * Scoring Components:
   * - Base Confidence: 30% (signal's own confidence)
   * - Zeta Prediction: 20% (ML model prediction)
   * - Volatility: 15% (is market moving enough?)
   * - Market Regime: 10% (is regime favorable?)
   * - Risk/Reward: 10% (R:R ratio quality)
   * - Strategy Track Record: 10% (historical performance)
   * - Timing: 5% (time of day factors)
   */
  private calculateQualityScore(
    signal: HubSignal,
    factors: Partial<QualityFactors>
  ): QualityScore {

    // Normalize all factors to 0-1 scale
    // 🔥 CRITICAL FIX: factors.confidence is ALREADY in 0-1 range (converted in globalHubService)
    // DO NOT divide by 100 again or signals will be wrongly rejected!
    const normalized: QualityFactors = {
      confidence: factors.confidence !== undefined ? factors.confidence : (signal.confidence || 70) / 100,
      zetaPrediction: factors.zetaPrediction !== undefined ? factors.zetaPrediction : 0.5,
      volatilityScore: factors.volatilityScore !== undefined ? factors.volatilityScore : 0.7,
      marketRegimeScore: factors.marketRegimeScore !== undefined ? factors.marketRegimeScore : 0.6,
      riskRewardRatio: factors.riskRewardRatio !== undefined ? Math.min(factors.riskRewardRatio / 3.0, 1.0) : 0.67,
      strategyWinRate: factors.strategyWinRate !== undefined ? factors.strategyWinRate : 0.5,
      timeOfDay: factors.timeOfDay !== undefined ? factors.timeOfDay : this.calculateTimeOfDayScore(),
      recentPerformance: factors.recentPerformance !== undefined ? factors.recentPerformance : this.calculateRecentPerformance()
    };

    // Weighted scoring
    const weights = {
      confidence: 0.30,
      zetaPrediction: 0.20,
      volatilityScore: 0.15,
      marketRegimeScore: 0.10,
      riskRewardRatio: 0.10,
      strategyWinRate: 0.10,
      timeOfDay: 0.05,
      recentPerformance: 0.00  // Informational only for now
    };

    // Calculate weighted total
    let totalScore = 0;
    totalScore += normalized.confidence * weights.confidence * 100;
    totalScore += normalized.zetaPrediction * weights.zetaPrediction * 100;
    totalScore += normalized.volatilityScore * weights.volatilityScore * 100;
    totalScore += normalized.marketRegimeScore * weights.marketRegimeScore * 100;
    totalScore += normalized.riskRewardRatio * weights.riskRewardRatio * 100;
    totalScore += normalized.strategyWinRate * weights.strategyWinRate * 100;
    totalScore += normalized.timeOfDay * weights.timeOfDay * 100;

    // Determine recommendation
    let recommendation: 'PUBLISH' | 'QUEUE' | 'REJECT';
    if (totalScore >= this.config.excellentScoreThreshold) {
      recommendation = 'PUBLISH';
    } else if (totalScore >= this.config.minQualityScore) {
      recommendation = 'QUEUE';
    } else {
      recommendation = 'REJECT';
    }

    // Build explanation
    const breakdown = this.buildScoreBreakdown(normalized, weights, totalScore);

    return {
      totalScore,
      factors: normalized,
      breakdown,
      recommendation
    };
  }

  /**
   * Calculate time-of-day score
   *
   * Trading quality varies by time:
   * - Asian session: Lower volatility, fewer opportunities
   * - European session: Good liquidity, moderate volatility
   * - US session: High volatility, best opportunities
   * - Overlap periods: Excellent (EU+US overlap)
   */
  private calculateTimeOfDayScore(): number {
    const now = new Date();
    const hour = now.getUTCHours();

    // US Market Hours (14:30-21:00 UTC) - Best
    if (hour >= 14 && hour < 21) return 1.0;

    // EU+US Overlap (14:30-16:00 UTC) - Excellent
    if (hour >= 14 && hour < 16) return 1.0;

    // EU Market Hours (8:00-16:30 UTC) - Good
    if (hour >= 8 && hour < 17) return 0.8;

    // Asian Market Hours (0:00-8:00 UTC) - Moderate
    if (hour >= 0 && hour < 8) return 0.6;

    // Off hours - Lower
    return 0.4;
  }

  /**
   * Calculate recent performance score
   *
   * Looks at last 10 published signals to see if we're in a hot streak
   */
  private calculateRecentPerformance(): number {
    if (this.publishedSignals.length === 0) return 0.5;

    const recent = this.publishedSignals.slice(-10);
    const avgScore = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;

    return avgScore / 100; // Normalize to 0-1
  }

  /**
   * Build human-readable score breakdown
   */
  private buildScoreBreakdown(
    factors: QualityFactors,
    weights: Record<string, number>,
    total: number
  ): string {
    const lines: string[] = [];

    lines.push(`Total Score: ${total.toFixed(1)}/100`);
    lines.push(`Confidence: ${(factors.confidence * 100).toFixed(0)}% (weight: ${(weights.confidence * 100).toFixed(0)}%)`);
    lines.push(`Zeta ML: ${(factors.zetaPrediction * 100).toFixed(0)}% (weight: ${(weights.zetaPrediction * 100).toFixed(0)}%)`);
    lines.push(`Volatility: ${(factors.volatilityScore * 100).toFixed(0)}% (weight: ${(weights.volatilityScore * 100).toFixed(0)}%)`);
    lines.push(`Market Regime: ${(factors.marketRegimeScore * 100).toFixed(0)}% (weight: ${(weights.marketRegimeScore * 100).toFixed(0)}%)`);
    lines.push(`Risk/Reward: ${(factors.riskRewardRatio * 100).toFixed(0)}% (weight: ${(weights.riskRewardRatio * 100).toFixed(0)}%)`);

    return lines.join(' | ');
  }

  /**
   * Add signal to queue for later evaluation
   */
  private addToQueue(
    signal: HubSignal,
    qualityScore: QualityScore
  ): { accepted: boolean; reason: string; score: number } {

    // Check queue size
    if (this.signalQueue.length >= this.config.maxQueueSize) {
      // Queue full - only accept if better than worst in queue
      const worstInQueue = this.signalQueue[this.signalQueue.length - 1];

      if (qualityScore.totalScore <= worstInQueue.qualityScore.totalScore) {
        return {
          accepted: false,
          reason: 'Queue full and quality not competitive',
          score: qualityScore.totalScore
        };
      }

      // Remove worst signal
      this.signalQueue.pop();
    }

    // Add to queue
    const candidate: SignalCandidate = {
      signal,
      qualityScore,
      receivedAt: Date.now(),
      priority: qualityScore.totalScore
    };

    this.signalQueue.push(candidate);

    // Sort by priority (highest first)
    this.signalQueue.sort((a, b) => b.priority - a.priority);

    console.log(
      `[Quality Gate] Queued ${signal.symbol} (score: ${qualityScore.totalScore.toFixed(1)}) | ` +
      `Queue: ${this.signalQueue.length}/${this.config.maxQueueSize}`
    );

    return {
      accepted: true,
      reason: 'Queued for later evaluation',
      score: qualityScore.totalScore
    };
  }

  /**
   * Publish signal immediately
   */
  private async publishSignal(signal: HubSignal, qualityScore: QualityScore): Promise<void> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 [Quality Gate] publishSignal() CALLED`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Signal: ${signal.symbol} ${signal.direction}`);
    console.log(`Score: ${qualityScore.totalScore.toFixed(1)}/100`);
    console.log(`Callback registered: ${this.onSignalPublished ? '✅ YES' : '❌ NO'}`);

    // Record publication
    this.publishedSignals.push({
      timestamp: Date.now(),
      score: qualityScore.totalScore
    });

    // Clean old records (only keep last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.publishedSignals = this.publishedSignals.filter(s => s.timestamp > oneDayAgo);

    // ✅ CRITICAL: Save state to localStorage immediately after publishing
    this.savePersistedState();

    console.log(
      `[Quality Gate] 📊 Publication recorded\n` +
      `   Published signals today: ${this.publishedSignals.length}\n` +
      `   Budget remaining: ${this.config.maxSignalsPerDay - this.publishedSignals.length}\n`
    );

    // Trigger callback - CRITICAL: Await to catch errors!
    if (this.onSignalPublished) {
      console.log(`\n🔔 [Quality Gate] Triggering callback for ${signal.symbol}...`);
      try {
        await this.onSignalPublished(signal);
        console.log(`✅ [Quality Gate] Callback completed successfully for ${signal.symbol}`);
        console.log(`${'='.repeat(80)}\n`);
      } catch (error) {
        console.error(`\n${'='.repeat(80)}`);
        console.error(`❌ [Quality Gate] CRITICAL: Callback FAILED for ${signal.symbol}`);
        console.error(`${'='.repeat(80)}`);
        console.error(`Error:`, error);
        console.error(`Stack trace:`, (error as Error).stack);
        console.error(`${'='.repeat(80)}\n`);
      }
    } else {
      console.error(`\n${'='.repeat(80)}`);
      console.error(`❌ [Quality Gate] CRITICAL ERROR: NO CALLBACK REGISTERED!`);
      console.error(`${'='.repeat(80)}`);
      console.error(`Signal ${signal.symbol} was APPROVED but cannot be published!`);
      console.error(`The callback to publishApprovedSignal() is missing!`);
      console.error(`This means globalHubService.start() did not register the callback!`);
      console.error(`${'='.repeat(80)}\n`);
    }
  }

  /**
   * Periodically evaluate queue and publish best candidates
   *
   * Called every minute to check if we should publish queued signals
   */
  async flushQueue(): Promise<void> {
    if (this.signalQueue.length === 0) return;

    const now = Date.now();
    if (now - this.lastFlushTime < this.config.queueFlushInterval) {
      return; // Not time yet
    }

    this.lastFlushTime = now;

    const budget = this.getBudgetStatus();

    console.log(`[Quality Gate] 🔄 Queue flush: ${this.signalQueue.length} queued signals, budget: ${budget.canPublishNow ? '✅' : '❌'}`);

    // Can't publish if budget exhausted or timing constraints
    if (!budget.canPublishNow || budget.signalsRemainingToday <= 0) {
      console.log('[Quality Gate] ⏸️ Queue flush skipped (budget/timing constraints)');
      return;
    }

    // Publish top candidate
    const topCandidate = this.signalQueue.shift();
    if (topCandidate) {
      console.log(`[Quality Gate] 📤 Flushing queued signal: ${topCandidate.signal.symbol} (score: ${topCandidate.qualityScore.totalScore.toFixed(1)})`);
      await this.publishSignal(topCandidate.signal, topCandidate.qualityScore);
    }

    // Remove stale candidates (older than 15 minutes)
    const fifteenMinAgo = now - 15 * 60 * 1000;
    const beforeCount = this.signalQueue.length;
    this.signalQueue = this.signalQueue.filter(c => c.receivedAt > fifteenMinAgo);
    if (beforeCount > this.signalQueue.length) {
      console.log(`[Quality Gate] 🗑️ Removed ${beforeCount - this.signalQueue.length} stale signals from queue`);
    }
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): BudgetStatus {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Count signals in last 24 hours
    const signalsToday = this.publishedSignals.filter(s => s.timestamp > oneDayAgo);
    const signalsPublishedToday = signalsToday.length;
    const signalsRemainingToday = Math.max(0, this.config.maxSignalsPerDay - signalsPublishedToday);
    const budgetUsedPercent = (signalsPublishedToday / this.config.maxSignalsPerDay) * 100;

    // Last signal timing
    const lastSignal = signalsToday[signalsToday.length - 1];
    const lastSignalTime = lastSignal?.timestamp || null;
    const minutesSinceLastSignal = lastSignalTime
      ? Math.floor((now - lastSignalTime) / 60000)
      : null;

    // Check if we can publish now
    const canPublishNow =
      signalsRemainingToday > 0 &&
      (!lastSignalTime || minutesSinceLastSignal! >= this.config.minTimeBetweenSignals);

    // Next available time
    const nextAvailableTime = lastSignalTime && !canPublishNow
      ? lastSignalTime + (this.config.minTimeBetweenSignals * 60000)
      : null;

    // Queue info
    const queuedCandidates = this.signalQueue.length;
    const topQueuedScore = this.signalQueue[0]?.qualityScore.totalScore || null;

    // Performance (placeholder - will integrate with real tracking)
    const todayWinRate = 0;
    const todayAvgReturn = 0;
    const qualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';

    return {
      signalsPublishedToday,
      signalsRemainingToday,
      budgetUsedPercent,
      lastSignalTime,
      minutesSinceLastSignal,
      canPublishNow,
      nextAvailableTime,
      queuedCandidates,
      topQueuedScore,
      todayWinRate,
      todayAvgReturn,
      qualityTrend
    };
  }

  /**
   * Register callback for when signals are published
   */
  onPublish(callback: (signal: HubSignal) => Promise<void> | void): void {
    this.onSignalPublished = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QualityGateConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Quality Gate] Config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): QualityGateConfig {
    return { ...this.config };
  }

  /**
   * Reset daily budget (call at midnight)
   */
  resetDailyBudget(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.publishedSignals = this.publishedSignals.filter(s => s.timestamp > oneDayAgo);
    this.savePersistedState();
    console.log('[Quality Gate] Daily budget reset');
  }

  /**
   * Clear all quality gate state (for debugging)
   */
  clearState(): void {
    this.publishedSignals = [];
    this.signalQueue = [];
    this.lastFlushTime = Date.now();
    localStorage.removeItem(this.STORAGE_KEY_PUBLISHED);
    localStorage.removeItem(this.STORAGE_KEY_LAST_FLUSH);
    console.log('[Quality Gate] 🗑️ State cleared - fresh start');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { candidates: SignalCandidate[]; size: number } {
    return {
      candidates: [...this.signalQueue],
      size: this.signalQueue.length
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.signalQueue = [];
    console.log('[Quality Gate] Queue cleared');
  }
}

// Export singleton instance
export const signalQualityGate = new SignalQualityGate();

// Start queue flushing interval
setInterval(() => {
  signalQualityGate.flushQueue();
}, 60000); // Every minute

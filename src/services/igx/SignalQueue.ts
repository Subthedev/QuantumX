/**
 * PRIORITY SIGNAL QUEUE
 * Fast-tracks HIGH quality signals, queues MEDIUM signals for calm periods
 *
 * PURPOSE: Optimize throughput by prioritizing high-quality signals
 *
 * ARCHITECTURE:
 * Gamma V2 → SignalQueue (priority-based) → Delta V2
 *
 * FEATURES:
 * - Dual-priority queue (HIGH/MEDIUM)
 * - HIGH signals processed immediately
 * - MEDIUM signals queued for batch processing
 * - Automatic dequeue based on market conditions
 * - Size limits to prevent memory issues
 */

import type { GammaFilterDecision } from './IGXGammaV2';

export interface QueueStats {
  highPriorityCount: number;
  mediumPriorityCount: number;
  totalCount: number;
  processedCount: number;
  droppedCount: number;
  avgWaitTime: number; // ms
}

export class SignalQueue {
  // Dual priority queues
  private highPriorityQueue: GammaFilterDecision[] = [];
  private mediumPriorityQueue: GammaFilterDecision[] = [];

  // Size limits
  private readonly MAX_HIGH_QUEUE_SIZE = 50;
  private readonly MAX_MEDIUM_QUEUE_SIZE = 100;

  // Stats
  private stats = {
    processedCount: 0,
    droppedCount: 0,
    enqueueTimes: new Map<string, number>(), // Track enqueue time for wait time calculation
    totalWaitTime: 0
  };

  // Callbacks
  private onSignalCallback: ((decision: GammaFilterDecision) => void) | null = null;

  constructor() {
    console.log('[SignalQueue] 🎯 Initialized - Priority-based signal queue');

    // Listen for Gamma filtered signals
    if (typeof window !== 'undefined') {
      window.addEventListener('gamma-filtered-signal', this.handleGammaSignal.bind(this));
    }
  }

  /**
   * Handle signal from Gamma V2
   */
  private handleGammaSignal(event: CustomEvent): void {
    const decision: GammaFilterDecision = event.detail;
    console.log(
      `[SignalQueue] 📥 Received Gamma filtered signal: ${decision.consensus.symbol} ` +
      `(Priority: ${decision.priority})`
    );
    this.enqueue(decision);
  }

  /**
   * Enqueue signal with priority
   */
  enqueue(decision: GammaFilterDecision): void {
    const queueId = this.getQueueId(decision);

    // Track enqueue time
    this.stats.enqueueTimes.set(queueId, Date.now());

    if (decision.priority === 'HIGH') {
      // HIGH priority - add to HIGH queue (or process immediately if callback set)
      if (this.highPriorityQueue.length >= this.MAX_HIGH_QUEUE_SIZE) {
        console.warn('[SignalQueue] ⚠️ HIGH queue full - dropping oldest');
        this.highPriorityQueue.shift();
        this.stats.droppedCount++;
      }

      this.highPriorityQueue.push(decision);
      console.log(
        `[SignalQueue] ⚡ HIGH priority enqueued: ${decision.consensus.symbol} ` +
        `(Queue: ${this.highPriorityQueue.length})`
      );

      // Process HIGH immediately if callback is set
      if (this.onSignalCallback) {
        console.log(`[SignalQueue] → Callback registered, dequeuing HIGH priority signal...`);
        const signal = this.dequeue();
        if (signal) {
          console.log(`[SignalQueue] → Invoking callback for ${signal.consensus.symbol}`);
          this.onSignalCallback(signal);
        }
      } else {
        console.warn(`[SignalQueue] ⚠️ No callback registered! HIGH signal will remain in queue.`);
      }
    } else if (decision.priority === 'MEDIUM') {
      // MEDIUM priority - add to MEDIUM queue
      if (this.mediumPriorityQueue.length >= this.MAX_MEDIUM_QUEUE_SIZE) {
        console.warn('[SignalQueue] ⚠️ MEDIUM queue full - dropping oldest');
        this.mediumPriorityQueue.shift();
        this.stats.droppedCount++;
      }

      this.mediumPriorityQueue.push(decision);
      console.log(
        `[SignalQueue] 📋 MEDIUM priority enqueued: ${decision.consensus.symbol} ` +
        `(Queue: ${this.mediumPriorityQueue.length})`
      );

      // ✅ FIX: Process MEDIUM signals immediately too (not just HIGH)
      // The dequeue() method handles priority ordering (HIGH first, then MEDIUM)
      // So we can safely process immediately - HIGH signals will still be prioritized
      if (this.onSignalCallback) {
        console.log(`[SignalQueue] → Callback registered, dequeuing signal for processing...`);
        const signal = this.dequeue();
        if (signal) {
          console.log(`[SignalQueue] → Invoking callback for ${signal.consensus.symbol}`);
          this.onSignalCallback(signal);
        }
      } else {
        console.warn(`[SignalQueue] ⚠️ No callback registered! Signal will remain in queue.`);
      }
    }
  }

  /**
   * Dequeue next signal (HIGH priority first)
   */
  dequeue(): GammaFilterDecision | null {
    let signal: GammaFilterDecision | null = null;

    // Always process HIGH priority first
    if (this.highPriorityQueue.length > 0) {
      signal = this.highPriorityQueue.shift()!;
      console.log(`[SignalQueue] ⚡ Dequeued HIGH: ${signal.consensus.symbol}`);
    }
    // Then MEDIUM if no HIGH available
    else if (this.mediumPriorityQueue.length > 0) {
      signal = this.mediumPriorityQueue.shift()!;
      console.log(`[SignalQueue] 📋 Dequeued MEDIUM: ${signal.consensus.symbol}`);
    }

    if (signal) {
      this.stats.processedCount++;

      // Calculate wait time
      const queueId = this.getQueueId(signal);
      const enqueueTime = this.stats.enqueueTimes.get(queueId);
      if (enqueueTime) {
        const waitTime = Date.now() - enqueueTime;
        this.stats.totalWaitTime += waitTime;
        this.stats.enqueueTimes.delete(queueId);
        console.log(`[SignalQueue] ⏱️ Wait time: ${waitTime}ms`);
      }
    }

    return signal;
  }

  /**
   * Batch dequeue for processing multiple signals
   */
  dequeueBatch(maxCount: number): GammaFilterDecision[] {
    const batch: GammaFilterDecision[] = [];

    for (let i = 0; i < maxCount; i++) {
      const signal = this.dequeue();
      if (signal) {
        batch.push(signal);
      } else {
        break; // Queue empty
      }
    }

    if (batch.length > 0) {
      console.log(`[SignalQueue] 📦 Batch dequeued: ${batch.length} signals`);
    }

    return batch;
  }

  /**
   * Register callback for automatic processing
   */
  onSignal(callback: (decision: GammaFilterDecision) => void): void {
    this.onSignalCallback = callback;
    console.log('[SignalQueue] ✅ Registered automatic processing callback');

    // Process any existing signals in queue
    this.processQueuedSignals();
  }

  /**
   * Process all queued signals (HIGH first, then MEDIUM)
   */
  private processQueuedSignals(): void {
    if (!this.onSignalCallback) return;

    let signal = this.dequeue();
    while (signal) {
      this.onSignalCallback(signal);
      signal = this.dequeue();
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const avgWaitTime = this.stats.processedCount > 0
      ? this.stats.totalWaitTime / this.stats.processedCount
      : 0;

    return {
      highPriorityCount: this.highPriorityQueue.length,
      mediumPriorityCount: this.mediumPriorityQueue.length,
      totalCount: this.highPriorityQueue.length + this.mediumPriorityQueue.length,
      processedCount: this.stats.processedCount,
      droppedCount: this.stats.droppedCount,
      avgWaitTime
    };
  }

  /**
   * Clear all queues
   */
  clear(): void {
    const highCount = this.highPriorityQueue.length;
    const mediumCount = this.mediumPriorityQueue.length;

    this.highPriorityQueue = [];
    this.mediumPriorityQueue = [];
    this.stats.enqueueTimes.clear();

    console.log(`[SignalQueue] 🗑️ Cleared: ${highCount} HIGH + ${mediumCount} MEDIUM`);
  }

  /**
   * Get unique queue ID for tracking
   */
  private getQueueId(decision: GammaFilterDecision): string {
    return `${decision.consensus.symbol}-${decision.consensus.timestamp}`;
  }

  /**
   * Get current queue status (for monitoring)
   */
  getStatus(): string {
    const stats = this.getStats();
    return `HIGH: ${stats.highPriorityCount} | MEDIUM: ${stats.mediumPriorityCount} | Processed: ${stats.processedCount}`;
  }
}

// Singleton instance
export const signalQueue = new SignalQueue();

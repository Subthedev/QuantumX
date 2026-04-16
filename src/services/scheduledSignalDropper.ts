/**
 * SCHEDULED SIGNAL DROPPER - Production Grade
 *
 * Philosophy:
 * - Buffer signals as they're generated (don't publish immediately)
 * - Schedule drops based on tier: FREE (3/24h), PRO (15/24h), MAX (30/24h)
 * - When it's time to drop, select BEST signal by confidence
 * - Drop to UI with long expiry so it stays in signals tab
 *
 * No complex regime matching, no database dependency
 * Simple, fast, reliable
 */

import type { HubSignal } from './globalHubService';

export type UserTier = 'FREE' | 'PRO' | 'MAX';

interface BufferedSignal {
  signal: HubSignal;
  bufferedAt: number;
  confidence: number;
}

interface DropSchedule {
  FREE: number;   // Drop every X milliseconds
  PRO: number;
  MAX: number;
}

interface TierStats {
  nextDropTime: number;
  dropsToday: number;
  lastDropTime: number;
  bufferSize: number;
}

class ScheduledSignalDropper {
  // Signal buffer (sorted by confidence)
  private signalBuffer: BufferedSignal[] = [];

  // ✅ UNIFIED SIGNAL EXPERIENCE: Same interval for all users
  // 3-minute intervals for fast signal flow during acquisition phase
  private readonly DROP_INTERVALS: DropSchedule = {
    FREE: 3 * 60 * 1000,            // Every 3 minutes — fast flow
    PRO: 3 * 60 * 1000,             // Same as FREE (unified)
    MAX: 3 * 60 * 1000              // Same as FREE (unified)
  };

  // TESTING INTERVALS (for development):
  // FREE: 60 * 1000,              // Every 1 minute
  // PRO: 45 * 1000,               // Every 45 seconds
  // MAX: 30 * 1000                // Every 30 seconds

  // Track drops per tier
  private stats: Record<UserTier, TierStats> = {
    FREE: { nextDropTime: Date.now(), dropsToday: 0, lastDropTime: 0, bufferSize: 0 },
    PRO: { nextDropTime: Date.now(), dropsToday: 0, lastDropTime: 0, bufferSize: 0 },
    MAX: { nextDropTime: Date.now(), dropsToday: 0, lastDropTime: 0, bufferSize: 0 }
  };

  // Timer for checking drops
  private dropTimer: NodeJS.Timeout | null = null;

  // Callback for when signal should be published
  private onSignalDrop: ((signal: HubSignal, tier: UserTier) => void) | null = null;

  private isRunning = false;

  // ✅ FIX: Lock to prevent multiple concurrent drops
  private isDropping = false;

  constructor() {
    console.log('[ScheduledDropper] ✅ UNIFIED MODE - All users get same signal rate:');
    console.log(`  Interval: ${this.DROP_INTERVALS.FREE / (60 * 1000)} minutes (~144 signals/24h)`);
    console.log('[ScheduledDropper] 🎯 Unified signal distribution active!');
  }

  /**
   * Start the scheduled dropper
   */
  start() {
    if (this.isRunning) {
      console.log('[ScheduledDropper] Already running');
      return;
    }

    this.isRunning = true;

    // ✅ INSTANT DROP MODE: Drop first signal immediately when buffered
    // Then revert to normal intervals (48min for MAX, 96min for PRO, 8h for FREE)
    const now = Date.now();
    this.stats.FREE.nextDropTime = now; // Drop immediately when first signal buffered
    this.stats.PRO.nextDropTime = now;
    this.stats.MAX.nextDropTime = now;

    // ✅ FIX: Check for drops every 1 second for PRECISE timing
    // This ensures drops happen exactly when timer shows 0:00
    this.dropTimer = setInterval(() => {
      this.checkAndDrop();
    }, 1000); // ✅ Changed from 5000ms to 1000ms for precision

    console.log('[ScheduledDropper] ✅ Started - Checking for drops every 1 second (PRECISE TIMING)');
    console.log('[ScheduledDropper] 🚀 INSTANT DROP MODE: First signal will drop immediately!');
    console.log(`[ScheduledDropper] 📋 After first drop, signals every ${this.DROP_INTERVALS.FREE / (60 * 1000)} minutes (unified for all users)`);
  }

  /**
   * Stop the dropper
   */
  stop() {
    if (this.dropTimer) {
      clearInterval(this.dropTimer);
      this.dropTimer = null;
    }
    this.isRunning = false;
    console.log('[ScheduledDropper] Stopped');
  }

  /**
   * Register callback for when signal should be dropped
   */
  onDrop(callback: (signal: HubSignal, tier: UserTier) => void) {
    this.onSignalDrop = callback;
  }

  /**
   * Add signal to buffer
   */
  bufferSignal(signal: HubSignal) {
    // Add to buffer with metadata
    const buffered: BufferedSignal = {
      signal,
      bufferedAt: Date.now(),
      confidence: signal.confidence || signal.qualityScore || 0
    };

    this.signalBuffer.push(buffered);

    // Sort buffer by confidence (highest first)
    this.signalBuffer.sort((a, b) => b.confidence - a.confidence);

    // Keep only top 100 signals (prevent memory bloat)
    if (this.signalBuffer.length > 100) {
      this.signalBuffer = this.signalBuffer.slice(0, 100);
    }

    console.log(
      `[ScheduledDropper] 📥 Buffered: ${signal.symbol} ${signal.direction} ` +
      `(Confidence: ${buffered.confidence.toFixed(1)}) | Buffer: ${this.signalBuffer.length} signals`
    );

    // Update buffer size in stats
    this.stats.FREE.bufferSize = this.signalBuffer.length;
    this.stats.PRO.bufferSize = this.signalBuffer.length;
    this.stats.MAX.bufferSize = this.signalBuffer.length;
  }

  /**
   * Check if it's time to drop signals and drop them
   */
  private checkAndDrop(targetTier?: UserTier) {
    // ✅ FIX: Prevent concurrent drops
    if (this.isDropping) {
      console.log('[ScheduledDropper] ⏸️  Drop already in progress, skipping...');
      return;
    }

    if (this.signalBuffer.length === 0) {
      return; // No signals to drop
    }

    const now = Date.now();

    // Check specific tier if provided, otherwise use MAX
    const tier: UserTier = targetTier || 'MAX';
    const tierStats = this.stats[tier];

    // ✅ STRICT TIMING CHECK: Only drop within a 2-second window
    const timeDiff = now - tierStats.nextDropTime; // Positive if past drop time
    const timeUntilDrop = Math.floor((tierStats.nextDropTime - now) / 1000);

    // Not time yet - show countdown if close
    if (timeUntilDrop > 5) {
      return; // Too early, skip
    } else if (timeUntilDrop > 0) {
      console.log(`[ScheduledDropper] ⏱️  ${tier}: ${timeUntilDrop}s until next drop | Buffer: ${this.signalBuffer.length} signals`);
      return;
    }

    // ✅ STRICT CHECK: Only drop if within 2 seconds of scheduled time
    // This prevents multiple drops if scheduler gets stuck
    if (timeDiff < 0 || timeDiff > 2000) {
      if (timeDiff > 2000) {
        console.warn(`[ScheduledDropper] ⚠️  Drop window missed! ${tier} was ${Math.floor(timeDiff / 1000)}s late. Skipping to next interval.`);
        // Skip this drop and schedule next one
        tierStats.nextDropTime = now + this.DROP_INTERVALS[tier];
      }
      return;
    }

    // ✅ PERFECT TIMING: Within drop window!
    console.log(`\n[ScheduledDropper] 🚨 TIME TO DROP for ${tier}!`);
    console.log(`[ScheduledDropper]    Now: ${now}`);
    console.log(`[ScheduledDropper]    NextDropTime: ${tierStats.nextDropTime}`);
    console.log(`[ScheduledDropper]    Diff: ${timeDiff}ms (within 2s window ✓)`);

    // ✅ IMMEDIATELY update nextDropTime BEFORE dropping
    // This prevents multiple drops even if lock fails
    const oldNextDropTime = tierStats.nextDropTime;
    tierStats.nextDropTime = now + this.DROP_INTERVALS[tier];

    // ✅ FIX: Set lock
    this.isDropping = true;
    console.log(`[ScheduledDropper] 🔒 Lock acquired, nextDropTime updated to ${tierStats.nextDropTime}`);

    // Get best signal (highest confidence)
    const bestSignal = this.signalBuffer.shift(); // Remove from buffer

    if (bestSignal && this.onSignalDrop) {
      console.log('\n' + '='.repeat(80));
      console.log('⏰ [ScheduledDropper] TIME TO DROP SIGNAL');
      console.log('='.repeat(80));
      console.log(`Tier: ${tier}`);
      console.log(`Signal: ${bestSignal.signal.symbol} ${bestSignal.signal.direction}`);
      console.log(`Confidence: ${bestSignal.confidence.toFixed(1)}`);
      console.log(`Buffered for: ${Math.floor((now - bestSignal.bufferedAt) / 1000)}s`);
      console.log(`Buffer remaining: ${this.signalBuffer.length} signals`);

      // Set LONG expiry so signal stays in signals tab (not history)
      bestSignal.signal.expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
      bestSignal.signal.timeLimit = 24 * 60 * 60 * 1000;

      console.log('\n' + '🚀'.repeat(40));
      console.log('[ScheduledDropper] 🚀🚀🚀 CALLING onSignalDrop CALLBACK NOW! 🚀🚀🚀');
      console.log('[ScheduledDropper] This should trigger publishApprovedSignal in globalHubService');
      console.log('🚀'.repeat(40) + '\n');

      // Drop signal (publish to UI)
      this.onSignalDrop(bestSignal.signal, tier);

      console.log('\n' + '✅'.repeat(40));
      console.log('[ScheduledDropper] ✅ onSignalDrop callback completed');
      console.log('[ScheduledDropper] Check above for publishApprovedSignal logs');
      console.log('✅'.repeat(40) + '\n');

      // Update stats (nextDropTime already updated before drop to prevent race conditions)
      tierStats.dropsToday++;
      tierStats.lastDropTime = now;
      tierStats.bufferSize = this.signalBuffer.length;

      const nextDropIn = Math.floor((tierStats.nextDropTime - now) / 1000);
      console.log(`✅ Signal dropped! Next drop in ${nextDropIn} seconds`);
      console.log(`📊 Drops today: ${tierStats.dropsToday}`);
      console.log(`📊 Next drop at: ${new Date(tierStats.nextDropTime).toLocaleTimeString()}`);
      console.log('='.repeat(80) + '\n');

      // ✅ FIX: Release lock after drop completes
      setTimeout(() => {
        this.isDropping = false;
        console.log('[ScheduledDropper] 🔓 Drop lock released');
      }, 1000); // Wait 1 second to ensure distribution completes
    } else {
      // ✅ FIX: Release lock if no signal or callback
      this.isDropping = false;
    }
  }

  /**
   * Get stats for a tier
   */
  getStats(tier: UserTier) {
    const stats = this.stats[tier];
    const now = Date.now();
    const nextDropIn = Math.max(0, Math.floor((stats.nextDropTime - now) / 60000));

    return {
      tier,
      dropsToday: stats.dropsToday,
      lastDropTime: stats.lastDropTime,
      nextDropTime: stats.nextDropTime,
      nextDropInMinutes: nextDropIn,
      bufferSize: this.signalBuffer.length,
      dropInterval: this.DROP_INTERVALS[tier],
      dropIntervalMinutes: Math.floor(this.DROP_INTERVALS[tier] / 60000),
      topSignals: this.signalBuffer.slice(0, 5).map(s => ({
        symbol: s.signal.symbol,
        direction: s.signal.direction,
        confidence: s.confidence,
        bufferedFor: Math.floor((now - s.bufferedAt) / 1000)
      }))
    };
  }

  /**
   * Get all stats
   */
  getAllStats() {
    return {
      FREE: this.getStats('FREE'),
      PRO: this.getStats('PRO'),
      MAX: this.getStats('MAX'),
      bufferSize: this.signalBuffer.length,
      isRunning: this.isRunning
    };
  }

  /**
   * Force drop a signal (for testing)
   */
  forceDrop(tier: UserTier) {
    console.log(`\n[ScheduledDropper] 🧪 FORCE DROP REQUESTED for ${tier}`);

    if (this.signalBuffer.length === 0) {
      console.warn('[ScheduledDropper] ⚠️  BUFFER IS EMPTY - No signals to drop');
      console.log('[ScheduledDropper] 💡 Possible reasons:');
      console.log('  1. No signals have passed Delta yet (wait for Delta to approve signals)');
      console.log('  2. Delta thresholds too high (signals being rejected)');
      console.log('  3. Signals passed Delta but bufferSignal() not being called');
      console.log(`[ScheduledDropper] 📊 Current stats:`);
      console.log(`  - Scheduler running: ${this.isRunning}`);
      console.log(`  - Drops today: ${this.stats[tier].dropsToday}`);
      console.log(`  - Last drop: ${this.stats[tier].lastDropTime > 0 ? new Date(this.stats[tier].lastDropTime).toLocaleTimeString() : 'Never'}`);
      console.log('[ScheduledDropper] 👉 Check console for "📥 Buffering signal" messages');
      console.log('[ScheduledDropper] 👉 Check console for "✅ Delta Decision: PASSED" messages\n');
      return;
    }

    console.log(`[ScheduledDropper] ✅ Buffer has ${this.signalBuffer.length} signals`);
    console.log(`[ScheduledDropper] 📋 Best signal: ${this.signalBuffer[0].signal.symbol} ${this.signalBuffer[0].signal.direction} (${this.signalBuffer[0].confidence.toFixed(1)}%)`);
    this.stats[tier].nextDropTime = Date.now(); // Set to now
    this.checkAndDrop(tier); // ✅ FIX: Pass tier parameter to checkAndDrop
  }

  /**
   * Clear buffer (for testing)
   */
  clearBuffer() {
    console.log(`[ScheduledDropper] 🗑️ Clearing buffer (${this.signalBuffer.length} signals)`);
    this.signalBuffer = [];
  }

  /**
   * Reset all stats (for testing)
   */
  reset() {
    const now = Date.now();
    this.signalBuffer = [];
    this.stats = {
      FREE: { nextDropTime: now, dropsToday: 0, lastDropTime: 0, bufferSize: 0 },
      PRO: { nextDropTime: now, dropsToday: 0, lastDropTime: 0, bufferSize: 0 },
      MAX: { nextDropTime: now, dropsToday: 0, lastDropTime: 0, bufferSize: 0 }
    };
    console.log('[ScheduledDropper] 🔄 Reset complete');
  }
}

// Export singleton
export const scheduledSignalDropper = new ScheduledSignalDropper();

/**
 * ARENA SIGNAL GENERATOR
 *
 * High-frequency signal feed ONLY for Arena demo agents
 * Bypasses user tier rate limiting for maximum engagement and conversions
 *
 * Purpose: Make Arena addictive by ensuring agents trade frequently
 * Strategy: Independently generate signals for Arena at higher frequency
 * Result: Agents trade every 30 seconds instead of every 48+ minutes (FAST DEMO MODE)
 */

import { globalHubService, type HubSignal } from './globalHubService';

class ArenaSignalGenerator {
  private interval: NodeJS.Timeout | null = null;
  private readonly SIGNAL_FREQUENCY = 30 * 1000; // 30 seconds - FAST for demo
  private lastSignalTime = 0;
  private isRunning = false;

  /**
   * Start generating high-frequency signals for Arena
   */
  start() {
    if (this.isRunning) {
      console.log('[Arena Signals] ⚠️ Already running');
      return;
    }

    console.log('[Arena Signals] 🎪 Starting RAPID signal feed for Arena...');
    console.log(`[Arena Signals] ⚡ Signal frequency: ${this.SIGNAL_FREQUENCY / 1000}s (FAST MODE for maximum engagement)`);

    this.isRunning = true;
    this.lastSignalTime = 0; // Force immediate first broadcast

    // IMMEDIATE first broadcast (1 second after start)
    setTimeout(() => {
      console.log('[Arena Signals] 🚀 Triggering IMMEDIATE first signal broadcast...');
      this.processSignals();
    }, 1000);

    // Then check every 5 seconds for new signals
    this.interval = setInterval(() => {
      this.processSignals();
    }, 5000); // Check every 5 seconds (faster response)
  }

  /**
   * Process and broadcast signals to Arena
   */
  private async processSignals() {
    const now = Date.now();
    const timeSinceLastSignal = now - this.lastSignalTime;

    // Only broadcast if enough time has passed
    if (timeSinceLastSignal < this.SIGNAL_FREQUENCY) {
      const remainingSeconds = Math.floor((this.SIGNAL_FREQUENCY - timeSinceLastSignal) / 1000);
      console.log(`[Arena Signals] ⏳ Next signal in ${remainingSeconds}s...`);
      return;
    }

    // Get active signals from Hub
    const activeSignals = globalHubService.getActiveSignals();

    if (activeSignals.length === 0) {
      console.log('[Arena Signals] ⚠️ No signals available from Hub, waiting...');
      return;
    }

    // Sort by confidence and take top 3
    const topSignals = activeSignals
      .sort((a, b) => {
        const confA = a.confidence || a.qualityScore || 0;
        const confB = b.confidence || b.qualityScore || 0;
        return confB - confA;
      })
      .slice(0, 3);

    console.log('\n' + '━'.repeat(60));
    console.log('🎪 ARENA SIGNAL GENERATOR - Broadcasting Signals');
    console.log('━'.repeat(60));
    console.log(`📊 Available signals: ${activeSignals.length}`);
    console.log(`🎯 Broadcasting top ${topSignals.length} signals to Arena`);

    // Broadcast each signal
    topSignals.forEach((signal, idx) => {
      const confidence = signal.confidence || signal.qualityScore || 0;
      console.log(`   ${idx + 1}. ${signal.symbol} ${signal.direction} - ${confidence.toFixed(1)}% confidence`);

      // Emit signal event (Arena service will catch this)
      globalHubService.emit('signal:new', signal);
    });

    console.log('━'.repeat(60) + '\n');

    // Update last signal time
    this.lastSignalTime = now;
  }

  /**
   * Stop generating signals
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[Arena Signals] 🛑 Stopping signal generator...');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    console.log('[Arena Signals] ✅ Stopped');
  }

  /**
   * Check if generator is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get time until next signal
   */
  public getTimeUntilNext(): number {
    if (!this.isRunning) return 0;

    const timeSinceLastSignal = Date.now() - this.lastSignalTime;
    const remaining = Math.max(0, this.SIGNAL_FREQUENCY - timeSinceLastSignal);
    return Math.floor(remaining / 1000); // Return in seconds
  }
}

export const arenaSignalGenerator = new ArenaSignalGenerator();

/**
 * ARENA SIGNAL GENERATOR
 *
 * High-frequency signal feed ONLY for Arena demo agents
 *
 * ✅ CONFIGURABLE: Signal frequency can be controlled via:
 *   1. window.__ARENA_DEMO_MODE__ = true (30s fast mode)
 *   2. window.__ARENA_PRODUCTION_MODE__ = true (48min production mode)
 *   3. Default: Auto-detect based on environment
 *
 * Purpose: Make Arena addictive by ensuring agents trade frequently
 * Strategy: Independently generate signals for Arena at higher frequency
 */

import { globalHubService, type HubSignal } from './globalHubService';

// ✅ FIX: Configurable signal intervals
const SIGNAL_CONFIG = {
  // Demo mode: Fast signals for testing and development
  DEMO_INTERVAL_MS: 30 * 1000,        // 30 seconds
  // Production mode: Realistic interval for real trading
  PRODUCTION_INTERVAL_MS: 48 * 60 * 1000,  // 48 minutes
  // Check interval (how often to poll for signal readiness)
  CHECK_INTERVAL_MS: 5 * 1000,        // 5 seconds
};

/**
 * Determine if we're in demo mode
 * Priority: window flag > environment check > default to demo
 */
function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    // Explicit demo mode flag
    if ((window as any).__ARENA_DEMO_MODE__ === true) {
      return true;
    }
    // Explicit production mode flag
    if ((window as any).__ARENA_PRODUCTION_MODE__ === true) {
      return false;
    }
  }
  // Default to demo mode for development
  return true;
}

class ArenaSignalGenerator {
  private interval: NodeJS.Timeout | null = null;
  private lastSignalTime = 0;
  private isRunning = false;

  /**
   * Get current signal frequency based on mode
   */
  private get SIGNAL_FREQUENCY(): number {
    const demoMode = isDemoMode();
    return demoMode ? SIGNAL_CONFIG.DEMO_INTERVAL_MS : SIGNAL_CONFIG.PRODUCTION_INTERVAL_MS;
  }

  /**
   * Start generating signals for Arena
   * Mode is automatically detected based on window flags
   */
  start() {
    if (this.isRunning) {
      console.log('[Arena Signals] ⚠️ Already running');
      return;
    }

    const demoMode = isDemoMode();
    const frequency = this.SIGNAL_FREQUENCY;
    const modeLabel = demoMode ? 'DEMO' : 'PRODUCTION';
    const frequencyLabel = demoMode
      ? `${frequency / 1000}s (fast mode)`
      : `${Math.round(frequency / 60000)}min (production mode)`;

    console.log('[Arena Signals] 🎪 Starting signal feed for Arena...');
    console.log(`[Arena Signals] 📊 Mode: ${modeLabel}`);
    console.log(`[Arena Signals] ⚡ Signal frequency: ${frequencyLabel}`);

    if (!demoMode) {
      console.log('[Arena Signals] 💡 To switch to demo mode: window.__ARENA_DEMO_MODE__ = true');
    }

    this.isRunning = true;
    this.lastSignalTime = 0; // Force immediate first broadcast

    // IMMEDIATE first broadcast (1 second after start)
    setTimeout(() => {
      console.log('[Arena Signals] 🚀 Triggering IMMEDIATE first signal broadcast...');
      this.processSignals();
    }, 1000);

    // Then check at configured interval
    this.interval = setInterval(() => {
      this.processSignals();
    }, SIGNAL_CONFIG.CHECK_INTERVAL_MS);
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

  /**
   * Get current mode status
   */
  public getStatus(): {
    isRunning: boolean;
    mode: 'DEMO' | 'PRODUCTION';
    frequencyMs: number;
    frequencyLabel: string;
    lastSignalTime: number;
    nextSignalIn: number;
  } {
    const demoMode = isDemoMode();
    const frequency = this.SIGNAL_FREQUENCY;

    return {
      isRunning: this.isRunning,
      mode: demoMode ? 'DEMO' : 'PRODUCTION',
      frequencyMs: frequency,
      frequencyLabel: demoMode ? '30 seconds' : '48 minutes',
      lastSignalTime: this.lastSignalTime,
      nextSignalIn: this.getTimeUntilNext(),
    };
  }

  /**
   * Enable production mode (48 minute intervals)
   * Note: Requires restart to take effect
   */
  public enableProductionMode(): void {
    if (typeof window !== 'undefined') {
      (window as any).__ARENA_PRODUCTION_MODE__ = true;
      (window as any).__ARENA_DEMO_MODE__ = false;
      console.log('[Arena Signals] ⚙️ Production mode enabled. Restart generator to apply.');
    }
  }

  /**
   * Enable demo mode (30 second intervals)
   * Note: Requires restart to take effect
   */
  public enableDemoMode(): void {
    if (typeof window !== 'undefined') {
      (window as any).__ARENA_DEMO_MODE__ = true;
      (window as any).__ARENA_PRODUCTION_MODE__ = false;
      console.log('[Arena Signals] ⚙️ Demo mode enabled. Restart generator to apply.');
    }
  }
}

export const arenaSignalGenerator = new ArenaSignalGenerator();

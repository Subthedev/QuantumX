/**
 * PAGE VISIBILITY MANAGER - Prevent Timer Throttling in Background Tabs
 *
 * Ensures continuous signal generation even when tab is hidden
 * Prevents Chrome from throttling timers in background tabs
 *
 * Features:
 * - Monitors Page Visibility API
 * - Prevents timer throttling using requestAnimationFrame trick
 * - Tracks visibility state changes
 * - Maintains service operation when tab hidden
 * - Exposed on window for debugging
 */

interface VisibilityStats {
  isMonitoring: boolean;
  currentState: 'visible' | 'hidden';
  totalVisibilityChanges: number;
  timeHidden: number;
  timeHiddenFormatted: string;
  timeVisible: number;
  timeVisibleFormatted: string;
  lastStateChange: number;
  lastStateChangeFormatted: string;
  preventingThrottling: boolean;
}

class PageVisibilityManager {
  private isMonitoring = false;
  private isHidden = false;
  private animationFrameId: number | null = null;
  private totalVisibilityChanges = 0;
  private timeHidden = 0;
  private timeVisible = 0;
  private lastStateChange = 0;
  private hiddenStartTime: number | null = null;
  private visibleStartTime: number | null = null;

  /**
   * Start monitoring page visibility
   */
  start() {
    if (this.isMonitoring) {
      console.log('[Visibility] Already monitoring');
      return;
    }

    // Check if Page Visibility API is supported
    if (typeof document.hidden === 'undefined') {
      console.warn('[Visibility] ⚠️  Page Visibility API not supported in this browser');
      return;
    }

    this.isMonitoring = true;
    this.isHidden = document.hidden;
    this.lastStateChange = Date.now();

    // Set initial state
    if (this.isHidden) {
      this.hiddenStartTime = Date.now();
      this.preventThrottling();
    } else {
      this.visibleStartTime = Date.now();
    }

    console.log('[Visibility] 👁️  Starting visibility monitor...');
    console.log(`[Visibility] Initial state: ${this.isHidden ? 'HIDDEN' : 'VISIBLE'}`);
    console.log('[Visibility] ✅ Will maintain timers when tab is hidden');
    console.log('[Visibility] 🔧 Stats available at: window.pageVisibilityManager.getStats()');

    // Listen to visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Also listen to focus events as backup
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
  }

  /**
   * Stop monitoring page visibility
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);

    // Stop preventing throttling
    this.stopPreventThrottling();

    console.log('[Visibility] 🛑 Monitoring stopped');
  }

  /**
   * Handle visibility change event
   */
  private handleVisibilityChange = () => {
    const wasHidden = this.isHidden;
    this.isHidden = document.hidden;
    this.totalVisibilityChanges++;
    this.lastStateChange = Date.now();

    // Update time counters
    if (wasHidden && !this.isHidden) {
      // Tab became visible
      if (this.hiddenStartTime) {
        this.timeHidden += Date.now() - this.hiddenStartTime;
        this.hiddenStartTime = null;
      }
      this.visibleStartTime = Date.now();
    } else if (!wasHidden && this.isHidden) {
      // Tab became hidden
      if (this.visibleStartTime) {
        this.timeVisible += Date.now() - this.visibleStartTime;
        this.visibleStartTime = null;
      }
      this.hiddenStartTime = Date.now();
    }

    console.log('\n' + '👁️'.repeat(40));
    console.log(`[Visibility] State changed: ${wasHidden ? 'HIDDEN' : 'VISIBLE'} → ${this.isHidden ? 'HIDDEN' : 'VISIBLE'}`);
    console.log(`[Visibility] Total changes: ${this.totalVisibilityChanges}`);
    console.log('👁️'.repeat(40) + '\n');

    if (this.isHidden) {
      console.log('[Visibility] 🌙 Tab hidden - preventing timer throttling');
      this.preventThrottling();
    } else {
      console.log('[Visibility] ☀️  Tab visible - normal operation');
      this.stopPreventThrottling();
    }
  };

  /**
   * Handle window focus event (backup detection)
   */
  private handleFocus = () => {
    if (this.isHidden && !document.hidden) {
      console.log('[Visibility] 🔍 Focus event detected (backup check)');
      this.handleVisibilityChange();
    }
  };

  /**
   * Handle window blur event (backup detection)
   */
  private handleBlur = () => {
    if (!this.isHidden && document.hidden) {
      console.log('[Visibility] 🔍 Blur event detected (backup check)');
      this.handleVisibilityChange();
    }
  };

  /**
   * Prevent timer throttling in background tabs
   *
   * Chrome throttles timers (setInterval, setTimeout) to 1 second when tab is hidden
   * This trick uses requestAnimationFrame to keep timers running at normal speed
   *
   * How it works:
   * - requestAnimationFrame is NOT throttled in background tabs
   * - We create a continuous rAF loop while tab is hidden
   * - This prevents Chrome from throttling our setInterval timers
   */
  private preventThrottling() {
    if (this.animationFrameId !== null) {
      // Already preventing
      return;
    }

    console.log('[Visibility] 🚀 Starting rAF loop to prevent throttling');

    const tick = () => {
      if (this.isHidden && this.isMonitoring) {
        // Keep the loop going while tab is hidden
        this.animationFrameId = requestAnimationFrame(tick);
      } else {
        // Tab became visible or monitoring stopped
        this.animationFrameId = null;
      }
    };

    tick();
  }

  /**
   * Stop preventing timer throttling
   */
  private stopPreventThrottling() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log('[Visibility] ⏸️  Stopped rAF loop (normal browser timing)');
    }
  }

  /**
   * Get current visibility stats
   */
  getStats(): VisibilityStats {
    // Calculate current time in state
    let currentTimeHidden = this.timeHidden;
    let currentTimeVisible = this.timeVisible;

    if (this.hiddenStartTime) {
      currentTimeHidden += Date.now() - this.hiddenStartTime;
    }

    if (this.visibleStartTime) {
      currentTimeVisible += Date.now() - this.visibleStartTime;
    }

    return {
      isMonitoring: this.isMonitoring,
      currentState: this.isHidden ? 'hidden' : 'visible',
      totalVisibilityChanges: this.totalVisibilityChanges,
      timeHidden: currentTimeHidden,
      timeHiddenFormatted: this.formatDuration(currentTimeHidden),
      timeVisible: currentTimeVisible,
      timeVisibleFormatted: this.formatDuration(currentTimeVisible),
      lastStateChange: this.lastStateChange,
      lastStateChangeFormatted: this.formatTimestamp(this.lastStateChange),
      preventingThrottling: this.animationFrameId !== null
    };
  }

  /**
   * Format timestamp as readable string
   */
  private formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * Format duration in milliseconds as human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Check if tab is currently hidden
   */
  isTabHidden(): boolean {
    return this.isHidden;
  }

  /**
   * Check if currently preventing throttling
   */
  isPreventingThrottling(): boolean {
    return this.animationFrameId !== null;
  }
}

// Singleton instance
export const pageVisibilityManager = new PageVisibilityManager();

// Expose on window for debugging
if (typeof window !== 'undefined') {
  (window as any).pageVisibilityManager = pageVisibilityManager;
  console.log('[Visibility] 🔧 Exposed on window.pageVisibilityManager');
}

/**
 * PERSISTENT STATISTICS MANAGER
 * Manages 24-hour rolling statistics that survive page refreshes
 *
 * Features:
 * - Stores stats in localStorage
 * - Auto-resets every 24 hours
 * - Tracks data points, signals, errors
 * - Per-source statistics
 * - Real-time updates
 */

export interface PersistentStats {
  // 24-hour counters
  startTime: number;
  lastReset: number;
  totalDataPoints: number;
  totalSignals: number;
  totalErrors: number;
  totalTriggers: number;

  // Per-source stats
  sources: {
    [key: string]: {
      dataPoints: number;
      errors: number;
      latency: number;
      lastUpdate: number;
    };
  };

  // Performance metrics
  avgLatency: number;
  dataRate: number; // Data points per second
  signalRate: number; // Signals per hour
}

export class PersistentStatsManager {
  private stats: PersistentStats;
  private readonly STATS_KEY = 'igx-persistent-stats-v1';
  private readonly RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private saveInterval?: NodeJS.Timeout;

  constructor() {
    this.stats = this.loadStats();
    this.startAutoSave();

    // Emit initial stats
    this.emitStats();
  }

  /**
   * Load statistics from localStorage
   */
  private loadStats(): PersistentStats {
    if (typeof window === 'undefined') {
      return this.createFreshStats();
    }

    try {
      const saved = localStorage.getItem(this.STATS_KEY);
      if (saved) {
        const stats = JSON.parse(saved);

        // Check if stats need reset (24 hours passed)
        if (Date.now() - stats.lastReset > this.RESET_INTERVAL) {
          console.log('[PersistentStats] ⏰ Resetting 24-hour statistics');
          return this.createFreshStats();
        }

        console.log('[PersistentStats] ✅ Loaded persistent stats:', {
          uptime: this.formatUptime(Date.now() - stats.startTime),
          dataPoints: stats.totalDataPoints.toLocaleString(),
          signals: stats.totalSignals,
          sources: Object.keys(stats.sources).length
        });

        return stats;
      }
    } catch (error) {
      console.error('[PersistentStats] Error loading stats:', error);
    }

    return this.createFreshStats();
  }

  /**
   * Create fresh statistics object
   */
  private createFreshStats(): PersistentStats {
    const now = Date.now();
    console.log('[PersistentStats] 🆕 Creating fresh 24-hour statistics');

    return {
      startTime: now,
      lastReset: now,
      totalDataPoints: 0,
      totalSignals: 0,
      totalErrors: 0,
      totalTriggers: 0,
      sources: {},
      avgLatency: 0,
      dataRate: 0,
      signalRate: 0
    };
  }

  /**
   * Save statistics to localStorage
   */
  private saveStats() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('[PersistentStats] Error saving stats:', error);
    }
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave() {
    // Save every 30 seconds
    this.saveInterval = setInterval(() => {
      this.saveStats();
      this.emitStats();
    }, 30000);
  }

  /**
   * Record a data point from a source
   */
  recordDataPoint(source: string, latency: number = 0) {
    this.stats.totalDataPoints++;

    // Update source-specific stats
    if (!this.stats.sources[source]) {
      this.stats.sources[source] = {
        dataPoints: 0,
        errors: 0,
        latency: 0,
        lastUpdate: Date.now()
      };
    }

    const sourceStats = this.stats.sources[source];
    sourceStats.dataPoints++;
    sourceStats.lastUpdate = Date.now();

    // Update latency (exponential moving average)
    if (latency > 0) {
      sourceStats.latency = sourceStats.latency === 0
        ? latency
        : (sourceStats.latency * 0.9) + (latency * 0.1);
    }

    // Update overall average latency
    const allLatencies = Object.values(this.stats.sources)
      .map(s => s.latency)
      .filter(l => l > 0);

    if (allLatencies.length > 0) {
      this.stats.avgLatency = allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length;
    }

    // Update data rate (points per second)
    const uptimeSeconds = (Date.now() - this.stats.startTime) / 1000;
    this.stats.dataRate = this.stats.totalDataPoints / uptimeSeconds;
  }

  /**
   * Record a signal generated
   */
  recordSignal() {
    this.stats.totalSignals++;

    // Update signal rate (signals per hour)
    const uptimeHours = (Date.now() - this.stats.startTime) / (1000 * 60 * 60);
    this.stats.signalRate = this.stats.totalSignals / uptimeHours;

    // Emit signal generated event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-signal-generated', {
        detail: {
          totalSignals: this.stats.totalSignals,
          signalRate: this.stats.signalRate
        }
      }));
    }
  }

  /**
   * Record a trigger detected
   */
  recordTrigger() {
    this.stats.totalTriggers++;

    // Emit trigger event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-trigger-detected', {
        detail: {
          totalTriggers: this.stats.totalTriggers
        }
      }));
    }
  }

  /**
   * Record an error from a source
   */
  recordError(source: string) {
    this.stats.totalErrors++;

    if (!this.stats.sources[source]) {
      this.stats.sources[source] = {
        dataPoints: 0,
        errors: 0,
        latency: 0,
        lastUpdate: Date.now()
      };
    }

    this.stats.sources[source].errors++;
  }

  /**
   * Get current statistics
   */
  getStats(): PersistentStats & {
    uptime: string;
    uptimeMs: number;
    nextReset: string;
    timeUntilReset: string;
  } {
    const now = Date.now();
    const uptimeMs = now - this.stats.startTime;
    const resetTime = this.stats.lastReset + this.RESET_INTERVAL;
    const timeUntilReset = resetTime - now;

    return {
      ...this.stats,
      uptime: this.formatUptime(uptimeMs),
      uptimeMs,
      nextReset: new Date(resetTime).toISOString(),
      timeUntilReset: this.formatUptime(timeUntilReset)
    };
  }

  /**
   * Get stats for a specific source
   */
  getSourceStats(source: string) {
    return this.stats.sources[source] || null;
  }

  /**
   * Get all source names
   */
  getSources(): string[] {
    return Object.keys(this.stats.sources);
  }

  /**
   * Format uptime for display
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Emit statistics event
   */
  private emitStats() {
    if (typeof window !== 'undefined') {
      const stats = this.getStats();

      window.dispatchEvent(new CustomEvent('igx-system-stats', {
        detail: {
          uptime: stats.uptimeMs / 1000, // in seconds for compatibility
          totalSignals: stats.totalSignals,
          triggersDetected: stats.totalTriggers,
          averageLatency: Math.round(stats.avgLatency),
          dataQuality: this.calculateDataQuality()
        }
      }));
    }
  }

  /**
   * Calculate overall data quality (HIGH/MEDIUM/LOW)
   */
  private calculateDataQuality(): 'HIGH' | 'MEDIUM' | 'LOW' {
    const sources = Object.values(this.stats.sources);

    if (sources.length === 0) return 'LOW';

    // Calculate error rate
    const totalOps = this.stats.totalDataPoints + this.stats.totalErrors;
    const errorRate = totalOps > 0 ? (this.stats.totalErrors / totalOps) * 100 : 0;

    // Calculate active source percentage
    const recentSources = sources.filter(s => Date.now() - s.lastUpdate < 60000);
    const activePercent = (recentSources.length / sources.length) * 100;

    // Determine quality
    if (errorRate < 1 && activePercent > 80 && this.stats.avgLatency < 200) {
      return 'HIGH';
    } else if (errorRate < 5 && activePercent > 50 && this.stats.avgLatency < 500) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Force a manual save
   */
  forceSave() {
    this.saveStats();
    this.emitStats();
  }

  /**
   * Reset statistics (for testing/manual reset)
   */
  reset() {
    console.log('[PersistentStats] 🔄 Manual reset triggered');
    this.stats = this.createFreshStats();
    this.saveStats();
    this.emitStats();
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    // Final save
    this.saveStats();
  }
}

// Singleton instance
export const persistentStatsManager = new PersistentStatsManager();
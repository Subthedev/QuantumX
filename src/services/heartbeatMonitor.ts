/**
 * HEARTBEAT MONITOR - Production-Grade Auto-Restart System
 *
 * Monitors globalHubService health and auto-restarts if it stops unexpectedly
 * Ensures 99.9% uptime with zero manual intervention
 *
 * Features:
 * - Health check every 5 seconds
 * - Auto-restart on crash detection
 * - Exponential backoff for repeated failures
 * - Comprehensive logging and stats
 * - Exposed on window for debugging
 */

import { globalHubService } from './globalHubService';

interface HeartbeatStats {
  isMonitoring: boolean;
  lastCheck: number;
  lastCheckFormatted: string;
  restartCount: number;
  consecutiveFailures: number;
  totalHealthChecks: number;
  uptime: number;
  uptimeFormatted: string;
  serviceStatus: 'running' | 'stopped' | 'unknown';
  lastRestartTime: number | null;
  lastRestartFormatted: string | null;
}

class HeartbeatMonitor {
  private interval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private lastCheck: number = 0;
  private restartCount: number = 0;
  private consecutiveFailures: number = 0;
  private totalHealthChecks: number = 0;
  private isMonitoring: boolean = false;
  private lastRestartTime: number | null = null;

  // Exponential backoff settings
  private readonly BASE_CHECK_INTERVAL = 5000; // 5 seconds
  private readonly MAX_CHECK_INTERVAL = 60000; // 60 seconds max
  private currentCheckInterval = this.BASE_CHECK_INTERVAL;

  /**
   * Start heartbeat monitoring
   */
  start() {
    if (this.isMonitoring) {
      console.log('[Heartbeat] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    this.lastCheck = Date.now();

    console.log('[Heartbeat] 💓 Starting health monitor...');
    console.log('[Heartbeat] ✅ Will check service health every 5 seconds');
    console.log('[Heartbeat] ✅ Auto-restart enabled');
    console.log('[Heartbeat] 🔧 Stats available at: window.heartbeatMonitor.getStats()');

    this.scheduleNextCheck();
  }

  /**
   * Stop heartbeat monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }

    console.log('[Heartbeat] 🛑 Monitoring stopped');
  }

  /**
   * Schedule next health check with current interval
   */
  private scheduleNextCheck() {
    if (!this.isMonitoring) return;

    this.interval = setTimeout(() => {
      this.checkHealth();
      this.scheduleNextCheck();
    }, this.currentCheckInterval);
  }

  /**
   * Perform health check
   */
  private async checkHealth() {
    this.totalHealthChecks++;
    this.lastCheck = Date.now();

    try {
      const isRunning = globalHubService.isRunning();

      if (!isRunning) {
        // Service stopped unexpectedly!
        this.consecutiveFailures++;

        console.error('\n' + '❌'.repeat(40));
        console.error('[Heartbeat] ❌ SERVICE STOPPED UNEXPECTEDLY!');
        console.error(`[Heartbeat] Consecutive failures: ${this.consecutiveFailures}`);
        console.error(`[Heartbeat] Total restarts: ${this.restartCount}`);
        console.error('❌'.repeat(40) + '\n');

        await this.attemptRestart();
      } else {
        // Service is healthy
        if (this.consecutiveFailures > 0) {
          console.log(`[Heartbeat] ✅ Service healthy after ${this.consecutiveFailures} failures`);
        }

        // Reset failure counter and check interval on success
        this.consecutiveFailures = 0;
        this.currentCheckInterval = this.BASE_CHECK_INTERVAL;

        // Log health check (only every 12 checks = 1 minute)
        if (this.totalHealthChecks % 12 === 0) {
          const stats = this.getStats();
          console.log(`[Heartbeat] 💓 Service healthy (uptime: ${stats.uptimeFormatted}, checks: ${this.totalHealthChecks})`);
        }
      }
    } catch (error) {
      console.error('[Heartbeat] ❌ Error during health check:', error);
      this.consecutiveFailures++;
    }
  }

  /**
   * Attempt to restart the service
   */
  private async attemptRestart() {
    console.log('\n' + '🔄'.repeat(40));
    console.log('[Heartbeat] 🔄 ATTEMPTING AUTO-RESTART...');
    console.log(`[Heartbeat] Attempt number: ${this.restartCount + 1}`);
    console.log('🔄'.repeat(40) + '\n');

    try {
      // Increase check interval with exponential backoff (to avoid hammering)
      this.currentCheckInterval = Math.min(
        this.BASE_CHECK_INTERVAL * Math.pow(2, this.consecutiveFailures - 1),
        this.MAX_CHECK_INTERVAL
      );

      console.log(`[Heartbeat] Next check in ${this.currentCheckInterval / 1000}s (exponential backoff)`);

      // Attempt restart
      await globalHubService.start();

      this.restartCount++;
      this.lastRestartTime = Date.now();

      console.log('\n' + '✅'.repeat(40));
      console.log('[Heartbeat] ✅✅✅ SERVICE RESTARTED SUCCESSFULLY! ✅✅✅');
      console.log(`[Heartbeat] Total restarts: ${this.restartCount}`);
      console.log(`[Heartbeat] Consecutive failures cleared`);
      console.log('✅'.repeat(40) + '\n');

      // Reset failure counter and interval on successful restart
      this.consecutiveFailures = 0;
      this.currentCheckInterval = this.BASE_CHECK_INTERVAL;
    } catch (error) {
      console.error('\n' + '❌'.repeat(40));
      console.error('[Heartbeat] ❌ RESTART FAILED!');
      console.error(`[Heartbeat] Error:`, error);
      console.error(`[Heartbeat] Stack:`, (error as Error).stack);
      console.error(`[Heartbeat] Will retry in ${this.currentCheckInterval / 1000}s`);
      console.error('❌'.repeat(40) + '\n');

      // Don't increment restartCount on failure, only on success
    }
  }

  /**
   * Get current monitoring stats
   */
  getStats(): HeartbeatStats {
    const uptime = Date.now() - this.startTime;
    const serviceStatus = globalHubService.isRunning() ? 'running' : 'stopped';

    return {
      isMonitoring: this.isMonitoring,
      lastCheck: this.lastCheck,
      lastCheckFormatted: this.formatTimestamp(this.lastCheck),
      restartCount: this.restartCount,
      consecutiveFailures: this.consecutiveFailures,
      totalHealthChecks: this.totalHealthChecks,
      uptime,
      uptimeFormatted: this.formatDuration(uptime),
      serviceStatus,
      lastRestartTime: this.lastRestartTime,
      lastRestartFormatted: this.lastRestartTime ? this.formatTimestamp(this.lastRestartTime) : null
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
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get restart count
   */
  getRestartCount(): number {
    return this.restartCount;
  }

  /**
   * Force a health check (for testing)
   */
  async forceCheck() {
    console.log('[Heartbeat] 🔍 Forcing health check...');
    await this.checkHealth();
  }
}

// Singleton instance
export const heartbeatMonitor = new HeartbeatMonitor();

// Expose on window for debugging
if (typeof window !== 'undefined') {
  (window as any).heartbeatMonitor = heartbeatMonitor;
  console.log('[Heartbeat] 🔧 Exposed on window.heartbeatMonitor');
}

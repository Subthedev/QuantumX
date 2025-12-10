/**
 * SUPABASE RECONNECTION MANAGER - Production-Grade Connection Resilience
 *
 * Monitors Supabase real-time subscription status and auto-reconnects on failure
 * Ensures instant signal delivery always works, even after network interruptions
 *
 * Features:
 * - Monitors subscription status (SUBSCRIBED, CLOSED, CHANNEL_ERROR)
 * - Auto-reconnect with exponential backoff
 * - Prevents duplicate subscriptions
 * - Tracks connection uptime and reconnection events
 * - Exposed on window for debugging
 */

import { RealtimeChannel } from '@supabase/supabase-js';

export type ChannelStatus =
  | 'SUBSCRIBED'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'SUBSCRIPTION_ERROR'
  | 'UNKNOWN';

interface ReconnectionStats {
  isMonitoring: boolean;
  channelName: string | null;
  currentStatus: ChannelStatus;
  reconnectAttempts: number;
  successfulReconnects: number;
  connectionUptime: number;
  connectionUptimeFormatted: string;
  lastStatusChange: number;
  lastStatusChangeFormatted: string;
  nextReconnectDelay: number | null;
  isReconnecting: boolean;
}

class SupabaseReconnectionManager {
  private monitoredChannels: Map<string, RealtimeChannel> = new Map();
  private reconnectCallbacks: Map<string, () => Promise<void>> = new Map();
  private currentStatus: Map<string, ChannelStatus> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private successfulReconnects: Map<string, number> = new Map();
  private connectionStartTimes: Map<string, number> = new Map();
  private lastStatusChange: Map<string, number> = new Map();
  private isReconnecting: Map<string, boolean> = new Map();

  // Exponential backoff settings
  private readonly BASE_DELAY = 1000; // 1 second
  private readonly MAX_DELAY = 30000; // 30 seconds
  private readonly MAX_RETRIES = 10; // After 10 failures, stop trying

  /**
   * Monitor a Supabase channel for disconnections and auto-reconnect
   *
   * @param channelName - Unique identifier for this channel
   * @param channel - Supabase RealtimeChannel instance
   * @param onReconnect - Async callback to recreate subscription when reconnecting
   */
  monitorChannel(
    channelName: string,
    channel: RealtimeChannel,
    onReconnect: () => Promise<void>
  ) {
    console.log(`[Supabase Reconnect] 👁️  Monitoring channel: ${channelName}`);

    // Store channel and callback
    this.monitoredChannels.set(channelName, channel);
    this.reconnectCallbacks.set(channelName, onReconnect);
    this.reconnectAttempts.set(channelName, 0);
    this.successfulReconnects.set(channelName, 0);
    this.connectionStartTimes.set(channelName, Date.now());
    this.currentStatus.set(channelName, 'SUBSCRIBED');
    this.lastStatusChange.set(channelName, Date.now());
    this.isReconnecting.set(channelName, false);

    // Listen to channel status changes
    channel.on('system', {}, (payload: any) => {
      this.handleStatusChange(channelName, payload);
    });

    console.log(`[Supabase Reconnect] ✅ Channel ${channelName} is now monitored`);
    console.log(`[Supabase Reconnect] 🔧 Auto-reconnect enabled with exponential backoff`);
  }

  /**
   * Stop monitoring a channel
   */
  stopMonitoring(channelName: string) {
    this.monitoredChannels.delete(channelName);
    this.reconnectCallbacks.delete(channelName);
    this.reconnectAttempts.delete(channelName);
    this.successfulReconnects.delete(channelName);
    this.connectionStartTimes.delete(channelName);
    this.currentStatus.delete(channelName);
    this.lastStatusChange.delete(channelName);
    this.isReconnecting.delete(channelName);

    console.log(`[Supabase Reconnect] 🛑 Stopped monitoring channel: ${channelName}`);
  }

  /**
   * Handle status change from Supabase channel
   */
  private handleStatusChange(channelName: string, payload: any) {
    const status: ChannelStatus = payload?.event || 'UNKNOWN';
    const previousStatus = this.currentStatus.get(channelName);

    this.currentStatus.set(channelName, status);
    this.lastStatusChange.set(channelName, Date.now());

    console.log(`[Supabase Reconnect] 📡 Channel ${channelName} status: ${previousStatus} → ${status}`);

    // Handle different status events
    switch (status) {
      case 'SUBSCRIBED':
        this.handleSubscribed(channelName);
        break;

      case 'CLOSED':
        this.handleClosed(channelName);
        break;

      case 'CHANNEL_ERROR':
        this.handleError(channelName);
        break;

      case 'TIMED_OUT':
        this.handleTimeout(channelName);
        break;

      case 'SUBSCRIPTION_ERROR':
        this.handleSubscriptionError(channelName);
        break;

      default:
        console.log(`[Supabase Reconnect] ℹ️  Channel ${channelName} unknown status:`, payload);
    }
  }

  /**
   * Handle SUBSCRIBED status (connection successful)
   */
  private handleSubscribed(channelName: string) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;

    if (attempts > 0) {
      // This was a reconnection
      const reconnects = (this.successfulReconnects.get(channelName) || 0) + 1;
      this.successfulReconnects.set(channelName, reconnects);

      console.log('\n' + '✅'.repeat(40));
      console.log(`[Supabase Reconnect] ✅✅✅ RECONNECTED SUCCESSFULLY! ✅✅✅`);
      console.log(`[Supabase Reconnect] Channel: ${channelName}`);
      console.log(`[Supabase Reconnect] Total reconnections: ${reconnects}`);
      console.log('✅'.repeat(40) + '\n');
    } else {
      console.log(`[Supabase Reconnect] ✅ Channel ${channelName} connected`);
    }

    // Reset reconnection state
    this.reconnectAttempts.set(channelName, 0);
    this.connectionStartTimes.set(channelName, Date.now());
    this.isReconnecting.set(channelName, false);
  }

  /**
   * Handle CLOSED status (connection closed)
   */
  private handleClosed(channelName: string) {
    console.warn('\n' + '⚠️'.repeat(40));
    console.warn(`[Supabase Reconnect] ⚠️  CHANNEL CLOSED: ${channelName}`);
    console.warn('⚠️'.repeat(40) + '\n');

    this.attemptReconnection(channelName);
  }

  /**
   * Handle CHANNEL_ERROR status (channel error)
   */
  private handleError(channelName: string) {
    console.error('\n' + '❌'.repeat(40));
    console.error(`[Supabase Reconnect] ❌ CHANNEL ERROR: ${channelName}`);
    console.error('❌'.repeat(40) + '\n');

    this.attemptReconnection(channelName);
  }

  /**
   * Handle TIMED_OUT status (connection timed out)
   */
  private handleTimeout(channelName: string) {
    console.warn('\n' + '⏱️'.repeat(40));
    console.warn(`[Supabase Reconnect] ⏱️  CONNECTION TIMED OUT: ${channelName}`);
    console.warn('⏱️'.repeat(40) + '\n');

    this.attemptReconnection(channelName);
  }

  /**
   * Handle SUBSCRIPTION_ERROR status (subscription failed)
   */
  private handleSubscriptionError(channelName: string) {
    console.error('\n' + '❌'.repeat(40));
    console.error(`[Supabase Reconnect] ❌ SUBSCRIPTION ERROR: ${channelName}`);
    console.error('❌'.repeat(40) + '\n');

    this.attemptReconnection(channelName);
  }

  /**
   * Attempt to reconnect to the channel
   */
  private async attemptReconnection(channelName: string) {
    // Check if already reconnecting
    if (this.isReconnecting.get(channelName)) {
      console.log(`[Supabase Reconnect] ℹ️  Already reconnecting to ${channelName}, skipping`);
      return;
    }

    const attempts = (this.reconnectAttempts.get(channelName) || 0) + 1;
    this.reconnectAttempts.set(channelName, attempts);
    this.isReconnecting.set(channelName, true);

    // Check max retries
    if (attempts > this.MAX_RETRIES) {
      console.error('\n' + '🛑'.repeat(40));
      console.error(`[Supabase Reconnect] 🛑 MAX RETRIES REACHED (${this.MAX_RETRIES})`);
      console.error(`[Supabase Reconnect] Channel: ${channelName}`);
      console.error(`[Supabase Reconnect] MANUAL INTERVENTION REQUIRED`);
      console.error('[Supabase Reconnect] Please refresh the page');
      console.error('🛑'.repeat(40) + '\n');

      this.isReconnecting.set(channelName, false);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.BASE_DELAY * Math.pow(2, attempts - 1),
      this.MAX_DELAY
    );

    console.log('\n' + '🔄'.repeat(40));
    console.log(`[Supabase Reconnect] 🔄 RECONNECTING...`);
    console.log(`[Supabase Reconnect] Channel: ${channelName}`);
    console.log(`[Supabase Reconnect] Attempt: ${attempts}/${this.MAX_RETRIES}`);
    console.log(`[Supabase Reconnect] Delay: ${delay}ms`);
    console.log('🔄'.repeat(40) + '\n');

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, delay));

    // Get reconnection callback
    const onReconnect = this.reconnectCallbacks.get(channelName);
    if (!onReconnect) {
      console.error(`[Supabase Reconnect] ❌ No reconnection callback found for ${channelName}`);
      this.isReconnecting.set(channelName, false);
      return;
    }

    try {
      // Execute reconnection callback
      await onReconnect();

      console.log(`[Supabase Reconnect] ✅ Reconnection callback executed for ${channelName}`);
      // Status will be updated via handleStatusChange when subscription succeeds
    } catch (error) {
      console.error(`[Supabase Reconnect] ❌ Reconnection failed for ${channelName}:`, error);
      this.isReconnecting.set(channelName, false);

      // Try again recursively
      setTimeout(() => this.attemptReconnection(channelName), delay);
    }
  }

  /**
   * Get stats for a specific channel
   */
  getStats(channelName: string): ReconnectionStats | null {
    if (!this.monitoredChannels.has(channelName)) {
      return null;
    }

    const connectionStart = this.connectionStartTimes.get(channelName) || 0;
    const uptime = Date.now() - connectionStart;
    const lastChange = this.lastStatusChange.get(channelName) || 0;

    return {
      isMonitoring: true,
      channelName,
      currentStatus: this.currentStatus.get(channelName) || 'UNKNOWN',
      reconnectAttempts: this.reconnectAttempts.get(channelName) || 0,
      successfulReconnects: this.successfulReconnects.get(channelName) || 0,
      connectionUptime: uptime,
      connectionUptimeFormatted: this.formatDuration(uptime),
      lastStatusChange: lastChange,
      lastStatusChangeFormatted: this.formatTimestamp(lastChange),
      nextReconnectDelay: this.calculateNextDelay(channelName),
      isReconnecting: this.isReconnecting.get(channelName) || false
    };
  }

  /**
   * Get stats for all monitored channels
   */
  getAllStats(): Record<string, ReconnectionStats> {
    const stats: Record<string, ReconnectionStats> = {};

    for (const channelName of this.monitoredChannels.keys()) {
      const channelStats = this.getStats(channelName);
      if (channelStats) {
        stats[channelName] = channelStats;
      }
    }

    return stats;
  }

  /**
   * Calculate next reconnection delay
   */
  private calculateNextDelay(channelName: string): number | null {
    const attempts = this.reconnectAttempts.get(channelName) || 0;

    if (attempts === 0 || !this.isReconnecting.get(channelName)) {
      return null;
    }

    return Math.min(
      this.BASE_DELAY * Math.pow(2, attempts),
      this.MAX_DELAY
    );
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
   * Get list of monitored channels
   */
  getMonitoredChannels(): string[] {
    return Array.from(this.monitoredChannels.keys());
  }

  /**
   * Force a reconnection for a specific channel (for testing)
   */
  async forceReconnect(channelName: string) {
    console.log(`[Supabase Reconnect] 🔍 Forcing reconnection for ${channelName}...`);
    await this.attemptReconnection(channelName);
  }
}

// Singleton instance
export const supabaseReconnectionManager = new SupabaseReconnectionManager();

// Expose on window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabaseReconnectionManager = supabaseReconnectionManager;
  console.log('[Supabase Reconnect] 🔧 Exposed on window.supabaseReconnectionManager');
}

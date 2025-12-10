/**
 * SMART 24-HOUR SIGNAL DEDUPLICATION CACHE
 *
 * Production-grade deduplication system that prevents duplicate signals
 * for the same coin+direction within a 24-hour rolling window.
 *
 * Features:
 * - Fast O(1) lookups using Map data structure
 * - LocalStorage persistence (survives page refreshes)
 * - Automatic cleanup of expired entries
 * - Symbol normalization (BTCUSDT → BTC)
 * - Separate tracking for LONG/SHORT directions
 * - Time-remaining calculations
 *
 * Examples:
 * - BTC LONG (now) → BTC LONG (12h later) = BLOCKED ❌
 * - BTC LONG (now) → BTC SHORT (30m later) = ALLOWED ✅
 * - BTC LONG (now) → BTC LONG (24h later) = ALLOWED ✅
 */

export interface DedupCacheEntry {
  symbol: string;           // Normalized (e.g., "BTC")
  direction: 'LONG' | 'SHORT';
  timestamp: number;        // When signal was recorded
  key: string;              // Composite key: "BTC_LONG"
}

export interface DedupStats {
  totalChecks: number;
  duplicatesBlocked: number;
  cacheSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export class SignalDeduplicationCache {
  // Core cache storage: key = "BTC_LONG", value = timestamp
  private cache: Map<string, number> = new Map();

  // Configuration
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly STORAGE_KEY = 'ignitex-signal-cache-24h';
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup every 1 hour

  // Statistics
  private stats = {
    totalChecks: 0,
    duplicatesBlocked: 0
  };

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
    console.log('[Dedup Cache] ✅ Initialized with 24-hour rolling window');
  }

  /**
   * Check if signal should be blocked (duplicate within 24h)
   *
   * @param symbol - Trading symbol (e.g., "BTCUSDT", "BTC", "ETH")
   * @param direction - Signal direction ("LONG" or "SHORT")
   * @returns true if duplicate (should block), false if unique (allow)
   */
  isDuplicate(symbol: string, direction: 'LONG' | 'SHORT'): boolean {
    this.stats.totalChecks++;

    const key = this.getKey(symbol, direction);
    const timestamp = this.cache.get(key);

    if (!timestamp) {
      // No record found - not a duplicate
      return false;
    }

    const age = Date.now() - timestamp;

    if (age > this.CACHE_DURATION) {
      // Entry expired (>24h) - remove and allow
      this.cache.delete(key);
      this.saveToStorage();
      console.log(`[Dedup Cache] 🧹 Expired entry removed: ${key} (${Math.round(age / 3600000)}h old)`);
      return false;
    }

    // Within 24 hours - block as duplicate
    this.stats.duplicatesBlocked++;
    return true;
  }

  /**
   * Record a new signal (call after signal is approved)
   *
   * @param symbol - Trading symbol (e.g., "BTCUSDT", "BTC", "ETH")
   * @param direction - Signal direction ("LONG" or "SHORT")
   */
  recordSignal(symbol: string, direction: 'LONG' | 'SHORT'): void {
    const key = this.getKey(symbol, direction);
    const timestamp = Date.now();

    this.cache.set(key, timestamp);
    this.saveToStorage();

    console.log(
      `[Dedup Cache] 📝 Recorded: ${key} at ${new Date(timestamp).toLocaleTimeString()} (valid for 24h)`
    );
  }

  /**
   * Get time remaining until signal can repeat (in milliseconds)
   * Returns null if no restriction
   *
   * @param symbol - Trading symbol
   * @param direction - Signal direction
   * @returns milliseconds remaining, or null if no restriction
   */
  getTimeRemaining(symbol: string, direction: 'LONG' | 'SHORT'): number | null {
    const key = this.getKey(symbol, direction);
    const timestamp = this.cache.get(key);

    if (!timestamp) {
      return null; // No record
    }

    const elapsed = Date.now() - timestamp;
    const remaining = this.CACHE_DURATION - elapsed;

    return remaining > 0 ? remaining : null;
  }

  /**
   * Get human-readable time remaining
   *
   * @param symbol - Trading symbol
   * @param direction - Signal direction
   * @returns formatted string like "11h 26m" or null
   */
  getTimeRemainingFormatted(symbol: string, direction: 'LONG' | 'SHORT'): string | null {
    const remaining = this.getTimeRemaining(symbol, direction);

    if (!remaining) {
      return null;
    }

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    return `${hours}h ${minutes}m`;
  }

  /**
   * Get cache statistics
   *
   * @returns statistics object with cache metrics
   */
  getStats(): DedupStats {
    this.cleanup(); // Clean before calculating stats

    let oldest: number | null = null;
    let newest: number | null = null;

    this.cache.forEach(timestamp => {
      if (!oldest || timestamp < oldest) oldest = timestamp;
      if (!newest || timestamp > newest) newest = timestamp;
    });

    return {
      totalChecks: this.stats.totalChecks,
      duplicatesBlocked: this.stats.duplicatesBlocked,
      cacheSize: this.cache.size,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }

  /**
   * Get all cache entries (for debugging)
   *
   * @returns array of cache entries
   */
  getAllEntries(): DedupCacheEntry[] {
    const entries: DedupCacheEntry[] = [];

    this.cache.forEach((timestamp, key) => {
      const [symbol, direction] = key.split('_');
      entries.push({
        symbol,
        direction: direction as 'LONG' | 'SHORT',
        timestamp,
        key
      });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }

  /**
   * Clear all cache entries (for testing/debugging)
   */
  clearCache(): void {
    this.cache.clear();
    this.saveToStorage();
    console.log('[Dedup Cache] 🗑️  Cache cleared');
  }

  /**
   * Generate composite key from symbol + direction
   * Normalizes symbols: BTCUSDT → BTC, ETHUSDC → ETH
   *
   * @param symbol - Trading symbol
   * @param direction - Signal direction
   * @returns normalized key like "BTC_LONG"
   */
  private getKey(symbol: string, direction: 'LONG' | 'SHORT'): string {
    // Normalize symbol: Remove common trading pairs and convert to uppercase
    const cleanSymbol = symbol
      .toUpperCase()
      .replace(/USDT|USDC|USD|BUSD|PERP|\//g, '')
      .trim();

    return `${cleanSymbol}_${direction}`;
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((timestamp, key) => {
      if (now - timestamp > this.CACHE_DURATION) {
        toDelete.push(key);
      }
    });

    if (toDelete.length > 0) {
      toDelete.forEach(key => this.cache.delete(key));
      this.saveToStorage();

      console.log(
        `[Dedup Cache] 🧹 Cleanup: Removed ${toDelete.length} expired entries ` +
        `(cache size: ${this.cache.size})`
      );
    }
  }

  /**
   * Start automatic cleanup timer (runs every hour)
   */
  private startCleanupTimer(): void {
    // Clear existing timer if any
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Run cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    console.log('[Dedup Cache] ⏰ Automatic cleanup scheduled (every 1 hour)');
  }

  /**
   * Stop cleanup timer and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[Dedup Cache] ⏹️  Cleanup timer stopped');
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored) {
        const data = JSON.parse(stored);

        // Convert object back to Map with number values
        this.cache = new Map(
          Object.entries(data).map(([k, v]) => [k, Number(v)])
        );

        // Clean expired entries on load
        this.cleanup();

        console.log(
          `[Dedup Cache] 📂 Loaded ${this.cache.size} entries from storage`
        );
      } else {
        console.log('[Dedup Cache] 📂 No stored cache found, starting fresh');
      }
    } catch (error) {
      console.error('[Dedup Cache] ❌ Error loading from storage:', error);
      this.cache = new Map(); // Start fresh on error
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      // Convert Map to plain object for JSON serialization
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Handle QuotaExceededError gracefully
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[Dedup Cache] ⚠️  LocalStorage quota exceeded, clearing old entries...');

        // Keep only the newest 50 entries
        const entries = Array.from(this.cache.entries())
          .sort((a, b) => b[1] - a[1]) // Sort by timestamp, newest first
          .slice(0, 50);

        this.cache = new Map(entries);

        // Try saving again with reduced cache
        try {
          const data = Object.fromEntries(this.cache);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          console.log('[Dedup Cache] ✅ Cache reduced and saved successfully');
        } catch (retryError) {
          console.error('[Dedup Cache] ❌ Failed to save even after reduction:', retryError);
        }
      } else {
        console.error('[Dedup Cache] ❌ Error saving to storage:', error);
      }
    }
  }
}

// Singleton instance - use this throughout the application
export const signalDeduplicationCache = new SignalDeduplicationCache();

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).signalDeduplicationCache = signalDeduplicationCache;
  console.log('[Dedup Cache] 🔧 Available in console as: window.signalDeduplicationCache');
}

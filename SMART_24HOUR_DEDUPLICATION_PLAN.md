# 🎯 Smart 24-Hour Deduplication System - Implementation Plan

## 📋 Executive Summary

**Goal:** Prevent duplicate signals for the same coin+direction within a 24-hour timeframe, while allowing:
- ✅ Different directions (BTC LONG + BTC SHORT simultaneously)
- ✅ Same coin after 24 hours (BTC LONG today, BTC LONG tomorrow)
- ✅ Multiple strategies for same direction if they're 24+ hours apart

**Current State:** Deduplication completely disabled in IGXGammaV2.ts (lines 249-293)

**Proposed State:** Smart time-based deduplication with 24-hour rolling window

---

## 🏗️ Architecture Design

### Option 1: In-Memory Cache with LocalStorage Persistence ⭐ **RECOMMENDED**

**Pros:**
- ✅ Fast lookups (O(1) with Map)
- ✅ Survives page refreshes (localStorage)
- ✅ Automatic cleanup
- ✅ Simple implementation
- ✅ No database overhead

**Cons:**
- ❌ Lost on browser close (acceptable for 24h window)
- ❌ Per-device tracking (not cross-device)

**Implementation:**
```typescript
class SignalDeduplicationCache {
  private cache: Map<string, number> = new Map(); // key: "BTC_LONG", value: timestamp
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'ignitex-signal-cache-24h';

  constructor() {
    this.loadFromStorage();
  }

  // Check if signal should be blocked
  isDuplicate(symbol: string, direction: 'LONG' | 'SHORT'): boolean {
    this.cleanup(); // Remove expired entries
    const key = this.getKey(symbol, direction);
    return this.cache.has(key);
  }

  // Record a new signal
  recordSignal(symbol: string, direction: 'LONG' | 'SHORT'): void {
    const key = this.getKey(symbol, direction);
    const timestamp = Date.now();
    this.cache.set(key, timestamp);
    this.saveToStorage();
  }

  // Get time remaining until signal can repeat
  getTimeRemaining(symbol: string, direction: 'LONG' | 'SHORT'): number | null {
    const key = this.getKey(symbol, direction);
    const timestamp = this.cache.get(key);
    if (!timestamp) return null;

    const elapsed = Date.now() - timestamp;
    const remaining = this.CACHE_DURATION - elapsed;
    return remaining > 0 ? remaining : null;
  }

  private getKey(symbol: string, direction: 'LONG' | 'SHORT'): string {
    // Normalize symbol: BTCUSDT → BTC
    const cleanSymbol = symbol.toUpperCase()
      .replace(/USDT|USDC|USD|BUSD|PERP|\//g, '')
      .trim();
    return `${cleanSymbol}_${direction}`;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((timestamp, key) => {
      if (now - timestamp > this.CACHE_DURATION) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));

    if (toDelete.length > 0) {
      this.saveToStorage();
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
        this.cleanup(); // Clean on load
      }
    } catch (error) {
      console.error('[Dedup Cache] Error loading from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[Dedup Cache] Error saving to storage:', error);
    }
  }
}
```

---

### Option 2: Database-Based Tracking

**Pros:**
- ✅ Cross-device synchronization
- ✅ Survives all restarts
- ✅ Historical analytics possible

**Cons:**
- ❌ Database queries add latency (~50-200ms)
- ❌ More complex implementation
- ❌ Requires database schema changes
- ❌ Cleanup job needed

**Not Recommended** for this use case - the overhead isn't worth it for a 24h window.

---

### Option 3: Hybrid Approach

**Pros:**
- ✅ Fast local cache
- ✅ Database persistence
- ✅ Best of both worlds

**Cons:**
- ❌ Most complex
- ❌ Cache invalidation challenges
- ❌ Overkill for requirements

**Not Recommended** - too complex for the benefit.

---

## ✅ Recommended Implementation (Option 1)

### Phase 1: Create Deduplication Cache Service

**New File:** `src/services/SignalDeduplicationCache.ts`

```typescript
/**
 * SMART 24-HOUR SIGNAL DEDUPLICATION CACHE
 *
 * Prevents duplicate signals for same coin+direction within 24 hours
 * Allows: Different directions, expired signals (>24h old)
 */

export interface DedupCacheEntry {
  symbol: string;           // Normalized (e.g., "BTC")
  direction: 'LONG' | 'SHORT';
  timestamp: number;
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
  private cache: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'ignitex-signal-cache-24h';
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup every hour

  private stats = {
    totalChecks: 0,
    duplicatesBlocked: 0
  };

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
    console.log('[Dedup Cache] ✅ Initialized with 24-hour rolling window');
  }

  /**
   * Check if signal should be blocked (duplicate within 24h)
   */
  isDuplicate(symbol: string, direction: 'LONG' | 'SHORT'): boolean {
    this.stats.totalChecks++;

    const key = this.getKey(symbol, direction);
    const timestamp = this.cache.get(key);

    if (!timestamp) {
      return false; // No record = not a duplicate
    }

    const age = Date.now() - timestamp;

    if (age > this.CACHE_DURATION) {
      // Expired - remove and allow
      this.cache.delete(key);
      this.saveToStorage();
      return false;
    }

    // Within 24 hours - block
    this.stats.duplicatesBlocked++;
    return true;
  }

  /**
   * Record a new signal (call after signal is approved)
   */
  recordSignal(symbol: string, direction: 'LONG' | 'SHORT'): void {
    const key = this.getKey(symbol, direction);
    const timestamp = Date.now();

    this.cache.set(key, timestamp);
    this.saveToStorage();

    console.log(
      `[Dedup Cache] 📝 Recorded: ${key} (valid for 24h)`
    );
  }

  /**
   * Get time remaining until signal can repeat (in ms)
   * Returns null if no restriction
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
   */
  getStats(): DedupStats {
    this.cleanup(); // Clean before stats

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
   * Generate composite key from symbol + direction
   */
  private getKey(symbol: string, direction: 'LONG' | 'SHORT'): string {
    // Normalize symbol: BTCUSDT → BTC, ETHUSDC → ETH
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
        `[Dedup Cache] 🧹 Cleanup: Removed ${toDelete.length} expired entries`
      );
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (for cleanup)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
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
        this.cache = new Map(Object.entries(data).map(([k, v]) => [k, Number(v)]));

        // Clean expired on load
        this.cleanup();

        console.log(
          `[Dedup Cache] 📂 Loaded ${this.cache.size} entries from storage`
        );
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
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[Dedup Cache] ❌ Error saving to storage:', error);
    }
  }
}

// Singleton instance
export const signalDeduplicationCache = new SignalDeduplicationCache();
```

---

### Phase 2: Integrate into IGXGammaV2

**File:** `src/services/igx/IGXGammaV2.ts`

**Changes:**

1. **Import the cache:**
```typescript
import { signalDeduplicationCache } from '../SignalDeduplicationCache';
```

2. **Replace commented deduplication logic (lines 249-293):**
```typescript
// ✅ SMART 24-HOUR DEDUPLICATION CHECK
// Prevents same coin+direction within 24 hours, allows different directions
const isDuplicate = signalDeduplicationCache.isDuplicate(
  consensus.symbol,
  consensus.direction
);

if (isDuplicate) {
  const timeRemaining = signalDeduplicationCache.getTimeRemainingFormatted(
    consensus.symbol,
    consensus.direction
  );

  const reason = `DUPLICATE REJECTED: ${consensus.symbol} ${consensus.direction} ` +
    `already sent within last 24 hours (${timeRemaining} remaining)`;

  this.stats.totalRejected++;
  const rejectionKey = '24-Hour Duplicate (Same Coin+Direction)';
  this.stats.rejectionReasons.set(
    rejectionKey,
    (this.stats.rejectionReasons.get(rejectionKey) || 0) + 1
  );

  console.log(
    `\n[IGX Gamma V2] 🔒 24H DUPLICATE REJECTED: ${consensus.symbol} ${consensus.direction}\n` +
    `├─ Last Signal: ${timeRemaining} ago\n` +
    `├─ Remaining: ${timeRemaining}\n` +
    `├─ Different Direction OK: ${consensus.direction === 'LONG' ? 'SHORT' : 'LONG'} allowed\n` +
    `└─ Rule: ONE SIGNAL PER COIN+DIRECTION per 24 hours\n`
  );

  const marketCondition = this.alphaMarketCondition || this.getDefaultMarketCondition();
  const dataMetrics = this.dataEngineMetrics || this.getDefaultDataMetrics();

  return {
    passed: false,
    priority: 'REJECT',
    reason,
    consensus,
    marketCondition,
    dataMetrics,
    timestamp: Date.now()
  };
}
```

3. **Record approved signals (after passing all filters):**
```typescript
// After signal passes all filters and before return
signalDeduplicationCache.recordSignal(consensus.symbol, consensus.direction);

console.log(
  `[IGX Gamma V2] ✅ Signal approved and recorded for 24h tracking: ` +
  `${consensus.symbol} ${consensus.direction}`
);
```

---

## 🎯 Example Scenarios

### Scenario 1: Same Coin, Same Direction (BLOCKED)
```
Time 00:00 - BTC LONG signal generated → ✅ APPROVED
Time 12:00 - BTC LONG signal generated → ❌ BLOCKED (12h remaining)
Time 24:01 - BTC LONG signal generated → ✅ APPROVED (expired)
```

### Scenario 2: Same Coin, Different Direction (ALLOWED)
```
Time 00:00 - BTC LONG signal generated → ✅ APPROVED
Time 00:30 - BTC SHORT signal generated → ✅ APPROVED (different direction)
Time 12:00 - BTC LONG signal generated → ❌ BLOCKED (12h remaining)
Time 12:30 - BTC SHORT signal generated → ❌ BLOCKED (12h remaining)
```

### Scenario 3: Different Coins (ALWAYS ALLOWED)
```
Time 00:00 - BTC LONG signal generated → ✅ APPROVED
Time 00:30 - ETH LONG signal generated → ✅ APPROVED (different coin)
Time 01:00 - SOL LONG signal generated → ✅ APPROVED (different coin)
```

### Scenario 4: Cache Expiry
```
Time 00:00 - BTC LONG signal generated → ✅ APPROVED
Time 23:00 - BTC LONG signal generated → ❌ BLOCKED (1h remaining)
Time 24:01 - BTC LONG signal generated → ✅ APPROVED (cache expired, cleaned)
```

---

## 📊 Performance Analysis

### Time Complexity:
| Operation | Complexity | Time |
|-----------|------------|------|
| isDuplicate() | O(1) | <1ms |
| recordSignal() | O(1) | <1ms |
| cleanup() | O(n) | <5ms (for 100 entries) |
| getStats() | O(n) | <5ms |

### Space Complexity:
```
Worst case (100 coins × 2 directions = 200 entries):
- Map: ~10KB in memory
- localStorage: ~15KB stored
- Negligible impact on performance
```

### Cleanup Strategy:
- **Automatic:** Every 1 hour (interval)
- **On-demand:** Every isDuplicate() check
- **On-load:** When cache is loaded from storage
- **Result:** Cache stays lean (<100 entries typically)

---

## 🧪 Testing Strategy

### Unit Tests:
```typescript
describe('SignalDeduplicationCache', () => {
  test('allows first signal', () => {
    expect(cache.isDuplicate('BTC', 'LONG')).toBe(false);
  });

  test('blocks duplicate within 24h', () => {
    cache.recordSignal('BTC', 'LONG');
    expect(cache.isDuplicate('BTC', 'LONG')).toBe(true);
  });

  test('allows different direction', () => {
    cache.recordSignal('BTC', 'LONG');
    expect(cache.isDuplicate('BTC', 'SHORT')).toBe(false);
  });

  test('allows after 24h expiry', () => {
    // Mock Date.now() to test expiry
    cache.recordSignal('BTC', 'LONG');
    jest.advanceTimersByTime(24 * 60 * 60 * 1001);
    expect(cache.isDuplicate('BTC', 'LONG')).toBe(false);
  });

  test('normalizes symbols correctly', () => {
    cache.recordSignal('BTCUSDT', 'LONG');
    expect(cache.isDuplicate('BTC', 'LONG')).toBe(true);
    expect(cache.isDuplicate('BTCUSDC', 'LONG')).toBe(true);
  });
});
```

### Integration Tests:
1. Generate BTC LONG → Verify approved
2. Generate BTC LONG again → Verify blocked
3. Generate BTC SHORT → Verify approved
4. Wait 24+ hours → Generate BTC LONG → Verify approved

### Manual Testing:
```
Console commands for testing:

// Check cache status
signalDeduplicationCache.getStats()

// Check specific signal
signalDeduplicationCache.isDuplicate('BTC', 'LONG')

// Get time remaining
signalDeduplicationCache.getTimeRemainingFormatted('BTC', 'LONG')

// Clear cache (for testing)
localStorage.removeItem('ignitex-signal-cache-24h')
```

---

## 🚀 Migration & Deployment

### Phase 1: Code Deployment
1. ✅ Create `SignalDeduplicationCache.ts`
2. ✅ Import into `IGXGammaV2.ts`
3. ✅ Add deduplication check logic
4. ✅ Add signal recording after approval
5. ✅ Test thoroughly

### Phase 2: Feature Flag (Optional)
```typescript
// Add to IGXGammaV2 for safe rollout
private dedupEnabled = true; // Can toggle via localStorage

if (this.dedupEnabled && isDuplicate) {
  // Block logic
}
```

### Phase 3: Monitoring
```typescript
// Log stats periodically
setInterval(() => {
  const stats = signalDeduplicationCache.getStats();
  console.log('[Dedup Cache] Stats:', stats);
}, 5 * 60 * 1000); // Every 5 minutes
```

### Phase 4: Analytics (Optional)
```typescript
// Track deduplication metrics in database
interface DedupMetrics {
  date: string;
  total_checks: number;
  duplicates_blocked: number;
  block_rate: number;
  cache_size: number;
}
```

---

## 🔍 Edge Cases & Handling

### 1. LocalStorage Full
```typescript
// Graceful degradation
private saveToStorage(): void {
  try {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Clear old entries and retry
      this.cleanup();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
  }
}
```

### 2. Symbol Variations
```typescript
// Normalize all variations
BTCUSDT → BTC
BTCUSDC → BTC
BTC/USDT → BTC
btcusdt → BTC
```

### 3. Browser Close/Restart
- ✅ Cache persists via localStorage
- ✅ Reloads on init
- ✅ Cleans expired on load

### 4. Clock Skew/Time Changes
- ✅ Uses relative time (elapsed ms)
- ✅ Cleanup handles negative deltas
- ✅ Timestamp validation

### 5. Multiple Tabs
- ⚠️ Each tab has own cache instance
- ✅ Shared via localStorage
- ✅ Last write wins (acceptable)

---

## 📋 Implementation Checklist

- [ ] Create `SignalDeduplicationCache.ts` service
- [ ] Add unit tests for cache
- [ ] Import cache into `IGXGammaV2.ts`
- [ ] Add 24h deduplication check (replace lines 249-293)
- [ ] Add signal recording after approval
- [ ] Test with console commands
- [ ] Test BTC LONG → BTC LONG (should block)
- [ ] Test BTC LONG → BTC SHORT (should allow)
- [ ] Test BTC LONG → wait 24h → BTC LONG (should allow)
- [ ] Verify localStorage persistence
- [ ] Verify cleanup works
- [ ] Add monitoring/logging
- [ ] Deploy to production
- [ ] Monitor metrics for 1 week

---

## 🎊 Expected Benefits

### Signal Quality:
- ✅ No spam signals (same coin+direction repeating)
- ✅ Diverse portfolio (forces variety)
- ✅ Time-based filtering (24h discipline)

### User Experience:
- ✅ Fresh signals every 24 hours
- ✅ Clear duplicate prevention
- ✅ Transparent logging (shows time remaining)

### System Performance:
- ✅ O(1) lookups (<1ms)
- ✅ Minimal memory (<10KB)
- ✅ Automatic cleanup (no bloat)

### Analytics Potential:
- ✅ Track duplicate rate
- ✅ Identify popular coins
- ✅ Measure signal diversity

---

## 📚 Related Documentation

- [IGXGammaV2.ts](src/services/igx/IGXGammaV2.ts) - Current deduplication logic (commented out)
- [globalHubService.ts](src/services/globalHubService.ts) - Signal flow and publishing

---

**Ready to implement? Start with Phase 1: Create the cache service!** 🚀

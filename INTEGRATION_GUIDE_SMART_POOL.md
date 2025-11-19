# 🔌 Smart Signal Pool Integration Guide

## Quick Integration (5 minutes)

### Step 1: Import the Smart Pool Manager

In [src/services/globalHubService.ts](src/services/globalHubService.ts), add import:

```typescript
import { smartSignalPool, type SignalForRanking } from './smartSignalPoolManager';
```

### Step 2: Send Signals to Pool

Find where signals are generated (after Delta V2 quality filtering) and add:

```typescript
// Example location: After signal passes quality gate
const qualityResult = await deltaV2QualityEngine.evaluateSignal(signalInput);

if (qualityResult.approved) {
  // Existing code...

  // NEW: Add to smart pool for tier-based distribution
  const signalForPool: SignalForRanking = {
    id: `sig_${Date.now()}_${signal.symbol}`,
    symbol: signal.symbol,
    signal_type: signal.side,
    confidence: qualityResult.confidence,
    quality_score: qualityResult.qualityScore,
    entry_price: signal.entryPrice,
    take_profit: signal.takeProfitLevels,
    stop_loss: signal.stopLoss,
    timestamp: new Date().toISOString(),
    expires_at: signal.expiresAt,
    strategy: signal.strategy,
    metadata: signal.metadata,
  };

  await smartSignalPool.addSignal(signalForPool);
  console.log(`✅ Signal added to smart pool: ${signal.symbol} ${signal.side}`);
}
```

### Step 3: That's It!

The smart pool will automatically:
- Calculate composite scores
- Rank all signals
- Make tier allocations available
- Refresh rankings every 5 minutes

---

## Advanced: Real-Time Distribution

### Option A: Let Users Fetch from Pool

Users can fetch their tier's signals directly:

```typescript
// In IntelligenceHub.tsx or similar
import { smartSignalPool } from '@/services/smartSignalPoolManager';
import { useUserSubscription } from '@/hooks/useUserSubscription';

function IntelligenceHub() {
  const { tier } = useUserSubscription();

  useEffect(() => {
    const fetchSignals = async () => {
      const signals = smartSignalPool.getSignalsForTier(tier);
      setDisplayedSignals(signals);
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [tier]);

  // ...
}
```

### Option B: Push Distribution via Tiered Signal Gate

Integrate with existing `tieredSignalGate.ts`:

```typescript
// In tieredSignalGate.ts
import { smartSignalPool } from './smartSignalPoolManager';

// Modify distributeSignal to fetch from pool
async distributeSignalFromPool(tier: UserTier): Promise<void> {
  const signals = smartSignalPool.getSignalsForTier(tier);

  for (const signal of signals) {
    // Check if already distributed
    if (this.distributedSignals.has(signal.id)) continue;

    // Distribute to tier users
    await this.distributeToTier(signal, tier);

    // Mark as distributed
    this.distributedSignals.add(signal.id);
  }
}
```

---

## Testing

### 1. Check Pool in Browser Console

```javascript
// View pool summary
window.printPoolSummary();

// Check specific tier allocation
const freeSignals = window.smartSignalPool.getSignalsForTier('FREE');
console.log('FREE tier signals:', freeSignals);

// Get pool stats
const stats = window.smartSignalPool.getPoolStats();
console.log('Pool stats:', stats);

// Get distribution breakdown
const breakdown = window.smartSignalPool.getDistributionBreakdown();
console.log('Distribution:', breakdown);
```

### 2. Verify Signal Ranking

```javascript
// Add test signal manually
const testSignal = {
  id: 'test_1',
  symbol: 'BTC',
  signal_type: 'LONG',
  confidence: 90,
  quality_score: 85,
  entry_price: 45000,
  take_profit: [46000, 47000],
  stop_loss: 44000,
  timestamp: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4*60*60*1000).toISOString(),
  strategy: 'test_strategy',
  metadata: {},
};

await window.smartSignalPool.addSignal(testSignal);
window.printPoolSummary();
```

### 3. Monitor Real-Time

```javascript
// Check pool status every 10 seconds
setInterval(() => {
  const stats = window.smartSignalPool.getPoolStats();
  console.log(`📊 Pool: ${stats.totalSignals} signals | Avg Conf: ${stats.avgConfidence.toFixed(2)}%`);
}, 10000);
```

---

## Integration Points

### Where Signals are Generated:

Look for these locations in `globalHubService.ts`:

```typescript
// 1. After Delta V2 approval
if (qualityResult.approved) {
  // ADD HERE: smartSignalPool.addSignal(...)
}

// 2. After Gamma filtering
if (gammaDecision.approved) {
  // ADD HERE: smartSignalPool.addSignal(...)
}

// 3. After final quality gate
if (passedQualityGate) {
  // ADD HERE: smartSignalPool.addSignal(...)
}
```

**Recommendation**: Add after Delta V2 approval (earliest point with quality scores).

---

## Monitoring Dashboard (Future Enhancement)

Create a visual dashboard showing:

```typescript
interface PoolDashboard {
  totalSignals: number;
  topSignal: RankedSignal;
  freeAllocation: RankedSignal[];
  proAllocation: RankedSignal[];
  maxAllocation: RankedSignal[];
  avgConfidence: number;
  avgQuality: number;
  symbolDistribution: { symbol: string; count: number }[];
  strategyDistribution: { strategy: string; count: number }[];
}
```

This would show in real-time:
- How many signals in pool
- Top ranked signal
- What each tier is getting
- Symbol diversity
- Strategy diversity

---

## Production Checklist

Before deploying to production:

- [ ] Import `smartSignalPool` in globalHubService.ts
- [ ] Add signals to pool after quality approval
- [ ] Test with browser console commands
- [ ] Verify FREE tier gets top 2 signals
- [ ] Verify PRO tier gets top 15 signals
- [ ] Verify MAX tier gets top 30 signals
- [ ] Monitor pool stats for 24 hours
- [ ] Check for memory leaks (pool should reset daily)
- [ ] Verify scheduled drops work for FREE tier (9 AM, 6 PM UTC)

---

## Troubleshooting

### Issue: Pool not updating

**Check:**
```javascript
const stats = window.smartSignalPool.getPoolStats();
console.log('Last updated:', new Date(stats.lastUpdated));
```

**Solution:** Pool refreshes every 5 minutes. Force refresh:
```javascript
window.smartSignalPool.refreshPool();
```

### Issue: No signals in pool

**Check:**
```javascript
const stats = window.smartSignalPool.getPoolStats();
console.log('Total signals:', stats.totalSignals);
```

**Solution:** Signals might be below 60 quality threshold. Check incoming signals:
```javascript
// Lower threshold temporarily for testing
// In smartSignalPoolManager.ts, change:
// private readonly MIN_QUALITY_THRESHOLD = 60; // to 50 for testing
```

### Issue: Wrong tier allocation

**Check:**
```javascript
const breakdown = window.smartSignalPool.getDistributionBreakdown();
console.log('FREE:', breakdown.freeSignals);
console.log('PRO:', breakdown.proSignals);
console.log('MAX:', breakdown.maxSignals);
```

**Solution:** Verify composite scoring is working:
```javascript
const topSignal = window.smartSignalPool.getTopSignals(1)[0];
console.log('Top signal composite:', topSignal.compositeScore);
console.log('Rank:', topSignal.rank);
```

---

## Next Steps

1. **Integrate** with globalHubService.ts (add signals to pool)
2. **Test** with browser console commands
3. **Monitor** pool stats for 24 hours
4. **Verify** user experience for each tier
5. **Measure** conversion rates (FREE → PRO → MAX)

**The smart distribution system is ready to deploy! 🚀**

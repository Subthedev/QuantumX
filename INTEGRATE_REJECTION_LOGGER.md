# 🔧 Integration Guide: Rejection Logger

## Add to Beta V5

At line 1 (imports):
```typescript
import { rejectionLogger } from '../RejectionLoggerService';
```

At line 206 (no consensus rejection):
```typescript
if (!consensus.direction) {
  console.log(`[IGX Beta V5] ⚠️ No consensus reached`);
  
  // ✅ LOG REJECTION
  await rejectionLogger.logRejection({
    symbol: ticker.symbol,
    direction: 'NEUTRAL',
    rejectionStage: 'BETA',
    rejectionReason: `No consensus - insufficient agreement (confidence: ${consensus.confidence}%)`,
    qualityScore: consensus.dataQuality,
    confidenceScore: consensus.confidence,
    dataQuality: ticker.dataQuality,
    strategyVotes: strategyResults,
    marketRegime: consensus.marketRegime || undefined,
    volatility: ticker.volatility
  });
  
  this.failedAnalyses++;
  return null;
}
```

## Add to Gamma V2

At line 1 (imports):
```typescript
import { rejectionLogger } from '../RejectionLoggerService';
```

At line 200 (signal rejection):
```typescript
console.log(`[IGX Gamma V2] ❌ Signal rejected - will NOT emit to queue`);

// ✅ LOG REJECTION
await rejectionLogger.logRejection({
  symbol: signal.symbol,
  direction: signal.direction || 'NEUTRAL',
  rejectionStage: 'GAMMA',
  rejectionReason: reason,
  qualityScore: signal.qualityScore,
  confidenceScore: signal.confidence,
  dataQuality: signal.dataQuality,
  marketRegime: signal.marketRegime
});
```

## Add to Delta V2

At line 1 (imports):
```typescript
import { rejectionLogger } from './RejectionLoggerService';
```

At rejection point (find where signals are rejected):
```typescript
// ✅ LOG REJECTION
await rejectionLogger.logRejection({
  symbol: signal.symbol,
  direction: signal.direction,
  rejectionStage: 'DELTA',
  rejectionReason: `Quality score too low: ${qualityScore} < ${threshold}`,
  qualityScore: qualityScore,
  confidenceScore: signal.confidence,
  dataQuality: signal.dataQuality
});
```

## Test

After integration, check console for:
```
[RejectionLogger] 🔴 BTC LONG rejected in DELTA (Priority: CRITICAL)
[RejectionLogger] 🟡 ETH SHORT rejected in GAMMA (Priority: IMPORTANT)
[RejectionLogger] ⚪ SOL LONG rejected in BETA (Filtered as NOISE)
[RejectionLogger] ✅ Flushed 8 rejections to database
```

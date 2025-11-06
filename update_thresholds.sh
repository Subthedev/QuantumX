#!/bin/bash
# Update all strategy confidence thresholds to production-grade crypto levels

echo "🎯 Updating strategy confidence thresholds..."

# Update strategyTypes.ts metadata
sed -i.bak 's/minConfidenceThreshold: 70/minConfidenceThreshold: 58  \/\/ Lowered from 70 for crypto volatility/' src/services/strategies/strategyTypes.ts
sed -i.bak 's/minConfidenceThreshold: 69/minConfidenceThreshold: 56  \/\/ Lowered from 69 for clean technical signals/' src/services/strategies/strategyTypes.ts
sed -i.bak 's/minConfidenceThreshold: 68/minConfidenceThreshold: 60  \/\/ Lowered from 68 for crypto noise/' src/services/strategies/strategyTypes.ts
sed -i.bak 's/minConfidenceThreshold: 67/minConfidenceThreshold: 59  \/\/ Lowered from 67 for on-chain lag/' src/services/strategies/strategyTypes.ts
sed -i.bak 's/minConfidenceThreshold: 66/minConfidenceThreshold: 55  \/\/ Lowered from 66 for crypto momentum/' src/services/strategies/strategyTypes.ts
sed -i.bak 's/minConfidenceThreshold: 65/minConfidenceThreshold: 58  \/\/ Lowered from 65 for funding volatility/' src/services/strategies/strategyTypes.ts
sed -i.bak 's/minConfidenceThreshold: 64/minConfidenceThreshold: 60  \/\/ Lowered from 64 for sentiment noise/' src/services/strategies/strategyTypes.ts

# Update individual strategy files (hard-coded checks)
sed -i.bak 's/confidence < 70/confidence < 58/' src/services/strategies/springTrapStrategy.ts
sed -i.bak 's/threshold (70%)/threshold (58%)/' src/services/strategies/springTrapStrategy.ts

sed -i.bak 's/confidence < 69/confidence < 56/' src/services/strategies/goldenCrossMomentumStrategy.ts
sed -i.bak 's/threshold (69%)/threshold (56%)/' src/services/strategies/goldenCrossMomentumStrategy.ts

sed -i.bak 's/confidence < 68/confidence < 60/' src/services/strategies/whaleShadowStrategy.ts
sed -i.bak 's/threshold (68%)/threshold (60%)/' src/services/strategies/whaleShadowStrategy.ts

sed -i.bak 's/confidence < 68/confidence < 57/' src/services/strategies/marketPhaseSniperStrategy.ts
sed -i.bak 's/threshold (68%)/threshold (57%)/' src/services/strategies/marketPhaseSniperStrategy.ts

sed -i.bak 's/confidence < 67/confidence < 59/' src/services/strategies/liquidityHunterStrategy.ts
sed -i.bak 's/threshold (67%)/threshold (59%)/' src/services/strategies/liquidityHunterStrategy.ts

sed -i.bak 's/confidence < 67/confidence < 58/' src/services/strategies/orderFlowTsunamiStrategy.ts
sed -i.bak 's/threshold (67%)/threshold (58%)/' src/services/strategies/orderFlowTsunamiStrategy.ts

sed -i.bak 's/confidence < 66/confidence < 55/' src/services/strategies/momentumSurgeStrategy.ts
sed -i.bak 's/threshold (66%)/threshold (55%)/' src/services/strategies/momentumSurgeStrategy.ts

sed -i.bak 's/confidence < 66/confidence < 55/' src/services/strategies/volatilityBreakoutStrategy.ts
sed -i.bak 's/threshold (66%)/threshold (55%)/' src/services/strategies/volatilityBreakoutStrategy.ts

sed -i.bak 's/confidence < 65/confidence < 58/' src/services/strategies/fundingSqueezeStrategy.ts
sed -i.bak 's/threshold (65%)/threshold (58%)/' src/services/strategies/fundingSqueezeStrategy.ts

sed -i.bak 's/confidence < 64/confidence < 60/' src/services/strategies/fearGreedContrarianStrategy.ts
sed -i.bak 's/threshold (64%)/threshold (60%)/' src/services/strategies/fearGreedContrarianStrategy.ts

# Update minimum threshold comments in strategy files
sed -i.bak 's/Minimum threshold: 70%/Minimum threshold: 58%/' src/services/strategies/springTrapStrategy.ts
sed -i.bak 's/Minimum threshold: 69%/Minimum threshold: 56%/' src/services/strategies/goldenCrossMomentumStrategy.ts
sed -i.bak 's/Minimum threshold: 68%/Minimum threshold: 60%/' src/services/strategies/whaleShadowStrategy.ts
sed -i.bak 's/Minimum threshold: 68%/Minimum threshold: 57%/' src/services/strategies/marketPhaseSniperStrategy.ts
sed -i.bak 's/Minimum threshold: 67%/Minimum threshold: 59%/' src/services/strategies/liquidityHunterStrategy.ts
sed -i.bak 's/Minimum threshold: 67%/Minimum threshold: 58%/' src/services/strategies/orderFlowTsunamiStrategy.ts
sed -i.bak 's/Minimum threshold: 66%/Minimum threshold: 55%/' src/services/strategies/momentumSurgeStrategy.ts
sed -i.bak 's/Minimum threshold: 66%/Minimum threshold: 55%/' src/services/strategies/volatilityBreakoutStrategy.ts
sed -i.bak 's/Minimum threshold: 65%/Minimum threshold: 58%/' src/services/strategies/fundingSqueezeStrategy.ts
sed -i.bak 's/Minimum threshold: 64%/Minimum threshold: 60%/' src/services/strategies/fearGreedContrarianStrategy.ts

echo "✅ Thresholds updated successfully!"
echo "📝 Backup files created (.bak extension)"

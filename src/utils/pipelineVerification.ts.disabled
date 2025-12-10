/**
 * PIPELINE VERIFICATION UTILITY
 * Quick test to verify the production data pipeline is working
 */

import { productionDataPipeline } from '../services/productionDataPipeline';
import { backgroundSignalService } from '../services/backgroundSignalService';
import { persistentStatsManager } from '../services/persistentStatsManager';
import { multiExchangeAggregator } from '../services/dataStreams/multiExchangeAggregator';
import { ohlcDataManager } from '../services/ohlcDataManager';
import { realTimeSignalEngineV3 } from '../services/realTimeSignalEngineV3';

export async function verifyPipeline(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║             PIPELINE VERIFICATION TEST                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Step 1: Check Pipeline Status
  console.log('📊 Step 1: Checking Pipeline Status...');
  const pipelineStatus = productionDataPipeline.getStatus();
  console.log(`  - Running: ${pipelineStatus.isRunning ? '✅' : '❌'}`);
  console.log(`  - Health Score: ${pipelineStatus.healthScore}/100`);
  console.log(`  - WebSocket Status: ${pipelineStatus.webSocketStatus}`);
  console.log(`  - Data Flowing: ${pipelineStatus.dataFlowing ? '✅' : '❌'}`);
  console.log(`  - Signals Generated: ${pipelineStatus.signalsGenerated}`);

  if (pipelineStatus.errors.length > 0) {
    console.log(`  - Recent Errors: ${pipelineStatus.errors.slice(-3).join(', ')}`);
  }

  // Step 2: Check Persistent Stats
  console.log('\n📈 Step 2: Checking Persistent Statistics...');
  const persistentStats = persistentStatsManager.getStats();
  console.log(`  - Market Updates (24h): ${persistentStats.marketUpdates24h}`);
  console.log(`  - Triggers (24h): ${persistentStats.triggers24h}`);
  console.log(`  - Signals (24h): ${persistentStats.signals24h}`);
  console.log(`  - Last Trigger: ${persistentStats.lastTriggerTime ? new Date(persistentStats.lastTriggerTime).toLocaleTimeString() : 'None'}`);
  console.log(`  - Last Signal: ${persistentStats.lastSignalTime ? new Date(persistentStats.lastSignalTime).toLocaleTimeString() : 'None'}`);

  // Step 3: Check Data Aggregator
  console.log('\n🌐 Step 3: Checking Data Streams...');
  const aggregatorStats = multiExchangeAggregator.getStats();
  console.log(`  - Active Sources: ${aggregatorStats.activeSources.join(', ') || 'None'}`);
  console.log(`  - Total Data Points: ${aggregatorStats.totalDataPoints}`);
  console.log(`  - Binance Connected: ${aggregatorStats.binanceData ? '✅' : '❌'}`);
  console.log(`  - OKX Connected: ${aggregatorStats.okxData ? '✅' : '❌'}`);
  console.log(`  - HTTP Fallback Active: ${aggregatorStats.httpFallback ? '✅' : '❌'}`);

  // Step 4: Check OHLC Data
  console.log('\n🕯️ Step 4: Checking OHLC Data...');
  const ohlcStats = ohlcDataManager.getStats();
  console.log(`  - Coins with Data: ${ohlcStats.coinsWithData}/${ohlcStats.totalCoins}`);
  console.log(`  - Average Candles: ${ohlcStats.avgCandlesPerCoin.toFixed(0)}`);
  console.log(`  - Min/Max Candles: ${ohlcStats.minCandles}/${ohlcStats.maxCandles}`);

  // Step 5: Check Signal Engine
  console.log('\n🎯 Step 5: Checking Signal Engine...');
  const engineStats = realTimeSignalEngineV3.getStats();
  console.log(`  - Total Ticks Processed: ${engineStats.totalTicks}`);
  console.log(`  - Triggers Evaluated: ${engineStats.triggersEvaluated}`);
  console.log(`  - Signals Generated: ${engineStats.signalsGenerated}`);
  console.log(`  - Signals Rejected: ${engineStats.signalsRejected}`);
  console.log(`  - Micro Anomalies: ${engineStats.microAnomalies}`);

  // Step 6: Overall Health Assessment
  console.log('\n🏥 Step 6: Overall Health Assessment...');
  const healthScore = pipelineStatus.healthScore;
  let healthStatus = '';
  let healthEmoji = '';

  if (healthScore >= 90) {
    healthStatus = 'EXCELLENT';
    healthEmoji = '🟢';
  } else if (healthScore >= 70) {
    healthStatus = 'GOOD';
    healthEmoji = '🟡';
  } else if (healthScore >= 50) {
    healthStatus = 'DEGRADED';
    healthEmoji = '🟠';
  } else {
    healthStatus = 'CRITICAL';
    healthEmoji = '🔴';
  }

  console.log(`  ${healthEmoji} System Health: ${healthStatus} (${healthScore}/100)`);

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (!pipelineStatus.isRunning) {
    console.log('  ⚠️ Pipeline is not running. Call productionDataPipeline.initialize()');
  }
  if (!pipelineStatus.dataFlowing) {
    console.log('  ⚠️ No data flowing. Check network connectivity and WebSocket status');
  }
  if (pipelineStatus.webSocketStatus === 'FALLBACK') {
    console.log('  ⚠️ Running in fallback mode. WebSocket connections may be blocked');
  }
  if (ohlcStats.coinsWithData < ohlcStats.totalCoins * 0.8) {
    console.log('  ⚠️ Missing OHLC data for some coins. May need to refresh');
  }
  if (persistentStats.signals24h === 0 && persistentStats.triggers24h > 0) {
    console.log('  ⚠️ Triggers detected but no signals. May indicate overly strict filters');
  }
  if (healthScore >= 90) {
    console.log('  ✅ System is operating optimally!');
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║             VERIFICATION COMPLETE                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).verifyPipeline = verifyPipeline;
  (window as any).pipelineStatus = () => productionDataPipeline.getStatus();
  (window as any).pipelineStats = () => productionDataPipeline.getDetailedStats();

  console.log('🔧 Pipeline verification tools loaded!');
  console.log('   Run verifyPipeline() in console to test the system');
  console.log('   Run pipelineStatus() for current status');
  console.log('   Run pipelineStats() for detailed statistics');
}
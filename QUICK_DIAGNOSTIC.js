/**
 * QUICK DIAGNOSTIC - Run this in console on /arena or /intelligence-hub page
 *
 * This will show you EXACTLY what's happening right now
 */

console.log('🔍 === QUICK DIAGNOSTIC START ===\n');

// 1. Check if Hub is running
const isRunning = globalHubService.isRunning();
console.log(`1. Hub Status: ${isRunning ? '✅ RUNNING' : '❌ NOT RUNNING'}`);

if (!isRunning) {
  console.log('   ⚠️ Hub is not running! Start it with: await globalHubService.start()');
}

// 2. Check metrics
const metrics = globalHubService.getMetrics();
console.log(`\n2. Hub Metrics:`);
console.log(`   - Total Signals Generated: ${metrics.totalSignals}`);
console.log(`   - Delta Processed: ${metrics.deltaProcessed || 0}`);
console.log(`   - Delta Passed: ${metrics.deltaPassed || 0}`);
console.log(`   - Delta Pass Rate: ${metrics.deltaPassRate || 0}%`);

// 3. Check ACTIVE signals (LIVE signals currently in play)
const activeSignals = globalHubService.getActiveSignals();
console.log(`\n3. ACTIVE (LIVE) Signals: ${activeSignals.length}`);

if (activeSignals.length > 0) {
  console.log('   ✅ LIVE SIGNALS EXIST!');
  activeSignals.slice(0, 3).forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.symbol} ${s.direction} - Confidence: ${s.confidence}% - Strategy: ${s.strategyName || s.strategy}`);
  });
} else {
  console.log('   ❌ No active signals yet');
}

// 4. Check signal history (completed signals)
const history = globalHubService.getSignalHistory();
console.log(`\n4. Signal History (Completed): ${history.length}`);

// 5. Check if Arena is subscribed
console.log(`\n5. Checking Arena subscription...`);
const agents = arenaService.getAgents();
console.log(`   - Agents loaded: ${agents.length}`);
console.log(`   - Agents with trades: ${agents.filter(a => a.totalTrades > 0).length}`);

if (agents.filter(a => a.totalTrades > 0).length === 0) {
  console.log('   ⚠️ NO AGENTS HAVE TRADED YET');
}

// 6. Test manual signal emission
console.log(`\n6. Testing manual signal emission...`);

let testReceived = false;
const testHandler = () => {
  testReceived = true;
};

globalHubService.on('signal:new', testHandler);

const testSignal = {
  id: `diagnostic-${Date.now()}`,
  symbol: 'BTCUSDT',
  direction: 'LONG',
  strategyName: 'WHALE_SHADOW',
  strategy: 'SMART_MONEY',
  entry: 95000,
  stopLoss: 94000,
  targets: [96000],
  confidence: 75,
  qualityScore: 75,
  timestamp: Date.now(),
  grade: 'B'
};

globalHubService.emit('signal:new', testSignal);

setTimeout(() => {
  if (testReceived) {
    console.log('   ✅ Event subscription works!');
  } else {
    console.log('   ❌ Event subscription broken!');
  }

  // Clean up
  globalHubService.off('signal:new', testHandler);

  console.log('\n🔍 === DIAGNOSTIC COMPLETE ===\n');

  console.log('📊 SUMMARY:');
  console.log(`   Hub Running: ${isRunning ? '✅' : '❌'}`);
  console.log(`   Total Signals: ${metrics.totalSignals}`);
  console.log(`   Active (Live) Signals: ${activeSignals.length} ${activeSignals.length > 0 ? '✅' : '⚠️'}`);
  console.log(`   Agents Trading: ${agents.filter(a => a.totalTrades > 0).length}/${agents.length}`);
  console.log(`   Event System: ${testReceived ? '✅' : '❌'}`);

  console.log('\n💡 NEXT STEPS:');
  if (!isRunning) {
    console.log('   1. Start Hub: await globalHubService.start()');
  } else if (activeSignals.length === 0) {
    console.log('   1. Wait 2-5 minutes for signals to be generated');
    console.log('   2. Check console for [GlobalHub] logs');
  } else if (agents.filter(a => a.totalTrades > 0).length === 0) {
    console.log('   1. Active signals exist but agents not trading');
    console.log('   2. Check console for [Arena] logs');
    console.log('   3. Look for "Signal REJECTED" or "Signal ACCEPTED" messages');
  } else {
    console.log('   1. Everything looks good!');
    console.log('   2. Check /arena page for agent cards');
  }

}, 500);

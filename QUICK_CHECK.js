/**
 * ULTRA QUICK CHECK - Paste this in browser console on /arena page
 * This will tell you EXACTLY what's wrong
 */

console.clear();
console.log('🔍 QUICK CHECK STARTING...\n');

// Check 1: Is Hub running?
const hubRunning = globalHubService?.isRunning();
console.log(`1. Hub Running: ${hubRunning ? '✅ YES' : '❌ NO'}`);

if (!hubRunning) {
  console.log('   ❌ PROBLEM: Hub is not running!');
  console.log('   FIX: Run this command: await globalHubService.start()');
  console.log('\n⚠️ STOP HERE - Fix the Hub first!\n');
} else {
  console.log('   ✅ Hub is active\n');

  // Check 2: Metrics
  const metrics = globalHubService.getMetrics();
  console.log('2. Hub Metrics:');
  console.log(`   - Total analyses: ${metrics.totalAnalyses || 0}`);
  console.log(`   - Delta processed: ${metrics.deltaProcessed || 0}`);
  console.log(`   - Delta passed: ${metrics.deltaPassed || 0}`);
  console.log(`   - Total signals: ${metrics.totalSignals || 0}\n`);

  // Check 3: Active signals
  const activeSignals = globalHubService.getActiveSignals();
  console.log(`3. Active Signals: ${activeSignals.length}`);
  if (activeSignals.length > 0) {
    console.log('   ✅ LIVE SIGNALS EXIST:');
    activeSignals.forEach(s => {
      console.log(`   - ${s.symbol} ${s.direction} (${s.confidence}%)`);
    });
  } else {
    console.log('   ⚠️ No active signals yet');
  }
  console.log('');

  // Check 4: Arena agents
  const agents = arenaService.getAgents();
  console.log(`4. Arena Agents: ${agents.length}`);
  const tradingAgents = agents.filter(a => a.totalTrades > 0);
  console.log(`   - Agents with trades: ${tradingAgents.length}/3`);

  if (tradingAgents.length > 0) {
    console.log('   ✅ AGENTS ARE TRADING:');
    tradingAgents.forEach(a => {
      console.log(`   - ${a.name}: ${a.totalTrades} trades`);
    });
  } else {
    console.log('   ❌ NO AGENTS HAVE TRADED YET');
  }
  console.log('');

  // Check 5: Test event subscription
  console.log('5. Testing Event Subscription...');
  let received = false;
  const testHandler = () => { received = true; };
  globalHubService.on('signal:new', testHandler);

  const testSignal = {
    id: `test-${Date.now()}`,
    symbol: 'BTCUSDT',
    direction: 'LONG',
    strategyName: 'TEST',
    strategy: 'TEST',
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
    globalHubService.off('signal:new', testHandler);
    console.log(`   Event test: ${received ? '✅ WORKS' : '❌ BROKEN'}\n`);

    // DIAGNOSIS
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNOSIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!hubRunning) {
      console.log('❌ ISSUE: Hub is not running');
      console.log('🔧 FIX: await globalHubService.start()');
    } else if (metrics.deltaProcessed === 0) {
      console.log('⏳ WAITING: Hub is running but hasn\'t processed any coins yet');
      console.log('💡 Wait 1-2 minutes for first analysis cycle');
    } else if (metrics.deltaPassed === 0) {
      console.log('⏳ WAITING: Hub is analyzing but no signals passed Delta yet');
      console.log('💡 Current pass rate: 0% - Keep waiting for quality signal');
      console.log(`💡 Processed so far: ${metrics.deltaProcessed} coins`);
    } else if (activeSignals.length === 0) {
      console.log('⚠️ ISSUE: Signals were generated but none are active');
      console.log('🔧 Check signal history: globalHubService.getSignalHistory()');
    } else if (!received) {
      console.log('❌ ISSUE: Event subscription is broken');
      console.log('🔧 Check Arena initialization logs in console');
    } else if (tradingAgents.length === 0) {
      console.log('❌ ISSUE: Signals exist but agents not trading');
      console.log('🔧 Check console for [Arena] logs');
      console.log('🔧 Look for "ACCEPTED" or error messages');
    } else {
      console.log('✅ EVERYTHING WORKING!');
      console.log(`✅ ${tradingAgents.length} agents are trading`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, 500);
}

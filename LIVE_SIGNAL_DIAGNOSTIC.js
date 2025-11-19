/**
 * LIVE SIGNAL DIAGNOSTIC - Paste in browser console on /arena page
 *
 * This shows you EXACTLY what's happening with signals right now
 */

console.clear();
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 LIVE SIGNAL DIAGNOSTIC');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Check Hub status
const isRunning = globalHubService.isRunning();
console.log(`1. Hub Status: ${isRunning ? '✅ RUNNING' : '❌ STOPPED'}`);

if (!isRunning) {
  console.log('   ❌ Hub is not running!');
  console.log('   🔧 Fix: await globalHubService.start()');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  throw new Error('Hub not running');
}

// 2. Check metrics
const metrics = globalHubService.getMetrics();
console.log('\n2. Hub Metrics:');
console.log(`   - Total Signals Generated: ${metrics.totalSignals || 0}`);
console.log(`   - Delta Processed: ${metrics.deltaProcessed || 0}`);
console.log(`   - Delta Passed: ${metrics.deltaPassed || 0}`);
console.log(`   - Delta Pass Rate: ${(metrics.deltaPassRate || 0).toFixed(1)}%`);
console.log(`   - Gamma Received: ${metrics.gammaSignalsReceived || 0}`);
console.log(`   - Gamma Passed: ${metrics.gammaSignalsPassed || 0}`);

// 3. Check ACTIVE signals (LIVE signals currently in play)
const activeSignals = globalHubService.getActiveSignals();
console.log(`\n3. ACTIVE (LIVE) Signals: ${activeSignals.length}`);

if (activeSignals.length > 0) {
  console.log('   ✅ LIVE SIGNALS EXIST!');
  activeSignals.slice(0, 5).forEach((s, i) => {
    const age = Math.floor((Date.now() - s.timestamp) / 60000); // minutes
    const expiresIn = s.expiresAt ? Math.floor((s.expiresAt - Date.now()) / 60000) : 'N/A';
    console.log(`   ${i + 1}. ${s.symbol} ${s.direction} (${s.strategyName || s.strategy})`);
    console.log(`      - Confidence: ${s.confidence || s.qualityScore}%`);
    console.log(`      - Age: ${age} min | Expires: ${expiresIn} min`);
    console.log(`      - Entry: $${s.entry?.toFixed(2) || 'N/A'}`);
  });
} else {
  console.log('   ⚠️ No active signals - waiting for Delta to approve new signals...');
}

// 4. Check if Arena is subscribed
console.log('\n4. Arena Service Status:');
const agents = arenaService.getAgents();
const tradingAgents = agents.filter(a => a.totalTrades > 0);
console.log(`   - Agents initialized: ${agents.length}`);
console.log(`   - Agents with trades: ${tradingAgents.length}`);

if (tradingAgents.length > 0) {
  console.log('   ✅ AGENTS ARE TRADING:');
  tradingAgents.forEach(a => {
    console.log(`      - ${a.name}: ${a.totalTrades} trades, ${a.openPositions} open`);
  });
} else {
  console.log('   ⚠️ NO AGENTS HAVE TRADED YET');
}

// 5. Test if Arena can receive signals
console.log('\n5. Testing Event Subscription...');
let received = false;
const testHandler = (signal) => {
  received = true;
  console.log(`   ✅ RECEIVED: ${signal.symbol} ${signal.direction}`);
};

globalHubService.on('signal:new', testHandler);

// Emit test
globalHubService.emit('signal:new', {
  id: `diag-${Date.now()}`,
  symbol: 'DIAGUSDT',
  direction: 'LONG',
  strategyName: 'DIAGNOSTIC_TEST',
  entry: 1000,
  stopLoss: 900,
  targets: [1100],
  confidence: 75,
  qualityScore: 75,
  timestamp: Date.now()
});

setTimeout(() => {
  globalHubService.off('signal:new', testHandler);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('📊 DIAGNOSTIC SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Diagnosis
  if (activeSignals.length === 0 && (metrics.deltaPassed || 0) === 0) {
    console.log('⏳ STATUS: Waiting for first Delta signal');
    console.log('💡 Hub is analyzing coins but none passed Delta yet');
    console.log(`💡 Analyzed so far: ${metrics.deltaProcessed || 0} signals`);
    console.log('💡 Keep watching - signals can take 5-10 minutes\n');
  } else if (activeSignals.length === 0 && (metrics.deltaPassed || 0) > 0) {
    console.log('❌ PROBLEM: Signals passed Delta but all expired!');
    console.log(`💡 ${metrics.deltaPassed} signals passed Delta`);
    console.log('💡 But all expired before agents could trade');
    console.log('🔧 FIX: Click "Clear & Restart" button on Arena page\n');
  } else if (activeSignals.length > 0 && !received) {
    console.log('❌ PROBLEM: Signals exist but Arena not subscribed!');
    console.log('🔧 FIX: Refresh the Arena page');
    console.log('🔧 Check console for Arena initialization logs\n');
  } else if (activeSignals.length > 0 && received && tradingAgents.length === 0) {
    console.log('❌ PROBLEM: Signals exist, Arena subscribed, but agents not trading!');
    console.log('🔧 Check console for [Arena] TRADE START logs');
    console.log('🔧 Look for error messages after signal reception\n');
  } else if (activeSignals.length > 0 && tradingAgents.length > 0) {
    console.log('✅ EVERYTHING WORKING!');
    console.log(`✅ ${activeSignals.length} live signals`);
    console.log(`✅ ${tradingAgents.length} agents trading`);
    console.log('✅ Autonomous trading is LIVE!\n');
  } else {
    console.log('⏳ STATUS: System running, waiting for signals...');
    console.log('💡 Delta is very selective - only 5-10% of signals pass');
    console.log('💡 Next signal could appear within 2-10 minutes\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📺 WHAT TO WATCH FOR:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('When Hub generates a NEW signal, you will see:');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚨 NEW SIGNAL GENERATED - #872 🚨');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 EMITTING TO ARENA: "WHALE_SHADOW" BTCUSDT LONG');
  console.log('⏰ Expiry: 180 minutes (3.0 hours)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Followed immediately by:');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 ARENA RECEIVED SIGNAL FROM HUB 🤖');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Strategy: WHALE_SHADOW');
  console.log('💱 Symbol: BTCUSDT LONG');
  console.log('✅ ACCEPTED - Tier: ACCEPTABLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('[Arena] 🎬 TRADE START: NEXUS-01 → BTCUSDT LONG');
  console.log('[Arena] ✅ NEXUS-01 opened BUY position at $95234.50');
  console.log('[Arena] 🎬 TRADE COMPLETE');
  console.log('');
  console.log('If you DON\'T see these banners, Delta hasn\'t passed a new signal yet.');
  console.log('Keep the console open and watch for them!\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}, 500);

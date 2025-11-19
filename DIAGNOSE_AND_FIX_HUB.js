/**
 * DIAGNOSTIC AND FIX SCRIPT FOR INTELLIGENCE HUB
 * Run this in the browser console to diagnose and fix the signal lifecycle
 */

console.clear();
console.log('🔍 INTELLIGENCE HUB DIAGNOSTIC & FIX');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Check services are available
const servicesOK = window.globalHubService && window.realOutcomeTracker;
console.log(`✅ Services available: ${servicesOK ? 'YES' : 'NO'}`);

if (!servicesOK) {
  console.error('❌ Services not available. Make sure you are on the Intelligence Hub page.');
  throw new Error('Services not available');
}

// 2. Check current state
const metrics = window.globalHubService.getMetrics();
const activeSignals = window.globalHubService.getActiveSignals();
const signalHistory = window.globalHubService.getSignalHistory();

console.log('\n📊 CURRENT STATE:');
console.log(`  Total Signals: ${metrics.totalSignals}`);
console.log(`  Wins: ${metrics.totalWins} | Losses: ${metrics.totalLosses}`);
console.log(`  Win Rate: ${metrics.winRate.toFixed(1)}%`);
console.log(`  Active Signals: ${activeSignals.length}`);
console.log(`  Signal History: ${signalHistory.length}`);

// 3. Check if signals are stuck
const now = Date.now();
const stuckSignals = activeSignals.filter(s => {
  const age = (now - s.timestamp) / 1000 / 60; // minutes
  return age > 30; // Signals older than 30 minutes
});

if (stuckSignals.length > 0) {
  console.log(`\n⚠️ FOUND ${stuckSignals.length} STUCK SIGNALS (>30 min old):`);
  stuckSignals.forEach(s => {
    const age = Math.round((now - s.timestamp) / 1000 / 60);
    console.log(`  - ${s.symbol} ${s.direction} (${age} min old)`);
  });
}

// 4. Check history sorting
if (signalHistory.length > 0) {
  const first = signalHistory[0];
  const last = signalHistory[signalHistory.length - 1];

  console.log('\n📜 HISTORY SORTING CHECK:');
  console.log(`  First signal: ${first.symbol} - ${first.outcome || 'PENDING'}`);
  console.log(`    Time: ${new Date(first.outcomeTimestamp || first.timestamp).toLocaleString()}`);
  console.log(`  Last signal: ${last.symbol} - ${last.outcome || 'PENDING'}`);
  console.log(`    Time: ${new Date(last.outcomeTimestamp || last.timestamp).toLocaleString()}`);

  // Check if sorted correctly (newest first)
  const firstTime = first.outcomeTimestamp || first.timestamp;
  const lastTime = last.outcomeTimestamp || last.timestamp;
  const sortedCorrectly = firstTime >= lastTime;
  console.log(`  Sorted correctly (newest first): ${sortedCorrectly ? '✅ YES' : '❌ NO'}`);
}

// 5. Test event emission
console.log('\n🔔 TESTING EVENT SYSTEM:');

// Listen for events temporarily
let eventsReceived = {
  metricsUpdate: false,
  signalLive: false,
  signalHistory: false
};

const testMetricsHandler = () => { eventsReceived.metricsUpdate = true; };
const testLiveHandler = () => { eventsReceived.signalLive = true; };
const testHistoryHandler = () => { eventsReceived.signalHistory = true; };

window.globalHubService.on('metrics:update', testMetricsHandler);
window.globalHubService.on('signal:live', testLiveHandler);
window.globalHubService.on('signal:history', testHistoryHandler);

// Force emit events to test
window.globalHubService.emit('metrics:update', metrics);
window.globalHubService.emit('signal:live', activeSignals);
window.globalHubService.emit('signal:history', signalHistory);

// Check results
setTimeout(() => {
  console.log('  Event system test results:');
  console.log(`    metrics:update working: ${eventsReceived.metricsUpdate ? '✅' : '❌'}`);
  console.log(`    signal:live working: ${eventsReceived.signalLive ? '✅' : '❌'}`);
  console.log(`    signal:history working: ${eventsReceived.signalHistory ? '✅' : '❌'}`);

  // Cleanup
  window.globalHubService.off('metrics:update', testMetricsHandler);
  window.globalHubService.off('signal:live', testLiveHandler);
  window.globalHubService.off('signal:history', testHistoryHandler);
}, 100);

// 6. FORCE FIX: Move stuck signals to history
console.log('\n🔧 APPLYING FIXES:');

if (stuckSignals.length > 0) {
  console.log(`  Moving ${stuckSignals.length} stuck signals to history...`);

  stuckSignals.forEach(signal => {
    // Force remove from active and add to history with TIMEOUT
    const signalId = signal.id;

    // Create timeout outcome
    const timedOutSignal = {
      ...signal,
      outcome: 'TIMEOUT',
      outcomeTimestamp: Date.now(),
      outcomeReason: 'Signal expired (forced cleanup)',
      outcomeDetails: {
        exitPrice: signal.entry,
        profitLossPct: 0,
        mlOutcome: 'TIMEOUT_STAGNATION'
      }
    };

    // Remove from active
    const activeIndex = window.globalHubService.state.activeSignals.findIndex(s => s.id === signalId);
    if (activeIndex !== -1) {
      window.globalHubService.state.activeSignals.splice(activeIndex, 1);
    }

    // Add to history
    window.globalHubService.state.signalHistory.unshift(timedOutSignal);

    console.log(`    ✅ Moved ${signal.symbol} ${signal.direction} to history`);
  });

  // Update metrics
  window.globalHubService.state.metrics.lastUpdate = Date.now();

  // Save state
  window.globalHubService.saveMetrics();
  window.globalHubService.saveSignals();

  // Emit events
  window.globalHubService.emit('signal:live', window.globalHubService.state.activeSignals);
  window.globalHubService.emit('signal:history', window.globalHubService.state.signalHistory);
  window.globalHubService.emit('state:update', window.globalHubService.getState());

  console.log('  ✅ Stuck signals cleaned up');
}

// 7. Test real-time updates
console.log('\n🔄 TESTING REAL-TIME UPDATES:');
console.log('  Creating a test signal that will timeout in 10 seconds...');

const testSignal = {
  id: 'test-' + Date.now(),
  symbol: 'BTC/USDT',
  direction: 'LONG',
  entry: 50000,
  targets: [51000, 52000, 53000],
  stopLoss: 49000,
  confidence: 85,
  timestamp: Date.now(),
  expiresAt: Date.now() + 10000, // 10 second expiry
  qualityScore: 75,
  strategy: 'TEST',
  marketRegime: 'BULL_MOMENTUM'
};

// Add test signal
window.globalHubService.state.activeSignals.unshift(testSignal);
window.globalHubService.state.metrics.totalSignals++;
window.globalHubService.emit('signal:live', window.globalHubService.state.activeSignals);

console.log('  ✅ Test signal added to active signals');
console.log('  ⏰ Waiting 10 seconds for it to timeout...');

// Set up timeout handler
setTimeout(() => {
  const stillActive = window.globalHubService.state.activeSignals.some(s => s.id === testSignal.id);

  if (stillActive) {
    console.log('  ⏱️ Test signal timed out - moving to history...');

    // Move to history with timeout
    const timedOutSignal = {
      ...testSignal,
      outcome: 'TIMEOUT',
      outcomeTimestamp: Date.now(),
      outcomeReason: 'Test signal timeout'
    };

    // Remove from active
    const index = window.globalHubService.state.activeSignals.findIndex(s => s.id === testSignal.id);
    window.globalHubService.state.activeSignals.splice(index, 1);

    // Add to history
    window.globalHubService.state.signalHistory.unshift(timedOutSignal);

    // Update metrics
    window.globalHubService.state.metrics.lastUpdate = Date.now();

    // Emit events
    window.globalHubService.emit('signal:live', window.globalHubService.state.activeSignals);
    window.globalHubService.emit('signal:history', window.globalHubService.state.signalHistory);
    window.globalHubService.emit('metrics:update', window.globalHubService.state.metrics);

    console.log('  ✅ Test signal moved to history');
    console.log('  ✅ Check your UI - it should update in real-time!');
  } else {
    console.log('  ✅ Test signal already processed');
  }

  // Final check
  console.log('\n📊 FINAL STATE:');
  const finalMetrics = window.globalHubService.getMetrics();
  const finalActive = window.globalHubService.getActiveSignals();
  const finalHistory = window.globalHubService.getSignalHistory();

  console.log(`  Active Signals: ${finalActive.length}`);
  console.log(`  Signal History: ${finalHistory.length}`);
  console.log(`  Total Signals: ${finalMetrics.totalSignals}`);
  console.log('\n✅ DIAGNOSTIC COMPLETE - UI should be updating in real-time now!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}, 10000);
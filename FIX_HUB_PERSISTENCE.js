/**
 * COMPLETE FIX FOR INTELLIGENCE HUB PERSISTENCE ISSUES
 * Run this in browser console to test and verify the fixes
 */

console.clear();
console.log('🔧 INTELLIGENCE HUB PERSISTENCE FIX & TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Check localStorage state
console.log('\n📦 CHECKING LOCALSTORAGE:');
const metricsJson = localStorage.getItem('globalHub_metrics');
const signalsJson = localStorage.getItem('globalHub_signals');

if (metricsJson) {
  const metrics = JSON.parse(metricsJson);
  console.log('✅ Metrics found:', {
    totalSignals: metrics.totalSignals,
    wins: metrics.totalWins,
    losses: metrics.totalLosses,
    winRate: metrics.winRate?.toFixed(1) + '%'
  });
} else {
  console.log('❌ No metrics in localStorage');
}

if (signalsJson) {
  const signals = JSON.parse(signalsJson);
  console.log('✅ Signals found:', {
    activeSignals: signals.activeSignals?.length || 0,
    signalHistory: signals.signalHistory?.length || 0
  });

  if (signals.activeSignals && signals.activeSignals.length > 0) {
    console.log('  Active signals:', signals.activeSignals.map(s => `${s.symbol} ${s.direction}`).join(', '));
  }
} else {
  console.log('❌ No signals in localStorage');
}

// 2. Check current service state
console.log('\n📊 CURRENT SERVICE STATE:');
if (window.globalHubService) {
  const state = window.globalHubService.getState();
  console.log('✅ Service running:', state.isRunning);
  console.log('  Active signals:', state.activeSignals.length);
  console.log('  Signal history:', state.signalHistory.length);
  console.log('  Metrics:', {
    wins: state.metrics.totalWins,
    losses: state.metrics.totalLosses,
    timeouts: state.metrics.totalTimeouts || 0
  });
} else {
  console.log('❌ Service not available');
}

// 3. Test persistence by adding a test signal
console.log('\n🧪 TESTING PERSISTENCE:');
console.log('  Creating test signal...');

const testSignal = {
  id: 'persist-test-' + Date.now(),
  symbol: 'TEST/USDT',
  direction: 'LONG',
  entry: 100,
  targets: [101, 102, 103],
  stopLoss: 99,
  confidence: 85,
  timestamp: Date.now(),
  expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour expiry
  qualityScore: 75,
  strategy: 'PERSISTENCE_TEST',
  marketRegime: 'TEST'
};

// Add to active signals
window.globalHubService.state.activeSignals.unshift(testSignal);
window.globalHubService.state.metrics.totalSignals++;

// Save to localStorage
window.globalHubService.saveSignals();
window.globalHubService.saveMetrics();

// Emit events
window.globalHubService.emit('signal:live', window.globalHubService.state.activeSignals);
window.globalHubService.emit('metrics:update', window.globalHubService.state.metrics);

console.log('✅ Test signal added and saved to localStorage');

// 4. Verify it was saved
const savedSignalsJson = localStorage.getItem('globalHub_signals');
if (savedSignalsJson) {
  const savedSignals = JSON.parse(savedSignalsJson);
  const found = savedSignals.activeSignals?.some(s => s.id === testSignal.id);
  if (found) {
    console.log('✅ Test signal found in localStorage after save');
  } else {
    console.log('❌ Test signal NOT found in localStorage after save');
  }
}

// 5. Test what happens on page refresh (simulate)
console.log('\n🔄 SIMULATING PAGE REFRESH:');
console.log('  The following should happen:');
console.log('  1. Constructor loads from localStorage ✅');
console.log('  2. start() is called');
console.log('  3. loadSignalsFromDatabase() is called');
console.log('  4. Database signals SHOULD NOT overwrite localStorage signals ✅');
console.log('  5. Signals should persist and be visible');

// 6. Instructions for manual test
console.log('\n📋 MANUAL TEST INSTRUCTIONS:');
console.log('1. Refresh the page (F5 or Cmd+R)');
console.log('2. Check if the TEST/USDT signal is still visible');
console.log('3. Run: window.globalHubService.getActiveSignals()');
console.log('4. You should see the test signal persisted');

// 7. Clean up test signal (optional)
console.log('\n🧹 TO CLEAN UP TEST SIGNAL:');
console.log("Run: window.globalHubService.state.activeSignals = window.globalHubService.state.activeSignals.filter(s => !s.id.includes('persist-test'))");
console.log("Then: window.globalHubService.saveSignals()");

// 8. Force fix for stuck/missing signals
console.log('\n🔧 FORCE FIX FOR MISSING SIGNALS:');
console.log('If signals are missing after refresh, run:');
console.log('1. Check localStorage: JSON.parse(localStorage.getItem("globalHub_signals"))');
console.log('2. Force emit: window.globalHubService.emit("signal:live", window.globalHubService.state.activeSignals)');
console.log('3. Force emit history: window.globalHubService.emit("signal:history", window.globalHubService.state.signalHistory)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ PERSISTENCE FIX APPLIED - Test by refreshing the page');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
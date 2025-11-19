/**
 * FINAL PERSISTENCE TEST
 * This test will verify that signals persist correctly across page refreshes
 */

console.clear();
console.log('🎯 FINAL PERSISTENCE TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// STEP 1: Clear everything for a clean test
console.log('\n📧 STEP 1: CLEAN SLATE TEST');
console.log('Clearing all existing data for a fresh test...');

// Clear localStorage
localStorage.removeItem('globalHub_signals');
localStorage.removeItem('globalHub_metrics');
console.log('✅ Cleared localStorage');

// Check service status
if (window.globalHubService) {
  // Clear state
  window.globalHubService.state.activeSignals = [];
  window.globalHubService.state.signalHistory = [];
  window.globalHubService.state.metrics.totalSignals = 0;
  window.globalHubService.state.metrics.totalWins = 0;
  window.globalHubService.state.metrics.totalLosses = 0;
  console.log('✅ Cleared service state');
} else {
  console.error('❌ Service not available - navigate to Intelligence Hub first!');
  throw new Error('Service not available');
}

// STEP 2: Add test signals
console.log('\n📧 STEP 2: ADDING TEST SIGNALS');

const testSignals = [
  {
    id: 'test-persist-1-' + Date.now(),
    symbol: 'BTC/USDT',
    direction: 'LONG',
    entry: 44000,
    targets: [44500, 45000, 45500],
    stopLoss: 43500,
    confidence: 88,
    timestamp: Date.now(),
    expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
    qualityScore: 82,
    strategy: 'MOMENTUM',
    marketRegime: 'BULL_MOMENTUM'
  },
  {
    id: 'test-persist-2-' + Date.now(),
    symbol: 'ETH/USDT',
    direction: 'SHORT',
    entry: 2200,
    targets: [2150, 2100, 2050],
    stopLoss: 2250,
    confidence: 75,
    timestamp: Date.now() - (30 * 60 * 1000), // 30 min ago
    expiresAt: Date.now() + (1 * 60 * 60 * 1000), // 1 hour
    qualityScore: 71,
    strategy: 'REVERSAL',
    marketRegime: 'BEAR_MOMENTUM'
  }
];

// Add signals to service
testSignals.forEach(signal => {
  window.globalHubService.state.activeSignals.push(signal);
  console.log(`✅ Added ${signal.symbol} ${signal.direction} to active signals`);
});

// Update metrics
window.globalHubService.state.metrics.totalSignals = 2;
window.globalHubService.state.metrics.lastUpdate = Date.now();

// Save to localStorage
window.globalHubService.saveSignals();
window.globalHubService.saveMetrics();
console.log('💾 Saved to localStorage');

// Emit to UI
window.globalHubService.emit('signal:live', window.globalHubService.state.activeSignals);
window.globalHubService.emit('metrics:update', window.globalHubService.state.metrics);
console.log('📡 Emitted to UI');

// STEP 3: Verify localStorage
console.log('\n📧 STEP 3: VERIFY LOCALSTORAGE');
const savedSignals = JSON.parse(localStorage.getItem('globalHub_signals'));
const savedMetrics = JSON.parse(localStorage.getItem('globalHub_metrics'));

if (savedSignals && savedSignals.activeSignals) {
  console.log(`✅ Found ${savedSignals.activeSignals.length} signals in localStorage`);
  savedSignals.activeSignals.forEach(s => {
    console.log(`   - ${s.symbol} ${s.direction}`);
  });
} else {
  console.error('❌ No signals found in localStorage!');
}

if (savedMetrics) {
  console.log(`✅ Metrics saved: totalSignals=${savedMetrics.totalSignals}`);
} else {
  console.error('❌ No metrics found in localStorage!');
}

// STEP 4: Check UI
console.log('\n📧 STEP 4: CHECK UI');
const signalCards = document.querySelectorAll('[data-signal-id]');
if (signalCards.length > 0) {
  console.log(`✅ Found ${signalCards.length} signals in UI`);
} else {
  console.log('⚠️ No signals visible in UI yet (may need a moment to render)');
}

// STEP 5: Instructions for refresh test
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 REFRESH TEST INSTRUCTIONS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. You should see 2 test signals (BTC/USDT LONG, ETH/USDT SHORT)');
console.log('2. Now REFRESH the page (F5 or Cmd+R)');
console.log('3. After refresh, run this command:');
console.log('');
console.log('   window.globalHubService.getActiveSignals()');
console.log('');
console.log('4. You should STILL see the 2 test signals');
console.log('5. If signals are missing, run DEEP_DIAGNOSTIC.js');

// STEP 6: Create verification function
window.verifyPersistence = () => {
  console.clear();
  console.log('🔍 VERIFYING PERSISTENCE AFTER REFRESH...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const signals = window.globalHubService.getActiveSignals();
  const metrics = window.globalHubService.getMetrics();
  const localStorage = JSON.parse(window.localStorage.getItem('globalHub_signals'));

  console.log('📦 localStorage:', localStorage?.activeSignals?.length || 0, 'signals');
  console.log('📊 Service state:', signals.length, 'signals');
  console.log('📈 Metrics:', metrics.totalSignals, 'total signals');

  if (signals.length > 0) {
    console.log('\n✅ SIGNALS PERSISTED SUCCESSFULLY!');
    signals.forEach(s => {
      console.log(`   - ${s.symbol} ${s.direction} (${s.id.includes('test-persist') ? 'TEST' : 'REAL'})`);
    });
    return true;
  } else {
    console.log('\n❌ SIGNALS DID NOT PERSIST');
    console.log('Checking localStorage directly...');
    if (localStorage?.activeSignals?.length > 0) {
      console.log('⚠️ Signals in localStorage but not in service!');
      console.log('Attempting to restore...');

      // Force restore
      window.globalHubService.state.activeSignals = localStorage.activeSignals;
      window.globalHubService.emit('signal:live', localStorage.activeSignals);
      console.log('✅ Forced restoration - check UI now');
    }
    return false;
  }
};

console.log('\n💡 After refresh, run: window.verifyPersistence()');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
/**
 * DEEP DIAGNOSTIC - Find the REAL issue with signal persistence
 * Run this in the browser console on the Intelligence Hub page
 */

console.clear();
console.log('🔍 DEEP DIAGNOSTIC - FINDING THE REAL ISSUE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Check if service exists
console.log('\n1️⃣ SERVICE CHECK:');
if (!window.globalHubService) {
  console.error('❌ CRITICAL: globalHubService not found!');
  console.log('   Navigate to Intelligence Hub page first!');
  throw new Error('Service not available');
}
console.log('✅ globalHubService exists');

// 2. Check localStorage raw data
console.log('\n2️⃣ LOCALSTORAGE RAW DATA:');
const signalsRaw = localStorage.getItem('globalHub_signals');
const metricsRaw = localStorage.getItem('globalHub_metrics');

if (signalsRaw) {
  try {
    const signals = JSON.parse(signalsRaw);
    console.log('📦 Signals in localStorage:');
    console.log('   Format:', Array.isArray(signals) ? 'OLD (array)' : 'NEW (object)');
    if (signals.activeSignals) {
      console.log('   Active signals:', signals.activeSignals.length);
      if (signals.activeSignals.length > 0) {
        console.log('   First active:', signals.activeSignals[0].symbol, signals.activeSignals[0].direction);
      }
    }
    if (signals.signalHistory) {
      console.log('   History signals:', signals.signalHistory.length);
      if (signals.signalHistory.length > 0) {
        console.log('   First history:', signals.signalHistory[0].symbol, signals.signalHistory[0].outcome);
      }
    }
  } catch (e) {
    console.error('❌ Failed to parse signals:', e);
  }
} else {
  console.log('❌ No signals in localStorage');
}

// 3. Check service internal state
console.log('\n3️⃣ SERVICE INTERNAL STATE:');
const state = window.globalHubService.state;
console.log('📊 Direct state access:');
console.log('   isRunning:', state.isRunning);
console.log('   activeSignals:', state.activeSignals.length);
console.log('   signalHistory:', state.signalHistory.length);
console.log('   metrics.totalSignals:', state.metrics.totalSignals);
console.log('   metrics.totalWins:', state.metrics.totalWins);
console.log('   metrics.totalLosses:', state.metrics.totalLosses);

if (state.activeSignals.length > 0) {
  console.log('   Active signals:', state.activeSignals.map(s => `${s.symbol} ${s.direction}`).join(', '));
}

// 4. Check public getters
console.log('\n4️⃣ PUBLIC GETTER METHODS:');
const publicActive = window.globalHubService.getActiveSignals();
const publicHistory = window.globalHubService.getSignalHistory();
const publicMetrics = window.globalHubService.getMetrics();

console.log('📊 Via getters:');
console.log('   getActiveSignals():', publicActive.length);
console.log('   getSignalHistory():', publicHistory.length);
console.log('   getMetrics().totalSignals:', publicMetrics.totalSignals);

// 5. Check if there's a mismatch
console.log('\n5️⃣ MISMATCH CHECK:');
const localStorageActive = signalsRaw ? JSON.parse(signalsRaw).activeSignals?.length || 0 : 0;
const stateActive = state.activeSignals.length;
const getterActive = publicActive.length;

if (localStorageActive !== stateActive || stateActive !== getterActive) {
  console.error('❌ MISMATCH DETECTED!');
  console.log('   localStorage:', localStorageActive);
  console.log('   state:', stateActive);
  console.log('   getter:', getterActive);
} else {
  console.log('✅ All sources match');
}

// 6. Test save functionality
console.log('\n6️⃣ TESTING SAVE FUNCTIONALITY:');
const testId = 'diagnostic-' + Date.now();
const testSignal = {
  id: testId,
  symbol: 'DIAGNOSTIC/TEST',
  direction: 'LONG',
  entry: 999,
  targets: [1000, 1001, 1002],
  stopLoss: 998,
  confidence: 99,
  timestamp: Date.now(),
  expiresAt: Date.now() + 3600000
};

// Add to state
state.activeSignals.push(testSignal);
console.log('✅ Added test signal to state');

// Call save method
window.globalHubService.saveSignals();
console.log('✅ Called saveSignals()');

// Check if saved
const afterSave = localStorage.getItem('globalHub_signals');
if (afterSave) {
  const parsed = JSON.parse(afterSave);
  const found = parsed.activeSignals?.some(s => s.id === testId);
  if (found) {
    console.log('✅ Test signal saved to localStorage');
  } else {
    console.error('❌ Test signal NOT saved to localStorage!');
    console.log('   This is the problem - saveSignals() not working!');
  }
}

// Remove test signal
state.activeSignals = state.activeSignals.filter(s => s.id !== testId);
window.globalHubService.saveSignals();

// 7. Check event listeners
console.log('\n7️⃣ TESTING EVENT SYSTEM:');
let eventReceived = false;
const testHandler = () => { eventReceived = true; };

window.globalHubService.on('signal:live', testHandler);
window.globalHubService.emit('signal:live', state.activeSignals);

setTimeout(() => {
  if (eventReceived) {
    console.log('✅ Event system working');
  } else {
    console.error('❌ Event system NOT working!');
  }
  window.globalHubService.off('signal:live', testHandler);
}, 100);

// 8. Check UI connection
console.log('\n8️⃣ UI CONNECTION CHECK:');
// Check if React component is listening
const hasReactFiber = document.querySelector('[data-reactroot]') ||
                      document.querySelector('#root')._reactRootContainer;
if (hasReactFiber) {
  console.log('✅ React app detected');
} else {
  console.log('⚠️ React app not detected');
}

// 9. Force emit to UI
console.log('\n9️⃣ FORCE EMITTING TO UI:');
window.globalHubService.emit('signal:live', state.activeSignals);
window.globalHubService.emit('signal:history', state.signalHistory);
window.globalHubService.emit('metrics:update', state.metrics);
window.globalHubService.emit('state:update', window.globalHubService.getState());
console.log('✅ Force emitted all events');

// 10. Check for errors
console.log('\n🔟 CHECKING FOR ERRORS:');
// Hook into console.error temporarily
const originalError = console.error;
let errors = [];
console.error = (...args) => {
  errors.push(args.join(' '));
  originalError.apply(console, args);
};

// Wait a bit and check
setTimeout(() => {
  console.error = originalError;
  if (errors.length > 0) {
    console.log('❌ Errors detected:', errors);
  } else {
    console.log('✅ No errors detected');
  }

  // FINAL DIAGNOSIS
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DIAGNOSIS COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Summary
  if (localStorageActive === 0 && stateActive === 0) {
    console.log('❌ NO SIGNALS ANYWHERE - Need to generate new signals');
  } else if (localStorageActive > 0 && stateActive === 0) {
    console.log('❌ SIGNALS IN LOCALSTORAGE BUT NOT IN STATE');
    console.log('   Problem: State not loading from localStorage');
  } else if (stateActive > 0 && localStorageActive === 0) {
    console.log('❌ SIGNALS IN STATE BUT NOT IN LOCALSTORAGE');
    console.log('   Problem: saveSignals() not working');
  } else if (stateActive > 0 && document.querySelectorAll('.signal-card').length === 0) {
    console.log('❌ SIGNALS IN STATE BUT NOT IN UI');
    console.log('   Problem: UI not receiving/rendering signals');
  } else {
    console.log('✅ Signals appear to be working');
  }

  console.log('\n💡 COPY THIS OUTPUT AND SHARE IT FOR DEBUGGING');
}, 500);
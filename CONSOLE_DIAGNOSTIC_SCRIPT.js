// 🔍 SIGNAL FLOW DIAGNOSTIC - Paste this into browser console

console.log('\n' + '='.repeat(80));
console.log('🔍 SIGNAL FLOW DIAGNOSTIC STARTING');
console.log('='.repeat(80));

// 1. Check if globalHubService exists
if (typeof globalHubService !== 'undefined') {
  console.log('✅ globalHubService exists');

  // Get current state
  const state = globalHubService.getState();
  console.log('\n📊 Hub State:');
  console.log('   Running:', state.isRunning);
  console.log('   Active Signals:', state.activeSignals.length);
  console.log('   Total Signals Generated:', state.metrics.totalSignals || 0);

  // Get metrics
  const metrics = globalHubService.getMetrics();
  console.log('\n📈 Pipeline Metrics:');
  console.log('   Alpha Generated:', metrics.alphaSignalsGenerated || 0);
  console.log('   Beta Scored:', metrics.betaSignalsScored || 0);
  console.log('   Gamma Passed:', metrics.gammaSignalsPassed || 0);
  console.log('   Delta Passed:', metrics.deltaPassed || 0);
  console.log('   Quality Gate Received:', metrics.qualityGateReceived || 0);
  console.log('   Quality Gate Approved:', metrics.qualityGateApproved || 0);
  console.log('   Publishing Started:', metrics.publishingStarted || 0);
  console.log('   Publishing Complete:', metrics.publishingComplete || 0);
  console.log('   Publishing Failed:', metrics.publishingFailed || 0);

  // Show active signals
  if (state.activeSignals.length > 0) {
    console.log('\n✅ ACTIVE SIGNALS IN MEMORY:');
    state.activeSignals.slice(0, 5).forEach((sig, i) => {
      console.log(`   ${i + 1}. ${sig.symbol} ${sig.direction} - Quality: ${sig.qualityScore}`);
    });
  } else {
    console.log('\n⚠️  NO ACTIVE SIGNALS IN MEMORY');
  }

  // Check event listeners
  console.log('\n📡 Checking Event Emitter:');
  if (globalHubService.eventEmitter) {
    console.log('   ✅ Event emitter exists');
  } else {
    console.log('   ❌ Event emitter missing!');
  }

} else {
  console.log('❌ globalHubService NOT FOUND');
  console.log('   Hub may not be initialized yet');
}

// 2. Check Intelligence Hub component
console.log('\n🖥️  Checking Intelligence Hub UI:');
const hubElement = document.querySelector('[data-hub-signals]') ||
                   document.querySelector('.signals-container') ||
                   document.querySelector('[class*="intelligence"]');
if (hubElement) {
  console.log('   ✅ Hub UI element found');
} else {
  console.log('   ⚠️  Hub UI element not found (may be on different page)');
}

// 3. Check localStorage
console.log('\n💾 Checking localStorage:');
const storedMetrics = localStorage.getItem('hubMetrics');
if (storedMetrics) {
  try {
    const parsed = JSON.parse(storedMetrics);
    console.log('   ✅ Stored metrics found');
    console.log('   Total signals in storage:', parsed.totalSignals || 0);
  } catch (e) {
    console.log('   ⚠️  Stored metrics corrupted');
  }
} else {
  console.log('   ⚠️  No stored metrics');
}

// 4. Trigger manual signal generation test
console.log('\n🧪 MANUAL TEST: Checking if hub can generate signals...');
if (typeof globalHubService !== 'undefined' && globalHubService.getState().isRunning) {
  console.log('   Hub is running - signals should be generating every 5 seconds');
  console.log('   Watch console for "ANALYZING" logs');
} else {
  console.log('   ⚠️  Hub is NOT running - no signals will generate');
  console.log('   Try: globalHubService.start()');
}

console.log('\n' + '='.repeat(80));
console.log('🔍 DIAGNOSTIC COMPLETE');
console.log('='.repeat(80));
console.log('\n📝 NEXT STEPS:');
console.log('1. If hub is NOT running: Run globalHubService.start()');
console.log('2. If Delta Passed = 0: Delta is rejecting all signals');
console.log('3. If Publishing Started = 0: Signals not reaching publish function');
console.log('4. If Publishing Complete < Started: Publishing is failing');
console.log('5. If Active Signals > 0 but UI empty: Event listener issue');
console.log('\n');

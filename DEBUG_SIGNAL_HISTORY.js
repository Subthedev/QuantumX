// Run this in browser console to debug signal history issues

function debugSignalHistory() {
  const globalHubService = window.globalHubService;

  if (!globalHubService) {
    console.error('❌ globalHubService not found in window');
    return;
  }

  console.log('\n========== SIGNAL HISTORY DEBUG ==========\n');

  // Get all signals
  const activeSignals = globalHubService.getActiveSignals();
  const signalHistory = globalHubService.getSignalHistory();

  console.log('📊 Signal Counts:');
  console.log('  Active Signals:', activeSignals.length);
  console.log('  Signal History:', signalHistory.length);

  // Check signal history timestamps
  if (signalHistory.length > 0) {
    console.log('\n📅 Signal History Timestamps:');

    // Sort by outcomeTimestamp
    const sorted = [...signalHistory].sort((a, b) => {
      const aTime = a.outcomeTimestamp || a.timestamp;
      const bTime = b.outcomeTimestamp || b.timestamp;
      return bTime - aTime;
    });

    console.log('\n🔝 NEWEST 5 Signals (should be on page 1):');
    sorted.slice(0, 5).forEach((signal, i) => {
      const time = signal.outcomeTimestamp || signal.timestamp;
      const minutesAgo = Math.round((Date.now() - time) / 60000);
      const hoursAgo = Math.round(minutesAgo / 60);

      console.log(`  ${i + 1}. ${signal.symbol} ${signal.direction} - ${signal.outcome}`);
      console.log(`     Created: ${new Date(signal.timestamp).toLocaleString()}`);
      console.log(`     Completed: ${signal.outcomeTimestamp ? new Date(signal.outcomeTimestamp).toLocaleString() : 'N/A'}`);
      console.log(`     Age: ${hoursAgo < 1 ? `${minutesAgo} minutes ago` : `${hoursAgo} hours ago`}`);
      console.log(`     Return: ${signal.actualReturn ? signal.actualReturn.toFixed(2) + '%' : 'N/A'}`);
    });

    console.log('\n🔻 OLDEST 5 Signals (should be on last page):');
    sorted.slice(-5).forEach((signal, i) => {
      const time = signal.outcomeTimestamp || signal.timestamp;
      const minutesAgo = Math.round((Date.now() - time) / 60000);
      const hoursAgo = Math.round(minutesAgo / 60);

      console.log(`  ${i + 1}. ${signal.symbol} ${signal.direction} - ${signal.outcome}`);
      console.log(`     Created: ${new Date(signal.timestamp).toLocaleString()}`);
      console.log(`     Completed: ${signal.outcomeTimestamp ? new Date(signal.outcomeTimestamp).toLocaleString() : 'N/A'}`);
      console.log(`     Age: ${hoursAgo < 1 ? `${minutesAgo} minutes ago` : `${hoursAgo} hours ago`}`);
    });

    // Check for signals without outcomeTimestamp
    const noOutcome = signalHistory.filter(s => !s.outcomeTimestamp);
    if (noOutcome.length > 0) {
      console.log('\n⚠️ Signals WITHOUT outcomeTimestamp:', noOutcome.length);
      console.log('These signals might not be sorted correctly!');
      noOutcome.slice(0, 3).forEach(s => {
        console.log(`  - ${s.symbol} ${s.direction} (created: ${new Date(s.timestamp).toLocaleString()})`);
      });
    }

    // Check for future timestamps
    const futureSignals = signalHistory.filter(s => {
      const time = s.outcomeTimestamp || s.timestamp;
      return time > Date.now();
    });
    if (futureSignals.length > 0) {
      console.log('\n❌ Signals with FUTURE timestamps:', futureSignals.length);
      console.log('This will break sorting!');
    }
  }

  // Check active signals
  if (activeSignals.length > 0) {
    console.log('\n📍 Active Signals (not yet completed):');
    activeSignals.slice(0, 5).forEach((signal, i) => {
      const minutesActive = Math.round((Date.now() - signal.timestamp) / 60000);
      console.log(`  ${i + 1}. ${signal.symbol} ${signal.direction}`);
      console.log(`     Active for: ${minutesActive} minutes`);
      console.log(`     Entry: $${signal.entry?.toFixed(2) || 'N/A'}`);
      console.log(`     Expires: ${signal.expiresAt ? new Date(signal.expiresAt).toLocaleTimeString() : 'N/A'}`);
    });
  }

  // Check if signals are actually completing
  console.log('\n🔍 Checking Signal Completion:');

  // Listen for next outcome
  globalHubService.once('signal:outcome', (outcome) => {
    console.log('✅ SIGNAL OUTCOME DETECTED:', outcome);
  });

  globalHubService.once('signal:history', (history) => {
    console.log('✅ SIGNAL HISTORY UPDATE DETECTED:', history.length, 'signals');
  });

  console.log('Listening for next signal outcome...');
  console.log('If no outcomes are detected, signals are NOT completing properly!');

  // Force update signal history
  console.log('\n🔄 Force Updating Signal History...');
  globalHubService.emit('signal:history', globalHubService.getSignalHistory());

  console.log('\n========== END DEBUG ==========\n');
  console.log('Run this function again after a minute to see if anything changed.');
  console.log('If signals are 23+ hours old, the problem is they are NOT completing!');
}

// Make function available globally
window.debugSignalHistory = debugSignalHistory;

console.log('✅ Debug function loaded. Run: debugSignalHistory()');

// Auto-run
debugSignalHistory();
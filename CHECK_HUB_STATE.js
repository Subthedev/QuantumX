// Run this in browser console to check Intelligence Hub state

console.log('=== INTELLIGENCE HUB DIAGNOSTIC ===');

// 1. Check active signals
const activeSignals = window.globalHubService.getActiveSignals();
console.log(`\n📡 ACTIVE SIGNALS: ${activeSignals.length}`);
if (activeSignals.length > 0) {
  console.log('First active signal:', activeSignals[0]);
}

// 2. Check signal history
const history = window.globalHubService.getSignalHistory();
console.log(`\n📚 SIGNAL HISTORY: ${history.length} total`);

// Filter for last 24 hours
const now = Date.now();
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const recent = history.filter(s => {
  const signalTime = s.outcomeTimestamp || s.timestamp;
  return (now - signalTime) <= TWENTY_FOUR_HOURS;
});

console.log(`Last 24 hours: ${recent.length} signals`);

// Sort by most recent
const sorted = [...recent].sort((a, b) => {
  const aTime = a.outcomeTimestamp || a.timestamp;
  const bTime = b.outcomeTimestamp || b.timestamp;
  return bTime - aTime; // Newest first
});

if (sorted.length > 0) {
  console.log('\n🔝 MOST RECENT SIGNAL:');
  const latest = sorted[0];
  console.log({
    symbol: latest.symbol,
    direction: latest.direction,
    outcome: latest.outcome,
    outcomeTimestamp: latest.outcomeTimestamp ? new Date(latest.outcomeTimestamp).toLocaleString() : 'none',
    createdAt: new Date(latest.timestamp).toLocaleString(),
    hoursAgo: ((now - (latest.outcomeTimestamp || latest.timestamp)) / 3600000).toFixed(1)
  });
}

if (sorted.length > 5) {
  console.log('\n📋 LAST 5 COMPLETED SIGNALS:');
  sorted.slice(0, 5).forEach((s, i) => {
    const time = s.outcomeTimestamp || s.timestamp;
    console.log(`${i + 1}. ${s.symbol} ${s.direction} - ${s.outcome || 'ACTIVE'} - ${((now - time) / 3600000).toFixed(1)}h ago`);
  });
}

// 3. Check metrics
const metrics = window.globalHubService.getMetrics();
console.log('\n📊 METRICS:');
console.log({
  totalSignals: metrics.totalSignals,
  totalWins: metrics.totalWins,
  totalLosses: metrics.totalLosses,
  winRate: metrics.winRate.toFixed(1) + '%',
  lastUpdate: new Date(metrics.lastUpdate).toLocaleString(),
  minutesSinceUpdate: ((now - metrics.lastUpdate) / 60000).toFixed(1)
});

// 4. Check if service is running
console.log('\n⚙️ SERVICE STATUS:');
console.log('Is running:', window.globalHubService.isRunning());
console.log('State:', window.globalHubService.getState());

// 5. Check quality gate
console.log('\n🚪 QUALITY GATE:');
const budgetStatus = window.signalQualityGate.getBudgetStatus();
console.log({
  signalsToday: budgetStatus.signalsPublishedToday,
  maxPerDay: window.signalQualityGate.getConfig().maxSignalsPerDay,
  remaining: budgetStatus.signalsRemainingToday,
  queued: budgetStatus.queuedCandidates,
  lastSignal: budgetStatus.minutesSinceLastSignal ? `${budgetStatus.minutesSinceLastSignal}m ago` : 'none'
});

// 6. Check outcome tracker
console.log('\n🎯 OUTCOME TRACKER:');
console.log('Active tracking:', window.realOutcomeTracker.activeSignals);

console.log('\n=== END DIAGNOSTIC ===');
console.log('Copy this output and check for issues.');
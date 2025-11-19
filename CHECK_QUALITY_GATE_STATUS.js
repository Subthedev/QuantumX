// ═══════════════════════════════════════════════════════════
// 🔍 CHECK QUALITY GATE STATUS - Diagnose 262 Stuck Signals
// ═══════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('🔍 QUALITY GATE DIAGNOSTIC - Finding the 262 Stuck Signals');
console.log('═'.repeat(80) + '\n');

// Check if Quality Gate exists
if (!window.signalQualityGate) {
  console.error('❌ signalQualityGate not found on window!');
  console.log('Run this in the Intelligence Hub page after hub has started');
} else {
  console.log('✅ Quality Gate instance found\n');

  // Get budget status
  const budget = window.signalQualityGate.getBudgetStatus();
  console.log('📊 BUDGET STATUS:');
  console.log('─'.repeat(80));
  console.log(`Published Today (24h): ${budget.signalsPublishedToday}`);
  console.log(`Remaining Today: ${budget.signalsRemainingToday}`);
  console.log(`Budget Used: ${budget.budgetUsedPercent.toFixed(1)}%`);
  console.log(`Can Publish Now: ${budget.canPublishNow ? '✅ YES' : '❌ NO'}`);
  console.log(`Minutes Since Last: ${budget.minutesSinceLastSignal || 'N/A'}`);
  console.log(`Queued Candidates: ${budget.queuedCandidates}`);
  console.log(`Top Queued Score: ${budget.topQueuedScore?.toFixed(1) || 'N/A'}`);

  // Get queue status
  const queue = window.signalQualityGate.getQueueStatus();
  console.log('\n📥 QUEUE STATUS:');
  console.log('─'.repeat(80));
  console.log(`Queue Size: ${queue.size}`);

  if (queue.size > 0) {
    console.log('\n🔍 QUEUE CONTENTS:');
    queue.candidates.slice(0, 10).forEach((candidate, i) => {
      const age = Math.floor((Date.now() - candidate.receivedAt) / 60000);
      console.log(`  ${i+1}. ${candidate.signal.symbol} ${candidate.signal.direction} | Score: ${candidate.qualityScore.totalScore.toFixed(1)} | Age: ${age}m`);
    });
    if (queue.size > 10) {
      console.log(`  ... and ${queue.size - 10} more signals`);
    }
  } else {
    console.log('Queue is empty - no signals waiting');
  }

  // Get config
  const config = window.signalQualityGate.getConfig();
  console.log('\n⚙️  CONFIGURATION:');
  console.log('─'.repeat(80));
  console.log(`Min Quality Score: ${config.minQualityScore}`);
  console.log(`Excellent Threshold: ${config.excellentScoreThreshold}`);
  console.log(`Max Signals/Day: ${config.maxSignalsPerDay}`);
  console.log(`Target Signals/Day: ${config.targetSignalsPerDay}`);
  console.log(`Min Time Between: ${config.minTimeBetweenSignals} minutes`);
  console.log(`Max Signals/Hour: ${config.maxSignalsPerHour}`);
  console.log(`Queue Flush Interval: ${config.queueFlushInterval}ms`);

  // Check callback registration
  console.log('\n🔗 CALLBACK STATUS:');
  console.log('─'.repeat(80));
  const hasCallback = window.signalQualityGate.onSignalPublished !== null;
  console.log(`Callback Registered: ${hasCallback ? '✅ YES' : '❌ NO'}`);

  if (!hasCallback) {
    console.error('\n⚠️  CRITICAL ISSUE: NO CALLBACK REGISTERED!');
    console.log('This means approved signals cannot be published!');
    console.log('Fix: Ensure globalHubService.start() is called');
  }

  // Check localStorage
  console.log('\n💾 LOCALSTORAGE DATA:');
  console.log('─'.repeat(80));
  try {
    const published = localStorage.getItem('quality-gate-published-signals');
    if (published) {
      const data = JSON.parse(published);
      console.log(`Published Signals Stored: ${data.length}`);
      if (data.length > 0) {
        const recent = data.slice(-5);
        console.log('\nRecent 5 published signals:');
        recent.forEach((s, i) => {
          const ago = Math.floor((Date.now() - s.timestamp) / 60000);
          console.log(`  ${i+1}. Score: ${s.score.toFixed(1)} | ${ago}m ago`);
        });
      }
    } else {
      console.log('No published signals in localStorage');
    }
  } catch (error) {
    console.error('Error reading localStorage:', error);
  }

  // DIAGNOSIS
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 DIAGNOSIS');
  console.log('═'.repeat(80));

  const totalSignals = budget.signalsPublishedToday + queue.size;

  if (totalSignals >= 260 && totalSignals <= 265) {
    console.log(`\n✅ FOUND THE 262 SIGNALS!`);
    console.log(`   Published: ${budget.signalsPublishedToday}`);
    console.log(`   Queued: ${queue.size}`);
    console.log(`   Total: ${totalSignals}`);

    if (budget.signalsPublishedToday >= 260) {
      console.log('\n📊 SIGNALS WERE PUBLISHED SUCCESSFULLY!');
      console.log('   The 262 signals are in the "published" list (last 24 hours)');
      console.log('   They should have flowed to Smart Pool → Database → UI');
      console.log('\n💡 Next Step: Check Smart Pool and Database');
      console.log('   Run: await window.smartSignalPool?.getPoolStats()');
      console.log('   Then check: user_signals table in database');
    }

    if (queue.size >= 260) {
      console.log('\n⚠️  SIGNALS ARE STUCK IN QUEUE!');
      console.log('   262 signals are waiting in queue but not being flushed');
      console.log(`   Can publish now: ${budget.canPublishNow}`);
      console.log(`   Budget remaining: ${budget.signalsRemainingToday}`);
      console.log('\n💡 Fix: Clear queue and switch to immediate publishing');
      console.log('   Run: window.signalQualityGate.clearQueue()');
    }
  } else {
    console.log(`\n🔍 Total signals: ${totalSignals}`);
    console.log('   Published: ' + budget.signalsPublishedToday);
    console.log('   Queued: ' + queue.size);
    console.log('\n💡 The 262 count might be from a different metric');
    console.log('   Check IGX Control Center for the exact metric showing 262');
  }
}

console.log('\n' + '═'.repeat(80));
console.log('Diagnostic complete!');
console.log('═'.repeat(80) + '\n');

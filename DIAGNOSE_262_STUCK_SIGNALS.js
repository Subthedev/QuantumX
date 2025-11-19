// ═══════════════════════════════════════════════════════════
// 🔍 FIND THE 262 STUCK SIGNALS - Complete Signal Flow Diagnostic
// ═══════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(100));
console.log('🔍 TRACING 262 STUCK SIGNALS - WHERE ARE THEY?');
console.log('═'.repeat(100) + '\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1: Check Delta Engine (Source)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('STEP 1: Delta V2 Quality Engine');
console.log('─'.repeat(100));

if (!window.deltaV2QualityEngine) {
  console.error('❌ Delta engine not found!');
} else {
  const deltaStats = window.deltaV2QualityEngine.getStats();
  console.log(`✅ Delta Engine Active`);
  console.log(`   Total Processed: ${deltaStats.totalProcessed}`);
  console.log(`   Total Passed: ${deltaStats.totalPassed}`);
  console.log(`   Total Rejected: ${deltaStats.totalRejected}`);
  console.log(`   Pass Rate: ${deltaStats.passRate.toFixed(1)}%`);

  if (deltaStats.totalPassed >= 260) {
    console.log(`\n   ⚠️  FOUND: Delta passed ${deltaStats.totalPassed} signals!`);
    console.log(`   These should have gone to Quality Gate...`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2: Check Quality Gate V2 (Old System)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\nSTEP 2: Quality Gate V2 (Immediate Publishing)');
console.log('─'.repeat(100));

if (!window.signalQualityGate) {
  console.error('❌ Quality Gate V2 not found!');
} else {
  const budget = window.signalQualityGate.getBudgetStatus();
  const queue = window.signalQualityGate.getQueueStatus();
  const config = window.signalQualityGate.getConfig();

  console.log(`✅ Quality Gate V2 Active`);
  console.log(`\n   Budget Status:`);
  console.log(`   Published (24h): ${budget.signalsPublishedToday}`);
  console.log(`   Remaining: ${budget.signalsRemainingToday}`);
  console.log(`   Can Publish: ${budget.canPublishNow ? 'YES' : 'NO'}`);
  console.log(`   Minutes Since Last: ${budget.minutesSinceLastSignal || 'N/A'}`);

  console.log(`\n   Queue Status:`);
  console.log(`   Queued: ${queue.size}`);
  console.log(`   Top Score: ${queue.topQueuedScore?.toFixed(1) || 'N/A'}`);

  console.log(`\n   Configuration:`);
  console.log(`   Min Quality: ${config.minQualityScore}`);
  console.log(`   Min Time Between: ${config.minTimeBetweenSignals} minutes`);
  console.log(`   Max Per Day: ${config.maxSignalsPerDay}`);

  // Check callback registration
  const hasCallback = window.signalQualityGate.onSignalPublished !== null;
  console.log(`\n   Callback: ${hasCallback ? '✅ REGISTERED' : '❌ NOT REGISTERED'}`);

  // Calculate total
  const totalV2 = budget.signalsPublishedToday + queue.size;

  if (totalV2 >= 260 && totalV2 <= 265) {
    console.log(`\n   🎯 FOUND THE 262 SIGNALS IN QUALITY GATE V2!`);
    console.log(`   Published: ${budget.signalsPublishedToday}`);
    console.log(`   Queued: ${queue.size}`);
    console.log(`   Total: ${totalV2}`);

    if (budget.signalsPublishedToday >= 260) {
      console.log(`\n   ✅ Signals WERE published by Quality Gate V2!`);
      console.log(`   They should be in Smart Pool or Database...`);
    }

    if (queue.size >= 260) {
      console.log(`\n   ⚠️  Signals STUCK IN QUEUE!`);
      console.log(`   Queue is not being flushed properly`);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: Check Quality Gate V3 (New System)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\nSTEP 3: Quality Gate V3 (Scheduled Distribution)');
console.log('─'.repeat(100));

if (!window.signalQualityGateV3) {
  console.error('❌ Quality Gate V3 not found!');
} else {
  const storage = window.signalQualityGateV3.getStorageStatus();
  const quotas = window.signalQualityGateV3.getTierQuotas();

  console.log(`✅ Quality Gate V3 Active`);
  console.log(`\n   Storage:`);
  console.log(`   Total Stored: ${storage.totalStored}`);
  console.log(`   By Quality: Excellent ${storage.byQuality.excellent} | Good ${storage.byQuality.good} | Acceptable ${storage.byQuality.acceptable}`);

  console.log(`\n   Quotas:`);
  console.log(`   MAX: ${quotas.MAX.published24h}/30`);
  console.log(`   PRO: ${quotas.PRO.published24h}/15`);
  console.log(`   FREE: ${quotas.FREE.published24h}/2`);

  if (storage.totalStored >= 50) {
    console.log(`\n   ✅ V3 has ${storage.totalStored} signals in storage`);
    console.log(`   These will be dropped on schedule`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 4: Check Smart Signal Pool
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\nSTEP 4: Smart Signal Pool');
console.log('─'.repeat(100));

if (!window.smartSignalPool) {
  console.error('❌ Smart Signal Pool not found!');
} else {
  const poolStats = window.smartSignalPool.getPoolStats();

  console.log(`✅ Smart Signal Pool Active`);
  console.log(`   Total Signals: ${poolStats.totalSignals || 0}`);
  console.log(`   Avg Quality: ${poolStats.avgQuality?.toFixed(1) || 'N/A'}%`);
  console.log(`   Avg Confidence: ${poolStats.avgConfidence?.toFixed(1) || 'N/A'}%`);

  if (poolStats.totalSignals >= 260) {
    console.log(`\n   🎯 FOUND: ${poolStats.totalSignals} signals in Smart Pool!`);
    console.log(`   These should be distributed to database...`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 5: Check Database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\nSTEP 5: Database (user_signals table)');
console.log('─'.repeat(100));

(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ No user logged in');
      return;
    }

    console.log(`✅ User: ${user.email}`);

    // Count all signals
    const { count: totalCount } = await supabase
      .from('user_signals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Count last 24h
    const { count: count24h } = await supabase
      .from('user_signals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());

    // Count last 1h
    const { count: count1h } = await supabase
      .from('user_signals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());

    console.log(`\n   Database Counts:`);
    console.log(`   All Time: ${totalCount || 0}`);
    console.log(`   Last 24h: ${count24h || 0}`);
    console.log(`   Last 1h: ${count1h || 0}`);

    if (count24h === 0) {
      console.log(`\n   ⚠️  NO SIGNALS IN DATABASE (last 24h)!`);
      console.log(`   This is the BLOCKAGE - signals not reaching database`);
    }

    if (count24h >= 260) {
      console.log(`\n   ✅ ${count24h} signals in database!`);
      console.log(`   Check if they're appearing in UI...`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Check Global Hub Service
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n\nSTEP 6: Global Hub Service');
    console.log('─'.repeat(100));

    if (!window.globalHubService) {
      console.error('❌ Global Hub Service not found!');
    } else {
      const state = window.globalHubService.getState();
      const metrics = window.globalHubService.getMetrics();

      console.log(`✅ Global Hub Service`);
      console.log(`   Running: ${state.isRunning ? 'YES' : 'NO'}`);
      console.log(`   Total Signals: ${metrics.totalSignals}`);
      console.log(`   Active Signals: ${state.activeSignals.length}`);
      console.log(`   Win Rate: ${metrics.winRate?.toFixed(1) || 0}%`);

      if (metrics.totalSignals >= 260) {
        console.log(`\n   ✅ Hub generated ${metrics.totalSignals} signals`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FINAL DIAGNOSIS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n\n' + '═'.repeat(100));
    console.log('🎯 DIAGNOSIS - WHERE ARE THE 262 SIGNALS?');
    console.log('═'.repeat(100));

    const deltaStats = window.deltaV2QualityEngine?.getStats();
    const budgetV2 = window.signalQualityGate?.getBudgetStatus();
    const queueV2 = window.signalQualityGate?.getQueueStatus();
    const storageV3 = window.signalQualityGateV3?.getStorageStatus();
    const poolStats = window.smartSignalPool?.getPoolStats();

    console.log(`\nSignal Flow Analysis:`);
    console.log(`   1. Delta Passed: ${deltaStats?.totalPassed || 0} signals`);
    console.log(`   2. Quality Gate V2 Published: ${budgetV2?.signalsPublishedToday || 0}`);
    console.log(`   3. Quality Gate V2 Queued: ${queueV2?.size || 0}`);
    console.log(`   4. Quality Gate V3 Stored: ${storageV3?.totalStored || 0}`);
    console.log(`   5. Smart Pool: ${poolStats?.totalSignals || 0} signals`);
    console.log(`   6. Database (24h): ${count24h || 0} signals`);
    console.log(`   7. Hub Active Signals: ${window.globalHubService?.getState().activeSignals.length || 0}`);

    // Find the blockage
    console.log(`\n🔍 Blockage Analysis:`);

    if (deltaStats?.totalPassed >= 260) {
      console.log(`   ✅ Delta passed 260+ signals to Quality Gate`);

      if (budgetV2?.signalsPublishedToday >= 260) {
        console.log(`   ✅ Quality Gate V2 published 260+ signals`);

        if (poolStats?.totalSignals >= 260) {
          console.log(`   ✅ Smart Pool has 260+ signals`);

          if (count24h === 0 || count24h < 50) {
            console.log(`   ❌ BLOCKAGE: Smart Pool → Database`);
            console.log(`   FIX: Check Smart Pool distribution logic`);
            console.log(`   Run: await window.smartSignalPool.distributeToTiers()`);
          }
        } else {
          console.log(`   ❌ BLOCKAGE: Quality Gate V2 → Smart Pool`);
          console.log(`   FIX: Check publishApprovedSignal() callback`);
        }
      } else if (queueV2?.size >= 260) {
        console.log(`   ❌ BLOCKAGE: Quality Gate V2 Queue (not flushing)`);
        console.log(`   FIX: Clear queue or change to immediate publishing`);
        console.log(`   Run: window.signalQualityGate.clearQueue()`);
      } else {
        console.log(`   ❌ BLOCKAGE: Quality Gate V2 (rejecting signals)`);
        console.log(`   FIX: Check Quality Gate thresholds`);
      }
    } else {
      console.log(`   ❌ BLOCKAGE: Delta Engine (rejecting most signals)`);
      console.log(`   FIX: Lower Delta thresholds`);
      console.log(`   Run: window.deltaV2QualityEngine.setThresholds(30, 0.40, 0)`);
    }

    // Provide immediate fix
    console.log(`\n\n` + '═'.repeat(100));
    console.log('💡 IMMEDIATE FIX');
    console.log('═'.repeat(100));

    if (queueV2 && queueV2.size >= 260) {
      console.log(`\n🔧 The 262 signals are STUCK IN QUALITY GATE V2 QUEUE!`);
      console.log(`\nCopy and run this to CLEAR THE QUEUE:`);
      console.log(`\n   window.signalQualityGate.clearQueue();`);
      console.log(`   window.signalQualityGate.updateConfig({ minTimeBetweenSignals: 0 });`);
      console.log(`   console.log('✅ Queue cleared - signals will now publish immediately');`);
    } else if (budgetV2 && budgetV2.signalsPublishedToday >= 260 && count24h === 0) {
      console.log(`\n🔧 Signals published by Quality Gate but not in database!`);
      console.log(`\nCopy and run this to FORCE DISTRIBUTION:`);
      console.log(`\n   await window.smartSignalPool.distributeToTiers();`);
      console.log(`   console.log('✅ Forced distribution to tiers');`);
    } else if (deltaStats && deltaStats.totalPassed < 100) {
      console.log(`\n🔧 Delta is rejecting too many signals!`);
      console.log(`\nCopy and run this to LOWER THRESHOLDS:`);
      console.log(`\n   window.deltaV2QualityEngine.setThresholds(30, 0.40, 0);`);
      console.log(`   console.log('✅ Delta thresholds lowered');`);
    }

    console.log('\n' + '═'.repeat(100));
    console.log('Diagnostic complete!');
    console.log('═'.repeat(100) + '\n');

  } catch (error) {
    console.error('Error in diagnostic:', error);
  }
})();

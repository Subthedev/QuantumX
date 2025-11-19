/**
 * COMPREHENSIVE SIGNAL FLOW DIAGNOSTIC
 *
 * Run this in browser console to trace the EXACT flow of signals
 * and identify where they're getting lost.
 *
 * Usage: Copy and paste this entire script into browser console
 */

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 COMPREHENSIVE SIGNAL FLOW DIAGNOSTIC');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Step 1: Check if Hub is running
console.log('\n📊 STEP 1: Check Hub Service Status');
console.log('───────────────────────────────────────');

const isRunning = window.globalHubService?.isRunning();
console.log(`✓ Hub running: ${isRunning ? '✅ YES' : '❌ NO'}`);

if (!isRunning) {
  console.error('❌ CRITICAL: Hub is not running! Start it first.');
  console.error('   Go to Control Center → HUB tab → Click "Start Global Hub System"');
}

// Step 2: Check current signal state
console.log('\n📊 STEP 2: Current Signal State');
console.log('───────────────────────────────────────');

const activeSignals = window.globalHubService?.getActiveSignals() || [];
const signalHistory = window.globalHubService?.getSignalHistory() || [];
const metrics = window.globalHubService?.getMetrics() || {};

console.log(`✓ Active signals in memory: ${activeSignals.length}`);
console.log(`✓ Signal history: ${signalHistory.length}`);
console.log(`✓ Total signals generated: ${metrics.totalSignals || 0}`);

if (activeSignals.length > 0) {
  console.log('\n📋 Current Active Signals:');
  activeSignals.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.symbol} ${s.direction} | Confidence: ${s.confidence?.toFixed(1)}% | ${new Date(s.timestamp).toLocaleTimeString()}`);
  });
}

// Step 3: Check database signals
console.log('\n📊 STEP 3: Check Supabase Database');
console.log('───────────────────────────────────────');

(async () => {
  try {
    const { data: dbSignals, error } = await window.supabase
      .from('intelligence_signals')
      .select('*')
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    console.log(`✓ Active signals in database: ${dbSignals?.length || 0}`);

    if (dbSignals && dbSignals.length > 0) {
      console.log('\n📋 Signals in Database:');
      dbSignals.forEach((s, i) => {
        const createdAt = new Date(s.created_at);
        const ageMinutes = Math.floor((Date.now() - createdAt.getTime()) / 60000);
        console.log(`  ${i + 1}. ${s.symbol} ${s.signal_type} | Confidence: ${s.confidence?.toFixed(1)}% | Created: ${ageMinutes}m ago`);
      });
    }

    // Step 4: Check Quality Gate state
    console.log('\n📊 STEP 4: Check Quality Gate');
    console.log('───────────────────────────────────────');

    const qgBudget = window.signalQualityGate?.getBudgetStatus();
    const qgQueue = window.signalQualityGate?.getQueueStatus();

    console.log(`✓ Quality Gate config: Min score ${window.signalQualityGate?.config?.minQualityScore || 'unknown'}`);
    console.log(`✓ Signals published today: ${qgBudget?.signalsPublishedToday || 0}`);
    console.log(`✓ Budget remaining: ${qgBudget?.signalsRemainingToday || 'unknown'}`);
    console.log(`✓ Queued signals: ${qgQueue?.size || 0}`);
    console.log(`✓ Can publish now: ${qgBudget?.canPublishNow ? '✅ YES' : '❌ NO'}`);

    if (qgBudget && !qgBudget.canPublishNow) {
      console.warn('⚠️ WARNING: Quality Gate cannot publish new signals!');
      console.warn(`   Reason: Budget exhausted or timing constraint`);
      console.warn(`   Last signal: ${qgBudget.minutesSinceLastSignal || 'never'}m ago`);
    }

    // Step 5: Check if callback is registered
    console.log('\n📊 STEP 5: Check Quality Gate Callback');
    console.log('───────────────────────────────────────');

    const hasCallback = window.signalQualityGate?.onSignalPublished !== null && window.signalQualityGate?.onSignalPublished !== undefined;
    console.log(`✓ Callback registered: ${hasCallback ? '✅ YES' : '❌ NO'}`);

    if (!hasCallback) {
      console.error('❌ CRITICAL: Quality Gate callback is NOT registered!');
      console.error('   This means approved signals cannot reach the database!');
      console.error('   FIX: Restart the Hub Service');
    }

    // Step 6: Check database polling
    console.log('\n📊 STEP 6: Check Database Polling');
    console.log('───────────────────────────────────────');

    const isPolling = window.signalDatabaseService?.pollingInterval !== null;
    console.log(`✓ Database polling active: ${isPolling ? '✅ YES' : '❌ NO'}`);

    if (!isPolling) {
      console.error('❌ CRITICAL: Database polling is NOT active!');
      console.error('   UI will not receive signals from database');
      console.error('   FIX: Refresh the page');
    }

    // Step 7: Check recent rejections
    console.log('\n📊 STEP 7: Check Recent Rejections');
    console.log('───────────────────────────────────────');

    const { data: rejections, error: rejError } = await window.supabase
      .from('rejected_signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })
      .limit(5);

    if (!rejError && rejections && rejections.length > 0) {
      console.log(`✓ Found ${rejections.length} rejections in last 5 minutes:`);
      rejections.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.symbol} ${r.direction} | Stage: ${r.rejection_stage} | Reason: ${r.rejection_reason} | Score: ${r.quality_score?.toFixed(1) || 'N/A'}`);
      });
    } else {
      console.log('✓ No recent rejections found');
    }

    // Final Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const issues = [];

    if (!isRunning) issues.push('❌ Hub service not running');
    if (!hasCallback) issues.push('❌ Quality Gate callback not registered');
    if (!isPolling) issues.push('❌ Database polling not active');
    if (qgBudget && !qgBudget.canPublishNow && qgBudget.signalsRemainingToday > 0) {
      issues.push('⚠️ Quality Gate timing constraint active');
    }

    if (issues.length === 0) {
      console.log('✅ ALL SYSTEMS OPERATIONAL');
      console.log('\nIf signals still don\'t appear:');
      console.log('1. Check console for Quality Gate rejections');
      console.log('2. Watch for "🚨 QUALITY-APPROVED SIGNAL PUBLISHED" messages');
      console.log('3. Run this diagnostic again after 2-3 minutes');
    } else {
      console.error('\n🚨 ISSUES DETECTED:');
      issues.forEach((issue, i) => {
        console.error(`  ${i + 1}. ${issue}`);
      });

      console.log('\n🔧 RECOMMENDED FIXES:');
      if (!isRunning || !hasCallback) {
        console.log('  1. Stop Hub: Go to Control Center → HUB tab → "Stop All Engines"');
        console.log('  2. Wait 3 seconds');
        console.log('  3. Start Hub: Click "Start Global Hub System"');
      }
      if (!isPolling) {
        console.log('  4. Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)');
      }
    }

    console.log('\n💡 TIP: Run this diagnostic every 2-3 minutes to monitor signal flow');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
})();

// 🔍 COMPLETE SYSTEM VERIFICATION
// Run this AFTER applying the Delta threshold fix
// This checks that everything is working correctly

console.log('\n' + '═'.repeat(80));
console.log('🔍 COMPLETE SYSTEM VERIFICATION');
console.log('═'.repeat(80) + '\n');

(async function verifyEverything() {
  const results = {
    authentication: false,
    deltaEngine: false,
    deltaThresholds: false,
    scheduler: false,
    timer: false,
    bufferHasSignals: false,
    databaseHasSignals: false
  };

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. CHECK AUTHENTICATION
    // ═══════════════════════════════════════════════════════════
    console.log('1️⃣ AUTHENTICATION');
    console.log('─'.repeat(80));

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ NOT AUTHENTICATED');
      console.log('   Fix: Log in to the application\n');
    } else {
      console.log(`✅ Authenticated as: ${user.email}`);
      results.authentication = true;
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // 2. CHECK DELTA ENGINE
    // ═══════════════════════════════════════════════════════════
    console.log('2️⃣ DELTA V2 QUALITY ENGINE');
    console.log('─'.repeat(80));

    if (typeof window.deltaV2QualityEngine === 'undefined') {
      console.error('❌ Delta engine NOT FOUND');
      console.log('   Fix: Refresh the page and wait for it to load\n');
    } else {
      console.log('✅ Delta engine found');
      results.deltaEngine = true;

      // Check thresholds
      const thresholds = window.deltaV2QualityEngine.getThresholds();
      console.log(`   Quality: ${thresholds.quality}`);
      console.log(`   ML Probability: ${(thresholds.ml * 100).toFixed(0)}%`);
      console.log(`   Strategy Win Rate: ${thresholds.strategyWinRate}%`);

      if (thresholds.ml <= 0.30) {
        console.log('   ✅ ML threshold is LOW (good for testing)');
        results.deltaThresholds = true;
      } else {
        console.log(`   ⚠️  ML threshold is HIGH (${(thresholds.ml * 100).toFixed(0)}% - signals may be rejected)`);
        console.log('   Fix: Run FIX_DELTA_THRESHOLDS_NOW.js');
      }
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // 3. CHECK SCHEDULER
    // ═══════════════════════════════════════════════════════════
    console.log('3️⃣ SCHEDULED SIGNAL DROPPER');
    console.log('─'.repeat(80));

    if (typeof window.scheduledSignalDropper === 'undefined') {
      console.error('❌ Scheduler NOT FOUND');
      console.log('   Fix: Refresh the page\n');
    } else {
      console.log('✅ Scheduler found');
      results.scheduler = true;

      const stats = window.scheduledSignalDropper.getAllStats();
      console.log(`   Running: ${stats.isRunning ? '✅ YES' : '❌ NO'}`);
      console.log(`   Buffer size: ${stats.bufferSize} signals`);
      console.log(`   Next drop in: ${stats.MAX.nextDropInMinutes.toFixed(2)} minutes`);

      if (stats.bufferSize > 0) {
        console.log(`   ✅ Buffer has signals!`);
        results.bufferHasSignals = true;
        console.log(`\n   Top buffered signals:`);
        stats.MAX.topSignals.slice(0, 3).forEach((sig, i) => {
          console.log(`      ${i + 1}. ${sig.symbol} ${sig.direction} - ${sig.confidence.toFixed(1)}%`);
        });
      } else {
        console.log(`   ⚠️  Buffer is empty`);
        console.log('   Reason: Either signals haven\'t been generated yet, or Delta is rejecting them');
        console.log('   Wait 30 seconds and check console for "✅ Delta Decision: PASSED" messages');
      }
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // 4. CHECK TIMER COMPONENT
    // ═══════════════════════════════════════════════════════════
    console.log('4️⃣ COUNTDOWN TIMER COMPONENT');
    console.log('─'.repeat(80));

    const timerElement = document.querySelector('[class*="timer"]');
    const clockIcon = document.querySelector('svg[class*="lucide-clock"]');

    if (clockIcon || timerElement) {
      console.log('✅ Timer component is VISIBLE in UI');
      results.timer = true;
    } else {
      console.log('⚠️  Timer component NOT FOUND in UI');
      console.log('   Reason: Either page hasn\'t loaded yet, or component failed to render');
      console.log('   Check browser console for React errors');
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════
    // 5. CHECK DATABASE SIGNALS
    // ═══════════════════════════════════════════════════════════
    if (user) {
      console.log('5️⃣ USER SIGNALS IN DATABASE');
      console.log('─'.repeat(80));

      const { data: userSignals, error } = await supabase
        .from('user_signals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching signals:', error.message);
      } else if (!userSignals || userSignals.length === 0) {
        console.log('⚠️  No signals in database yet');
        console.log('   Wait for timer to hit 0:00 and trigger a drop');
      } else {
        console.log(`✅ Found ${userSignals.length} signals`);
        results.databaseHasSignals = true;

        const activeSignals = userSignals.filter(sig => {
          const expiresAt = sig.expires_at ? new Date(sig.expires_at) : null;
          return expiresAt && expiresAt > new Date();
        });

        console.log(`   Active: ${activeSignals.length}`);
        console.log(`   Expired: ${userSignals.length - activeSignals.length}`);

        if (activeSignals.length > 0) {
          console.log(`\n   Recent active signals:`);
          activeSignals.slice(0, 3).forEach((sig, i) => {
            const expiresAt = new Date(sig.expires_at);
            const hoursLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
            console.log(`      ${i + 1}. ${sig.symbol} ${sig.signal_type} - ${hoursLeft.toFixed(1)}h remaining`);
          });
        }
      }
      console.log('');
    }

    // ═══════════════════════════════════════════════════════════
    // 6. OVERALL RESULTS
    // ═══════════════════════════════════════════════════════════
    console.log('═'.repeat(80));
    console.log('📊 OVERALL RESULTS');
    console.log('═'.repeat(80));

    const totalChecks = Object.keys(results).length;
    const passedChecks = Object.values(results).filter(Boolean).length;
    const score = (passedChecks / totalChecks) * 100;

    console.log(`\nScore: ${passedChecks}/${totalChecks} (${score.toFixed(0)}%)\n`);

    console.log(`✅ Authentication:        ${results.authentication ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Delta Engine:          ${results.deltaEngine ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Delta Thresholds:      ${results.deltaThresholds ? 'PASS (LOW)' : 'FAIL (TOO HIGH)'}`);
    console.log(`✅ Scheduler:             ${results.scheduler ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Timer Component:       ${results.timer ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Buffer Has Signals:    ${results.bufferHasSignals ? 'PASS' : 'PENDING'}`);
    console.log(`✅ Database Has Signals:  ${results.databaseHasSignals ? 'PASS' : 'PENDING'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('🎯 RECOMMENDATIONS');
    console.log('═'.repeat(80) + '\n');

    if (!results.deltaThresholds) {
      console.log('❗ CRITICAL: Delta thresholds are too high');
      console.log('   Action: Run FIX_DELTA_THRESHOLDS_NOW.js');
      console.log('   OR paste: window.deltaV2QualityEngine.setThresholds(20, 0.25, 0)\n');
    }

    if (!results.bufferHasSignals && results.deltaThresholds) {
      console.log('⏳ WAITING: Signals haven\'t been generated yet');
      console.log('   Action: Wait 30 seconds and run this verification again');
      console.log('   Watch console for "✅ Delta Decision: PASSED" messages\n');
    }

    if (results.bufferHasSignals && !results.databaseHasSignals) {
      console.log('⏳ READY: Buffer has signals, waiting for timer drop');
      console.log('   Action: Wait for timer to hit 0:00 (or force drop manually)');
      console.log('   Force drop: window.scheduledSignalDropper.forceDrop("MAX")\n');
    }

    if (results.databaseHasSignals && !results.timer) {
      console.log('⚠️  WARNING: Signals are working but timer not visible');
      console.log('   Action: Refresh page and check for React errors in console\n');
    }

    if (passedChecks === totalChecks) {
      console.log('🎉🎉🎉 PERFECT! Everything is working! 🎉🎉🎉');
      console.log('   - Timer should be counting down');
      console.log('   - Signals should appear every 30 seconds');
      console.log('   - Check "Your Tier Signals" section in UI\n');
    } else if (score >= 70) {
      console.log('✅ MOSTLY WORKING - Just needs signals to flow');
      console.log('   Wait 30 seconds and check again\n');
    } else if (score >= 50) {
      console.log('⚠️  PARTIAL - Some issues need fixing');
      console.log('   Follow recommendations above\n');
    } else {
      console.log('❌ CRITICAL ISSUES - System not ready');
      console.log('   Fix critical issues above and try again\n');
    }

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.error('Stack:', error.stack);
  }
})();

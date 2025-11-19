// 🔍 COMPREHENSIVE DIAGNOSTIC - Run in browser console on Intelligence Hub page
// This will show exactly why signals aren't appearing

console.log('\n' + '═'.repeat(80));
console.log('🔍 SIGNAL SYSTEM DIAGNOSTIC');
console.log('═'.repeat(80) + '\n');

(async function diagnoseSignals() {
  try {
    // ═══════════════════════════════════════════════════════════
    // 1. CHECK AUTHENTICATION
    // ═══════════════════════════════════════════════════════════
    console.log('─'.repeat(80));
    console.log('1. AUTHENTICATION STATUS');
    console.log('─'.repeat(80));

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ NOT AUTHENTICATED');
      console.error('   Error:', authError);
      console.log('\n⚠️  PROBLEM: You must be logged in for signals to be distributed');
      console.log('   SOLUTION: Log in to the app');
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`   User ID: ${user.id}\n`);

    // ═══════════════════════════════════════════════════════════
    // 2. CHECK SCHEDULER STATUS
    // ═══════════════════════════════════════════════════════════
    console.log('─'.repeat(80));
    console.log('2. SCHEDULED SIGNAL DROPPER');
    console.log('─'.repeat(80));

    if (typeof window.scheduledSignalDropper === 'undefined') {
      console.error('❌ scheduledSignalDropper NOT FOUND on window');
      console.log('\n⚠️  PROBLEM: Scheduler not exposed');
      console.log('   SOLUTION: Refresh the page (Ctrl+Shift+R)');
      return;
    }

    const dropper = window.scheduledSignalDropper;
    const stats = dropper.getAllStats();

    console.log(`✅ Scheduler found and running: ${stats.isRunning}`);
    console.log(`📦 Buffer size: ${stats.bufferSize} signals`);
    console.log(`⏰ Next drop in: ${stats.MAX.nextDropInMinutes.toFixed(2)} minutes`);
    console.log(`📊 Drops today: ${stats.MAX.dropsToday}\n`);

    if (!stats.isRunning) {
      console.error('❌ SCHEDULER NOT RUNNING!');
      console.log('\n⚠️  PROBLEM: Scheduler is stopped');
      console.log('   SOLUTION: Run: window.scheduledSignalDropper.start()');
      return;
    }

    if (stats.bufferSize === 0) {
      console.warn('⚠️  BUFFER IS EMPTY');
      console.log('\n💡 This means either:');
      console.log('   1. No signals have passed Delta yet (wait 30 seconds)');
      console.log('   2. All signals are being rejected by Delta');
      console.log('\n   Check console for Delta rejection messages');
    } else {
      console.log(`📋 Top ${Math.min(5, stats.bufferSize)} buffered signals:`);
      stats.MAX.topSignals.slice(0, 5).forEach((sig, i) => {
        console.log(`   ${i + 1}. ${sig.symbol} ${sig.direction} - Confidence: ${sig.confidence.toFixed(1)}%`);
      });
    }

    // ═══════════════════════════════════════════════════════════
    // 3. CHECK USER_SIGNALS TABLE
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('3. USER_SIGNALS TABLE (Where signals should be)');
    console.log('─'.repeat(80));

    const { data: userSignals, error: userSigError } = await supabase
      .from('user_signals')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (userSigError) {
      console.error('❌ Error fetching user_signals:', userSigError);
    } else {
      console.log(`📊 Total signals in table: ${userSignals?.length || 0}`);

      if (userSignals && userSignals.length > 0) {
        console.log('\n✅ SIGNALS FOUND:');
        userSignals.slice(0, 5).forEach((sig, i) => {
          const expiresAt = sig.expires_at ? new Date(sig.expires_at) : null;
          const now = new Date();
          const isExpired = expiresAt && expiresAt < now;
          const hoursLeft = expiresAt ? (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;
          const status = isExpired ? '🔴 EXPIRED' : '🟢 ACTIVE';
          console.log(`   ${i + 1}. ${sig.symbol} ${sig.signal_type} - ${status} (${hoursLeft.toFixed(1)}h left)`);
        });

        const activeCount = userSignals.filter(sig => {
          const expiresAt = sig.expires_at ? new Date(sig.expires_at) : null;
          return expiresAt && expiresAt > new Date();
        }).length;

        console.log(`\n📊 Active signals: ${activeCount}/${userSignals.length}`);

        if (activeCount > 0) {
          console.log('✅ These should be visible in "Your Tier Signals" section');
        } else {
          console.log('⚠️  All signals are expired');
        }
      } else {
        console.warn('\n⚠️  NO SIGNALS IN DATABASE');
        console.log('\n💡 This means distribution hasn\'t happened yet');
        console.log('   Possible reasons:');
        console.log('   1. Waiting for first drop (check timer)');
        console.log('   2. Buffer is empty (no signals passing Delta)');
        console.log('   3. Distribution is failing (check below)');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. CHECK GLOBALHUBSERVICE
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('4. GLOBAL HUB SERVICE');
    console.log('─'.repeat(80));

    if (typeof window.globalHubService === 'undefined') {
      console.error('❌ globalHubService NOT FOUND');
    } else {
      const hubRunning = window.globalHubService.isRunning();
      console.log(`✅ Hub running: ${hubRunning}`);

      if (!hubRunning) {
        console.error('❌ GLOBAL HUB SERVICE NOT RUNNING!');
        console.log('\n⚠️  PROBLEM: Hub service is stopped');
        console.log('   SOLUTION: Refresh the page');
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 5. ROOT CAUSE ANALYSIS
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('ROOT CAUSE ANALYSIS');
    console.log('═'.repeat(80));

    const issues = [];

    if (!stats.isRunning) {
      issues.push({
        problem: '🔴 Scheduler not running',
        solution: 'Refresh page or run: window.scheduledSignalDropper.start()'
      });
    }

    if (stats.bufferSize === 0) {
      issues.push({
        problem: '🟡 Buffer is empty',
        solution: 'Wait 30 seconds for signals to be generated, or check Delta rejection logs'
      });
    }

    if (!userSignals || userSignals.length === 0) {
      issues.push({
        problem: '🔴 No signals in database',
        solution: 'Distribution hasn\'t happened. Force drop: window.scheduledSignalDropper.forceDrop("MAX")'
      });
    }

    if (issues.length === 0) {
      console.log('\n✅ NO CRITICAL ISSUES FOUND');
      console.log('   System appears to be working');

      if (userSignals && userSignals.length > 0) {
        console.log('\n✅ Signals are in database - check UI');
      }
    } else {
      console.log('\n❌ ISSUES DETECTED:\n');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.problem}`);
        console.log(`   → ${issue.solution}\n`);
      });
    }

    // ═══════════════════════════════════════════════════════════
    // 6. RECOMMENDED ACTIONS
    // ═══════════════════════════════════════════════════════════
    console.log('═'.repeat(80));
    console.log('RECOMMENDED ACTIONS');
    console.log('═'.repeat(80));

    console.log('\n🔧 IMMEDIATE FIX:');

    if (stats.bufferSize > 0 && (!userSignals || userSignals.length === 0)) {
      console.log('\n1. Force drop a signal RIGHT NOW:');
      console.log('   window.scheduledSignalDropper.forceDrop("MAX")');
      console.log('\n2. Wait 5 seconds, then check "Your Tier Signals" section');
    } else if (stats.bufferSize === 0) {
      console.log('\n1. Wait 30 seconds for signals to be generated');
      console.log('\n2. Check console for these messages:');
      console.log('   - "📥 Buffering signal for scheduled drop..."');
      console.log('   - "✅ Signal buffered successfully"');
      console.log('\n3. If you see "❌ PIPELINE REJECTED" instead:');
      console.log('   - Delta is rejecting signals (quality too low)');
      console.log('   - This is normal - wait for better signals');
    } else if (userSignals && userSignals.length > 0) {
      console.log('\n1. Signals ARE in database ✅');
      console.log('\n2. Check "Your Tier Signals" section in UI');
      console.log('\n3. If not visible, refresh page (Ctrl+Shift+R)');
    }

    console.log('\n💡 TESTING COMMAND:');
    console.log('   Run this to force drop a signal immediately:');
    console.log('   window.scheduledSignalDropper.forceDrop("MAX")');

    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    console.error('Stack:', error.stack);
  }
})();

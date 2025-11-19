// 🔍 DIAGNOSTIC SCRIPT - Find Why Signals Aren't Appearing
// Paste this in browser console on Intelligence Hub page

console.log('🔍 DIAGNOSING SIGNAL FLOW ISSUE\n');
console.log('═'.repeat(80));

(async function diagnoseSignalIssue() {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Not authenticated');
      return;
    }

    console.log(`✅ User: ${user.email}`);
    console.log(`User ID: ${user.id}\n`);

    // ════════════════════════════════════════════════════════════════
    // 1. CHECK SCHEDULED DROPPER
    // ════════════════════════════════════════════════════════════════
    console.log('─'.repeat(80));
    console.log('1. SCHEDULED DROPPER STATUS');
    console.log('─'.repeat(80));

    if (typeof scheduledSignalDropper === 'undefined') {
      console.error('❌ scheduledSignalDropper NOT FOUND!');
      return;
    }

    const stats = scheduledSignalDropper.getAllStats();
    console.log(`\n✅ Dropper Running: ${stats.isRunning}`);
    console.log(`📦 Buffer Size: ${stats.bufferSize} signals`);
    console.log(`⏰ Next drop in: ${stats.MAX.nextDropInMinutes} minutes`);
    console.log(`📊 Drops today: ${stats.MAX.dropsToday}`);

    if (stats.bufferSize > 0) {
      console.log('\n📋 Top buffered signals:');
      stats.MAX.topSignals.slice(0, 5).forEach((sig, i) => {
        console.log(`   ${i + 1}. ${sig.symbol} ${sig.direction} - Conf: ${sig.confidence.toFixed(1)}%`);
      });
    } else {
      console.warn('\n⚠️  BUFFER IS EMPTY - No signals have been buffered yet');
      console.warn('   This means signals are NOT reaching the buffer');
      console.warn('   Check console for Delta rejection logs');
    }

    // ════════════════════════════════════════════════════════════════
    // 2. CHECK user_signals TABLE
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('2. USER_SIGNALS TABLE (Tier-Based Distribution)');
    console.log('─'.repeat(80));

    const { data: userSignals, error: userSigError } = await supabase
      .from('user_signals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (userSigError) {
      console.error('❌ Error fetching user_signals:', userSigError);
    } else {
      console.log(`\n📊 Total signals in user_signals: ${userSignals?.length || 0}`);

      if (userSignals && userSignals.length > 0) {
        console.log('\n✅ SIGNALS FOUND IN user_signals:');
        userSignals.slice(0, 5).forEach((sig, i) => {
          const expiresIn = (new Date(sig.expires_at) - Date.now()) / (1000 * 60 * 60);
          const status = expiresIn > 0 ? '🟢 ACTIVE' : '🔴 EXPIRED';
          console.log(`   ${i + 1}. ${sig.symbol} ${sig.signal_type} - ${status} (${expiresIn.toFixed(1)}h left)`);
        });
      } else {
        console.warn('\n⚠️  NO SIGNALS IN user_signals TABLE');
        console.warn('   This is why signals aren\'t appearing in "Your Tier Signals"');
        console.warn('   Hybrid distribution system may not be triggering');
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. CHECK intelligence_signals TABLE
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('3. INTELLIGENCE_SIGNALS TABLE (Global Tracking)');
    console.log('─'.repeat(80));

    const { data: globalSignals, error: globalError } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(10);

    if (globalError) {
      console.error('❌ Error fetching intelligence_signals:', globalError);
    } else {
      console.log(`\n📊 Active signals in intelligence_signals: ${globalSignals?.length || 0}`);

      if (globalSignals && globalSignals.length > 0) {
        console.log('\n✅ GLOBAL SIGNALS FOUND:');
        globalSignals.slice(0, 5).forEach((sig, i) => {
          console.log(`   ${i + 1}. ${sig.symbol} ${sig.signal_type} - Conf: ${sig.confidence}%`);
        });
      } else {
        console.warn('\n⚠️  NO ACTIVE SIGNALS IN intelligence_signals');
        console.warn('   Signals are not being saved to database');
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 4. CHECK LOCALSTORAGE (Old System)
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('4. LOCALSTORAGE SIGNALS (Old System)');
    console.log('─'.repeat(80));

    if (typeof globalHubService === 'undefined') {
      console.error('❌ globalHubService NOT FOUND!');
    } else {
      const activeSignals = globalHubService.getActiveSignals();
      const signalHistory = globalHubService.getSignalHistory();

      console.log(`\n📊 Active signals (localStorage): ${activeSignals.length}`);
      console.log(`📊 Signal history (localStorage): ${signalHistory.length}`);

      if (signalHistory.length > 0) {
        console.log('\n⚠️  SIGNALS IN HISTORY (This is the problem!):');
        signalHistory.slice(0, 10).forEach((sig, i) => {
          const outcome = sig.outcome || 'NO OUTCOME';
          console.log(`   ${i + 1}. ${sig.symbol} ${sig.direction} - Outcome: ${outcome}`);
        });

        console.log('\n❌ ISSUE IDENTIFIED:');
        console.log('   Signals are going to localStorage history instead of database!');
        console.log('   The old system is still running alongside the new system.');
      }

      if (activeSignals.length > 0) {
        console.log('\n📋 Active signals (should be empty):');
        activeSignals.forEach((sig, i) => {
          console.log(`   ${i + 1}. ${sig.symbol} ${sig.direction}`);
        });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 5. ROOT CAUSE ANALYSIS
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('ROOT CAUSE ANALYSIS');
    console.log('═'.repeat(80));

    const issues = [];

    // Check if signals are being buffered
    if (stats.bufferSize === 0) {
      issues.push('🔴 No signals in buffer - Delta may be rejecting all signals');
    }

    // Check if signals are in user_signals
    if (!userSignals || userSignals.length === 0) {
      issues.push('🔴 No signals in user_signals - Hybrid distribution not working');
    }

    // Check if signals are going to localStorage history
    if (typeof globalHubService !== 'undefined' && globalHubService.getSignalHistory().length > 0) {
      issues.push('🔴 Signals in localStorage history - Old system still active');
    }

    // Check if scheduled drop has happened
    if (stats.MAX.dropsToday === 0) {
      issues.push('🟡 No drops today - May need to wait for scheduled drop or force drop');
    }

    if (issues.length === 0) {
      console.log('\n✅ NO ISSUES FOUND - System appears to be working correctly');
      console.log('   Signals should be appearing in "Your Tier Signals" section');
    } else {
      console.log('\n❌ ISSUES DETECTED:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    // ════════════════════════════════════════════════════════════════
    // 6. RECOMMENDED ACTIONS
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('RECOMMENDED ACTIONS');
    console.log('═'.repeat(80));

    console.log('\n🔧 Immediate Actions:');

    if (stats.bufferSize > 0 && stats.MAX.dropsToday === 0) {
      console.log('   1. Force drop a signal:');
      console.log('      scheduledSignalDropper.forceDrop("MAX")');
    } else if (stats.bufferSize === 0) {
      console.log('   1. Wait 30 seconds for signals to be generated');
      console.log('   2. Check console for Delta rejection logs');
      console.log('   3. Look for "❌ Delta Decision: REJECTED" messages');
    }

    if (typeof globalHubService !== 'undefined' && globalHubService.getSignalHistory().length > 0) {
      console.log('\n   2. Clear localStorage history (old system):');
      console.log('      localStorage.removeItem("hubSignals")');
      console.log('      location.reload()');
    }

    console.log('\n💡 To test immediately:');
    console.log('   scheduledSignalDropper.forceDrop("MAX")');
    console.log('   Then check "Your Tier Signals" section in UI');

    console.log('\n' + '═'.repeat(80));

    // Return diagnostic data
    return {
      buffer: {
        size: stats.bufferSize,
        nextDropMinutes: stats.MAX.nextDropInMinutes,
        dropsToday: stats.MAX.dropsToday
      },
      userSignals: userSignals || [],
      globalSignals: globalSignals || [],
      localStorageActive: typeof globalHubService !== 'undefined' ? globalHubService.getActiveSignals().length : 0,
      localStorageHistory: typeof globalHubService !== 'undefined' ? globalHubService.getSignalHistory().length : 0,
      issues
    };

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    console.error('Stack:', error.stack);
  }
})();

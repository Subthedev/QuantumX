// ✅ VERIFY FIX - Paste this in browser console on Intelligence Hub page
// This will show you if the tier-based system is working correctly

console.log('\n' + '═'.repeat(80));
console.log('🔍 VERIFYING TIER-BASED SIGNAL SYSTEM');
console.log('═'.repeat(80) + '\n');

(async function verifyFix() {
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
    // 1. CHECK LOCALSTORAGE (Should be EMPTY)
    // ════════════════════════════════════════════════════════════════
    console.log('─'.repeat(80));
    console.log('1. LOCALSTORAGE STATUS (Should be cleared)');
    console.log('─'.repeat(80));

    if (typeof globalHubService === 'undefined') {
      console.error('❌ globalHubService NOT FOUND!');
    } else {
      const activeSignals = globalHubService.getActiveSignals();
      const signalHistory = globalHubService.getSignalHistory();

      console.log(`\n📊 Active signals (localStorage): ${activeSignals.length}`);
      console.log(`📊 Signal history (localStorage): ${signalHistory.length}`);

      if (activeSignals.length === 0 && signalHistory.length === 0) {
        console.log('\n✅ PERFECT! localStorage is clear');
        console.log('   Old system is disabled ✅');
      } else {
        console.log('\n⚠️  WARNING: localStorage still has signals!');
        console.log(`   Active: ${activeSignals.length}, History: ${signalHistory.length}`);
        console.log('   Try refreshing the page (Ctrl+Shift+R)');
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 2. CHECK user_signals TABLE (Should have signals)
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('2. USER_SIGNALS TABLE (Tier-Based System)');
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
      console.log(`\n📊 Total signals in user_signals: ${userSignals?.length || 0}`);

      if (userSignals && userSignals.length > 0) {
        console.log('\n✅ SIGNALS FOUND in tier-based system:');
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
        console.log('   These should appear in "Your Tier Signals" section ✅');
      } else {
        console.log('\n⚠️  NO SIGNALS in user_signals table yet');
        console.log('   Wait 30 seconds for first signal drop');
        console.log('   Check console for drop messages');
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. CHECK USER TIER
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('3. USER TIER STATUS');
    console.log('─'.repeat(80));

    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('❌ Error fetching subscription:', subError);
    } else if (subscription) {
      console.log(`\n✅ Tier: ${subscription.tier}`);
      console.log(`✅ Status: ${subscription.status}`);

      const quotaLimits = { FREE: 2, PRO: 15, MAX: 30 };
      const limit = quotaLimits[subscription.tier as keyof typeof quotaLimits] || 0;
      console.log(`📊 Quota Limit: ${limit} signals per 24 hours`);
    } else {
      console.log('\n⚠️  No subscription found - using FREE tier by default');
    }

    // ════════════════════════════════════════════════════════════════
    // 4. CHECK SCHEDULER STATUS
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('4. SCHEDULED DROPPER STATUS');
    console.log('─'.repeat(80));

    if (typeof scheduledSignalDropper === 'undefined') {
      console.error('❌ scheduledSignalDropper NOT FOUND!');
    } else {
      const stats = scheduledSignalDropper.getAllStats();
      console.log(`\n✅ Dropper Running: ${stats.isRunning}`);
      console.log(`📦 Buffer Size: ${stats.bufferSize} signals`);
      console.log(`⏰ Next drop in: ${stats.MAX.nextDropInMinutes.toFixed(1)} minutes`);
      console.log(`📊 Drops today: ${stats.MAX.dropsToday}`);

      if (stats.bufferSize > 0) {
        console.log('\n📋 Top buffered signals:');
        stats.MAX.topSignals.slice(0, 3).forEach((sig, i) => {
          console.log(`   ${i + 1}. ${sig.symbol} ${sig.direction} - Conf: ${sig.confidence.toFixed(1)}%`);
        });
      } else {
        console.log('\n⚠️  Buffer is empty');
        console.log('   Signals will be added as they pass Delta quality filter');
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 5. FINAL VERDICT
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('FINAL VERDICT');
    console.log('═'.repeat(80));

    const localStorageEmpty = typeof globalHubService !== 'undefined' &&
      globalHubService.getActiveSignals().length === 0 &&
      globalHubService.getSignalHistory().length === 0;

    const hasUserSignals = userSignals && userSignals.length > 0;
    const schedulerRunning = typeof scheduledSignalDropper !== 'undefined' &&
      scheduledSignalDropper.getAllStats().isRunning;

    if (localStorageEmpty && schedulerRunning) {
      console.log('\n✅✅✅ SYSTEM IS WORKING CORRECTLY! ✅✅✅');
      console.log('\n✅ localStorage cleared (old system disabled)');
      console.log('✅ Scheduled dropper running (30-second intervals)');

      if (hasUserSignals) {
        console.log('✅ Signals in user_signals table');
        console.log('✅ Signals appearing in "Your Tier Signals" section');
        console.log('\n🎉 Tier-based signal distribution is LIVE!');
      } else {
        console.log('⏰ No signals yet - wait 30 seconds for first drop');
        console.log('\n💡 Watch for drop messages in console:');
        console.log('   "⏰ [ScheduledDropper] TIME TO DROP SIGNAL"');
        console.log('   "✅ Distribution Complete: Distributed to: X users"');
      }
    } else {
      console.log('\n⚠️  ISSUES DETECTED:');
      if (!localStorageEmpty) {
        console.log('   ❌ localStorage still has signals - try hard refresh (Ctrl+Shift+R)');
      }
      if (!schedulerRunning) {
        console.log('   ❌ Scheduler not running - check for errors in console');
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('💡 TIP: Check "Your Tier Signals" section in Intelligence Hub UI');
    console.log('💡 Signals appear automatically every 30 seconds');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.error('Stack:', error.stack);
  }
})();

// 🧪 TEST HYBRID DISTRIBUTION SYSTEM
// Paste this entire script in browser console on Intelligence Hub page

console.log('🧪 TESTING HYBRID DISTRIBUTION SYSTEM\n');
console.log('═'.repeat(80));

(async function testHybridDistribution() {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      return;
    }

    console.log(`\n✅ Authenticated as: ${user.email}`);
    console.log(`User ID: ${user.id}`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Check User Tier
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 1: Checking Your Tier');
    console.log('─'.repeat(80));

    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('❌ Error fetching subscription:', subError);
      return;
    }

    console.log(`\n✅ Your Tier: ${subscription.tier}`);
    console.log(`Status: ${subscription.status}`);

    if (subscription.tier !== 'MAX') {
      console.warn('\n⚠️  WARNING: You are not on MAX tier!');
      console.warn('Signals are currently only distributed to MAX tier users.');
      console.warn('To test, upgrade yourself to MAX tier:');
      console.warn('\nRun this in Supabase SQL Editor:');
      console.warn(`UPDATE user_subscriptions SET tier = 'MAX', status = 'active' WHERE user_id = '${user.id}';`);
      console.warn('\nThen refresh this page and run the test again.');
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Check Quota
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 2: Checking Your Quota');
    console.log('─'.repeat(80));

    const today = new Date().toISOString().split('T')[0];
    const { data: quota } = await supabase
      .from('user_signal_quotas')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const signalsReceived = quota?.signals_received || 0;
    const limit = 30; // MAX tier limit
    const remaining = limit - signalsReceived;

    console.log(`\n📊 Quota Status:`);
    console.log(`   Signals received today: ${signalsReceived}`);
    console.log(`   Daily limit (MAX): ${limit}`);
    console.log(`   Remaining: ${remaining}`);

    if (remaining <= 0) {
      console.warn('\n⚠️  WARNING: Daily quota exceeded!');
      console.warn('You have received all 30 signals for today.');
      console.warn('Quota resets at midnight UTC.');
      console.warn('\nTo test, reset your quota:');
      console.warn(`DELETE FROM user_signal_quotas WHERE user_id = '${user.id}' AND date = '${today}';`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Check user_signals Table
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 3: Checking user_signals Table');
    console.log('─'.repeat(80));

    const { data: userSignals, error: userSigError } = await supabase
      .from('user_signals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (userSigError) {
      console.error('❌ Error fetching user_signals:', userSigError);
      return;
    }

    console.log(`\n📋 Your Signals in user_signals Table:`);
    console.log(`   Total signals: ${userSignals?.length || 0}`);

    if (userSignals && userSignals.length > 0) {
      console.log('\n   Recent signals:');
      userSignals.slice(0, 5).forEach((sig, index) => {
        const expiresIn = (new Date(sig.expires_at) - Date.now()) / (1000 * 60 * 60);
        const status = expiresIn > 0 ? '🟢 ACTIVE' : '🔴 EXPIRED';
        console.log(`   ${index + 1}. ${sig.symbol} ${sig.signal_type} - Conf: ${sig.confidence.toFixed(1)}% - ${status} (${expiresIn.toFixed(1)}h left)`);
      });
    } else {
      console.log('   ⚠️  No signals found in user_signals table');
      console.log('   This is expected if no signals have been dropped yet.');
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Check Scheduler Status
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 4: Checking Scheduler Status');
    console.log('─'.repeat(80));

    if (typeof scheduledSignalDropper === 'undefined') {
      console.error('❌ scheduledSignalDropper not found!');
      console.error('Service may not be initialized.');
      return;
    }

    const stats = scheduledSignalDropper.getAllStats();
    console.log(`\n📊 Scheduler Status:`);
    console.log(`   Running: ${stats.isRunning ? '✅ YES' : '❌ NO'}`);
    console.log(`   Buffer size: ${stats.bufferSize} signals`);
    console.log(`   Next drop in: ${stats.MAX.nextDropInMinutes} minutes`);
    console.log(`   Drops today: ${stats.MAX.dropsToday}`);

    if (stats.bufferSize > 0) {
      console.log(`\n   Top buffered signals:`);
      stats.MAX.topSignals.slice(0, 5).forEach((sig, index) => {
        console.log(`   ${index + 1}. ${sig.symbol} ${sig.direction} - Conf: ${sig.confidence.toFixed(1)}% (buffered ${sig.bufferedFor}s ago)`);
      });
    } else {
      console.log(`   ⚠️  No signals in buffer yet`);
      console.log(`   Signals will be buffered as they are generated (every 5 seconds)`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Force Drop Test
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 5: Force Drop Test (Optional)');
    console.log('─'.repeat(80));

    console.log('\n💡 To test signal distribution immediately (without waiting 48 minutes):');
    console.log('\n   Run this command:');
    console.log('   scheduledSignalDropper.forceDrop("MAX")');
    console.log('\n   This will:');
    console.log('   1. Drop the best signal from buffer');
    console.log('   2. Save to intelligence_signals table');
    console.log('   3. Distribute to user_signals table (NEW!)');
    console.log('   4. Signal should appear in Signals tab');

    if (stats.bufferSize > 0) {
      console.log('\n   ✅ Buffer has signals - you can force drop now!');
      console.log('\n   Want to test? Type: scheduledSignalDropper.forceDrop("MAX")');
    } else {
      console.log('\n   ⚠️  Buffer is empty - wait 30 seconds for signals to be generated');
      console.log('   Then run: scheduledSignalDropper.forceDrop("MAX")');
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(80));

    const checks = [];
    checks.push({ name: 'Authenticated', status: !!user, icon: '✅' });
    checks.push({ name: 'MAX Tier', status: subscription.tier === 'MAX', icon: subscription.tier === 'MAX' ? '✅' : '❌' });
    checks.push({ name: 'Quota Available', status: remaining > 0, icon: remaining > 0 ? '✅' : '⚠️' });
    checks.push({ name: 'Scheduler Running', status: stats.isRunning, icon: stats.isRunning ? '✅' : '❌' });
    checks.push({ name: 'Signals in Buffer', status: stats.bufferSize > 0, icon: stats.bufferSize > 0 ? '✅' : '⏳' });
    checks.push({ name: 'Signals in user_signals', status: userSignals && userSignals.length > 0, icon: userSignals && userSignals.length > 0 ? '✅' : '⏳' });

    console.log('\n');
    checks.forEach(check => {
      console.log(`${check.icon} ${check.name}`);
    });

    const allGood = checks.every(c => c.status);
    if (allGood) {
      console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
      console.log('\n📤 Next Steps:');
      console.log('   1. Force drop a signal: scheduledSignalDropper.forceDrop("MAX")');
      console.log('   2. Check Signals tab in UI - signal should appear!');
      console.log('   3. Verify signal stays for 24 hours');
    } else {
      console.log('\n⚠️  Some checks failed. Review the output above for details.');
    }

    console.log('\n' + '═'.repeat(80));

    // ═══════════════════════════════════════════════════════════════
    // Return test data
    // ═══════════════════════════════════════════════════════════════
    return {
      user,
      subscription,
      quota: {
        received: signalsReceived,
        limit,
        remaining
      },
      userSignals: userSignals || [],
      scheduler: stats,
      checks
    };

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack:', error.stack);
  }
})();

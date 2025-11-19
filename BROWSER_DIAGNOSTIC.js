/**
 * BROWSER DIAGNOSTIC SCRIPT
 *
 * Run this in the browser console (F12) to check system status
 * Copy and paste the entire script into the console
 */

(async function diagnosticCheck() {
  console.log('\n🔍 ===== SYSTEM DIAGNOSTIC =====\n');

  // 1. Check if smart pool exists
  console.log('1️⃣ Checking Smart Signal Pool...');
  if (window.smartSignalPool) {
    const stats = window.smartSignalPool.getPoolStats();
    if (stats) {
      console.log('   ✅ Smart pool exists');
      console.log(`   📊 Total signals in pool: ${stats.totalSignals}`);
      console.log(`   📈 Avg confidence: ${stats.avgConfidence?.toFixed(1)}%`);
      console.log(`   📈 Avg quality: ${stats.avgQuality?.toFixed(1)}%`);

      if (stats.totalSignals > 0) {
        window.printPoolSummary();
      }
    } else {
      console.log('   ⚠️ Pool exists but has no stats');
    }
  } else {
    console.log('   ❌ Smart pool not found - refresh page');
  }

  console.log('\n2️⃣ Checking Global Hub Service...');
  if (window.globalHubService) {
    const metrics = window.globalHubService.getMetrics();
    const activeSignals = window.globalHubService.getActiveSignals();
    const history = window.globalHubService.getSignalHistory();

    console.log('   ✅ Global hub service exists');
    console.log(`   📊 Total signals: ${metrics.totalSignals}`);
    console.log(`   🔴 Active signals: ${activeSignals.length}`);
    console.log(`   📜 History signals: ${history.length}`);
    console.log(`   ✅ Total wins: ${metrics.totalWins}`);
    console.log(`   ❌ Total losses: ${metrics.totalLosses}`);
    console.log(`   📈 Win rate: ${metrics.winRate?.toFixed(1)}%`);
  } else {
    console.log('   ❌ Global hub service not found');
  }

  console.log('\n3️⃣ Checking Database (user_signals)...');
  try {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.log('   ❌ Supabase client not found');
    } else {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log('   ❌ User not authenticated');
      } else {
        console.log(`   ✅ User authenticated: ${user.email}`);

        // Check user subscription
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (subError) {
          console.log('   ❌ Error fetching subscription:', subError.message);
        } else if (subscription) {
          console.log(`   ✅ User tier: ${subscription.tier}`);
          console.log(`   ✅ Status: ${subscription.status}`);
        } else {
          console.log('   ⚠️ No subscription found - run SQL to create one');
        }

        // Check user signals
        const { data: userSignals, error: signalsError } = await supabase
          .from('user_signals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (signalsError) {
          console.log('   ❌ Error fetching user signals:', signalsError.message);
        } else {
          console.log(`   📊 User signals in database: ${userSignals?.length || 0}`);

          if (userSignals && userSignals.length > 0) {
            console.log('\n   📋 Recent signals:');
            userSignals.slice(0, 5).forEach((sig, idx) => {
              console.log(`      ${idx + 1}. ${sig.symbol} ${sig.signal_type} | Quality: ${sig.quality_score?.toFixed(0)}% | Full details: ${sig.full_details}`);
            });
          }
        }

        // Check quota
        const today = new Date().toISOString().split('T')[0];
        const { data: quota, error: quotaError } = await supabase
          .from('user_signal_quotas')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (!quotaError && quota) {
          console.log(`   📊 Today's quota: ${quota.signals_received} signals received`);
        }
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking database:', error.message);
  }

  console.log('\n4️⃣ Checking Signal Generation...');
  // Check if globalHubService is running
  if (window.globalHubService) {
    const state = window.globalHubService.getState();
    console.log(`   Running: ${state.isRunning ? '✅ Yes' : '❌ No'}`);
    console.log(`   Uptime: ${(Date.now() - state.metrics.startTime) / 1000 / 60} minutes`);
    console.log(`   Last update: ${new Date(state.metrics.lastUpdate).toLocaleString()}`);
  }

  console.log('\n📋 SUMMARY:');
  console.log('   • If pool has 0 signals: Wait 1-3 minutes for generation');
  console.log('   • If pool has signals but database is empty: Check console for distribution errors');
  console.log('   • If database has signals but UI is empty: Refresh page');
  console.log('   • If no subscription: Run CHECK_SYSTEM_STATUS.sql in Supabase');

  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Run: window.printPoolSummary() - to see pool details');
  console.log('   2. Wait 2-3 minutes for signals to generate');
  console.log('   3. Check Supabase > user_signals table manually');
  console.log('   4. Run this diagnostic again');

  console.log('\n================================\n');
})();

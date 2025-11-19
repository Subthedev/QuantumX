// 🧪 QUICK TEST - Force a signal drop RIGHT NOW
// Run this in browser console on Intelligence Hub page

console.log('\n' + '🧪'.repeat(40));
console.log('TESTING SIGNAL DROP SYSTEM');
console.log('🧪'.repeat(40) + '\n');

(async function testSignalDrop() {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Not authenticated - please log in');
      return;
    }

    console.log(`✅ User: ${user.email}\n`);

    // Check scheduler
    if (typeof window.scheduledSignalDropper === 'undefined') {
      console.error('❌ scheduledSignalDropper not found');
      console.log('   Solution: Refresh the page');
      return;
    }

    const stats = window.scheduledSignalDropper.getAllStats();
    console.log(`📦 Buffer size: ${stats.bufferSize} signals`);

    if (stats.bufferSize === 0) {
      console.warn('⚠️  Buffer is empty - no signals to drop yet');
      console.log('\n💡 Wait 30 seconds for signals to be generated');
      console.log('   Then run this script again');
      return;
    }

    console.log(`📋 Top signal: ${stats.MAX.topSignals[0].symbol} ${stats.MAX.topSignals[0].direction} (${stats.MAX.topSignals[0].confidence.toFixed(1)}%)`);

    // Get count before drop
    const { data: beforeSignals } = await supabase
      .from('user_signals')
      .select('id')
      .eq('user_id', user.id);

    const countBefore = beforeSignals?.length || 0;
    console.log(`\n📊 Signals in database BEFORE drop: ${countBefore}`);

    // FORCE DROP
    console.log('\n⏰ FORCING SIGNAL DROP...\n');
    window.scheduledSignalDropper.forceDrop('MAX');

    // Wait 3 seconds for distribution to complete
    console.log('⏳ Waiting 3 seconds for distribution...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check count after drop
    const { data: afterSignals } = await supabase
      .from('user_signals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const countAfter = afterSignals?.length || 0;
    console.log(`📊 Signals in database AFTER drop: ${countAfter}`);

    if (countAfter > countBefore) {
      console.log('\n✅✅✅ SUCCESS! Signal was distributed ✅✅✅\n');
      console.log('Latest signal:');
      const latest = afterSignals[0];
      console.log(`   Symbol: ${latest.symbol}`);
      console.log(`   Direction: ${latest.signal_type}`);
      console.log(`   Confidence: ${latest.confidence}%`);
      console.log(`   Created: ${new Date(latest.created_at).toLocaleString()}`);

      const expiresAt = new Date(latest.expires_at);
      const hoursLeft = (expiresAt - Date.now()) / (1000 * 60 * 60);
      console.log(`   Expires in: ${hoursLeft.toFixed(1)} hours`);
      console.log('\n🎯 CHECK "YOUR TIER SIGNALS" SECTION IN UI');
    } else {
      console.error('\n❌ DISTRIBUTION FAILED');
      console.log('\nPossible reasons:');
      console.log('1. Check console for error messages');
      console.log('2. Distribution might have failed silently');
      console.log('3. Check browser console for red error messages');
      console.log('\nRun the full diagnostic:');
      console.log('Copy and paste contents of DEBUG_SIGNALS_NOW.js');
    }

    console.log('\n' + '🧪'.repeat(40) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
})();

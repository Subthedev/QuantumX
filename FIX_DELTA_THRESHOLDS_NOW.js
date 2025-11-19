// 🔧 IMMEDIATE FIX - Lower Delta thresholds for testing
// Run this in browser console on Intelligence Hub page

console.log('\n' + '🔧'.repeat(40));
console.log('LOWERING DELTA THRESHOLDS FOR TESTING');
console.log('🔧'.repeat(40) + '\n');

(async function fixDeltaThresholds() {
  try {
    // Check if deltaV2QualityEngine exists
    if (typeof window.deltaV2QualityEngine === 'undefined') {
      console.error('❌ deltaV2QualityEngine not found');
      console.log('   Solution: Make sure you are on the Intelligence Hub page and it has loaded');
      console.log('   Wait a few seconds after page load, then try again');
      return;
    }

    console.log('✅ Delta V2 Quality Engine found\n');

    // Get current thresholds
    const currentThresholds = window.deltaV2QualityEngine.getThresholds();
    console.log('📊 CURRENT DELTA THRESHOLDS:');
    console.log(`   Quality: ${currentThresholds.quality}`);
    console.log(`   ML Probability: ${(currentThresholds.ml * 100).toFixed(0)}%`);
    console.log(`   Strategy Win Rate: ${currentThresholds.strategyWinRate}%`);
    console.log('');
    console.log('⚠️  PROBLEM: ML threshold is too high!');
    console.log(`   Signals need ${(currentThresholds.ml * 100).toFixed(0)}% ML win probability to pass`);
    console.log('   Most signals are around 30-40%, so they get rejected');
    console.log('');

    // Lower thresholds for testing
    console.log('🔧 LOWERING THRESHOLDS FOR TESTING...\n');

    const newThresholds = {
      quality: 20,      // Very low quality threshold (was 30)
      ml: 0.25,         // 25% ML probability (was 45%)
      strategyWinRate: 0  // Disable strategy win rate veto (was 35%)
    };

    window.deltaV2QualityEngine.setThresholds(
      newThresholds.quality,
      newThresholds.ml,
      newThresholds.strategyWinRate
    );

    console.log('✅ NEW DELTA THRESHOLDS:');
    console.log(`   Quality: ${newThresholds.quality} (VERY LOW - accepts most signals)`);
    console.log(`   ML Probability: ${(newThresholds.ml * 100).toFixed(0)}% (VERY LOW - accepts most signals)`);
    console.log(`   Strategy Win Rate: ${newThresholds.strategyWinRate}% (DISABLED - no veto)`);
    console.log('');

    console.log('✅✅✅ THRESHOLDS UPDATED! ✅✅✅\n');
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Wait 30 seconds for new signals to be generated');
    console.log('   2. Watch console for "✅ Delta Decision: PASSED" messages');
    console.log('   3. Watch for "📥 Buffering signal for scheduled drop..." messages');
    console.log('   4. Watch the countdown timer - it should trigger a drop');
    console.log('   5. Signal should appear in "Your Tier Signals" section');
    console.log('');

    console.log('💡 TO RESTORE ORIGINAL THRESHOLDS LATER:');
    console.log('   Run this in console:');
    console.log('   window.deltaV2QualityEngine.setThresholds(30, 0.45, 35)');

    console.log('\n' + '🔧'.repeat(40) + '\n');

  } catch (error) {
    console.error('\n❌ Failed to update thresholds:', error);
    console.error('Stack:', error.stack);
  }
})();

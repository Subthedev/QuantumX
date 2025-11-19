/**
 * SIGNAL TIMER DIAGNOSTIC SCRIPT
 *
 * Run this in browser console at http://localhost:8080/intelligence-hub
 * to diagnose what's not working
 */

console.log('\n' + '='.repeat(80));
console.log('🔍 SIGNAL TIMER DIAGNOSTIC - Starting...');
console.log('='.repeat(80) + '\n');

// 1. Check if globalHubService exists
console.log('1️⃣ Checking globalHubService...');
if (typeof window.globalHubService !== 'undefined') {
  console.log('✅ globalHubService exists on window');
  console.log('   isRunning:', window.globalHubService.isRunning());

  if (window.globalHubService.isRunning()) {
    console.log('✅ Service is running');
    const metrics = window.globalHubService.getMetrics();
    console.log('   Metrics:', metrics);
  } else {
    console.log('❌ Service is NOT running - This is the problem!');
    console.log('   Try: await window.globalHubService.start()');
  }
} else {
  console.log('❌ globalHubService not found on window');
  console.log('   The service may not have initialized yet');
}

// 2. Check if scheduledSignalDropper exists
console.log('\n2️⃣ Checking scheduledSignalDropper...');
if (typeof window.scheduledSignalDropper !== 'undefined') {
  console.log('✅ scheduledSignalDropper exists on window');

  try {
    const stats = window.scheduledSignalDropper.getAllStats();
    console.log('   ALL STATS:', JSON.stringify(stats, null, 2));

    const maxStats = window.scheduledSignalDropper.getStats('MAX');
    console.log('\n   MAX tier stats:');
    console.log('   - Buffer size:', maxStats.bufferSize);
    console.log('   - Drops today:', maxStats.dropsToday);
    console.log('   - Next drop:', new Date(maxStats.nextDropTime).toLocaleTimeString());
    console.log('   - Seconds until drop:', Math.floor((maxStats.nextDropTime - Date.now()) / 1000));
  } catch (err) {
    console.log('❌ Error getting scheduler stats:', err.message);
  }
} else {
  console.log('❌ scheduledSignalDropper not found on window');
  console.log('   The scheduler was not exposed - service may not have started');
}

// 3. Check SignalDropTimer component
console.log('\n3️⃣ Checking SignalDropTimer in DOM...');
const timerElements = document.querySelectorAll('[class*="Clock"]');
if (timerElements.length > 0) {
  console.log('✅ Timer component found in DOM (' + timerElements.length + ' instances)');
} else {
  console.log('⚠️  Timer component not found in DOM');
  console.log('   The component may not be rendering');
}

// 4. Check for user signals in database
console.log('\n4️⃣ Checking for signals in UI...');
const signalCards = document.querySelectorAll('[class*="Card"]');
console.log('   Found', signalCards.length, 'card elements in DOM');

// 5. Check Supabase connection
console.log('\n5️⃣ Checking Supabase...');
if (typeof window.supabase !== 'undefined') {
  console.log('✅ Supabase client exists');
} else {
  console.log('⚠️  Supabase client not found on window');
}

// 6. Summary and Next Steps
console.log('\n' + '='.repeat(80));
console.log('📋 DIAGNOSTIC SUMMARY');
console.log('='.repeat(80));

const issues = [];

if (typeof window.globalHubService === 'undefined') {
  issues.push('❌ globalHubService not initialized');
} else if (!window.globalHubService.isRunning()) {
  issues.push('❌ globalHubService not running');
}

if (typeof window.scheduledSignalDropper === 'undefined') {
  issues.push('❌ scheduledSignalDropper not exposed on window');
}

if (timerElements.length === 0) {
  issues.push('⚠️  Timer component not rendering');
}

if (issues.length > 0) {
  console.log('\n🔴 ISSUES FOUND:');
  issues.forEach(issue => console.log('   ' + issue));

  console.log('\n💡 RECOMMENDED FIXES:');
  if (typeof window.globalHubService === 'undefined' || !window.globalHubService.isRunning()) {
    console.log('   1. Refresh the page');
    console.log('   2. Check browser console for errors');
    console.log('   3. Verify IntelligenceHub component mounted');
  }
  if (typeof window.scheduledSignalDropper === 'undefined') {
    console.log('   1. globalHubService.start() must complete successfully');
    console.log('   2. Check line 738 in globalHubService.ts');
  }
} else {
  console.log('\n✅ NO CRITICAL ISSUES FOUND!');
  console.log('   System appears to be configured correctly');
  console.log('   If signals aren\'t appearing, check:');
  console.log('   1. Wait 30 seconds for first drop (MAX tier)');
  console.log('   2. Check buffer: window.scheduledSignalDropper.getStats(\'MAX\').bufferSize');
  console.log('   3. Signals may be generating but not passing quality gates');
}

console.log('\n' + '='.repeat(80));
console.log('🔍 DIAGNOSTIC COMPLETE');
console.log('='.repeat(80) + '\n');

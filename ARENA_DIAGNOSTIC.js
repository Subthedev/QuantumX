/**
 * ARENA DIAGNOSTIC SCRIPT
 *
 * Open browser console on http://localhost:8080/arena
 * Copy and paste this entire script to diagnose issues
 */

console.log('🔍 ARENA DIAGNOSTIC STARTING...\n');

// Test 1: Check if React is loaded
console.log('1. React Check:', typeof React !== 'undefined' ? '✅ Loaded' : '❌ Missing');

// Test 2: Check if main app root exists
const root = document.getElementById('root');
console.log('2. Root Element:', root ? '✅ Found' : '❌ Missing');

// Test 3: Check for any React errors
const checkReactError = () => {
  const errorBoundary = document.querySelector('[data-error-boundary]');
  if (errorBoundary) {
    console.log('3. React Error Detected:', errorBoundary.textContent);
  } else {
    console.log('3. React Errors:', '✅ None detected');
  }
};
checkReactError();

// Test 4: Check if ArenaEnhanced component is rendering
setTimeout(() => {
  const arenaContent = document.querySelector('[class*="arena"]') ||
                      document.querySelector('h1') ||
                      document.querySelector('button');
  console.log('4. Arena Content:', arenaContent ? '✅ Rendering' : '❌ Not rendering');

  if (!arenaContent) {
    console.log('   Root innerHTML length:', root?.innerHTML?.length || 0);
    console.log('   Root first 200 chars:', root?.innerHTML?.substring(0, 200) || 'empty');
  }
}, 2000);

// Test 5: Check for console errors
const originalError = console.error;
const errors = [];
console.error = function(...args) {
  errors.push(args);
  originalError.apply(console, args);
};

setTimeout(() => {
  console.log('\n5. Console Errors Captured:', errors.length > 0 ? `❌ ${errors.length} errors` : '✅ None');
  if (errors.length > 0) {
    console.log('   Errors:', errors);
  }
}, 3000);

// Test 6: Check network requests
console.log('\n6. Checking network requests...');
setTimeout(() => {
  const performanceEntries = performance.getEntriesByType('resource');
  const failedRequests = performanceEntries.filter(entry => entry.name.includes('.tsx') || entry.name.includes('.ts'));
  console.log('   Total requests:', performanceEntries.length);
  console.log('   Failed requests:', failedRequests.length > 0 ? failedRequests : '✅ None');
}, 1000);

console.log('\n⏳ Diagnostic will complete in 3 seconds...');
console.log('📋 Check above for any ❌ marks\n');

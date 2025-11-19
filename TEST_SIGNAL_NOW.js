// 🧪 EMERGENCY TEST - Paste this in browser console
// This bypasses ALL pipeline logic and forces a test signal into the UI

console.log('🧪 EMERGENCY TEST: Creating test signal...');

// Create a simple test signal
const testSignal = {
  id: `TEST-${Date.now()}`,
  symbol: 'BTC',
  direction: 'LONG',
  confidence: 85,
  entry: 43250,
  stopLoss: 42000,
  targets: [44000, 45000, 46000],
  riskRewardRatio: 2.5,
  patterns: ['TEST'],
  strategy: 'TEST',
  strategyName: 'EMERGENCY_TEST',
  timestamp: Date.now(),
  qualityScore: 85,
  exchangeSources: ['TEST'],
  dataQuality: 100,
  timeLimit: 30,
  expiresAt: Date.now() + (30 * 60 * 1000),
  dynamicExpiry: false
};

console.log('Test signal created:', testSignal);

// Check if globalHubService exists
if (typeof window.globalHubService === 'undefined') {
  console.error('❌ globalHubService NOT FOUND on window!');
  console.error('This means the service is not initialized');
  console.error('Possible issues:');
  console.error('1. Page not fully loaded');
  console.error('2. Service crashed during initialization');
  console.error('3. Import/export issue');
} else {
  console.log('✅ globalHubService found');

  // Check if service is running
  const isRunning = window.globalHubService.isRunning();
  console.log('Service running?', isRunning);

  if (!isRunning) {
    console.error('❌ Service is NOT running!');
    console.log('Attempting to start service...');
    try {
      await window.globalHubService.start();
      console.log('✅ Service started successfully');
    } catch (error) {
      console.error('❌ Failed to start service:', error);
    }
  }

  // Get current state
  const state = window.globalHubService.getState();
  console.log('Current state:', {
    isRunning: state.isRunning,
    activeSignals: state.activeSignals.length,
    totalSignals: state.metrics.totalSignals
  });

  // Try to add signal directly to active signals array
  console.log('\n🚀 Adding test signal directly to activeSignals...');

  // Access private state (hack for testing)
  try {
    // Get the service's state
    const currentSignals = window.globalHubService.getActiveSignals();
    console.log('Current signals before:', currentSignals.length);

    // This won't work because state is private, so let's try emitting an event
    console.log('\n📡 Emitting test signal via events...');

    // Emit signal:new event
    window.globalHubService.emit('signal:new', testSignal);
    console.log('✅ Emitted signal:new event');

    // Emit signal:live event with array
    window.globalHubService.emit('signal:live', [testSignal]);
    console.log('✅ Emitted signal:live event');

    // Check state again
    setTimeout(() => {
      const newState = window.globalHubService.getState();
      console.log('\nState after emission:', {
        isRunning: newState.isRunning,
        activeSignals: newState.activeSignals.length,
        totalSignals: newState.metrics.totalSignals
      });

      if (newState.activeSignals.length === 0) {
        console.error('\n❌ SIGNAL NOT IN STATE!');
        console.error('The UI is not receiving signals from the service');
        console.error('Possible issues:');
        console.error('1. Event listeners not set up in IntelligenceHub component');
        console.error('2. Component not mounted');
        console.error('3. Event emitter broken');
      } else {
        console.log('\n✅ SIGNAL IN STATE!');
        console.log('But if you still don\'t see it in UI, the problem is:');
        console.log('1. UI not listening to events properly');
        console.log('2. React state not updating');
        console.log('3. Component render issue');
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

console.log('\n📝 Instructions:');
console.log('1. Check the console output above');
console.log('2. Look at the Intelligence Hub page - do you see the TEST signal?');
console.log('3. If NO signal appears, copy ALL console output and send it');

/**
 * ARENA EVENT SUBSCRIPTION DIAGNOSTIC
 *
 * Paste this into browser console on /arena page to test event flow
 */

console.log('🔍 ========== ARENA EVENT DIAGNOSTIC ==========\n');

// Step 1: Check if services are loaded
console.log('Step 1: Checking services...');
if (typeof globalHubService === 'undefined') {
  console.error('❌ globalHubService not found!');
  console.log('Import it: const { globalHubService } = await import("./src/services/globalHubService.ts")');
} else {
  console.log('✅ globalHubService loaded');
}

if (typeof arenaService === 'undefined') {
  console.error('❌ arenaService not found!');
  console.log('Import it: const { arenaService } = await import("./src/services/arenaService.ts")');
} else {
  console.log('✅ arenaService loaded');
}

// Step 2: Check Hub status
console.log('\nStep 2: Checking Hub status...');
const isRunning = globalHubService.isRunning();
console.log(`Hub running: ${isRunning ? '✅ YES' : '❌ NO'}`);

if (!isRunning) {
  console.log('⚠️ Starting Hub...');
  await globalHubService.start();
  console.log('✅ Hub started');
}

// Step 3: Check Hub metrics
console.log('\nStep 3: Hub metrics...');
const metrics = globalHubService.getMetrics();
console.log('Metrics:', {
  totalSignals: metrics.totalSignals,
  deltaProcessed: metrics.deltaProcessed || 0,
  deltaPassed: metrics.deltaPassed || 0,
  deltaPassRate: metrics.deltaPassRate || 0
});

// Step 4: Check active signals
console.log('\nStep 4: Active signals...');
const activeSignals = globalHubService.getActiveSignals();
console.log(`Active signals: ${activeSignals.length}`);
if (activeSignals.length > 0) {
  const latest = activeSignals[0];
  console.log('Latest signal:');
  console.log(`  Symbol: ${latest.symbol}`);
  console.log(`  Direction: ${latest.direction}`);
  console.log(`  Confidence: ${latest.confidence || latest.qualityScore}`);
  console.log(`  Strategy: ${latest.strategyName || latest.strategy}`);
  console.log(`  Grade: ${latest.grade}`);
}

// Step 5: Test manual event subscription
console.log('\nStep 5: Testing event subscription...');
let eventReceived = false;

const testHandler = (signal) => {
  eventReceived = true;
  console.log('🎉 EVENT RECEIVED IN TEST HANDLER!');
  console.log('Signal:', signal);
};

globalHubService.on('signal:new', testHandler);
console.log('✅ Test handler attached to signal:new event');

// Step 6: Manually emit a test signal
console.log('\nStep 6: Emitting manual test signal...');

const testSignal = {
  id: `test-manual-${Date.now()}`,
  symbol: 'BTCUSDT',
  direction: 'LONG',
  strategyName: 'WHALE_SHADOW',
  strategy: 'SMART_MONEY',
  entry: 95000,
  stopLoss: 94000,
  targets: [96000, 97000, 98000],
  confidence: 85,  // High confidence to pass Arena filter
  qualityScore: 85,
  timestamp: Date.now(),
  grade: 'A'
};

globalHubService.emit('signal:new', testSignal);

// Wait for async processing
await new Promise(resolve => setTimeout(resolve, 1000));

// Step 7: Check if event was received
console.log('\nStep 7: Verifying event reception...');
if (eventReceived) {
  console.log('✅ Test handler received the event!');
} else {
  console.log('❌ Test handler did NOT receive the event!');
  console.log('This indicates an event emitter issue');
}

// Step 8: Check Arena agents
console.log('\nStep 8: Checking Arena agents...');
const agents = arenaService.getAgents();
console.log(`Agents: ${agents.length}`);
agents.forEach(a => {
  console.log(`  ${a.name}:`);
  console.log(`    - Trades: ${a.totalTrades}`);
  console.log(`    - Active: ${a.isActive}`);
  console.log(`    - Open positions: ${a.openPositions}`);
  console.log(`    - Balance: $${a.balance.toFixed(2)}`);
});

// Step 9: Check database
console.log('\nStep 9: Checking database for agent positions...');
const { supabase } = await import('./src/integrations/supabase/client.ts');
const { data: positions, error } = await supabase
  .from('mock_trading_positions')
  .select('*')
  .in('user_id', ['agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'])
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Database error:', error);
} else {
  console.log(`Positions found: ${positions?.length || 0}`);
  if (positions && positions.length > 0) {
    console.log('Latest position:', positions[0]);
  }
}

console.log('\n🔍 ========== DIAGNOSTIC COMPLETE ==========');
console.log('\n📊 SUMMARY:');
console.log(`Hub Running: ${isRunning ? '✅' : '❌'}`);
console.log(`Active Signals: ${activeSignals.length}`);
console.log(`Event Subscription: ${eventReceived ? '✅ Working' : '❌ Not Working'}`);
console.log(`Agents Trading: ${agents.filter(a => a.totalTrades > 0).length}/${agents.length}`);
console.log(`DB Positions: ${positions?.length || 0}`);

console.log('\n💡 NEXT STEPS:');
if (!isRunning) {
  console.log('  1. Hub is not running - start it first');
} else if (activeSignals.length === 0) {
  console.log('  1. Hub is running but no signals yet - wait 5-10 minutes');
} else if (!eventReceived) {
  console.log('  1. Event subscription is broken - check Arena service initialization');
} else if (agents.filter(a => a.totalTrades > 0).length === 0) {
  console.log('  1. Events working but agents not trading - check confidence filter (need 75%+)');
  console.log('  2. Check console for "Signal REJECTED" messages');
} else {
  console.log('  1. Everything looks good! Check cards for real-time updates');
}

/**
 * ARENA PIPELINE TEST SCRIPT
 *
 * Paste this entire script into browser console on /arena page to test signal flow
 */

console.log('🧪 ========== ARENA PIPELINE TEST ==========');

// Step 1: Verify services are loaded
console.log('\n📋 Step 1: Checking services...');
if (typeof globalHubService === 'undefined') {
  console.error('❌ globalHubService not found!');
  console.log('💡 Run: window.globalHubService = (await import("./src/services/globalHubService.ts")).globalHubService');
} else {
  console.log('✅ globalHubService loaded');
}

if (typeof arenaService === 'undefined') {
  console.error('❌ arenaService not found!');
  console.log('💡 Run: window.arenaService = (await import("./src/services/arenaService.ts")).arenaService');
} else {
  console.log('✅ arenaService loaded');
}

// Step 2: Check Hub status
console.log('\n📋 Step 2: Checking Intelligence Hub status...');
const isRunning = globalHubService.isRunning();
console.log(`Hub running: ${isRunning ? '✅ YES' : '❌ NO'}`);

if (!isRunning) {
  console.log('⚠️ Starting Hub...');
  await globalHubService.start();
}

// Step 3: Check metrics
console.log('\n📋 Step 3: Checking Hub metrics...');
const metrics = globalHubService.getMetrics();
console.log('Hub Metrics:', {
  totalSignals: metrics.totalSignals,
  totalTickers: metrics.totalTickers,
  deltaPassRate: metrics.deltaPassRate + '%',
  alphaPatternsDetected: metrics.alphaPatternsDetected
});

// Step 4: Check active signals
console.log('\n📋 Step 4: Checking active signals...');
const activeSignals = globalHubService.getActiveSignals();
console.log(`Active signals: ${activeSignals.length}`);
if (activeSignals.length > 0) {
  console.log('Latest signal:', activeSignals[0]);
  console.log('Strategy name:', activeSignals[0].strategyName);
}

// Step 5: Check Arena agents
console.log('\n📋 Step 5: Checking Arena agents...');
const agents = arenaService.getAgents();
console.log(`Agents loaded: ${agents.length}`);
agents.forEach(agent => {
  console.log(`  - ${agent.name}: ${agent.totalTrades} trades, ${agent.isActive ? 'ACTIVE' : 'IDLE'}`);
});

// Step 6: TEST - Manually emit a signal
console.log('\n📋 Step 6: TESTING - Emitting test signal...');
console.log('⚠️ This will trigger a WHALE_SHADOW signal for NEXUS-01');

const testSignal = {
  id: `test-${Date.now()}`,
  symbol: 'BTCUSDT',
  strategyName: 'WHALE_SHADOW', // ← This should match NEXUS-01
  strategy: 'SMART_MONEY',
  direction: 'LONG',
  entry: 95000,
  stopLoss: 94000,
  targets: [96000, 97000, 98000],
  confidence: 85,
  timestamp: Date.now(),
  grade: 'A',
  qualityScore: 85
};

console.log('Emitting test signal:', testSignal);
globalHubService.emit('signal:new', testSignal);

// Wait for async execution
await new Promise(resolve => setTimeout(resolve, 1000));

// Step 7: Verify trade execution
console.log('\n📋 Step 7: Verifying trade execution...');
const updatedAgents = arenaService.getAgents();
const nexus = updatedAgents.find(a => a.id === 'nexus');
if (nexus) {
  console.log(`NEXUS-01 status:`, {
    isActive: nexus.isActive,
    totalTrades: nexus.totalTrades,
    openPositions: nexus.openPositions,
    lastTrade: nexus.lastTrade
  });

  if (nexus.totalTrades > 0 || nexus.isActive) {
    console.log('✅ SUCCESS! Agent executed the test signal!');
  } else {
    console.log('❌ FAILED! Agent did not execute the signal');
    console.log('💡 Check console for Arena subscription logs');
  }
} else {
  console.log('❌ Could not find NEXUS-01 agent');
}

// Step 8: Check database
console.log('\n📋 Step 8: Checking database...');
const { supabase } = await import('./src/integrations/supabase/client.ts');
const { data: positions } = await supabase
  .from('mock_trading_positions')
  .select('*')
  .eq('user_id', 'agent-nexus-01')
  .order('created_at', { ascending: false })
  .limit(1);

if (positions && positions.length > 0) {
  console.log('✅ Position found in database:', positions[0]);
} else {
  console.log('❌ No positions found in database');
}

console.log('\n🧪 ========== TEST COMPLETE ==========');
console.log('\n📊 Expected Console Logs:');
console.log('  [Arena] 📡 Signal received from Intelligence Hub: WHALE_SHADOW BTCUSDT');
console.log('  [Arena] ✅ NEXUS-01 will execute WHALE_SHADOW signal');
console.log('  [Arena] 🤖 NEXUS-01 executing trade for BTCUSDT (WHALE_SHADOW)');
console.log('  [Arena] ✅ NEXUS-01 opened BUY position at $95000.00');
console.log('\nIf you see these logs → ✅ Pipeline working!');
console.log('If you DON\'T see these logs → ❌ Check Arena subscription');

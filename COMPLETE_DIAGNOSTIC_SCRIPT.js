// COMPLETE SIGNAL FLOW DIAGNOSTIC SCRIPT
// Paste this into browser console to check entire system

console.log('\n\n🔍🔍🔍 IGX COMPLETE SYSTEM DIAGNOSTIC 🔍🔍🔍\n\n');

// Import services
const { globalHubService } = await import('./src/services/globalHubService.ts');
const { arenaService } = await import('./src/services/arenaService.ts');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 1: Check if Hub is running');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const hubRunning = globalHubService.isRunning();
console.log(`Hub Status: ${hubRunning ? '✅ RUNNING' : '❌ STOPPED'}`);
if (!hubRunning) {
  console.log('⚠️  Hub is not running! Start it first.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 2: Check active signals');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const activeSignals = globalHubService.getActiveSignals();
console.log(`Active Signals Count: ${activeSignals.length}`);
if (activeSignals.length > 0) {
  console.log('Top 3 Signals:');
  const top3 = [...activeSignals].sort((a, b) =>
    (b.confidence || b.qualityScore || 0) - (a.confidence || a.qualityScore || 0)
  ).slice(0, 3);
  top3.forEach((sig, idx) => {
    console.log(`  ${idx + 1}. ${sig.symbol} ${sig.direction} - ${sig.confidence || sig.qualityScore}% confidence`);
    console.log(`     Entry: $${sig.entry}, Strategy: ${sig.strategyName || sig.strategy}`);
  });
} else {
  console.log('⚠️  No active signals! Hub needs to generate signals first.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 3: Check Arena agents');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const agents = arenaService.getAgents();
console.log(`Agents Count: ${agents.length}`);
if (agents.length > 0) {
  agents.forEach((agent, idx) => {
    console.log(`  ${idx + 1}. ${agent.name}:`);
    console.log(`     Balance: $${agent.balance.toLocaleString()}`);
    console.log(`     P&L: ${agent.totalPnLPercent >= 0 ? '+' : ''}${agent.totalPnLPercent.toFixed(2)}%`);
    console.log(`     Total Trades: ${agent.totalTrades}`);
    console.log(`     Open Positions: ${agent.openPositions}`);
    console.log(`     Active: ${agent.isActive ? '✅ YES' : '❌ NO'}`);
  });
} else {
  console.log('⚠️  No agents found! Arena needs to be initialized.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 4: Check event listeners');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const listenerCount = globalHubService.events?.get('signal:new')?.length || 0;
console.log(`'signal:new' listeners: ${listenerCount}`);
if (listenerCount === 0) {
  console.log('❌ NO LISTENERS! Arena is not subscribed to Hub signals!');
  console.log('   Solution: Arena needs to call subscribeToIntelligenceHub()');
} else {
  console.log(`✅ ${listenerCount} listener(s) registered`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 5: Test signal emission');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Emitting test signal...');

const testSignal = {
  id: `diagnostic-test-${Date.now()}`,
  symbol: 'BTCUSDT',
  direction: 'LONG',
  strategy: 'DIAGNOSTIC_TEST',
  strategyName: 'Diagnostic Test Signal',
  entry: 95000,
  stopLoss: 94000,
  targets: [96000, 97000],
  confidence: 85,
  qualityScore: 85,
  timestamp: Date.now(),
  grade: 'A',
  image: ''
};

console.log('Test signal:', testSignal);
globalHubService.emit('signal:new', testSignal);
console.log('✅ Test signal emitted!');
console.log('   Check console above for Arena reception logs');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 6: Summary & Recommendations');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!hubRunning) {
  console.log('❌ PROBLEM: Hub is not running');
  console.log('   FIX: Go to Control Center → Hub Tab → Click "Start Hub"');
}

if (activeSignals.length === 0) {
  console.log('❌ PROBLEM: No signals generated');
  console.log('   FIX: Wait 30-60 seconds after starting Hub, or click "Clear & Restart"');
}

if (agents.length === 0) {
  console.log('❌ PROBLEM: No agents initialized');
  console.log('   FIX: Go to Control Center → Arena Tab → Click "Start Arena"');
}

if (listenerCount === 0) {
  console.log('❌ PROBLEM: Arena not subscribed to Hub events');
  console.log('   FIX: Click "Restart & Resubscribe" in Arena tab');
}

const agentsWithoutTrades = agents.filter(a => a.totalTrades === 0);
if (agentsWithoutTrades.length > 0) {
  console.log(`⚠️  WARNING: ${agentsWithoutTrades.length} agent(s) have 0 trades`);
  console.log('   Agents:', agentsWithoutTrades.map(a => a.name).join(', '));
  console.log('   FIX: Click "Process Existing Signals" to manually assign signals');
}

console.log('\n🏁 DIAGNOSTIC COMPLETE\n\n');

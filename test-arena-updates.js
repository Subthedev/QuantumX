/**
 * ARENA REAL-TIME UPDATE TEST SCRIPT
 *
 * HOW TO USE:
 * 1. Open http://localhost:8082/arena
 * 2. Open browser console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire file into the console
 * 4. Press Enter
 * 5. Watch the results
 */

console.log('🧪 ARENA UPDATE TEST - Starting...\n');

// Test 1: Check if arenaService is initialized
console.log('TEST 1: Arena Service Status');
console.log('-----------------------------');
try {
  const agents = arenaService.getAgents();
  const stats = arenaService.getStats();
  console.log('✅ Arena Service: INITIALIZED');
  console.log(`   - Agents loaded: ${agents.length}`);
  console.log(`   - Live viewers: ${stats?.liveViewers || 0}`);

  agents.forEach(agent => {
    console.log(`\n   ${agent.name}:`);
    console.log(`   - Balance: $${agent.balance.toFixed(2)}`);
    console.log(`   - P&L: ${agent.totalPnLPercent >= 0 ? '+' : ''}${agent.totalPnLPercent.toFixed(2)}%`);
    console.log(`   - Win Rate: ${agent.winRate.toFixed(1)}%`);
    console.log(`   - Open Positions: ${agent.openPositions}`);
    console.log(`   - Total Trades: ${agent.totalTrades}`);
  });
} catch (error) {
  console.error('❌ Arena Service: NOT INITIALIZED');
  console.error('   Error:', error.message);
  console.log('\n💡 Solution: Navigate to /arena page first');
}

console.log('\n\n');

// Test 2: Check if positions have real data
console.log('TEST 2: Position Data Check');
console.log('---------------------------');

async function checkPositions() {
  try {
    const agentIds = ['agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'];

    for (const userId of agentIds) {
      const positions = await mockTradingService.getOpenPositions(userId);
      const agentName = userId.replace('agent-', '').toUpperCase();

      console.log(`\n${agentName}:`);
      if (positions.length === 0) {
        console.log('   ⚠️  No open positions');
      } else {
        positions.forEach((pos, idx) => {
          console.log(`   Position ${idx + 1}:`);
          console.log(`   - Symbol: ${pos.symbol}`);
          console.log(`   - Side: ${pos.side}`);
          console.log(`   - Entry: $${pos.entry_price.toFixed(2)}`);
          console.log(`   - Current: $${pos.current_price.toFixed(2)}`);
          console.log(`   - P&L: ${pos.unrealized_pnl_percent >= 0 ? '+' : ''}${pos.unrealized_pnl_percent.toFixed(2)}%`);
        });
      }
    }

    console.log('\n✅ Position data loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load positions:', error.message);
  }
}

checkPositions();

console.log('\n\n');

// Test 3: Monitor real-time updates
console.log('TEST 3: Real-Time Update Monitor');
console.log('----------------------------------');
console.log('Monitoring for 30 seconds...');
console.log('(You should see updates every 10 seconds)\n');

let updateCount = 0;
const monitorInterval = setInterval(() => {
  try {
    const agents = arenaService.getAgents();
    updateCount++;

    console.log(`\n📊 Update #${updateCount} (${new Date().toLocaleTimeString()}):`);
    agents.forEach(agent => {
      console.log(`   ${agent.name}: ${agent.totalPnLPercent >= 0 ? '+' : ''}${agent.totalPnLPercent.toFixed(2)}% | $${agent.balance.toFixed(2)}`);
    });
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
}, 10000);

// Stop after 30 seconds
setTimeout(() => {
  clearInterval(monitorInterval);
  console.log('\n\n');
  console.log('✅ MONITOR STOPPED');
  console.log('------------------');
  console.log(`Total updates captured: ${updateCount}`);
  console.log('\n💡 If you saw updates, real-time is WORKING!');
  console.log('💡 If no updates, check the troubleshooting guide in REALTIME_UPDATE_FIX.md');
}, 30000);

console.log('\n\n');
console.log('🎯 EXPECTED RESULTS:');
console.log('-------------------');
console.log('- TEST 1: Shows 3 agents with real balances');
console.log('- TEST 2: Shows open positions for at least 1 agent');
console.log('- TEST 3: Numbers change every 10 seconds');
console.log('\nIf all 3 tests pass: 🎉 ARENA IS WORKING!');
console.log('\n📝 Check the console above for results...');

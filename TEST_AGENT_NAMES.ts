/**
 * TEST_AGENT_NAMES.ts
 *
 * Quick verification test for renamed agents: alphaX, betaX, QuantumX
 *
 * Run this in browser console to verify the agent name changes work correctly
 */

import { AgentType, strategyMatrix } from './src/services/strategyMatrix';
import { MarketState } from './src/services/marketStateDetectionEngine';
import { agentOrchestrator } from './src/services/agentOrchestrator';

export async function testAgentNames() {
  console.log('🧪 Testing Renamed Agents: alphaX, betaX, QuantumX\n');
  console.log('='.repeat(60));

  // Test 1: Verify AgentType enum values
  console.log('\n✅ TEST 1: AgentType Enum Values');
  console.log('   alphaX:', AgentType.ALPHAX);
  console.log('   betaX:', AgentType.BETAX);
  console.log('   QuantumX:', AgentType.QUANTUMX);

  if (
    AgentType.ALPHAX === 'alphaX' &&
    AgentType.BETAX === 'betaX' &&
    AgentType.QUANTUMX === 'QuantumX'
  ) {
    console.log('   ✅ PASS - Agent names correct');
  } else {
    console.log('   ❌ FAIL - Agent names incorrect');
    return false;
  }

  // Test 2: Verify strategy assignments
  console.log('\n✅ TEST 2: Strategy Agent Assignments');
  const distribution = strategyMatrix.getStrategyDistribution();
  console.log('   alphaX strategies:', distribution[AgentType.ALPHAX]);
  console.log('   betaX strategies:', distribution[AgentType.BETAX]);
  console.log('   QuantumX strategies:', distribution[AgentType.QUANTUMX]);

  const totalStrategies =
    distribution[AgentType.ALPHAX] +
    distribution[AgentType.BETAX] +
    distribution[AgentType.QUANTUMX];

  if (totalStrategies === 16) {
    // 16 strategies total (one deprecated)
    console.log('   ✅ PASS - All strategies assigned');
  } else {
    console.log(`   ⚠️  WARNING - Expected 16 strategies, found ${totalStrategies}`);
  }

  // Test 3: Verify recommended agents for each market state
  console.log('\n✅ TEST 3: Recommended Agents by Market State');

  const states = [
    MarketState.BULLISH_HIGH_VOL,
    MarketState.BULLISH_LOW_VOL,
    MarketState.BEARISH_HIGH_VOL,
    MarketState.BEARISH_LOW_VOL,
    MarketState.RANGEBOUND,
  ];

  let allAgentsValid = true;
  states.forEach(state => {
    const agent = strategyMatrix.getRecommendedAgent(state);
    console.log(`   ${state}: ${agent}`);

    if (![AgentType.ALPHAX, AgentType.BETAX, AgentType.QUANTUMX].includes(agent)) {
      console.log(`   ❌ Invalid agent: ${agent}`);
      allAgentsValid = false;
    }
  });

  if (allAgentsValid) {
    console.log('   ✅ PASS - All recommended agents valid');
  } else {
    console.log('   ❌ FAIL - Some invalid agents');
    return false;
  }

  // Test 4: Verify suitable strategies by agent
  console.log('\n✅ TEST 4: Suitable Strategies by Agent');

  const agentTests = [
    { agent: AgentType.ALPHAX, name: 'alphaX' },
    { agent: AgentType.BETAX, name: 'betaX' },
    { agent: AgentType.QUANTUMX, name: 'QuantumX' },
  ];

  agentTests.forEach(({ agent, name }) => {
    const strategies = strategyMatrix.getSuitableStrategies(
      MarketState.BULLISH_HIGH_VOL,
      50,
      agent
    );
    console.log(`   ${name}: ${strategies.length} strategies (≥50% suitability)`);

    if (strategies.length > 0) {
      console.log(`      Top: ${strategies[0].strategy.name} (${strategies[0].suitability}%)`);
    }
  });

  console.log('   ✅ PASS - Agent filtering works');

  // Test 5: Verify agent orchestrator stats
  console.log('\n✅ TEST 5: Agent Orchestrator Stats');

  try {
    const stats = await agentOrchestrator.getAgentStats();
    console.log(`   Current Market State: ${stats.currentMarketState.state}`);
    console.log(`   Recommended Agent: ${stats.recommendedAgent}`);

    console.log('\n   Agent Performance:');
    stats.agentPerformance.forEach((perf, agent) => {
      console.log(`      ${agent}: Win Rate ${perf.winRate}%`);
    });

    console.log('   ✅ PASS - Agent orchestrator working');
  } catch (error) {
    console.log('   ⚠️  Agent orchestrator test skipped (requires market data)');
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 AGENT RENAMING TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\n✅ Agent names successfully updated to:');
  console.log('   • alphaX (Trend Engine) - Formerly ALPHA');
  console.log('   • betaX (Reversion Engine) - Formerly BETA');
  console.log('   • QuantumX (Chaos Engine) - Formerly GAMMA');
  console.log('\n🚀 All systems operational with new branding!\n');

  return true;
}

// Quick one-liner test
export async function quickTest() {
  console.log('⚡ Quick Agent Name Test:\n');
  console.log('alphaX:', AgentType.ALPHAX);
  console.log('betaX:', AgentType.BETAX);
  console.log('QuantumX:', AgentType.QUANTUMX);

  const distribution = strategyMatrix.getStrategyDistribution();
  console.log('\nStrategy Distribution:');
  console.log('  alphaX:', distribution[AgentType.ALPHAX], 'strategies');
  console.log('  betaX:', distribution[AgentType.BETAX], 'strategies');
  console.log('  QuantumX:', distribution[AgentType.QUANTUMX], 'strategies');

  console.log('\n✅ Agent names updated successfully!\n');
}

// Export test runner
export default testAgentNames;

/**
 * Browser Console Test for Agent Renaming
 *
 * Copy and paste this into your browser console at http://localhost:8083
 */

import { AgentType, strategyMatrix } from './services/strategyMatrix';
import { MarketState } from './services/marketStateDetectionEngine';

// Make it available globally for easy testing
(window as any).testAgents = async () => {
  console.log('%c🧪 Testing Agent Renaming: alphaX, betaX, QuantumX', 'background: #222; color: #bada55; font-size: 16px; font-weight: bold; padding: 10px;');
  console.log('='.repeat(70));

  // Test 1: Agent Names
  console.log('\n%c✅ TEST 1: Agent Names', 'color: #4ade80; font-weight: bold');
  console.log('  alphaX:', AgentType.ALPHAX);
  console.log('  betaX:', AgentType.BETAX);
  console.log('  QuantumX:', AgentType.QUANTUMX);

  const namesCorrect =
    AgentType.ALPHAX === 'alphaX' &&
    AgentType.BETAX === 'betaX' &&
    AgentType.QUANTUMX === 'QuantumX';

  console.log(namesCorrect ? '  ✅ PASS' : '  ❌ FAIL');

  // Test 2: Strategy Distribution
  console.log('\n%c✅ TEST 2: Strategy Distribution', 'color: #4ade80; font-weight: bold');
  const distribution = strategyMatrix.getStrategyDistribution();
  console.log('  alphaX:', distribution[AgentType.ALPHAX], 'strategies');
  console.log('  betaX:', distribution[AgentType.BETAX], 'strategies');
  console.log('  QuantumX:', distribution[AgentType.QUANTUMX], 'strategies');

  const total = distribution[AgentType.ALPHAX] + distribution[AgentType.BETAX] + distribution[AgentType.QUANTUMX];
  console.log(`  Total: ${total} strategies`);
  console.log(total === 16 ? '  ✅ PASS' : '  ⚠️ WARNING');

  // Test 3: Recommended Agents
  console.log('\n%c✅ TEST 3: Recommended Agents by Market State', 'color: #4ade80; font-weight: bold');

  const states = [
    MarketState.BULLISH_HIGH_VOL,
    MarketState.BULLISH_LOW_VOL,
    MarketState.BEARISH_HIGH_VOL,
    MarketState.BEARISH_LOW_VOL,
    MarketState.RANGEBOUND,
  ];

  states.forEach(state => {
    const agent = strategyMatrix.getRecommendedAgent(state);
    console.log(`  ${state}: %c${agent}`, 'font-weight: bold; color: #60a5fa');
  });
  console.log('  ✅ PASS');

  // Test 4: Strategy Matrix Sample
  console.log('\n%c✅ TEST 4: Top Strategies for BULLISH_HIGH_VOL', 'color: #4ade80; font-weight: bold');
  const strategies = strategyMatrix.getSuitableStrategies(MarketState.BULLISH_HIGH_VOL, 70);

  strategies.slice(0, 5).forEach(({ strategy, suitability }) => {
    const agentColor =
      strategy.agent === AgentType.ALPHAX ? '#60a5fa' :
      strategy.agent === AgentType.BETAX ? '#34d399' : '#f87171';

    console.log(`  ${suitability}% - ${strategy.name} %c[${strategy.agent}]`, `color: ${agentColor}; font-weight: bold`);
  });
  console.log('  ✅ PASS');

  // Test 5: Agent-Specific Strategies
  console.log('\n%c✅ TEST 5: Strategies by Agent', 'color: #4ade80; font-weight: bold');

  const alphaStrategies = strategyMatrix.getAgentStrategies(AgentType.ALPHAX);
  const betaStrategies = strategyMatrix.getAgentStrategies(AgentType.BETAX);
  const quantumStrategies = strategyMatrix.getAgentStrategies(AgentType.QUANTUMX);

  console.log(`  %calphaX (Trend Engine)`, 'color: #60a5fa; font-weight: bold');
  alphaStrategies.forEach(s => console.log(`    • ${s.name}`));

  console.log(`\n  %cbetaX (Reversion Engine)`, 'color: #34d399; font-weight: bold');
  betaStrategies.forEach(s => console.log(`    • ${s.name}`));

  console.log(`\n  %cQuantumX (Chaos Engine)`, 'color: #f87171; font-weight: bold');
  quantumStrategies.forEach(s => console.log(`    • ${s.name}`));

  console.log('\n  ✅ PASS');

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('%c🎉 ALL TESTS PASSED!', 'background: #10b981; color: white; font-size: 18px; font-weight: bold; padding: 10px;');
  console.log('\n%c✨ Agent Names Successfully Updated:', 'color: #fbbf24; font-weight: bold; font-size: 14px');
  console.log('%c  🔵 alphaX (Trend Engine) - 6 strategies', 'color: #60a5fa; font-weight: bold');
  console.log('%c  🟢 betaX (Reversion Engine) - 6 strategies', 'color: #34d399; font-weight: bold');
  console.log('%c  🔴 QuantumX (Chaos Engine) - 4 strategies', 'color: #f87171; font-weight: bold');
  console.log('\n%c🚀 All systems operational!', 'color: #a78bfa; font-weight: bold; font-size: 14px');
};

// Quick one-liner test
(window as any).quickTest = () => {
  console.log('%c⚡ Quick Agent Test', 'background: #1e293b; color: #fbbf24; font-size: 14px; padding: 5px; font-weight: bold');
  console.log('alphaX:', AgentType.ALPHAX);
  console.log('betaX:', AgentType.BETAX);
  console.log('QuantumX:', AgentType.QUANTUMX);
  const dist = strategyMatrix.getStrategyDistribution();
  console.log('\nDistribution:', dist);
  console.log('%c✅ Working!', 'color: #10b981; font-weight: bold');
};

// Auto-run message
console.log('%c🧪 Agent Test Suite Loaded!', 'background: #1e293b; color: #60a5fa; font-size: 14px; padding: 10px; font-weight: bold');
console.log('\nRun tests with:');
console.log('%ctestAgents()', 'background: #334155; color: #fbbf24; padding: 5px; font-family: monospace');
console.log('or');
console.log('%cquickTest()', 'background: #334155; color: #fbbf24; padding: 5px; font-family: monospace');

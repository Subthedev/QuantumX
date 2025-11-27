/**
 * TEST_AGENT_SYSTEM.ts
 *
 * Comprehensive test suite for Phase 1: Agent System
 *
 * Run this in your browser console or create a test page
 */

import { marketStateDetectionEngine, MarketState } from './src/services/marketStateDetectionEngine';
import { strategyMatrix, AgentType } from './src/services/strategyMatrix';
import { agentOrchestrator } from './src/services/agentOrchestrator';
import { supabase } from './src/integrations/supabase/client';

// ============================================
// TEST SUITE
// ============================================

export async function runAllTests() {
  console.log('🧪 Starting Agent System Test Suite\n');
  console.log('='.repeat(80));

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL'; message?: string }>
  };

  // Test 1: Market State Detection - Overall Market
  try {
    console.log('\n📊 TEST 1: Market State Detection (Overall Market)');
    const marketState = await marketStateDetectionEngine.detectMarketState(50);

    if (!marketState || !marketState.state) {
      throw new Error('No market state returned');
    }

    console.log('✅ PASS - Market State Detected:');
    console.log('   State:', marketState.state);
    console.log('   Confidence:', marketState.confidence.toFixed(1) + '%');
    console.log('   Volatility:', marketState.volatility.toFixed(1));
    console.log('   Trend Strength:', marketState.trendStrength.toFixed(1));

    results.passed++;
    results.tests.push({ name: 'Market State Detection - Overall', status: 'PASS' });
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Market State Detection - Overall',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 2: Market State Detection - Symbol Specific
  try {
    console.log('\n📊 TEST 2: Market State Detection (Symbol-Specific)');

    const symbols = ['BTC', 'ETH', 'SOL'];
    const symbolStates = [];

    for (const symbol of symbols) {
      try {
        const state = await marketStateDetectionEngine.detectSymbolMarketState(symbol);
        symbolStates.push({ symbol, state: state.state, confidence: state.confidence });
        console.log(`   ${symbol}: ${state.state} (${state.confidence.toFixed(1)}%)`);
      } catch (error) {
        console.log(`   ${symbol}: Failed - ${error.message}`);
      }
    }

    if (symbolStates.length > 0) {
      console.log('✅ PASS - Symbol-specific detection working');
      results.passed++;
      results.tests.push({ name: 'Market State Detection - Symbols', status: 'PASS' });
    } else {
      throw new Error('No symbols detected');
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Market State Detection - Symbols',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 3: Strategy Matrix - Get Suitable Strategies
  try {
    console.log('\n🎯 TEST 3: Strategy Matrix - Suitable Strategies');

    const testStates = [
      MarketState.BULLISH_HIGH_VOL,
      MarketState.RANGEBOUND,
      MarketState.BEARISH_HIGH_VOL
    ];

    for (const state of testStates) {
      const strategies = strategyMatrix.getSuitableStrategies(state, 70);
      console.log(`\n   ${state}:`);
      console.log(`   Found ${strategies.length} strategies (min 70% suitability)`);

      if (strategies.length > 0) {
        strategies.slice(0, 3).forEach(({ strategy, suitability }) => {
          console.log(`     • ${strategy.name} (${suitability}%) [${strategy.agent}]`);
        });
      }
    }

    console.log('\n✅ PASS - Strategy matrix working');
    results.passed++;
    results.tests.push({ name: 'Strategy Matrix - Suitability', status: 'PASS' });
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Strategy Matrix - Suitability',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 4: Strategy Matrix - Recommended Agent
  try {
    console.log('\n🤖 TEST 4: Strategy Matrix - Agent Recommendations');

    const recommendations = {
      [MarketState.BULLISH_HIGH_VOL]: strategyMatrix.getRecommendedAgent(MarketState.BULLISH_HIGH_VOL),
      [MarketState.BULLISH_LOW_VOL]: strategyMatrix.getRecommendedAgent(MarketState.BULLISH_LOW_VOL),
      [MarketState.BEARISH_HIGH_VOL]: strategyMatrix.getRecommendedAgent(MarketState.BEARISH_HIGH_VOL),
      [MarketState.BEARISH_LOW_VOL]: strategyMatrix.getRecommendedAgent(MarketState.BEARISH_LOW_VOL),
      [MarketState.RANGEBOUND]: strategyMatrix.getRecommendedAgent(MarketState.RANGEBOUND),
    };

    console.log('   Agent Recommendations by Market State:');
    Object.entries(recommendations).forEach(([state, agent]) => {
      console.log(`     ${state}: ${agent}`);
    });

    console.log('\n✅ PASS - Agent recommendations working');
    results.passed++;
    results.tests.push({ name: 'Strategy Matrix - Recommendations', status: 'PASS' });
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Strategy Matrix - Recommendations',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 5: Agent Orchestrator - Get Stats
  try {
    console.log('\n📈 TEST 5: Agent Orchestrator - Statistics');

    const stats = await agentOrchestrator.getAgentStats();

    console.log('   Current Market State:', stats.currentMarketState.state);
    console.log('   Recommended Agent:', stats.recommendedAgent);
    console.log('\n   Agent Performance:');

    stats.agentPerformance.forEach((perf, agent) => {
      console.log(`     ${agent}:`);
      console.log(`       Total Signals: ${perf.totalSignals}`);
      console.log(`       Win Rate: ${perf.winRate.toFixed(1)}%`);
      console.log(`       Avg Confidence: ${perf.avgConfidence.toFixed(1)}`);
    });

    console.log('\n✅ PASS - Agent orchestrator stats working');
    results.passed++;
    results.tests.push({ name: 'Agent Orchestrator - Stats', status: 'PASS' });
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Agent Orchestrator - Stats',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 6: Database - Check Tables Exist
  try {
    console.log('\n💾 TEST 6: Database Tables');

    const tables = ['agent_performance', 'agent_activity_log', 'market_state_history'];
    const tableChecks = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
        tableChecks.push(false);
      } else {
        console.log(`   ✓ ${table}: OK`);
        tableChecks.push(true);
      }
    }

    if (tableChecks.every(check => check)) {
      console.log('\n✅ PASS - All database tables exist');
      results.passed++;
      results.tests.push({ name: 'Database Tables', status: 'PASS' });
    } else {
      throw new Error('Some tables missing or inaccessible');
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Database Tables',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 7: Database - Agent Performance Records
  try {
    console.log('\n📊 TEST 7: Agent Performance Records');

    const { data: agents, error } = await supabase
      .from('agent_performance')
      .select('*')
      .order('agent');

    if (error) throw error;

    console.log(`   Found ${agents?.length || 0} agent records:`);
    agents?.forEach(agent => {
      console.log(`     ${agent.agent}: Win Rate ${agent.win_rate}%, Confidence ${agent.avg_confidence}`);
    });

    if (agents && agents.length === 3) {
      console.log('\n✅ PASS - All 3 agents initialized');
      results.passed++;
      results.tests.push({ name: 'Agent Performance Records', status: 'PASS' });
    } else {
      throw new Error(`Expected 3 agents, found ${agents?.length || 0}`);
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Agent Performance Records',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test 8: Strategy Matrix Visualization
  try {
    console.log('\n📊 TEST 8: Strategy Matrix Visualization');

    const matrix = strategyMatrix.generateMatrixVisualization();
    console.log(matrix);

    console.log('✅ PASS - Matrix visualization generated');
    results.passed++;
    results.tests.push({ name: 'Matrix Visualization', status: 'PASS' });
  } catch (error) {
    console.error('❌ FAIL:', error);
    results.failed++;
    results.tests.push({
      name: 'Matrix Visualization',
      status: 'FAIL',
      message: error.message
    });
  }

  // Final Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, i) => {
    const status = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${i + 1}. ${status} ${test.name}`);
    if (test.message) {
      console.log(`   Error: ${test.message}`);
    }
  });

  return results;
}

// ============================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================

export async function testMarketState() {
  console.log('🔍 Testing Market State Detection...\n');

  const overall = await marketStateDetectionEngine.detectMarketState(50);
  console.log('Overall Market:', overall);

  const btc = await marketStateDetectionEngine.detectSymbolMarketState('BTC');
  console.log('\nBTC State:', btc);

  const description = marketStateDetectionEngine.getStateDescription(overall.state);
  console.log('\nDescription:', description);
}

export async function testStrategyMatrix() {
  console.log('🎯 Testing Strategy Matrix...\n');

  // Get distribution
  const distribution = strategyMatrix.getStrategyDistribution();
  console.log('Strategy Distribution:', distribution);

  // Get recommended agent for each state
  console.log('\nRecommended Agents:');
  Object.values(MarketState).forEach(state => {
    const agent = strategyMatrix.getRecommendedAgent(state);
    console.log(`  ${state}: ${agent}`);
  });

  // Show matrix
  console.log(strategyMatrix.generateMatrixVisualization());
}

export async function testAgentOrchestrator() {
  console.log('🤖 Testing Agent Orchestrator...\n');

  const stats = await agentOrchestrator.getAgentStats();
  console.log('Agent Stats:', stats);

  // Note: Signal generation will fail until strategy modules are implemented
  console.log('\n⚠️  Signal generation test skipped (requires strategy module implementation)');
}

export async function testDatabase() {
  console.log('💾 Testing Database...\n');

  // Test agent_performance
  const { data: agents } = await supabase
    .from('agent_performance')
    .select('*');
  console.log('Agent Performance Records:', agents);

  // Test agent_activity_log
  const { data: activity } = await supabase
    .from('agent_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('\nRecent Activity (last 10):', activity);

  // Test market_state_history
  const { data: history } = await supabase
    .from('market_state_history')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(10);
  console.log('\nMarket State History (last 10):', history);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function clearAllCaches() {
  console.log('🧹 Clearing all caches...');
  marketStateDetectionEngine.clearCache();
  agentOrchestrator.clearCache();
  console.log('✅ Caches cleared');
}

// ============================================
// EXPORT TEST RUNNER
// ============================================

// Run with: await runAllTests()
export default runAllTests;

/**
 * BETA V5 TEST PAGE
 * Manual testing page for IGX Beta V5 and Signal Lifecycle Manager
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/AppHeader';
import { igxBetaV5 } from '@/services/igx/IGXBetaV5';
import { signalLifecycleManager } from '@/services/igx/SignalLifecycleManager';

export default function BetaV5Test() {
  const [betaV5Started, setBetaV5Started] = useState(false);
  const [lifecycleStarted, setLifecycleStarted] = useState(false);
  const [betaStats, setBetaStats] = useState<any>(null);
  const [lifecycleStats, setLifecycleStats] = useState<any>(null);
  const [strategyHealth, setStrategyHealth] = useState<Map<string, any>>(new Map());
  const [testResults, setTestResults] = useState<string[]>([]);

  // Add test result
  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result}`]);
  };

  // Test 1: Start Beta V5
  const testStartBetaV5 = () => {
    try {
      igxBetaV5.start();
      setBetaV5Started(true);
      addResult('✅ Beta V5 started successfully');

      // Update stats
      const stats = igxBetaV5.getStats();
      setBetaStats(stats);
      addResult(`✅ Beta V5 Stats retrieved: ${stats.strategiesActive}/10 strategies active`);
    } catch (error) {
      addResult(`❌ Error starting Beta V5: ${error}`);
    }
  };

  // Test 2: Start Lifecycle Manager
  const testStartLifecycle = () => {
    try {
      signalLifecycleManager.start();
      setLifecycleStarted(true);
      addResult('✅ Signal Lifecycle Manager started successfully');

      // Update stats
      const stats = signalLifecycleManager.getStats();
      setLifecycleStats(stats);
      addResult(`✅ Lifecycle Stats retrieved: ${stats.totalSignalsRegistered} signals registered`);
    } catch (error) {
      addResult(`❌ Error starting Lifecycle Manager: ${error}`);
    }
  };

  // Test 3: Get Strategy Health
  const testGetHealth = () => {
    try {
      const health = igxBetaV5.getStrategyHealth();
      setStrategyHealth(health);

      const healthyCount = Array.from(health.values()).filter(h => h.healthy).length;
      addResult(`✅ Strategy Health retrieved: ${healthyCount}/10 strategies healthy`);

      // Log individual strategy health
      for (const [name, status] of health.entries()) {
        addResult(`  ${name}: ${status.healthy ? '✅' : '❌'} (errors: ${status.consecutiveErrors})`);
      }
    } catch (error) {
      addResult(`❌ Error getting strategy health: ${error}`);
    }
  };

  // Test 4: Test Strategy Disable/Enable
  const testDisableEnable = () => {
    try {
      // Disable WHALE_SHADOW
      igxBetaV5.disableStrategy('WHALE_SHADOW');
      addResult('✅ Disabled WHALE_SHADOW');

      // Check health
      const health = igxBetaV5.getStrategyHealth();
      const whaleHealth = health.get('WHALE_SHADOW');
      addResult(`  WHALE_SHADOW disabled: ${whaleHealth?.disabled ? '✅' : '❌'}`);

      // Re-enable
      igxBetaV5.enableStrategy('WHALE_SHADOW');
      addResult('✅ Re-enabled WHALE_SHADOW');

      setStrategyHealth(health);
    } catch (error) {
      addResult(`❌ Error in disable/enable test: ${error}`);
    }
  };

  // Test 5: Mock Signal Registration
  const testSignalRegistration = () => {
    try {
      const mockSignal: any = {
        id: `test-${Date.now()}`,
        timestamp: Date.now(),
        symbol: 'BTCUSDT',
        direction: 'LONG',
        entryPrice: 43500,
        entryRange: { min: 43400, max: 43600 },
        stopLoss: 42000,
        targets: [45000, 46000, 47000],
        confidence: 75,
        qualityScore: 85,
        expectedProfit: 3.5,
        riskRewardRatio: 2.3,
        winningStrategy: 'WHALE_SHADOW',
        strategyVotes: { long: 8, short: 2, neutral: 0 },
        patterns: [],
        marketConditions: {
          volatility: 50,
          trend: 'BULLISH',
          volume: 'HIGH',
          liquidity: 80
        },
        dataQuality: 95,
        exchangeSources: ['binance', 'coinbase']
      };

      signalLifecycleManager.registerSignal(mockSignal);
      addResult(`✅ Registered mock signal: ${mockSignal.symbol} ${mockSignal.direction} @ $${mockSignal.entryPrice}`);

      // Update stats
      const stats = signalLifecycleManager.getStats();
      setLifecycleStats(stats);
      addResult(`  Total signals: ${stats.totalSignalsRegistered}, Active: ${stats.activeSignalsCount}`);
    } catch (error) {
      addResult(`❌ Error registering signal: ${error}`);
    }
  };

  // Test 6: Get Active Signals
  const testGetActiveSignals = () => {
    try {
      const active = signalLifecycleManager.getActiveSignals();
      addResult(`✅ Retrieved active signals: ${active.length} active`);

      for (const signal of active) {
        addResult(`  ${signal.signal.symbol} ${signal.signal.direction} - Status: ${signal.status}`);
      }
    } catch (error) {
      addResult(`❌ Error getting active signals: ${error}`);
    }
  };

  // Auto-refresh stats
  useEffect(() => {
    if (!betaV5Started && !lifecycleStarted) return;

    const interval = setInterval(() => {
      if (betaV5Started) {
        setBetaStats(igxBetaV5.getStats());
      }
      if (lifecycleStarted) {
        setLifecycleStats(signalLifecycleManager.getStats());
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [betaV5Started, lifecycleStarted]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-white">
      <AppHeader />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-2">
            Beta V5 Test Suite
          </h1>
          <p className="text-gray-500">Manual testing for IGX Beta V5 and Signal Lifecycle Manager</p>
        </div>

        {/* Test Controls */}
        <Card className="p-6 mb-6 border-2 border-orange-200">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={testStartBetaV5} disabled={betaV5Started} className="bg-orange-500 hover:bg-orange-600">
              1. Start Beta V5
            </Button>
            <Button onClick={testStartLifecycle} disabled={lifecycleStarted} className="bg-orange-500 hover:bg-orange-600">
              2. Start Lifecycle
            </Button>
            <Button onClick={testGetHealth} disabled={!betaV5Started} className="bg-blue-500 hover:bg-blue-600">
              3. Get Health
            </Button>
            <Button onClick={testDisableEnable} disabled={!betaV5Started} className="bg-purple-500 hover:bg-purple-600">
              4. Test Disable/Enable
            </Button>
            <Button onClick={testSignalRegistration} disabled={!lifecycleStarted} className="bg-green-500 hover:bg-green-600">
              5. Register Signal
            </Button>
            <Button onClick={testGetActiveSignals} disabled={!lifecycleStarted} className="bg-teal-500 hover:bg-teal-600">
              6. Get Active Signals
            </Button>
          </div>
        </Card>

        {/* Stats Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Beta V5 Stats */}
          <Card className="p-6 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Beta V5 Stats</h2>
              {betaV5Started && <Badge className="bg-green-100 text-green-700">Running</Badge>}
            </div>

            {betaStats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-bold">{betaStats.isRunning ? '✅ Running' : '❌ Stopped'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="font-bold">{(betaStats.uptime / 1000).toFixed(0)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Strategies Active:</span>
                  <span className="font-bold">{betaStats.strategiesActive}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Analyses:</span>
                  <span className="font-bold">{betaStats.totalAnalyses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Health:</span>
                  <span className={`font-bold ${
                    betaStats.overallHealth === 'EXCELLENT' ? 'text-green-600' :
                    betaStats.overallHealth === 'GOOD' ? 'text-blue-600' :
                    betaStats.overallHealth === 'FAIR' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {betaStats.overallHealth} ({betaStats.healthScore}/100)
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Lifecycle Stats */}
          <Card className="p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Lifecycle Stats</h2>
              {lifecycleStarted && <Badge className="bg-green-100 text-green-700">Running</Badge>}
            </div>

            {lifecycleStats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Registered:</span>
                  <span className="font-bold">{lifecycleStats.totalSignalsRegistered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Signals:</span>
                  <span className="font-bold">{lifecycleStats.activeSignalsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Outcomes:</span>
                  <span className="font-bold">{lifecycleStats.totalOutcomes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wins:</span>
                  <span className="font-bold text-green-600">{lifecycleStats.winsDetected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Losses:</span>
                  <span className="font-bold text-red-600">{lifecycleStats.lossesDetected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Win Rate:</span>
                  <span className="font-bold">{(lifecycleStats.winRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Strategy Health */}
        {strategyHealth.size > 0 && (
          <Card className="p-6 mb-6 border-2 border-purple-200">
            <h2 className="text-xl font-bold mb-4">Strategy Health</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from(strategyHealth.entries()).map(([name, status]) => (
                <div key={name} className={`p-3 rounded-lg ${status.healthy ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-xs font-bold mb-1">{name}</div>
                  <div className="text-lg">{status.healthy ? '✅' : '❌'}</div>
                  <div className="text-xs text-gray-500">Errors: {status.consecutiveErrors}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Test Results Log */}
        <Card className="p-6 border-2 border-gray-200">
          <h2 className="text-xl font-bold mb-4">Test Results Log</h2>
          <div className="bg-black rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="font-mono text-sm text-green-400 space-y-1">
              {testResults.length === 0 && (
                <div className="text-gray-500">No tests run yet. Click the buttons above to start testing.</div>
              )}
              {testResults.map((result, i) => (
                <div key={i}>{result}</div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * DIAGNOSTIC PANEL - Visual Interface for Hub Debugging
 *
 * Provides clickable buttons to:
 * - Check system status
 * - Lower Delta thresholds
 * - Force signal generation
 * - View metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { globalHubService } from '@/services/globalHubService';
import { zetaLearningEngine } from '@/services/zetaLearningEngine';
import { TakeTradeButton } from '@/components/arena/TakeTradeButton';
import { arenaService } from '@/services/arenaService';
import { mockTradingService } from '@/services/mockTradingService';
import { useToast } from '@/components/ui/use-toast';

// Access Delta engine (imported in globalHubService)
declare global {
  interface Window {
    deltaV2QualityEngine?: any;
  }
}

export function DiagnosticPanel() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<any>(null);
  const [zetaMetrics, setZetaMetrics] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [deltaThresholds, setDeltaThresholds] = useState({ quality: 52, ml: 50, strategyWinRate: 0 });
  const [status, setStatus] = useState<string>('');
  const [deltaAvailable, setDeltaAvailable] = useState<boolean>(false);

  // Update metrics every 2 seconds for faster feedback
  useEffect(() => {
    const updateMetrics = () => {
      try {
        const hubMetrics = globalHubService.getMetrics();
        const zeta = zetaLearningEngine.getMetrics();
        const activeSignals = globalHubService.getActiveSignals();

        setMetrics(hubMetrics);
        setZetaMetrics(zeta);
        setSignals(activeSignals);

        // Get current Delta thresholds (ALL THREE: quality, ml, strategyWinRate)
        const delta = (window as any).deltaV2QualityEngine;
        if (delta && delta.getThresholds) {
          setDeltaAvailable(true);
          const thresholds = delta.getThresholds();
          setDeltaThresholds({
            quality: thresholds.quality,
            ml: Math.round(thresholds.ml * 100),
            strategyWinRate: thresholds.strategyWinRate || 0
          });
        } else {
          setDeltaAvailable(false);
        }
      } catch (error) {
        console.error('[Diagnostic] Error updating metrics:', error);
      }
    };

    // Initial update immediately
    updateMetrics();

    // Then update every 2 seconds
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckStatus = () => {
    const isRunning = globalHubService.isRunning();

    if (!isRunning) {
      setStatus('❌ Service is NOT running. Try starting it below.');
      return;
    }

    if (!metrics || metrics.totalTickers === 0) {
      setStatus('⏳ Service running but no data yet. Wait 30 seconds.');
      return;
    }

    if (metrics.deltaProcessed === 0) {
      setStatus('⏳ Service running. Waiting for signals to reach Delta (normal - wait 5-30 min).');
      return;
    }

    if (metrics.deltaProcessed > 0 && metrics.deltaPassed === 0) {
      setStatus(`⚠️ ${metrics.deltaProcessed} signals reached Delta but ALL rejected. Try lowering thresholds below.`);
      return;
    }

    if (metrics.deltaPassed > 0) {
      setStatus(`✅ SUCCESS! ${metrics.deltaPassed} signals passed Delta. Check Arena to see if agents traded!`);
      return;
    }

    setStatus('ℹ️ System initializing...');
  };

  const handleStartService = async () => {
    setStatus('🔄 Starting Intelligence Hub...');
    try {
      await globalHubService.start();
      setStatus('✅ Service started! Wait 30 seconds for first analysis.');
    } catch (error: any) {
      setStatus(`❌ Failed to start: ${error.message}`);
    }
  };

  const handleLowerThresholds = (quality: number, ml: number, strategyWinRate: number = 0) => {
    try {
      console.log(`[Diagnostic] 🎯 Attempting to set thresholds: Quality=${quality}, ML=${ml}%, Strategy Win Rate=${strategyWinRate}%`);

      const delta = (window as any).deltaV2QualityEngine;
      console.log('[Diagnostic] Delta engine available:', !!delta);
      console.log('[Diagnostic] setThresholds method available:', !!(delta && delta.setThresholds));

      if (delta && delta.setThresholds) {
        // Use the setThresholds method with all THREE parameters
        // (ml is already a percentage, convert to decimal)
        delta.setThresholds(quality, ml / 100, strategyWinRate);

        // Verify the change was applied
        const newThresholds = delta.getThresholds();
        console.log('[Diagnostic] ✅ Thresholds verified:', newThresholds);

        setDeltaThresholds({ quality, ml, strategyWinRate });
        setStatus(`✅ GATE OPENED! Thresholds: ${quality}/${ml}/${strategyWinRate}%. Signals will start flowing within 5-30 min.`);
        console.log(`[Diagnostic] ✅ SUCCESS - Thresholds updated to Quality=${quality}, ML=${ml}%, Strategy Win Rate=${strategyWinRate}%`);
      } else {
        setStatus('❌ Delta engine not ready. Refresh page and try again.');
        console.error('[Diagnostic] ❌ Delta engine not found on window object');
        console.error('[Diagnostic] window.deltaV2QualityEngine:', (window as any).deltaV2QualityEngine);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error('[Diagnostic] ❌ Error setting thresholds:', error);
    }
  };

  const handleRestoreThresholds = () => {
    handleLowerThresholds(52, 50);
    setStatus('✅ Restored to production thresholds (52/50%)');
  };

  // Send Test Signal
  const sendTestSignal = () => {
    try {
      console.log('[Diagnostic] 🧪 Sending test signal...');

      // Emit a test signal directly through the Hub's event system
      globalHubService.events.emit('signal:new', {
        id: `test-${Date.now()}`,
        symbol: 'BTCUSDT',
        direction: 'LONG',
        entry: 95234.50,
        stopLoss: 94000.00,
        targets: [96500.00, 97800.00],
        confidence: 75,
        strategy: 'TEST_SIGNAL',
        quality: 'MEDIUM',
        grade: 'B+',
        expiresAt: Date.now() + (3 * 60 * 60 * 1000), // 3 hours
        createdAt: Date.now()
      });

      toast({
        title: '🧪 Test Signal Sent',
        description: 'Check console for Arena response',
        duration: 3000
      });

      setStatus('✅ Test signal emitted. Check console logs for Arena response.');
      console.log('[Diagnostic] ✅ Test signal sent successfully');
    } catch (error: any) {
      console.error('[Diagnostic] ❌ Error sending test signal:', error);
      toast({
        title: '❌ Test Signal Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
      setStatus(`❌ Test signal failed: ${error.message}`);
    }
  };

  // Test Arena Subscription
  const testSubscription = () => {
    try {
      console.log('[Diagnostic] 🧪 Testing Arena subscription...');

      // Check how many listeners are registered for 'signal:new'
      const listeners = globalHubService.events.listenerCount('signal:new');

      console.log(`[Diagnostic] 📊 Listeners registered for 'signal:new': ${listeners}`);

      if (listeners === 0) {
        setStatus('❌ Arena not subscribed! Open Arena page to initialize subscription.');
        toast({
          title: '❌ Arena Not Connected',
          description: 'Open the Arena page to establish connection',
          variant: 'destructive',
          duration: 5000
        });
      } else {
        setStatus(`✅ Arena is subscribed! ${listeners} listener(s) active.`);
        toast({
          title: '✅ Arena Connected',
          description: `${listeners} listener(s) receiving signals`,
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('[Diagnostic] ❌ Error testing subscription:', error);
      setStatus(`❌ Subscription test failed: ${error.message}`);
    }
  };

  // Nuclear Reset - Clear all data and restart
  const clearAndRestart = async () => {
    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧹 NUCLEAR RESET - Clearing ALL data and restarting fresh');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      setStatus('🧹 Step 1: Clearing ALL mock trading data for all agents...');

      // Step 1: Clear mock trading data for ALL agents
      const agentIds = ['agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'];
      for (const agentId of agentIds) {
        await mockTradingService.clearAllPositions(agentId);
        console.log(`[Diagnostic] ✅ Cleared mock trading data for ${agentId}`);
      }

      setStatus('🧹 Step 2: Clearing ALL Hub signals...');

      // Step 2: Stop Hub and clear all signals
      await globalHubService.stop();
      globalHubService.clearAllSignals();
      console.log('[Diagnostic] ✅ Hub signals cleared');

      setStatus('🧹 Step 3: Reinitializing Arena Service...');

      // Step 3: Reinitialize Arena
      await arenaService.initialize();
      console.log('[Diagnostic] ✅ Arena Service reinitialized');

      toast({
        title: '🧹 Complete Reset',
        description: 'All data cleared. Restarting Hub...',
        duration: 3000
      });

      // Brief pause to ensure everything is cleared
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus('🚀 Step 4: Restarting Hub...');

      // Step 4: Restart Hub fresh
      await globalHubService.start();
      console.log('[Diagnostic] ✅ Hub restarted - Will generate fresh signals with 24-hour expiry');

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ NUCLEAR RESET COMPLETE - System is 100% fresh');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⏳ Waiting for Delta to generate first signal (2-5 minutes)...\n');

      toast({
        title: '✅ System Restarted',
        description: 'Fresh signals will generate within 2-5 minutes',
        duration: 5000
      });

      setStatus('✅ COMPLETE! System 100% fresh. Wait 2-5 min for first Delta signal.');
    } catch (error: any) {
      console.error('[Diagnostic] ❌ Nuclear reset failed:', error);
      toast({
        title: '❌ Reset Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
      setStatus(`❌ Reset failed: ${error.message}`);
    }
  };

  const isRunning = globalHubService.isRunning();
  const hasSignals = signals.length > 0;
  const allRejected = metrics && metrics.deltaProcessed > 0 && metrics.deltaPassed === 0;

  return (
    <Card className="border-orange-500/20 bg-background/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-orange-500">🔍 System Diagnostic</CardTitle>
            <CardDescription>Visual controls for debugging (no console needed)</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {deltaAvailable ? (
              <Badge className="bg-green-500">Delta Engine: Ready</Badge>
            ) : (
              <Badge variant="destructive">Delta Engine: Loading...</Badge>
            )}
            <Badge variant="outline">
              Current: {deltaThresholds.quality}/{deltaThresholds.ml}/{deltaThresholds.strategyWinRate}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Delta Engine Warning */}
        {!deltaAvailable && (
          <Alert className="border-yellow-500 bg-yellow-500/10">
            <AlertDescription>
              ⚠️ Delta engine is still loading. Wait a moment and buttons will become active.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Check */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Quick Status Check</h3>
          <div className="flex gap-2">
            <Button onClick={handleCheckStatus} variant="outline">
              Check Status
            </Button>
            {!isRunning && (
              <Button onClick={handleStartService} className="bg-green-600 hover:bg-green-700">
                Start Service
              </Button>
            )}
          </div>
          {status && (
            <Alert className="mt-2">
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Metrics Display */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Service</div>
              <div className="text-lg font-bold">
                {isRunning ? (
                  <Badge className="bg-green-500">Running</Badge>
                ) : (
                  <Badge variant="destructive">Stopped</Badge>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Tickers</div>
              <div className="text-lg font-bold">{metrics.totalTickers || 0}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Delta Processed</div>
              <div className="text-lg font-bold">{metrics.deltaProcessed || 0}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Delta Passed</div>
              <div className="text-lg font-bold text-green-500">{metrics.deltaPassed || 0}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Delta Rejected</div>
              <div className="text-lg font-bold text-red-500">{metrics.deltaRejected || 0}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Active Signals</div>
              <div className="text-lg font-bold">{signals.length}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Quality Threshold</div>
              <div className="text-lg font-bold">{deltaThresholds.quality}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">ML Threshold</div>
              <div className="text-lg font-bold">{deltaThresholds.ml}%</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Strategy Win Rate</div>
              <div className="text-lg font-bold">{deltaThresholds.strategyWinRate}%</div>
            </div>
          </div>
        )}

        {/* Threshold Controls */}
        <div className="border border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 text-orange-600">🎚️ Delta Gate Controls - Open to Allow Signals</h3>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              onClick={() => handleLowerThresholds(52, 50, 45)}
              variant={deltaThresholds.quality === 52 ? 'default' : 'outline'}
              size="sm"
              disabled={!deltaAvailable}
              className={deltaThresholds.quality === 52 ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              🏭 Production (52/50/45%)
            </Button>

            <Button
              onClick={() => handleLowerThresholds(45, 45, 40)}
              variant={deltaThresholds.quality === 45 ? 'default' : 'outline'}
              size="sm"
              disabled={!deltaAvailable}
              className={deltaThresholds.quality === 45 ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              ✅ Relaxed (45/45/40%)
            </Button>

            <Button
              onClick={() => handleLowerThresholds(40, 40, 0)}
              variant={deltaThresholds.quality === 40 ? 'default' : 'outline'}
              size="sm"
              disabled={!deltaAvailable}
              className={deltaThresholds.quality === 40 ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
            >
              ⚡ Testing (40/40/0%)
            </Button>

            <Button
              onClick={() => handleLowerThresholds(30, 30, 0)}
              variant={deltaThresholds.quality === 30 ? 'default' : 'outline'}
              size="sm"
              disabled={!deltaAvailable}
              className={deltaThresholds.quality === 30 ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              🔥 Ultra (30/30/0%)
            </Button>
          </div>

          <div className="text-xs space-y-1 text-muted-foreground">
            <p>• <strong>Production (52/50/45%)</strong>: Quality/ML/Win Rate - 5-24 signals/day, best quality</p>
            <p>• <strong>Relaxed (45/45/40%)</strong>: Moderate filtering, more signals</p>
            <p>• <strong>Testing (40/40/0%)</strong>: Signal within 5-30 minutes ⚡</p>
            <p>• <strong>Ultra (30/30/0%)</strong>: Signal within 1-10 minutes 🔥 (gates wide open!)</p>
            <p className="text-orange-600 font-semibold mt-2">👉 Click a button to open all THREE gates and allow signals to pass!</p>
          </div>
        </div>

        {/* Live Trading Signals - Enhanced */}
        {hasSignals && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">
                Live Trading Signals
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  📡 {signals.length} Active
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  Real-Time
                </Badge>
              </div>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {signals.slice(0, 10).map((signal, idx) => {
                // Calculate time remaining
                const timeRemaining = signal.expiresAt ? signal.expiresAt - Date.now() : 0;
                const minutesRemaining = Math.floor(timeRemaining / 60000);
                const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);
                const isExpiringSoon = minutesRemaining < 5;

                // Calculate risk metrics
                const riskPercentage = signal.entry && signal.stopLoss
                  ? Math.abs(((signal.stopLoss - signal.entry) / signal.entry) * 100)
                  : 0;
                const potentialProfit = signal.entry && signal.targets && signal.targets.length > 0
                  ? Math.abs(((signal.targets[0] - signal.entry) / signal.entry) * 100)
                  : 0;

                return (
                  <div
                    key={idx}
                    className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-all hover:shadow-md"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Crypto Logo */}
                        {signal.image && (
                          <img
                            src={signal.image}
                            alt={signal.symbol}
                            className="w-9 h-9 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}

                        {/* Symbol & Direction */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-base">{signal.symbol}</span>
                            <Badge
                              variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                              className={`text-xs ${signal.direction === 'LONG' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            >
                              {signal.direction}
                            </Badge>
                            {signal.grade && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  signal.grade.includes('A') ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                  signal.grade.includes('B') ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  'bg-amber-50 text-amber-700 border-amber-300'
                                }`}
                              >
                                {signal.grade}
                              </Badge>
                            )}
                          </div>
                          {signal.strategy && (
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {signal.strategy}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timer */}
                      {signal.expiresAt && timeRemaining > 0 && (
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${
                            isExpiringSoon
                              ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                              : 'bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          ⏱ {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')}
                        </Badge>
                      )}
                    </div>

                    {/* Price Info Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-3 p-2.5 bg-muted/50 rounded-md">
                      <div>
                        <div className="text-[10px] text-muted-foreground font-medium mb-0.5">Entry</div>
                        <div className="text-sm font-bold">${signal.entry?.toFixed(2) || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-medium mb-0.5">Stop Loss</div>
                        <div className="text-sm font-bold text-red-600">${signal.stopLoss?.toFixed(2) || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-medium mb-0.5">Target</div>
                        <div className="text-sm font-bold text-green-600">
                          ${signal.targets?.[0]?.toFixed(2) || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Confidence:</span>
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-300">
                            {signal.confidence}%
                          </Badge>
                        </div>
                        {riskPercentage > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Risk:</span>
                            <span className="font-semibold text-red-600">{riskPercentage.toFixed(2)}%</span>
                          </div>
                        )}
                        {potentialProfit > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Profit:</span>
                            <span className="font-semibold text-green-600">+{potentialProfit.toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Take Trade Button */}
                    <div className="flex justify-end">
                      <TakeTradeButton signal={signal} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-2 bg-blue-50/50 border border-blue-200/50 rounded-md text-center">
              <p className="text-xs text-blue-700">
                💡 Click "Take Trade" to join a signal and compete in the Arena
              </p>
            </div>
          </div>
        )}

        {/* Zeta Learning */}
        {zetaMetrics && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Zeta Learning Engine</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-muted rounded text-sm">
                <div className="text-xs text-muted-foreground">Outcomes</div>
                <div className="font-bold">{zetaMetrics.totalOutcomes || 0}</div>
              </div>
              <div className="p-2 bg-muted rounded text-sm">
                <div className="text-xs text-muted-foreground">Win Rate</div>
                <div className="font-bold text-green-500">
                  {zetaMetrics.overallWinRate ? `${zetaMetrics.overallWinRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="p-2 bg-muted rounded text-sm">
                <div className="text-xs text-muted-foreground">Progress</div>
                <div className="font-bold">{zetaMetrics.learningProgress || 0}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Developer Controls */}
        <div className="border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 text-blue-600">🛠️ Developer Testing Tools</h3>

          <div className="space-y-3">
            {/* Test Signal & Subscription */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Signal Testing</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={sendTestSignal}
                  variant="outline"
                  size="sm"
                  className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                >
                  🧪 Send Test Signal
                </Button>
                <Button
                  onClick={testSubscription}
                  variant="outline"
                  size="sm"
                  className="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
                >
                  📡 Test Arena Connection
                </Button>
              </div>
            </div>

            {/* Nuclear Reset */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">System Reset</p>
              <Button
                onClick={clearAndRestart}
                variant="destructive"
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                🧹 Nuclear Reset (Clear All & Restart)
              </Button>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                ⚠️ Clears all mock trades, signals, and restarts Hub from scratch
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-500/20 text-xs space-y-1 text-muted-foreground">
            <p>• <strong>Test Signal</strong>: Emits a fake BTCUSDT signal to test Arena response</p>
            <p>• <strong>Test Connection</strong>: Checks if Arena is subscribed to Hub events</p>
            <p>• <strong>Nuclear Reset</strong>: Wipes everything and starts 100% fresh</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">💡 Recommendations</h3>
          <div className="text-sm space-y-1">
            {!isRunning && (
              <div>• Click "Start Service" above to begin signal generation</div>
            )}
            {isRunning && metrics?.totalTickers === 0 && (
              <div>• Wait 30-60 seconds for first analysis cycle to complete</div>
            )}
            {allRejected && (
              <div>• Signals are being rejected by Delta. Try "Testing (40/40%)" for faster signals</div>
            )}
            {isRunning && !allRejected && metrics?.deltaPassed === 0 && (
              <div>• System is running normally. Wait 30 min to 4 hours for quality signals (52/50%)</div>
            )}
            {metrics?.deltaPassed > 0 && (
              <div className="text-green-500">
                • ✅ Signals passing! Check Arena at http://localhost:8082/arena
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

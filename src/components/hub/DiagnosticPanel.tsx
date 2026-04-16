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
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="mb-6">
      {/* Slim Summary Bar — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
            <Settings2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700">System Controls</span>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Running
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-full text-[10px] font-bold text-rose-700">Stopped</span>
            )}
            <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full text-[10px] font-bold text-orange-700">
              Delta {deltaThresholds.quality}/{deltaThresholds.ml}/{deltaThresholds.strategyWinRate}%
            </span>
            {deltaAvailable ? (
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-700">Engine Ready</span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">Loading…</span>
            )}
            {signals.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[10px] font-bold text-blue-700">
                {signals.length} Active
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden animate-in slide-in-from-top duration-200">
          <div className="p-5 space-y-4">
            {/* Status + Delta Warning */}
            {!deltaAvailable && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertDescription className="text-amber-800 text-xs">
                  ⏳ Delta engine is loading. Buttons will activate momentarily.
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button onClick={handleCheckStatus} variant="outline" size="sm" className="text-xs">
                  Check Status
                </Button>
                {!isRunning && (
                  <Button onClick={handleStartService} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                    Start Service
                  </Button>
                )}
              </div>
              {status && (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  {status}
                </div>
              )}
            </div>

            {/* Compact Metrics */}
            {metrics && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Tickers', value: metrics.totalTickers || 0 },
                  { label: 'Δ Processed', value: metrics.deltaProcessed || 0 },
                  { label: 'Δ Passed', value: metrics.deltaPassed || 0, color: 'text-emerald-600' },
                  { label: 'Δ Rejected', value: metrics.deltaRejected || 0, color: 'text-rose-600' },
                  { label: 'Active', value: signals.length },
                ].map(m => (
                  <div key={m.label} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-medium">{m.label}</div>
                    <div className={`text-base font-bold ${(m as any).color || 'text-slate-800'}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Delta Gate Presets */}
            <div className="border border-orange-200 bg-gradient-to-r from-orange-50/80 to-amber-50/50 rounded-xl p-4">
              <h3 className="text-xs font-bold text-orange-700 mb-2.5 uppercase tracking-wide">Delta Gate Presets</h3>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  onClick={() => handleLowerThresholds(52, 50, 45)}
                  variant={deltaThresholds.quality === 52 ? 'default' : 'outline'}
                  size="sm"
                  disabled={!deltaAvailable}
                  className={`text-xs ${deltaThresholds.quality === 52 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  Production
                </Button>
                <Button
                  onClick={() => handleLowerThresholds(45, 45, 40)}
                  variant={deltaThresholds.quality === 45 ? 'default' : 'outline'}
                  size="sm"
                  disabled={!deltaAvailable}
                  className={`text-xs ${deltaThresholds.quality === 45 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  Relaxed
                </Button>
                <Button
                  onClick={() => handleLowerThresholds(40, 40, 0)}
                  variant={deltaThresholds.quality === 40 ? 'default' : 'outline'}
                  size="sm"
                  disabled={!deltaAvailable}
                  className={`text-xs ${deltaThresholds.quality === 40 ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                >
                  Testing
                </Button>
                <Button
                  onClick={() => handleLowerThresholds(30, 30, 0)}
                  variant={deltaThresholds.quality === 30 ? 'default' : 'outline'}
                  size="sm"
                  disabled={!deltaAvailable}
                  className={`text-xs ${deltaThresholds.quality === 30 ? 'bg-rose-600 hover:bg-rose-700' : ''}`}
                >
                  Ultra
                </Button>
              </div>
            </div>

            {/* Dev Tools — Compact Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={sendTestSignal} variant="outline" size="sm" className="text-xs h-8">
                🧪 Test Signal
              </Button>
              <Button onClick={testSubscription} variant="outline" size="sm" className="text-xs h-8">
                📡 Test Connection
              </Button>
              <Button onClick={clearAndRestart} variant="destructive" size="sm" className="text-xs h-8">
                🧹 Nuclear Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

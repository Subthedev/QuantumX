/**
 * IGX Intelligence Hub - Clean, Minimalistic UI
 * Production-grade trading signal dashboard
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/AppHeader';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Circle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { realTimeMonitoringService } from '@/services/realTimeMonitoringService';
import type { SignalRecord } from '@/services/igx/IGXSystemOrchestrator';
import { igxSystem } from '@/services/igx/IGXSystemOrchestrator';
import { igxDataEngineV4 } from '@/services/igx/IGXDataEngineV4';

interface SystemStatus {
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  uptime: number;
  components: {
    dataPipeline: boolean;
    alphaModel: boolean;
    betaModel: boolean;
    qualityChecker: boolean;
  };
  performance: {
    monthlyProfit: string;
    targetProfit: string;
    winRate: string;
    totalSignals: number;
    activePositions: number;
    todaySignals: number;
  };
  health: {
    dataQuality: number;
    exchangesConnected: number;
    latency: number;
  };
}

export default function IntelligenceHubAuto() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeSignals, setActiveSignals] = useState<SignalRecord[]>([]);
  const [recentSignals, setRecentSignals] = useState<SignalRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Auto-start the IGX system
    const startSystem = async () => {
      // Check if system is already running
      const status = realTimeMonitoringService.getStatus();

      if (!status.isRunning && !isStarting) {
        setIsStarting(true);
        console.log('[IntelligenceHub] Auto-starting IGX system...');

        try {
          // Start monitoring with default coins
          await realTimeMonitoringService.start({
            coinGeckoIds: [
              'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano',
              'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'shiba-inu',
              'polygon', 'litecoin', 'uniswap', 'cosmos', 'chainlink',
              'ethereum-classic', 'stellar', 'bitcoin-cash', 'algorand', 'vechain',
              'filecoin', 'internet-computer', 'decentraland', 'the-sandbox', 'axie-infinity',
              'theta-network', 'fantom', 'hedera', 'near', 'the-graph',
              'enjincoin', 'chiliz', 'sushi', 'yearn-finance', 'aave',
              'compound', 'synthetix-network-token', 'curve-dao-token', 'maker', 'injective-protocol'
            ],
            enableHealthMonitoring: true,
            healthMonitoringInterval: 30000
          });

          setIsRunning(true);
          updateData();
          console.log('[IntelligenceHub] ✅ IGX system started successfully');
        } catch (error) {
          console.error('[IntelligenceHub] Failed to start IGX system:', error);
        } finally {
          setIsStarting(false);
        }
      } else if (status.isRunning) {
        setIsRunning(true);
        updateData();
      }
    };

    startSystem();

    // Listen for updates
    const handleUpdate = () => updateData();
    window.addEventListener('igx-health-update', handleUpdate);
    window.addEventListener('igx-new-signal', handleUpdate);

    // Refresh every 3 seconds
    const interval = setInterval(() => {
      if (realTimeMonitoringService.isActive()) {
        updateData();
      }
    }, 3000);

    return () => {
      window.removeEventListener('igx-health-update', handleUpdate);
      window.removeEventListener('igx-new-signal', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const updateData = () => {
    const status = igxSystem.getSystemStatus();

    // Get actual data sources from Data Engine V4
    const engineStats = igxDataEngineV4.getStats();
    if (engineStats && status?.health) {
      status.health.exchangesConnected = engineStats.sourcesActive || 0;
      status.health.dataQuality = engineStats.dataQuality || 0;
      status.health.latency = engineStats.averageLatency || 0;
    }

    setSystemStatus(status);
    setActiveSignals(igxSystem.getActiveSignals());
    setRecentSignals(igxSystem.getSignals().slice(0, 8));
  };

  // Parse monthly profit
  const monthlyProfit = systemStatus
    ? parseFloat(systemStatus.performance.monthlyProfit.replace('%', ''))
    : 0;
  const targetProfit = 25;
  const progress = Math.min((monthlyProfit / targetProfit) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AppHeader />

      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-1 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Intelligence Hub
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-lg ml-4">
                AI-powered trading signals with 25% monthly target
              </p>
            </div>
            <a
              href="/pipeline-monitor"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Pipeline Monitor
            </a>
          </div>
        </div>

        {isStarting ? (
          /* System Starting State */
          <Card className="p-12 text-center border-dashed border-2">
            <div className="max-w-md mx-auto">
              <Activity className="h-16 w-16 mx-auto mb-4 text-orange-500 animate-pulse" />
              <h3 className="text-xl font-semibold mb-2">Starting IGX System</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Initializing 8+ exchanges, loading OHLC data, and starting 4 AI engines...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                <span>This may take 10-15 seconds</span>
              </div>
            </div>
          </Card>
        ) : !isRunning ? (
          /* System Not Running State */
          <Card className="p-12 text-center border-dashed border-2">
            <div className="max-w-md mx-auto">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold mb-2">System Inactive</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Refresh the page to start the IGX system
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Monthly Performance - Hero Section */}
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-orange-600 to-red-700 text-white">
              <div className="absolute inset-0 bg-grid-white/10" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Monthly Performance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold">
                        {monthlyProfit >= 0 ? '+' : ''}{monthlyProfit.toFixed(1)}%
                      </span>
                      <span className="text-2xl text-blue-100">/ {targetProfit}%</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
                      <Circle className={`h-2 w-2 ${systemStatus?.status === 'RUNNING' ? 'fill-green-400 text-green-400 animate-pulse' : 'fill-slate-400 text-slate-400'}`} />
                      {systemStatus?.status === 'RUNNING' ? 'Live' : 'Offline'}
                    </div>
                    <div className="text-3xl font-bold">
                      {systemStatus?.performance.winRate || '0%'}
                    </div>
                    <div className="text-blue-100 text-sm">Win Rate</div>
                  </div>
                </div>

                <Progress value={progress} className="h-2 bg-white/20" />

                <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/20">
                  <div>
                    <div className="text-3xl font-bold">{systemStatus?.performance.totalSignals || 0}</div>
                    <div className="text-blue-100 text-sm">Total Signals</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-300">{systemStatus?.performance.activePositions || 0}</div>
                    <div className="text-blue-100 text-sm">Active Now</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{systemStatus?.performance.todaySignals || 0}</div>
                    <div className="text-blue-100 text-sm">Today</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* System Health - Minimal Indicators */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 border-0 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data Sources</p>
                    <p className="text-2xl font-bold">{systemStatus?.health.exchangesConnected || 0}/8</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-4 border-0 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data Quality</p>
                    <p className="text-2xl font-bold">{systemStatus?.health.dataQuality || 0}<span className="text-sm text-slate-500">/100</span></p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-4 border-0 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Latency</p>
                    <p className="text-2xl font-bold">{systemStatus?.health.latency || 0}<span className="text-sm text-slate-500">ms</span></p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* Active Signals */}
            {activeSignals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                  <h2 className="text-xl font-semibold">Active Signals</h2>
                  <Badge variant="secondary" className="ml-auto">{activeSignals.length} Active</Badge>
                </div>

                <div className="space-y-3">
                  {activeSignals.map((record) => {
                    const signal = record.signal;
                    const isLong = signal.direction === 'LONG';

                    return (
                      <Card key={signal.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isLong ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                              {isLong ? (
                                <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
                              ) : (
                                <ArrowDownRight className="h-6 w-6 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">{signal.symbol}</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{signal.winningStrategy}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold">{signal.confidence}%</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Confidence</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Entry</p>
                            <p className="font-semibold">${signal.entryPrice.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Target</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              ${signal.targets[0].toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stop Loss</p>
                            <p className="font-semibold text-red-600 dark:text-red-400">
                              ${signal.stopLoss.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Risk/Reward</p>
                            <p className="font-semibold">{signal.riskRewardRatio.toFixed(1)}:1</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Expected: +{signal.expectedProfit.toFixed(1)}%</span>
                          <span>Quality: {signal.qualityScore}/100</span>
                          <span>{new Date(record.executedAt).toLocaleTimeString()}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent History */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Signals</h2>

              {recentSignals.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600 animate-pulse" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Analyzing market conditions...
                  </p>
                </Card>
              ) : (
                <div className="grid gap-2">
                  {recentSignals.map((record) => {
                    const signal = record.signal;
                    const isActive = record.status === 'ACTIVE';
                    const isSuccess = record.outcome?.success;
                    const profit = record.outcome?.profit || 0;

                    return (
                      <Card key={signal.id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              isActive ? 'bg-blue-100 dark:bg-blue-900/20' :
                              isSuccess ? 'bg-green-100 dark:bg-green-900/20' :
                              'bg-red-100 dark:bg-red-900/20'
                            }`}>
                              {isActive ? (
                                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              ) : isSuccess ? (
                                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{signal.symbol}</span>
                                <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'} className="text-xs">
                                  {signal.direction}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {signal.winningStrategy} • {signal.confidence}%
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {isActive ? (
                              <Badge variant="secondary">Active</Badge>
                            ) : (
                              <div>
                                <div className={`text-lg font-bold ${
                                  profit >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {profit >= 0 ? '+' : ''}{profit.toFixed(2)}%
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(record.executedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

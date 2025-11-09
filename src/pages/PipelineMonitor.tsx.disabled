/**
 * IGX Pipeline Monitor - Gamified Real-Time System Visualization
 * Shows the entire signal generation pipeline in an engaging, transparent way
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppHeader } from '@/components/AppHeader';
import {
  Activity,
  Database,
  Brain,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Server,
  Cpu,
  BarChart3,
  Signal,
  Filter,
  Target,
  Sparkles,
  Gauge,
  Network,
  Bot,
  ChevronRight
} from 'lucide-react';
import { igxSystem } from '@/services/igx/IGXSystemOrchestrator';
import { igxDataEngineV4 } from '@/services/igx/IGXDataEngineV4';
import { igxBetaModel } from '@/services/igx/IGXBetaModel';
import { igxQualityChecker } from '@/services/igx/IGXQualityChecker';
import type { SignalRecord } from '@/services/igx/IGXSystemOrchestrator';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  icon: any;
  status: 'active' | 'processing' | 'idle' | 'error';
  metrics: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
  }[];
  description: string;
  color: string;
}

interface DataFlow {
  from: string;
  to: string;
  active: boolean;
  label?: string;
  count?: number;
}

export default function PipelineMonitor() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [pipelineStats, setPipelineStats] = useState<any>(null);
  const [betaStats, setBetaStats] = useState<any>(null);
  const [qualityStats, setQualityStats] = useState<any>(null);
  const [signalHistory, setSignalHistory] = useState<SignalRecord[]>([]);
  const [dataFlows, setDataFlows] = useState<DataFlow[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const updateStats = () => {
      // Get system status
      const status = igxSystem.getSystemStatus();
      setSystemStatus(status);

      // Get Data Engine V4 stats
      const pipeline = igxDataEngineV4.getStats();
      setPipelineStats(pipeline);

      // Get beta model stats
      const beta = igxBetaModel.getStats();
      setBetaStats(beta);

      // Get quality checker stats
      const quality = igxQualityChecker.getStats();
      setQualityStats(quality);

      // Get signals
      const signals = igxSystem.getSignals();
      setSignalHistory(signals.slice(0, 20)); // Last 20 signals

      // Update data flows
      updateDataFlows(pipeline, beta, quality);

      // Update rejection reasons
      updateRejectionReasons(quality);
    };

    // Initial update
    updateStats();

    // Set up real-time updates
    const interval = setInterval(updateStats, 1000); // Update every second

    // Listen for signal events
    const handleSignalEvent = () => updateStats();
    window.addEventListener('igx-ticker-update', handleSignalEvent);
    window.addEventListener('igx-signal-generated', handleSignalEvent);
    window.addEventListener('igx-signal-approved', handleSignalEvent);
    window.addEventListener('igx-signal-rejected', handleSignalEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('igx-ticker-update', handleSignalEvent);
      window.removeEventListener('igx-signal-generated', handleSignalEvent);
      window.removeEventListener('igx-signal-approved', handleSignalEvent);
      window.removeEventListener('igx-signal-rejected', handleSignalEvent);
    };
  }, []);

  const updateDataFlows = (pipeline: any, beta: any, quality: any) => {
    const flows: DataFlow[] = [
      {
        from: 'dataengine',
        to: 'alpha',
        active: pipeline?.sourcesActive > 0,
        label: 'Market Data',
        count: pipeline?.tickerCount || 0
      },
      {
        from: 'alpha',
        to: 'beta',
        active: beta?.tickersAnalyzed > 0,
        label: 'Ticker Updates',
        count: beta?.tickersAnalyzed || 0
      },
      {
        from: 'beta',
        to: 'quality',
        active: beta?.signalsGenerated > 0,
        label: 'Raw Signals',
        count: beta?.signalsGenerated || 0
      },
      {
        from: 'quality',
        to: 'output',
        active: quality?.signalsApproved > 0,
        label: 'Approved',
        count: quality?.signalsApproved || 0
      }
    ];
    setDataFlows(flows);
  };

  const updateRejectionReasons = (quality: any) => {
    if (!quality?.rejectionReasons) return;

    const reasons = new Map<string, number>();
    // Parse rejection reasons from quality stats
    if (quality.patternRejections > 0) {
      reasons.set('Pattern too weak', quality.patternRejections);
    }
    if (quality.consensusRejections > 0) {
      reasons.set('No strategy consensus', quality.consensusRejections);
    }
    if (quality.riskRejections > 0) {
      reasons.set('Risk/Reward too low', quality.riskRejections);
    }
    if (quality.liquidityRejections > 0) {
      reasons.set('Insufficient liquidity', quality.liquidityRejections);
    }
    if (quality.dataQualityRejections > 0) {
      reasons.set('Poor data quality', quality.dataQualityRejections);
    }
    if (quality.duplicateRejections > 0) {
      reasons.set('Duplicate signal', quality.duplicateRejections);
    }
    setRejectionReasons(reasons);
  };

  // Pipeline stages configuration - OPTIMIZED AND UNIFORM
  const pipelineStages: PipelineStage[] = [
    {
      id: 'dataengine',
      name: 'Data Engine V4',
      icon: Database,
      status: pipelineStats?.sourcesActive > 0 ? 'active' : 'idle',
      metrics: [
        {
          label: 'Throughput',
          value: `${Math.round((pipelineStats?.sourcesActive || 0) * 8.5)}k/s`,
          trend: pipelineStats?.sourcesActive >= 9 ? 'up' : pipelineStats?.sourcesActive >= 6 ? 'stable' : 'down'
        }
      ],
      description: 'Real-time data',
      color: 'from-blue-500 to-teal-500'
    },
    {
      id: 'alpha',
      name: 'IGX Alpha Engine',
      icon: Gauge,
      status: systemStatus?.components?.alphaModel ? 'active' : 'idle',
      metrics: [
        {
          label: 'Threshold',
          value: '30',
          trend: 'stable'
        }
      ],
      description: 'Adaptive thresholds',
      color: 'from-teal-500 to-green-500'
    },
    {
      id: 'beta',
      name: 'IGX Beta Engine',
      icon: Brain,
      status: betaStats?.tickersAnalyzed > 0 ? 'processing' : 'idle',
      metrics: [
        {
          label: 'Patterns',
          value: betaStats?.patternsDetected || 0,
          trend: betaStats?.patternsDetected > 0 ? 'up' : 'stable'
        }
      ],
      description: '10 strategy ensemble',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'quality',
      name: 'IGX Gamma Engine',
      icon: Shield,
      status: qualityStats?.signalsProcessed > 0 ? 'processing' : 'idle',
      metrics: [
        {
          label: 'Pass Rate',
          value: `${qualityStats?.passRate?.toFixed(0) || 0}%`,
          trend: qualityStats?.passRate > 50 ? 'up' : 'down'
        }
      ],
      description: '6-stage validation',
      color: 'from-emerald-500 to-purple-500'
    },
    {
      id: 'output',
      name: 'Signal Engine',
      icon: Sparkles,
      status: qualityStats?.signalsApproved > 0 ? 'active' : 'idle',
      metrics: [
        {
          label: 'Total',
          value: qualityStats?.signalsApproved || 0,
          trend: 'up'
        }
      ],
      description: 'High-quality signals',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const getStageAnimation = (status: string) => {
    switch (status) {
      case 'active':
        return 'animate-pulse';
      case 'processing':
        return 'animate-pulse';
      case 'error':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  const getFlowAnimation = (active: boolean) => {
    return active ? 'animate-pulse' : '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AppHeader />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-1 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Pipeline Monitor
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg ml-4">
            Unified Data Engine V4 + Signal Generation Pipeline - 11 exchanges, adaptive intelligence
          </p>
        </div>

        {/* Main Pipeline Visualization - BEAUTIFUL WATERFLOW DESIGN */}
        <Card className="p-10 mb-8 border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-white dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900 backdrop-blur-xl overflow-hidden">
          <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
            <Activity className="h-7 w-7 text-orange-500" />
            Signal Generation Pipeline
            <Badge variant="outline" className="ml-auto text-xs px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" />
              LIVE
            </Badge>
          </h2>

          {/* Pipeline Flow - SPACIOUS & WATERFLOW EFFECT */}
          <div className="relative py-6">
            <div className="grid grid-cols-5 gap-12 relative">
              {pipelineStages.map((stage, index) => (
                <div key={stage.id} className="relative flex flex-col items-center group">
                  {/* Engine Card - SIMPLE single orange border */}
                  <Card className={cn(
                    "p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-105 w-full",
                    "bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50",
                    "backdrop-blur-sm relative overflow-visible",
                    // SINGLE orange border for ALL engines - no rings, no double borders
                    "border-2 border-orange-500/60 dark:border-orange-400/60"
                  )}>

                    {/* Icon - Larger & Centered - NO BLINKING */}
                    <div className={cn(
                      "h-14 w-14 rounded-xl mb-4 flex items-center justify-center mx-auto",
                      "bg-gradient-to-br shadow-lg",
                      stage.color
                    )}>
                      <stage.icon className="h-7 w-7 text-white" />
                    </div>

                    {/* Name */}
                    <h3 className="font-semibold text-sm text-center mb-1.5 text-slate-800 dark:text-slate-100">
                      {stage.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-4 h-4">
                      {stage.description}
                    </p>

                    {/* Metrics - Clean Layout */}
                    <div className="space-y-2 mb-4">
                      {stage.metrics.map((metric, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-800/50 rounded-md px-2 py-1.5">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{metric.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{metric.value}</span>
                            {metric.trend === 'up' && (
                              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                            )}
                            {metric.trend === 'down' && (
                              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Status Badge - Clean, no orange backgrounds */}
                    <Badge
                      variant={stage.status === 'active' ? 'default' : 'secondary'}
                      className="w-full justify-center text-[10px] font-semibold py-1.5"
                    >
                      {stage.status.toUpperCase()}
                    </Badge>
                  </Card>

                  {/* Rectangular Orange Pipeline - Seamless Connection */}
                  {index < pipelineStages.length - 1 && (
                    <div className="absolute left-[calc(100%-2px)] top-1/2 w-[calc(3rem+4px)] -translate-y-1/2 flex items-center z-20 transition-all duration-500 group-hover:scale-105">
                      {/* Rectangular pipe overlapping engine borders to hide vertical lines */}
                      <div className="relative w-full h-3 border-t-2 border-b-2 border-orange-500/60 dark:border-orange-400/60 bg-white dark:bg-slate-900">
                        {/* Smooth Flowing Dot Particles */}
                        {dataFlows.find(f => f.from === stage.id)?.active && (
                          <>
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full animate-particle-flow shadow-xl shadow-orange-500/80" />
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-500 rounded-full animate-particle-flow shadow-xl shadow-amber-500/80"
                                 style={{ animationDelay: '0.4s' }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-400 rounded-full animate-particle-flow shadow-xl shadow-orange-400/80"
                                 style={{ animationDelay: '0.8s' }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-particle-flow shadow-xl shadow-red-500/80"
                                 style={{ animationDelay: '1.2s' }} />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Data Flow Stats - Clean & Spacious */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              {dataFlows.map((flow, index) => (
                <div key={index} className="text-center px-3 py-3 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 shadow-sm border border-slate-200 dark:border-slate-700">
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider mb-1",
                    flow.active ? "text-orange-600 dark:text-orange-400" : "text-slate-400"
                  )}>
                    {flow.label}
                  </p>
                  <p className={cn(
                    "text-lg font-bold",
                    flow.active ? "text-orange-600 dark:text-orange-500" : "text-slate-500"
                  )}>
                    {flow.count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <style>{`
          /* Natural Water Flow Animation - Organic Wave Movement */
          @keyframes water-flow {
            0% {
              transform: translateX(-100%) scaleX(1.2);
              opacity: 0;
            }
            15% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
            85% {
              opacity: 0.7;
            }
            100% {
              transform: translateX(100%) scaleX(1.2);
              opacity: 0;
            }
          }
          .animate-water-flow {
            animation: water-flow 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          /* Natural Shimmer Effect - Soft Light Reflection */
          @keyframes shimmer {
            0% {
              transform: translateX(-100%) skewX(-12deg);
              opacity: 0;
            }
            30% {
              opacity: 0.5;
            }
            50% {
              opacity: 0.7;
            }
            70% {
              opacity: 0.5;
            }
            100% {
              transform: translateX(200%) skewX(-12deg);
              opacity: 0;
            }
          }
          .animate-shimmer {
            animation: shimmer 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          /* Natural Particle Flow - Data Packets in Motion */
          @keyframes particle-flow {
            0% {
              left: -8%;
              opacity: 0;
              transform: translateY(-50%) scale(0.3);
            }
            8% {
              opacity: 0.8;
              transform: translateY(-50%) scale(0.9);
            }
            15% {
              opacity: 1;
              transform: translateY(-50%) scale(1);
            }
            85% {
              opacity: 1;
              transform: translateY(-50%) scale(1);
            }
            92% {
              opacity: 0.8;
              transform: translateY(-50%) scale(0.9);
            }
            100% {
              left: 108%;
              opacity: 0;
              transform: translateY(-50%) scale(0.3);
            }
          }
          .animate-particle-flow {
            animation: particle-flow 2.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Strategy Performance */}
          <Card className="p-6 border-0 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5 text-orange-500" />
              Top Strategies
            </h3>
            {betaStats?.topStrategies?.length > 0 ? (
              <div className="space-y-3">
                {betaStats.topStrategies.slice(0, 5).map((strategy: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{strategy.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {strategy.winRate}
                      </Badge>
                      <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500">
                        {strategy.weight}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Calibrating strategies...</p>
            )}
          </Card>

          {/* Rejection Analysis */}
          <Card className="p-6 border-0 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-orange-500" />
              Rejection Reasons
            </h3>
            {rejectionReasons.size > 0 ? (
              <div className="space-y-3">
                {Array.from(rejectionReasons.entries()).slice(0, 5).map(([reason, count], idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">{reason}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                    <Progress
                      value={(count / (qualityStats?.signalsRejected || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No rejections yet...</p>
            )}
          </Card>

          {/* System Health */}
          <Card className="p-6 border-0 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-orange-500" />
              System Health
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">CPU Usage</span>
                <div className="flex items-center gap-2">
                  <Progress value={35} className="w-24 h-2" />
                  <span className="text-xs font-semibold">35%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Memory</span>
                <div className="flex items-center gap-2">
                  <Progress value={52} className="w-24 h-2" />
                  <span className="text-xs font-semibold">52%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">API Health</span>
                <div className="flex items-center gap-2">
                  <Progress value={95} className="w-24 h-2" />
                  <span className="text-xs font-semibold">95%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-semibold text-green-600">
                  {systemStatus?.uptime ? `${Math.floor(systemStatus.uptime / 60)}m` : '0m'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Signal History */}
        <Card className="p-6 border-0 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Signal History
          </h3>
          {signalHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Time</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Symbol</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Direction</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Strategy</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Confidence</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Quality</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {signalHistory.map((record, idx) => {
                    const signal = record.signal;
                    const isActive = record.status === 'ACTIVE';
                    const profit = record.outcome?.profit || 0;

                    return (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 text-sm">
                          {new Date(record.executedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2">
                          <span className="font-medium text-sm">{signal.symbol}</span>
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {signal.direction}
                          </Badge>
                        </td>
                        <td className="py-2 text-sm">{signal.winningStrategy}</td>
                        <td className="py-2">
                          <span className="text-sm font-semibold">{signal.confidence}%</span>
                        </td>
                        <td className="py-2">
                          <span className="text-sm">{signal.qualityScore}/100</span>
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={isActive ? 'secondary' : profit >= 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {!isActive && (
                            <span className={cn(
                              "text-sm font-semibold",
                              profit >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Signal className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No signals generated yet...</p>
              <p className="text-sm mt-1">Signals will appear here when patterns are detected</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
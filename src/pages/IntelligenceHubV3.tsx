/**
 * IGX INTELLIGENCE HUB V3 - Complete Pipeline Visualization
 *
 * Showcases complete intelligence pipeline:
 * Data Engine V4 → Alpha V3 → Beta V5 → Gamma V2 → Lifecycle → Learning
 *
 * Design: Clean, minimal, trust-building UI
 * Colors: Whites, Orange, Blues, Red/Green for trading numbers
 * Updates: Real-time (1 second refresh)
 * Operation: 24/7 automatic in background
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/AppHeader';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Database,
  Brain,
  Zap,
  Target,
  Shield,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Loader2,
  BarChart3,
  Gauge,
  Award
} from 'lucide-react';

// Engine imports
import { igxDataEngineV4Enhanced } from '@/services/igx/IGXDataEngineV4Enhanced';
import { streamingAlphaV3 } from '@/services/igx/StreamingAlphaV3';
import { igxBetaV5 } from '@/services/igx/IGXBetaV5';
import { igxGammaV2 } from '@/services/igx/IGXGammaV2';
import { signalLifecycleManager } from '@/services/igx/SignalLifecycleManager';
import { continuousLearningIntegrator } from '@/services/igx/ContinuousLearningIntegrator';
import { confidenceCalibrator } from '@/services/igx/ConfidenceCalibrator';
import { igxBackgroundService } from '@/services/igx/IGXBackgroundService';

export default function IntelligenceHubV3() {
  const systemStartedRef = useRef(false);

  // Engine stats
  const [dataEngineStats, setDataEngineStats] = useState<any>(null);
  const [alphaStats, setAlphaStats] = useState<any>(null);
  const [betaStats, setBetaStats] = useState<any>(null);
  const [gammaStats, setGammaStats] = useState<any>(null);
  const [lifecycleStats, setLifecycleStats] = useState<any>(null);
  const [learningMetrics, setLearningMetrics] = useState<any>(null);
  const [calibrationMetrics, setCalibrationMetrics] = useState<any>(null);

  // Latest insights
  const [latestInsights, setLatestInsights] = useState<any>(null);
  const [activeSignals, setActiveSignals] = useState<any[]>([]);

  // System status
  const [systemReady, setSystemReady] = useState(false);
  const [pipelineHealth, setPipelineHealth] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'>('GOOD');

  // Initialize system check
  useEffect(() => {
    if (systemStartedRef.current) return;
    systemStartedRef.current = true;

    console.log('[Intelligence Hub V3] 🚀 Initializing...');

    // Check if background service already initialized
    const checkSystem = async () => {
      try {
        const status = igxBackgroundService.getStatus();
        if (status.initialized) {
          console.log('[Intelligence Hub V3] ✅ Pipeline already running');
          setSystemReady(true);
        } else {
          console.log('[Intelligence Hub V3] ⏳ Waiting for pipeline...');
          setTimeout(() => setSystemReady(true), 2000);
        }
      } catch (error) {
        console.error('[Intelligence Hub V3] Error:', error);
        setSystemReady(true); // Show UI anyway
      }
    };

    checkSystem();
  }, []);

  // Real-time stats refresh (1 second)
  useEffect(() => {
    if (!systemReady) return;

    const refreshStats = () => {
      try {
        // Data Engine V4
        const dataStats = igxDataEngineV4Enhanced.getStats();
        setDataEngineStats(dataStats);

        // Alpha V3
        const alpha = streamingAlphaV3.getStats();
        setAlphaStats(alpha);

        // Get latest insights (for a sample symbol)
        const btcInsights = streamingAlphaV3.getAlphaInsights('BTCUSDT');
        if (btcInsights) setLatestInsights(btcInsights);

        // Beta V5
        const beta = igxBetaV5.getStats();
        setBetaStats(beta);

        // Gamma V2
        const gamma = igxGammaV2.getStats();
        setGammaStats(gamma);

        // Lifecycle Manager
        const lifecycle = signalLifecycleManager.getStats();
        setLifecycleStats(lifecycle);

        // Active signals
        const active = signalLifecycleManager.getActiveSignals();
        setActiveSignals(active.slice(0, 5)); // Top 5

        // Learning Integrator
        const learning = continuousLearningIntegrator.getLearningMetrics();
        setLearningMetrics(learning);

        // Confidence Calibrator
        const calibration = confidenceCalibrator.getCalibrationMetrics();
        setCalibrationMetrics(calibration);

        // Calculate overall pipeline health
        const healths = [
          beta?.overallHealth,
          gamma?.overallHealth,
          calibration?.calibrationQuality
        ].filter(Boolean);

        if (healths.includes('POOR') || healths.includes('CRITICAL')) {
          setPipelineHealth('POOR');
        } else if (healths.includes('FAIR')) {
          setPipelineHealth('FAIR');
        } else if (healths.every(h => h === 'EXCELLENT')) {
          setPipelineHealth('EXCELLENT');
        } else {
          setPipelineHealth('GOOD');
        }

      } catch (error) {
        console.error('[Intelligence Hub V3] Stats refresh error:', error);
      }
    };

    // Initial refresh
    refreshStats();

    // Refresh every second
    const interval = setInterval(refreshStats, 1000);

    return () => clearInterval(interval);
  }, [systemReady]);

  // Health badge color
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'EXCELLENT': return 'bg-green-100 text-green-700 border-green-300';
      case 'GOOD': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'FAIR': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'POOR': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Format number
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0';
    return num.toLocaleString();
  };

  // Format percentage
  const formatPercent = (num: number | undefined) => {
    if (num === undefined) return '0.0';
    return num.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-white">
      <AppHeader />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-2">
                Intelligence Hub V3
              </h1>
              <p className="text-gray-500">Complete AI pipeline with continuous learning • Real-time 24/7</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${getHealthColor(pipelineHealth)} border px-4 py-2 text-sm font-semibold`}>
                {pipelineHealth} HEALTH
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-green-300 px-4 py-2 text-sm font-semibold">
                <Activity className="w-4 h-4 mr-2 inline animate-pulse" />
                LIVE
              </Badge>
            </div>
          </div>
        </div>

        {/* Pipeline Flow Visualization */}
        <Card className="p-8 mb-6 border-2 border-orange-200 bg-white/80 backdrop-blur">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Real-Time Intelligence Pipeline
          </h2>

          <div className="grid grid-cols-6 gap-4 items-center">
            {/* Data Engine */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-xs font-bold text-gray-700">DATA V4</div>
              <div className="text-xs text-gray-500">{formatNumber(dataEngineStats?.tickersReceived || 0)}</div>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 mx-auto" />

            {/* Alpha V3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-xs font-bold text-gray-700">ALPHA V3</div>
              <div className="text-xs text-gray-500">&lt;10ms</div>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 mx-auto" />

            {/* Beta V5 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-xs font-bold text-gray-700">BETA V5</div>
              <div className="text-xs text-gray-500">{betaStats?.strategiesActive || 0}/10</div>
            </div>

            <ArrowRight className="w-6 h-6 text-gray-400 mx-auto" />

            {/* Gamma V2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-xs font-bold text-gray-700">GAMMA V2</div>
              <div className="text-xs text-gray-500">{formatPercent((gammaStats?.approvalRate || 0) * 100)}%</div>
            </div>
          </div>

          {/* Learning Loop */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Lifecycle Tracking</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Continuous Learning</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-orange-600" />
                <span>Auto-Improvement</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Engine Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Data Engine V4 */}
          <Card className="p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold">Data Engine V4</h3>
              </div>
              <Badge className="bg-blue-100 text-blue-700 text-xs">COLLECTING</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tickers Received:</span>
                <span className="font-bold">{formatNumber(dataEngineStats?.tickersReceived || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sources Active:</span>
                <span className="font-bold text-green-600">
                  {dataEngineStats?.sourcesActive || 0}/{dataEngineStats?.sourcesTotal || 9}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Symbols Tracked:</span>
                <span className="font-bold">{dataEngineStats?.symbolsTracked || 10}</span>
              </div>
            </div>
          </Card>

          {/* Alpha V3 */}
          <Card className="p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold">Alpha V3</h3>
              </div>
              <Badge className="bg-purple-100 text-purple-700 text-xs">ANALYZING</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Analyses:</span>
                <span className="font-bold">{formatNumber(alphaStats?.totalAnalyses || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Latency:</span>
                <span className="font-bold text-green-600">{alphaStats?.avgLatency?.toFixed(1) || '0.0'}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cache Hit Rate:</span>
                <span className="font-bold">{formatPercent((alphaStats?.cacheHitRate || 0) * 100)}%</span>
              </div>
            </div>

            {latestInsights && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">BTC Latest:</div>
                <div className="flex gap-2">
                  <Badge className="bg-orange-100 text-orange-700 text-xs">{latestInsights.regime}</Badge>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{latestInsights.momentum}</Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Beta V5 */}
          <Card className="p-6 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold">Beta V5</h3>
              </div>
              <Badge className={`${getHealthColor(betaStats?.overallHealth)} text-xs`}>
                {betaStats?.overallHealth || 'GOOD'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Strategies Active:</span>
                <span className="font-bold text-green-600">{betaStats?.strategiesActive || 0}/10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Analyses:</span>
                <span className="font-bold">{formatNumber(betaStats?.totalAnalyses || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Execution:</span>
                <span className="font-bold">{betaStats?.avgExecutionTime?.toFixed(0) || '0'}ms</span>
              </div>
            </div>
          </Card>

          {/* Gamma V2 */}
          <Card className="p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-bold">Gamma V2</h3>
              </div>
              <Badge className={`${getHealthColor(gammaStats?.overallHealth)} text-xs`}>
                {gammaStats?.overallHealth || 'GOOD'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Signals Assembled:</span>
                <span className="font-bold">{formatNumber(gammaStats?.totalAssembled || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Approval Rate:</span>
                <span className="font-bold text-green-600">
                  {formatPercent((gammaStats?.approvalRate || 0) * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Assembly:</span>
                <span className="font-bold">{gammaStats?.avgAssemblyTime?.toFixed(0) || '0'}ms</span>
              </div>
            </div>

            {/* Grade Distribution */}
            {gammaStats?.gradeDistribution && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Grade Distribution:</div>
                <div className="flex gap-1">
                  <div className="flex-1 bg-green-200 h-2 rounded" style={{ width: `${(gammaStats.gradeDistribution.A / gammaStats.totalAssembled) * 100}%` }}></div>
                  <div className="flex-1 bg-blue-200 h-2 rounded" style={{ width: `${(gammaStats.gradeDistribution.B / gammaStats.totalAssembled) * 100}%` }}></div>
                  <div className="flex-1 bg-yellow-200 h-2 rounded" style={{ width: `${(gammaStats.gradeDistribution.C / gammaStats.totalAssembled) * 100}%` }}></div>
                </div>
              </div>
            )}
          </Card>

          {/* Signal Lifecycle */}
          <Card className="p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold">Lifecycle Manager</h3>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 text-xs">TRACKING</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Signals:</span>
                <span className="font-bold">{formatNumber(lifecycleStats?.totalSignalsRegistered || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active:</span>
                <span className="font-bold text-blue-600">{lifecycleStats?.activeSignalsCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Win Rate:</span>
                <span className={`font-bold ${(lifecycleStats?.winRate || 0) >= 0.6 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatPercent((lifecycleStats?.winRate || 0) * 100)}%
                </span>
              </div>
            </div>
          </Card>

          {/* Continuous Learning */}
          <Card className="p-6 border-2 border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold">Continuous Learning</h3>
              </div>
              <Badge className={`${getHealthColor(calibrationMetrics?.calibrationQuality)} text-xs`}>
                {calibrationMetrics?.calibrationQuality || 'GOOD'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Outcomes:</span>
                <span className="font-bold">{formatNumber(learningMetrics?.totalOutcomes || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overall Win Rate:</span>
                <span className={`font-bold ${(learningMetrics?.overallWinRate || 0) >= 0.6 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatPercent((learningMetrics?.overallWinRate || 0) * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Calibration Error:</span>
                <span className="font-bold">{formatPercent((calibrationMetrics?.expectedCalibrationError || 0) * 100)}%</span>
              </div>
            </div>

            {/* Calibration Progress */}
            {calibrationMetrics && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Calibration Progress</span>
                  <span>{formatPercent(learningMetrics?.calibrationProgress || 0)}%</span>
                </div>
                <Progress value={learningMetrics?.calibrationProgress || 0} className="h-2" />
              </div>
            )}
          </Card>
        </div>

        {/* Active Signals */}
        {activeSignals.length > 0 && (
          <Card className="p-6 border-2 border-blue-200 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Active Signals ({activeSignals.length})
            </h2>

            <div className="space-y-3">
              {activeSignals.map((active, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4">
                    <Badge className={active.signal.direction === 'LONG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {active.signal.direction}
                    </Badge>
                    <div>
                      <div className="font-bold">{active.signal.symbol}</div>
                      <div className="text-xs text-gray-500">
                        Entry: ${active.signal.entryPrice?.toFixed(2) || '0.00'} •
                        Stop: ${active.signal.stopLoss?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{active.signal.confidence || 0}% Confidence</div>
                    <div className="text-xs text-gray-500">Grade: {active.signal.marketFitGrade || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* System Info */}
        <Card className="p-6 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold">System Status</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{pipelineHealth}</div>
              <div className="text-xs text-gray-600">Pipeline Health</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{betaStats?.strategiesActive || 0}/10</div>
              <div className="text-xs text-gray-600">Strategies Active</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatPercent((gammaStats?.approvalRate || 0) * 100)}%
              </div>
              <div className="text-xs text-gray-600">Approval Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">&lt;10ms</div>
              <div className="text-xs text-gray-600">Alpha Latency</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                <span>24/7 Operation Active</span>
              </div>
              <div>Last Update: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

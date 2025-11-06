/**
 * IGX Monitoring Dashboard
 * Real-time monitoring of Phase 1+2+3 implementation
 *
 * DISPLAYS:
 * - Event-driven flow status
 * - Feature cache performance
 * - Background worker stats
 * - Opportunity scoring metrics
 * - Alpha→Gamma communication (Phase 3)
 * - Risk context metrics (Phase 3)
 * - Market regime detection (Phase 3)
 * - System health indicators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { featureCache } from '@/services/igx/FeatureCache';
import { featureEngineWorker } from '@/services/igx/FeatureEngineWorker';
import { opportunityScorer } from '@/services/igx/OpportunityScorer';
import { eventDrivenAlphaV3 } from '@/services/igx/EventDrivenAlphaV3';
import { alphaGammaCommunicator } from '@/services/igx/AlphaGammaCommunicator';
import { marketConditionAnalyzer } from '@/services/igx/MarketConditionAnalyzer';
import {
  Activity,
  Zap,
  Database,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Radio,
  Target,
  Brain
} from 'lucide-react';

export const IGXMonitoringDashboard: React.FC = () => {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [workerStats, setWorkerStats] = useState<any>(null);
  const [opportunityMetrics, setOpportunityMetrics] = useState<any>(null);
  const [alphaStats, setAlphaStats] = useState<any>(null);

  // 🆕 Phase 3 state
  const [alphaGammaStats, setAlphaGammaStats] = useState<any>(null);
  const [activeCommand, setActiveCommand] = useState<any>(null);
  const [latestDecision, setLatestDecision] = useState<any>(null);
  const [marketMetrics, setMarketMetrics] = useState<any>(null);
  const [currentRegime, setCurrentRegime] = useState<any>(null);

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Ensure EventDrivenAlphaV3 is running
  useEffect(() => {
    try {
      const stats = eventDrivenAlphaV3.getStats();
      if (!stats?.isRunning) {
        console.log('[Dashboard] Starting EventDrivenAlphaV3...');
        eventDrivenAlphaV3.start();
      }
    } catch (error) {
      console.error('[Dashboard] Error starting EventDrivenAlphaV3:', error);
      // Try to start it anyway
      try {
        eventDrivenAlphaV3.start();
      } catch (startError) {
        console.error('[Dashboard] Failed to start EventDrivenAlphaV3:', startError);
      }
    }
    // Don't stop it on unmount - let it keep running for other components
  }, []);

  // Refresh stats every 5 seconds
  useEffect(() => {
    const refresh = () => {
      try {
        // Phase 1+2 stats - with individual error handling
        try { setCacheStats(featureCache.getStats()); } catch (e) { console.error('Cache stats error:', e); }
        try { setWorkerStats(featureEngineWorker.getStats()); } catch (e) { console.error('Worker stats error:', e); }
        try { setOpportunityMetrics(opportunityScorer.getMetrics()); } catch (e) { console.error('Opportunity metrics error:', e); }
        try { setAlphaStats(eventDrivenAlphaV3.getStats()); } catch (e) { console.error('Alpha stats error:', e); }

        // 🆕 Phase 3: ACTIVELY TRIGGER market analysis to populate data
        // This ensures the dashboard always has fresh market data
        try {
          const marketMetricsData = marketConditionAnalyzer.analyzeMarket('BTCUSDT');
          const regimeData = marketConditionAnalyzer.detectRegime();

          // Debug logging
          console.log('[Dashboard] Market analysis results:', {
            metricsReceived: !!marketMetricsData,
            regimeReceived: !!regimeData,
            regimeType: regimeData?.regime,
            compositeScore: marketMetricsData?.compositeScore
          });

          setMarketMetrics(marketMetricsData); // Use direct return value
          setCurrentRegime(regimeData); // Use direct return value
        } catch (e) {
          console.error('Market analysis error:', e);
        }

        // Use the data we just fetched directly (more reliable than waiting for events)
        try { setAlphaGammaStats(alphaGammaCommunicator.getStatus()); } catch (e) { console.error('AlphaGamma stats error:', e); }
        try { setActiveCommand(alphaGammaCommunicator.getActiveCommand()); } catch (e) { console.error('Active command error:', e); }
        try { setLatestDecision(alphaGammaCommunicator.getLatestAlphaDecision()); } catch (e) { console.error('Latest decision error:', e); }

        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error refreshing stats:', error);
      }
    };

    refresh(); // Initial load
    const interval = setInterval(refresh, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (isGood: boolean) => {
    return isGood ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Healthy
      </Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <XCircle className="w-3 h-3 mr-1" />
        Issue
      </Badge>
    );
  };

  const getPerformanceBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>;
    } else if (value >= thresholds.warning) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Good</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">IGX System Monitor</h1>
          <p className="text-gray-400">Phase 1+2+3 - Event-Driven Architecture + Feature Engineering + Opportunity Scoring Integration</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Last Update</p>
          <p className="text-white font-mono">{lastUpdate.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Overall System Health */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Event-Driven Flow</p>
              {getStatusBadge(alphaStats?.isRunning)}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Feature Cache</p>
              {getStatusBadge(cacheStats?.totalSymbols > 0)}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Background Worker</p>
              {getStatusBadge(workerStats?.isRunning)}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Opportunity Scorer</p>
              {getStatusBadge(opportunityMetrics?.totalScored > 0)}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Alpha→Gamma Link</p>
              {getStatusBadge(alphaGammaStats?.initialized)}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Market Regime</p>
              {getStatusBadge(currentRegime !== null)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event-Driven Alpha V3 */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-yellow-400" />
              Event-Driven Alpha V3
            </CardTitle>
            <CardDescription>Real-time event processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-2xl font-bold text-white">
                  {alphaStats?.isRunning ? '🟢 Running' : '🔴 Stopped'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Current Mode</p>
                <p className="text-2xl font-bold text-white">
                  {alphaStats?.currentMode || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Decisions</p>
                <p className="text-2xl font-bold text-white">
                  {alphaStats?.totalDecisions || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Signals Generated</p>
                <p className="text-2xl font-bold text-green-400">
                  {alphaStats?.signalsGenerated || 0}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Event Responses</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Regime Changes</span>
                  <span className="text-white font-mono">{alphaStats?.eventResponses?.regimeChange || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Volatility Spikes</span>
                  <span className="text-white font-mono">{alphaStats?.eventResponses?.volatilitySpike || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Whale Alerts</span>
                  <span className="text-white font-mono">{alphaStats?.eventResponses?.whaleAlert || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Funding Anomalies</span>
                  <span className="text-white font-mono">{alphaStats?.eventResponses?.fundingAnomaly || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Cache */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Database className="w-5 h-5 text-blue-400" />
              Feature Cache
            </CardTitle>
            <CardDescription>Pre-computed feature storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Total Symbols</p>
                <p className="text-2xl font-bold text-white">
                  {cacheStats?.totalSymbols || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Hit Rate</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">
                    {cacheStats?.hitRate?.toFixed(1) || 0}%
                  </p>
                  {cacheStats && getPerformanceBadge(cacheStats.hitRate, { good: 70, warning: 50 })}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Cache Hits</p>
                <p className="text-2xl font-bold text-green-400">
                  {cacheStats?.cacheHits || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Cache Misses</p>
                <p className="text-2xl font-bold text-red-400">
                  {cacheStats?.cacheMisses || 0}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Performance Metrics</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">Data Quality</span>
                    <span className="text-white font-mono">{cacheStats?.avgQuality?.toFixed(1) || 0}/100</span>
                  </div>
                  <Progress value={cacheStats?.avgQuality || 0} className="h-2" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Avg Staleness</span>
                  <span className="text-white font-mono">
                    {cacheStats ? (cacheStats.avgStaleness / 1000).toFixed(1) : 0}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Last Update</span>
                  <span className="text-white font-mono">
                    {cacheStats?.lastUpdateTime ? new Date(cacheStats.lastUpdateTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background Worker */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Feature Engine Worker
            </CardTitle>
            <CardDescription>Background feature pre-computation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-2xl font-bold text-white">
                  {workerStats?.isRunning ? '🟢 Active' : '🔴 Stopped'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Updates</p>
                <p className="text-2xl font-bold text-white">
                  {workerStats?.totalUpdates || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Symbols Processed</p>
                <p className="text-2xl font-bold text-white">
                  {workerStats?.symbolsProcessed || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Queue Size</p>
                <p className="text-2xl font-bold text-white">
                  {workerStats?.queueSize || 0}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Performance</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Avg Update Duration</span>
                  <span className="text-white font-mono">
                    {workerStats ? (workerStats.avgUpdateDuration / 1000).toFixed(1) : 0}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Errors</span>
                  <span className={`font-mono ${workerStats?.errorsCount > 5 ? 'text-red-400' : 'text-white'}`}>
                    {workerStats?.errorsCount || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Last Update</span>
                  <span className="text-white font-mono">
                    {workerStats?.lastUpdateTime ? new Date(workerStats.lastUpdateTime).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunity Scorer */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Opportunity Scorer
            </CardTitle>
            <CardDescription>Quality-based signal evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Total Scored</p>
                <p className="text-2xl font-bold text-white">
                  {opportunityMetrics?.totalScored || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Avg Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">
                    {opportunityMetrics?.averageScore?.toFixed(1) || 0}
                  </p>
                  {opportunityMetrics && getPerformanceBadge(opportunityMetrics.averageScore, { good: 70, warning: 60 })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Quality Distribution</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">High Quality (A)</span>
                  <span className="text-green-400 font-mono">{opportunityMetrics?.highQualityCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Medium Quality (B)</span>
                  <span className="text-yellow-400 font-mono">{opportunityMetrics?.mediumQualityCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Low Quality (C-F)</span>
                  <span className="text-red-400 font-mono">{opportunityMetrics?.lowQualityCount || 0}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Selectivity</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Take Rate</span>
                  <span className="text-white font-mono">{opportunityMetrics?.takeRate?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Skip Rate</span>
                  <span className="text-white font-mono">{opportunityMetrics?.skipRate?.toFixed(1) || 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🆕 PHASE 3: Alpha→Gamma Commands */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Radio className="w-5 h-5 text-orange-400" />
              Alpha→Gamma Commands
            </CardTitle>
            <CardDescription>Real-time command flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCommand ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Active Mode</p>
                    <Badge className="mt-1 bg-orange-500/20 text-orange-400 border-orange-500/30 text-lg px-3 py-1">
                      {activeCommand.mode}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Priority</p>
                    <Badge className={`mt-1 text-lg px-3 py-1 ${
                      activeCommand.priority === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      activeCommand.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {activeCommand.priority}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Command Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Issued By</span>
                      <span className="text-white font-mono">{activeCommand.issuedBy}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Reason</span>
                      <span className="text-white text-sm text-right max-w-[200px]">{activeCommand.reason}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Expires</span>
                      <span className="text-white font-mono">
                        {activeCommand.expiresAt ? new Date(activeCommand.expiresAt).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Threshold Adjustments</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Pattern Strength</span>
                      <span className="text-white font-mono">×{activeCommand.adjustments?.patternStrengthMultiplier || 1.0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Risk/Reward</span>
                      <span className="text-white font-mono">×{activeCommand.adjustments?.riskRewardMultiplier || 1.0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Max Signals</span>
                      <span className="text-white font-mono">{activeCommand.adjustments?.maxSignalsPerSector || 3}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No active command</p>
                <p className="text-sm text-gray-500 mt-1">Operating in SELECTIVE mode (default)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🆕 PHASE 3: Market Regime */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="w-5 h-5 text-purple-400" />
              Market Regime Detection
            </CardTitle>
            <CardDescription>Real-time market condition analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentRegime ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Current Regime</p>
                    <Badge className={`mt-1 text-lg px-3 py-1 ${
                      currentRegime.regime === 'BULL_TRENDING' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      currentRegime.regime === 'BEAR_TRENDING' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      currentRegime.regime === 'HIGH_VOLATILITY' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      currentRegime.regime === 'LOW_VOLATILITY' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                      {currentRegime.regime?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Confidence</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {currentRegime.confidence?.toFixed(0) || 0}%
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Description</p>
                  <p className="text-white text-sm">{currentRegime.description || 'No description available'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Regime Characteristics</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Duration</span>
                      <span className="text-white font-mono">
                        {currentRegime.duration ? (currentRegime.duration / 60000).toFixed(0) : 0} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Expected Duration</span>
                      <span className="text-white font-mono">
                        {currentRegime.expectedDuration ? (currentRegime.expectedDuration / 3600000).toFixed(1) : 0} hours
                      </span>
                    </div>
                  </div>
                </div>

                {marketMetrics && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Market Metrics</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-300">Composite Score</span>
                          <span className="text-white font-mono">{marketMetrics.compositeScore?.toFixed(1) || 0}/100</span>
                        </div>
                        <Progress value={marketMetrics.compositeScore || 0} className="h-2" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Volatility</span>
                        <span className="text-white font-mono">{marketMetrics.volatilityScore?.toFixed(1) || 0}/100</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Whale Activity</span>
                        <span className="text-white font-mono">{marketMetrics.whaleScore?.toFixed(1) || 0}/100</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No regime data available</p>
                <p className="text-sm text-gray-500 mt-1">Waiting for market analysis...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🆕 PHASE 3: Risk Context */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-red-400" />
              Risk Context
            </CardTitle>
            <CardDescription>Real-time risk metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestDecision ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Alpha Decision</p>
                    <Badge className="mt-1 bg-blue-500/20 text-blue-400 border-blue-500/30 text-lg px-3 py-1">
                      {latestDecision.mode}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Confidence</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {latestDecision.confidence?.toFixed(0) || 0}%
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Risk Factors</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-300">Current Drawdown</span>
                        <span className={`font-mono ${
                          (latestDecision.marketCondition?.compositeScore || 50) < 40 ? 'text-red-400' :
                          (latestDecision.marketCondition?.compositeScore || 50) < 50 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {((50 - (latestDecision.marketCondition?.compositeScore || 50)) / 5).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.abs((50 - (latestDecision.marketCondition?.compositeScore || 50)) / 5) * 10}
                        className="h-2"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Win Rate (Est.)</span>
                      <span className="text-white font-mono">50%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Portfolio Correlation</span>
                      <span className="text-white font-mono">Low</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Decision Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Reasoning</span>
                      <span className="text-white text-sm text-right max-w-[200px]">
                        {latestDecision.reasoning || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Valid Until</span>
                      <span className="text-white font-mono">
                        {latestDecision.validUntil ? new Date(latestDecision.validUntil).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No decision data available</p>
                <p className="text-sm text-gray-500 mt-1">Waiting for Alpha analysis...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-orange-900/20 border-blue-700/30">
        <CardHeader>
          <CardTitle className="text-white">Performance Summary</CardTitle>
          <CardDescription>Key improvements from Phase 1+2+3</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">Decision Frequency</p>
              <p className="text-xl font-bold text-white">Event-Driven</p>
              <p className="text-xs text-gray-500">vs. 4-hour timer</p>
            </div>
            <div className="text-center">
              <Database className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">Cache Hit Rate</p>
              <p className="text-xl font-bold text-white">{cacheStats?.hitRate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">Target: 70%+</p>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">Feature Staleness</p>
              <p className="text-xl font-bold text-white">
                {cacheStats ? (cacheStats.avgStaleness / 1000).toFixed(1) : 0}s
              </p>
              <p className="text-xs text-gray-500">Target: &lt;60s</p>
            </div>
            <div className="text-center">
              <Radio className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">Alpha→Gamma Link</p>
              <p className="text-xl font-bold text-white">
                {alphaGammaStats?.initialized ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-gray-500">Phase 3</p>
            </div>
            <div className="text-center">
              <Brain className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-1">Market Regime</p>
              <p className="text-xl font-bold text-white">
                {currentRegime?.regime?.replace('_', ' ') || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500">Real-time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

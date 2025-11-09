/**
 * STRATEGY PERFORMANCE DASHBOARD
 * Professional UI for viewing and comparing all 10 IGX trading strategies
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Zap,
  Shield,
  Clock,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { strategyPerformanceTracker } from '@/services/strategies/strategyPerformanceTracker';
import { STRATEGY_METADATA, StrategyName } from '@/services/strategies/strategyTypes';

export default function StrategyPerformance() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyName | null>(null);

  // Fetch all strategy performances
  const { data: allPerformances, isLoading: loadingPerformances } = useQuery({
    queryKey: ['strategy-performances'],
    queryFn: () => strategyPerformanceTracker.getAllStrategyPerformances(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch strategy comparison data
  const { data: comparisonData, isLoading: loadingComparison } = useQuery({
    queryKey: ['strategy-comparison'],
    queryFn: () => strategyPerformanceTracker.getStrategyComparison(),
    refetchInterval: 30000
  });

  // Fetch recent signals for selected strategy
  const { data: recentSignals } = useQuery({
    queryKey: ['strategy-signals', selectedStrategy],
    queryFn: () => selectedStrategy
      ? strategyPerformanceTracker.getRecentSignalsForStrategy(selectedStrategy, 10)
      : Promise.resolve([]),
    enabled: !!selectedStrategy,
    refetchInterval: 15000
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-500 bg-green-500/10';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10';
      case 'HIGH': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPerformanceColor = (value: number) => {
    if (value >= 70) return 'text-green-500';
    if (value >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loadingPerformances || loadingComparison) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading strategy performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Strategy Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Compare and analyze all 10 IGX trading strategies • Real-time performance tracking
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Signals</div>
              <div className="text-2xl font-bold">{comparisonData?.overall.totalSignals || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Success Rate</div>
              <div className="text-2xl font-bold text-green-500">
                {comparisonData?.overall.averageSuccessRate.toFixed(1) || 0}%
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Award className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Best Strategy</div>
              <div className="text-lg font-bold">
                {comparisonData?.bestBySuccessRate
                  ? STRATEGY_METADATA[comparisonData.bestBySuccessRate].displayName
                  : 'N/A'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Zap className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Strategies</div>
              <div className="text-2xl font-bold">10</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Strategy Overview</TabsTrigger>
          <TabsTrigger value="comparison">Performance Comparison</TabsTrigger>
          <TabsTrigger value="details">Strategy Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPerformances?.map((performance) => {
              const metadata = STRATEGY_METADATA[performance.strategyName];
              return (
                <Card
                  key={performance.strategyName}
                  className="p-6 hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => setSelectedStrategy(performance.strategyName)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold">{metadata.displayName}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {metadata.description}
                        </p>
                      </div>
                      <Badge className={getRiskColor(metadata.riskLevel)}>
                        {metadata.riskLevel}
                      </Badge>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                        <div className={`text-xl font-bold ${getPerformanceColor(performance.successRate)}`}>
                          {performance.successRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Signals</div>
                        <div className="text-xl font-bold">{performance.totalSignals}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Avg Profit</div>
                        <div className="text-lg font-bold text-green-500">
                          +{performance.averageProfit.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Profit Factor</div>
                        <div className="text-lg font-bold">
                          {performance.profitFactor.toFixed(2)}x
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {metadata.minTimeframe} - {metadata.maxTimeframe}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {metadata.minConfidenceThreshold}% min
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6">Performance Leaderboard</h3>
            <div className="space-y-3">
              {allPerformances
                ?.filter(p => p.totalSignals >= 5) // Only show strategies with enough data
                ?.sort((a, b) => b.successRate - a.successRate)
                ?.map((performance, index) => {
                  const metadata = STRATEGY_METADATA[performance.strategyName];
                  return (
                    <div
                      key={performance.strategyName}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-muted-foreground w-8">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{metadata.displayName}</div>
                          <div className="text-sm text-muted-foreground">{metadata.bestFor}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Success Rate</div>
                          <div className={`text-lg font-bold ${getPerformanceColor(performance.successRate)}`}>
                            {performance.successRate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Signals</div>
                          <div className="text-lg font-bold">{performance.totalSignals}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Profit Factor</div>
                          <div className="text-lg font-bold">{performance.profitFactor.toFixed(2)}x</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Sharpe</div>
                          <div className="text-lg font-bold">{performance.sharpeRatio.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {selectedStrategy ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Strategy Info */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">
                    {STRATEGY_METADATA[selectedStrategy].displayName}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Description</div>
                      <p className="text-sm">{STRATEGY_METADATA[selectedStrategy].description}</p>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Best For</div>
                      <p className="text-sm font-semibold">{STRATEGY_METADATA[selectedStrategy].bestFor}</p>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Risk Level</div>
                      <Badge className={getRiskColor(STRATEGY_METADATA[selectedStrategy].riskLevel)}>
                        {STRATEGY_METADATA[selectedStrategy].riskLevel}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Timeframe</div>
                      <div className="text-sm font-semibold">
                        {STRATEGY_METADATA[selectedStrategy].minTimeframe} - {STRATEGY_METADATA[selectedStrategy].maxTimeframe}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Required Data</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {STRATEGY_METADATA[selectedStrategy].requiredDataSources.map(source => (
                          <Badge key={source} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent Signals */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Recent Signals</h3>
                  <div className="space-y-3">
                    {recentSignals && recentSignals.length > 0 ? (
                      recentSignals.map((signal: any) => (
                        <div
                          key={signal.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${signal.signal_type === 'BUY' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {signal.signal_type === 'BUY' ? (
                                <ArrowUpRight className="h-5 w-5 text-green-500" />
                              ) : (
                                <ArrowDownRight className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold">{signal.symbol.toUpperCase()}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(signal.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Confidence</div>
                              <div className="font-semibold">{signal.confidence}%</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Status</div>
                              <Badge variant={signal.status === 'SUCCESS' ? 'default' : signal.status === 'FAILED' ? 'destructive' : 'secondary'}>
                                {signal.status}
                              </Badge>
                            </div>
                            {signal.profit_loss_percent !== null && (
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">P/L</div>
                                <div className={`font-semibold ${signal.profit_loss_percent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {signal.profit_loss_percent > 0 ? '+' : ''}{signal.profit_loss_percent.toFixed(2)}%
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No signals generated yet for this strategy</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">Select a Strategy</h3>
              <p className="text-muted-foreground">
                Click on any strategy in the Overview tab to view detailed performance and recent signals
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

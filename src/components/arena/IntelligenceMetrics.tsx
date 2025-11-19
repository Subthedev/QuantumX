/**
 * ULTRA-LIGHTWEIGHT INTELLIGENCE METRICS
 *
 * Real-time metrics from Intelligence Hub displayed in Arena
 * Optimized for minimal re-renders and maximum performance
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  TrendingUp,
  Zap,
  CheckCircle,
  Filter,
  Brain,
  Signal,
  Clock
} from 'lucide-react';
import { useArenaData, formatUptime, formatPercentage, getStatusColor } from '@/hooks/useArenaData';

export const IntelligenceMetrics = React.memo(() => {
  const { data: metrics, isLoading } = useArenaData(2000); // 2s refresh for sub-1s feel

  if (isLoading || !metrics) {
    return (
      <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-orange-500" />
          <h3 className="text-sm font-semibold">Intelligence Hub</h3>
          <Badge variant="outline" className="ml-auto text-xs">
            Loading...
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-500/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-orange-500" />
        <h3 className="text-sm font-semibold">Intelligence Hub Live</h3>
        <Badge variant="outline" className="ml-auto text-xs bg-green-500/10 border-green-500/30">
          <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
          {formatUptime(metrics.uptime)}
        </Badge>
      </div>

      {/* Metrics Grid - Ultra Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {/* Win Rate */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span>Win Rate</span>
          </div>
          <div className={`text-lg font-bold ${getStatusColor(metrics.winRate, { good: 70, warning: 60 })}`}>
            {formatPercentage(metrics.winRate)}
          </div>
        </div>

        {/* Approval Rate */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <CheckCircle className="h-3 w-3" />
            <span>Approval</span>
          </div>
          <div className={`text-lg font-bold ${getStatusColor(metrics.approvalRate, { good: 80, warning: 70 })}`}>
            {formatPercentage(metrics.approvalRate)}
          </div>
        </div>

        {/* Active Signals */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Signal className="h-3 w-3" />
            <span>Active</span>
          </div>
          <div className="text-lg font-bold text-orange-500">
            {metrics.activeSignals}
          </div>
        </div>

        {/* Latency */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Zap className="h-3 w-3" />
            <span>Latency</span>
          </div>
          <div className={`text-lg font-bold ${getStatusColor(100 - metrics.avgLatency / 10, { good: 90, warning: 80 })}`}>
            {metrics.avgLatency.toFixed(0)}ms
          </div>
        </div>

        {/* Quality Score */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Activity className="h-3 w-3" />
            <span>Quality</span>
          </div>
          <div className={`text-lg font-bold ${getStatusColor(metrics.qualityScore, { good: 0.85, warning: 0.75 })}`}>
            {formatPercentage(metrics.qualityScore * 100, 0)}
          </div>
        </div>

        {/* Gamma Pass */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Filter className="h-3 w-3" />
            <span>Gamma</span>
          </div>
          <div className={`text-lg font-bold ${getStatusColor(metrics.gammaPassRate, { good: 75, warning: 65 })}`}>
            {formatPercentage(metrics.gammaPassRate)}
          </div>
        </div>

        {/* Delta Pass */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Brain className="h-3 w-3" />
            <span>Delta ML</span>
          </div>
          <div className={`text-lg font-bold ${getStatusColor(metrics.deltaPassRate, { good: 80, warning: 70 })}`}>
            {formatPercentage(metrics.deltaPassRate)}
          </div>
        </div>

        {/* Market Regime */}
        <div className="bg-background/50 rounded p-2">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span>Regime</span>
          </div>
          <div className="text-sm font-bold text-orange-500 truncate">
            {metrics.currentRegime}
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>{metrics.totalSignals.toLocaleString()} total signals</span>
        <span>{metrics.patternsDetected.toLocaleString()} patterns</span>
        <span>{metrics.activeStrategies} strategies</span>
      </div>
    </Card>
  );
});

IntelligenceMetrics.displayName = 'IntelligenceMetrics';

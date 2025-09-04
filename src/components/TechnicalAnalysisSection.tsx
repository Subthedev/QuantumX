import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
interface TechnicalAnalysisProps {
  analysis: any;
  marketData: any;
}
export const TechnicalAnalysisSection: React.FC<TechnicalAnalysisProps> = ({
  analysis,
  marketData
}) => {
  const formatPrice = (value: number | string) => {
    if (typeof value === 'string') return value;
    if (value >= 100) return `$${value.toFixed(2)}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };
  const getTrendStrength = (trend: string) => {
    const trendLower = trend?.toLowerCase() || '';
    if (trendLower.includes('strong') && trendLower.includes('bullish')) return 90;
    if (trendLower.includes('bullish')) return 70;
    if (trendLower.includes('strong') && trendLower.includes('bearish')) return 30;
    if (trendLower.includes('bearish')) return 20;
    return 50;
  };
  const parseIndicators = (indicators: any) => {
    if (Array.isArray(indicators)) return indicators;
    if (typeof indicators === 'string') return indicators.split(',').map((i: string) => i.trim());
    return [];
  };
  const parseLevels = (levels: any) => {
    if (Array.isArray(levels)) return levels;
    if (typeof levels === 'string') {
      const matches = levels.match(/[\d.]+/g);
      return matches ? matches.map(Number) : [];
    }
    return [];
  };
  if (!analysis) {
    return;
  }
  const trendStrength = getTrendStrength(analysis.primary_trend || analysis.trend);
  const supportLevels = parseLevels(analysis.support_levels);
  const resistanceLevels = parseLevels(analysis.resistance_levels);
  const indicators = parseIndicators(analysis.indicators);
  return <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Technical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Trend */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Primary Trend</span>
            <div className="flex items-center gap-2">
              {analysis.primary_trend?.toLowerCase().includes('bullish') ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              <span className="font-medium">{analysis.primary_trend || analysis.trend || 'Neutral'}</span>
            </div>
          </div>
          <Progress value={trendStrength} className="h-2" />
        </div>

        {/* Support & Resistance */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Support Levels</div>
            <div className="space-y-1">
              {supportLevels.length > 0 ? supportLevels.map((level: number, idx: number) => <div key={idx} className="flex items-center gap-2">
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                    <span className="text-sm font-mono">{formatPrice(level)}</span>
                  </div>) : <span className="text-sm text-muted-foreground">No data</span>}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">Resistance Levels</div>
            <div className="space-y-1">
              {resistanceLevels.length > 0 ? resistanceLevels.map((level: number, idx: number) => <div key={idx} className="flex items-center gap-2">
                    <ArrowUpRight className="h-3 w-3 text-success" />
                    <span className="text-sm font-mono">{formatPrice(level)}</span>
                  </div>) : <span className="text-sm text-muted-foreground">No data</span>}
            </div>
          </div>
        </div>

        {/* Key Indicators */}
        {indicators.length > 0 && <div>
            <div className="text-sm text-muted-foreground mb-2">Active Indicators</div>
            <div className="flex flex-wrap gap-2">
              {indicators.map((indicator: string, idx: number) => <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {indicator}
                </Badge>)}
            </div>
          </div>}

        {/* Breakout Scenarios */}
        {analysis.breakout_scenarios && <div>
            <div className="text-sm text-muted-foreground mb-2">Breakout Scenarios</div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-warning mt-0.5" />
                <p className="text-sm">{analysis.breakout_scenarios}</p>
              </div>
            </div>
          </div>}
      </CardContent>
    </Card>;
};
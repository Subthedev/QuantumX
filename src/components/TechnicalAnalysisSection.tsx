import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TechnicalAnalysisProps {
  analysis: any;
  marketData: any;
}

export const TechnicalAnalysisSection: React.FC<TechnicalAnalysisProps> = ({ analysis, marketData }) => {
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

  return (
    <Card className="border-2 border-blue-500/20 shadow-xl bg-gradient-to-br from-background to-blue-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Technical Analysis
          </CardTitle>
          {analysis?.primary_trend && (
            <Badge variant="outline" className={`px-3 py-1 ${
              analysis.primary_trend.toLowerCase().includes('bullish') 
                ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                : 'bg-red-500/10 text-red-600 border-red-500/30'
            }`}>
              {analysis.primary_trend}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {analysis ? (
          <>
            {/* Trend Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Market Trend Strength</span>
                <span className="text-sm font-bold">{getTrendStrength(analysis.primary_trend)}%</span>
              </div>
              <Progress 
                value={getTrendStrength(analysis.primary_trend)} 
                className="h-3"
              />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-muted-foreground">Short-term</div>
                  <div className={`font-medium ${
                    analysis.trend?.toLowerCase().includes('bullish') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analysis.trend || 'Neutral'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Medium-term</div>
                  <div className={`font-medium ${
                    analysis.primary_trend?.toLowerCase().includes('bullish') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analysis.primary_trend || 'Neutral'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Momentum</div>
                  <div className="font-medium text-blue-600">
                    {analysis.key_indicators?.includes('overbought') ? 'Overbought' : 
                     analysis.key_indicators?.includes('oversold') ? 'Oversold' : 'Neutral'}
                  </div>
                </div>
              </div>
            </div>

            {/* Support & Resistance Levels */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                  Support Levels
                </div>
                <div className="space-y-1">
                  {parseLevels(analysis.support_levels).map((level: number, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/20">
                      <span className="text-xs font-medium text-green-700">S{i + 1}</span>
                      <span className="text-sm font-bold text-green-700">{formatPrice(level)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                  Resistance Levels
                </div>
                <div className="space-y-1">
                  {parseLevels(analysis.resistance_levels).map((level: number, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-red-500/10 rounded border border-red-500/20">
                      <span className="text-xs font-medium text-red-700">R{i + 1}</span>
                      <span className="text-sm font-bold text-red-700">{formatPrice(level)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-purple-600" />
                Active Indicators
              </div>
              <div className="flex flex-wrap gap-2">
                {parseIndicators(analysis.indicators).map((indicator: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {indicator}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Breakout Scenarios */}
            {analysis.breakout_scenarios && (
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Breakout Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.breakout_scenarios}
                </p>
              </div>
            )}

            {/* Technical Summary */}
            {analysis.key_indicators && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-sm font-medium mb-2">Technical Summary</div>
                <p className="text-sm text-muted-foreground">
                  {analysis.key_indicators}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No technical analysis available. Generate a report to see detailed analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
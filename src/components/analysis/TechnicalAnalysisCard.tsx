import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TechnicalAnalysisProps {
  data: any;
  coinData: any;
}

export const TechnicalAnalysisCard: React.FC<TechnicalAnalysisProps> = ({ data, coinData }) => {
  const getTrendColor = (trend: string) => {
    if (trend.includes('Up')) return 'text-green-600 dark:text-green-400';
    if (trend.includes('Down')) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('Up')) return <TrendingUp className="h-5 w-5" />;
    if (trend.includes('Down')) return <TrendingDown className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Trend Analysis */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTrendIcon(data.trend_analysis.current_trend)}
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Trend</div>
              <div className={`text-lg font-bold ${getTrendColor(data.trend_analysis.current_trend)}`}>
                {data.trend_analysis.current_trend}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Momentum</div>
              <div className="text-lg font-bold">{data.trend_analysis.momentum}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Strength Score</div>
              <div className="text-lg font-bold text-primary">{data.trend_analysis.strength_score}/100</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Key Price Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Resistance Levels</div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-xs text-muted-foreground">Strong</div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {data.price_levels.strong_resistance}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="text-xs text-muted-foreground">Immediate</div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {data.price_levels.immediate_resistance}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Support Levels</div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-xs text-muted-foreground">Strong</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {data.price_levels.strong_support}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="text-xs text-muted-foreground">Immediate</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {data.price_levels.immediate_support}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Volume Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Volume Trend</div>
              <Badge variant={data.volume_analysis.volume_trend === 'Rising' ? 'default' : 'secondary'}>
                {data.volume_analysis.volume_trend}
              </Badge>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Quality</div>
              <Badge variant={data.volume_analysis.volume_quality === 'Strong' ? 'default' : 'secondary'}>
                {data.volume_analysis.volume_quality}
              </Badge>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Phase</div>
              <Badge variant={data.volume_analysis.accumulation_distribution === 'Accumulation' ? 'default' : 'destructive'}>
                {data.volume_analysis.accumulation_distribution}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Zones */}
      <Card className="border-2 border-primary/30 shadow-glow">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Trading Zones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Optimal Entry Points</div>
            <div className="space-y-2">
              {data.trading_zones.optimal_entry.map((entry: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="font-medium">{entry}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Take Profit Levels</div>
            <div className="space-y-2">
              {data.trading_zones.take_profit_levels.map((tp: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="font-medium text-green-700 dark:text-green-400">{tp}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Stop Loss</div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="font-medium text-red-700 dark:text-red-400">{data.trading_zones.stop_loss}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Patterns & Indicators */}
      <div className="grid md:grid-cols-2 gap-6">
        {data.chart_patterns && data.chart_patterns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chart Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.chart_patterns.map((pattern: string, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-muted/50 text-sm">
                    {pattern}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.indicators && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical Indicators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.indicators.rsi_level && (
                <div>
                  <div className="text-xs text-muted-foreground">RSI</div>
                  <div className="font-medium">{data.indicators.rsi_level}</div>
                </div>
              )}
              {data.indicators.macd_signal && (
                <div>
                  <div className="text-xs text-muted-foreground">MACD</div>
                  <div className="font-medium">{data.indicators.macd_signal}</div>
                </div>
              )}
              {data.indicators.moving_averages && (
                <div>
                  <div className="text-xs text-muted-foreground">Moving Averages</div>
                  <div className="font-medium">{data.indicators.moving_averages}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timeframe Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Timeframe Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-2">Short-Term (1-7 days)</div>
              <div className="text-sm leading-relaxed">{data.timeframe_outlook.short_term}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-2">Medium-Term (1-4 weeks)</div>
              <div className="text-sm leading-relaxed">{data.timeframe_outlook.medium_term}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {data.key_insights && data.key_insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Technical Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.key_insights.map((insight: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk/Reward */}
      <Card className={`border-l-4 ${
        data.risk_reward.risk_level === 'Low' ? 'border-l-green-500' :
        data.risk_reward.risk_level === 'Medium' ? 'border-l-yellow-500' : 'border-l-red-500'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk/Reward Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">R:R Ratio</div>
              <div className="text-2xl font-bold text-primary">{data.risk_reward.ratio}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Risk Level</div>
              <Badge className={
                data.risk_reward.risk_level === 'Low' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.risk_reward.risk_level === 'Medium' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                'bg-red-500/10 text-red-700 dark:text-red-400'
              }>
                {data.risk_reward.risk_level}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

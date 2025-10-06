import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TechnicalAnalysisProps {
  data: any;
  coinData: any;
}

export const TechnicalAnalysisCard: React.FC<TechnicalAnalysisProps> = ({ data, coinData }) => {
  const getTrendColor = (trend: string) => {
    if (trend.includes('Up')) return 'text-success dark:text-success';
    if (trend.includes('Down')) return 'text-destructive';
    return 'text-warning';
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('Up')) return <TrendingUp className="h-5 w-5" />;
    if (trend.includes('Down')) return <TrendingDown className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Trend Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTrendIcon(data.trend_analysis.current_trend)}
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Trend</div>
              <div className={`text-lg font-bold ${getTrendColor(data.trend_analysis.current_trend)}`}>
                {data.trend_analysis.current_trend}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Momentum</div>
              <div className="text-lg font-bold">{data.trend_analysis.momentum}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Strength</div>
              <div className="text-lg font-bold text-primary">{data.trend_analysis.strength_score}/100</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Price Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Key Price Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Resistance</div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="text-xs text-muted-foreground">Strong</div>
                <div className="text-xl font-bold text-destructive">{data.price_levels.strong_resistance}</div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <div className="text-xs text-muted-foreground">Immediate</div>
                <div className="text-lg font-semibold text-destructive">{data.price_levels.immediate_resistance}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Support</div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="text-xs text-muted-foreground">Strong</div>
                <div className="text-xl font-bold text-success dark:text-success">{data.price_levels.strong_support}</div>
              </div>
              <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                <div className="text-xs text-muted-foreground">Immediate</div>
                <div className="text-lg font-semibold text-success dark:text-success">{data.price_levels.immediate_support}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Zones */}
      <Card className="border-primary/30">
        <CardHeader className="bg-primary/5">
          <CardTitle>Trading Zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Entry Points</div>
            <div className="space-y-2">
              {data.trading_zones.optimal_entry.map((entry: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                  {entry}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Take Profit</div>
            <div className="space-y-2">
              {data.trading_zones.take_profit_levels.map((tp: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success dark:text-success">
                  {tp}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Stop Loss</div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {data.trading_zones.stop_loss}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeframe Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Short-Term (1-7 days)</div>
              <p className="text-sm leading-relaxed">{data.timeframe_outlook.short_term}</p>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Medium-Term (1-4 weeks)</div>
              <p className="text-sm leading-relaxed">{data.timeframe_outlook.medium_term}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk/Reward */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">R:R Ratio</div>
              <div className="text-2xl font-bold text-primary">{data.risk_reward.ratio}</div>
            </div>
            <Badge variant={
              data.risk_reward.risk_level === 'Low' ? 'default' :
              data.risk_reward.risk_level === 'Medium' ? 'secondary' : 'destructive'
            }>
              {data.risk_reward.risk_level} Risk
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

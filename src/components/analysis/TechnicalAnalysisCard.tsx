import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { TechnicalAnalysis } from '@/schemas/analysis-schemas';

interface TechnicalAnalysisProps {
  data: TechnicalAnalysis;
  coinData: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume: number;
  };
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
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardTitle className="flex items-center gap-2">
            {getTrendIcon(data.trend_analysis.current_trend)}
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Trend</div>
              <div className={`text-lg font-bold ${getTrendColor(data.trend_analysis.current_trend)}`}>
                {data.trend_analysis.current_trend}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Momentum</div>
              <div className="text-lg font-bold">{data.trend_analysis.momentum}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <div className="text-sm text-muted-foreground mb-2">Strength</div>
              <div className="text-lg font-bold text-primary">{data.trend_analysis.strength_score}/100</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Price Levels */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Key Price Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Resistance Levels</div>
              <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/20 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">Strong</div>
                <div className="text-xl font-bold text-destructive">{data.price_levels.strong_resistance}</div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                <div className="text-xs text-muted-foreground mb-1">Immediate</div>
                <div className="text-lg font-semibold text-destructive">{data.price_levels.immediate_resistance}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Support Levels</div>
              <div className="p-4 rounded-lg bg-success/10 border-2 border-success/20 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">Strong</div>
                <div className="text-xl font-bold text-success dark:text-success">{data.price_levels.strong_support}</div>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/10">
                <div className="text-xs text-muted-foreground mb-1">Immediate</div>
                <div className="text-lg font-semibold text-success dark:text-success">{data.price_levels.immediate_support}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Zones */}
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardTitle>Trading Zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-3">📍 Entry Points</div>
            <div className="space-y-2">
              {data.trading_zones.optimal_entry.map((entry: string, idx: number) => (
                <div key={idx} className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-primary/30 text-sm font-medium shadow-sm">
                  {entry}
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-3">🎯 Take Profit Levels</div>
            <div className="space-y-2">
              {data.trading_zones.take_profit_levels.map((tp: string, idx: number) => (
                <div key={idx} className="p-4 rounded-lg bg-success/10 border border-success/30 text-sm font-medium text-success dark:text-success shadow-sm">
                  {tp}
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-3">🛡️ Stop Loss</div>
            <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 text-sm font-bold text-destructive shadow-sm">
              {data.trading_zones.stop_loss}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeframe Outlook */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardTitle>Market Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="p-4 rounded-lg bg-muted/50 border border-muted">
            <div className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              📅 Short-Term (1-7 days)
            </div>
            <p className="text-sm leading-relaxed">{data.timeframe_outlook.short_term}</p>
          </div>
          <Separator />
          <div className="p-4 rounded-lg bg-muted/50 border border-muted">
            <div className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              📊 Medium-Term (1-4 weeks)
            </div>
            <p className="text-sm leading-relaxed">{data.timeframe_outlook.medium_term}</p>
          </div>
        </CardContent>
      </Card>

      {/* Risk/Reward */}
      <Card className="shadow-md hover:shadow-lg transition-shadow border-2">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Risk : Reward Ratio</div>
              <div className="text-3xl font-bold text-primary">{data.risk_reward.ratio}</div>
            </div>
            <Badge
              className="text-base px-4 py-2"
              variant={
                data.risk_reward.risk_level === 'Low' ? 'default' :
                data.risk_reward.risk_level === 'Medium' ? 'secondary' : 'destructive'
              }
            >
              {data.risk_reward.risk_level} Risk
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

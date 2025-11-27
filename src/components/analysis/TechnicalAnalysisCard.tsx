import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, Target, ChevronDown, ChevronUp } from 'lucide-react';
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

export const TechnicalAnalysisCard: React.FC<TechnicalAnalysisProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['trend', 'levels']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getTrendColor = (trend: string) => {
    if (trend.includes('Up')) return 'text-success dark:text-success';
    if (trend.includes('Down')) return 'text-destructive';
    return 'text-warning';
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('Up')) return <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />;
    if (trend.includes('Down')) return <TrendingDown className="h-4 w-4 md:h-5 md:w-5" />;
    return <Activity className="h-4 w-4 md:h-5 md:w-5" />;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Trend Overview - Mobile Optimized */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader
          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('trend')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              {getTrendIcon(data.trend_analysis.current_trend)}
              <span>Trend Analysis</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('trend') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('trend') && (
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="grid grid-cols-3 gap-2 md:gap-4 lg:gap-6">
              <div className="text-center p-2 md:p-3 lg:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Trend</div>
                <div className={`text-sm md:text-base lg:text-lg font-bold ${getTrendColor(data.trend_analysis.current_trend)}`}>
                  {data.trend_analysis.current_trend}
                </div>
              </div>
              <div className="text-center p-2 md:p-3 lg:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Momentum</div>
                <div className="text-sm md:text-base lg:text-lg font-bold">{data.trend_analysis.momentum}</div>
              </div>
              <div className="text-center p-2 md:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <div className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Strength</div>
                <div className="text-sm md:text-base lg:text-lg font-bold text-primary">{data.trend_analysis.strength_score}/100</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Key Price Levels - Mobile Optimized */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader
          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('levels')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Target className="h-4 w-4 md:h-5 md:w-5" />
              <span>Key Price Levels</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('levels') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('levels') && (
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2 md:space-y-3">
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Resistance Levels</div>
                <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border-2 border-destructive/20 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Strong</div>
                  <div className="text-lg md:text-xl font-bold text-destructive">{data.price_levels.strong_resistance}</div>
                </div>
                <div className="p-3 md:p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="text-xs text-muted-foreground mb-1">Immediate</div>
                  <div className="text-base md:text-lg font-semibold text-destructive">{data.price_levels.immediate_resistance}</div>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Support Levels</div>
                <div className="p-3 md:p-4 rounded-lg bg-success/10 border-2 border-success/20 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Strong</div>
                  <div className="text-lg md:text-xl font-bold text-success dark:text-success">{data.price_levels.strong_support}</div>
                </div>
                <div className="p-3 md:p-4 rounded-lg bg-success/5 border border-success/10">
                  <div className="text-xs text-muted-foreground mb-1">Immediate</div>
                  <div className="text-base md:text-lg font-semibold text-success dark:text-success">{data.price_levels.immediate_support}</div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Trading Zones - Mobile Optimized */}
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardHeader
          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('trading')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Trading Zones</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('trading') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('trading') && (
          <CardContent className="space-y-4 md:space-y-6 pt-4 md:pt-6 p-3 md:p-6">
            <div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-2 md:mb-3">📍 Entry Points</div>
              <div className="space-y-2">
                {data.trading_zones.optimal_entry.map((entry: string, idx: number) => (
                  <div key={idx} className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-primary/30 text-xs md:text-sm font-medium shadow-sm">
                    {entry}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-2 md:my-4" />

            <div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-2 md:mb-3">🎯 Take Profit Levels</div>
              <div className="space-y-2">
                {data.trading_zones.take_profit_levels.map((tp: string, idx: number) => (
                  <div key={idx} className="p-3 md:p-4 rounded-lg bg-success/10 border border-success/30 text-xs md:text-sm font-medium text-success dark:text-success shadow-sm">
                    {tp}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-2 md:my-4" />

            <div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-2 md:mb-3">🛡️ Stop Loss</div>
              <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 text-xs md:text-sm font-bold text-destructive shadow-sm">
                {data.trading_zones.stop_loss}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeframe Outlook - Mobile Optimized */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader
          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('outlook')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Market Outlook</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('outlook') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('outlook') && (
          <CardContent className="space-y-4 md:space-y-6 pt-4 md:pt-6 p-3 md:p-6">
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 border border-muted">
              <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                📅 Short-Term (1-7 days)
              </div>
              <p className="text-xs md:text-sm leading-relaxed">{data.timeframe_outlook.short_term}</p>
            </div>
            <Separator />
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 border border-muted">
              <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                📊 Medium-Term (1-4 weeks)
              </div>
              <p className="text-xs md:text-sm leading-relaxed">{data.timeframe_outlook.medium_term}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Risk/Reward - Mobile Optimized */}
      <Card className="shadow-md hover:shadow-lg transition-shadow border-2">
        <CardHeader
          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('risk')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Risk Assessment</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('risk') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('risk') && (
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 p-3 md:p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
              <div>
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Risk : Reward Ratio</div>
                <div className="text-2xl md:text-3xl font-bold text-primary">{data.risk_reward.ratio}</div>
              </div>
              <Badge
                className="text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2"
                variant={
                  data.risk_reward.risk_level === 'Low' ? 'default' :
                  data.risk_reward.risk_level === 'Medium' ? 'secondary' : 'destructive'
                }
              >
                {data.risk_reward.risk_level} Risk
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

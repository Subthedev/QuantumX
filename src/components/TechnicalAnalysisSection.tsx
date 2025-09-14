import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Shield, Target, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const parseLevels = (levels: any) => {
    if (Array.isArray(levels)) return levels;
    if (typeof levels === 'string') {
      const matches = levels.match(/[\d.]+/g);
      return matches ? matches.map(Number) : [];
    }
    return [];
  };

  if (!analysis) {
    return null;
  }

  const supportLevels = parseLevels(analysis.support_levels).slice(0, 3);
  const resistanceLevels = parseLevels(analysis.resistance_levels).slice(0, 3);
  const trend = analysis.primary_trend || analysis.trend || 'Neutral';
  const isBullish = trend.toLowerCase().includes('bullish');
  const isBearish = trend.toLowerCase().includes('bearish');
  
  // Determine action based on current price and levels
  const currentPrice = marketData?.current_price || 0;
  const nearestResistance = resistanceLevels[0] || 0;
  const nearestSupport = supportLevels[0] || 0;
  
  const getActionableInsight = () => {
    if (isBullish && currentPrice < nearestResistance) {
      return {
        action: 'LONG OPPORTUNITY',
        description: `Entry near ${formatPrice(nearestSupport)} with target at ${formatPrice(nearestResistance)}`,
        color: 'text-success'
      };
    } else if (isBearish && currentPrice > nearestSupport) {
      return {
        action: 'SHORT OPPORTUNITY',
        description: `Entry near ${formatPrice(nearestResistance)} with target at ${formatPrice(nearestSupport)}`,
        color: 'text-destructive'
      };
    } else {
      return {
        action: 'WAIT FOR SETUP',
        description: 'Monitor for breakout or reversal at key levels',
        color: 'text-warning'
      };
    }
  };

  const actionableInsight = getActionableInsight();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          AI Technical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Actionable Trading Signal */}
        <Alert className="border-primary/20 bg-primary/5">
          <Target className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-1">
              <div className={`font-semibold text-base ${actionableInsight.color}`}>
                {actionableInsight.action}
              </div>
              <div className="text-sm text-muted-foreground">
                {actionableInsight.description}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Market Trend */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Market Trend</span>
            <div className="flex items-center gap-2">
              {isBullish ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : isBearish ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              <Badge 
                variant={isBearish ? "destructive" : "secondary"}
                className={isBullish ? "bg-success/10 text-success border-success/20" : ""}
              >
                {trend}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Levels Grid */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Key Price Levels</div>
          <div className="grid grid-cols-2 gap-4">
            {/* Support Levels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                Support Zones
              </div>
              {supportLevels.length > 0 ? (
                <div className="space-y-1">
                  {supportLevels.map((level: number, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-destructive/5 border border-destructive/10">
                      <span className="text-xs text-muted-foreground">S{idx + 1}</span>
                      <span className="text-sm font-mono font-medium">{formatPrice(level)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No data</div>
              )}
            </div>

            {/* Resistance Levels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Resistance Zones
              </div>
              {resistanceLevels.length > 0 ? (
                <div className="space-y-1">
                  {resistanceLevels.map((level: number, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-success/5 border border-success/10">
                      <span className="text-xs text-muted-foreground">R{idx + 1}</span>
                      <span className="text-sm font-mono font-medium">{formatPrice(level)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No data</div>
              )}
            </div>
          </div>
        </div>

        {/* Breakout Alert if present */}
        {analysis.breakout_scenarios && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium">Breakout Alert</div>
                <p className="text-xs text-muted-foreground">{analysis.breakout_scenarios}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Summary */}
        <div className="pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            Analysis complete • {supportLevels.length + resistanceLevels.length} key levels identified • Trade setup ready
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
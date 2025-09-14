import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
  
  const currentPrice = marketData?.current_price || 0;
  const nearestResistance = resistanceLevels[0] || 0;
  const nearestSupport = supportLevels[0] || 0;
  
  // Simplified, clear action determination
  const getAction = () => {
    if (isBullish && currentPrice < nearestResistance) {
      return {
        signal: 'BUY',
        description: 'Strong upward momentum detected',
        confidence: 'HIGH',
        color: 'text-success',
        bgColor: 'bg-success/5',
        icon: TrendingUp
      };
    } else if (isBearish && currentPrice > nearestSupport) {
      return {
        signal: 'SELL',
        description: 'Downward pressure building',
        confidence: 'HIGH',
        color: 'text-destructive',
        bgColor: 'bg-destructive/5',
        icon: TrendingDown
      };
    } else {
      return {
        signal: 'HOLD',
        description: 'Waiting for clearer setup',
        confidence: 'MEDIUM',
        color: 'text-warning',
        bgColor: 'bg-warning/5',
        icon: Activity
      };
    }
  };

  const action = getAction();
  const Icon = action.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          AI Technical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clean Action Signal */}
        <div className={`${action.bgColor} rounded-lg p-4 border ${action.color === 'text-success' ? 'border-success/20' : action.color === 'text-destructive' ? 'border-destructive/20' : 'border-warning/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${action.color}`} />
              <div>
                <div className={`text-xl font-bold ${action.color}`}>
                  {action.signal}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div className={`text-sm font-semibold ${action.color}`}>
                {action.confidence}
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Minimal Price Levels */}
        <div className="grid grid-cols-2 gap-3">
          {/* Support Levels */}
          <div className="bg-muted/20 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Support Levels ↓
            </div>
            <div className="space-y-1">
              {supportLevels.map((level: number, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">S{idx + 1}</span>
                  <span className="text-sm font-mono font-medium">{formatPrice(level)}</span>
                </div>
              ))}
              {supportLevels.length === 0 && (
                <div className="text-xs text-muted-foreground">Calculating...</div>
              )}
            </div>
          </div>

          {/* Resistance Levels */}
          <div className="bg-muted/20 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Resistance Levels ↑
            </div>
            <div className="space-y-1">
              {resistanceLevels.map((level: number, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">R{idx + 1}</span>
                  <span className="text-sm font-mono font-medium">{formatPrice(level)}</span>
                </div>
              ))}
              {resistanceLevels.length === 0 && (
                <div className="text-xs text-muted-foreground">Calculating...</div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Trading Setup - Only if actionable */}
        {action.signal !== 'HOLD' && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Recommended Trade Setup
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Entry</span>
                <div className="font-mono font-medium">
                  {formatPrice(action.signal === 'BUY' ? nearestSupport : nearestResistance)}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Target</span>
                <div className="font-mono font-medium text-success">
                  {formatPrice(action.signal === 'BUY' ? nearestResistance : nearestSupport)}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Stop</span>
                <div className="font-mono font-medium text-destructive">
                  {formatPrice(
                    action.signal === 'BUY' 
                      ? (supportLevels[1] || nearestSupport * 0.97)
                      : (resistanceLevels[1] || nearestResistance * 1.03)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Market Status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Market Trend: {trend}</span>
          <span>Analysis Complete ✓</span>
        </div>
      </CardContent>
    </Card>
  );
};
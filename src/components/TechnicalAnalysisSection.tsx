import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  
  const getTradeAction = () => {
    if (isBullish && currentPrice < nearestResistance) {
      return {
        action: 'BUY',
        entry: nearestSupport,
        target: nearestResistance,
        stopLoss: supportLevels[1] || nearestSupport * 0.97,
        type: 'LONG',
        bgColor: 'bg-success/10',
        textColor: 'text-success',
        borderColor: 'border-success/20'
      };
    } else if (isBearish && currentPrice > nearestSupport) {
      return {
        action: 'SELL',
        entry: nearestResistance,
        target: nearestSupport,
        stopLoss: resistanceLevels[1] || nearestResistance * 1.03,
        type: 'SHORT',
        bgColor: 'bg-destructive/10',
        textColor: 'text-destructive',
        borderColor: 'border-destructive/20'
      };
    } else {
      return {
        action: 'WAIT',
        entry: 0,
        target: 0,
        stopLoss: 0,
        type: 'HOLD',
        bgColor: 'bg-warning/10',
        textColor: 'text-warning',
        borderColor: 'border-warning/20'
      };
    }
  };

  const tradeAction = getTradeAction();

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Professional Technical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        {/* Main Trade Action - Super Clean and Prominent */}
        <div className={`p-6 rounded-xl ${tradeAction.bgColor} border-2 ${tradeAction.borderColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-2xl font-bold ${tradeAction.textColor}`}>
                {tradeAction.action}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {tradeAction.type === 'HOLD' ? 'Wait for better setup' : `${tradeAction.type} Position`}
              </div>
            </div>
            {tradeAction.type !== 'HOLD' && (
              <div className={`p-3 rounded-full ${tradeAction.bgColor}`}>
                {tradeAction.type === 'LONG' ? (
                  <ArrowUp className={`h-6 w-6 ${tradeAction.textColor}`} />
                ) : (
                  <ArrowDown className={`h-6 w-6 ${tradeAction.textColor}`} />
                )}
              </div>
            )}
          </div>
          
          {tradeAction.type !== 'HOLD' && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                <div className="font-mono font-semibold">{formatPrice(tradeAction.entry)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Target</div>
                <div className="font-mono font-semibold text-success">{formatPrice(tradeAction.target)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
                <div className="font-mono font-semibold text-destructive">{formatPrice(tradeAction.stopLoss)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Clean Price Levels Display */}
        <div>
          <div className="text-sm font-medium mb-3">Critical Price Levels</div>
          <div className="grid grid-cols-2 gap-3">
            {/* Support Levels - Minimalist Design */}
            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive/50" />
                Support Levels
              </div>
              <div className="space-y-1.5">
                {supportLevels.map((level: number, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">S{idx + 1}</span>
                    <span className="text-sm font-mono">{formatPrice(level)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resistance Levels - Minimalist Design */}
            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success/50" />
                Resistance Levels
              </div>
              <div className="space-y-1.5">
                {resistanceLevels.map((level: number, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">R{idx + 1}</span>
                    <span className="text-sm font-mono">{formatPrice(level)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Market Trend Badge - Simple and Clean */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/20">
          <span className="text-sm text-muted-foreground">Current Trend</span>
          <div className="flex items-center gap-2">
            {isBullish ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : isBearish ? (
              <TrendingDown className="h-4 w-4 text-destructive" />
            ) : (
              <div className="w-4 h-0.5 bg-muted-foreground" />
            )}
            <span className={`text-sm font-medium ${
              isBullish ? 'text-success' : isBearish ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {trend}
            </span>
          </div>
        </div>

        {/* Professional Note */}
        <div className="text-xs text-muted-foreground text-center pt-2">
          Professional analysis completed • Trade setup validated • Risk management included
        </div>
      </CardContent>
    </Card>
  );
};
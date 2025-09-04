import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TradingSignalsProps {
  signal: any;
  marketData: any;
}

export const TradingSignalsSection: React.FC<TradingSignalsProps> = ({ signal, marketData }) => {
  const formatPrice = (value: number) => {
    if (value >= 100) return `$${value.toFixed(2)}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };

  const calculateRiskReward = () => {
    if (!signal || !signal.entry || !signal.stop_loss || !signal.take_profits) return null;
    
    const risk = Math.abs(signal.entry - signal.stop_loss);
    const avgReward = signal.take_profits.reduce((a: number, b: number) => a + b, 0) / signal.take_profits.length - signal.entry;
    return (avgReward / risk).toFixed(2);
  };

  const calculatePercentage = (entry: number, target: number) => {
    return ((target - entry) / entry * 100).toFixed(2);
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Trading Signals
          </CardTitle>
          {signal && (
            <Badge 
              variant="outline" 
              className={`px-4 py-1.5 text-sm font-bold ${
                signal.direction === 'LONG' 
                  ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                  : signal.direction === 'SHORT' 
                  ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                  : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
              }`}
            >
              {signal.direction === 'LONG' && <TrendingUp className="h-4 w-4 mr-1" />}
              {signal.direction === 'SHORT' && <TrendingDown className="h-4 w-4 mr-1" />}
              {signal.direction} Signal
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {signal ? (
          <>
            {/* Confidence & Timeframe */}
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium">Signal Confidence</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      signal.confidence >= 80 ? 'bg-green-500' : 
                      signal.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${signal.confidence}%` }}
                  />
                </div>
                <span className="font-bold text-primary">{signal.confidence}%</span>
              </div>
            </div>

            {/* Entry Point */}
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Entry Zone</span>
                <Badge variant="outline" className="text-xs">Current: {formatPrice(marketData?.price || signal.entry)}</Badge>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(signal.entry)}
              </div>
              {signal.entry_range && (
                <div className="text-sm text-muted-foreground mt-1">
                  Range: {formatPrice(signal.entry_range[0])} - {formatPrice(signal.entry_range[1])}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Stop Loss */}
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Stop Loss</span>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {formatPrice(signal.stop_loss)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Risk: {calculatePercentage(signal.entry, signal.stop_loss)}%
                </div>
              </div>

              {/* Risk/Reward */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Risk/Reward</span>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  1:{calculateRiskReward() || '0'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Number(calculateRiskReward()) >= 2 ? 'Favorable' : 'Review Required'}
                </div>
              </div>
            </div>

            {/* Take Profit Targets */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Take Profit Targets</div>
              <div className="grid grid-cols-3 gap-2">
                {signal.take_profits?.map((tp: number, i: number) => (
                  <div key={i} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-xs text-green-700 font-medium mb-1">TP{i + 1}</div>
                    <div className="font-bold text-green-700">{formatPrice(tp)}</div>
                    <div className="text-xs text-green-600/70 mt-1">
                      +{calculatePercentage(signal.entry, tp)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Key Indicators */}
            {signal.indicators && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Signal Indicators</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <span className={`font-medium ${
                      signal.indicators.rsi14 > 70 ? 'text-red-600' : 
                      signal.indicators.rsi14 < 30 ? 'text-green-600' : 'text-foreground'
                    }`}>
                      {signal.indicators.rsi14?.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">MACD</span>
                    <span className={`font-medium ${
                      signal.indicators.macd_hist > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {signal.indicators.macd_hist > 0 ? 'Bullish' : 'Bearish'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">EMA Cross</span>
                    <span className={`font-medium ${
                      signal.indicators.ema50_above_ema200 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {signal.indicators.ema50_above_ema200 ? 'Bullish' : 'Bearish'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">ATR</span>
                    <span className="font-medium">
                      {(signal.indicators.atr_percent * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No trading signal available. Generate a report to see signals.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
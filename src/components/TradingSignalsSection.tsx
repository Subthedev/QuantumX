import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Activity, Clock, Shield, Zap, DollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface TradingSignalsProps {
  signal: any;
  marketData: any;
  reportGeneratedAt?: string;
}

export const TradingSignalsSection: React.FC<TradingSignalsProps> = ({ signal, marketData, reportGeneratedAt }) => {
  // Validity timer state
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [validityPercent, setValidityPercent] = useState<number>(100);
  
  useEffect(() => {
    if (!reportGeneratedAt && !signal) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const generated = reportGeneratedAt ? new Date(reportGeneratedAt).getTime() : now;
      const elapsed = now - generated;
      
      // Reports are valid for 4 hours for short-term signals, 24 hours for long-term
      const validityDuration = signal?.timeframe === 'SHORT' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const remaining = Math.max(0, validityDuration - elapsed);
      
      // Calculate percentage
      const percent = (remaining / validityDuration) * 100;
      setValidityPercent(percent);
      
      // Format time remaining
      if (remaining === 0) {
        setTimeRemaining('Expired');
      } else {
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [reportGeneratedAt, signal]);
  
  const formatPrice = (value: number) => {
    if (!value || isNaN(value)) return '$0.00';
    if (value >= 100) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };

  const calculateRiskReward = () => {
    if (!signal || !signal.entry || !signal.stop_loss || !signal.take_profits || signal.take_profits.length === 0) return null;
    
    const risk = Math.abs(signal.entry - signal.stop_loss);
    const avgReward = Math.abs(signal.take_profits.reduce((a: number, b: number) => a + b, 0) / signal.take_profits.length - signal.entry);
    return (avgReward / risk).toFixed(2);
  };

  const calculatePercentage = (entry: number, target: number) => {
    if (!entry || !target) return '0.00';
    const percentage = ((target - entry) / entry * 100);
    return percentage >= 0 ? `+${percentage.toFixed(2)}` : percentage.toFixed(2);
  };

  const getPriceDirection = (entry: number, current: number) => {
    const diff = ((current - entry) / entry * 100);
    return diff >= 0 ? '+' : '';
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Trading Signals
          </CardTitle>
          {signal && (
            <div className="flex items-center gap-3">
              {/* Validity Timer */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 rounded-lg border border-border">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Valid for</span>
                  <span className={`text-xs font-bold ${
                    validityPercent > 50 ? 'text-green-600' : 
                    validityPercent > 25 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {timeRemaining}
                  </span>
                </div>
                <Progress value={validityPercent} className="w-12 h-1" />
              </div>
              
              <Badge 
                variant="outline" 
                className={`px-3 py-1.5 text-sm font-bold ${
                  signal.direction === 'LONG' 
                    ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                    : signal.direction === 'SHORT' 
                    ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                    : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                }`}
              >
                {signal.direction === 'LONG' && <TrendingUp className="h-4 w-4 mr-1" />}
                {signal.direction === 'SHORT' && <TrendingDown className="h-4 w-4 mr-1" />}
                {signal.direction}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {signal ? (
          <>
            {/* Signal Strength & Confidence */}
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Signal Strength</span>
                </div>
                <Badge className={`${
                  signal.confidence >= 80 ? 'bg-green-500/10 text-green-700 border-green-500' : 
                  signal.confidence >= 60 ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500' : 
                  'bg-red-500/10 text-red-700 border-red-500'
                }`}>
                  {signal.confidence >= 80 ? 'STRONG' : signal.confidence >= 60 ? 'MODERATE' : 'WEAK'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-background/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      signal.confidence >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                      signal.confidence >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                      'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${signal.confidence}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-foreground min-w-[50px] text-right">{signal.confidence}%</span>
              </div>
            </div>

            {/* Entry Zone with Market Context */}
            <div className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold">Entry Zone</span>
                </div>
                {marketData?.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Market:</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {formatPrice(marketData.price)}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-blue-600 font-mono">
                    {formatPrice(signal.entry)}
                  </div>
                  {signal.entry_range && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      Optimal Range: {formatPrice(signal.entry_range[0])} - {formatPrice(signal.entry_range[1])}
                    </div>
                  )}
                </div>
                {marketData?.price && (
                  <div className={`text-right px-3 py-1.5 rounded-lg ${
                    Math.abs((marketData.price - signal.entry) / signal.entry) < 0.02 
                      ? 'bg-green-500/10 text-green-700 border border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/20'
                  }`}>
                    <span className="text-xs font-medium">
                      {Math.abs((marketData.price - signal.entry) / signal.entry) < 0.02 ? '✓ Near Entry' : '⏳ Wait for Entry'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Management Section */}
            <div className="grid grid-cols-2 gap-3">
              {/* Stop Loss - Clear Risk Display */}
              <div className="p-4 bg-gradient-to-br from-red-500/5 to-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold">Stop Loss</span>
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-bold text-red-600 font-mono">
                    {formatPrice(signal.stop_loss)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Risk:</span>
                    <span className="font-bold text-red-700 font-mono">
                      {calculatePercentage(signal.entry, signal.stop_loss)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Exit if price reaches this level
                  </div>
                </div>
              </div>

              {/* Risk/Reward - Clear Visual Display */}
              <div className="p-4 bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold">Risk : Reward</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-muted-foreground">1</span>
                    <span className="text-lg text-muted-foreground">:</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {calculateRiskReward() || '0'}
                    </span>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${
                    Number(calculateRiskReward()) >= 3 ? 'bg-green-500/10 text-green-700' :
                    Number(calculateRiskReward()) >= 2 ? 'bg-yellow-500/10 text-yellow-700' :
                    'bg-red-500/10 text-red-700'
                  }`}>
                    {Number(calculateRiskReward()) >= 3 ? '✓ Excellent Setup' :
                     Number(calculateRiskReward()) >= 2 ? '✓ Good Setup' :
                     '⚠ Low Reward'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    For every $1 risked, potential ${calculateRiskReward()} reward
                  </div>
                </div>
              </div>
            </div>

            {/* Take Profit Targets - Actionable Layout */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Take Profit Targets</span>
                <span className="text-xs text-muted-foreground">Scale out at each level</span>
              </div>
              <div className="space-y-2">
                {signal.take_profits?.map((tp: number, i: number) => {
                  const percentGain = calculatePercentage(signal.entry, tp);
                  const isConservative = i === 0;
                  const isModerate = i === 1;
                  const isAggressive = i === 2;
                  
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-500/5 to-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Badge className="bg-green-600 text-white text-xs">
                          TP{i + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {isConservative ? '(Safe)' : isModerate ? '(Target)' : '(Max)'}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-bold text-green-700 font-mono">
                          {formatPrice(tp)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-green-600">
                            {percentGain}%
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {isConservative ? '33% exit' : isModerate ? '33% exit' : '34% exit'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Technical Indicators - Compact View */}
            {signal.indicators && (
              <div className="space-y-3">
                <span className="text-sm font-semibold text-foreground">Supporting Indicators</span>
                <div className="grid grid-cols-2 gap-2">
                  {/* RSI */}
                  <div className="flex items-center justify-between p-2.5 bg-background/50 rounded-lg border">
                    <span className="text-xs text-muted-foreground">RSI(14)</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        signal.indicators.rsi14 > 70 ? 'text-red-600' : 
                        signal.indicators.rsi14 < 30 ? 'text-green-600' : 'text-foreground'
                      }`}>
                        {signal.indicators.rsi14?.toFixed(1)}
                      </span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {signal.indicators.rsi14 > 70 ? 'OB' : signal.indicators.rsi14 < 30 ? 'OS' : 'N'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* MACD */}
                  <div className="flex items-center justify-between p-2.5 bg-background/50 rounded-lg border">
                    <span className="text-xs text-muted-foreground">MACD</span>
                    <Badge className={`text-xs ${
                      signal.indicators.macd_hist > 0 
                        ? 'bg-green-500/10 text-green-700 border-green-500' 
                        : 'bg-red-500/10 text-red-700 border-red-500'
                    }`}>
                      {signal.indicators.macd_hist > 0 ? '↑ Bull' : '↓ Bear'}
                    </Badge>
                  </div>
                  
                  {/* EMA Cross */}
                  <div className="flex items-center justify-between p-2.5 bg-background/50 rounded-lg border">
                    <span className="text-xs text-muted-foreground">EMA 50/200</span>
                    <Badge className={`text-xs ${
                      signal.indicators.ema50_above_ema200 
                        ? 'bg-green-500/10 text-green-700 border-green-500' 
                        : 'bg-red-500/10 text-red-700 border-red-500'
                    }`}>
                      {signal.indicators.ema50_above_ema200 ? 'Golden Cross' : 'Death Cross'}
                    </Badge>
                  </div>
                  
                  {/* Volatility */}
                  <div className="flex items-center justify-between p-2.5 bg-background/50 rounded-lg border">
                    <span className="text-xs text-muted-foreground">Volatility</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {(signal.indicators.atr_percent * 100).toFixed(1)}%
                      </span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {signal.indicators.atr_percent > 0.05 ? 'High' : signal.indicators.atr_percent > 0.02 ? 'Med' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No trading signal available</p>
            <p className="text-sm mt-1">Generate a report to see actionable signals</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Activity, Clock, Shield, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
interface TradingSignalsProps {
  signal: any;
  marketData: any;
  reportGeneratedAt?: string;
  coinSymbol?: string;
}
export const TradingSignalsSection: React.FC<TradingSignalsProps> = ({
  signal,
  marketData,
  reportGeneratedAt,
  coinSymbol = 'BTC'
}) => {
  // 4-hour validity timer state
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [validityPercent, setValidityPercent] = useState<number>(100);
  useEffect(() => {
    if (!reportGeneratedAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const generated = new Date(reportGeneratedAt).getTime();
      const elapsed = now - generated;

      // 4-hour validity for all signals (4H timeframe)
      const validityDuration = 4 * 60 * 60 * 1000;
      const remaining = Math.max(0, validityDuration - elapsed);

      // Calculate percentage
      const percent = remaining / validityDuration * 100;
      setValidityPercent(percent);

      // Format time remaining with seconds for real-time countdown
      if (remaining === 0) {
        setTimeRemaining('Expired');
      } else {
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor(remaining % (60 * 60 * 1000) / (60 * 1000));
        const seconds = Math.floor(remaining % (60 * 1000) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [reportGeneratedAt]);
  const formatPrice = (value: number) => {
    if (!value || isNaN(value)) return '$0.00';
    if (value >= 100) return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };
  const calculateRiskReward = () => {
    if (!signal || !signal.entry || !signal.stop_loss || !signal.take_profits || signal.take_profits.length === 0) return null;
    const risk = Math.abs(signal.entry - signal.stop_loss);
    const avgReward = Math.abs(signal.take_profits[1] - signal.entry); // Use middle target for R:R
    return (avgReward / risk).toFixed(1);
  };
  const calculatePercentage = (entry: number, target: number) => {
    if (!entry || !target) return '0.00';
    const percentage = (target - entry) / entry * 100;
    return percentage > 0 ? `+${percentage.toFixed(2)}` : percentage.toFixed(2);
  };
  return <TooltipProvider>
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Trading Signal
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">This signal is based on <strong>4H timeframe technical analysis</strong> and may differ from longer-term sentiment. Short-term corrections can occur even in bullish markets.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              {/* Coin Identification */}
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-lg border border-border">
                {coinSymbol === 'BTC' ? <BTCLogo className="w-5 h-5" /> : <ETHLogo className="w-5 h-5" />}
                <span className="font-bold text-sm">{coinSymbol}</span>
              </div>
            </div>
            {signal && <div className="flex items-center gap-3">
                {/* 4H Timeframe Badge with Tooltip */}
                <Tooltip>
                  <TooltipTrigger>
                    
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Signal based on 4-hour candlestick patterns</p>
                  </TooltipContent>
                </Tooltip>
              
              {/* Validity Timer */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 rounded-lg border border-border">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Valid</span>
                  <span className={`text-xs font-bold ${validityPercent > 50 ? 'text-green-600' : validityPercent > 25 ? 'text-blue-600' : 'text-red-600'}`}>
                    {timeRemaining}
                  </span>
                </div>
              </div>
              
              {/* Direction Badge */}
              <Badge variant="outline" className={`px-3 py-1.5 text-sm font-bold ${signal.direction === 'LONG' ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30'}`}>
                {signal.direction === 'LONG' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {signal.direction}
              </Badge>
            </div>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {signal ? <>
            {/* Signal Confidence - Simplified */}
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Signal Confidence</span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-background/50 rounded-full h-2 overflow-hidden w-24">
                    <div className={`h-full rounded-full transition-all duration-500 ${signal.confidence >= 75 ? 'bg-green-500' : signal.confidence >= 50 ? 'bg-blue-500' : 'bg-red-500'}`} style={{
                    width: `${signal.confidence}%`
                  }} />
                  </div>
                  <span className="text-sm font-bold min-w-[40px] text-right">{signal.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Entry Zone - Clean and Actionable */}
            <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold">Entry Price</span>
                </div>
                {marketData?.price && <span className="text-xs text-muted-foreground">
                    Current: {formatPrice(marketData.price)}
                  </span>}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(signal.entry)}
              </div>
              {signal.entry_range && <div className="text-xs text-muted-foreground mt-1">
                  Range: {formatPrice(signal.entry_range[0])} - {formatPrice(signal.entry_range[1])}
                </div>}
            </div>

            {/* Risk Management - Clear and Simple */}
            <div className="grid grid-cols-2 gap-3">
              {/* Stop Loss */}
              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-medium">Stop Loss</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {formatPrice(signal.stop_loss)}
                </div>
                <div className="text-xs text-red-600 font-medium mt-1">
                  {calculatePercentage(signal.entry, signal.stop_loss)}%
                </div>
              </div>

              {/* Risk/Reward Ratio */}
              <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium">Risk/Reward</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">1 :</span>
                  <span className="text-lg font-bold text-blue-600">
                    {calculateRiskReward() || '0'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Number(calculateRiskReward()) >= 2 ? 'Good Setup' : 'Low Reward'}
                </div>
              </div>
            </div>

            {/* Take Profit Targets - Clean Layout */}
            <div className="space-y-2">
              <span className="text-sm font-semibold">Take Profit Targets</span>
              {signal.take_profits?.map((tp: number, i: number) => {
              const percentGain = calculatePercentage(signal.entry, tp);
              return <div key={i} className="flex items-center gap-3 p-2.5 bg-green-500/5 rounded-lg border border-green-500/20">
                    <Badge className="bg-green-600 text-white text-xs min-w-[40px]">
                      TP{i + 1}
                    </Badge>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-bold text-green-700 text-sm">
                        {formatPrice(tp)}
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        +{percentGain.replace(/^[+-]/, '')}%
                      </span>
                    </div>
                  </div>;
            })}
            </div>

            <Separator className="my-3" />

            {/* Key Indicators - Minimal View */}
            {signal.indicators && <div className="grid grid-cols-3 gap-2">
                {/* RSI */}
                <div className="p-2 bg-background/50 rounded-lg border text-center">
                  <span className="text-xs text-muted-foreground block">RSI</span>
                  <span className={`text-sm font-bold ${signal.indicators.rsi14 > 70 ? 'text-red-600' : signal.indicators.rsi14 < 30 ? 'text-green-600' : 'text-foreground'}`}>
                    {signal.indicators.rsi14?.toFixed(0)}
                  </span>
                </div>
                
                {/* MACD */}
                <div className="p-2 bg-background/50 rounded-lg border text-center">
                  <span className="text-xs text-muted-foreground block">MACD</span>
                  <span className={`text-sm font-bold ${signal.indicators.macd_hist > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {signal.indicators.macd_hist > 0 ? '↑' : '↓'}
                  </span>
                </div>
                
                {/* Trend */}
                <div className="p-2 bg-background/50 rounded-lg border text-center">
                  <span className="text-xs text-muted-foreground block">Trend</span>
                  <span className={`text-sm font-bold ${signal.indicators.ema50_above_ema200 ? 'text-green-600' : 'text-red-600'}`}>
                    {signal.indicators.ema50_above_ema200 ? 'Bull' : 'Bear'}
                  </span>
                </div>
              </div>}
          </> : <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No trading signal available</p>
            <p className="text-sm mt-1">Generate a 4H report to see actionable signals</p>
          </div>}
      </CardContent>
    </Card>
    </TooltipProvider>;
};
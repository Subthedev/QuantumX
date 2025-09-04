import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, BarChart3, Target, AlertCircle } from 'lucide-react';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';

interface TechnicalAnalysisProps {
  signal: any;
  marketData: any;
  symbol?: string;
}

export const CompleteTechnicalAnalysisDashboard: React.FC<TechnicalAnalysisProps> = ({ 
  signal, 
  marketData,
  symbol = 'BTC'
}) => {
  // Get current price from market data or signal
  const currentPrice = marketData?.price || signal?.entry || 0;
  
  // Calculate key levels from signal data
  const keyLevels = signal ? {
    entry: signal.entry,
    stopLoss: signal.stop_loss,
    tp1: signal.take_profits?.[0],
    tp2: signal.take_profits?.[1],
    tp3: signal.take_profits?.[2],
  } : null;

  // Get indicator values from signal
  const indicators = signal?.indicators || {};
  
  // Determine trend strength
  const getTrendStrength = () => {
    if (!signal) return 'NEUTRAL';
    const rsi = indicators.rsi14 || 50;
    const macdHist = indicators.macd_hist || 0;
    
    if (rsi > 70 && macdHist > 0) return 'STRONG BULLISH';
    if (rsi > 60 && macdHist > 0) return 'BULLISH';
    if (rsi < 30 && macdHist < 0) return 'STRONG BEARISH';
    if (rsi < 40 && macdHist < 0) return 'BEARISH';
    return 'NEUTRAL';
  };

  const trendStrength = getTrendStrength();
  const isBtc = symbol.toUpperCase() === 'BTC';

  return (
    <Card className="border-2 border-accent/20 shadow-xl bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Complete Technical Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isBtc ? <BTCLogo className="h-4 w-4" /> : <ETHLogo className="h-4 w-4" />}
              <span className="text-sm font-medium text-muted-foreground">{symbol}/USD</span>
            </div>
            <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded font-medium">
              4H TIMEFRAME
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {signal ? (
          <>
            {/* Market Overview */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Market Overview</span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  signal.direction === 'LONG' ? 'bg-green-500/10 text-green-500' : 
                  signal.direction === 'SHORT' ? 'bg-red-500/10 text-red-500' : 
                  'bg-blue-500/10 text-blue-500'
                }`}>
                  {signal.direction} SIGNAL
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                  <div className="text-lg font-bold text-foreground">
                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">24h Change</div>
                  <div className={`text-lg font-bold ${marketData?.percentChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {marketData?.percentChange24h >= 0 ? '+' : ''}{marketData?.percentChange24h?.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Key Technical Indicators */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Key Technical Indicators</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
                  <div className={`text-lg font-bold ${
                    indicators.rsi14 > 70 ? 'text-red-500' : 
                    indicators.rsi14 < 30 ? 'text-green-500' : 
                    'text-foreground'
                  }`}>
                    {indicators.rsi14?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {indicators.rsi14 > 70 ? 'Overbought' : 
                     indicators.rsi14 < 30 ? 'Oversold' : 
                     'Neutral'}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">MACD Histogram</div>
                  <div className={`text-lg font-bold ${
                    indicators.macd_hist > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {indicators.macd_hist?.toFixed(2) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {indicators.macd_hist > 0 ? 'Bullish' : 'Bearish'}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">EMA Cross</div>
                  <div className={`text-lg font-bold ${
                    indicators.ema50_above_ema200 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {indicators.ema50_above_ema200 ? 'BULL' : 'BEAR'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    EMA50 {indicators.ema50_above_ema200 ? '>' : '<'} EMA200
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">ATR Volatility</div>
                  <div className="text-lg font-bold text-foreground">
                    {indicators.atr_percent?.toFixed(2) || 'N/A'}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {indicators.atr_percent > 5 ? 'High Volatility' : 
                     indicators.atr_percent > 3 ? 'Moderate' : 
                     'Low Volatility'}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Trend Strength</div>
                  <div className={`text-lg font-bold ${
                    trendStrength.includes('BULLISH') ? 'text-green-500' : 
                    trendStrength.includes('BEARISH') ? 'text-red-500' : 
                    'text-blue-500'
                  }`}>
                    {trendStrength}
                  </div>
                </div>
              </div>
            </div>

            {/* Support & Resistance Levels */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Key Price Levels</span>
              </div>
              
              <div className="space-y-2">
                {/* Resistance Levels */}
                {keyLevels?.tp3 && (
                  <div className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                    <span className="text-sm font-medium text-red-600">Strong Resistance (TP3)</span>
                    <span className="text-sm font-bold text-red-500">
                      ${keyLevels.tp3.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {keyLevels?.tp2 && (
                  <div className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                    <span className="text-sm font-medium text-red-600">Resistance (TP2)</span>
                    <span className="text-sm font-bold text-red-500">
                      ${keyLevels.tp2.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {keyLevels?.tp1 && (
                  <div className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                    <span className="text-sm font-medium text-red-600">Near Resistance (TP1)</span>
                    <span className="text-sm font-bold text-red-500">
                      ${keyLevels.tp1.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {/* Entry Level */}
                <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <span className="text-sm font-medium text-blue-600">Entry Zone</span>
                  <span className="text-sm font-bold text-blue-500">
                    ${keyLevels?.entry.toFixed(2)}
                  </span>
                </div>
                
                {/* Support Level */}
                <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span className="text-sm font-medium text-green-600">Key Support (Stop Loss)</span>
                  <span className="text-sm font-bold text-green-500">
                    ${keyLevels?.stopLoss.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Action Summary */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Technical Analysis Summary</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span className="text-muted-foreground">
                    {signal.direction === 'LONG' ? 'Bullish' : signal.direction === 'SHORT' ? 'Bearish' : 'Neutral'} setup detected on 4H timeframe with {signal.confidence}% confidence
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span className="text-muted-foreground">
                    RSI at {indicators.rsi14?.toFixed(1)} - {
                      indicators.rsi14 > 70 ? 'Overbought zone, consider waiting for pullback' : 
                      indicators.rsi14 < 30 ? 'Oversold zone, potential bounce expected' : 
                      'Neutral zone, good for entry'
                    }
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span className="text-muted-foreground">
                    {indicators.ema50_above_ema200 ? 'EMA50 above EMA200 confirms uptrend' : 'EMA50 below EMA200 indicates downtrend'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span className="text-muted-foreground">
                    Volatility at {indicators.atr_percent?.toFixed(2)}% - {
                      indicators.atr_percent > 5 ? 'High volatility, use wider stops' : 
                      indicators.atr_percent > 3 ? 'Moderate volatility, normal position size' : 
                      'Low volatility, potential breakout pending'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Trade Execution Levels */}
            <div className={`p-3 rounded-lg border-2 ${
              signal.confidence >= 80 ? 'bg-green-500/10 border-green-500/30' : 
              signal.confidence >= 60 ? 'bg-blue-500/10 border-blue-500/30' : 
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Technical Signal Strength</span>
                <span className={`text-sm font-bold ${
                  signal.confidence >= 80 ? 'text-green-500' : 
                  signal.confidence >= 60 ? 'text-blue-500' : 
                  'text-red-500'
                }`}>
                  {signal.confidence >= 80 ? 'STRONG' : 
                   signal.confidence >= 60 ? 'MODERATE' : 
                   'WEAK'} ({signal.confidence}%)
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No technical analysis data available. Generate a report to see complete technical analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
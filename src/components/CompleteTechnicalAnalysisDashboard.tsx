import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Target,
  Activity
} from 'lucide-react';
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
  if (!signal?.technicalAnalysis && !signal?.indicators) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Technical Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No technical analysis data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const indicators = signal?.indicators || {};
  const isBtc = symbol.toUpperCase().includes('BTC');
  
  // Simplified decision logic
  const getDecision = () => {
    const rsi = indicators.rsi14 || 50;
    const macdHist = indicators.macd_hist || 0;
    const confidence = signal.confidence || 0;
    
    // Clear overbought/oversold conditions
    if (rsi > 75) return { action: 'WAIT', reason: 'Overbought - Wait for pullback', color: 'text-warning', icon: AlertTriangle };
    if (rsi < 25) return { action: 'WAIT', reason: 'Oversold - Wait for bounce', color: 'text-warning', icon: AlertTriangle };
    
    // Strong signals
    if (confidence >= 70 && signal.direction === 'LONG' && macdHist > 0 && rsi < 65) {
      return { action: 'BUY', reason: 'Strong bullish setup', color: 'text-success', icon: CheckCircle2 };
    }
    if (confidence >= 70 && signal.direction === 'SHORT' && macdHist < 0 && rsi > 35) {
      return { action: 'SELL', reason: 'Strong bearish setup', color: 'text-destructive', icon: CheckCircle2 };
    }
    
    // Moderate signals
    if (confidence >= 50) {
      return { action: 'MONITOR', reason: 'Moderate signal - Monitor closely', color: 'text-primary', icon: Activity };
    }
    
    return { action: 'AVOID', reason: 'Weak signal - Avoid trading', color: 'text-muted-foreground', icon: XCircle };
  };

  const decision = getDecision();
  const DecisionIcon = decision.icon;
  
  // Calculate overall market score (0-100)
  const getMarketScore = () => {
    let score = 0;
    
    // Trend alignment (40 points max)
    if (indicators.ema50_above_ema200) {
      score += signal.direction === 'LONG' ? 40 : 10;
    } else {
      score += signal.direction === 'SHORT' ? 40 : 10;
    }
    
    // RSI health (30 points max)
    const rsi = indicators.rsi14 || 50;
    if (rsi >= 30 && rsi <= 70) {
      score += 30;
    } else if (rsi >= 25 && rsi <= 75) {
      score += 15;
    }
    
    // MACD momentum (30 points max)
    if ((signal.direction === 'LONG' && indicators.macd_hist > 0) ||
        (signal.direction === 'SHORT' && indicators.macd_hist < 0)) {
      score += 30;
    }
    
    return Math.min(100, Math.max(0, score));
  };

  const marketScore = getMarketScore();
  
  // Get market condition
  const getMarketCondition = () => {
    if (marketScore >= 80) return { label: 'EXCELLENT', color: 'text-success', bgColor: 'bg-success/10' };
    if (marketScore >= 60) return { label: 'GOOD', color: 'text-primary', bgColor: 'bg-primary/10' };
    if (marketScore >= 40) return { label: 'NEUTRAL', color: 'text-warning', bgColor: 'bg-warning/10' };
    return { label: 'POOR', color: 'text-destructive', bgColor: 'bg-destructive/10' };
  };

  const marketCondition = getMarketCondition();

  return (
    <Card className="border-2 border-accent/20 shadow-xl bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            AI Technical Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {isBtc ? <BTCLogo className="h-4 w-4" /> : <ETHLogo className="h-4 w-4" />}
            <span className="text-sm font-medium">{symbol}/USD</span>
            <Badge variant="outline" className="text-xs">4H</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* MAIN DECISION CARD - Clear and Prominent */}
        <div className={`rounded-lg p-4 border-2 ${
          decision.action === 'BUY' ? 'bg-success/5 border-success/30' :
          decision.action === 'SELL' ? 'bg-destructive/5 border-destructive/30' :
          decision.action === 'MONITOR' ? 'bg-primary/5 border-primary/30' :
          decision.action === 'WAIT' ? 'bg-warning/5 border-warning/30' :
          'bg-muted/30 border-muted'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DecisionIcon className={`h-5 w-5 ${decision.color}`} />
              <span className="text-lg font-bold">AI Decision</span>
            </div>
            <Badge 
              variant={
                decision.action === 'BUY' ? 'default' :
                decision.action === 'SELL' ? 'destructive' :
                'secondary'
              }
              className="text-sm px-3 py-1"
            >
              {decision.action}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{decision.reason}</p>
          
          {/* Entry and Exit Points - Only show if actionable */}
          {(decision.action === 'BUY' || decision.action === 'SELL' || decision.action === 'MONITOR') && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-xs text-muted-foreground">Entry</div>
                <div className="text-sm font-bold">${signal.entry?.toFixed(2)}</div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-xs text-muted-foreground">Stop Loss</div>
                <div className="text-sm font-bold text-destructive">${signal.stop_loss?.toFixed(2)}</div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-xs text-muted-foreground">Target</div>
                <div className="text-sm font-bold text-success">${signal.take_profits?.[0]?.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {/* MARKET SCORE - Visual and Clear */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Market Score</span>
            </div>
            <Badge className={`${marketCondition.bgColor} ${marketCondition.color} border-0`}>
              {marketCondition.label}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {/* Overall Score Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Overall Score</span>
                <span className="font-bold">{marketScore}/100</span>
              </div>
              <Progress value={marketScore} className="h-3" />
            </div>
            
            {/* Key Metrics Grid - Simplified */}
            <div className="grid grid-cols-3 gap-2">
              {/* Trend */}
              <div className="bg-background/50 rounded p-2">
                <div className="text-xs text-muted-foreground mb-1">Trend</div>
                <div className="flex items-center gap-1">
                  {indicators.ema50_above_ema200 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-xs font-bold">
                    {indicators.ema50_above_ema200 ? 'Bullish' : 'Bearish'}
                  </span>
                </div>
              </div>
              
              {/* Momentum */}
              <div className="bg-background/50 rounded p-2">
                <div className="text-xs text-muted-foreground mb-1">Momentum</div>
                <div className="flex items-center gap-1">
                  {indicators.macd_hist > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-success" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-xs font-bold">
                    {Math.abs(indicators.macd_hist || 0).toFixed(1)}
                  </span>
                </div>
              </div>
              
              {/* RSI */}
              <div className="bg-background/50 rounded p-2">
                <div className="text-xs text-muted-foreground mb-1">RSI</div>
                <div className="text-xs font-bold">
                  {indicators.rsi14?.toFixed(0) || 'N/A'}
                  <span className={`ml-1 ${
                    indicators.rsi14 > 70 ? 'text-destructive' :
                    indicators.rsi14 < 30 ? 'text-success' :
                    'text-muted-foreground'
                  }`}>
                    {indicators.rsi14 > 70 ? '↑' :
                     indicators.rsi14 < 30 ? '↓' :
                     '→'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KEY INSIGHTS - Actionable Points Only */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Key Insights</span>
          </div>
          
          {/* Dynamic insights based on current conditions */}
          <div className="space-y-2">
            {/* Signal Strength */}
            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
              <div className={`h-2 w-2 rounded-full ${
                signal.confidence >= 70 ? 'bg-success' :
                signal.confidence >= 50 ? 'bg-warning' :
                'bg-destructive'
              }`} />
              <span className="text-xs">
                Signal Confidence: <span className="font-bold">{signal.confidence}%</span>
                {signal.confidence >= 70 ? ' - High reliability' :
                 signal.confidence >= 50 ? ' - Moderate reliability' :
                 ' - Low reliability'}
              </span>
            </div>
            
            {/* Volatility Alert */}
            {indicators.atr_percent > 5 && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <span className="text-xs">
                  High Volatility ({indicators.atr_percent?.toFixed(1)}%) - Use wider stops
                </span>
              </div>
            )}
            
            {/* Trend Alignment */}
            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
              <div className={`h-2 w-2 rounded-full ${
                (signal.direction === 'LONG' && indicators.ema50_above_ema200) ||
                (signal.direction === 'SHORT' && !indicators.ema50_above_ema200)
                  ? 'bg-success' : 'bg-warning'
              }`} />
              <span className="text-xs">
                {(signal.direction === 'LONG' && indicators.ema50_above_ema200) ||
                 (signal.direction === 'SHORT' && !indicators.ema50_above_ema200)
                  ? '✓ Trend aligned with signal' 
                  : '⚠ Signal against trend - Higher risk'}
              </span>
            </div>
          </div>
        </div>

        {/* RISK/REWARD - Only if actionable */}
        {(decision.action === 'BUY' || decision.action === 'SELL' || decision.action === 'MONITOR') && signal.stop_loss && signal.take_profits?.[0] && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Risk/Reward Ratio</span>
              <span className="text-sm font-bold">
                1:{((signal.take_profits[0] - signal.entry) / (signal.entry - signal.stop_loss)).toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
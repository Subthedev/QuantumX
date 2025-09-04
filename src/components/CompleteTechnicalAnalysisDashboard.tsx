import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Brain, 
  Target, 
  AlertTriangle,
  Zap,
  ChevronUp,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  // Get current price from market data or signal
  const currentPrice = marketData?.price || signal?.entry || 0;
  const indicators = signal?.indicators || {};
  const isBtc = symbol.toUpperCase().includes('BTC');
  
  // Simplified trend calculation
  const getTrend = () => {
    const rsi = indicators.rsi14 || 50;
    const macdHist = indicators.macd_hist || 0;
    const emaAligned = indicators.ema50_above_ema200;
    
    if (rsi > 60 && macdHist > 0 && emaAligned) return { trend: 'BULLISH', strength: 85, color: 'text-success' };
    if (rsi > 50 && macdHist > 0) return { trend: 'MILD BULLISH', strength: 65, color: 'text-success/80' };
    if (rsi < 40 && macdHist < 0 && !emaAligned) return { trend: 'BEARISH', strength: 25, color: 'text-destructive' };
    if (rsi < 50 && macdHist < 0) return { trend: 'MILD BEARISH', strength: 35, color: 'text-destructive/80' };
    return { trend: 'NEUTRAL', strength: 50, color: 'text-warning' };
  };

  const trendData = getTrend();
  
  // Calculate signal quality score
  const getSignalQuality = () => {
    let score = 0;
    
    // RSI alignment
    if ((signal.direction === 'LONG' && indicators.rsi14 < 70 && indicators.rsi14 > 30) ||
        (signal.direction === 'SHORT' && indicators.rsi14 > 30 && indicators.rsi14 < 70)) {
      score += 25;
    }
    
    // MACD alignment
    if ((signal.direction === 'LONG' && indicators.macd_hist > 0) ||
        (signal.direction === 'SHORT' && indicators.macd_hist < 0)) {
      score += 25;
    }
    
    // EMA alignment
    if ((signal.direction === 'LONG' && indicators.ema50_above_ema200) ||
        (signal.direction === 'SHORT' && !indicators.ema50_above_ema200)) {
      score += 25;
    }
    
    // Confidence bonus
    if (signal.confidence >= 70) score += 25;
    
    return score;
  };

  const signalQuality = getSignalQuality();

  // Get actionable recommendations
  const getRecommendations = () => {
    const recs = [];
    
    if (indicators.rsi14 > 70) {
      recs.push({ icon: AlertTriangle, text: "RSI Overbought - Wait for pullback", type: "warning" });
    } else if (indicators.rsi14 < 30) {
      recs.push({ icon: AlertTriangle, text: "RSI Oversold - Potential bounce", type: "warning" });
    }
    
    if (indicators.atr_percent > 5) {
      recs.push({ icon: Activity, text: "High volatility - Use wider stops", type: "info" });
    }
    
    if (signal.confidence >= 70) {
      recs.push({ icon: CheckCircle2, text: "Strong signal - Good entry opportunity", type: "success" });
    }
    
    if (indicators.ema50_above_ema200 && signal.direction === 'LONG') {
      recs.push({ icon: TrendingUp, text: "Trend aligned with signal", type: "success" });
    } else if (!indicators.ema50_above_ema200 && signal.direction === 'SHORT') {
      recs.push({ icon: TrendingDown, text: "Trend aligned with signal", type: "success" });
    }
    
    return recs;
  };

  const recommendations = getRecommendations();

  return (
    <TooltipProvider>
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
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* AI Signal Overview - Simplified */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">AI Signal</span>
              </div>
              <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'} className="px-3">
                {signal.direction} {signal.confidence}%
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                <div className="text-lg font-bold">${signal.entry?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
                <div className="text-lg font-bold text-destructive">${signal.stop_loss?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Take Profit</div>
                <div className="text-lg font-bold text-success">${signal.take_profits?.[0]?.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Signal Quality Score */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Signal Quality</span>
                <span className="text-xs font-medium">{signalQuality}%</span>
              </div>
              <Progress value={signalQuality} className="h-2" />
            </div>
          </div>

          {/* Simplified Tabs for Analysis */}
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick">Quick View</TabsTrigger>
              <TabsTrigger value="indicators">Indicators</TabsTrigger>
              <TabsTrigger value="action">Action Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick" className="space-y-3 mt-3">
              {/* Market Trend Card */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Market Trend</span>
                  <Badge variant="outline" className={trendData.color}>
                    {trendData.trend}
                  </Badge>
                </div>
                <Progress value={trendData.strength} className="h-3" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Bearish</span>
                  <span>Neutral</span>
                  <span>Bullish</span>
                </div>
              </div>
              
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-lg p-3 border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Momentum</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Based on MACD and RSI alignment</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {indicators.macd_hist > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-bold">
                      {indicators.macd_hist > 0 ? 'Positive' : 'Negative'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Volatility</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>ATR-based volatility measure</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className={`h-4 w-4 ${indicators.atr_percent > 5 ? 'text-warning' : 'text-primary'}`} />
                    <span className="text-sm font-bold">
                      {indicators.atr_percent > 5 ? 'High' : indicators.atr_percent > 3 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="indicators" className="space-y-3 mt-3">
              {/* Key Indicators Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* RSI Indicator */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">RSI (14)</span>
                    <Badge variant={
                      indicators.rsi14 > 70 ? 'destructive' : 
                      indicators.rsi14 < 30 ? 'default' : 
                      'secondary'
                    } className="text-xs">
                      {indicators.rsi14?.toFixed(0)}
                    </Badge>
                  </div>
                  <Progress 
                    value={indicators.rsi14 || 50} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {indicators.rsi14 > 70 ? '⚠️ Overbought' : 
                     indicators.rsi14 < 30 ? '⚠️ Oversold' : 
                     '✓ Neutral Zone'}
                  </div>
                </div>
                
                {/* MACD Indicator */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">MACD</span>
                    <Badge variant={indicators.macd_hist > 0 ? 'default' : 'destructive'} className="text-xs">
                      {indicators.macd_hist > 0 ? 'Bullish' : 'Bearish'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {indicators.macd_hist > 0 ? (
                      <ChevronUp className="h-4 w-4 text-success" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-semibold">{indicators.macd_hist?.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* EMA Cross */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">EMA Cross</span>
                    <Badge variant={indicators.ema50_above_ema200 ? 'default' : 'destructive'} className="text-xs">
                      {indicators.ema50_above_ema200 ? 'Bullish' : 'Bearish'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    EMA50 {indicators.ema50_above_ema200 ? 'above' : 'below'} EMA200
                  </div>
                </div>
                
                {/* ATR Volatility */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">ATR Volatility</span>
                    <Badge variant="secondary" className="text-xs">
                      {indicators.atr_percent?.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {indicators.atr_percent > 5 ? '🔥 High' : 
                     indicators.atr_percent > 3 ? '⚡ Medium' : 
                     '💤 Low'}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="action" className="space-y-3 mt-3">
              {/* AI Recommendations */}
              <div className="space-y-2">
                {recommendations.map((rec, idx) => {
                  const Icon = rec.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        rec.type === 'success' ? 'bg-success/5 border-success/20' :
                        rec.type === 'warning' ? 'bg-warning/5 border-warning/20' :
                        'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${
                        rec.type === 'success' ? 'text-success' :
                        rec.type === 'warning' ? 'text-warning' :
                        'text-primary'
                      }`} />
                      <span className="text-sm">{rec.text}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Trading Checklist */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Pre-Trade Checklist</span>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="rounded" />
                    <span>Risk management plan in place</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="rounded" />
                    <span>Position size calculated</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="rounded" />
                    <span>Stop loss and targets set</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="rounded" />
                    <span>Market conditions reviewed</span>
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Bottom Action Bar */}
          <div className={`p-3 rounded-lg border-2 ${
            signal.confidence >= 70 ? 'bg-success/5 border-success/20' : 
            signal.confidence >= 50 ? 'bg-warning/5 border-warning/20' : 
            'bg-destructive/5 border-destructive/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {signal.confidence >= 70 ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : signal.confidence >= 50 ? (
                  <Clock className="h-4 w-4 text-warning" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {signal.confidence >= 70 ? 'Ready to Trade' : 
                   signal.confidence >= 50 ? 'Monitor Closely' : 
                   'Wait for Better Setup'}
                </span>
              </div>
              <Badge variant={signal.confidence >= 70 ? 'default' : signal.confidence >= 50 ? 'secondary' : 'destructive'}>
                {signal.confidence}% Confidence
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
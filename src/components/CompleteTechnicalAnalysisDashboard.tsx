import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, LineChart, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

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
  if (!signal?.indicators) {
    return null;
  }

  const indicators = signal?.indicators || {};
  const rsi = indicators.rsi14 || indicators.RSI || 50;
  const macd = indicators.macd_hist || indicators.MACD || 0;
  const confidence = signal?.confidence || 50;
  const currentPrice = marketData?.current_price || signal?.entry || 0;
  
  // Calculate support and resistance levels
  const calculateLevels = () => {
    const price = currentPrice;
    const volatility = 0.02; // 2% volatility for level calculation
    
    return {
      resistance: [
        price * (1 + volatility),
        price * (1 + volatility * 2),
        price * (1 + volatility * 3)
      ],
      support: [
        price * (1 - volatility),
        price * (1 - volatility * 2),
        price * (1 - volatility * 3)
      ]
    };
  };
  
  const levels = calculateLevels();
  
  // Clear, actionable decision logic
  const getDecision = () => {
    // Extreme conditions - clear signals
    if (rsi > 75 && macd < 0) {
      return { 
        action: 'SELL NOW', 
        description: 'Overbought - Strong sell signal', 
        instruction: 'Exit positions or short',
        confidence: 'HIGH',
        color: 'text-destructive', 
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        icon: TrendingDown 
      };
    }
    
    if (rsi < 25 && macd > 0) {
      return { 
        action: 'BUY NOW', 
        description: 'Oversold - Strong buy signal', 
        instruction: 'Enter long position',
        confidence: 'HIGH',
        color: 'text-success', 
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
        icon: TrendingUp 
      };
    }
    
    // Moderate bullish
    if (confidence >= 65 && macd > 0 && rsi > 40 && rsi < 70) {
      return { 
        action: 'BUY', 
        description: 'Bullish momentum building', 
        instruction: 'Consider opening position',
        confidence: 'MEDIUM-HIGH',
        color: 'text-success', 
        bgColor: 'bg-success/5',
        borderColor: 'border-success/20',
        icon: TrendingUp 
      };
    }
    
    // Moderate bearish
    if (confidence >= 65 && macd < 0 && rsi > 30 && rsi < 60) {
      return { 
        action: 'SELL', 
        description: 'Bearish pressure increasing', 
        instruction: 'Consider reducing exposure',
        confidence: 'MEDIUM-HIGH',
        color: 'text-destructive', 
        bgColor: 'bg-destructive/5',
        borderColor: 'border-destructive/20',
        icon: TrendingDown 
      };
    }
    
    // Neutral/Wait
    return { 
      action: 'WAIT', 
      description: 'No clear direction', 
      instruction: 'Hold current positions',
      confidence: 'LOW',
      color: 'text-warning', 
      bgColor: 'bg-warning/5',
      borderColor: 'border-warning/20',
      icon: Activity 
    };
  };

  const decision = getDecision();
  const Icon = decision.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <LineChart className="h-4 w-4 text-primary" />
          AI Technical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary Action Signal - Ultra Clear */}
        <div className={`${decision.bgColor} rounded-lg p-4 border-2 ${decision.borderColor}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${decision.bgColor}`}>
                  <Icon className={`h-6 w-6 ${decision.color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${decision.color}`}>
                    {decision.action}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {decision.description}
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full ${decision.bgColor} ${decision.color} text-sm font-semibold`}>
                {decision.confidence}
              </div>
            </div>
            {/* Clear Action Instruction */}
            <div className="pt-2 border-t border-border/50">
              <div className="text-sm font-medium">
                📌 {decision.instruction}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Price Levels - Minimalist */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-1 mb-2">
              <ArrowDown className="h-3 w-3 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Support</span>
            </div>
            <div className="space-y-1">
              {levels.support.slice(0, 2).map((level, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">S{idx + 1}</span>
                  <span className="text-sm font-medium">${level.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-1 mb-2">
              <ArrowUp className="h-3 w-3 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground">Resistance</span>
            </div>
            <div className="space-y-1">
              {levels.resistance.slice(0, 2).map((level, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">R{idx + 1}</span>
                  <span className="text-sm font-medium">${level.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actionable Trade Setup - Only when relevant */}
        {(decision.action === 'BUY' || decision.action === 'BUY NOW' || 
          decision.action === 'SELL' || decision.action === 'SELL NOW') && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              QUICK TRADE SETUP
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Entry</div>
                <div className="text-sm font-semibold">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Target</div>
                <div className="text-sm font-semibold text-success">
                  ${(decision.action.includes('BUY') 
                    ? levels.resistance[0] 
                    : levels.support[0]).toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Stop Loss</div>
                <div className="text-sm font-semibold text-destructive">
                  ${(decision.action.includes('BUY')
                    ? levels.support[0]
                    : levels.resistance[0]).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Indicators - Clean & Simple */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">RSI:</span>
              <span className={`text-sm font-medium ${
                rsi > 70 ? 'text-destructive' : 
                rsi < 30 ? 'text-success' : 
                'text-foreground'
              }`}>
                {Math.round(rsi)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">MACD:</span>
              <span className={`text-sm font-medium ${
                macd > 0 ? 'text-success' : 'text-destructive'
              }`}>
                {macd > 0 ? '↑' : '↓'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Strength:</span>
              <span className="text-sm font-medium">{confidence}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
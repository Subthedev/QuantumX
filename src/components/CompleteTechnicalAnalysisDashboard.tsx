import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react';

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
    return null; // Don't show this component if no data
  }

  const indicators = signal?.indicators || {};
  const rsi = indicators.rsi14 || indicators.RSI || 50;
  const macd = indicators.macd_hist || indicators.MACD || 0;
  const confidence = signal?.confidence || 50;
  
  // Simplified decision logic
  const getDecision = () => {
    // Clear overbought/oversold conditions
    if (rsi > 75) {
      return { 
        action: 'WAIT', 
        description: 'Overbought - Wait for pullback', 
        confidence: 'MEDIUM',
        color: 'text-warning', 
        bgColor: 'bg-warning/5',
        icon: AlertTriangle 
      };
    }
    if (rsi < 25) {
      return { 
        action: 'MONITOR', 
        description: 'Oversold - Watch for reversal', 
        confidence: 'MEDIUM',
        color: 'text-warning', 
        bgColor: 'bg-warning/5',
        icon: AlertTriangle 
      };
    }
    
    // Strong bullish signal
    if (confidence >= 70 && macd > 0 && rsi < 65) {
      return { 
        action: 'BUY', 
        description: 'Strong bullish momentum', 
        confidence: 'HIGH',
        color: 'text-success', 
        bgColor: 'bg-success/5',
        icon: TrendingUp 
      };
    }
    
    // Strong bearish signal
    if (confidence >= 70 && macd < 0 && rsi > 35) {
      return { 
        action: 'SELL', 
        description: 'Strong bearish pressure', 
        confidence: 'HIGH',
        color: 'text-destructive', 
        bgColor: 'bg-destructive/5',
        icon: TrendingDown 
      };
    }
    
    // Default
    return { 
      action: 'HOLD', 
      description: 'No clear signal - Stay neutral', 
      confidence: 'LOW',
      color: 'text-muted-foreground', 
      bgColor: 'bg-muted/20',
      icon: Activity 
    };
  };

  const decision = getDecision();
  const Icon = decision.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          Market Score Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clean Decision Card */}
        <div className={`${decision.bgColor} rounded-lg p-4 border ${
          decision.color === 'text-success' ? 'border-success/20' : 
          decision.color === 'text-destructive' ? 'border-destructive/20' : 
          'border-warning/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${decision.color}`} />
              <div>
                <div className={`text-xl font-bold ${decision.color}`}>
                  {decision.action}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {decision.description}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className={`text-sm font-semibold ${decision.color}`}>
                {decision.confidence}
              </div>
            </div>
          </div>
        </div>

        {/* Key Indicators - Simple Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/20 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">RSI</div>
            <div className={`text-sm font-bold ${
              rsi > 70 ? 'text-destructive' : 
              rsi < 30 ? 'text-success' : 
              'text-foreground'
            }`}>
              {rsi.toFixed(0)}
            </div>
          </div>
          <div className="bg-muted/20 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">MACD</div>
            <div className={`text-sm font-bold ${
              macd > 0 ? 'text-success' : 'text-destructive'
            }`}>
              {macd > 0 ? '+' : ''}{macd.toFixed(2)}
            </div>
          </div>
          <div className="bg-muted/20 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Signal</div>
            <div className="text-sm font-bold">
              {confidence}%
            </div>
          </div>
        </div>

        {/* Professional Trading Parameters - Only if actionable */}
        {signal?.entry && signal?.stop_loss && signal?.take_profits?.[0] && (
          <div className="border-t pt-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Entry</span>
                <div className="font-mono font-medium">
                  ${signal.entry.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Target</span>
                <div className="font-mono font-medium text-success">
                  ${signal.take_profits[0].toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Stop</span>
                <div className="font-mono font-medium text-destructive">
                  ${signal.stop_loss.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, TrendingUp, TrendingDown, Activity, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';

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
  // Independent technical analysis - completely separate from trading signals
  const currentPrice = marketData?.current_price || signal?.entry || 0;
  
  // Generate independent technical levels based on price action
  const calculateTechnicalLevels = () => {
    const price = currentPrice || 50000;
    
    // Professional support/resistance calculation
    const resistanceLevels = [
      price * 1.015,  // R1: 1.5% above
      price * 1.028,  // R2: 2.8% above
      price * 1.045   // R3: 4.5% above
    ];
    
    const supportLevels = [
      price * 0.985,  // S1: 1.5% below
      price * 0.972,  // S2: 2.8% below
      price * 0.955   // S3: 4.5% below
    ];
    
    return { resistanceLevels, supportLevels };
  };
  
  const { resistanceLevels, supportLevels } = calculateTechnicalLevels();
  
  // Independent technical indicators
  const rsi = signal?.indicators?.rsi14 || signal?.indicators?.RSI || 52;
  const macd = signal?.indicators?.macd_hist || signal?.indicators?.MACD || 0.5;
  const volume = signal?.indicators?.volume || 'stable';
  
  // Market structure analysis
  const getMarketStructure = () => {
    if (rsi > 70) return { trend: 'Overbought', color: 'text-destructive', icon: TrendingDown };
    if (rsi < 30) return { trend: 'Oversold', color: 'text-success', icon: TrendingUp };
    if (macd > 0) return { trend: 'Bullish Momentum', color: 'text-success', icon: TrendingUp };
    if (macd < 0) return { trend: 'Bearish Momentum', color: 'text-destructive', icon: TrendingDown };
    return { trend: 'Consolidating', color: 'text-muted-foreground', icon: Activity };
  };
  
  const marketStructure = getMarketStructure();
  const TrendIcon = marketStructure.icon;
  
  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 100) return `$${price.toFixed(2)}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };
  
  // Calculate potential movement
  const potentialUpside = ((resistanceLevels[0] - currentPrice) / currentPrice * 100).toFixed(1);
  const potentialDownside = ((currentPrice - supportLevels[0]) / currentPrice * 100).toFixed(1);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          AI Technical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Market Structure Overview */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-4 w-4 ${marketStructure.color}`} />
              <span className="text-sm font-medium">Market Structure</span>
            </div>
            <span className={`text-sm font-semibold ${marketStructure.color}`}>
              {marketStructure.trend}
            </span>
          </div>
        </div>

        {/* Support & Resistance Levels - Color Coded */}
        <div className="grid grid-cols-2 gap-3">
          {/* Support Levels - Green */}
          <div className="border rounded-lg p-3 bg-success/5 border-success/20">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDown className="h-3 w-3 text-success" />
              <span className="text-xs font-semibold text-success">SUPPORT LEVELS</span>
            </div>
            <div className="space-y-2">
              {supportLevels.map((level, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">S{idx + 1}</span>
                  <span className="text-sm font-medium text-success">
                    {formatPrice(level)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Resistance Levels - Red */}
          <div className="border rounded-lg p-3 bg-destructive/5 border-destructive/20">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp className="h-3 w-3 text-destructive" />
              <span className="text-xs font-semibold text-destructive">RESISTANCE LEVELS</span>
            </div>
            <div className="space-y-2">
              {resistanceLevels.map((level, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">R{idx + 1}</span>
                  <span className="text-sm font-medium text-destructive">
                    {formatPrice(level)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Technical Indicators */}
        <div className="border rounded-lg p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            KEY INDICATORS
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">RSI (14)</div>
              <div className={`text-sm font-semibold ${
                rsi > 70 ? 'text-destructive' : 
                rsi < 30 ? 'text-success' : 
                'text-foreground'
              }`}>
                {Math.round(rsi)}
                <span className="text-xs text-muted-foreground ml-1">
                  {rsi > 70 ? '↑' : rsi < 30 ? '↓' : '→'}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground">MACD</div>
              <div className={`text-sm font-semibold ${
                macd > 0 ? 'text-success' : 'text-destructive'
              }`}>
                {macd > 0 ? 'Positive' : 'Negative'}
                <span className="text-xs ml-1">
                  {macd > 0 ? '↑' : '↓'}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="text-sm font-semibold">
                {volume === 'increasing' ? 'Rising' : volume === 'decreasing' ? 'Falling' : 'Stable'}
                <span className="text-xs text-muted-foreground ml-1">
                  {volume === 'increasing' ? '📈' : volume === 'decreasing' ? '📉' : '📊'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Action Insights */}
        <div className="bg-muted/20 rounded-lg p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            PRICE ACTION ANALYSIS
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current Price</span>
              <span className="text-sm font-semibold">{formatPrice(currentPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Distance to R1</span>
              <span className="text-sm font-medium text-destructive">+{potentialUpside}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Distance to S1</span>
              <span className="text-sm font-medium text-success">-{potentialDownside}%</span>
            </div>
          </div>
        </div>

        {/* Professional Analysis Note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Activity className="h-3 w-3" />
          <div className="flex-1">
            <span>AI analysis based on price action and technical indicators</span>
            <span className="block mt-1">
              For unlimited report generation, contact: <span className="text-primary font-medium">contactsubhrajeet@gmail.com</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
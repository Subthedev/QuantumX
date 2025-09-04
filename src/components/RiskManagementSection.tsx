import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Calculator, DollarSign, TrendingDown, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RiskManagementProps {
  signal: any;
  marketData: any;
  accountBalance?: number;
}

export const RiskManagementSection: React.FC<RiskManagementProps> = ({ 
  signal, 
  marketData,
  accountBalance = 10000 // Default account balance for calculations
}) => {
  const calculatePositionSize = () => {
    if (!signal || !signal.entry || !signal.stop_loss) return null;
    
    const riskPerTrade = accountBalance * 0.01; // 1% risk per trade
    const stopLossDistance = Math.abs(signal.entry - signal.stop_loss);
    const stopLossPercent = (stopLossDistance / signal.entry) * 100;
    const positionSize = riskPerTrade / (stopLossPercent / 100);
    
    return {
      conservative: positionSize * 0.5,
      moderate: positionSize,
      aggressive: positionSize * 1.5,
      stopLossPercent
    };
  };

  const calculateMaxDrawdown = () => {
    if (!signal || !signal.stop_loss || !signal.entry) return null;
    
    const stopLossPercent = Math.abs((signal.stop_loss - signal.entry) / signal.entry * 100);
    
    return {
      conservative: stopLossPercent * 0.5,
      moderate: stopLossPercent,
      aggressive: stopLossPercent * 1.5
    };
  };

  const getRiskRewardRatio = () => {
    if (!signal || !signal.entry || !signal.stop_loss || !signal.take_profits) return null;
    
    const risk = Math.abs(signal.entry - signal.stop_loss);
    const rewards = signal.take_profits.map((tp: number) => Math.abs(tp - signal.entry));
    
    return rewards.map((reward: number) => (reward / risk).toFixed(2));
  };

  const positionSizing = calculatePositionSize();
  const maxDrawdown = calculateMaxDrawdown();
  const rrRatios = getRiskRewardRatio();

  return (
    <Card className="border-2 border-accent/20 shadow-xl bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Risk Management Dashboard
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {signal ? (
          <>
            {/* Position Sizing Calculator */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="h-4 w-4 text-primary" />
                Position Sizing Calculator
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-xs text-green-700 font-medium mb-1">Conservative</div>
                  <div className="font-bold text-green-700">
                    ${positionSizing?.conservative.toFixed(0)}
                  </div>
                  <div className="text-xs text-green-600/70 mt-1">0.5% Risk</div>
                </div>
                
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-xs text-blue-700 font-medium mb-1">Moderate</div>
                  <div className="font-bold text-blue-700">
                    ${positionSizing?.moderate.toFixed(0)}
                  </div>
                  <div className="text-xs text-blue-600/70 mt-1">1% Risk</div>
                </div>
                
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="text-xs text-orange-700 font-medium mb-1">Aggressive</div>
                  <div className="font-bold text-orange-700">
                    ${positionSizing?.aggressive.toFixed(0)}
                  </div>
                  <div className="text-xs text-orange-600/70 mt-1">1.5% Risk</div>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Max Drawdown</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conservative</span>
                    <span className="font-medium text-green-600">
                      -{maxDrawdown?.conservative.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Moderate</span>
                    <span className="font-medium text-yellow-600">
                      -{maxDrawdown?.moderate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aggressive</span>
                    <span className="font-medium text-red-600">
                      -{maxDrawdown?.aggressive.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Risk/Reward Ratios</span>
                </div>
                <div className="space-y-1">
                  {rrRatios?.map((ratio: string, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TP{i + 1}</span>
                      <span className={`font-medium ${
                        Number(ratio) >= 2 ? 'text-green-600' : 
                        Number(ratio) >= 1.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        1:{ratio}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trade Management Rules */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Trade Management Rules</div>
              <div className="space-y-2">
                <Alert className="border-blue-200 bg-blue-50/50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    <strong>Entry:</strong> Scale in with 50% at entry, 30% on pullback, 20% at support
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-green-200 bg-green-50/50">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm">
                    <strong>Profit Taking:</strong> Close 40% at TP1, 30% at TP2, let 30% ride with trailing stop
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-red-200 bg-red-50/50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm">
                    <strong>Stop Loss:</strong> Move to breakeven after TP1 hit, trail by 1 ATR after TP2
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Risk Score */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Risk Score</span>
                <span className={`text-lg font-bold ${
                  Number(rrRatios?.[0]) >= 2 && positionSizing?.stopLossPercent && positionSizing.stopLossPercent < 5 
                    ? 'text-green-600' 
                    : Number(rrRatios?.[0]) >= 1.5 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {Number(rrRatios?.[0]) >= 2 && positionSizing?.stopLossPercent && positionSizing.stopLossPercent < 5 
                    ? 'LOW RISK' 
                    : Number(rrRatios?.[0]) >= 1.5 
                    ? 'MEDIUM RISK' 
                    : 'HIGH RISK'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on R:R ratio, position sizing, and stop loss distance
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No risk management data available. Generate a report to see risk metrics.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface RiskManagementProps {
  signal: any;
  marketData: any;
  accountBalance?: number;
  symbol?: string;
}

export const RiskManagementSection: React.FC<RiskManagementProps> = ({ 
  signal, 
  marketData,
  accountBalance = 10000,
  symbol = 'BTC'
}) => {
  // Calculate position size based on 1% risk rule
  const calculatePositionSize = () => {
    if (!signal || !signal.entry || !signal.stop_loss) return null;
    
    const riskAmount = accountBalance * 0.01; // 1% risk per trade
    const stopLossDistance = Math.abs(signal.entry - signal.stop_loss);
    const stopLossPercent = (stopLossDistance / signal.entry) * 100;
    const positionInUSD = riskAmount / (stopLossPercent / 100);
    const positionInCrypto = positionInUSD / signal.entry;
    
    return {
      usd: positionInUSD,
      crypto: positionInCrypto,
      stopLossPercent,
      riskAmount
    };
  };

  // Calculate risk to reward ratio
  const calculateRiskReward = () => {
    if (!signal || !signal.entry || !signal.stop_loss || !signal.take_profits) return null;
    
    const risk = Math.abs(signal.entry - signal.stop_loss);
    const reward1 = Math.abs(signal.take_profits[0] - signal.entry);
    const reward2 = signal.take_profits[1] ? Math.abs(signal.take_profits[1] - signal.entry) : null;
    const reward3 = signal.take_profits[2] ? Math.abs(signal.take_profits[2] - signal.entry) : null;
    
    // Calculate potential profit/loss in USD
    const positionSize = calculatePositionSize();
    const potentialLoss = positionSize?.riskAmount || 0;
    const potentialProfit1 = potentialLoss * (reward1 / risk);
    const potentialProfit2 = reward2 ? potentialLoss * (reward2 / risk) : null;
    const potentialProfit3 = reward3 ? potentialLoss * (reward3 / risk) : null;
    
    return {
      ratios: {
        tp1: (reward1 / risk).toFixed(2),
        tp2: reward2 ? (reward2 / risk).toFixed(2) : null,
        tp3: reward3 ? (reward3 / risk).toFixed(2) : null
      },
      profits: {
        tp1: potentialProfit1,
        tp2: potentialProfit2,
        tp3: potentialProfit3
      },
      loss: potentialLoss
    };
  };

  const positionData = calculatePositionSize();
  const rrData = calculateRiskReward();

  return (
    <Card className="border-2 border-accent/20 shadow-xl bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Risk Management Dashboard
          </CardTitle>
          {signal && (
            <div className="text-sm font-medium text-muted-foreground">
              {symbol}/USD · 4H Trade
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {signal ? (
          <>
            {/* Position Size & Risk Amount */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Position Size (1% Risk)</span>
                <span className="text-xs text-muted-foreground">Account: ${accountBalance.toLocaleString()}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Position in USD</div>
                  <div className="text-lg font-bold text-foreground">
                    ${positionData?.usd.toFixed(0)}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Position in {symbol}</div>
                  <div className="text-lg font-bold text-foreground">
                    {positionData?.crypto.toFixed(4)} {symbol}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Max Risk per Trade</span>
                <span className="font-medium text-red-500">
                  -${positionData?.riskAmount.toFixed(0)} ({positionData?.stopLossPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Risk to Reward Analysis */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Risk to Reward Analysis</span>
              </div>
              
              <div className="space-y-2">
                {rrData?.ratios.tp1 && (
                  <div className="flex items-center justify-between p-2 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">TP1</span>
                      <span className="text-xs text-muted-foreground">
                        1:{rrData.ratios.tp1}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-green-500">
                      +${rrData.profits.tp1?.toFixed(0)}
                    </div>
                  </div>
                )}
                
                {rrData?.ratios.tp2 && (
                  <div className="flex items-center justify-between p-2 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">TP2</span>
                      <span className="text-xs text-muted-foreground">
                        1:{rrData.ratios.tp2}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-green-500">
                      +${rrData.profits.tp2?.toFixed(0)}
                    </div>
                  </div>
                )}
                
                {rrData?.ratios.tp3 && (
                  <div className="flex items-center justify-between p-2 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">TP3</span>
                      <span className="text-xs text-muted-foreground">
                        1:{rrData.ratios.tp3}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-green-500">
                      +${rrData.profits.tp3?.toFixed(0)}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-sm font-medium text-red-600">Stop Loss</span>
                  </div>
                  <div className="text-sm font-medium text-red-500">
                    -${rrData?.loss.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Execution Rules */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Trade Execution Rules</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">1.</span>
                  <span className="text-muted-foreground">Enter with full position at signal price: ${signal.entry?.toFixed(2)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">2.</span>
                  <span className="text-muted-foreground">Set stop loss immediately at: ${signal.stop_loss?.toFixed(2)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">3.</span>
                  <span className="text-muted-foreground">Take 50% profit at TP1, 30% at TP2, let 20% ride</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">4.</span>
                  <span className="text-muted-foreground">Move stop to breakeven after TP1 is hit</span>
                </div>
              </div>
            </div>

            {/* Overall Risk Assessment */}
            <div className={`p-3 rounded-lg border-2 ${
              Number(rrData?.ratios.tp1) >= 2 
                ? 'bg-green-500/10 border-green-500/30' 
                : Number(rrData?.ratios.tp1) >= 1.5 
                ? 'bg-blue-500/10 border-blue-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Assessment</span>
                <span className={`text-sm font-bold ${
                  Number(rrData?.ratios.tp1) >= 2 
                    ? 'text-green-500' 
                    : Number(rrData?.ratios.tp1) >= 1.5 
                    ? 'text-blue-500' 
                    : 'text-red-500'
                }`}>
                  {Number(rrData?.ratios.tp1) >= 2 
                    ? 'FAVORABLE' 
                    : Number(rrData?.ratios.tp1) >= 1.5 
                    ? 'MODERATE' 
                    : 'HIGH RISK'}
                </span>
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
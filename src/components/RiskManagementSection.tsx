import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, Calculator, DollarSign, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { Badge } from '@/components/ui/badge';

interface RiskManagementProps {
  signal: any;
  marketData: any;
  accountBalance?: number;
  symbol?: string;
}

export const RiskManagementSection: React.FC<RiskManagementProps> = ({ 
  signal, 
  marketData,
  accountBalance = 100000,
  symbol = 'BTC'
}) => {
  // Core calculator states
  const [tradeAmount, setTradeAmount] = useState<string>('1000');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  
  // Initialize values from signal
  useEffect(() => {
    if (signal) {
      setEntryPrice(signal.entry?.toFixed(2) || '');
      setStopLoss(signal.stop_loss?.toFixed(2) || '');
      setTakeProfit(signal.take_profits?.[0]?.toFixed(2) || '');
    }
  }, [signal]);
  
  // Calculate position metrics
  const calculateMetrics = () => {
    const amount = parseFloat(tradeAmount) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;
    const target = parseFloat(takeProfit) || 0;
    
    if (!amount || !entry || !stop || !target) return null;

    // Core calculations
    const positionSize = amount / entry;
    const stopDistance = Math.abs(entry - stop);
    const targetDistance = Math.abs(target - entry);
    const riskAmount = (stopDistance / entry) * amount;
    const profitAmount = (targetDistance / entry) * amount;
    const riskRewardRatio = targetDistance / stopDistance;
    
    return {
      positionSize,
      riskAmount,
      profitAmount,
      riskRewardRatio,
      riskPercent: (riskAmount / amount) * 100,
      profitPercent: (profitAmount / amount) * 100
    };
  };

  const metrics = calculateMetrics();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Trade Calculator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trade Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              Trade Amount (USD)
            </Label>
            <Input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              placeholder="Enter amount"
              className="bg-background"
            />
          </div>
          
          {/* Entry Price */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-3.5 w-3.5" />
              Entry Price
            </Label>
            <Input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder={signal?.entry?.toFixed(2) || "Enter price"}
              className="bg-background"
            />
          </div>
          
          {/* Stop Loss */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Stop Loss
            </Label>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder={signal?.stop_loss?.toFixed(2) || "Enter stop"}
              className="bg-background"
            />
          </div>
          
          {/* Take Profit */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Take Profit
            </Label>
            <Input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder={signal?.take_profits?.[0]?.toFixed(2) || "Enter target"}
              className="bg-background"
            />
          </div>
        </div>

        {/* Results Section */}
        {metrics && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            {/* Position Size */}
            <div className="bg-background/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Position Size</span>
                <div className="flex items-center gap-2">
                  {symbol === 'BTC' ? <BTCLogo className="w-4 h-4" /> : <ETHLogo className="w-4 h-4" />}
                  <span className="text-lg font-bold">{metrics.positionSize.toFixed(6)} {symbol}</span>
                </div>
              </div>
              
              {/* Risk/Reward Summary */}
              <div className="grid grid-cols-2 gap-4">
                {/* Risk Side */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Risk Amount</span>
                    <span className="text-sm font-semibold text-red-500">
                      -${metrics.riskAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Risk %</span>
                    <span className="text-sm font-semibold text-red-500">
                      {metrics.riskPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Reward Side */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Profit Target</span>
                    <span className="text-sm font-semibold text-green-500">
                      +${metrics.profitAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Profit %</span>
                    <span className="text-sm font-semibold text-green-500">
                      {metrics.profitPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk/Reward Ratio */}
            <div className="bg-background/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Risk/Reward Ratio</span>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={metrics.riskRewardRatio >= 2 ? 'default' : metrics.riskRewardRatio >= 1.5 ? 'secondary' : 'destructive'}
                    className="text-sm font-bold px-3 py-1"
                  >
                    1:{metrics.riskRewardRatio.toFixed(1)}
                  </Badge>
                  {metrics.riskRewardRatio >= 2 && (
                    <span className="text-xs text-green-500 font-medium">Good Trade</span>
                  )}
                  {metrics.riskRewardRatio < 1.5 && metrics.riskRewardRatio >= 1 && (
                    <span className="text-xs text-yellow-500 font-medium">Average</span>
                  )}
                  {metrics.riskRewardRatio < 1 && (
                    <span className="text-xs text-red-500 font-medium">Poor Risk</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                {metrics.riskRewardRatio >= 2 
                  ? "✅ Excellent risk/reward ratio. This trade setup looks favorable."
                  : metrics.riskRewardRatio >= 1.5
                  ? "⚠️ Decent setup. Consider waiting for better entry or tighter stop."
                  : "❌ Poor risk/reward. Consider adjusting your targets or entry point."}
              </p>
            </div>
          </div>
        )}

        {/* Helper Text when no calculations */}
        {!metrics && (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Enter your trade parameters above</p>
            <p className="text-xs mt-1">We'll calculate your position size and risk metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskManagementSection;
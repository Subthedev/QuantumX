import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, Calculator, DollarSign, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';

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
  // Interactive calculator states
  const [tradeAmount, setTradeAmount] = useState<string>('10000');
  const [riskPercent, setRiskPercent] = useState<string>('2');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit1, setTakeProfit1] = useState<string>('');
  const [takeProfit2, setTakeProfit2] = useState<string>('');
  const [takeProfit3, setTakeProfit3] = useState<string>('');
  
  // Initialize values from signal when available
  useEffect(() => {
    if (signal) {
      setEntryPrice(signal.entry?.toFixed(2) || '');
      setStopLoss(signal.stop_loss?.toFixed(2) || '');
      if (signal.take_profits) {
        setTakeProfit1(signal.take_profits[0]?.toFixed(2) || '');
        setTakeProfit2(signal.take_profits[1]?.toFixed(2) || '');
        setTakeProfit3(signal.take_profits[2]?.toFixed(2) || '');
      }
    }
  }, [signal]);
  
  // Interactive position size calculator based on user inputs
  const calculatePositionSize = () => {
    const entry = parseFloat(entryPrice) || signal?.entry;
    const stop = parseFloat(stopLoss) || signal?.stop_loss;
    const amount = parseFloat(tradeAmount) || 10000;
    
    if (!entry || !stop) return null;

    const stopLossDistance = Math.abs(entry - stop);
    const stopLossPercent = (stopLossDistance / entry) * 100;
    const positionInCrypto = amount / entry;
    const riskAmount = amount * (stopLossPercent / 100);

    return {
      usd: amount,
      crypto: positionInCrypto,
      stopLossPercent,
      riskAmount,
    };
  };

  // Interactive risk to reward calculator
  const calculateRiskReward = () => {
    const entry = parseFloat(entryPrice) || signal?.entry;
    const stop = parseFloat(stopLoss) || signal?.stop_loss;
    const tp1 = parseFloat(takeProfit1) || signal?.take_profits?.[0];
    const tp2 = parseFloat(takeProfit2) || signal?.take_profits?.[1];
    const tp3 = parseFloat(takeProfit3) || signal?.take_profits?.[2];
    
    if (!entry || !stop || !tp1) return null;
    
    const risk = Math.abs(entry - stop);
    const reward1 = Math.abs(tp1 - entry);
    const reward2 = tp2 ? Math.abs(tp2 - entry) : null;
    const reward3 = tp3 ? Math.abs(tp3 - entry) : null;
    
    const positionSize = calculatePositionSize();
    const potentialLoss = positionSize?.riskAmount || 0;
    const potentialProfit1 = (reward1 / risk) * potentialLoss;
    const potentialProfit2 = reward2 ? (reward2 / risk) * potentialLoss : null;
    const potentialProfit3 = reward3 ? (reward3 / risk) * potentialLoss : null;
    
    const formatRatio = (rewardToRisk: number) => {
      return `1:${rewardToRisk.toFixed(1)}`;
    };
    
    return {
      ratios: {
        tp1: formatRatio(reward1 / risk),
        tp2: reward2 ? formatRatio(reward2 / risk) : null,
        tp3: reward3 ? formatRatio(reward3 / risk) : null
      },
      rawRatios: {
        tp1: reward1 / risk,
        tp2: reward2 ? reward2 / risk : null,
        tp3: reward3 ? reward3 / risk : null
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
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {symbol === 'BTC' ? <BTCLogo className="w-4 h-4" /> : <ETHLogo className="w-4 h-4" />}
            <span>{symbol}/USD</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Interactive Calculator Section */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Position Calculator</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trade Amount Input */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Trade Amount (USD)
              </Label>
              <Input
                type="number"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="10000"
                className="bg-background border-border"
              />
            </div>
            
            {/* Entry Price Input */}
            <div className="space-y-2">
              <Label className="text-xs">Entry Price</Label>
              <Input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder={signal?.entry?.toFixed(2) || "0.00"}
                className="bg-background border-border"
              />
            </div>
            
            {/* Stop Loss Input */}
            <div className="space-y-2">
              <Label className="text-xs">Stop Loss</Label>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder={signal?.stop_loss?.toFixed(2) || "0.00"}
                className="bg-background border-border"
              />
            </div>
            
            {/* Take Profit 1 Input */}
            <div className="space-y-2">
              <Label className="text-xs">Take Profit 1</Label>
              <Input
                type="number"
                value={takeProfit1}
                onChange={(e) => setTakeProfit1(e.target.value)}
                placeholder={signal?.take_profits?.[0]?.toFixed(2) || "0.00"}
                className="bg-background border-border"
              />
            </div>
            
            {/* Take Profit 2 Input */}
            <div className="space-y-2">
              <Label className="text-xs">Take Profit 2 (Optional)</Label>
              <Input
                type="number"
                value={takeProfit2}
                onChange={(e) => setTakeProfit2(e.target.value)}
                placeholder={signal?.take_profits?.[1]?.toFixed(2) || "0.00"}
                className="bg-background border-border"
              />
            </div>
            
            {/* Take Profit 3 Input */}
            <div className="space-y-2">
              <Label className="text-xs">Take Profit 3 (Optional)</Label>
              <Input
                type="number"
                value={takeProfit3}
                onChange={(e) => setTakeProfit3(e.target.value)}
                placeholder={signal?.take_profits?.[2]?.toFixed(2) || "0.00"}
                className="bg-background border-border"
              />
            </div>
          </div>
        </div>
        
        {/* Calculated Results */}
        {positionData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position Size Card */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold mb-3 text-foreground">Position Size</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">USD Amount</span>
                  <span className="font-bold text-foreground">${positionData.usd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{symbol} Amount</span>
                  <span className="font-bold text-foreground">{positionData.crypto.toFixed(4)}</span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Max Loss</span>
                    <span className="font-bold text-red-500">-${positionData.riskAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">Risk %</span>
                    <span className="text-xs font-medium text-red-500">{positionData.stopLossPercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk to Reward Card */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Risk/Reward Ratios
              </h4>
              {rrData ? (
                <div className="space-y-2">
                  {rrData.ratios.tp1 && (
                    <div className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">TP1</span>
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 rounded text-green-600 font-medium">
                          {rrData.ratios.tp1}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-500">+${rrData.profits.tp1?.toFixed(0)}</span>
                    </div>
                  )}
                  {rrData.ratios.tp2 && (
                    <div className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">TP2</span>
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 rounded text-green-600 font-medium">
                          {rrData.ratios.tp2}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-500">+${rrData.profits.tp2?.toFixed(0)}</span>
                    </div>
                  )}
                  {rrData.ratios.tp3 && (
                    <div className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">TP3</span>
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 rounded text-green-600 font-medium">
                          {rrData.ratios.tp3}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-500">+${rrData.profits.tp3?.toFixed(0)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Enter values to calculate</div>
              )}
            </div>
          </div>
        )}
        
        {/* Trade Execution Guide */}
        {(signal || (entryPrice && stopLoss && takeProfit1)) && (
          <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">Quick Execution Guide</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span className="text-muted-foreground">
                  Entry: ${entryPrice || signal?.entry?.toFixed(2) || 'Not set'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span className="text-muted-foreground">
                  Stop Loss: ${stopLoss || signal?.stop_loss?.toFixed(2) || 'Not set'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span className="text-muted-foreground">Take 50% at TP1, 30% at TP2</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">4.</span>
                <span className="text-muted-foreground">Move SL to breakeven after TP1</span>
              </div>
            </div>
            
            {/* Risk Assessment Badge */}
            {rrData && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Overall Assessment</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 2 
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                      : rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 1.5 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 2 
                      ? 'FAVORABLE TRADE' 
                      : rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 1.5 
                      ? 'MODERATE RISK' 
                      : 'HIGH RISK'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
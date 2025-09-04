import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, Calculator, DollarSign, Percent, Target, Zap, Trophy, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { Progress } from '@/components/ui/progress';

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
  
  // Animation states
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
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
  
  // Trigger calculation animation
  useEffect(() => {
    if (entryPrice && stopLoss && takeProfit1) {
      setIsCalculating(true);
      setTimeout(() => {
        setIsCalculating(false);
        setShowResults(true);
      }, 300);
    }
  }, [tradeAmount, entryPrice, stopLoss, takeProfit1, takeProfit2, takeProfit3]);
  
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
  
  // Get risk score for gamification
  const getRiskScore = () => {
    if (!rrData?.rawRatios?.tp1) return 0;
    const ratio = rrData.rawRatios.tp1;
    if (ratio >= 3) return 100;
    if (ratio >= 2.5) return 90;
    if (ratio >= 2) return 75;
    if (ratio >= 1.5) return 60;
    if (ratio >= 1) return 40;
    return 20;
  };
  
  const riskScore = getRiskScore();

  return (
    <Card className="border-2 border-accent/20 shadow-xl bg-gradient-to-br from-background to-accent/5 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <div className="relative">
              <Shield className="h-5 w-5 text-accent animate-pulse" />
              <div className="absolute inset-0 blur-md bg-accent/20 animate-pulse" />
            </div>
            Risk Management Dashboard
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-lg border border-border animate-fade-in">
              {symbol === 'BTC' ? <BTCLogo className="w-4 h-4" /> : <ETHLogo className="w-4 h-4" />}
              <span className="text-sm font-medium">{symbol}/USD</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Interactive Calculator Section with Gamification */}
        <div className="relative bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl p-5 border border-border/50 animate-fade-in">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 animate-pulse" />
          </div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calculator className={`h-5 w-5 text-primary transition-all duration-300 ${isCalculating ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Position Calculator
                </span>
              </div>
              {showResults && (
                <div className="flex items-center gap-2 animate-scale-in">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-semibold text-yellow-600">Live Calculation</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trade Amount Input with Visual Feedback */}
              <div className="space-y-2 group">
                <Label className="text-xs flex items-center gap-2 transition-colors group-hover:text-primary">
                  <DollarSign className="h-3 w-3 transition-transform group-hover:scale-110" />
                  Trade Amount (USD)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="10000"
                    className="bg-background border-border transition-all duration-200 hover:border-primary/50 focus:border-primary pr-16"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                    {parseFloat(tradeAmount) >= 10000 ? '💎' : parseFloat(tradeAmount) >= 5000 ? '🥇' : '🥈'}
                  </div>
                </div>
              </div>
              
              {/* Entry Price Input with Sync Indicator */}
              <div className="space-y-2 group">
                <Label className="text-xs flex items-center gap-2 transition-colors group-hover:text-primary">
                  <Target className="h-3 w-3 transition-transform group-hover:scale-110" />
                  Entry Price
                  {signal && entryPrice === signal.entry?.toFixed(2) && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full animate-scale-in">
                      Synced
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder={signal?.entry?.toFixed(2) || "0.00"}
                  className="bg-background border-border transition-all duration-200 hover:border-primary/50 focus:border-primary"
                />
              </div>
              
              {/* Stop Loss Input with Risk Indicator */}
              <div className="space-y-2 group">
                <Label className="text-xs flex items-center gap-2 transition-colors group-hover:text-red-500">
                  <AlertCircle className="h-3 w-3 transition-transform group-hover:scale-110" />
                  Stop Loss
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder={signal?.stop_loss?.toFixed(2) || "0.00"}
                    className="bg-background border-border transition-all duration-200 hover:border-red-500/50 focus:border-red-500"
                  />
                  {stopLoss && entryPrice && (
                    <div className="absolute -right-2 -top-2 animate-scale-in">
                      {Math.abs(parseFloat(entryPrice) - parseFloat(stopLoss)) / parseFloat(entryPrice) * 100 < 3 
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />
                      }
                    </div>
                  )}
                </div>
              </div>
              
              {/* Take Profit 1 with Trophy */}
              <div className="space-y-2 group">
                <Label className="text-xs flex items-center gap-2 transition-colors group-hover:text-green-500">
                  <Trophy className="h-3 w-3 text-yellow-500 transition-transform group-hover:scale-110" />
                  Take Profit 1
                </Label>
                <Input
                  type="number"
                  value={takeProfit1}
                  onChange={(e) => setTakeProfit1(e.target.value)}
                  placeholder={signal?.take_profits?.[0]?.toFixed(2) || "0.00"}
                  className="bg-background border-border transition-all duration-200 hover:border-green-500/50 focus:border-green-500"
                />
              </div>
              
              {/* Take Profit 2 */}
              <div className="space-y-2 group">
                <Label className="text-xs flex items-center gap-2 transition-colors group-hover:text-green-500">
                  <Trophy className="h-3 w-3 text-gray-400 transition-transform group-hover:scale-110" />
                  Take Profit 2 (Optional)
                </Label>
                <Input
                  type="number"
                  value={takeProfit2}
                  onChange={(e) => setTakeProfit2(e.target.value)}
                  placeholder={signal?.take_profits?.[1]?.toFixed(2) || "0.00"}
                  className="bg-background border-border transition-all duration-200 hover:border-green-500/50 focus:border-green-500"
                />
              </div>
              
              {/* Take Profit 3 */}
              <div className="space-y-2 group">
                <Label className="text-xs flex items-center gap-2 transition-colors group-hover:text-green-500">
                  <Trophy className="h-3 w-3 text-gray-400 transition-transform group-hover:scale-110" />
                  Take Profit 3 (Optional)
                </Label>
                <Input
                  type="number"
                  value={takeProfit3}
                  onChange={(e) => setTakeProfit3(e.target.value)}
                  placeholder={signal?.take_profits?.[2]?.toFixed(2) || "0.00"}
                  className="bg-background border-border transition-all duration-200 hover:border-green-500/50 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Risk Score Visualization */}
        {showResults && rrData && (
          <div className={`bg-gradient-to-r from-background to-muted/30 rounded-xl p-4 border border-border animate-fade-in`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold">Trade Quality Score</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {riskScore}%
              </span>
            </div>
            <Progress value={riskScore} className="h-3 bg-muted" />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">Poor</span>
              <span className="text-[10px] text-muted-foreground">Fair</span>
              <span className="text-[10px] text-muted-foreground">Good</span>
              <span className="text-[10px] text-muted-foreground">Excellent</span>
            </div>
          </div>
        )}
        
        {/* Animated Results Cards */}
        {positionData && showResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position Size Card with Animation */}
            <div className={`bg-background rounded-xl p-4 border transition-all duration-500 hover:scale-[1.02] hover:shadow-lg ${
              isCalculating ? 'opacity-50' : 'opacity-100 animate-scale-in'
            } ${positionData.stopLossPercent < 3 ? 'border-green-500/30' : 'border-border'}`}>
              <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Position Size
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    USD Amount
                  </span>
                  <span className="font-bold text-foreground">${positionData.usd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground">{symbol} Amount</span>
                  <span className="font-bold text-foreground flex items-center gap-1">
                    {positionData.crypto.toFixed(4)}
                    {symbol === 'BTC' ? '₿' : 'Ξ'}
                  </span>
                </div>
                <div className="pt-3 border-t border-border/50">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      Max Loss
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-red-500">-${positionData.riskAmount.toFixed(0)}</span>
                      <span className="text-[10px] text-red-400 block">
                        {positionData.stopLossPercent.toFixed(2)}% Risk
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk/Reward Card with Visual Indicators */}
            <div className={`bg-background rounded-xl p-4 border transition-all duration-500 hover:scale-[1.02] hover:shadow-lg ${
              isCalculating ? 'opacity-50' : 'opacity-100 animate-scale-in'
            } ${rrData?.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 2 ? 'border-green-500/30' : 'border-border'}`}>
              <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500 animate-pulse" />
                Risk/Reward Ratios
              </h4>
              {rrData ? (
                <div className="space-y-2">
                  {rrData.ratios.tp1 && (
                    <div className="flex justify-between items-center p-2 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs font-semibold">TP1</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 rounded-full text-green-600 font-bold">
                          {rrData.ratios.tp1}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-500">
                        +${rrData.profits.tp1?.toFixed(0)}
                        {rrData.rawRatios.tp1 >= 2 && ' 🎯'}
                      </span>
                    </div>
                  )}
                  {rrData.ratios.tp2 && (
                    <div className="flex justify-between items-center p-2 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-semibold">TP2</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 rounded-full text-green-600 font-bold">
                          {rrData.ratios.tp2}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-500">
                        +${rrData.profits.tp2?.toFixed(0)}
                        {rrData.rawRatios.tp2 && rrData.rawRatios.tp2 >= 3 && ' 🚀'}
                      </span>
                    </div>
                  )}
                  {rrData.ratios.tp3 && (
                    <div className="flex justify-between items-center p-2 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-semibold">TP3</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 rounded-full text-green-600 font-bold">
                          {rrData.ratios.tp3}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-500">
                        +${rrData.profits.tp3?.toFixed(0)}
                        {rrData.rawRatios.tp3 && rrData.rawRatios.tp3 >= 4 && ' 💎'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">
                  <Calculator className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  Enter values to calculate
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Execution Guide with Step Progress */}
        {(signal || (entryPrice && stopLoss && takeProfit1)) && showResults && (
          <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl p-4 border border-blue-500/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-500 animate-pulse" />
                <span className="text-sm font-bold">Quick Execution Guide</span>
              </div>
              {rrData && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold animate-scale-in ${
                  rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 2 
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                    : rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 1.5 
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 2 ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      GOOD TRADE
                    </>
                  ) : rrData.rawRatios?.tp1 && rrData.rawRatios.tp1 >= 1.5 ? (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      MODERATE
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      HIGH RISK
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Execution Steps with Progress Indicators */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 group hover:bg-blue-500/5 p-2 rounded-lg transition-all">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600">
                  1
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-foreground">Entry Order</span>
                  <span className="text-xs text-muted-foreground block">
                    ${entryPrice || signal?.entry?.toFixed(2) || 'Not set'}
                  </span>
                </div>
                {entryPrice && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
              
              <div className="flex items-center gap-3 group hover:bg-red-500/5 p-2 rounded-lg transition-all">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-600">
                  2
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-foreground">Stop Loss</span>
                  <span className="text-xs text-muted-foreground block">
                    ${stopLoss || signal?.stop_loss?.toFixed(2) || 'Not set'}
                  </span>
                </div>
                {stopLoss && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
              
              <div className="flex items-center gap-3 group hover:bg-green-500/5 p-2 rounded-lg transition-all">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-600">
                  3
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-foreground">Profit Strategy</span>
                  <span className="text-xs text-muted-foreground block">
                    50% at TP1, 30% at TP2, 20% runner
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 group hover:bg-purple-500/5 p-2 rounded-lg transition-all">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-600">
                  4
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-foreground">Risk Management</span>
                  <span className="text-xs text-muted-foreground block">
                    Move SL to breakeven after TP1
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
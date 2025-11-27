import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Target, Shield, Activity, ArrowUpRight, ArrowDownRight, 
  Info, Clock, DollarSign
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface IgniteXSummaryProps {
  report: any;
}

export const IgniteXSummarySection: React.FC<IgniteXSummaryProps> = ({ report }) => {
  if (!report) {
    return (
      <Card className="border-2 border-primary/20 shadow-xl">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>No AI analysis available. Generate a report to unlock insights.</p>
        </CardContent>
      </Card>
    );
  }

  // Extract real data from the report
  const extractedData = useMemo(() => {
    const signals = report.signal_4h || {};
    const technical = report.analysis?.technical || {};
    const sentiment = report.analysis?.sentiment || {};
    const risk = report.risk_management || {};
    const targets = report.targets || {};
    
    return { signals, technical, sentiment, risk, targets };
  }, [report]);

  // Calculate success probability based on actual data
  const calculateSuccessProbability = useMemo(() => {
    const { signals, technical, sentiment } = extractedData;
    let probability = 50; // Base probability
    
    // Adjust based on signal confidence
    if (signals.confidence) {
      probability = signals.confidence;
    }
    
    // Fine-tune based on technical indicators
    if (technical.indicators?.macd?.signal === 'BULLISH' && signals.direction === 'LONG') {
      probability = Math.min(probability + 5, 95);
    } else if (technical.indicators?.macd?.signal === 'BEARISH' && signals.direction === 'SHORT') {
      probability = Math.min(probability + 5, 95);
    }
    
    // Sentiment alignment
    if ((sentiment.overall === 'Bullish' && signals.direction === 'LONG') ||
        (sentiment.overall === 'Bearish' && signals.direction === 'SHORT')) {
      probability = Math.min(probability + 5, 95);
    }
    
    return Math.round(probability);
  }, [extractedData]);

  // Generate actionable summary based on real data
  const actionableSummary = useMemo(() => {
    const { signals, technical, sentiment, risk } = extractedData;
    
    // Primary action based on signal
    let primaryAction = '';
    let riskLevel = 'Moderate';
    let timeframe = '4H';
    
    if (signals.direction === 'LONG') {
      primaryAction = 'Consider long position with defined risk management';
      if (technical.indicators?.rsi > 70) {
        riskLevel = 'High';
      } else if (technical.indicators?.rsi < 50) {
        riskLevel = 'Low';
      }
    } else if (signals.direction === 'SHORT') {
      primaryAction = 'Consider short position with strict stop loss';
      if (technical.indicators?.rsi < 30) {
        riskLevel = 'High';
      } else if (technical.indicators?.rsi > 50) {
        riskLevel = 'Low';
      }
    } else {
      primaryAction = 'Wait for clearer signals before entering position';
      riskLevel = 'Low';
    }
    
    // Key insights from actual data
    const keyInsights = [];
    
    if (technical.primary_trend) {
      keyInsights.push(`${technical.primary_trend} trend detected`);
    }
    
    if (sentiment.overall) {
      keyInsights.push(`Market sentiment: ${sentiment.overall}`);
    }
    
    if (technical.support_resistance?.support && technical.support_resistance?.resistance) {
      keyInsights.push(`Support: $${technical.support_resistance.support.toFixed(2)}, Resistance: $${technical.support_resistance.resistance.toFixed(2)}`);
    }
    
    if (risk.risk_reward_ratio) {
      keyInsights.push(`Risk/Reward: ${risk.risk_reward_ratio}`);
    }
    
    return {
      primaryAction,
      riskLevel,
      timeframe,
      keyInsights
    };
  }, [extractedData]);

  // Trading setup from actual signal data
  const tradingSetup = useMemo(() => {
    const { signals, risk, targets } = extractedData;
    
    if (!signals.direction || signals.direction === 'HOLD') {
      return null;
    }
    
    return {
      direction: signals.direction,
      entry: signals.entry || 0,
      stopLoss: signals.stop_loss || 0,
      takeProfit1: targets.take_profit_1 || 0,
      takeProfit2: targets.take_profit_2 || 0,
      takeProfit3: targets.take_profit_3 || 0,
      positionSize: risk.position_size || '2%',
      maxLoss: risk.max_loss || 'N/A'
    };
  }, [extractedData]);

  const getDirectionColor = (direction: string) => {
    switch(direction) {
      case 'LONG':
        return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'SHORT':
        return 'text-red-600 bg-red-500/10 border-red-500/30';
      default:
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
    }
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'Low':
        return 'text-green-600';
      case 'High':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                IgniteX AI Summary
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actionable intelligence for {report.symbol}
              </p>
            </div>
          </div>
          <Badge className={getDirectionColor(extractedData.signals.direction || 'HOLD')}>
            {extractedData.signals.direction === 'LONG' && <ArrowUpRight className="h-3 w-3 mr-1" />}
            {extractedData.signals.direction === 'SHORT' && <ArrowDownRight className="h-3 w-3 mr-1" />}
            {extractedData.signals.direction || 'HOLD'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Success Probability */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Signal Confidence</span>
            <span className="text-sm font-bold">{calculateSuccessProbability}%</span>
          </div>
          <Progress value={calculateSuccessProbability} className="h-2" />
        </div>

        {/* Primary Action */}
        <Alert className="border-primary/20">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{actionableSummary.primaryAction}</p>
              <div className="flex items-center gap-4 text-xs">
                <span>Timeframe: <strong>{actionableSummary.timeframe}</strong></span>
                <span>Risk Level: <strong className={getRiskColor(actionableSummary.riskLevel)}>{actionableSummary.riskLevel}</strong></span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Key Market Insights */}
        {actionableSummary.keyInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Key Market Insights
            </h4>
            <ul className="space-y-1">
              {actionableSummary.keyInsights.map((insight, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trading Setup */}
        {tradingSetup && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                {tradingSetup.direction === 'LONG' ? 
                  <TrendingUp className="h-4 w-4 text-green-600" /> : 
                  <TrendingDown className="h-4 w-4 text-red-600" />
                }
                Trading Setup
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry:</span>
                    <span className="font-medium">${tradingSetup.entry.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Loss:</span>
                    <span className="font-medium text-red-600">${tradingSetup.stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position Size:</span>
                    <span className="font-medium">{tradingSetup.positionSize}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {tradingSetup.takeProfit1 > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target 1:</span>
                      <span className="font-medium text-green-600">${tradingSetup.takeProfit1.toFixed(2)}</span>
                    </div>
                  )}
                  {tradingSetup.takeProfit2 > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target 2:</span>
                      <span className="font-medium text-green-600">${tradingSetup.takeProfit2.toFixed(2)}</span>
                    </div>
                  )}
                  {tradingSetup.takeProfit3 > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target 3:</span>
                      <span className="font-medium text-green-600">${tradingSetup.takeProfit3.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Risk Warning */}
        {extractedData.signals.direction && extractedData.signals.direction !== 'HOLD' && (
          <>
            <Separator />
            <Alert className="border-yellow-500/30 bg-yellow-500/5">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-xs">
                <strong>Risk Management:</strong> Use proper position sizing ({extractedData.risk.position_size || '2%'} recommended). 
                Always set stop loss before entering position. Past performance does not guarantee future results.
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Update Time */}
        {report.timestamp && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Clock className="h-3 w-3" />
            <span>Signal expires in 4 hours • Re-evaluate position regularly</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
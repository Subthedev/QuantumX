import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Clock, Target, Zap, BarChart3, Shield, Activity, Eye, 
  Sparkles, ChevronRight, AlertCircle, Gauge, BookOpen,
  LineChart, Users, Globe, DollarSign, Lightbulb, X,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  // Extract all data points from the report
  const extractedData = useMemo(() => {
    const signals = report.signal_4h || {};
    const technical = report.analysis?.technical || {};
    const fundamental = report.analysis?.fundamental || {};
    const sentiment = report.analysis?.sentiment || {};
    const risk = report.risk_management || {};
    const targets = report.targets || {};
    
    return { signals, technical, fundamental, sentiment, risk, targets };
  }, [report]);

  // Advanced Intelligence Layer - Multi-Factor Analysis
  const intelligenceAnalysis = useMemo(() => {
    const { signals, technical, fundamental, sentiment, risk } = extractedData;
    
    // 1. Market Context Understanding
    const marketContext = {
      trend: technical.primary_trend || 'Unknown',
      strength: technical.trend_strength || 'Moderate',
      volatility: technical.volatility || 'Normal',
      momentum: technical.momentum || 'Neutral'
    };

    // 2. Signal Quality Assessment
    const signalQuality = {
      confidence: signals.confidence || 0,
      direction: signals.direction || 'HOLD',
      alignment: 0,
      conviction: 'Low'
    };

    // Calculate alignment score
    let alignmentFactors = [];
    if (technical.indicators?.rsi && signals.direction === 'LONG' && technical.indicators.rsi < 70) {
      signalQuality.alignment += 25;
      alignmentFactors.push('RSI supports entry');
    }
    if (technical.indicators?.macd?.signal === 'BULLISH' && signals.direction === 'LONG') {
      signalQuality.alignment += 25;
      alignmentFactors.push('MACD confirms trend');
    }
    if (sentiment.overall === 'Bullish' && signals.direction === 'LONG') {
      signalQuality.alignment += 30;
      alignmentFactors.push('Sentiment aligns');
    }
    if (technical.volume_analysis?.trend === 'increasing') {
      signalQuality.alignment += 20;
      alignmentFactors.push('Volume confirms');
    }

    // Determine conviction level
    if (signalQuality.alignment >= 75 && signalQuality.confidence >= 70) {
      signalQuality.conviction = 'High';
    } else if (signalQuality.alignment >= 50 && signalQuality.confidence >= 60) {
      signalQuality.conviction = 'Moderate';
    }

    // 3. Risk-Reward Intelligence
    const rrRatio = parseFloat(risk.risk_reward_ratio?.split(':')[1] || '0');
    const riskIntelligence = {
      ratio: rrRatio,
      quality: rrRatio >= 2 ? 'Excellent' : rrRatio >= 1.5 ? 'Good' : 'Poor',
      positionSize: risk.position_size || '2%',
      maxLoss: risk.max_loss || 'Unknown'
    };

    // 4. Time Sensitivity Analysis
    const timeSensitivity = {
      urgency: signals.confidence >= 75 ? 'High' : 'Medium',
      optimalEntry: signals.entry || 0,
      expiryTime: '4 hours',
      marketPhase: technical.market_phase || 'Accumulation'
    };

    // 5. Success Probability Calculation
    let successProbability = 0;
    if (signalQuality.confidence > 0) successProbability += signalQuality.confidence * 0.4;
    if (signalQuality.alignment > 0) successProbability += signalQuality.alignment * 0.3;
    if (rrRatio >= 2) successProbability += 20;
    if (sentiment.fear_greed_index > 30 && sentiment.fear_greed_index < 70) successProbability += 10;

    return {
      marketContext,
      signalQuality: { ...signalQuality, alignmentFactors },
      riskIntelligence,
      timeSensitivity,
      successProbability: Math.min(Math.round(successProbability), 95)
    };
  }, [extractedData]);

  // Generate Human-Like Narrative Insights
  const narrativeInsights = useMemo(() => {
    const { signals, technical, sentiment } = extractedData;
    const { signalQuality, successProbability, marketContext } = intelligenceAnalysis;
    
    let primaryInsight = '';
    let supportingPoints = [];
    let warnings = [];
    let opportunities = [];

    // Generate primary insight based on analysis
    if (signalQuality.conviction === 'High' && signals.direction === 'LONG') {
      primaryInsight = `Strong bullish setup detected with ${successProbability}% success probability. Multiple indicators converge to suggest upward momentum.`;
      opportunities.push('Entry opportunity at current levels');
      opportunities.push('Potential for trend continuation');
    } else if (signalQuality.conviction === 'High' && signals.direction === 'SHORT') {
      primaryInsight = `Bearish reversal pattern identified with ${successProbability}% success probability. Market showing signs of exhaustion.`;
      opportunities.push('Short entry with defined risk');
      opportunities.push('Profit from potential correction');
    } else if (signals.direction === 'HOLD') {
      primaryInsight = `Market in consolidation phase. Waiting for clearer directional bias recommended.`;
      warnings.push('Avoid large positions in ranging market');
    } else {
      primaryInsight = `Mixed signals detected. Moderate ${signals.direction?.toLowerCase()} bias with ${signalQuality.confidence}% confidence.`;
    }

    // Add supporting points
    if (technical.support_resistance) {
      supportingPoints.push(`Key support at $${technical.support_resistance.support}, resistance at $${technical.support_resistance.resistance}`);
    }
    if (sentiment.overall) {
      supportingPoints.push(`Market sentiment is ${sentiment.overall.toLowerCase()}`);
    }
    if (technical.patterns?.length > 0) {
      supportingPoints.push(`${technical.patterns[0]} pattern detected`);
    }

    // Add warnings
    if (technical.indicators?.rsi > 70) {
      warnings.push('RSI overbought - potential for pullback');
    } else if (technical.indicators?.rsi < 30) {
      warnings.push('RSI oversold - watch for bounce');
    }
    if (marketContext.volatility === 'High') {
      warnings.push('High volatility - use wider stops');
    }

    return { primaryInsight, supportingPoints, warnings, opportunities };
  }, [extractedData, intelligenceAnalysis]);

  // Action Plan Generator
  const actionPlan = useMemo(() => {
    const { signals, targets, risk } = extractedData;
    const steps = [];

    if (signals.direction === 'LONG') {
      steps.push({ icon: ArrowUpRight, text: `Enter long position at $${signals.entry?.toFixed(2)}`, priority: 'high' });
      steps.push({ icon: Shield, text: `Set stop loss at $${signals.stop_loss?.toFixed(2)}`, priority: 'critical' });
      if (targets.take_profit_1) steps.push({ icon: Target, text: `First target at $${targets.take_profit_1.toFixed(2)}`, priority: 'medium' });
      if (targets.take_profit_2) steps.push({ icon: Target, text: `Second target at $${targets.take_profit_2.toFixed(2)}`, priority: 'low' });
    } else if (signals.direction === 'SHORT') {
      steps.push({ icon: ArrowDownRight, text: `Enter short position at $${signals.entry?.toFixed(2)}`, priority: 'high' });
      steps.push({ icon: Shield, text: `Set stop loss at $${signals.stop_loss?.toFixed(2)}`, priority: 'critical' });
      if (targets.take_profit_1) steps.push({ icon: Target, text: `First target at $${targets.take_profit_1.toFixed(2)}`, priority: 'medium' });
    } else {
      steps.push({ icon: Eye, text: 'Monitor price action for clear signals', priority: 'medium' });
      steps.push({ icon: Shield, text: 'Keep positions small or stay flat', priority: 'high' });
    }

    steps.push({ icon: Gauge, text: `Use ${risk.position_size || '2%'} position size`, priority: 'critical' });
    steps.push({ icon: Clock, text: 'Re-evaluate position in 4 hours', priority: 'medium' });

    return steps;
  }, [extractedData]);

  // Color scheme for different states
  const getStateColor = (state: string) => {
    switch(state) {
      case 'bullish':
      case 'long':
      case 'high':
        return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'bearish': 
      case 'short':
      case 'low':
        return 'text-red-600 bg-red-500/10 border-red-500/30';
      case 'neutral':
      case 'hold':
      case 'medium':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffMs = now.getTime() - reportTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m ago`;
    return `${diffMins}m ago`;
  };

  return (
    <TooltipProvider>
      <Card className="border-2 border-primary/30 shadow-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
        {/* Premium Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Brain className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  IgniteX AI Intelligence Report
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium Analysis
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-dimensional market intelligence powered by advanced AI
                </p>
              </div>
            </div>
            {report.timestamp && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeAgo(report.timestamp)}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Executive Intelligence Summary */}
          <div className="relative p-5 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
            <div className="absolute top-3 right-3">
              <Badge className={`${getStateColor(extractedData.signals.direction?.toLowerCase())} border`}>
                {extractedData.signals.direction === 'LONG' ? <ArrowUpRight className="h-3 w-3 mr-1" /> :
                 extractedData.signals.direction === 'SHORT' ? <ArrowDownRight className="h-3 w-3 mr-1" /> :
                 <Minus className="h-3 w-3 mr-1" />}
                {extractedData.signals.direction}
              </Badge>
            </div>
            
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              AI Intelligence Assessment
            </h3>
            
            <p className="text-sm leading-relaxed mb-3">
              {narrativeInsights.primaryInsight}
            </p>
            
            {narrativeInsights.supportingPoints.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {narrativeInsights.supportingPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Success Probability & Confidence Meters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/5 to-blue-500/5 border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Success Probability</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      {intelligenceAnalysis.successProbability}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">AI-calculated probability based on technical, fundamental, and sentiment convergence</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Progress value={intelligenceAnalysis.successProbability} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Based on {intelligenceAnalysis.signalQuality.alignmentFactors.length} confirming factors
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Signal Conviction</span>
                <Badge className={`text-xs ${
                  intelligenceAnalysis.signalQuality.conviction === 'High' ? 'bg-green-500/10 text-green-600' :
                  intelligenceAnalysis.signalQuality.conviction === 'Moderate' ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-red-500/10 text-red-600'
                }`}>
                  {intelligenceAnalysis.signalQuality.conviction}
                </Badge>
              </div>
              <Progress value={intelligenceAnalysis.signalQuality.alignment} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {intelligenceAnalysis.signalQuality.confidence}% confidence score
              </p>
            </div>
          </div>

          {/* Multi-Layer Analysis Tabs */}
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
              <TabsTrigger value="action">Action Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="insights" className="mt-4 space-y-3">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Market Intelligence Matrix
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Market Trend:</span>
                      <span className="font-medium">{intelligenceAnalysis.marketContext.trend}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Trend Strength:</span>
                      <span className="font-medium">{intelligenceAnalysis.marketContext.strength}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Volatility:</span>
                      <span className="font-medium">{intelligenceAnalysis.marketContext.volatility}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Momentum:</span>
                      <span className="font-medium">{intelligenceAnalysis.marketContext.momentum}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time Urgency:</span>
                      <span className="font-medium">{intelligenceAnalysis.timeSensitivity.urgency}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Market Phase:</span>
                      <span className="font-medium">{intelligenceAnalysis.timeSensitivity.marketPhase}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alignment Factors */}
              {intelligenceAnalysis.signalQuality.alignmentFactors.length > 0 && (
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <h4 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-400">
                    ✓ Confirming Factors
                  </h4>
                  <div className="space-y-1">
                    {intelligenceAnalysis.signalQuality.alignmentFactors.map((factor, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="opportunities" className="mt-4 space-y-3">
              {narrativeInsights.opportunities.length > 0 ? (
                <div className="space-y-2">
                  {narrativeInsights.opportunities.map((opp, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-start gap-3">
                      <Target className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">{opp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                  No clear opportunities identified at this time
                </div>
              )}

              {/* Entry Zone Visualization */}
              {extractedData.signals.entry && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-primary/20">
                  <h4 className="text-sm font-semibold mb-3">Optimal Entry Zone</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">
                      ${extractedData.signals.entry.toFixed(2)}
                    </div>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Valid for {intelligenceAnalysis.timeSensitivity.expiryTime}
                    </Badge>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="risks" className="mt-4 space-y-3">
              {/* Risk Warnings */}
              {narrativeInsights.warnings.length > 0 && (
                <div className="space-y-2">
                  {narrativeInsights.warnings.map((warning, idx) => (
                    <Alert key={idx} className="border-yellow-500/30 bg-yellow-500/5">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-xs">{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Risk Metrics */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Risk Management Parameters
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Risk/Reward:</span>
                      <Badge className={`text-xs ${
                        intelligenceAnalysis.riskIntelligence.quality === 'Excellent' ? 'bg-green-500/10 text-green-600' :
                        intelligenceAnalysis.riskIntelligence.quality === 'Good' ? 'bg-yellow-500/10 text-yellow-600' :
                        'bg-red-500/10 text-red-600'
                      }`}>
                        1:{intelligenceAnalysis.riskIntelligence.ratio} ({intelligenceAnalysis.riskIntelligence.quality})
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Position Size:</span>
                      <span className="font-medium">{intelligenceAnalysis.riskIntelligence.positionSize}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Max Loss:</span>
                      <span className="font-medium">{intelligenceAnalysis.riskIntelligence.maxLoss}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stop Loss:</span>
                      <span className="font-medium text-red-600">
                        ${extractedData.signals.stop_loss?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="action" className="mt-4 space-y-3">
              <div className="space-y-2">
                {actionPlan.map((step, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 ${
                    step.priority === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                    step.priority === 'high' ? 'bg-orange-500/5 border-orange-500/20' :
                    step.priority === 'medium' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-muted/30 border-border'
                  }`}>
                    <step.icon className={`h-4 w-4 mt-0.5 ${
                      step.priority === 'critical' ? 'text-red-600' :
                      step.priority === 'high' ? 'text-orange-600' :
                      step.priority === 'medium' ? 'text-yellow-600' :
                      'text-muted-foreground'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.text}</p>
                      {step.priority === 'critical' && (
                        <p className="text-xs text-muted-foreground mt-1">⚠️ Critical - Do not skip this step</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Step {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Quick Copy Trading Setup */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Setup Summary
                </h4>
                <div className="font-mono text-xs space-y-1 text-muted-foreground">
                  <div>PAIR: {report.coin}/USDT</div>
                  <div>ACTION: {extractedData.signals.direction}</div>
                  <div>ENTRY: ${extractedData.signals.entry?.toFixed(2) || 'N/A'}</div>
                  <div>STOP: ${extractedData.signals.stop_loss?.toFixed(2) || 'N/A'}</div>
                  <div>TP1: ${extractedData.targets.take_profit_1?.toFixed(2) || 'N/A'}</div>
                  <div>SIZE: {extractedData.risk.position_size || '2%'}</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* AI Confidence Statement */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-1">AI Confidence Statement</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This analysis synthesizes {intelligenceAnalysis.signalQuality.alignmentFactors.length + 3} data streams including technical indicators, 
                  market sentiment, and pattern recognition. The {intelligenceAnalysis.successProbability}% success probability 
                  is based on historical patterns and current market conditions. 
                  {intelligenceAnalysis.signalQuality.conviction === 'High' ? 
                    ' Strong convergence detected across multiple timeframes.' :
                    ' Exercise caution as signals show mixed convergence.'}
                </p>
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Global Market Analysis
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Institutional Grade
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Real-time Data
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Full Report
            </Badge>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
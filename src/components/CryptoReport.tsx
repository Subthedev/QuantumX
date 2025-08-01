import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Target, Shield, BarChart3, Activity, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CryptoReportData {
  id: string;
  coin_symbol: string;
  prediction_summary: string;
  confidence_score: number;
  report_data: {
    summary: string;
    confidence: number;
    market_direction?: string;
    analysis: {
      technical: {
        trend?: string;
        primary_trend?: string;
        support_levels: number[] | string;
        resistance_levels: number[] | string;
        indicators: string[] | string;
        key_indicators?: string;
        breakout_scenarios?: string;
      };
      fundamental: {
        strengths: string[];
        weaknesses: string[];
        market_position: string;
        adoption_metrics?: string;
        competitive_position?: string;
        macro_environment?: string;
        institutional_flow?: string;
        network_health?: string;
        competitive_landscape?: string;
        catalysts?: string;
      };
      sentiment: {
        overall: string;
        factors: string[];
        risk_level: string;
        market_sentiment?: string;
        fear_greed_analysis?: string;
        social_metrics?: string;
        options_flow?: string;
        contrarian_indicators?: string;
      };
      multi_directional_signals?: {
        bullish_scenario: {
          probability: string;
          triggers: string;
          targets: string;
          timeframe: string;
          risk_factors: string;
        };
        bearish_scenario: {
          probability: string;
          triggers: string;
          targets: string;
          timeframe: string;
          risk_factors: string;
        };
        neutral_scenario: {
          probability: string;
          range: string;
          duration: string;
          breakout_catalysts: string;
        };
      };
    };
    targets: {
      take_profit_1: number;
      take_profit_2: number;
      take_profit_3: number;
      stop_loss: number;
      target_timeframe: string;
    };
    risk_management: {
      position_size: string;
      risk_reward_ratio: string;
      max_drawdown: string;
    };
    quantitative_metrics?: {
      sharpe_ratio_estimate: string;
      max_drawdown_probability: string;
      volatility_forecast: string;
      correlation_factors: string;
    };
    execution_strategy?: {
      entry_zones: string;
      position_sizing: string;
      stop_loss_strategy: string;
      profit_taking: string;
      hedging_options: string;
    };
    risk_assessment?: {
      tail_risks: string;
      correlation_risks: string;
      liquidity_risks: string;
      regulatory_risks: string;
      technical_risks: string;
    };
    market_data: {
      price: number;
      percentChange24h: number;
      volume24h: number;
      marketCap: number;
      name?: string;
      symbol?: string;
    };
    timestamp: string;
    coin: string;
  };
  created_at: string;
}

interface CryptoReportProps {
  coin: string;
  icon: React.ReactNode;
  name: string;
  existingReport?: CryptoReportData;
}

const CryptoReport = ({ coin, icon, name, existingReport }: CryptoReportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CryptoReportData | undefined>(existingReport);

  const generateReport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate reports.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-crypto-report', {
        body: { 
          coin: coin,
          userId: user.id 
        }
      });

      if (error) throw error;

      setReport(data);
      toast({
        title: "Report Generated",
        description: `Professional analysis for ${name} has been created successfully.`,
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'bullish' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : trend === 'bearish' ? (
      <TrendingDown className="h-4 w-4 text-red-600" />
    ) : (
      <Activity className="h-4 w-4 text-yellow-600" />
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatCurrency = (value: number | string | undefined | null) => {
    // Handle invalid values
    if (value === null || value === undefined || value === '') {
      return '$0.00';
    }

    // Convert to number and validate
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    
    if (isNaN(numValue) || !isFinite(numValue)) {
      return '$0.00';
    }

    try {
      // Determine appropriate decimal places
      let maximumFractionDigits = 2;
      if (numValue >= 100) {
        maximumFractionDigits = 2;
      } else if (numValue >= 1) {
        maximumFractionDigits = 2;
      } else if (numValue >= 0.01) {
        maximumFractionDigits = 4;
      } else {
        maximumFractionDigits = 6;
      }

      // Ensure maximumFractionDigits is within valid range (0-20)
      maximumFractionDigits = Math.min(20, Math.max(0, maximumFractionDigits));

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: Math.min(2, maximumFractionDigits),
        maximumFractionDigits: maximumFractionDigits
      }).format(numValue);
    } catch (error) {
      console.error('formatCurrency error:', error, 'value:', numValue);
      return '$0.00';
    }
  };

  const formatLargeNumber = (value: number | undefined | null) => {
    // Handle invalid values
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0';
    }

    // Ensure value is a valid number
    const numValue = Number(value);
    if (!isFinite(numValue)) {
      return '$0';
    }

    if (numValue >= 1e12) return `$${(numValue / 1e12).toFixed(2)}T`;
    if (numValue >= 1e9) return `$${(numValue / 1e9).toFixed(2)}B`;
    if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(2)}M`;
    return formatCurrency(numValue);
  };

  // Helper function to safely render potentially structured data
  const renderSafeContent = (content: any): React.ReactNode => {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      // If it's an object, convert it to a readable format
      if (Array.isArray(content)) {
        return content.join(', ');
      }
      
      // For objects like {moderate: "5%", aggressive: "8%", conservative: "2%"}
      return Object.entries(content)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    
    return String(content || 'Not available');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-xl">{name}</CardTitle>
              <CardDescription>{coin} Analysis</CardDescription>
            </div>
          </div>
          {report && (
            <Badge className={`${getConfidenceColor(report.confidence_score)} text-white`}>
              {report.confidence_score}% Confidence
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!report ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              Generate a professional AI-powered analysis for {name}
            </div>
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Report...
                </div>
              ) : (
                'Generate Professional Report'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Market Overview */}
            {report.report_data?.market_data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Current Price</div>
                  <div className="font-bold text-xl text-primary">{formatCurrency(report.report_data.market_data?.price)}</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl border border-secondary/20">
                  <div className="text-xs text-muted-foreground font-medium mb-1">24h Change</div>
                  <div className={`font-bold text-xl ${(report.report_data.market_data?.percentChange24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(report.report_data.market_data?.percentChange24h || 0) >= 0 ? '+' : ''}{(report.report_data.market_data?.percentChange24h || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border border-accent/20">
                  <div className="text-xs text-muted-foreground font-medium mb-1">24h Volume</div>
                  <div className="font-bold text-lg">{formatLargeNumber(report.report_data.market_data?.volume24h)}</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-muted/20 to-muted/30 rounded-xl border border-muted">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Market Cap</div>
                  <div className="font-bold text-lg">{formatLargeNumber(report.report_data.market_data?.marketCap)}</div>
                </div>
              </div>
            )}

            {/* Executive Summary */}
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Executive Summary</h3>
                {getTrendIcon(report.report_data.analysis?.technical?.trend || 'neutral')}
              </div>
              <p className="text-sm leading-relaxed">{report.prediction_summary}</p>
            </div>

            {/* Trading Targets */}
            {report.report_data.targets && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Trading Targets</h3>
                  <Badge variant="outline" className="text-xs">
                    {report.report_data.targets.target_timeframe}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                    <div className="text-xs text-green-700 font-semibold mb-1">TP1</div>
                    <div className="font-bold text-lg text-green-800">{formatCurrency(report.report_data.targets?.take_profit_1)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                    <div className="text-xs text-green-700 font-semibold mb-1">TP2</div>
                    <div className="font-bold text-lg text-green-800">{formatCurrency(report.report_data.targets?.take_profit_2)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                    <div className="text-xs text-green-700 font-semibold mb-1">TP3</div>
                    <div className="font-bold text-lg text-green-800">{formatCurrency(report.report_data.targets?.take_profit_3)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-sm">
                    <div className="text-xs text-red-700 font-semibold mb-1">Stop Loss</div>
                    <div className="font-bold text-lg text-red-800">{formatCurrency(report.report_data.targets?.stop_loss)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Analysis */}
            {report.report_data.analysis?.technical && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Technical Analysis</h3>
                  <Badge variant={report.report_data.analysis.technical.trend === 'bullish' ? 'default' : 
                                report.report_data.analysis.technical.trend === 'bearish' ? 'destructive' : 'secondary'}>
                    {report.report_data.analysis.technical.trend}
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Support Levels
                    </h4>
                    <div className="space-y-2">
                      {Array.isArray(report.report_data.analysis.technical.support_levels) ? 
                        report.report_data.analysis.technical.support_levels.map((level, index) => (
                          <div key={index} className="text-sm bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200 font-medium text-green-800">
                            {formatCurrency(level)}
                          </div>
                        )) : (
                          // Generate fallback support levels based on current price
                          report.report_data.market_data?.price ? [
                            report.report_data.market_data.price * 0.97,
                            report.report_data.market_data.price * 0.94,
                            report.report_data.market_data.price * 0.91
                          ].map((level, index) => (
                            <div key={index} className="text-sm bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200 font-medium text-green-800">
                              {formatCurrency(level)}
                            </div>
                          )) : (
                            <div className="text-sm bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200 font-medium text-green-800">
                              {typeof report.report_data.analysis.technical.support_levels === 'string' ? 
                                report.report_data.analysis.technical.support_levels : 'No support levels available'}
                            </div>
                          )
                        )
                      }
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Resistance Levels
                    </h4>
                    <div className="space-y-2">
                      {Array.isArray(report.report_data.analysis.technical.resistance_levels) ? 
                        report.report_data.analysis.technical.resistance_levels.map((level, index) => (
                          <div key={index} className="text-sm bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200 font-medium text-red-800">
                            {formatCurrency(level)}
                          </div>
                        )) : (
                          // Generate fallback resistance levels based on current price
                          report.report_data.market_data?.price ? [
                            report.report_data.market_data.price * 1.03,
                            report.report_data.market_data.price * 1.06,
                            report.report_data.market_data.price * 1.09
                          ].map((level, index) => (
                            <div key={index} className="text-sm bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200 font-medium text-red-800">
                              {formatCurrency(level)}
                            </div>
                          )) : (
                            <div className="text-sm bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200 font-medium text-red-800">
                              {typeof report.report_data.analysis.technical.resistance_levels === 'string' ? 
                                report.report_data.analysis.technical.resistance_levels : 'No resistance levels available'}
                            </div>
                          )
                        )
                      }
                    </div>
                  </div>
                </div>
                {report.report_data.analysis.technical.indicators && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium mb-2">Key Indicators</h4>
                    <div className="space-y-1">
                      {Array.isArray(report.report_data.analysis.technical.indicators) ? 
                        report.report_data.analysis.technical.indicators.map((indicator, index) => (
                          <div key={index} className="text-sm text-muted-foreground">• {indicator}</div>
                        )) : (
                          <div className="text-sm text-muted-foreground">
                            {typeof report.report_data.analysis.technical.indicators === 'string' ? 
                              report.report_data.analysis.technical.indicators : 'No indicators available'}
                          </div>
                        )
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trade Recommendation */}
            {report.report_data.analysis?.multi_directional_signals && (
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-600 shadow-2xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-50"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/20 rounded-xl border border-primary/30">
                        <Target className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-white">AI Trade Signal</h3>
                        <p className="text-slate-300 text-sm">Professional Market Analysis</p>
                      </div>
                    </div>
                    {report.report_data.market_direction && (
                      <Badge className="bg-primary text-white text-sm px-4 py-2 font-semibold animate-pulse">
                        {report.report_data.market_direction.replace('_', ' ').toUpperCase()} BIAS
                      </Badge>
                    )}
                  </div>
                
                  {/* Main Signal */}
                  {(() => {
                    const signals = report.report_data.analysis.multi_directional_signals;
                    const bullishProb = parseInt(signals.bullish_scenario.probability.replace('%', '')) || 0;
                    const bearishProb = parseInt(signals.bearish_scenario.probability.replace('%', '')) || 0;
                    const neutralProb = parseInt(signals.neutral_scenario.probability.replace('%', '')) || 0;
                    
                    const maxProb = Math.max(bullishProb, bearishProb, neutralProb);
                    let direction = 'NEUTRAL';
                    let directionColor = 'yellow';
                    let directionBg = 'bg-yellow-500';
                    let directionIcon = <Activity className="h-6 w-6" />;
                    let actionText = 'HOLD';
                    let actionColor = 'bg-yellow-600';
                    
                    if (maxProb === bullishProb && bullishProb > 40) {
                      direction = 'BULLISH';
                      directionColor = 'emerald';
                      directionBg = 'bg-emerald-500';
                      directionIcon = <TrendingUp className="h-6 w-6" />;
                      actionText = 'BUY';
                      actionColor = 'bg-emerald-600';
                    } else if (maxProb === bearishProb && bearishProb > 40) {
                      direction = 'BEARISH';
                      directionColor = 'red';
                      directionBg = 'bg-red-500';
                      directionIcon = <TrendingDown className="h-6 w-6" />;
                      actionText = 'SELL';
                      actionColor = 'bg-red-600';
                    }
                    
                    return (
                      <div className="space-y-6">
                        {/* Signal Strength */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`p-4 ${directionBg}/20 rounded-xl border border-${directionColor}-500/30`}>
                                <div className={`text-${directionColor}-400`}>
                                  {directionIcon}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-bold text-xl text-white">
                                  {direction} SIGNAL
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-slate-300 text-sm">Confidence:</span>
                                  <span className={`font-bold text-${directionColor}-400`}>{maxProb}%</span>
                                </div>
                              </div>
                            </div>
                            <div className={`${actionColor} text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg hover:scale-105 transition-transform cursor-pointer`}>
                              {actionText}
                            </div>
                          </div>
                          
                          {/* Confidence Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                              <span>Signal Strength</span>
                              <span>{maxProb}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                              <div 
                                className={`h-full ${directionBg} rounded-full transition-all duration-1000 animate-pulse`}
                                style={{ width: `${maxProb}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Plan */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Entry Strategy */}
                          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-primary/20 rounded-lg">
                                <Target className="h-5 w-5 text-primary" />
                              </div>
                              <h5 className="font-semibold text-white">Entry Strategy</h5>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-slate-400 text-sm block mb-1">Key Triggers:</span>
                                <p className="text-slate-200 text-sm bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                  {direction === 'BULLISH' 
                                    ? renderSafeContent(signals.bullish_scenario.triggers)
                                    : direction === 'BEARISH'
                                    ? renderSafeContent(signals.bearish_scenario.triggers)
                                    : renderSafeContent(signals.neutral_scenario.breakout_catalysts)
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Price Targets */}
                          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-accent/20 rounded-lg">
                                <DollarSign className="h-5 w-5 text-accent" />
                              </div>
                              <h5 className="font-semibold text-white">
                                {direction === 'NEUTRAL' ? 'Expected Range' : 'Price Targets'}
                              </h5>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-slate-400 text-sm block mb-1">Targets:</span>
                                <p className="text-slate-200 text-sm bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                  {direction === 'BULLISH' 
                                    ? renderSafeContent(signals.bullish_scenario.targets)
                                    : direction === 'BEARISH'
                                    ? renderSafeContent(signals.bearish_scenario.targets)
                                    : renderSafeContent(signals.neutral_scenario.range)
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Timeline & Risk */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Activity className="h-4 w-4 text-blue-400" />
                                <span className="font-medium text-white">Timeline</span>
                              </div>
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <span className="text-blue-300 font-medium">
                                  {direction === 'BULLISH' 
                                    ? renderSafeContent(signals.bullish_scenario.timeframe)
                                    : direction === 'BEARISH'
                                    ? renderSafeContent(signals.bearish_scenario.timeframe)
                                    : renderSafeContent(signals.neutral_scenario.duration)
                                  }
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                <span className="font-medium text-white">Risk Factors</span>
                              </div>
                              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <p className="text-red-300 text-sm">
                                  {(() => {
                                    if (maxProb === bullishProb) {
                                      return renderSafeContent(signals.bullish_scenario.risk_factors);
                                    } else {
                                      return renderSafeContent(signals.bearish_scenario.risk_factors);
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Professional Disclaimer */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-amber-200 text-sm font-medium mb-1">Professional Trading Advisory</p>
                              <p className="text-amber-300/80 text-xs leading-relaxed">
                                This AI-generated signal is for educational purposes. Always conduct your own research and consider your risk tolerance before trading. Past performance does not guarantee future results.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Quantitative Metrics */}
            {report.report_data.quantitative_metrics && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-800">Quantitative Metrics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Sharpe Ratio:</span>
                    <p className="text-slate-600 mt-1">{renderSafeContent(report.report_data.quantitative_metrics.sharpe_ratio_estimate)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Volatility Forecast:</span>
                    <p className="text-slate-600 mt-1">{renderSafeContent(report.report_data.quantitative_metrics.volatility_forecast)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Execution Strategy */}
            {report.report_data.execution_strategy && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-800">Execution Strategy</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-purple-700">Entry Zones:</span>
                    <p className="text-purple-600 mt-1">{renderSafeContent(report.report_data.execution_strategy.entry_zones)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">Hedging Options:</span>
                    <p className="text-purple-600 mt-1">{renderSafeContent(report.report_data.execution_strategy.hedging_options)}</p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Fundamental Analysis */}
            {report.report_data.analysis?.fundamental && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Fundamental Analysis</h3>
                </div>
                <div className="space-y-4">
                  {/* Macro Environment */}
                  {report.report_data.analysis.fundamental.macro_environment && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">Macro Environment</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.fundamental.macro_environment)}
                      </p>
                    </div>
                  )}
                  
                  {/* Institutional Flow */}
                  {report.report_data.analysis.fundamental.institutional_flow && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
                      <h4 className="text-sm font-semibold text-emerald-700 mb-2">Institutional Flow</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.fundamental.institutional_flow)}
                      </p>
                    </div>
                  )}
                  
                  {/* Network Health */}
                  {report.report_data.analysis.fundamental.network_health && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Network Health</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.fundamental.network_health)}
                      </p>
                    </div>
                  )}
                  
                  {/* Competitive Landscape */}
                  {report.report_data.analysis.fundamental.competitive_landscape && (
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-700 mb-2">Competitive Landscape</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.fundamental.competitive_landscape)}
                      </p>
                    </div>
                  )}
                  
                  {/* Catalysts */}
                  {report.report_data.analysis.fundamental.catalysts && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="text-sm font-semibold text-orange-700 mb-2">Key Catalysts</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.fundamental.catalysts)}
                      </p>
                    </div>
                  )}
                  
                  {/* Fallback for legacy data */}
                  {report.report_data.analysis.fundamental.market_position && (
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Market Position</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.fundamental.market_position)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sentiment Analysis */}
            {report.report_data.analysis?.sentiment && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">Sentiment Analysis</h3>
                  {report.report_data.analysis.sentiment.risk_level && (
                    <Badge className={getRiskColor(report.report_data.analysis.sentiment.risk_level)}>
                      {report.report_data.analysis.sentiment.risk_level} risk
                    </Badge>
                  )}
                </div>
                <div className="space-y-4">
                  {/* Market Sentiment */}
                  {report.report_data.analysis.sentiment.market_sentiment && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">Market Sentiment</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.sentiment.market_sentiment)}
                      </p>
                    </div>
                  )}
                  
                  {/* Fear & Greed Analysis */}
                  {report.report_data.analysis.sentiment.fear_greed_analysis && (
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-semibold text-yellow-700 mb-2">Fear & Greed Analysis</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.sentiment.fear_greed_analysis)}
                      </p>
                    </div>
                  )}
                  
                  {/* Social Metrics */}
                  {report.report_data.analysis.sentiment.social_metrics && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                      <h4 className="text-sm font-semibold text-indigo-700 mb-2">Social Metrics</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.sentiment.social_metrics)}
                      </p>
                    </div>
                  )}
                  
                  {/* Options Flow */}
                  {report.report_data.analysis.sentiment.options_flow && (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Options Flow</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.sentiment.options_flow)}
                      </p>
                    </div>
                  )}
                  
                  {/* Contrarian Indicators */}
                  {report.report_data.analysis.sentiment.contrarian_indicators && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
                      <h4 className="text-sm font-semibold text-red-700 mb-2">Contrarian Indicators</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {renderSafeContent(report.report_data.analysis.sentiment.contrarian_indicators)}
                      </p>
                    </div>
                  )}
                  
                  {/* Fallback for legacy sentiment data */}
                  {report.report_data.analysis.sentiment.overall && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Overall Sentiment</h4>
                        <Badge variant={report.report_data.analysis.sentiment.overall === 'bullish' ? 'default' : 
                                      report.report_data.analysis.sentiment.overall === 'bearish' ? 'destructive' : 'secondary'}>
                          {report.report_data.analysis.sentiment.overall}
                        </Badge>
                      </div>
                      {report.report_data.analysis.sentiment.factors && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Key Factors</h4>
                          <div className="space-y-1">
                            {report.report_data.analysis.sentiment.factors?.map((factor, index) => (
                              <div key={index} className="text-sm text-muted-foreground">• {factor}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Management */}
            {report.report_data.risk_management && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Risk Management</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-yellow-700">Position Size</div>
                    <div className="text-yellow-600">{report.report_data.risk_management.position_size}</div>
                  </div>
                  <div>
                    <div className="font-medium text-yellow-700">Risk:Reward</div>
                    <div className="text-yellow-600">{report.report_data.risk_management.risk_reward_ratio}</div>
                  </div>
                  <div>
                    <div className="font-medium text-yellow-700">Max Drawdown</div>
                    <div className="text-yellow-600">{report.report_data.risk_management.max_drawdown}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Generate New Report Button */}
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={generateReport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </div>
                ) : (
                  'Generate New Report'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CryptoReport;
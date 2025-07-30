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
    analysis: {
      technical: {
        trend: string;
        support_levels: number[];
        resistance_levels: number[];
        indicators: string[];
      };
      fundamental: {
        strengths: string[];
        weaknesses: string[];
        market_position: string;
      };
      sentiment: {
        overall: string;
        factors: string[];
        risk_level: string;
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
    market_data: {
      price: number;
      percentChange24h: number;
      volume24h: number;
      marketCap: number;
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
                      {report.report_data.analysis.technical.support_levels?.map((level, index) => (
                        <div key={index} className="text-sm bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200 font-medium text-green-800">
                          {formatCurrency(level)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Resistance Levels
                    </h4>
                    <div className="space-y-2">
                      {report.report_data.analysis.technical.resistance_levels?.map((level, index) => (
                        <div key={index} className="text-sm bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200 font-medium text-red-800">
                          {formatCurrency(level)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {report.report_data.analysis.technical.indicators && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium mb-2">Key Indicators</h4>
                    <div className="space-y-1">
                      {report.report_data.analysis.technical.indicators.map((indicator, index) => (
                        <div key={index} className="text-sm text-muted-foreground">• {indicator}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Fundamental & Sentiment Analysis */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Fundamental Analysis */}
              {report.report_data.analysis?.fundamental && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Fundamental Analysis</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Fundamental Strengths
                      </h4>
                      <div className="space-y-2">
                        {report.report_data.analysis.fundamental.strengths?.map((strength, index) => (
                          <div key={index} className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
                            • {strength}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Key Challenges
                      </h4>
                      <div className="space-y-2">
                        {report.report_data.analysis.fundamental.weaknesses?.map((weakness, index) => (
                          <div key={index} className="text-sm text-gray-700 bg-red-50 p-3 rounded-lg border border-red-200">
                            • {weakness}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-700 mb-2">Market Position</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {report.report_data.analysis.fundamental.market_position}
                      </p>
                    </div>
                    {(report.report_data.analysis.fundamental as any)?.adoption_metrics && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-700 mb-2">Adoption Metrics</h4>
                        <p className="text-sm text-gray-700">
                          {(report.report_data.analysis.fundamental as any).adoption_metrics}
                        </p>
                      </div>
                    )}
                    {(report.report_data.analysis.fundamental as any)?.competitive_position && (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
                        <h4 className="text-sm font-semibold text-emerald-700 mb-2">Competitive Position</h4>
                        <p className="text-sm text-gray-700">
                          {(report.report_data.analysis.fundamental as any).competitive_position}
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
                    <Badge className={getRiskColor(report.report_data.analysis.sentiment.risk_level)}>
                      {report.report_data.analysis.sentiment.risk_level} risk
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Market Sentiment</h4>
                      <Badge variant={report.report_data.analysis.sentiment.overall === 'bullish' ? 'default' : 
                                    report.report_data.analysis.sentiment.overall === 'bearish' ? 'destructive' : 'secondary'}>
                        {report.report_data.analysis.sentiment.overall}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Key Factors</h4>
                      <div className="space-y-1">
                        {report.report_data.analysis.sentiment.factors?.map((factor, index) => (
                          <div key={index} className="text-sm text-muted-foreground">• {factor}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
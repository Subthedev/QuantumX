import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Brain, LinkIcon, Wallet, DollarSign, AlertCircle, ArrowUpRight, ArrowDownRight, Target, Shield, CheckCircle2, TrendingDown, Clock } from 'lucide-react';
import { cryptoDataService } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface StructuredAnalysis {
  executive_summary: string;
  market_outlook: string;
  key_insights: string[];
  price_targets?: {
    short_term?: string;
    medium_term?: string;
    support_level?: string;
    resistance_level?: string;
  };
  risk_assessment?: {
    level: 'Low' | 'Medium' | 'High';
    factors: string[];
  };
  actionable_recommendations: string[];
  data_sources?: string[];
  detailed_analysis: string;
}

interface AnalysisResult {
  type: string;
  structuredAnalysis: StructuredAnalysis;
  timestamp: string;
  confidence: number;
  metrics: Record<string, any>;
  coinData: {
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume: number;
  };
}

const AIAnalysis = () => {
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('technical');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const { data: cryptos = [], isLoading: cryptosLoading } = useQuery({
    queryKey: ['top-cryptos-ai'],
    queryFn: () => cryptoDataService.getTopCryptos(50),
    refetchInterval: 60000
  });

  const analysisTypes = [
    {
      id: 'technical',
      label: 'Technical Analysis',
      icon: TrendingUp,
      description: 'Chart patterns, indicators, and price action analysis with entry/exit points'
    },
    {
      id: 'fundamental',
      label: 'Fundamental Analysis',
      icon: DollarSign,
      description: 'Market cap, tokenomics, project valuation, and long-term outlook'
    },
    {
      id: 'sentiment',
      label: 'Sentiment Analysis',
      icon: Brain,
      description: 'Market psychology, fear & greed metrics, and contrarian opportunities'
    },
    {
      id: 'onchain',
      label: 'On-Chain Analysis',
      icon: LinkIcon,
      description: 'Network activity, whale movements, and smart money positioning'
    },
    {
      id: 'etf',
      label: 'ETF & Institutional',
      icon: Wallet,
      description: 'ETF flows, institutional interest, and traditional finance integration'
    }
  ];

  const generateAnalysis = async () => {
    if (!selectedCoin) {
      toast({
        title: 'Please select a coin',
        description: 'You must select a cryptocurrency to analyze',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setAnalysisResult(null);

    try {
      const coinData = cryptos.find(c => c.id === selectedCoin);
      if (!coinData) throw new Error('Coin data not found');

      const detailedData = await cryptoDataService.getCryptoDetails(selectedCoin);

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          coin: coinData,
          detailedData,
          analysisType: selectedAnalysis
        }
      });

      if (error) throw error;

      console.log('Raw API response:', data);
      console.log('Structured analysis:', data.structuredAnalysis);

      // Ensure key_insights is always an array
      const structuredAnalysis = {
        ...data.structuredAnalysis,
        key_insights: Array.isArray(data.structuredAnalysis?.key_insights) 
          ? data.structuredAnalysis.key_insights 
          : [],
        actionable_recommendations: Array.isArray(data.structuredAnalysis?.actionable_recommendations)
          ? data.structuredAnalysis.actionable_recommendations
          : [],
        risk_assessment: data.structuredAnalysis?.risk_assessment || null,
        price_targets: data.structuredAnalysis?.price_targets || null,
        data_sources: Array.isArray(data.structuredAnalysis?.data_sources)
          ? data.structuredAnalysis.data_sources
          : []
      };

      setAnalysisResult({
        type: selectedAnalysis,
        structuredAnalysis,
        timestamp: data.timestamp,
        confidence: data.confidence,
        metrics: data.metrics,
        coinData: data.coinData
      });

      toast({
        title: 'Analysis Complete',
        description: `Professional ${coinData.name} analysis generated successfully`
      });
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate analysis. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'Low': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'High': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getOutlookIcon = (outlook: string) => {
    if (outlook.toLowerCase().includes('bullish')) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (outlook.toLowerCase().includes('bearish')) return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <ArrowUpRight className="h-5 w-5 text-yellow-500" />;
  };

  const renderAnalysisContent = () => {
    if (!analysisResult) return null;

    const { structuredAnalysis, coinData, confidence, metrics, timestamp } = analysisResult;

    return (
      <div className="space-y-6 mt-6">
        {/* Header Card with Coin Info */}
        <Card className="border-l-4 border-l-primary shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl font-bold">
                    {coinData.name} ({coinData.symbol.toUpperCase()})
                  </CardTitle>
                  <Badge variant={coinData.change24h >= 0 ? "default" : "destructive"}>
                    {coinData.change24h >= 0 ? '+' : ''}{coinData.change24h.toFixed(2)}%
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Generated: {new Date(timestamp).toLocaleString()}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">${coinData.price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Current Price</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="text-lg font-semibold">
                  ${(coinData.marketCap / 1e9).toFixed(2)}B
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">24h Volume</div>
                <div className="text-lg font-semibold">
                  ${(coinData.volume / 1e9).toFixed(2)}B
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">AI Confidence</div>
                <div className="text-lg font-semibold text-primary">{confidence}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">{structuredAnalysis.executive_summary}</p>
          </CardContent>
        </Card>

        {/* Market Outlook & Risk Assessment */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getOutlookIcon(structuredAnalysis.market_outlook)}
                Market Outlook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">{structuredAnalysis.market_outlook}</p>
            </CardContent>
          </Card>

          {structuredAnalysis.risk_assessment && (
            <Card className={getRiskColor(structuredAnalysis.risk_assessment.level)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Risk Level:</span>
                  <Badge className={getRiskColor(structuredAnalysis.risk_assessment.level)}>
                    {structuredAnalysis.risk_assessment.level}
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {structuredAnalysis.risk_assessment.factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Price Targets */}
        {structuredAnalysis.price_targets && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Price Targets & Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {structuredAnalysis.price_targets.resistance_level && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Resistance</div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {structuredAnalysis.price_targets.resistance_level}
                    </div>
                  </div>
                )}
                {structuredAnalysis.price_targets.short_term && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Short Term</div>
                    <div className="text-xl font-bold text-primary">
                      {structuredAnalysis.price_targets.short_term}
                    </div>
                  </div>
                )}
                {structuredAnalysis.price_targets.medium_term && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Medium Term</div>
                    <div className="text-xl font-bold text-primary">
                      {structuredAnalysis.price_targets.medium_term}
                    </div>
                  </div>
                )}
                {structuredAnalysis.price_targets.support_level && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Support</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {structuredAnalysis.price_targets.support_level}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Insights */}
        {structuredAnalysis.key_insights && structuredAnalysis.key_insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {structuredAnalysis.key_insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actionable Recommendations */}
        {structuredAnalysis.actionable_recommendations && structuredAnalysis.actionable_recommendations.length > 0 && (
          <Card className="border-2 border-primary/30 shadow-glow">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Actionable Recommendations
              </CardTitle>
              <CardDescription>
                Specific actions to consider based on this analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {structuredAnalysis.actionable_recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/40 transition-all">
                    <ArrowUpRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="font-medium">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Analysis */}
        {structuredAnalysis.detailed_analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {structuredAnalysis.detailed_analysis}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(metrics).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors">
                    <p className="text-xs text-muted-foreground capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-semibold">{String(value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Sources */}
        {structuredAnalysis.data_sources && Array.isArray(structuredAnalysis.data_sources) && structuredAnalysis.data_sources.length > 0 && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm">Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {structuredAnalysis.data_sources.map((source, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {source}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-glow">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            AI-Powered Crypto Analysis
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Professional-grade analysis powered by Claude AI • Real-time market data • Actionable insights
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Configure Analysis</CardTitle>
            <CardDescription>
              Select a cryptocurrency and analysis type to generate professional insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Cryptocurrency</label>
              <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {cryptosLoading ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : (
                      cryptos.map(crypto => (
                        <SelectItem key={crypto.id} value={crypto.id}>
                          <div className="flex items-center gap-2">
                            <img src={crypto.image} alt={crypto.name} className="w-5 h-5" />
                            <span>{crypto.name}</span>
                            <span className="text-muted-foreground">({crypto.symbol.toUpperCase()})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Analysis Type</label>
              <Tabs value={selectedAnalysis} onValueChange={setSelectedAnalysis}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-5 h-auto">
                  {analysisTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <TabsTrigger
                        key={type.id}
                        value={type.id}
                        className="flex flex-col gap-1 h-auto py-3"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{type.label.split(' ')[0]}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                <TabsContent value={selectedAnalysis} className="mt-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {analysisTypes.find(t => t.id === selectedAnalysis)?.description}
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>

            <Button
              onClick={generateAnalysis}
              disabled={isGenerating || !selectedCoin}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary shadow-elegant hover:shadow-glow transition-all"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Professional Analysis...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate AI Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {renderAnalysisContent()}
      </div>
    </div>
  );
};

export default AIAnalysis;

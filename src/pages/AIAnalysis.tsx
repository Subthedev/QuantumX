import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Brain, LinkIcon, Wallet, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { cryptoDataService } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TechnicalAnalysisCard } from '@/components/analysis/TechnicalAnalysisCard';
import { FundamentalAnalysisCard } from '@/components/analysis/FundamentalAnalysisCard';
import { SentimentAnalysisCard } from '@/components/analysis/SentimentAnalysisCard';
import { OnChainAnalysisCard } from '@/components/analysis/OnChainAnalysisCard';
import { ETFAnalysisCard } from '@/components/analysis/ETFAnalysisCard';

interface AnalysisResult {
  analysisType: string;
  structuredAnalysis: any;
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

      setAnalysisResult(data);

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

  const renderAnalysisContent = () => {
    if (!analysisResult) return null;

    const { analysisType, structuredAnalysis, coinData, confidence, metrics, timestamp } = analysisResult;

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

        {/* Render specific analysis card based on type */}
        {analysisType === 'technical' && (
          <TechnicalAnalysisCard data={structuredAnalysis} coinData={coinData} />
        )}
        {analysisType === 'fundamental' && (
          <FundamentalAnalysisCard data={structuredAnalysis} coinData={coinData} />
        )}
        {analysisType === 'sentiment' && (
          <SentimentAnalysisCard data={structuredAnalysis} coinData={coinData} />
        )}
        {analysisType === 'onchain' && (
          <OnChainAnalysisCard data={structuredAnalysis} coinData={coinData} />
        )}
        {analysisType === 'etf' && (
          <ETFAnalysisCard data={structuredAnalysis} coinData={coinData} />
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

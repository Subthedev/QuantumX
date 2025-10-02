import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Brain, LinkIcon, Wallet, DollarSign, AlertCircle } from 'lucide-react';
import { cryptoDataService } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface AnalysisResult {
  type: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  keyPoints?: string[];
  metrics?: Record<string, any>;
}

const AIAnalysis = () => {
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('technical');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  // Fetch top cryptos for selection
  const { data: cryptos = [], isLoading: cryptosLoading } = useQuery({
    queryKey: ['top-cryptos-ai'],
    queryFn: () => cryptoDataService.getTopCryptos(50),
    refetchInterval: 60000,
  });

  const analysisTypes = [
    { 
      id: 'technical', 
      label: 'Technical Analysis', 
      icon: TrendingUp,
      description: 'Chart patterns, indicators, and price action analysis'
    },
    { 
      id: 'fundamental', 
      label: 'Fundamental Analysis', 
      icon: DollarSign,
      description: 'Market cap, tokenomics, and project evaluation'
    },
    { 
      id: 'sentiment', 
      label: 'Sentiment Analysis', 
      icon: Brain,
      description: 'Social media trends, news sentiment, and market mood'
    },
    { 
      id: 'onchain', 
      label: 'On-Chain Analysis', 
      icon: LinkIcon,
      description: 'Network activity, whale movements, and blockchain metrics'
    },
    { 
      id: 'etf', 
      label: 'ETF Inflow Data', 
      icon: Wallet,
      description: 'ETF flows, institutional interest, and spot market impact'
    },
  ];

  const generateAnalysis = async () => {
    if (!selectedCoin) {
      toast({
        title: 'Please select a coin',
        description: 'You must select a cryptocurrency to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setAnalysisResult(null);

    try {
      // Get detailed coin data
      const coinData = cryptos.find(c => c.id === selectedCoin);
      if (!coinData) {
        throw new Error('Coin data not found');
      }

      // Fetch additional market data
      const detailedData = await cryptoDataService.getCryptoDetails(selectedCoin);

      // Call the edge function to generate AI analysis
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          coin: coinData,
          detailedData,
          analysisType: selectedAnalysis,
        },
      });

      if (error) throw error;

      setAnalysisResult({
        type: selectedAnalysis,
        content: data.analysis,
        timestamp: new Date(),
        confidence: data.confidence,
        keyPoints: data.keyPoints,
        metrics: data.metrics,
      });

      toast({
        title: 'Analysis Generated',
        description: `${analysisTypes.find(t => t.id === selectedAnalysis)?.label} completed successfully`,
      });
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate analysis. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderAnalysisContent = () => {
    if (!analysisResult) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">
                {analysisTypes.find(t => t.id === analysisResult.type)?.label}
              </CardTitle>
              {analysisResult.confidence && (
                <Badge variant={analysisResult.confidence > 70 ? 'default' : 'secondary'}>
                  {analysisResult.confidence}% Confidence
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(analysisResult.timestamp).toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisResult.keyPoints && analysisResult.keyPoints.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Key Insights
                </h4>
                <ul className="space-y-2">
                  {analysisResult.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Separator />
            
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {analysisResult.content}
              </div>
            </div>

            {analysisResult.metrics && Object.keys(analysisResult.metrics).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Key Metrics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(analysisResult.metrics).map(([key, value]) => (
                      <div key={key} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-semibold mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Generate comprehensive cryptocurrency analysis using real-time market data and advanced AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure Analysis</CardTitle>
            <CardDescription>
              Select a cryptocurrency and the type of analysis you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Coin Selection */}
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
                      cryptos.map((crypto) => (
                        <SelectItem key={crypto.id} value={crypto.id}>
                          <div className="flex items-center gap-2">
                            <img 
                              src={crypto.image} 
                              alt={crypto.name} 
                              className="w-5 h-5"
                            />
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

            {/* Analysis Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Analysis Type</label>
              <Tabs value={selectedAnalysis} onValueChange={setSelectedAnalysis}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-5 h-auto">
                  {analysisTypes.map((type) => {
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

            {/* Generate Button */}
            <Button
              onClick={generateAnalysis}
              disabled={isGenerating || !selectedCoin}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Analysis...
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

        {/* Analysis Result */}
        {renderAnalysisContent()}
      </div>
    </div>
  );
};

export default AIAnalysis;
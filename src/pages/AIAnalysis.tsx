import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, AlertCircle, Clock, History, Trash2, ChartBar } from 'lucide-react';
import CryptoTable from '@/components/CryptoTable';
import { cryptoDataService } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AppHeader } from '@/components/AppHeader';
import { TechnicalAnalysisCard } from '@/components/analysis/TechnicalAnalysisCard';
import { FundamentalAnalysisCard } from '@/components/analysis/FundamentalAnalysisCard';
import { SentimentAnalysisCard } from '@/components/analysis/SentimentAnalysisCard';
import { OnChainAnalysisCard } from '@/components/analysis/OnChainAnalysisCard';
import { ETFAnalysisCard } from '@/components/analysis/ETFAnalysisCard';

interface AnalysisResult {
  id: string;
  analysisType: string;
  structuredAnalysis: any;
  timestamp: string;
  confidence: number;
  metrics: Record<string, any>;
  coinData: {
    id: string;
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
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>(['technical']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResults, setCurrentResults] = useState<AnalysisResult[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  const { toast } = useToast();

  // Load recent analyses from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentAnalyses');
    if (stored) {
      try {
        setRecentAnalyses(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading recent analyses:', e);
      }
    }
  }, []);

  const { data: cryptos = [], isLoading: cryptosLoading } = useQuery({
    queryKey: ['top-cryptos-ai'],
    queryFn: () => cryptoDataService.getTopCryptos(50),
    refetchInterval: 60000
  });

  const analysisTypes = [
    {
      id: 'technical',
      label: 'Technical',
      description: 'Price action & indicators'
    },
    {
      id: 'fundamental',
      label: 'Fundamental',
      description: 'Tokenomics & valuation'
    },
    {
      id: 'sentiment',
      label: 'Sentiment',
      description: 'Market psychology'
    },
    {
      id: 'onchain',
      label: 'On-Chain',
      description: 'Network metrics'
    },
    {
      id: 'etf',
      label: 'Institutional',
      description: 'ETF & flows'
    }
  ];

  const toggleAnalysisType = (typeId: string) => {
    setSelectedAnalysisTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const generateAnalysis = async () => {
    if (!selectedCoin) {
      toast({
        title: 'Please select a coin',
        description: 'You must select a cryptocurrency to analyze',
        variant: 'destructive'
      });
      return;
    }

    if (selectedAnalysisTypes.length === 0) {
      toast({
        title: 'Please select analysis type',
        description: 'You must select at least one analysis type',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setCurrentResults([]);
    setViewingHistory(false);

    try {
      const coinData = cryptos.find(c => c.id === selectedCoin);
      if (!coinData) throw new Error('Coin data not found');

      const detailedData = await cryptoDataService.getCryptoDetails(selectedCoin);
      const newResults: AnalysisResult[] = [];

      // Generate analyses for each selected type
      for (const analysisType of selectedAnalysisTypes) {
        const { data, error } = await supabase.functions.invoke('ai-analysis', {
          body: {
            coin: coinData,
            detailedData,
            analysisType
          }
        });

        if (error) throw error;

        const result: AnalysisResult = {
          id: `${selectedCoin}-${analysisType}-${Date.now()}`,
          ...data,
          coinData: {
            ...data.coinData,
            id: selectedCoin
          }
        };
        newResults.push(result);
      }

      setCurrentResults(newResults);

      // Save to recent analyses
      const updatedRecent = [...newResults, ...recentAnalyses].slice(0, 20);
      setRecentAnalyses(updatedRecent);
      localStorage.setItem('recentAnalyses', JSON.stringify(updatedRecent));

      toast({
        title: 'Analysis Complete',
        description: `Generated ${selectedAnalysisTypes.length} analysis type(s) for ${coinData.name}`
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

  const deleteRecentAnalysis = (id: string) => {
    const updated = recentAnalyses.filter(a => a.id !== id);
    setRecentAnalyses(updated);
    localStorage.setItem('recentAnalyses', JSON.stringify(updated));
    toast({
      title: 'Analysis deleted',
      description: 'The analysis has been removed from history'
    });
  };

  const clearAllHistory = () => {
    setRecentAnalyses([]);
    localStorage.removeItem('recentAnalyses');
    toast({
      title: 'History cleared',
      description: 'All recent analyses have been removed'
    });
  };

  const renderAnalysisCard = (result: AnalysisResult) => {
    const { analysisType, structuredAnalysis, coinData } = result;

    const cards: Record<string, JSX.Element> = {
      technical: <TechnicalAnalysisCard data={structuredAnalysis} coinData={coinData} />,
      fundamental: <FundamentalAnalysisCard data={structuredAnalysis} coinData={coinData} />,
      sentiment: <SentimentAnalysisCard data={structuredAnalysis} coinData={coinData} />,
      onchain: <OnChainAnalysisCard data={structuredAnalysis} coinData={coinData} />,
      etf: <ETFAnalysisCard data={structuredAnalysis} coinData={coinData} />
    };

    return cards[analysisType] || null;
  };

  const renderResults = (results: AnalysisResult[]) => {
    if (results.length === 0) return null;

    // Group results by coin
    const groupedByCoin = results.reduce((acc, result) => {
      const key = result.coinData.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    }, {} as Record<string, AnalysisResult[]>);

    return Object.entries(groupedByCoin).map(([coinId, coinResults]) => {
      const firstResult = coinResults[0];
      
      return (
        <div key={`${coinId}-${firstResult.timestamp}`} className="space-y-6">
          {/* Coin Header */}
          <Card className="border-primary/20 bg-gradient-to-r from-background to-muted/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl font-bold">
                      {firstResult.coinData.name} ({firstResult.coinData.symbol.toUpperCase()})
                    </CardTitle>
                    <Badge variant={firstResult.coinData.change24h >= 0 ? "default" : "destructive"}>
                      {firstResult.coinData.change24h >= 0 ? '+' : ''}{firstResult.coinData.change24h.toFixed(2)}%
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Generated: {new Date(firstResult.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">${firstResult.coinData.price.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Analysis Cards */}
          {coinResults.map(result => (
            <div key={result.id}>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-sm font-medium">
                  {analysisTypes.find(t => t.id === result.analysisType)?.label} Analysis
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {result.confidence}% Confidence
                </Badge>
              </div>
              {renderAnalysisCard(result)}
            </div>
          ))}

          <Separator className="my-8" />
        </div>
      );
    });
  };

  return (
    <>
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-primary to-primary-glow">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold">AI Crypto Analysis</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Professional multi-analysis powered by IgniteX AI
            </p>
          </div>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configure Analysis</CardTitle>
              <CardDescription>
                Select a cryptocurrency and one or more analysis types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Coin Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cryptocurrency</label>
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

              {/* Analysis Types - Multiple Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Analysis Types (Select Multiple)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {analysisTypes.map(type => (
                    <div
                      key={type.id}
                      onClick={() => toggleAnalysisType(type.id)}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedAnalysisTypes.includes(type.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-medium">{type.label}</div>
                        <Checkbox
                          checked={selectedAnalysisTypes.includes(type.id)}
                          className="pointer-events-none"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedAnalysisTypes.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedAnalysisTypes.length} analysis type{selectedAnalysisTypes.length > 1 ? 's' : ''} selected
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateAnalysis}
                disabled={isGenerating || !selectedCoin || selectedAnalysisTypes.length === 0}
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
                    Generate Analysis ({selectedAnalysisTypes.length})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Current Results */}
          {currentResults.length > 0 && !viewingHistory && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Current Analysis</h2>
                {recentAnalyses.length > 0 && (
                  <Button variant="outline" onClick={() => setViewingHistory(true)}>
                    <History className="mr-2 h-4 w-4" />
                    View History ({recentAnalyses.length})
                  </Button>
                )}
              </div>
              {renderResults(currentResults)}
            </div>
          )}

          {/* Recent Analyses History */}
          {viewingHistory && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Recent Analyses</h2>
                  <Badge variant="secondary">{recentAnalyses.length}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setViewingHistory(false)}>
                    Back to Current
                  </Button>
                  {recentAnalyses.length > 0 && (
                    <Button variant="destructive" onClick={clearAllHistory}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {recentAnalyses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent analyses yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {renderResults(recentAnalyses)}
                </div>
              )}
            </div>
          )}

          {/* Market Overview Section - 100 Coins */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBar className="h-5 w-5" />
                  Market Overview - Top 100 Cryptocurrencies
                </CardTitle>
                <CardDescription>
                  Browse and analyze the top 100 cryptocurrencies by market cap
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <CryptoTable />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAnalysis;

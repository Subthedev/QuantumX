import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, AlertCircle, Clock, History, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react';
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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateAnalysis } from '@/schemas/analysis-schemas';
import type { AnalysisResult } from '@/schemas/analysis-schemas';

interface AnalysisLoadingState {
  type: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

const AIAnalysis = () => {
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>(['technical']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStates, setLoadingStates] = useState<AnalysisLoadingState[]>([]);
  const [currentResults, setCurrentResults] = useState<AnalysisResult[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
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
    queryFn: () => cryptoDataService.getTopCryptos(100),
    refetchInterval: 60000
  });

  const analysisTypes = [
    {
      id: 'technical',
      label: 'Technical',
      description: 'Price action & indicators',
      gradient: 'from-blue-500 to-cyan-500',
      icon: '📈'
    },
    {
      id: 'fundamental',
      label: 'Fundamental',
      description: 'Tokenomics & valuation',
      gradient: 'from-purple-500 to-pink-500',
      icon: '💎'
    },
    {
      id: 'sentiment',
      label: 'Sentiment',
      description: 'Market psychology',
      gradient: 'from-orange-500 to-amber-500',
      icon: '🧠'
    },
    {
      id: 'onchain',
      label: 'On-Chain',
      description: 'Network metrics',
      gradient: 'from-green-500 to-emerald-500',
      icon: '⛓️'
    },
    {
      id: 'etf',
      label: 'Institutional',
      description: 'ETF & flows',
      gradient: 'from-indigo-500 to-violet-500',
      icon: '🏦'
    }
  ];

  const toggleAnalysisType = (typeId: string) => {
    setSelectedAnalysisTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
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

    // Initialize loading states
    const initialLoadingStates = selectedAnalysisTypes.map(type => ({
      type,
      status: 'loading' as const
    }));
    setLoadingStates(initialLoadingStates);

    try {
      const coinData = cryptos.find(c => c.id === selectedCoin);
      if (!coinData) throw new Error('Coin data not found');

      const detailedData = await cryptoDataService.getCryptoDetails(selectedCoin);

      // ✨ PARALLEL PROCESSING - Generate all analyses at once
      const analysisPromises = selectedAnalysisTypes.map(async (analysisType) => {
        try {
          const { data, error } = await supabase.functions.invoke('ai-analysis', {
            body: {
              coin: coinData,
              detailedData,
              analysisType
            }
          });

          if (error) {
            throw new Error(error.message || 'Failed to generate analysis');
          }

          // ✨ VALIDATION - Validate response with Zod
          const validationResult = validateAnalysis(analysisType, data.structuredAnalysis);

          if (!validationResult.success) {
            console.error(`Validation failed for ${analysisType}:`, validationResult.error);
            throw new Error(`Invalid analysis data: ${validationResult.error}`);
          }

          const result: AnalysisResult = {
            id: `${selectedCoin}-${analysisType}-${Date.now()}`,
            ...data,
            structuredAnalysis: validationResult.data, // Use validated data
            coinData: {
              ...data.coinData,
              id: selectedCoin
            }
          };

          // Update loading state for this analysis
          setLoadingStates(prev =>
            prev.map(s =>
              s.type === analysisType ? { ...s, status: 'success' as const } : s
            )
          );

          return { success: true, result };
        } catch (error: any) {
          console.error(`Error generating ${analysisType} analysis:`, error);

          // Update loading state with error
          setLoadingStates(prev =>
            prev.map(s =>
              s.type === analysisType
                ? { ...s, status: 'error' as const, error: error.message }
                : s
            )
          );

          return { success: false, analysisType, error: error.message };
        }
      });

      // Wait for all analyses to complete
      const results = await Promise.allSettled(analysisPromises);

      // Extract successful results
      const newResults: AnalysisResult[] = results
        .filter((r): r is PromiseFulfilledResult<{ success: boolean; result: AnalysisResult }> =>
          r.status === 'fulfilled' && r.value.success && r.value.result !== undefined
        )
        .map(r => r.value.result);

      if (newResults.length === 0) {
        throw new Error('All analyses failed. Please try again.');
      }

      setCurrentResults(newResults);

      // Auto-expand all generated cards
      setExpandedCards(new Set(newResults.map(r => r.id)));

      // Save to recent analyses
      const updatedRecent = [...newResults, ...recentAnalyses].slice(0, 20);
      setRecentAnalyses(updatedRecent);
      localStorage.setItem('recentAnalyses', JSON.stringify(updatedRecent));

      const successCount = newResults.length;
      const failedCount = selectedAnalysisTypes.length - successCount;

      toast({
        title: 'Analysis Complete',
        description: `Successfully generated ${successCount} analysis type(s)${failedCount > 0 ? `. ${failedCount} failed.` : ''}`,
        variant: failedCount > 0 ? 'destructive' : 'default'
      });
    } catch (error: any) {
      console.error('Error generating analysis:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate analysis. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
      setLoadingStates([]);
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

  const exportAnalysis = (result: AnalysisResult, format: 'json' | 'text') => {
    const filename = `${result.coinData.symbol}-${result.analysisType}-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'txt'}`;

    let content: string;
    if (format === 'json') {
      content = JSON.stringify(result, null, 2);
    } else {
      content = `${result.coinData.name} (${result.coinData.symbol.toUpperCase()}) - ${result.analysisType.toUpperCase()} ANALYSIS\n`;
      content += `Generated: ${new Date(result.timestamp).toLocaleString()}\n`;
      content += `Confidence: ${result.confidence}%\n\n`;
      content += JSON.stringify(result.structuredAnalysis, null, 2);
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Analysis exported as ${filename}`
    });
  };

  const renderAnalysisCard = (result: AnalysisResult) => {
    const { analysisType, structuredAnalysis, coinData } = result;

    const cards: Record<string, JSX.Element> = {
      technical: <TechnicalAnalysisCard data={structuredAnalysis as any} coinData={coinData as any} />,
      fundamental: <FundamentalAnalysisCard data={structuredAnalysis as any} coinData={coinData as any} />,
      sentiment: <SentimentAnalysisCard data={structuredAnalysis as any} coinData={coinData as any} />,
      onchain: <OnChainAnalysisCard data={structuredAnalysis as any} coinData={coinData as any} />,
      etf: <ETFAnalysisCard data={structuredAnalysis as any} coinData={coinData as any} />
    };

    return cards[analysisType] || null;
  };

  const renderAnalysisTypeCard = (result: AnalysisResult) => {
    const analysisConfig = analysisTypes.find(t => t.id === result.analysisType);
    if (!analysisConfig) return null;

    const isExpanded = expandedCards.has(result.id);
    const borderGradient = `bg-gradient-to-r ${analysisConfig.gradient}`;

    return (
      <Card
        key={result.id}
        className="relative overflow-hidden border-2 shadow-lg transition-all duration-300 hover:shadow-xl"
        style={{
          borderImage: `linear-gradient(to right, var(--tw-gradient-stops)) 1`,
        }}
      >
        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${borderGradient}`} />

        {/* Card Header */}
        <CardHeader className="cursor-pointer" onClick={() => toggleCardExpansion(result.id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${borderGradient} text-3xl`}>
                {analysisConfig.icon}
              </div>
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {analysisConfig.label} Analysis
                  <Badge variant="outline" className="text-xs font-normal">
                    {result.confidence}% confidence
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" />
                  {new Date(result.timestamp).toLocaleString()}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  exportAnalysis(result, 'json');
                }}
                title="Export as JSON"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button size="icon" variant="ghost">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Card Content - Collapsible */}
        {isExpanded && (
          <CardContent className="pt-0">
            <Separator className="mb-6" />
            <ErrorBoundary
              fallbackTitle="Analysis rendering error"
              fallbackMessage="Failed to render this analysis. The data may be corrupted."
            >
              {renderAnalysisCard(result)}
            </ErrorBoundary>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderLoadingCards = () => {
    return loadingStates.map((state) => {
      const analysisConfig = analysisTypes.find(t => t.id === state.type);
      if (!analysisConfig) return null;

      const borderGradient = `bg-gradient-to-r ${analysisConfig.gradient}`;

      return (
        <Card key={state.type} className="border-2">
          <div className={`absolute top-0 left-0 right-0 h-1 ${borderGradient}`} />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${borderGradient}`}>
                  {state.status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-white" />}
                  {state.status === 'error' && <AlertCircle className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {analysisConfig.label} Analysis
                  </CardTitle>
                  <CardDescription>
                    {state.status === 'loading' && 'Generating with IgniteX AI...'}
                    {state.status === 'error' && `Error: ${state.error}`}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    });
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
          <div className="space-y-6">
            {coinResults.map(result => renderAnalysisTypeCard(result))}
          </div>

          <Separator className="my-8" />
        </div>
      );
    });
  };

  return (
    <ErrorBoundary>
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
              Professional multi-dimensional analysis powered by IgniteX AI
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
                  <SelectContent className="max-h-[400px] overflow-hidden">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search..."
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <ScrollArea className="h-[320px]">
                      <div className="p-1">
                        {cryptosLoading ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
                        ) : (
                          cryptos.map(crypto => (
                            <SelectItem key={crypto.id} value={crypto.id} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <img src={crypto.image} alt={crypto.name} className="w-5 h-5 rounded-full" />
                                <span className="font-medium">{crypto.name}</span>
                                <span className="text-muted-foreground text-xs">({crypto.symbol.toUpperCase()})</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              {/* Analysis Types - Multiple Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Analysis Types (Select Multiple)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {analysisTypes.map(type => {
                    const isSelected = selectedAnalysisTypes.includes(type.id);
                    return (
                      <div
                        key={type.id}
                        onClick={() => toggleAnalysisType(type.id)}
                        className={`
                          relative p-4 rounded-xl border-2 cursor-pointer transition-all
                          hover:scale-105 hover:shadow-lg
                          ${isSelected
                            ? `bg-gradient-to-br ${type.gradient} text-white border-transparent shadow-lg`
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="text-3xl">{type.icon}</div>
                          <div className="text-sm font-semibold">{type.label}</div>
                          <div className={`text-xs ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                            {type.description}
                          </div>
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedAnalysisTypes.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedAnalysisTypes.length} analysis type{selectedAnalysisTypes.length > 1 ? 's' : ''} selected
                      • IgniteX AI will generate them in parallel
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateAnalysis}
                disabled={isGenerating || !selectedCoin || selectedAnalysisTypes.length === 0}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating {loadingStates.filter(s => s.status === 'loading').length} Analysis...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-5 w-5" />
                    Generate {selectedAnalysisTypes.length} Analysis{selectedAnalysisTypes.length > 1 ? 'es' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading States */}
          {isGenerating && loadingStates.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Generating Analyses...</h2>
              {renderLoadingCards()}
            </div>
          )}

          {/* Current Results */}
          {currentResults.length > 0 && !viewingHistory && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Analysis Results</h2>
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
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AIAnalysis;

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TrendingUp, AlertCircle, ChartBar, DollarSign, Brain, ArrowUp, ArrowDown, Target, Shield, RefreshCw, Clock, Activity, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  symbol: string;
  signal: 'LONG' | 'SHORT' | 'HOLD';
  confidence: number;
  summary: string;
  keyPoints: string[];
  technicalIndicators: {
    rsi: number;
    macd: string;
    support: number;
    resistance: number;
    atr_percent?: number;
    ema_trend?: string;
  };
  riskLevel: 'low' | 'medium' | 'high';
  entryPrice?: number;
  stopLoss?: number;
  takeProfits?: number[];
  marketData?: {
    price: number;
    percentChange24h: number;
    volume24h: number;
    marketCap: number;
  };
  analysis?: {
    technical?: any;
    fundamental?: any;
    sentiment?: any;
    multi_directional_signals?: any;
  };
}

const AIAnalysisDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch market data from CoinGecko
  const fetchMarketData = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true'
      );
      
      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  // Auto-refresh market data every 2 minutes
  useEffect(() => {
    fetchMarketData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMarketData, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const handleAnalyzeCrypto = async (symbol: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate analysis",
        variant: "destructive"
      });
      return;
    }

    setLoading(symbol);
    setError(null);
    
    try {
      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000);
      });

      // Call the edge function with timeout
      const analysisPromise = supabase.functions.invoke('generate-crypto-report', {
        body: { coin: symbol, userId: user.id, timeframe: '4H' }
      });

      const { data, error: functionError } = await Promise.race([
        analysisPromise,
        timeoutPromise
      ]) as any;

      if (functionError) {
        throw functionError;
      }

      if (data) {
        const report = data.report_data || data;
        
        // Transform the report data to match our interface
        const result: AnalysisResult = {
          symbol,
          signal: report.signal_4h?.direction || 'HOLD',
          confidence: report.confidence || 50,
          summary: report.summary || `${symbol} analysis completed with ${report.signal_4h?.direction || 'HOLD'} signal`,
          keyPoints: report.signal_4h?.reasoning || [
            "Technical analysis completed",
            "Market conditions assessed",
            "Risk parameters evaluated"
          ],
          technicalIndicators: {
            rsi: report.signal_4h?.indicators?.rsi14 || 50,
            macd: report.signal_4h?.indicators?.macd_hist ? 
              (report.signal_4h.indicators.macd_hist > 0 ? 'Bullish' : 'Bearish') : 'Neutral',
            support: report.analysis?.technical?.support_levels ? 
              parseFloat(report.analysis.technical.support_levels.split(',')[0].replace(/[^0-9.]/g, '')) : 0,
            resistance: report.analysis?.technical?.resistance_levels ? 
              parseFloat(report.analysis.technical.resistance_levels.split(',')[0].replace(/[^0-9.]/g, '')) : 0,
            atr_percent: report.signal_4h?.indicators?.atr_percent,
            ema_trend: report.signal_4h?.indicators?.ema50_above_ema200 ? 'Bullish' : 'Bearish'
          },
          riskLevel: report.confidence > 75 ? 'low' : report.confidence > 50 ? 'medium' : 'high',
          entryPrice: report.signal_4h?.entry,
          stopLoss: report.signal_4h?.stop_loss,
          takeProfits: report.signal_4h?.take_profits,
          marketData: report.market_data,
          analysis: report.analysis
        };
        
        setAnalysisResults(result);
        
        toast({
          title: "Analysis Complete",
          description: `Professional ${symbol} analysis generated successfully`,
        });
      } else {
        throw new Error('Invalid response from analysis service');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      const errorMessage = err.message || 'Failed to generate analysis. Please try again.';
      setError(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const getSignalColor = (signal: string) => {
    switch(signal) {
      case 'LONG': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'SHORT': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      case 'HOLD': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
    }
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Your AI-Powered Analysis Dashboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Professional Crypto Trading Signals & Analysis
        </p>
      </div>

      {/* Market Data Cards */}
      {marketData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Bitcoin (BTC)</CardTitle>
                <Badge variant={marketData.bitcoin.usd_24h_change >= 0 ? "default" : "destructive"}>
                  {marketData.bitcoin.usd_24h_change >= 0 ? '+' : ''}{marketData.bitcoin.usd_24h_change.toFixed(2)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">${marketData.bitcoin.usd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Cap:</span>
                <span className="font-semibold">{formatNumber(marketData.bitcoin.usd_market_cap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume:</span>
                <span className="font-semibold">{formatNumber(marketData.bitcoin.usd_24h_vol)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Ethereum (ETH)</CardTitle>
                <Badge variant={marketData.ethereum.usd_24h_change >= 0 ? "default" : "destructive"}>
                  {marketData.ethereum.usd_24h_change >= 0 ? '+' : ''}{marketData.ethereum.usd_24h_change.toFixed(2)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">${marketData.ethereum.usd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Cap:</span>
                <span className="font-semibold">{formatNumber(marketData.ethereum.usd_market_cap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume:</span>
                <span className="font-semibold">{formatNumber(marketData.ethereum.usd_24h_vol)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh Controls */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMarketData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-muted-foreground">Auto-refresh (2 min)</span>
        </label>
      </div>

      {/* Analysis Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-primary-light/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-primary" />
            Quick Analysis
          </CardTitle>
          <CardDescription>
            Select a cryptocurrency to receive instant AI-powered trading signals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={() => handleAnalyzeCrypto('BTC')}
              disabled={loading !== null}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:shadow-glow"
            >
              {loading === 'BTC' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating professional analysis...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Analyze BTC
                </>
              )}
            </Button>
            <Button
              size="lg"
              onClick={() => handleAnalyzeCrypto('ETH')}
              disabled={loading !== null}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:shadow-glow"
            >
              {loading === 'ETH' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating professional analysis...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Analyze ETH
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysisResults && !loading && (
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-primary-glow" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                {analysisResults.symbol} Analysis Results
              </CardTitle>
              <Badge className={`px-4 py-1 text-sm font-semibold ${getSignalColor(analysisResults.signal)}`}>
                {analysisResults.signal.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Confidence Score */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-light/20 to-transparent rounded-lg">
              <span className="font-medium">AI Confidence Score</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
                    style={{ width: `${analysisResults.confidence}%` }}
                  />
                </div>
                <span className="font-bold text-primary">{analysisResults.confidence}%</span>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Market Summary
              </h3>
              <p className="text-muted-foreground">{analysisResults.summary}</p>
            </div>

            {/* Key Points */}
            <div>
              <h3 className="font-semibold mb-3">Key Trading Points</h3>
              <div className="space-y-2">
                {analysisResults.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <span className="text-sm text-muted-foreground">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Entry/Exit Points - Professional Trading Recommendations */}
            {analysisResults.signal !== 'HOLD' && analysisResults.entryPrice && (
              <Card className="bg-gradient-to-br from-primary-light/10 to-transparent border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Trading Execution Levels
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {analysisResults.signal === 'LONG' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        Entry Price
                      </div>
                      <div className="text-lg font-bold text-primary">
                        ${analysisResults.entryPrice?.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Stop Loss
                      </div>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        ${analysisResults.stopLoss?.toLocaleString()}
                      </div>
                    </div>
                    {analysisResults.takeProfits && analysisResults.takeProfits[0] && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Take Profit 1</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${analysisResults.takeProfits[0].toLocaleString()}
                        </div>
                      </div>
                    )}
                    {analysisResults.takeProfits && analysisResults.takeProfits[1] && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Take Profit 2</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${analysisResults.takeProfits[1].toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  {analysisResults.takeProfits && analysisResults.takeProfits[2] && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Final Target</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${analysisResults.takeProfits[2].toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Technical Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">RSI</div>
                <div className="text-xl font-bold">{analysisResults.technicalIndicators.rsi.toFixed(1)}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">MACD</div>
                <div className="text-sm font-semibold">{analysisResults.technicalIndicators.macd}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Support</div>
                <div className="text-xl font-bold">${analysisResults.technicalIndicators.support.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Resistance</div>
                <div className="text-xl font-bold">${analysisResults.technicalIndicators.resistance.toLocaleString()}</div>
              </div>
            </div>

            {/* Market Data - if available */}
            {analysisResults.marketData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Current Price</div>
                  <div className="text-xl font-bold">${analysisResults.marketData.price.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">24h Change</div>
                  <div className={`text-xl font-bold ${analysisResults.marketData.percentChange24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analysisResults.marketData.percentChange24h > 0 ? '+' : ''}{analysisResults.marketData.percentChange24h.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Volume 24h</div>
                  <div className="text-lg font-bold">${(analysisResults.marketData.volume24h / 1e9).toFixed(2)}B</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Market Cap</div>
                  <div className="text-lg font-bold">${(analysisResults.marketData.marketCap / 1e9).toFixed(0)}B</div>
                </div>
              </div>
            )}

            {/* Risk Level */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">Risk Level</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getRiskColor(analysisResults.riskLevel)}`} />
                <span className="font-semibold capitalize">{analysisResults.riskLevel}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!analysisResults && !loading && !error && (
        <Card className="border-dashed border-2 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-primary-light mb-4">
              <ChartBar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Select a cryptocurrency above to receive instant AI-powered trading signals and analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAnalysisDashboard;
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TrendingUp, AlertCircle, ChartBar, DollarSign, Brain, ArrowUp, ArrowDown, Target, Shield, RefreshCw, Clock, Activity, BarChart3, CheckCircle, XCircle, AlertTriangle, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';

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
  riskMetrics?: {
    risk_reward_ratios: {
      tp1: number;
      tp2: number;
      tp3: number;
    };
    position_size: number;
    dollar_risk: number;
    risk_percentage: number;
    max_loss: number;
  };
  validation?: {
    passed: boolean;
    checks: {
      confidenceCheck: boolean;
      entryPriceCheck: boolean;
      riskRewardCheck: boolean;
      stopLossCheck: boolean;
      overallValid: boolean;
    };
    warnings: string[];
    status: 'APPROVED' | 'REVIEW_REQUIRED';
  };
  timestamp?: string;
  signalExpiry?: string;
}

const AIAnalysisDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

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
      // Silently handle error
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

  // Countdown timer for signal expiry
  useEffect(() => {
    if (analysisResults?.signalExpiry) {
      const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(analysisResults.signalExpiry);
        const diff = expiry.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeRemaining('EXPIRED');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [analysisResults?.signalExpiry]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const handleAnalyzeCrypto = async (symbol: string) => {
    setLoading(symbol);
    setError(null);
    
    try {
      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000);
      });

      // Call the edge function with timeout
      const analysisPromise = supabase.functions.invoke('generate-crypto-report', {
        body: { coin: symbol, timeframe: '4H' }
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
          analysis: report.analysis,
          riskMetrics: report.risk_metrics,
          validation: report.validation,
          timestamp: report.timestamp,
          signalExpiry: report.signal_expiry
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
      // Silently handle error
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
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-500/5 to-orange-600/5">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <BTCLogo className="w-8 h-8" />
                  <CardTitle className="text-lg">Bitcoin (BTC)</CardTitle>
                </div>
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

          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-500/5 to-purple-600/5">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ETHLogo className="w-8 h-8" />
                  <CardTitle className="text-lg">Ethereum (ETH)</CardTitle>
                </div>
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
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:shadow-glow group"
            >
              {loading === 'BTC' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating professional analysis...
                </>
              ) : (
                <>
                  <BTCLogo className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Analyze BTC
                </>
              )}
            </Button>
            <Button
              size="lg"
              onClick={() => handleAnalyzeCrypto('ETH')}
              disabled={loading !== null}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:shadow-glow group"
            >
              {loading === 'ETH' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating professional analysis...
                </>
              ) : (
                <>
                  <ETHLogo className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
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
        <div className="space-y-6">
          {/* Professional Signal Card with Validation */}
          <Card className={`border-2 ${analysisResults.validation?.passed ? 'border-green-500' : 'border-yellow-500'} shadow-2xl`}>
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Badge className={`px-6 py-3 text-2xl font-bold ${
                    analysisResults.signal === 'LONG' ? 'bg-green-500 text-white' : 
                    analysisResults.signal === 'SHORT' ? 'bg-red-500 text-white' : 
                    'bg-orange-500 text-white'
                  }`}>
                    {analysisResults.signal}
                  </Badge>
                  <div>
                    <h2 className="text-2xl font-bold">{analysisResults.symbol} Signal</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {analysisResults.validation?.passed ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold">APPROVED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-semibold">REVIEW REQUIRED</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Timer className="h-4 w-4" />
                    <span>Valid for: {timeRemaining}</span>
                  </div>
                  {timeRemaining === 'EXPIRED' ? (
                    <Badge variant="destructive">EXPIRED</Badge>
                  ) : timeRemaining && timeRemaining.startsWith('0h') ? (
                    <Badge variant="outline" className="text-yellow-600">Expiring Soon</Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Animated Confidence Meter */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-lg">Confidence Level</span>
                  <span className="text-2xl font-bold text-primary">{analysisResults.confidence}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 ease-out"
                    style={{ width: `${analysisResults.confidence}%` }}
                  />
                </div>
                {analysisResults.confidence < 75 && (
                  <p className="text-sm text-yellow-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Confidence below 75% threshold for institutional trading
                  </p>
                )}
              </div>

              {/* Validation Warnings */}
              {analysisResults.validation?.warnings && analysisResults.validation.warnings.length > 0 && (
                <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Validation Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {analysisResults.validation.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Risk Metrics Grid */}
              {analysisResults.riskMetrics && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Risk Management Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-transparent rounded-lg">
                      <div className="text-sm text-muted-foreground">R:R Ratio (TP1)</div>
                      <div className={`text-xl font-bold ${
                        analysisResults.riskMetrics.risk_reward_ratios.tp1 >= 1.5 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        1:{analysisResults.riskMetrics.risk_reward_ratios.tp1.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-transparent rounded-lg">
                      <div className="text-sm text-muted-foreground">Position Size</div>
                      <div className="text-xl font-bold">
                        {analysisResults.riskMetrics.position_size.toFixed(4)} units
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-transparent rounded-lg">
                      <div className="text-sm text-muted-foreground">Risk Amount</div>
                      <div className="text-xl font-bold text-red-600">
                        ${analysisResults.riskMetrics.dollar_risk.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-transparent rounded-lg">
                      <div className="text-sm text-muted-foreground">Max Loss</div>
                      <div className="text-xl font-bold text-red-600">
                        ${analysisResults.riskMetrics.max_loss.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Levels in Professional Grid */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Professional Trading Levels
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-4">
                      <div className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">
                        Entry Price
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${analysisResults.entryPrice?.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="p-4">
                      <div className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">
                        Stop Loss
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        ${analysisResults.stopLoss?.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  {analysisResults.takeProfits?.map((tp, index) => (
                    <Card key={index} className="border-green-500 bg-green-50 dark:bg-green-950/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                          Take Profit {index + 1}
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${tp.toLocaleString()}
                        </div>
                        {analysisResults.riskMetrics && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            R:R = 1:{
                              index === 0 ? analysisResults.riskMetrics.risk_reward_ratios.tp1.toFixed(1) :
                              index === 1 ? analysisResults.riskMetrics.risk_reward_ratios.tp2.toFixed(1) :
                              analysisResults.riskMetrics.risk_reward_ratios.tp3.toFixed(1)
                            }
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Executive Summary
                </h3>
                <p className="text-muted-foreground">{analysisResults.summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Card */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary to-primary-glow" />
            <CardHeader>
              <CardTitle className="text-xl">Detailed Technical Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
        </div>
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
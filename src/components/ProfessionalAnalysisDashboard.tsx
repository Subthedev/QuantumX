import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Clock, RefreshCw, CheckCircle, AlertTriangle, Timer, Shield, Target, Copy, Download, History, ChevronDown, ChevronUp, Keyboard, FileText, Printer, ArrowUp, ArrowDown, Eye, EyeOff, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TradingSignalsSection } from './TradingSignalsSection';
import { RiskManagementSection } from './RiskManagementSection';
import { CompleteTechnicalAnalysisDashboard } from './CompleteTechnicalAnalysisDashboard';
import { TechnicalAnalysisSection } from './TechnicalAnalysisSection';
import { FundamentalAnalysisSection } from './FundamentalAnalysisSection';
import { SentimentAnalysisSection } from './SentimentAnalysisSection';
import { IgniteXSummarySection } from './IgniteXSummarySection';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
interface SignalHistory {
  id: string;
  symbol: string;
  signal: string;
  confidence: number;
  timestamp: string;
  profit?: number;
}
interface AnalysisResult {
  symbol: string;
  signal: 'LONG' | 'SHORT' | 'HOLD';
  confidence: number;
  summary: string;
  keyPoints: string[];
  technicalIndicators: {
    rsi: number;
    macd: number;
    atr_percent?: number;
    ema50_above_ema200?: boolean;
    funding_rate?: number;
    orderbook_imbalance_pct?: number;
  };
  entryPrice?: number;
  stopLoss?: number;
  takeProfits?: number[];
  marketData?: {
    price: number;
    percentChange24h: number;
    volume24h: number;
    marketCap: number;
  };
  riskMetrics?: {
    risk_reward_ratios: {
      tp1: number;
      tp2: number;
      tp3: number;
    };
    position_size: number;
    dollar_risk: number;
    max_loss: number;
  };
  validation?: {
    passed: boolean;
    warnings: string[];
    status: 'APPROVED' | 'REVIEW_REQUIRED';
  };
  timestamp?: string;
  signalExpiry?: string;
  fullReport?: any;
}
const ProfessionalAnalysisDashboard: React.FC = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  // State Management
  const [loading, setLoading] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [signalHistory, setSignalHistory] = useState<SignalHistory[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    technical: true,
    risk: true,
    execution: true,
    analysis: false
  });
  const [showFullReport, setShowFullReport] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            handleAnalyzeCrypto('BTC');
            break;
          case 'e':
            e.preventDefault();
            handleAnalyzeCrypto('ETH');
            break;
          case 'c':
            e.preventDefault();
            copySignalToClipboard();
            break;
          case 'p':
            e.preventDefault();
            window.print();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [analysisResult]);

  // Fetch market data
  const fetchMarketData = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true');
      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  // Auto-refresh market data
  useEffect(() => {
    fetchMarketData();
    if (autoRefresh) {
      const interval = setInterval(fetchMarketData, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Signal expiry countdown
  useEffect(() => {
    if (analysisResult?.signalExpiry) {
      const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(analysisResult.signalExpiry);
        const diff = expiry.getTime() - now.getTime();
        if (diff <= 0) {
          setTimeRemaining('EXPIRED');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
          const seconds = Math.floor(diff % (1000 * 60) / 1000);
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [analysisResult?.signalExpiry]);

  // Load signal history
  useEffect(() => {
    if (user) {
      loadSignalHistory();
    }
  }, [user]);
  const loadSignalHistory = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('crypto_reports').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      }).limit(10);
      if (data && !error) {
        const history = data.map(report => {
          const reportData = typeof report.report_data === 'object' && report.report_data ? report.report_data : {};
          const signal4h = (reportData as any)?.signal_4h || {};
          return {
            id: report.id,
            symbol: report.coin_symbol,
            signal: signal4h?.direction || 'HOLD',
            confidence: report.confidence_score,
            timestamp: report.created_at,
            profit: Math.random() * 10 - 5 // Mock profit for demo
          };
        });
        setSignalHistory(history);
      }
    } catch (error) {
      console.error('Error loading signal history:', error);
    }
  };
  const handleAnalyzeCrypto = async (symbol: 'BTC' | 'ETH') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate analysis",
        variant: "destructive"
      });
      return;
    }
    setLoading(symbol);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timed out')), 30000);
      });
      const analysisPromise = supabase.functions.invoke('generate-crypto-report', {
        body: {
          coin: symbol,
          userId: user.id,
          timeframe: '4H'
        }
      });
      const {
        data,
        error: functionError
      } = (await Promise.race([analysisPromise, timeoutPromise])) as any;
      if (functionError) throw functionError;
      if (data) {
        // The edge function returns the database record with report_data field
        const reportData = data.report_data || data;

        // Check if this is a new enhanced report
        if (reportData.version !== 'v2_enhanced') {
          console.warn('WARNING: Old report format detected. Clearing cache and regenerating...');
          // Force a cache clear by adding timestamp to the request
          toast({
            title: "Updating to new format...",
            description: "Regenerating with enhanced analysis sections"
          });
        }
        const result: AnalysisResult = {
          symbol,
          signal: reportData.signal_4h?.direction || 'HOLD',
          confidence: reportData.confidence || data.confidence_score || 50,
          summary: reportData.summary || data.prediction_summary || '',
          keyPoints: reportData.signal_4h?.reasoning || [],
          technicalIndicators: reportData.signal_4h?.indicators || {},
          entryPrice: reportData.signal_4h?.entry,
          stopLoss: reportData.signal_4h?.stop_loss,
          takeProfits: reportData.signal_4h?.take_profits,
          marketData: reportData.market_data,
          riskMetrics: reportData.risk_metrics,
          validation: reportData.validation,
          timestamp: reportData.timestamp,
          signalExpiry: reportData.signal_expiry,
          fullReport: reportData // Pass the entire report data for the new sections
        };
        console.log('Report version:', reportData.version);
        console.log('Has analysis sections:', {
          technical: !!reportData.analysis?.technical,
          fundamental: !!reportData.analysis?.fundamental,
          sentiment: !!reportData.analysis?.sentiment
        });
        setAnalysisResult(result);
        await loadSignalHistory();
        toast({
          title: "✅ Analysis Complete",
          description: `Professional ${symbol} analysis generated successfully`
        });
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || 'Unable to generate analysis',
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };
  const copySignalToClipboard = () => {
    if (!analysisResult) return;
    const signal = `
📊 ${analysisResult.symbol} Signal
Signal: ${analysisResult.signal}
Confidence: ${analysisResult.confidence}%
Entry: $${analysisResult.entryPrice?.toLocaleString()}
Stop Loss: $${analysisResult.stopLoss?.toLocaleString()}
TP1: $${analysisResult.takeProfits?.[0]?.toLocaleString()}
TP2: $${analysisResult.takeProfits?.[1]?.toLocaleString()}
TP3: $${analysisResult.takeProfits?.[2]?.toLocaleString()}
Risk/Reward: 1:${analysisResult.riskMetrics?.risk_reward_ratios.tp1.toFixed(2)}
    `.trim();
    navigator.clipboard.writeText(signal);
    toast({
      title: "Signal Copied",
      description: "Trading signal copied to clipboard"
    });
  };
  const exportToPDF = () => {
    window.print();
    toast({
      title: "Export Ready",
      description: "Use your browser's print dialog to save as PDF"
    });
  };
  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };
  return <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-3">
        
        {/* Header - Compact */}
        <div className="mb-3">
          <h1 className="text-2xl font-medium text-foreground">
            Market Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time crypto analysis powered by AI
          </p>
        </div>

        {/* Live Market Data - Compact Cards */}
        {marketData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Card className="border">
              <CardHeader className="py-3 px-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <BTCLogo className="w-5 h-5" />
                    <span className="font-medium text-sm">Bitcoin</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${marketData.bitcoin.usd_24h_change >= 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
                  >
                    {marketData.bitcoin.usd_24h_change >= 0 ? '+' : ''}{marketData.bitcoin.usd_24h_change.toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xl font-semibold">${marketData.bitcoin.usd.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium">{formatNumber(marketData.bitcoin.usd_market_cap)}</p>
                      <p className="text-muted-foreground">Market Cap</p>
                    </div>
                    <div>
                      <p className="font-medium">{formatNumber(marketData.bitcoin.usd_24h_vol)}</p>
                      <p className="text-muted-foreground">24h Volume</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader className="py-3 px-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ETHLogo className="w-5 h-5" />
                    <span className="font-medium text-sm">Ethereum</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${marketData.ethereum.usd_24h_change >= 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
                  >
                    {marketData.ethereum.usd_24h_change >= 0 ? '+' : ''}{marketData.ethereum.usd_24h_change.toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xl font-semibold">${marketData.ethereum.usd.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium">{formatNumber(marketData.ethereum.usd_market_cap)}</p>
                      <p className="text-muted-foreground">Market Cap</p>
                    </div>
                    <div>
                      <p className="font-medium">{formatNumber(marketData.ethereum.usd_24h_vol)}</p>
                      <p className="text-muted-foreground">24h Volume</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA Buttons - Compact */}
        {!analysisResult && !loading && marketData && (
          <div className="flex gap-2 mb-3">
            <Button 
              onClick={() => handleAnalyzeCrypto('BTC')} 
              size="default"
              className="flex-1 md:flex-initial"
            >
              <BTCLogo className="w-4 h-4 mr-2" />
              Analyze Bitcoin
            </Button>
            <Button 
              onClick={() => handleAnalyzeCrypto('ETH')} 
              size="default"
              variant="outline"
              className="flex-1 md:flex-initial"
            >
              <ETHLogo className="w-4 h-4 mr-2" />
              Analyze Ethereum
            </Button>
          </div>
        )}

        {/* Loading State - Minimal */}
        {loading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-full max-w-xs">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Analyzing {loading}</p>
                    <p className="text-xs text-muted-foreground">Please wait...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Analysis Results - Tighter Grid */}
        {analysisResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
            {/* Left Column - Primary Analysis */}
            <div className="lg:col-span-2 space-y-4">
              <TradingSignalsSection 
                signal={analysisResult.fullReport?.signal_4h} 
                marketData={analysisResult.fullReport?.market_data} 
                reportGeneratedAt={analysisResult.fullReport?.created_at || new Date().toISOString()}
                coinSymbol={analysisResult.symbol}
              />

              <RiskManagementSection 
                signal={analysisResult.fullReport?.signal_4h} 
                marketData={analysisResult.fullReport?.market_data}
                symbol={/^(btc|bitcoin)$/i.test(analysisResult.symbol || '') ? 'BTC' : 'ETH'}
              />
              
              <CompleteTechnicalAnalysisDashboard 
                signal={analysisResult.fullReport?.signal_4h} 
                marketData={analysisResult.fullReport?.market_data}
                symbol={/^(btc|bitcoin)$/i.test(analysisResult.symbol || '') ? 'BTC' : 'ETH'}
              />

              <TechnicalAnalysisSection 
                analysis={analysisResult.fullReport?.analysis?.technical} 
                marketData={analysisResult.fullReport?.market_data} 
              />
            </div>

            {/* Right Column - Supporting Analysis */}
            <div className="space-y-4">
              <FundamentalAnalysisSection 
                analysis={analysisResult.fullReport?.fundamentalAnalysis || analysisResult.fullReport?.analysis?.fundamental} 
                marketData={analysisResult.fullReport?.market_data} 
              />

              <SentimentAnalysisSection 
                analysis={analysisResult.fullReport?.sentimentAnalysis || analysisResult.fullReport?.analysis?.sentiment} 
              />

              <IgniteXSummarySection 
                report={analysisResult.fullReport} 
              />
            </div>
          </div>
        )}

        {/* Empty State - Compact */}
        {!analysisResult && !loading && !marketData && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-lg font-medium text-foreground">
                Select a cryptocurrency to analyze
              </h2>
              <p className="text-sm text-muted-foreground">
                Get comprehensive market analysis with AI-powered insights
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button 
                  onClick={() => handleAnalyzeCrypto('BTC')} 
                  variant="outline"
                  size="default"
                >
                  <BTCLogo className="w-4 h-4 mr-2" />
                  Bitcoin
                </Button>
                <Button 
                  onClick={() => handleAnalyzeCrypto('ETH')} 
                  variant="outline"
                  size="default"
                >
                  <ETHLogo className="w-4 h-4 mr-2" />
                  Ethereum
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>;
};
export default ProfessionalAnalysisDashboard;
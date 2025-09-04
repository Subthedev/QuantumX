import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Clock, RefreshCw, CheckCircle, AlertTriangle, Timer, Shield, Target, Copy, Download, History, ChevronDown, ChevronUp, Keyboard, FileText, Printer, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TradingSignalsSection } from './TradingSignalsSection';
import { RiskManagementSection } from './RiskManagementSection';
import { TechnicalAnalysisSection } from './TechnicalAnalysisSection';
import { FundamentalAnalysisSection } from './FundamentalAnalysisSection';
import { SentimentAnalysisSection } from './SentimentAnalysisSection';
import { IgniteXSummarySection } from './IgniteXSummarySection';
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
        const report = data.report_data || data;
        const result: AnalysisResult = {
          symbol,
          signal: report.signal_4h?.direction || 'HOLD',
          confidence: report.confidence || 50,
          summary: report.summary || '',
          keyPoints: report.signal_4h?.reasoning || [],
          technicalIndicators: report.signal_4h?.indicators || {},
          entryPrice: report.signal_4h?.entry,
          stopLoss: report.signal_4h?.stop_loss,
          takeProfits: report.signal_4h?.take_profits,
          marketData: report.market_data,
          riskMetrics: report.risk_metrics,
          validation: report.validation,
          timestamp: report.timestamp,
          signalExpiry: report.signal_expiry,
          fullReport: report
        };
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
  return <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Premium Header */}
        <div className="text-center py-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-4">
            AI-Powered Analysis Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Institutional-Grade Crypto Trading Signals
          </p>
          
          {/* Keyboard Shortcuts Info */}
          
        </div>

        {/* Live Market Data */}
        {marketData && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
            <Card className="card-premium border-l-4 border-l-primary shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold">Bitcoin (BTC)</CardTitle>
                  <Badge className={marketData.bitcoin.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}>
                    {marketData.bitcoin.usd_24h_change >= 0 ? '+' : ''}{marketData.bitcoin.usd_24h_change.toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-bold text-xl">${marketData.bitcoin.usd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-semibold">{formatNumber(marketData.bitcoin.usd_market_cap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h Volume</span>
                  <span className="font-semibold">{formatNumber(marketData.bitcoin.usd_24h_vol)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-l-4 border-l-primary shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold">Ethereum (ETH)</CardTitle>
                  <Badge className={marketData.ethereum.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}>
                    {marketData.ethereum.usd_24h_change >= 0 ? '+' : ''}{marketData.ethereum.usd_24h_change.toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-bold text-xl">${marketData.ethereum.usd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-semibold">{formatNumber(marketData.ethereum.usd_market_cap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h Volume</span>
                  <span className="font-semibold">{formatNumber(marketData.ethereum.usd_24h_vol)}</span>
                </div>
              </CardContent>
            </Card>
          </div>}

        {/* Analysis Controls */}
        <Card className="card-premium bg-gradient-premium shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-4 w-full md:w-auto">
                <Button size="lg" onClick={() => handleAnalyzeCrypto('BTC')} disabled={loading !== null} className="flex-1 md:flex-initial btn-premium">
                  {loading === 'BTC' ? <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </> : <>
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Analyze BTC
                    </>}
                </Button>
                <Button size="lg" onClick={() => handleAnalyzeCrypto('ETH')} disabled={loading !== null} className="flex-1 md:flex-initial btn-premium">
                  {loading === 'ETH' ? <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </> : <>
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Analyze ETH
                    </>}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={copySignalToClipboard} disabled={!analysisResult} title="Copy Signal">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={exportToPDF} disabled={!analysisResult} title="Export PDF">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={fetchMarketData} title="Refresh Data">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Analysis Results */}
        {analysisResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - New Enhanced Sections */}
            <div className="lg:col-span-2 space-y-6">
              <TradingSignalsSection
                signal={analysisResult.fullReport?.signal_4h}
                marketData={analysisResult.fullReport?.market_data}
              />

              <RiskManagementSection
                signal={analysisResult.fullReport?.signal_4h}
                marketData={analysisResult.fullReport?.market_data}
              />

              <TechnicalAnalysisSection
                analysis={analysisResult.fullReport?.analysis?.technical}
                marketData={analysisResult.fullReport?.market_data}
              />
            </div>

            {/* Right Column - New Enhanced Sections */}
            <div className="space-y-6">
              <FundamentalAnalysisSection
                analysis={analysisResult.fullReport?.analysis?.fundamental}
                marketData={analysisResult.fullReport?.market_data}
              />

              <SentimentAnalysisSection
                analysis={analysisResult.fullReport?.analysis?.sentiment}
              />

              <IgniteXSummarySection
                report={analysisResult.fullReport}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>}

        {/* Empty State */}
        {!analysisResult && !loading && <Card className="card-premium text-center py-16">
            <CardContent>
              <Activity className="h-20 w-20 text-primary/30 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-2">No Analysis Yet</h3>
              <p className="text-muted-foreground mb-6">
                Select BTC or ETH to generate professional trading signals
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => handleAnalyzeCrypto('BTC')} className="btn-premium">
                  Start BTC Analysis
                </Button>
                <Button onClick={() => handleAnalyzeCrypto('ETH')} className="btn-premium">
                  Start ETH Analysis
                </Button>
              </div>
            </CardContent>
          </Card>}
      </div>
    </div>;
};
export default ProfessionalAnalysisDashboard;
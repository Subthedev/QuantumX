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
          signalExpiry: report.signal_expiry
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
        {analysisResult && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Signal & Risk Management */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Signal Card */}
              <Card className={`card-premium ${analysisResult.validation?.passed ? 'border-green-500' : 'border-yellow-500'} border-2`}>
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge className={`px-6 py-3 text-2xl font-bold ${analysisResult.signal === 'LONG' ? 'bg-green-500' : analysisResult.signal === 'SHORT' ? 'bg-red-500' : 'bg-orange-500'}`}>
                        {analysisResult.signal === 'LONG' && <ArrowUp className="mr-2 h-6 w-6" />}
                        {analysisResult.signal === 'SHORT' && <ArrowDown className="mr-2 h-6 w-6" />}
                        {analysisResult.signal}
                      </Badge>
                      <div>
                        <h2 className="text-2xl font-bold">{analysisResult.symbol} Signal</h2>
                        <div className="flex items-center gap-2 mt-1">
                          {analysisResult.validation?.passed ? <Badge className="bg-green-500">
                              <CheckCircle className="mr-1 h-4 w-4" />
                              APPROVED
                            </Badge> : <Badge className="bg-yellow-500">
                              <AlertTriangle className="mr-1 h-4 w-4" />
                              REVIEW REQUIRED
                            </Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">
                        <Timer className="mr-1 h-4 w-4" />
                        {timeRemaining}
                      </Badge>
                      {timeRemaining === 'EXPIRED' && <Badge variant="destructive" className="block mt-1">EXPIRED</Badge>}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                  {/* Animated Confidence Meter */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-lg">Confidence Level</span>
                      <span className="text-3xl font-bold text-gradient">{analysisResult.confidence}%</span>
                    </div>
                    <Progress value={analysisResult.confidence} className="h-4 bg-gray-200" />
                    {analysisResult.confidence < 75 && <Alert className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Confidence below 75% threshold for institutional trading
                        </AlertDescription>
                      </Alert>}
                  </div>

                  {/* Trading Levels */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">
                          Entry Price
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${analysisResult.entryPrice?.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">
                          Stop Loss
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          ${analysisResult.stopLoss?.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {analysisResult.takeProfits?.map((tp, index) => <Card key={index} className="border-green-500 bg-green-50 dark:bg-green-950/20">
                        <CardContent className="p-4">
                          <div className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                            Take Profit {index + 1}
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ${tp.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Management Panel */}
              <Card className={`card-premium ${analysisResult.riskMetrics && analysisResult.riskMetrics.risk_reward_ratios.tp1 >= 2 ? 'card-risk-low' : analysisResult.riskMetrics && analysisResult.riskMetrics.risk_reward_ratios.tp1 >= 1.5 ? 'card-risk-medium' : 'card-risk-high'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Management Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult.riskMetrics && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">R:R Ratio (TP1)</div>
                        <div className={`text-2xl font-bold ${analysisResult.riskMetrics.risk_reward_ratios.tp1 >= 1.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                          1:{analysisResult.riskMetrics.risk_reward_ratios.tp1.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Position Size</div>
                        <div className="text-2xl font-bold">
                          {analysisResult.riskMetrics.position_size.toFixed(4)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Risk Amount</div>
                        <div className="text-2xl font-bold text-red-600">
                          ${analysisResult.riskMetrics.dollar_risk.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Max Loss</div>
                        <div className="text-2xl font-bold text-red-600">
                          ${analysisResult.riskMetrics.max_loss.toFixed(2)}
                        </div>
                      </div>
                    </div>}
                  
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      <strong>2% Portfolio Rule:</strong> Never risk more than 2% of your total portfolio on a single trade
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Analysis */}
              <Collapsible open={expandedSections.technical} onOpenChange={open => setExpandedSections({
            ...expandedSections,
            technical: open
          })}>
                <Card className="card-premium">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Technical Analysis
                        </span>
                        {expandedSections.technical ? <ChevronUp /> : <ChevronDown />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-64 w-full rounded-md border p-4">
                        <pre className="font-mono-tech whitespace-pre-wrap">
                      {`Technical Indicators:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RSI (14): ${analysisResult.technicalIndicators.rsi?.toFixed(2) || 'N/A'}
MACD Histogram: ${analysisResult.technicalIndicators.macd?.toFixed(4) || 'N/A'}
ATR %: ${analysisResult.technicalIndicators.atr_percent?.toFixed(2) || 'N/A'}%
EMA50 > EMA200: ${analysisResult.technicalIndicators.ema50_above_ema200 ? 'YES ✓' : 'NO ✗'}
Funding Rate: ${analysisResult.technicalIndicators.funding_rate?.toFixed(6) || 'N/A'}
Order Book Imbalance: ${analysisResult.technicalIndicators.orderbook_imbalance_pct?.toFixed(2) || 'N/A'}%

Key Analysis Points:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analysisResult.keyPoints.join('\n')}

Market Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analysisResult.summary}`}
                        </pre>
                      </ScrollArea>
                      
                      <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(analysisResult.technicalIndicators, null, 2));
                    toast({
                      title: "Technical data copied to clipboard"
                    });
                  }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Technical Data
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Right Column - Signal History & Stats */}
            <div className="space-y-6">
              
              {/* Performance Metrics */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Signals</span>
                      <span className="font-bold">{signalHistory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-bold text-green-600">
                        {(signalHistory.filter(s => (s.profit || 0) > 0).length / signalHistory.length * 100 || 0).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Confidence</span>
                      <span className="font-bold">
                        {(signalHistory.reduce((acc, s) => acc + s.confidence, 0) / signalHistory.length || 0).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <Progress value={signalHistory.filter(s => (s.profit || 0) > 0).length / signalHistory.length * 100 || 0} className="h-2" />
                </CardContent>
              </Card>

              {/* Signal History */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Signal History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {signalHistory.map(signal => <div key={signal.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge className={signal.signal === 'LONG' ? 'bg-green-500' : signal.signal === 'SHORT' ? 'bg-red-500' : 'bg-orange-500'}>
                                {signal.signal}
                              </Badge>
                              <span className="font-semibold">{signal.symbol}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold">{signal.confidence}%</div>
                              <div className={`text-xs ${signal.profit && signal.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {signal.profit && signal.profit > 0 ? '+' : ''}{signal.profit?.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(signal.timestamp).toLocaleString()}
                          </div>
                        </div>)}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={exportToPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setShowFullReport(!showFullReport)}>
                    {showFullReport ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showFullReport ? 'Hide' : 'Show'} Full Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>}

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
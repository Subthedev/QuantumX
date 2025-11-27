import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Clock, RefreshCw, CheckCircle, AlertTriangle, Timer, Shield, Target, Copy, Download, History, ChevronDown, ChevronUp, Keyboard, FileText, Printer, ArrowUp, ArrowDown, Eye, EyeOff, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { XRPLogo } from '@/components/ui/xrp-logo';
import { BNBLogo } from '@/components/ui/bnb-logo';
import { SOLLogo } from '@/components/ui/sol-logo';
import { DOGELogo } from '@/components/ui/doge-logo';
import { TRXLogo } from '@/components/ui/trx-logo';
import { ADALogo } from '@/components/ui/ada-logo';
import { HYPELogo } from '@/components/ui/hype-logo';
import { LINKLogo } from '@/components/ui/link-logo';
import { debounce } from '@/utils/performance';
interface SignalHistory {
  id: string;
  symbol: string;
  signal: string;
  confidence: number;
  timestamp: string;
  profit?: number;
}
interface ProfessionalAnalysisDashboardProps {
  onCreditUsed?: () => void;
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
const ProfessionalAnalysisDashboard: React.FC<ProfessionalAnalysisDashboardProps> = ({ onCreditUsed }) => {
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
  // Memoized fetch market data with debounce
  const fetchMarketData = useCallback(
    debounce(async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,binancecoin,solana,dogecoin,tron,cardano,hyperliquid,chainlink&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true');
        if (response.ok) {
          const data = await response.json();
          setMarketData(data);
        }
      } catch (error) {
        // Silently handle error
      }
    }, 500),
    []
  );

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
    loadSignalHistory();
  }, []);
  
  const loadSignalHistory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('crypto_reports').select('*').order('created_at', {
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
      // Silently handle error
    }
  };
  
  const handleAnalyzeCrypto = useCallback(async (symbol: 'BTC' | 'ETH' | 'XRP' | 'BNB' | 'SOL' | 'DOGE' | 'TRX' | 'ADA' | 'HYPE' | 'LINK') => {
    setLoading(symbol);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timed out')), 30000);
      });
      const analysisPromise = supabase.functions.invoke('generate-crypto-report', {
        body: {
          coin: symbol,
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
        setAnalysisResult(result);
        await loadSignalHistory();
        
        // Notify parent component that credit was used
        if (onCreditUsed) {
          onCreditUsed();
        }
        
        toast({
          title: "✅ Analysis Complete",
          description: `Professional ${symbol} analysis generated successfully. Credit consumed.`
        });
      }
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || 'Unable to generate analysis',
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  }, [onCreditUsed]);
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
  
  return (
    <div className="w-full space-y-4">

        {/* Live Market Data & Analysis Actions - Professional Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-orange-500/5 to-orange-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BTCLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">Bitcoin</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.bitcoin.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.bitcoin.usd_24h_change >= 0 ? '+' : ''}{marketData.bitcoin.usd_24h_change.toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.bitcoin.usd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.bitcoin.usd_market_cap)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.bitcoin.usd_24h_vol)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('BTC')}
                disabled={loading === 'BTC'}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white mt-2"
                size="sm"
              >
                {loading === 'BTC' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-blue-500/5 to-purple-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ETHLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">Ethereum</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.ethereum.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.ethereum.usd_24h_change >= 0 ? '+' : ''}{marketData.ethereum.usd_24h_change.toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.ethereum.usd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.ethereum.usd_market_cap)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.ethereum.usd_24h_vol)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('ETH')}
                disabled={loading === 'ETH'}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white mt-2"
                size="sm"
              >
                {loading === 'ETH' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* XRP Card */}
          <Card className="border-l-4 border-l-gray-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-gray-500/5 to-gray-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <XRPLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">XRP</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.ripple?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.ripple?.usd_24h_change >= 0 ? '+' : ''}{(marketData.ripple?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.ripple?.usd?.toFixed(4) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.ripple?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.ripple?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('XRP')}
                disabled={loading === 'XRP'}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white mt-2"
                size="sm"
              >
                {loading === 'XRP' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* BNB Card */}
          <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BNBLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">BNB</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.binancecoin?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.binancecoin?.usd_24h_change >= 0 ? '+' : ''}{(marketData.binancecoin?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.binancecoin?.usd?.toLocaleString() || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.binancecoin?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.binancecoin?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('BNB')}
                disabled={loading === 'BNB'}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white mt-2"
                size="sm"
              >
                {loading === 'BNB' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* SOL Card */}
          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-purple-500/5 to-pink-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <SOLLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">SOL</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.solana?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.solana?.usd_24h_change >= 0 ? '+' : ''}{(marketData.solana?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.solana?.usd?.toLocaleString() || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.solana?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.solana?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('SOL')}
                disabled={loading === 'SOL'}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white mt-2"
                size="sm"
              >
                {loading === 'SOL' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* DOGE Card */}
          <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-amber-500/5 to-amber-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DOGELogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">DOGE</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.dogecoin?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.dogecoin?.usd_24h_change >= 0 ? '+' : ''}{(marketData.dogecoin?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.dogecoin?.usd?.toFixed(4) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.dogecoin?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.dogecoin?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('DOGE')}
                disabled={loading === 'DOGE'}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white mt-2"
                size="sm"
              >
                {loading === 'DOGE' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* TRX Card */}
          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-red-500/5 to-red-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TRXLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">TRX</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.tron?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.tron?.usd_24h_change >= 0 ? '+' : ''}{(marketData.tron?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.tron?.usd?.toFixed(4) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.tron?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.tron?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('TRX')}
                disabled={loading === 'TRX'}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white mt-2"
                size="sm"
              >
                {loading === 'TRX' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ADA Card */}
          <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ADALogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">ADA</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.cardano?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.cardano?.usd_24h_change >= 0 ? '+' : ''}{(marketData.cardano?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.cardano?.usd?.toFixed(4) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.cardano?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.cardano?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('ADA')}
                disabled={loading === 'ADA'}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white mt-2"
                size="sm"
              >
                {loading === 'ADA' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* HYPE Card */}
          <Card className="border-l-4 border-l-gradient-to-r from-purple-500 to-teal-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-purple-500/5 to-teal-500/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <HYPELogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">HYPE</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.hyperliquid?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.hyperliquid?.usd_24h_change >= 0 ? '+' : ''}{(marketData.hyperliquid?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData?.hyperliquid ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.hyperliquid?.usd?.toFixed(4) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.hyperliquid?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.hyperliquid?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('HYPE')}
                disabled={loading === 'HYPE'}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white mt-2"
                size="sm"
              >
                {loading === 'HYPE' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* LINK Card */}
          <Card className="border-l-4 border-l-sky-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-sky-500/5 to-sky-600/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LINKLogo className="w-6 h-6" />
                  <CardTitle className="text-base font-semibold">LINK</CardTitle>
                </div>
                {marketData && (
                  <Badge className={`text-xs ${marketData.chainlink?.usd_24h_change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    {marketData.chainlink?.usd_24h_change >= 0 ? '+' : ''}{(marketData.chainlink?.usd_24h_change || 0).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {marketData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold">${marketData.chainlink?.usd?.toLocaleString() || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatNumber(marketData.chainlink?.usd_market_cap || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">{formatNumber(marketData.chainlink?.usd_24h_vol || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              <Button 
                onClick={() => handleAnalyzeCrypto('LINK')}
                disabled={loading === 'LINK'}
                className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white mt-2"
                size="sm"
              >
                {loading === 'LINK' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-1.5 h-3.5 w-3.5" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>


        {/* Loading State - Clean & Professional */}
        {loading && (
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border rounded-xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-fade-in">
              <div className="space-y-4">
                {/* Minimal Spinner */}
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 border-3 border-muted rounded-full"></div>
                  <div className="absolute inset-0 border-3 border-t-primary rounded-full animate-spin"></div>
                </div>
                
                {/* Text Content */}
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Analyzing Markets</h3>
                  <p className="text-sm text-muted-foreground">
                    Processing real-time data...
                  </p>
                </div>
                
                {/* Progress Indicator */}
                <div className="flex justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Analysis Results - Compact */}
        {analysisResult && <div className="space-y-3">
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
          </div>}

        {/* Loading State - Compact */}
        {loading && !analysisResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

    </div>
  );
};

export default memo(ProfessionalAnalysisDashboard);
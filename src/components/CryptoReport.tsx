import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
import { TradingSignalsSection } from './TradingSignalsSection';
import { RiskManagementSection } from './RiskManagementSection';
import { CompleteTechnicalAnalysisDashboard } from './CompleteTechnicalAnalysisDashboard';
import { TechnicalAnalysisSection } from './TechnicalAnalysisSection';
import { FundamentalAnalysisSection } from './FundamentalAnalysisSection';
import { SentimentAnalysisSection } from './SentimentAnalysisSection';
import { IgniteXSummarySection } from './IgniteXSummarySection';

interface CryptoReportData {
  id: string;
  coin_symbol: string;
  prediction_summary: string;
  confidence_score: number;
  report_data: {
    summary: string;
    confidence: number;
    market_direction?: string;
    analysis?: {
      technical: {
        trend?: string;
        primary_trend?: string;
        support_levels: number[] | string;
        resistance_levels: number[] | string;
        indicators: string[] | string;
        key_indicators?: string;
        breakout_scenarios?: string;
      };
      fundamental: {
        strengths: string[];
        weaknesses: string[];
        market_position: string;
        adoption_metrics?: string;
        competitive_position?: string;
        macro_environment?: string;
        institutional_flow?: string;
        network_health?: string;
        competitive_landscape?: string;
        catalysts?: string;
      };
      sentiment: {
        overall: string;
        factors: string[];
        risk_level: string;
        market_sentiment?: string;
        fear_greed_analysis?: string;
        social_metrics?: string;
        options_flow?: string;
        contrarian_indicators?: string;
      };
      multi_directional_signals?: {
        bullish_scenario: {
          probability: string;
          triggers: string;
          targets: string;
          timeframe: string;
          risk_factors: string;
        };
        bearish_scenario: {
          probability: string;
          triggers: string;
          targets: string;
          timeframe: string;
          risk_factors: string;
        };
        neutral_scenario: {
          probability: string;
          range: string;
          duration: string;
          breakout_catalysts: string;
        };
      };
    };
    fundamentalAnalysis?: {
      metrics?: {
        competitivePosition?: string;
        adoptionRate?: string;
        networkHealth?: string;
        institutionalFlow?: string;
        tokenomics?: string;
      };
      strengths?: string[];
      weaknesses?: string[];
      catalysts?: {
        bullish?: string[];
        bearish?: string[];
      };
      macroFactors?: {
        marketRegime?: string;
        correlation?: string;
        regulatoryOutlook?: string;
      };
      onChainData?: {
        exchangeFlows?: string;
        activeAddresses?: string;
        transactionVolume?: string;
        holdingDistribution?: string;
      };
    };
    sentimentAnalysis?: {
      overall?: string;
      factors?: string[];
      risk_level?: string;
      score?: number;
      newsFlow?: any;
      socialMetrics?: any;
      fearGreedIndex?: any;
      derivativesData?: any;
      crowdPositioning?: any;
    };
    targets: {
      take_profit_1: number;
      take_profit_2: number;
      take_profit_3: number;
      stop_loss: number;
      target_timeframe: string;
    };
    risk_management: {
      position_size: string;
      risk_reward_ratio: string;
      max_drawdown: string;
    };
    quantitative_metrics?: {
      sharpe_ratio_estimate: string;
      max_drawdown_probability: string;
      volatility_forecast: string;
      correlation_factors: string;
    };
    execution_strategy?: {
      entry_zones: string;
      position_sizing: string;
      stop_loss_strategy: string;
      profit_taking: string;
      hedging_options: string;
    };
    risk_assessment?: {
      tail_risks: string;
      correlation_risks: string;
      liquidity_risks: string;
      regulatory_risks: string;
      technical_risks: string;
    };
    market_data: {
      price: number;
      percentChange24h: number;
      volume24h: number;
      marketCap: number;
      name?: string;
      symbol?: string;
    };
    signal_4h?: {
      timeframe: string;
      direction: 'LONG' | 'SHORT' | 'HOLD';
      confidence: number;
      entry: number;
      stop_loss: number;
      take_profits: number[];
      indicators: {
        rsi14: number;
        macd_hist: number;
        ema50_above_ema200: boolean;
        atr_percent: number;
        funding_rate: number | null;
        orderbook_imbalance_pct: number | null;
      };
      reasoning: string[];
    };
    timestamp: string;
    coin: string;
  };
  created_at: string;
}

interface CryptoReportProps {
  coin: string;  // This should be the coin ID from CoinGecko (e.g., 'bitcoin', 'ethereum')
  icon: React.ReactNode;
  name: string;
  existingReport?: CryptoReportData;
}

const CryptoReport = ({ coin, icon, name, existingReport }: CryptoReportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CryptoReportData | undefined>(existingReport);

  const generateReport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate reports.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has tester role (unlimited reports)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isTester = userRoles?.some(r => r.role === 'tester' || r.role === 'admin');
    
    // If not a tester, check if user has credits
    if (!isTester) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.credits < 1) {
        toast({
          title: "No credits available",
          description: "Complete the feedback form to earn 5 credits!",
          variant: "destructive"
        });
        return;
      }
    }
    
    setLoading(true);
    try {
      // Consume a credit only if not a tester
      if (!isTester) {
        const { data: consumed, error: consumeError } = await supabase
          .rpc('consume_credit', { _user_id: user.id });

        if (!consumed || consumeError) {
          throw new Error('Failed to consume credit');
        }
      }

      // Map CoinGecko IDs to symbols
      const idToSymbol: Record<string, string> = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'binancecoin': 'BNB',
        'solana': 'SOL',
        'cardano': 'ADA',
        'ripple': 'XRP',
        'polkadot': 'DOT',
        'dogecoin': 'DOGE',
        'avalanche-2': 'AVAX',
        'shiba-inu': 'SHIB',
        'matic-network': 'MATIC',
        'litecoin': 'LTC',
        'chainlink': 'LINK',
        'uniswap': 'UNI',
        'near': 'NEAR',
        'tron': 'TRX',
        'cosmos': 'ATOM',
        'stellar': 'XLM',
        'fantom': 'FTM',
        'algorand': 'ALGO',
        'tether': 'USDT',
        'usd-coin': 'USDC',
        'aptos': 'APT',
        'arbitrum': 'ARB',
        'vechain': 'VET',
        'internet-computer': 'ICP',
        'hedera': 'HBAR',
        'filecoin': 'FIL',
        'crypto-com-chain': 'CRO',
        'bitcoin-cash': 'BCH',
        'the-open-network': 'TON'
      };
      
      // Get the correct symbol for the coin
      const coinSymbol = idToSymbol[coin] || coin.toUpperCase();
      
      const { data, error } = await supabase.functions.invoke('generate-crypto-report', {
        body: {
          coin: coinSymbol, // Pass the correct symbol
          userId: user.id,
          timeframe: '4H'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate report');
      }

      if (!data) {
        throw new Error('No data received from edge function');
      }

      setReport(data);
      const creditMessage = isTester ? '(Tester - No credits consumed)' : '(Credit consumed)';
      toast({
        title: "Report Generated",
        description: `Professional analysis for ${name} has been created successfully. ${creditMessage}`
      });
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-xl">{name}</CardTitle>
              <CardDescription>{coin} Professional Analysis</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!report ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground mb-4">
              Generate a professional analytics report for {name}
            </div>
            <Button 
              onClick={generateReport} 
              disabled={loading} 
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-primary rounded-full animate-spin"></div>
                  </div>
                  <span>Generating Report...</span>
                </div>
              ) : (
                'Generate Professional Trading Report'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Trading Signals with TP and SL */}
            <TradingSignalsSection 
              signal={report.report_data?.signal_4h} 
              marketData={report.report_data?.market_data}
            />

            {/* 2. Risk Management Dashboard */}
            <RiskManagementSection 
              signal={report.report_data?.signal_4h}
              marketData={report.report_data?.market_data}
              symbol={coin}
            />

            {/* 3. Complete Technical Analysis Dashboard */}
            <CompleteTechnicalAnalysisDashboard 
              signal={report.report_data?.signal_4h}
              marketData={report.report_data?.market_data}
              symbol={coin}
            />

            {/* 4. Technical Analysis Details */}
            <TechnicalAnalysisSection 
              analysis={report.report_data?.analysis?.technical}
              marketData={report.report_data?.market_data}
            />

            {/* 5. Fundamental Analysis */}
            <FundamentalAnalysisSection 
              analysis={report.report_data?.fundamentalAnalysis}
              marketData={report.report_data?.market_data}
            />

            {/* 6. Sentiment Analysis */}
            <SentimentAnalysisSection 
              analysis={report.report_data?.sentimentAnalysis || report.report_data?.analysis?.sentiment}
            />

            {/* 7. IgniteX AI Summary */}
            <IgniteXSummarySection 
              report={report.report_data}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CryptoReport;
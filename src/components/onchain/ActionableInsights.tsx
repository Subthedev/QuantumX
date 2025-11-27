import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Target,
  Shield
} from 'lucide-react';
import { whaleAlertService, type WhaleAlertStats } from '@/services/whaleAlertService';
import { exchangeFlowService, type ExchangeFlowData } from '@/services/exchangeFlowService';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 1-10
  title: string;
  description: string;
  evidence: string[];
  recommendation: string;
  timestamp: Date;
  category: 'whale' | 'exchange_flow' | 'network' | 'combined';
}

interface ActionableInsightsProps {
  coinSymbol: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const ActionableInsights = ({
  coinSymbol,
  autoRefresh = true,
  refreshInterval = 60000
}: ActionableInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate insights from data
  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const [whaleStats, flowData] = await Promise.all([
        whaleAlertService.getWhaleStats(coinSymbol),
        exchangeFlowService.getExchangeFlows(coinSymbol, '24h')
      ]);

      const newInsights: Insight[] = [];

      // Insight 1: Whale Accumulation
      if (whaleStats.whaleAccumulationScore > 65) {
        newInsights.push({
          id: 'whale-accumulation',
          signal: 'bullish',
          strength: Math.min(10, Math.floor((whaleStats.whaleAccumulationScore - 50) / 5)),
          title: '🐋 Whales Accumulating',
          description: `Large holders are actively accumulating ${coinSymbol.toUpperCase()}`,
          evidence: [
            `Accumulation score: ${whaleStats.whaleAccumulationScore}/100`,
            `${whaleStats.totalTransactions24h} whale transactions in 24h`,
            `Net exchange outflow: ${exchangeFlowService.formatUsd(Math.abs(flowData.netFlow))}`
          ],
          recommendation: 'Consider buying. Whales typically accumulate before major price movements.',
          timestamp: new Date(),
          category: 'whale'
        });
      } else if (whaleStats.whaleAccumulationScore < 35) {
        newInsights.push({
          id: 'whale-distribution',
          signal: 'bearish',
          strength: Math.min(10, Math.floor((50 - whaleStats.whaleAccumulationScore) / 5)),
          title: '⚠️ Whale Distribution Detected',
          description: `Large holders appear to be distributing ${coinSymbol.toUpperCase()}`,
          evidence: [
            `Accumulation score: ${whaleStats.whaleAccumulationScore}/100`,
            `${whaleStats.totalTransactions24h} whale transactions in 24h`,
            `High exchange deposits detected`
          ],
          recommendation: 'Exercise caution. Consider taking profits or waiting for better entry.',
          timestamp: new Date(),
          category: 'whale'
        });
      }

      // Insight 2: Exchange Flows
      if (flowData.sentiment === 'very_bullish' || flowData.sentiment === 'bullish') {
        newInsights.push({
          id: 'exchange-outflow',
          signal: 'bullish',
          strength: flowData.sentiment === 'very_bullish' ? 9 : 7,
          title: '📈 Strong Exchange Outflows',
          description: `${coinSymbol.toUpperCase()} is moving out of exchanges at accelerated rates`,
          evidence: [
            `Net outflow: ${exchangeFlowService.formatUsd(Math.abs(flowData.netFlow))}`,
            `Total withdrawals: ${exchangeFlowService.formatUsd(flowData.outflow)}`,
            `Sentiment: ${flowData.sentiment.replace(/_/g, ' ').toUpperCase()}`
          ],
          recommendation: 'Bullish signal. Users are moving funds to cold storage, reducing sell pressure.',
          timestamp: new Date(),
          category: 'exchange_flow'
        });
      } else if (flowData.sentiment === 'very_bearish' || flowData.sentiment === 'bearish') {
        newInsights.push({
          id: 'exchange-inflow',
          signal: 'bearish',
          strength: flowData.sentiment === 'very_bearish' ? 9 : 7,
          title: '📉 High Exchange Inflows',
          description: `${coinSymbol.toUpperCase()} deposits to exchanges are increasing`,
          evidence: [
            `Net inflow: ${exchangeFlowService.formatUsd(flowData.netFlow)}`,
            `Total deposits: ${exchangeFlowService.formatUsd(flowData.inflow)}`,
            `Sentiment: ${flowData.sentiment.replace(/_/g, ' ').toUpperCase()}`
          ],
          recommendation: 'Bearish signal. Increased deposits typically indicate selling pressure.',
          timestamp: new Date(),
          category: 'exchange_flow'
        });
      }

      // Insight 3: Large Transaction Alert
      if (whaleStats.largestTransaction24h && whaleStats.largestTransaction24h > 10000000) {
        const txValue = whaleStats.largestTransaction24h;
        const isBullish = whaleStats.exchangeWithdrawals > whaleStats.exchangeDeposits;

        newInsights.push({
          id: 'large-transaction',
          signal: isBullish ? 'bullish' : 'bearish',
          strength: txValue > 50000000 ? 8 : 6,
          title: `🚨 $${(txValue / 1000000).toFixed(1)}M Transaction Detected`,
          description: `Massive whale transaction observed`,
          evidence: [
            `Transaction Value: $${(txValue / 1000000).toFixed(2)}M`,
            `Type: ${isBullish ? 'Exchange Withdrawal' : 'Exchange Deposit'}`,
            `24h Whale Activity: ${whaleStats.totalTransactions24h} transactions`
          ],
          recommendation: isBullish
            ? 'Major holder accumulating. Could indicate confidence in upward movement.'
            : 'Large deposit to exchange. Monitor for potential selling pressure.',
          timestamp: new Date(),
          category: 'whale'
        });
      }

      // Insight 4: Combined Signal
      if ((whaleStats.whaleAccumulationScore > 60 && flowData.netFlow < 0) ||
          (whaleStats.whaleAccumulationScore < 40 && flowData.netFlow > 0)) {
        const isBullish = whaleStats.whaleAccumulationScore > 60 && flowData.netFlow < 0;

        newInsights.push({
          id: 'combined-signal',
          signal: isBullish ? 'bullish' : 'bearish',
          strength: 10,
          title: isBullish ? '🎯 STRONG BUY SIGNAL' : '⚠️ STRONG SELL WARNING',
          description: `Multiple on-chain indicators align for ${coinSymbol.toUpperCase()}`,
          evidence: [
            `Whale accumulation score: ${whaleStats.whaleAccumulationScore}/100`,
            `Exchange net flow: ${exchangeFlowService.formatUsd(flowData.netFlow)}`,
            `Flow interpretation: ${flowData.flowInterpretation.replace(/_/g, ' ')}`,
            `Market sentiment: ${flowData.sentiment.replace(/_/g, ' ')}`
          ],
          recommendation: isBullish
            ? 'STRONG BUY: Whales are accumulating while retail is withdrawing from exchanges. Historical precedent suggests upward price movement.'
            : 'STRONG SELL/AVOID: Whales are distributing while deposits to exchanges increase. High risk of price decline.',
          timestamp: new Date(),
          category: 'combined'
        });
      }

      // If no strong signals, add neutral insight
      if (newInsights.length === 0) {
        newInsights.push({
          id: 'neutral',
          signal: 'neutral',
          strength: 5,
          title: '➡️ Neutral Market Conditions',
          description: `On-chain activity for ${coinSymbol.toUpperCase()} shows balanced behavior`,
          evidence: [
            `Whale accumulation score: ${whaleStats.whaleAccumulationScore}/100`,
            `Exchange flows are balanced`,
            `No significant whale movements detected`
          ],
          recommendation: 'Wait for clearer signals before making major position changes.',
          timestamp: new Date(),
          category: 'network'
        });
      }

      setInsights(newInsights.sort((a, b) => b.strength - a.strength));
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();

    if (autoRefresh) {
      const interval = setInterval(generateInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [coinSymbol, autoRefresh, refreshInterval]);

  // Get signal badge
  const getSignalBadge = (signal: Insight['signal'], strength: number) => {
    if (signal === 'bullish') {
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          BULLISH ({strength}/10)
        </Badge>
      );
    } else if (signal === 'bearish') {
      return (
        <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
          <TrendingDown className="h-3 w-3 mr-1" />
          BEARISH ({strength}/10)
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Info className="h-3 w-3 mr-1" />
          NEUTRAL ({strength}/10)
        </Badge>
      );
    }
  };

  // Get category icon
  const getCategoryIcon = (category: Insight['category']) => {
    switch (category) {
      case 'whale':
        return <Target className="h-5 w-5" />;
      case 'exchange_flow':
        return <TrendingUp className="h-5 w-5" />;
      case 'network':
        return <Shield className="h-5 w-5" />;
      case 'combined':
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Actionable Insights</CardTitle>
            <CardDescription>
              AI-powered trading signals from on-chain data
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Analyzing on-chain data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <Alert
                key={insight.id}
                className={cn(
                  "border-2",
                  insight.signal === 'bullish' && insight.strength >= 8
                    ? "border-green-500/50 bg-green-500/10"
                    : insight.signal === 'bearish' && insight.strength >= 8
                    ? "border-red-500/50 bg-red-500/10"
                    : ""
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    insight.signal === 'bullish' ? "bg-green-500/20" :
                    insight.signal === 'bearish' ? "bg-red-500/20" : "bg-gray-500/20"
                  )}>
                    {getCategoryIcon(insight.category)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <AlertDescription className="text-base font-semibold">
                        {insight.title}
                      </AlertDescription>
                      {getSignalBadge(insight.signal, insight.strength)}
                    </div>
                    <AlertDescription className="text-sm">
                      {insight.description}
                    </AlertDescription>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Evidence:</div>
                      <ul className="text-xs space-y-1 ml-4 list-disc text-muted-foreground">
                        {insight.evidence.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg border text-sm",
                      insight.signal === 'bullish'
                        ? "bg-green-500/10 border-green-500/30"
                        : insight.signal === 'bearish'
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-gray-500/10 border-gray-500/30"
                    )}>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold mb-1">Recommendation:</div>
                          <div>{insight.recommendation}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

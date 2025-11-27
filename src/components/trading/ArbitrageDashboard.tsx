/**
 * Arbitrage Dashboard Component
 * Displays real-time arbitrage opportunities across exchanges
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/exchanges/types';
import { exchangeManager } from '@/services/exchanges/ExchangeManager';
import { TrendingUp, ExternalLink, Calculator, Info, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ArbitrageDashboardProps {
  symbols?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const ArbitrageDashboard = ({
  symbols = ['BTC', 'ETH', 'SOL', 'BNB'],
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: ArbitrageDashboardProps) => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    try {
      setError(null);
      const allOpportunities: ArbitrageOpportunity[] = [];

      // Fetch arbitrage opportunities for each symbol
      for (const symbol of symbols) {
        try {
          const opps = await exchangeManager.findArbitrageOpportunities(symbol);
          allOpportunities.push(...opps);
        } catch (err) {
          console.error(`Failed to fetch arbitrage for ${symbol}:`, err);
        }
      }

      // Sort by net gain descending
      allOpportunities.sort((a, b) => b.netGain - a.netGain);

      setOpportunities(allOpportunities);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch arbitrage opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();

    if (autoRefresh) {
      const interval = setInterval(fetchOpportunities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [symbols, autoRefresh, refreshInterval]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 50) return 'secondary';
    return 'outline';
  };

  const calculatePositionSize = (opportunity: ArbitrageOpportunity, capital: number = 10000) => {
    // Simple calculation: split capital evenly between long and short
    const perSide = capital / 2;
    const dailyReturn = (opportunity.netGain / 100) * perSide * 3; // 3 fundings per day
    const monthlyReturn = dailyReturn * 30;

    return {
      perSide,
      dailyReturn,
      monthlyReturn
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Arbitrage Opportunities
          </CardTitle>
          <CardDescription>Scanning markets for profitable opportunities...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Arbitrage Opportunities
            </CardTitle>
            <CardDescription>
              Real-time funding rate arbitrage scanner • {opportunities.length} opportunities found
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOpportunities}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Funding rate arbitrage involves opening a long position on one exchange and a short position on another.
            You earn the difference in funding rates every 8 hours with minimal directional risk.
          </AlertDescription>
        </Alert>

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-xs text-muted-foreground text-right">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No profitable arbitrage opportunities found at this time.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try again later or check different symbols.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp, index) => {
              const position = calculatePositionSize(opp);

              return (
                <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{opp.symbol}</h3>
                        <p className="text-xs text-muted-foreground">Funding Rate Arbitrage</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getConfidenceBadge(opp.confidence)}>
                          {opp.confidence.toFixed(0)}% Confidence
                        </Badge>
                        <div className="text-2xl font-bold text-green-500">
                          +{opp.annualizedReturn.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Annual ROI</div>
                      </div>
                    </div>

                    {/* Strategy Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="text-xs text-muted-foreground mb-1">🟢 Long Position</div>
                        <div className="font-semibold">{opp.longExchange}</div>
                        <div className="text-sm text-green-500">{opp.longRate.toFixed(4)}% rate</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="text-xs text-muted-foreground mb-1">🔴 Short Position</div>
                        <div className="font-semibold">{opp.shortExchange}</div>
                        <div className="text-sm text-red-500">{opp.shortRate.toFixed(4)}% rate</div>
                      </div>
                    </div>

                    {/* Profit Calculation */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Profit Estimate ($10k capital)
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Based on $5k long + $5k short. Actual returns may vary based on funding rate changes,
                                exchange fees, and slippage.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">Per Funding</div>
                          <div className="font-semibold text-sm">
                            ${(position.perSide * opp.netGain / 100).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Daily (3x)</div>
                          <div className="font-semibold text-sm text-green-500">
                            ${position.dailyReturn.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Monthly</div>
                          <div className="font-semibold text-sm text-green-500">
                            ${position.monthlyReturn.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-2" variant="default">
                        <ExternalLink className="h-3 w-3" />
                        Execute Strategy
                      </Button>
                      <Button size="sm" variant="outline">
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

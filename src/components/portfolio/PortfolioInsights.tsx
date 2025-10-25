import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield, PieChart, Activity } from 'lucide-react';

interface Holding {
  coin_id?: string;
  coin_symbol: string;
  coin_name: string;
  value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
  price_change_24h?: number;
}

interface PortfolioInsightsProps {
  holdings: Holding[];
  totalValue: number;
  lastUpdate?: Date;
}

const PortfolioInsightsComponent = ({ holdings, totalValue, lastUpdate }: PortfolioInsightsProps) => {
  // Calculate insights
  const topPerformer = holdings.reduce((max, h) =>
    (h.profit_loss_percentage || 0) > (max.profit_loss_percentage || 0) ? h : max
  , holdings[0]);

  const worstPerformer = holdings.reduce((min, h) =>
    (h.profit_loss_percentage || 0) < (min.profit_loss_percentage || 0) ? h : min
  , holdings[0]);

  // Calculate top daily performers (24h price change)
  const topDailyGainer = holdings.reduce((max, h) =>
    (h.price_change_24h || 0) > (max.price_change_24h || 0) ? h : max
  , holdings[0]);

  const topDailyLoser = holdings.reduce((min, h) =>
    (h.price_change_24h || 0) < (min.price_change_24h || 0) ? h : min
  , holdings[0]);

  // Calculate average 24h performance across portfolio
  const avg24hPerformance = holdings.length > 0
    ? holdings.reduce((sum, h) => sum + (h.price_change_24h || 0), 0) / holdings.length
    : 0;

  // Real-time win rate based on 24h price changes
  const profitableHoldings = holdings.filter(h => (h.price_change_24h || 0) > 0);
  const losingHoldings = holdings.filter(h => (h.price_change_24h || 0) < 0);

  // Diversification score (0-100)
  const largestHolding = Math.max(...holdings.map(h => ((h.value || 0) / totalValue) * 100));
  const diversificationScore = Math.max(0, 100 - largestHolding * 2);

  // Risk assessment
  const avgVolatility = holdings.reduce((sum, h) =>
    sum + Math.abs(h.profit_loss_percentage || 0), 0) / holdings.length;

  const riskLevel = avgVolatility > 30 ? 'High' : avgVolatility > 15 ? 'Medium' : 'Low';
  const riskColor = avgVolatility > 30 ? 'text-red-500' : avgVolatility > 15 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="space-y-4">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-xs text-muted-foreground mb-1">
              <Target className="h-3 w-3" />
              <span className="text-[10px] md:text-xs">Win Rate (24h)</span>
            </div>
            <div className="text-lg md:text-xl font-bold">
              {holdings.length > 0 ? ((profitableHoldings.length / holdings.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
              {profitableHoldings.length} of {holdings.length} up today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-xs text-muted-foreground mb-1">
              <PieChart className="h-3 w-3" />
              <span className="text-[10px] md:text-xs">Diversification</span>
            </div>
            <div className="text-lg md:text-xl font-bold">
              {diversificationScore.toFixed(0)}%
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
              {diversificationScore > 70 ? 'Excellent' : diversificationScore > 40 ? 'Good' : 'Low'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px] md:text-xs">Risk Level</span>
            </div>
            <div className={`text-lg md:text-xl font-bold ${riskColor}`}>
              {riskLevel}
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
              {avgVolatility.toFixed(1)}% volatility
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-xs text-muted-foreground mb-1">
              <Shield className="h-3 w-3" />
              <span className="text-[10px] md:text-xs">Protected</span>
            </div>
            <div className="text-lg md:text-xl font-bold">
              0
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
              ProfitGuard
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Top Performers (24h) */}
      <div className="grid md:grid-cols-2 gap-4">
        {topDailyGainer && topDailyGainer.price_change_24h && topDailyGainer.price_change_24h > 0 && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Daily Performer
                </div>
                {lastUpdate && (
                  <Badge variant="outline" className="text-xs bg-green-500/10">
                    <span className="text-green-500 mr-1">●</span> Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{topDailyGainer.coin_name}</div>
                  <div className="text-sm text-muted-foreground uppercase">
                    {topDailyGainer.coin_symbol}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-500 text-white">
                    +{topDailyGainer.price_change_24h?.toFixed(2)}%
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    24h price change
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {topDailyLoser && topDailyLoser.price_change_24h && topDailyLoser.price_change_24h < 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Needs Attention Today
                </div>
                {lastUpdate && (
                  <Badge variant="outline" className="text-xs bg-red-500/10">
                    <span className="text-red-500 mr-1">●</span> Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{topDailyLoser.coin_name}</div>
                  <div className="text-sm text-muted-foreground uppercase">
                    {topDailyLoser.coin_symbol}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">
                    {topDailyLoser.price_change_24h?.toFixed(2)}%
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    24h price change
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Average Portfolio Performance (24h) */}
      <Card className={`border-2 ${avg24hPerformance >= 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-purple-500/30 bg-purple-500/5'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${avg24hPerformance >= 0 ? 'text-blue-500' : 'text-purple-500'}`} />
              Average Portfolio Performance (24h)
            </div>
            {lastUpdate && (
              <Badge variant="outline" className={`text-xs ${avg24hPerformance >= 0 ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                <span className={`${avg24hPerformance >= 0 ? 'text-blue-500' : 'text-purple-500'} mr-1`}>●</span> Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">Portfolio Average</div>
              <div className="text-sm text-muted-foreground">
                Based on {holdings.length} position{holdings.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${avg24hPerformance >= 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                {avg24hPerformance >= 0 ? '+' : ''}{avg24hPerformance.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                24h average price change
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actionable Insights */}
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-sm md:text-base">💡 Portfolio Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3">
          {largestHolding > 50 && (
            <div className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs md:text-sm">
                <div className="font-medium">High Concentration Risk</div>
                <div className="text-muted-foreground mt-0.5 md:mt-1">
                  Your largest holding represents {largestHolding.toFixed(0)}% of your portfolio. Consider diversifying to reduce risk.
                </div>
              </div>
            </div>
          )}

          {profitableHoldings.length > 0 && profitableHoldings.some(h => (h.price_change_24h || 0) > 5) && (
            <div className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs md:text-sm">
                <div className="font-medium">Strong Momentum Today</div>
                <div className="text-muted-foreground mt-0.5 md:mt-1">
                  You have positions with 5%+ gains in 24h. Activate ProfitGuard to secure profits automatically.
                </div>
              </div>
            </div>
          )}

          {holdings.length < 3 && (
            <div className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <PieChart className="h-4 w-4 md:h-5 md:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs md:text-sm">
                <div className="font-medium">Expand Your Portfolio</div>
                <div className="text-muted-foreground mt-0.5 md:mt-1">
                  Consider adding more assets to improve diversification and reduce overall risk.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const PortfolioInsights = memo(PortfolioInsightsComponent);

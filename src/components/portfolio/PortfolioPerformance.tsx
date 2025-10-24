import React, { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Holding {
  coin_symbol: string;
  coin_name: string;
  coin_image?: string;
  value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
  price_change_24h?: number;
}

interface PortfolioPerformanceProps {
  holdings: Holding[];
  marketData?: Map<string, any>;
  lastUpdate?: Date;
}

const PortfolioPerformanceComponent = ({ holdings, marketData, lastUpdate }: PortfolioPerformanceProps) => {
  const performanceData = holdings
    .filter(h => h.value && h.value > 0)
    .map((holding) => ({
      name: holding.coin_symbol.toUpperCase(),
      fullName: holding.coin_name,
      performance: holding.profit_loss_percentage || 0,
      value: holding.value || 0,
      price_change_24h: holding.price_change_24h || 0,
    }))
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 8);

  const gainers = performanceData.filter(d => d.performance > 0);
  const losers = performanceData.filter(d => d.performance < 0);

  // Extract real-time top gainers and losers from market data
  const { topMarketGainers, topMarketLosers } = useMemo(() => {
    if (!marketData || marketData.size === 0) {
      return { topMarketGainers: [], topMarketLosers: [] };
    }

    const allCoins = Array.from(marketData.values());

    // Get top 5 gainers (by 24h price change %)
    const topGainers = allCoins
      .filter(coin => coin.price_change_percentage_24h > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 5);

    // Get top 5 losers (by 24h price change %)
    const topLosers = allCoins
      .filter(coin => coin.price_change_percentage_24h < 0)
      .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 5);

    return {
      topMarketGainers: topGainers,
      topMarketLosers: topLosers,
    };
  }, [marketData, lastUpdate]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Portfolio Performance</CardTitle>
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                Updated {new Date().getTime() - lastUpdate.getTime() < 5000 ? 'just now' : 'recently'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={performanceData}
              margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'P&L']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar
                dataKey="performance"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
              >
                {performanceData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.performance >= 0 ? '#16DB65' : '#FF5F6D'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Performance Summary */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-xs text-muted-foreground mb-1">Portfolio Gainers</div>
              <div className="text-xl md:text-2xl font-bold text-green-500">
                {gainers.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {gainers.length > 0 ? `Avg: +${(gainers.reduce((sum, g) => sum + g.performance, 0) / gainers.length).toFixed(1)}%` : 'No gainers'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-xs text-muted-foreground mb-1">Portfolio Losers</div>
              <div className="text-xl md:text-2xl font-bold text-red-500">
                {losers.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {losers.length > 0 ? `Avg: ${(losers.reduce((sum, l) => sum + l.performance, 0) / losers.length).toFixed(1)}%` : 'No losers'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Market Movers */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Market Gainers */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Top Market Gainers (24h)
              </div>
              <Badge variant="outline" className="text-xs bg-green-500/10">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMarketGainers.length > 0 ? (
              topMarketGainers.map((coin, index) => (
                <div key={coin.id} className="flex items-center justify-between py-2 border-b border-green-500/10 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                    {coin.image && (
                      <img src={coin.image} alt={coin.name} className="h-6 w-6 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{coin.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-500 text-sm">
                      +{coin.price_change_percentage_24h.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Loading market data...</p>
            )}
          </CardContent>
        </Card>

        {/* Top Market Losers */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Top Market Losers (24h)
              </div>
              <Badge variant="outline" className="text-xs bg-red-500/10">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMarketLosers.length > 0 ? (
              topMarketLosers.map((coin, index) => (
                <div key={coin.id} className="flex items-center justify-between py-2 border-b border-red-500/10 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                    {coin.image && (
                      <img src={coin.image} alt={coin.name} className="h-6 w-6 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{coin.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-500 text-sm">
                      {coin.price_change_percentage_24h.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Loading market data...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const PortfolioPerformance = memo(PortfolioPerformanceComponent);

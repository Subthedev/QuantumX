import React, { memo, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface Holding {
  coin_id?: string;
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

  // Filter gainers/losers by 24h price change for real-time tracking
  const gainers = performanceData.filter(d => d.price_change_24h > 0);
  const losers = performanceData.filter(d => d.price_change_24h < 0);

  // Extract portfolio-specific gainers and losers based on 24h price changes
  const { topPortfolioGainers, topPortfolioLosers } = useMemo(() => {
    if (!marketData || marketData.size === 0 || holdings.length === 0) {
      return { topPortfolioGainers: [], topPortfolioLosers: [] };
    }

    // Filter market data to only include coins from user's portfolio
    const portfolioCoins = holdings
      .map(holding => {
        // Use coin_id to look up in marketData map (e.g., 'bitcoin', 'ethereum')
        const coinData = holding.coin_id ? marketData.get(holding.coin_id) : undefined;
        return coinData;
      })
      .filter(coin => coin !== undefined);

    // Get top 5 gainers from portfolio (by 24h price change %)
    const topGainers = portfolioCoins
      .filter(coin => coin.price_change_percentage_24h > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 5);

    // Get top 5 losers from portfolio (by 24h price change %)
    const topLosers = portfolioCoins
      .filter(coin => coin.price_change_percentage_24h < 0)
      .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 5);

    return {
      topPortfolioGainers: topGainers,
      topPortfolioLosers: topLosers,
    };
  }, [marketData, holdings, lastUpdate]);

  return (
    <div className="space-y-4">
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2 md:pb-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 md:h-5 md:w-5" />
              Portfolio Performance
            </CardTitle>
            {lastUpdate && (
              <Badge variant="outline" className="text-xs bg-primary/10">
                <span className="text-primary mr-1">●</span> Updated {new Date().getTime() - lastUpdate.getTime() < 5000 ? 'just now' : 'recently'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={performanceData}
              margin={{ top: 20, right: 10, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Overall P&L %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}%`}
                label={{ value: '24h Change %', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-sm mb-2">{data.fullName}</p>
                        <p className="text-xs text-muted-foreground mb-1">Overall P&L: <span className={`font-medium ${data.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{data.performance.toFixed(2)}%</span></p>
                        <p className="text-xs text-muted-foreground">24h Change: <span className={`font-medium ${data.price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>{data.price_change_24h >= 0 ? '+' : ''}{data.price_change_24h.toFixed(2)}%</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Value: ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar
                yAxisId="left"
                dataKey="performance"
                name="Overall P&L %"
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              >
                {performanceData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.performance >= 0 ? '#16DB65' : '#FF5F6D'}
                    opacity={0.8}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="price_change_24h"
                name="24h Change %"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ fill: '#8B5CF6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Performance Summary - Real-time Price Changes */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-xs text-muted-foreground mb-1">Portfolio Gainers (24h)</div>
              <div className="text-xl md:text-2xl font-bold text-green-500">
                {gainers.length > 0 ? `+${(gainers.reduce((sum, g) => sum + g.price_change_24h, 0) / gainers.length).toFixed(2)}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {gainers.length} position{gainers.length !== 1 ? 's' : ''} • Avg 24h change
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-xs text-muted-foreground mb-1">Portfolio Losers (24h)</div>
              <div className="text-xl md:text-2xl font-bold text-red-500">
                {losers.length > 0 ? `${(losers.reduce((sum, l) => sum + l.price_change_24h, 0) / losers.length).toFixed(2)}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {losers.length} position{losers.length !== 1 ? 's' : ''} • Avg 24h change
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Top Performers - 24h Changes */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Portfolio Gainers */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Top Performers (24h)
              </div>
              <Badge variant="outline" className="text-xs bg-green-500/10">
                <span className="text-green-500 mr-1">●</span> Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPortfolioGainers.length > 0 ? (
              topPortfolioGainers.map((coin, index) => (
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
              <p className="text-xs text-muted-foreground text-center py-4">No gainers in your portfolio today</p>
            )}
          </CardContent>
        </Card>

        {/* Top Portfolio Losers */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Needs Attention (24h)
              </div>
              <Badge variant="outline" className="text-xs bg-red-500/10">
                <span className="text-red-500 mr-1">●</span> Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPortfolioLosers.length > 0 ? (
              topPortfolioLosers.map((coin, index) => (
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
              <p className="text-xs text-muted-foreground text-center py-4">No losers in your portfolio today</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const PortfolioPerformance = memo(PortfolioPerformanceComponent);

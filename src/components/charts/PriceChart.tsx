import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PriceChartProps {
  coinId: string;
  symbol: string;
  currentPrice?: number;
  sparklineData?: number[];
  height?: number;
}

type Timeframe = '1H' | '4H' | '1D' | '7D';

const PriceChart: React.FC<PriceChartProps> = ({
  coinId,
  symbol,
  currentPrice: initialPrice,
  sparklineData,
  height = 450,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState({
    current: initialPrice || 0,
    change: 0,
    changePercent: 0,
  });

  useEffect(() => {
    loadChartData();
  }, [coinId, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    setError(null);

    // Use sparkline data for 7D as instant fallback
    if (timeframe === '7D' && sparklineData && sparklineData.length > 0) {
      try {
        const now = Date.now();
        const interval = (7 * 24 * 60 * 60 * 1000) / sparklineData.length;
        
        const data = sparklineData.map((price, index) => {
          const timestamp = now - (sparklineData.length - index) * interval;
          return {
            time: new Date(timestamp).toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: index % 24 === 0 ? '2-digit' : undefined,
            }),
            price: price,
            timestamp,
          };
        });

        setChartData(data);
        
        if (data.length > 0) {
          const firstPrice = data[0].price;
          const lastPrice = data[data.length - 1].price;
          const change = lastPrice - firstPrice;
          const changePercent = (change / firstPrice) * 100;
          
          setPriceInfo({
            current: lastPrice,
            change,
            changePercent,
          });
        }
        
        setLoading(false);
        return;
      } catch (err) {
        console.error('Sparkline data error:', err);
      }
    }

    // Fetch from API
    try {
      const timeframeConfig: Record<Timeframe, { days: number; interval: string; filterHours?: number }> = {
        '1H': { days: 1, interval: 'hourly', filterHours: 1 },
        '4H': { days: 1, interval: 'hourly', filterHours: 4 },
        '1D': { days: 1, interval: 'hourly' },
        '7D': { days: 7, interval: 'hourly' },
      };

      const config = timeframeConfig[timeframe];
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${config.days}&interval=${config.interval}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const apiData = await response.json();

      if (apiData.prices && apiData.prices.length > 0) {
        let prices = apiData.prices;

        // Filter by time window if needed
        if (config.filterHours) {
          const cutoffTime = Date.now() - (config.filterHours * 60 * 60 * 1000);
          prices = prices.filter(([timestamp]: [number, number]) => timestamp >= cutoffTime);
        }

        const formattedData = prices.map(([timestamp, price]: [number, number]) => ({
          time: new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: timeframe === '1H' || timeframe === '4H' ? '2-digit' : undefined,
            minute: timeframe === '1H' ? '2-digit' : undefined,
          }),
          price: price,
          timestamp,
        }));

        setChartData(formattedData);

        if (formattedData.length > 0) {
          const firstPrice = formattedData[0].price;
          const lastPrice = formattedData[formattedData.length - 1].price;
          const change = lastPrice - firstPrice;
          const changePercent = (change / firstPrice) * 100;

          setPriceInfo({
            current: lastPrice,
            change,
            changePercent,
          });
        }

        setError(null);
      } else {
        throw new Error('No data available');
      }
    } catch (err) {
      console.error('Chart data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Fallback to sparkline for 7D
      if (timeframe === '7D' && sparklineData) {
        const now = Date.now();
        const interval = (7 * 24 * 60 * 60 * 1000) / sparklineData.length;
        
        const data = sparklineData.map((price, index) => ({
          time: new Date(now - (sparklineData.length - index) * interval).toLocaleDateString(),
          price: price,
        }));
        
        setChartData(data);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(6)}`;
    if (price < 10) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const isPositive = priceInfo.changePercent >= 0;
  const timeframes: Timeframe[] = ['1H', '4H', '1D', '7D'];

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">
                {symbol.toUpperCase()}/USD
              </h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(priceInfo.current)}
              </span>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {isPositive ? '+' : ''}
                  {priceInfo.changePercent.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  ({isPositive ? '+' : ''}
                  {formatPrice(Math.abs(priceInfo.change))})
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-1">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                size="sm"
                variant={timeframe === tf ? 'default' : 'ghost'}
                onClick={() => setTimeframe(tf)}
                className="h-7 px-2.5 text-xs font-medium"
                disabled={loading}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {error ? (
        <div
          className="w-full flex items-center justify-center bg-background/50 rounded-lg border border-dashed border-border/50"
          style={{ height: `${height}px` }}
        >
          <div className="text-center p-6">
            <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Chart Temporarily Unavailable</p>
            <p className="text-xs text-muted-foreground">
              {error.includes('429') ? 'Rate limit reached. Try again in a moment.' : error}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`color-${isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)'}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="rgba(255, 255, 255, 0.3)"
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.3)"
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => formatPrice(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}
                itemStyle={{ color: isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)' }}
                formatter={(value: any) => [formatPrice(value), 'Price']}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)'}
                strokeWidth={2}
                fill={`url(#color-${isPositive ? 'up' : 'down'})`}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default PriceChart;

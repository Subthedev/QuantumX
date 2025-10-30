/**
 * Funding Rate Chart Component
 * Shows historical funding rates with price correlation
 */

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HistoricalChartData } from '@/services/historicalDataService';

interface FundingRateChartProps {
  fundingRateData: HistoricalChartData[];
  priceData?: HistoricalChartData[];
  symbol?: string;
  height?: number;
  showPrice?: boolean;
}

export const FundingRateChart = ({
  fundingRateData,
  priceData,
  symbol,
  height = 350,
  showPrice = true
}: FundingRateChartProps) => {
  const chartData = useMemo(() => {
    if (!fundingRateData || fundingRateData.length === 0) return [];

    // Combine funding rate and price data
    const combined = fundingRateData.map(fr => {
      const pricePoint = priceData?.find(p =>
        Math.abs(p.timestamp - fr.timestamp) < 60000 // Within 1 minute
      );

      return {
        timestamp: fr.timestamp,
        date: new Date(fr.timestamp).toLocaleDateString(),
        time: new Date(fr.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        fundingRate: fr.value,
        price: pricePoint?.value || null
      };
    });

    return combined;
  }, [fundingRateData, priceData]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { avg: 0, min: 0, max: 0, current: 0, trend: 'stable' as const };
    }

    const rates = chartData.map(d => d.fundingRate);
    const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const current = rates[rates.length - 1];

    // Determine trend
    const recentRates = rates.slice(-5);
    const olderRates = rates.slice(-10, -5);
    const recentAvg = recentRates.reduce((sum, r) => sum + r, 0) / recentRates.length;
    const olderAvg = olderRates.reduce((sum, r) => sum + r, 0) / olderRates.length;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.001) trend = 'increasing';
    else if (recentAvg < olderAvg - 0.001) trend = 'decreasing';

    return { avg, min, max, current, trend };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold mb-2">{data.date} {data.time}</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Funding Rate:</span>
            <span className={`font-medium ${data.fundingRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {data.fundingRate >= 0 ? '+' : ''}{data.fundingRate.toFixed(4)}%
            </span>
          </div>
          {showPrice && data.price && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">${data.price.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Funding Rate History</CardTitle>
        </CardHeader>
        <CardContent className={`h-[${height}px] flex items-center justify-center`}>
          <p className="text-sm text-muted-foreground">No historical data available</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendColor = () => {
    if (stats.trend === 'increasing') return 'text-green-500';
    if (stats.trend === 'decreasing') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getTrendIcon = () => {
    if (stats.trend === 'increasing') return '📈';
    if (stats.trend === 'decreasing') return '📉';
    return '➡️';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Funding Rate History {symbol && `- ${symbol}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getTrendColor()}>
              {getTrendIcon()} {stats.trend}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Avg: {stats.avg.toFixed(4)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Current</div>
            <div className={`text-sm font-bold ${stats.current >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.current >= 0 ? '+' : ''}{stats.current.toFixed(4)}%
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Average</div>
            <div className="text-sm font-bold">{stats.avg.toFixed(4)}%</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="text-xs text-muted-foreground">Max</div>
            <div className="text-sm font-bold text-green-500">+{stats.max.toFixed(4)}%</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <div className="text-xs text-muted-foreground">Min</div>
            <div className="text-sm font-bold text-red-500">{stats.min.toFixed(4)}%</div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              interval="preserveStartEnd"
            />

            <YAxis
              yAxisId="funding"
              tickFormatter={(value) => `${value.toFixed(3)}%`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              label={{
                value: 'Funding Rate %',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
              }}
            />

            {showPrice && priceData && priceData.length > 0 && (
              <YAxis
                yAxisId="price"
                orientation="right"
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                label={{
                  value: 'Price',
                  angle: 90,
                  position: 'insideRight',
                  style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="line"
            />

            {/* Zero line */}
            <ReferenceLine
              yAxisId="funding"
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* Funding rate line */}
            <Line
              yAxisId="funding"
              type="monotone"
              dataKey="fundingRate"
              name="Funding Rate %"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />

            {/* Price line (if available) */}
            {showPrice && priceData && priceData.length > 0 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                name="Price $"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

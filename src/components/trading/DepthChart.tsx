/**
 * Depth Chart Component
 * Visualizes cumulative order book volume as area chart
 * Shows buy walls (green) and sell walls (red)
 */

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderBookLevel } from '@/services/exchanges/types';

interface DepthChartProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice?: number;
  symbol?: string;
  height?: number;
}

export const DepthChart = ({ bids, asks, midPrice, symbol, height = 400 }: DepthChartProps) => {
  const depthData = useMemo(() => {
    // Prepare bid data (reverse order for left-to-right display)
    const bidData = [...bids]
      .reverse()
      .map((bid, index) => ({
        price: bid.price,
        bidVolume: bid.total,
        askVolume: 0,
        side: 'bid'
      }));

    // Prepare ask data
    const askData = asks.map((ask) => ({
      price: ask.price,
      bidVolume: bids[0]?.total || 0, // Keep bid volume at last level
      askVolume: ask.total,
      side: 'ask'
    }));

    // Combine and sort by price
    return [...bidData, ...askData].sort((a, b) => a.price - b.price);
  }, [bids, asks]);

  const priceRange = useMemo(() => {
    if (depthData.length === 0) return { min: 0, max: 0, mid: 0 };

    const prices = depthData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const mid = midPrice || (min + max) / 2;

    return { min, max, mid };
  }, [depthData, midPrice]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(2)}k`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}k`;
    if (volume >= 1) return volume.toFixed(2);
    return volume.toFixed(4);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const isBid = data.side === 'bid';

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="font-semibold text-sm mb-2">
          {isBid ? '🟢 Buy Orders' : '🔴 Sell Orders'}
        </div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-medium">{formatPrice(data.price)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-medium">
              {formatVolume(isBid ? data.bidVolume : data.askVolume)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (depthData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Market Depth</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No depth data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Market Depth {symbol && `- ${symbol}`}</span>
          <div className="flex items-center gap-3 text-xs font-normal">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded"></div>
              <span className="text-muted-foreground">Bids</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500/20 border border-red-500 rounded"></div>
              <span className="text-muted-foreground">Asks</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={depthData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />

            <XAxis
              dataKey="price"
              type="number"
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={formatPrice}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
            />

            <YAxis
              tickFormatter={formatVolume}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              label={{
                value: 'Cumulative Volume',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Mid price line */}
            {midPrice && (
              <ReferenceLine
                x={midPrice}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Mid: ${formatPrice(midPrice)}`,
                  position: 'top',
                  fill: 'hsl(var(--primary))',
                  fontSize: 11,
                  fontWeight: 'bold'
                }}
              />
            )}

            {/* Bid area (green, left side) */}
            <Area
              type="stepAfter"
              dataKey="bidVolume"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#bidGradient)"
              isAnimationActive={true}
              animationDuration={500}
            />

            {/* Ask area (red, right side) */}
            <Area
              type="stepBefore"
              dataKey="askVolume"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#askGradient)"
              isAnimationActive={true}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

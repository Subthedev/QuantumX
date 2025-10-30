/**
 * Enhanced Depth Chart Component
 * Advanced depth chart with liquidity zones, support/resistance levels, and actionable insights
 * Production-grade visualization for professional traders
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OrderBookLevel } from '@/services/exchanges/types';
import { Target, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';

interface EnhancedDepthChartProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice?: number;
  symbol?: string;
  height?: number;
}

interface LiquidityZone {
  startPrice: number;
  endPrice: number;
  volume: number;
  side: 'bid' | 'ask';
  strength: 'low' | 'medium' | 'high' | 'extreme';
  type: 'support' | 'resistance' | 'absorption';
}

interface SupportResistanceLevel {
  price: number;
  volume: number;
  type: 'support' | 'resistance';
  strength: number; // 0-100
  confidence: number; // 0-100
}

export const EnhancedDepthChart = ({
  bids,
  asks,
  midPrice,
  symbol,
  height = 450
}: EnhancedDepthChartProps) => {
  // Prepare depth data
  const depthData = useMemo(() => {
    const bidData = [...bids]
      .reverse()
      .map((bid) => ({
        price: bid.price,
        bidVolume: bid.total,
        askVolume: 0,
        bidQuantity: bid.quantity,
        askQuantity: 0,
        side: 'bid'
      }));

    const askData = asks.map((ask) => ({
      price: ask.price,
      bidVolume: bids[0]?.total || 0,
      askVolume: ask.total,
      bidQuantity: 0,
      askQuantity: ask.quantity,
      side: 'ask'
    }));

    return [...bidData, ...askData].sort((a, b) => a.price - b.price);
  }, [bids, asks]);

  // Detect liquidity zones (large order clusters)
  const liquidityZones = useMemo((): LiquidityZone[] => {
    const zones: LiquidityZone[] = [];

    // Calculate average volume for threshold
    const avgBidVolume = bids.reduce((sum, b) => sum + b.quantity, 0) / bids.length;
    const avgAskVolume = asks.reduce((sum, a) => sum + a.quantity, 0) / asks.length;

    // Detect bid zones (support)
    for (let i = 0; i < bids.length - 2; i++) {
      const current = bids[i];
      const next = bids[i + 1];
      const afterNext = bids[i + 2];

      // Check if there's a cluster of large orders
      if (
        current.quantity > avgBidVolume * 2 &&
        (next.quantity > avgBidVolume * 1.5 || afterNext.quantity > avgBidVolume * 1.5)
      ) {
        const totalVolume = current.quantity + next.quantity + afterNext.quantity;
        const strength =
          totalVolume > avgBidVolume * 10 ? 'extreme' :
          totalVolume > avgBidVolume * 6 ? 'high' :
          totalVolume > avgBidVolume * 4 ? 'medium' : 'low';

        zones.push({
          startPrice: afterNext.price,
          endPrice: current.price,
          volume: totalVolume,
          side: 'bid',
          strength,
          type: 'support'
        });
      }
    }

    // Detect ask zones (resistance)
    for (let i = 0; i < asks.length - 2; i++) {
      const current = asks[i];
      const next = asks[i + 1];
      const afterNext = asks[i + 2];

      if (
        current.quantity > avgAskVolume * 2 &&
        (next.quantity > avgAskVolume * 1.5 || afterNext.quantity > avgAskVolume * 1.5)
      ) {
        const totalVolume = current.quantity + next.quantity + afterNext.quantity;
        const strength =
          totalVolume > avgAskVolume * 10 ? 'extreme' :
          totalVolume > avgAskVolume * 6 ? 'high' :
          totalVolume > avgAskVolume * 4 ? 'medium' : 'low';

        zones.push({
          startPrice: current.price,
          endPrice: afterNext.price,
          volume: totalVolume,
          side: 'ask',
          strength,
          type: 'resistance'
        });
      }
    }

    return zones;
  }, [bids, asks]);

  // Identify key support and resistance levels
  const keyLevels = useMemo((): SupportResistanceLevel[] => {
    const levels: SupportResistanceLevel[] = [];

    // Find strongest support levels from bids
    const sortedBids = [...bids].sort((a, b) => b.quantity - a.quantity);
    sortedBids.slice(0, 3).forEach((bid, index) => {
      const strength = 100 - (index * 20);
      const confidence = Math.min((bid.quantity / sortedBids[0].quantity) * 100, 100);

      levels.push({
        price: bid.price,
        volume: bid.quantity,
        type: 'support',
        strength,
        confidence
      });
    });

    // Find strongest resistance levels from asks
    const sortedAsks = [...asks].sort((a, b) => b.quantity - a.quantity);
    sortedAsks.slice(0, 3).forEach((ask, index) => {
      const strength = 100 - (index * 20);
      const confidence = Math.min((ask.quantity / sortedAsks[0].quantity) * 100, 100);

      levels.push({
        price: ask.price,
        volume: ask.quantity,
        type: 'resistance',
        strength,
        confidence
      });
    });

    return levels.sort((a, b) => b.strength - a.strength);
  }, [bids, asks]);

  const priceRange = useMemo(() => {
    if (depthData.length === 0) return { min: 0, max: 0, mid: 0 };

    const prices = depthData.map((d) => d.price);
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
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}k`;
    if (volume >= 1) return volume.toFixed(2);
    return volume.toFixed(4);
  };

  const getZoneColor = (zone: LiquidityZone) => {
    if (zone.side === 'bid') {
      return zone.strength === 'extreme' ? 'rgba(34, 197, 94, 0.3)' :
             zone.strength === 'high' ? 'rgba(34, 197, 94, 0.2)' :
             'rgba(34, 197, 94, 0.1)';
    } else {
      return zone.strength === 'extreme' ? 'rgba(239, 68, 68, 0.3)' :
             zone.strength === 'high' ? 'rgba(239, 68, 68, 0.2)' :
             'rgba(239, 68, 68, 0.1)';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const isBid = data.side === 'bid';
    const quantity = isBid ? data.bidQuantity : data.askQuantity;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
        <div className="font-semibold text-sm mb-2 flex items-center gap-2">
          {isBid ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Buy Wall</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-red-500">Sell Wall</span>
            </>
          )}
        </div>
        <div className="text-xs space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-medium font-mono">{formatPrice(data.price)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Level Volume:</span>
            <span className="font-medium font-mono">{formatVolume(quantity)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cumulative:</span>
            <span className="font-medium font-mono">
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
          <CardTitle className="text-sm">Enhanced Market Depth</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No depth data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Enhanced Market Depth {symbol && `- ${symbol}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {liquidityZones.length} Zones
            </Badge>
            <Badge variant="outline" className="text-xs">
              {keyLevels.length} Key Levels
            </Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500/30 rounded"></div>
            <span className="text-muted-foreground">Support Zones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500/30 rounded"></div>
            <span className="text-muted-foreground">Resistance Zones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary"></div>
            <span className="text-muted-foreground">Key Levels</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={depthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
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

            {/* Liquidity Zones */}
            {liquidityZones.map((zone, index) => (
              <ReferenceArea
                key={`zone-${index}`}
                x1={zone.startPrice}
                x2={zone.endPrice}
                fill={getZoneColor(zone)}
                fillOpacity={0.8}
                stroke={zone.side === 'bid' ? '#22c55e' : '#ef4444'}
                strokeWidth={zone.strength === 'extreme' ? 2 : 1}
                strokeDasharray={zone.strength === 'extreme' ? '0' : '5 5'}
              />
            ))}

            {/* Key Support/Resistance Levels */}
            {keyLevels.slice(0, 6).map((level, index) => (
              <ReferenceLine
                key={`level-${index}`}
                x={level.price}
                stroke={level.type === 'support' ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `${level.type === 'support' ? 'S' : 'R'}${index + 1}`,
                  position: 'top',
                  fill: level.type === 'support' ? '#22c55e' : '#ef4444',
                  fontSize: 10,
                  fontWeight: 'bold'
                }}
              />
            ))}

            {/* Mid price line */}
            {midPrice && (
              <ReferenceLine
                x={midPrice}
                stroke="hsl(var(--primary))"
                strokeWidth={3}
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

            {/* Bid area */}
            <Area
              type="stepAfter"
              dataKey="bidVolume"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#bidGradient)"
              isAnimationActive={true}
              animationDuration={500}
            />

            {/* Ask area */}
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

        {/* Insights Section */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Key Trading Zones:</div>

          <div className="grid gap-2">
            {/* Support Zones */}
            {liquidityZones
              .filter((z) => z.side === 'bid' && z.strength !== 'low')
              .slice(0, 2)
              .map((zone, index) => (
                <div
                  key={`support-${index}`}
                  className="flex items-start gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20"
                >
                  <ShieldAlert className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {zone.strength.toUpperCase()} Support Zone
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      ${formatPrice(zone.startPrice)} - ${formatPrice(zone.endPrice)} •{' '}
                      {formatVolume(zone.volume)} volume • Strong buying interest
                    </div>
                  </div>
                </div>
              ))}

            {/* Resistance Zones */}
            {liquidityZones
              .filter((z) => z.side === 'ask' && z.strength !== 'low')
              .slice(0, 2)
              .map((zone, index) => (
                <div
                  key={`resistance-${index}`}
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      {zone.strength.toUpperCase()} Resistance Zone
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      ${formatPrice(zone.startPrice)} - ${formatPrice(zone.endPrice)} •{' '}
                      {formatVolume(zone.volume)} volume • Strong selling pressure
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

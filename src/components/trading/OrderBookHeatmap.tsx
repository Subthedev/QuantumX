/**
 * Order Book Heatmap Component
 * Real-time heatmap visualization of order book depth and liquidity concentration
 * Shows where large orders are clustered and potential support/resistance zones
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OrderBookLevel } from '@/services/orderBookService';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface OrderBookHeatmapProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice: number;
  symbol: string;
  height?: number;
}

interface HeatmapCell {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
  intensity: number; // 0-100
  percentage: number; // Of total volume
  cumulative: number;
  isLiquidityZone: boolean; // Large order cluster
}

export const OrderBookHeatmap = ({
  bids,
  asks,
  midPrice,
  symbol,
  height = 600
}: OrderBookHeatmapProps) => {
  const heatmapData = useMemo(() => {
    const cells: HeatmapCell[] = [];

    // Safety check: ensure bids and asks are arrays
    const safeBids = Array.isArray(bids) ? bids : [];
    const safeAsks = Array.isArray(asks) ? asks : [];

    if (safeBids.length === 0 || safeAsks.length === 0) {
      return cells;
    }

    // Calculate total volumes
    const totalBidVolume = safeBids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = safeAsks.reduce((sum, ask) => sum + ask.quantity, 0);
    const totalVolume = totalBidVolume + totalAskVolume;

    // Calculate average volume for liquidity zone detection
    const avgVolume = totalVolume / (safeBids.length + safeAsks.length);
    const liquidityThreshold = avgVolume * 2.5;

    // Process asks (reversed to show from mid price upward)
    safeAsks.slice(0, 30).reverse().forEach((ask, index) => {
      const intensity = Math.min((ask.quantity / totalAskVolume) * 100, 100);
      const isLiquidityZone = ask.quantity > liquidityThreshold;

      cells.push({
        price: ask.price,
        volume: ask.quantity,
        side: 'ask',
        intensity,
        percentage: (ask.quantity / totalVolume) * 100,
        cumulative: ask.total,
        isLiquidityZone
      });
    });

    // Process bids (from mid price downward)
    safeBids.slice(0, 30).forEach((bid, index) => {
      const intensity = Math.min((bid.quantity / totalBidVolume) * 100, 100);
      const isLiquidityZone = bid.quantity > liquidityThreshold;

      cells.push({
        price: bid.price,
        volume: bid.quantity,
        side: 'bid',
        intensity,
        percentage: (bid.quantity / totalVolume) * 100,
        cumulative: bid.total,
        isLiquidityZone
      });
    });

    return cells;
  }, [bids, asks, midPrice]);

  // Find major liquidity zones
  const liquidityZones = useMemo(() => {
    return heatmapData.filter(cell => cell.isLiquidityZone);
  }, [heatmapData]);

  // Calculate price spread for color mapping
  const priceRange = useMemo(() => {
    const prices = heatmapData.map(cell => cell.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      spread: Math.max(...prices) - Math.min(...prices)
    };
  }, [heatmapData]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) return volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (volume >= 1) return volume.toFixed(2);
    return volume.toFixed(4);
  };

  const getIntensityColor = (intensity: number, side: 'bid' | 'ask') => {
    const baseColor = side === 'bid' ? 'green' : 'red';
    const opacity = Math.max(0.1, intensity / 100);

    if (intensity > 80) return side === 'bid' ? 'bg-green-600' : 'bg-red-600';
    if (intensity > 60) return side === 'bid' ? 'bg-green-500' : 'bg-red-500';
    if (intensity > 40) return side === 'bid' ? 'bg-green-400' : 'bg-red-400';
    if (intensity > 20) return side === 'bid' ? 'bg-green-300' : 'bg-red-300';
    return side === 'bid' ? 'bg-green-200' : 'bg-red-200';
  };

  const getIntensityStyle = (intensity: number, side: 'bid' | 'ask') => {
    const opacity = Math.max(0.1, Math.min(intensity / 100, 1));
    const color = side === 'bid' ? '34, 197, 94' : '239, 68, 68'; // green-500 / red-500
    return {
      backgroundColor: `rgba(${color}, ${opacity})`,
      borderLeft: intensity > 70 ? `3px solid rgba(${color}, 1)` : 'none'
    };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Order Book Heatmap</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {liquidityZones.length} Liquidity Zones
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Darker colors indicate higher volume concentration. Liquidity zones marked with left border.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Legend */}
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-muted-foreground">Ask Walls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-muted-foreground">Bid Walls</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            Intensity: Light → Dark = Low → High Volume
          </div>
        </div>

        {/* Heatmap */}
        <div className="relative" style={{ height: `${height}px`, overflowY: 'auto' }}>
          {heatmapData.map((cell, index) => {
            const isMidPrice = Math.abs(cell.price - midPrice) < midPrice * 0.0001;
            const priceDistance = ((cell.price - midPrice) / midPrice) * 100;

            return (
              <div key={index} className="relative group">
                {/* Mid Price Indicator */}
                {isMidPrice && (
                  <div className="sticky top-0 z-20 bg-primary/20 border-y-2 border-primary px-4 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">MID PRICE</span>
                      <span className="text-sm font-bold">${formatPrice(midPrice)}</span>
                    </div>
                  </div>
                )}

                {/* Heatmap Row */}
                <div
                  className="relative px-4 py-1 transition-all cursor-pointer hover:z-10"
                  style={getIntensityStyle(cell.intensity, cell.side)}
                >
                  {/* Volume Bar Background */}
                  <div
                    className={`absolute inset-0 ${cell.side === 'bid' ? 'bg-green-500/5' : 'bg-red-500/5'}`}
                    style={{ width: `${cell.percentage * 10}%` }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {/* Price */}
                      <span className={`font-mono font-medium w-24 ${
                        cell.side === 'bid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${formatPrice(cell.price)}
                      </span>

                      {/* Distance from mid */}
                      <span className="text-muted-foreground text-[10px] w-16">
                        {priceDistance >= 0 ? '+' : ''}{priceDistance.toFixed(2)}%
                      </span>

                      {/* Liquidity Zone Badge */}
                      {cell.isLiquidityZone && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                          WALL
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Volume */}
                      <span className="font-mono w-24 text-right">
                        {formatVolume(cell.volume)}
                      </span>

                      {/* Percentage */}
                      <span className="text-muted-foreground w-12 text-right">
                        {cell.percentage.toFixed(1)}%
                      </span>

                      {/* Side Indicator */}
                      {cell.side === 'bid' ? (
                        <TrendingDown className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingUp className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Hover Tooltip */}
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-30 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px]">
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-mono">${formatPrice(cell.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volume:</span>
                        <span className="font-mono">{formatVolume(cell.volume)} {symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cumulative:</span>
                        <span className="font-mono">{formatVolume(cell.cumulative)} {symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">% of Total:</span>
                        <span>{cell.percentage.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Intensity:</span>
                        <span>{cell.intensity.toFixed(0)}%</span>
                      </div>
                      {cell.isLiquidityZone && (
                        <div className="pt-1 border-t border-border">
                          <Badge variant="secondary" className="text-[10px]">
                            High Liquidity Zone - Potential {cell.side === 'bid' ? 'Support' : 'Resistance'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Statistics */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">Ask Liquidity Zones</div>
              <div className="font-semibold text-red-500">
                {liquidityZones.filter(z => z.side === 'ask').length} zones
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Bid Liquidity Zones</div>
              <div className="font-semibold text-green-500">
                {liquidityZones.filter(z => z.side === 'bid').length} zones
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Strongest Ask Wall</div>
              <div className="font-semibold text-red-500">
                {liquidityZones.filter(z => z.side === 'ask').length > 0
                  ? `$${formatPrice(liquidityZones.filter(z => z.side === 'ask').sort((a, b) => b.volume - a.volume)[0]?.price || 0)}`
                  : 'None'
                }
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Strongest Bid Wall</div>
              <div className="font-semibold text-green-500">
                {liquidityZones.filter(z => z.side === 'bid').length > 0
                  ? `$${formatPrice(liquidityZones.filter(z => z.side === 'bid').sort((a, b) => b.volume - a.volume)[0]?.price || 0)}`
                  : 'None'
                }
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

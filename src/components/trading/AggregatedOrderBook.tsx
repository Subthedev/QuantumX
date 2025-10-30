/**
 * Aggregated Multi-Exchange Order Book Component
 * Combines order books from multiple exchanges with VWAP calculation
 * Shows best execution prices and liquidity across venues
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { exchangeManager } from '@/services/exchanges/ExchangeManager';
import type { OrderBookData } from '@/services/orderBookService';
import { ArrowUpDown, TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';

interface AggregatedOrderBookProps {
  symbol: string;
  exchanges?: string[]; // If not provided, uses all available
}

interface AggregatedLevel {
  price: number;
  totalVolume: number;
  exchanges: {
    exchangeId: string;
    exchangeName: string;
    volume: number;
    percentage: number;
  }[];
  vwap: number; // Volume-weighted average price up to this level
  cumulativeVolume: number;
  side: 'bid' | 'ask';
}

interface VWAPMetrics {
  bidVWAP: number; // Best VWAP for buying
  askVWAP: number; // Best VWAP for selling
  spread: number;
  spreadPercent: number;
  bestBid: { price: number; exchange: string };
  bestAsk: { price: number; exchange: string };
  totalLiquidity: number;
}

export const AggregatedOrderBook = ({ symbol, exchanges }: AggregatedOrderBookProps) => {
  const [orderBooks, setOrderBooks] = useState<Map<string, OrderBookData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const fetchOrderBooks = async () => {
    try {
      setLoading(true);
      const comparison = await exchangeManager.compareOrderBooks(symbol, exchanges);

      const bookMap = new Map<string, OrderBookData>();
      comparison.exchanges.forEach(ex => {
        if (ex.available && ex.orderBook) {
          bookMap.set(ex.exchangeId, ex.orderBook);
        }
      });

      setOrderBooks(bookMap);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Failed to fetch aggregated order books:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBooks();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchOrderBooks, 5000);
    return () => clearInterval(interval);
  }, [symbol, exchanges]);

  // Aggregate bids from all exchanges
  const aggregatedBids = useMemo(() => {
    const priceMap = new Map<number, AggregatedLevel>();

    orderBooks.forEach((book, exchangeId) => {
      // Safety check: ensure bids is an array
      const safeBids = Array.isArray(book?.bids) ? book.bids : [];
      safeBids.slice(0, 20).forEach(bid => {
        const key = Math.round(bid.price * 100) / 100; // Group by price (2 decimal precision)

        if (!priceMap.has(key)) {
          priceMap.set(key, {
            price: key,
            totalVolume: 0,
            exchanges: [],
            vwap: 0,
            cumulativeVolume: 0,
            side: 'bid'
          });
        }

        const level = priceMap.get(key)!;
        level.totalVolume += bid.quantity;
        level.exchanges.push({
          exchangeId,
          exchangeName: exchangeManager.getExchangeName(exchangeId),
          volume: bid.quantity,
          percentage: 0 // Will calculate after aggregation
        });
      });
    });

    // Convert to array and sort by price (descending for bids)
    const levels = Array.from(priceMap.values()).sort((a, b) => b.price - a.price);

    // Calculate percentages and cumulative volumes
    let cumulative = 0;
    let cumulativeValue = 0;

    levels.forEach(level => {
      cumulative += level.totalVolume;
      cumulativeValue += level.price * level.totalVolume;
      level.cumulativeVolume = cumulative;
      level.vwap = cumulativeValue / cumulative;

      // Calculate exchange percentages
      level.exchanges.forEach(ex => {
        ex.percentage = (ex.volume / level.totalVolume) * 100;
      });

      // Sort exchanges by volume
      level.exchanges.sort((a, b) => b.volume - a.volume);
    });

    return levels.slice(0, 15);
  }, [orderBooks]);

  // Aggregate asks from all exchanges
  const aggregatedAsks = useMemo(() => {
    const priceMap = new Map<number, AggregatedLevel>();

    orderBooks.forEach((book, exchangeId) => {
      // Safety check: ensure asks is an array
      const safeAsks = Array.isArray(book?.asks) ? book.asks : [];
      safeAsks.slice(0, 20).forEach(ask => {
        const key = Math.round(ask.price * 100) / 100; // Group by price (2 decimal precision)

        if (!priceMap.has(key)) {
          priceMap.set(key, {
            price: key,
            totalVolume: 0,
            exchanges: [],
            vwap: 0,
            cumulativeVolume: 0,
            side: 'ask'
          });
        }

        const level = priceMap.get(key)!;
        level.totalVolume += ask.quantity;
        level.exchanges.push({
          exchangeId,
          exchangeName: exchangeManager.getExchangeName(exchangeId),
          volume: ask.quantity,
          percentage: 0
        });
      });
    });

    // Convert to array and sort by price (ascending for asks)
    const levels = Array.from(priceMap.values()).sort((a, b) => a.price - b.price);

    // Calculate percentages and cumulative volumes
    let cumulative = 0;
    let cumulativeValue = 0;

    levels.forEach(level => {
      cumulative += level.totalVolume;
      cumulativeValue += level.price * level.totalVolume;
      level.cumulativeVolume = cumulative;
      level.vwap = cumulativeValue / cumulative;

      // Calculate exchange percentages
      level.exchanges.forEach(ex => {
        ex.percentage = (ex.volume / level.totalVolume) * 100;
      });

      // Sort exchanges by volume
      level.exchanges.sort((a, b) => b.volume - a.volume);
    });

    return levels.slice(0, 15);
  }, [orderBooks]);

  // Calculate VWAP metrics
  const vwapMetrics = useMemo((): VWAPMetrics | null => {
    if (aggregatedBids.length === 0 || aggregatedAsks.length === 0) return null;

    const bestBid = aggregatedBids[0];
    const bestAsk = aggregatedAsks[0];

    const spread = bestAsk.price - bestBid.price;
    const midPrice = (bestBid.price + bestAsk.price) / 2;
    const spreadPercent = (spread / midPrice) * 100;

    // VWAP for market orders (using cumulative VWAP of top levels)
    const bidVWAP = aggregatedBids[Math.min(4, aggregatedBids.length - 1)].vwap;
    const askVWAP = aggregatedAsks[Math.min(4, aggregatedAsks.length - 1)].vwap;

    const totalLiquidity =
      aggregatedBids.reduce((sum, level) => sum + level.totalVolume, 0) +
      aggregatedAsks.reduce((sum, level) => sum + level.totalVolume, 0);

    return {
      bidVWAP,
      askVWAP,
      spread,
      spreadPercent,
      bestBid: {
        price: bestBid.price,
        exchange: bestBid.exchanges[0]?.exchangeName || 'Unknown'
      },
      bestAsk: {
        price: bestAsk.price,
        exchange: bestAsk.exchanges[0]?.exchangeName || 'Unknown'
      },
      totalLiquidity
    };
  }, [aggregatedBids, aggregatedAsks]);

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

  const getExchangeBadgeColor = (exchangeId: string) => {
    const colors: Record<string, string> = {
      binance: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      coinbase: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      bybit: 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
    };
    return colors[exchangeId] || 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
  };

  if (loading && orderBooks.size === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Aggregated Order Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Aggregated Order Book</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {orderBooks.size} Exchanges
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOrderBooks}
              disabled={loading}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* VWAP Metrics */}
        {vwapMetrics && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-green-500/10 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground mb-0.5">Buy VWAP</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                ${formatPrice(vwapMetrics.bidVWAP)}
              </div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground mb-0.5">Sell VWAP</div>
              <div className="text-sm font-bold text-red-600 dark:text-red-400">
                ${formatPrice(vwapMetrics.askVWAP)}
              </div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground mb-0.5">Spread</div>
              <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                {vwapMetrics.spreadPercent.toFixed(3)}%
              </div>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground mb-0.5">Liquidity</div>
              <div className="text-sm font-bold text-primary">
                {formatVolume(vwapMetrics.totalLiquidity)}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid lg:grid-cols-2 divide-x divide-border">
          {/* Bids */}
          <div>
            <div className="px-4 py-2 bg-green-500/5 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  Bids
                </h3>
                {vwapMetrics && (
                  <span className="text-xs text-muted-foreground">
                    Best: ${formatPrice(vwapMetrics.bestBid.price)} ({vwapMetrics.bestBid.exchange})
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Price</th>
                    <th className="text-right py-2 px-3">Volume</th>
                    <th className="text-right py-2 px-3">VWAP</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedBids.map((level, i) => (
                    <tr key={i} className="group hover:bg-accent/50 transition-colors border-b border-border/50">
                      <td className="py-2 px-3">
                        <div className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                          ${formatPrice(level.price)}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {level.exchanges.slice(0, 3).map((ex, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-[9px] px-1 py-0 h-4 ${getExchangeBadgeColor(ex.exchangeId)}`}
                            >
                              {ex.exchangeName.substring(0, 3).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="text-right py-2 px-3">
                        <div className="font-mono text-sm">{formatVolume(level.totalVolume)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Σ {formatVolume(level.cumulativeVolume)}
                        </div>
                      </td>
                      <td className="text-right py-2 px-3">
                        <div className="font-mono text-xs text-muted-foreground">
                          ${formatPrice(level.vwap)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Asks */}
          <div>
            <div className="px-4 py-2 bg-red-500/5 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  Asks
                </h3>
                {vwapMetrics && (
                  <span className="text-xs text-muted-foreground">
                    Best: ${formatPrice(vwapMetrics.bestAsk.price)} ({vwapMetrics.bestAsk.exchange})
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Price</th>
                    <th className="text-right py-2 px-3">Volume</th>
                    <th className="text-right py-2 px-3">VWAP</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedAsks.map((level, i) => (
                    <tr key={i} className="group hover:bg-accent/50 transition-colors border-b border-border/50">
                      <td className="py-2 px-3">
                        <div className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
                          ${formatPrice(level.price)}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {level.exchanges.slice(0, 3).map((ex, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-[9px] px-1 py-0 h-4 ${getExchangeBadgeColor(ex.exchangeId)}`}
                            >
                              {ex.exchangeName.substring(0, 3).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="text-right py-2 px-3">
                        <div className="font-mono text-sm">{formatVolume(level.totalVolume)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Σ {formatVolume(level.cumulativeVolume)}
                        </div>
                      </td>
                      <td className="text-right py-2 px-3">
                        <div className="font-mono text-xs text-muted-foreground">
                          ${formatPrice(level.vwap)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Execution Insights */}
        {vwapMetrics && (
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-medium mb-1">Best Execution Strategy:</p>
                <p className="text-muted-foreground">
                  For market buys, average execution price will be around <span className="font-mono font-semibold text-foreground">${formatPrice(vwapMetrics.bidVWAP)}</span>.
                  For market sells, around <span className="font-mono font-semibold text-foreground">${formatPrice(vwapMetrics.askVWAP)}</span>.
                  Cross-exchange spread is {vwapMetrics.spreadPercent.toFixed(3)}% - consider routing orders to {vwapMetrics.bestBid.exchange} for best prices.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

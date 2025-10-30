/**
 * Order Book Page - Redesigned
 * Real-time 100ms WebSocket order book with clean, minimalistic, actionable UI
 * Binance-level performance and UX
 */

import { useState, useMemo, useEffect } from 'react';
import { useOrderBookWebSocket } from '@/hooks/useOrderBookWebSocket';
import { usePlatformMetrics } from '@/hooks/usePlatformMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowDown,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Zap,
  DollarSign,
  Users,
  AlertCircle,
  Target
} from 'lucide-react';
import { DepthChart } from '@/components/trading/DepthChart';
import { ExchangeComparison } from '@/components/trading/ExchangeComparison';

const POPULAR_PAIRS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

export default function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const { orderBook, isConnecting, isConnected, hasError, error } = useOrderBookWebSocket({
    symbol: selectedSymbol
  });
  const { metrics: platformMetrics } = usePlatformMetrics({ startTracking: true });

  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [prevMidPrice, setPrevMidPrice] = useState<number | null>(null);

  // Flash animation on price change
  useEffect(() => {
    if (orderBook?.metrics.midPrice && prevMidPrice !== null) {
      if (orderBook.metrics.midPrice > prevMidPrice) {
        setPriceFlash('up');
      } else if (orderBook.metrics.midPrice < prevMidPrice) {
        setPriceFlash('down');
      }

      const timeout = setTimeout(() => setPriceFlash(null), 500);
      return () => clearTimeout(timeout);
    }
    if (orderBook?.metrics.midPrice) {
      setPrevMidPrice(orderBook.metrics.midPrice);
    }
  }, [orderBook?.metrics.midPrice, prevMidPrice]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) return volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (volume >= 1) return volume.toFixed(4);
    return volume.toFixed(6);
  };

  const formatUSD = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const sentiment = useMemo(() => {
    if (!orderBook?.metrics) return null;
    const { buyPressure } = orderBook.metrics;

    if (buyPressure > 60) return { type: 'bullish', strength: buyPressure };
    if (buyPressure < 40) return { type: 'bearish', strength: 100 - buyPressure };
    return { type: 'neutral', strength: 50 };
  }, [orderBook?.metrics]);

  // Get actionable trade signals
  const tradeSignals = useMemo(() => {
    if (!orderBook?.metrics) return [];
    const { spreadPercent, buyPressure, sellPressure, bidAskRatio } = orderBook.metrics;

    const signals = [];

    // Signal: Tight spread
    if (spreadPercent < 0.01) {
      signals.push({
        type: 'success',
        icon: Target,
        title: 'Excellent Liquidity',
        action: 'Market orders will execute with minimal slippage',
        strength: 'high'
      });
    } else if (spreadPercent > 0.05) {
      signals.push({
        type: 'warning',
        icon: AlertCircle,
        title: 'Wide Spread Detected',
        action: 'Use limit orders to avoid high trading costs',
        strength: 'medium'
      });
    }

    // Signal: Strong buy pressure
    if (buyPressure > 65) {
      signals.push({
        type: 'bullish',
        icon: TrendingUp,
        title: 'Strong Buying Pressure',
        action: 'Consider long position or buying on dips',
        strength: 'high'
      });
    }

    // Signal: Strong sell pressure
    if (sellPressure > 65) {
      signals.push({
        type: 'bearish',
        icon: TrendingDown,
        title: 'Strong Selling Pressure',
        action: 'Consider short position or waiting for support',
        strength: 'high'
      });
    }

    // Signal: Imbalanced order book
    if (bidAskRatio > 1.5) {
      signals.push({
        type: 'info',
        icon: ArrowUp,
        title: 'Bid Wall Detected',
        action: `${((bidAskRatio - 1) * 100).toFixed(0)}% more bids than asks - potential support level`,
        strength: 'medium'
      });
    } else if (bidAskRatio < 0.67) {
      signals.push({
        type: 'info',
        icon: ArrowDown,
        title: 'Ask Wall Detected',
        action: `${((1 / bidAskRatio - 1) * 100).toFixed(0)}% more asks than bids - potential resistance`,
        strength: 'medium'
      });
    }

    return signals;
  }, [orderBook?.metrics]);

  return (
    <div className="min-h-screen bg-background py-6 pt-16 sm:pt-20 px-4 sm:px-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary" />
              Real-Time Order Book
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              100ms WebSocket updates • Binance-level performance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </span>
              <span className="text-xs font-medium">{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}</span>
            </Badge>
            {orderBook?.latency_ms && (
              <Badge variant="outline" className="text-xs">
                {orderBook.latency_ms}ms latency
              </Badge>
            )}
          </div>
        </div>

        {/* Platform-Wide Metrics */}
        {platformMetrics && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Tracked Coins
                  </div>
                  <div className="text-lg font-bold">{platformMetrics.totalCoins}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Total Volume
                  </div>
                  <div className="text-lg font-bold">{formatUSD(platformMetrics.totalVolume)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Bids</div>
                  <div className="text-lg font-bold text-green-500">{formatUSD(platformMetrics.totalBidVolume)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Asks</div>
                  <div className="text-lg font-bold text-red-500">{formatUSD(platformMetrics.totalAskVolume)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Avg Spread</div>
                  <div className="text-lg font-bold text-yellow-500">{platformMetrics.averageSpread.toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    Bullish
                  </div>
                  <div className="text-lg font-bold text-green-500">{platformMetrics.bullishCoins}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    Bearish
                  </div>
                  <div className="text-lg font-bold text-red-500">{platformMetrics.bearishCoins}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coin Selector */}
        <div className="flex flex-wrap gap-2">
          {POPULAR_PAIRS.map(symbol => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSymbol === symbol
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : 'bg-card text-foreground hover:bg-accent border border-border hover:scale-105'
              }`}
            >
              {symbol}/USDT
            </button>
          ))}
        </div>

        {/* Error Handling */}
        {hasError && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Connection Error</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error?.message || 'Failed to connect to order book stream. Retrying...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isConnecting && !orderBook && (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Connecting to Real-Time Stream...</p>
              <p className="text-sm text-muted-foreground mt-2">Establishing WebSocket connection</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {isConnected && orderBook && (
          <>
            {/* Key Metrics - Minimalistic Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Mid Price</div>
                  <div className={`text-xl font-bold transition-all duration-300 ${
                    priceFlash === 'up' ? 'text-green-500 scale-110' :
                    priceFlash === 'down' ? 'text-red-500 scale-110' :
                    'text-foreground'
                  }`}>
                    ${formatPrice(orderBook.metrics.midPrice)}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Spread</div>
                  <div className="text-xl font-bold text-yellow-500">
                    {orderBook.metrics.spreadPercent.toFixed(4)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${orderBook.metrics.spread.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Buy Pressure
                  </div>
                  <div className="text-xl font-bold text-green-500">
                    {orderBook.metrics.buyPressure.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Sell Pressure
                  </div>
                  <div className="text-xl font-bold text-red-500">
                    {orderBook.metrics.sellPressure.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Bid/Ask Ratio</div>
                  <div className="text-xl font-bold">
                    {orderBook.metrics.bidAskRatio.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                  <Badge variant={sentiment?.type === 'bullish' ? 'default' : sentiment?.type === 'bearish' ? 'destructive' : 'secondary'} className="text-sm">
                    {sentiment?.type.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Actionable Trade Signals */}
            {tradeSignals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tradeSignals.map((signal, idx) => (
                  <Card key={idx} className={`border-l-4 ${
                    signal.type === 'success' ? 'border-l-green-500 bg-green-500/5' :
                    signal.type === 'warning' ? 'border-l-yellow-500 bg-yellow-500/5' :
                    signal.type === 'bullish' ? 'border-l-green-500 bg-green-500/5' :
                    signal.type === 'bearish' ? 'border-l-red-500 bg-red-500/5' :
                    'border-l-blue-500 bg-blue-500/5'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <signal.icon className={`w-5 h-5 mt-0.5 ${
                          signal.type === 'success' ? 'text-green-500' :
                          signal.type === 'warning' ? 'text-yellow-500' :
                          signal.type === 'bullish' ? 'text-green-500' :
                          signal.type === 'bearish' ? 'text-red-500' :
                          'text-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{signal.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {signal.strength}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{signal.action}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Order Book Table - Compact & Clean */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Asks (Sell Orders) - Shown at top like Binance */}
              <Card>
                <div className="p-3 border-b border-border bg-red-500/5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-red-500">
                      <ArrowDown className="w-4 h-4" />
                      Asks (Sell)
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Volume: {formatVolume(orderBook.metrics.totalAskVolume)} {selectedSymbol}
                    </span>
                  </div>
                </div>
                <div className="h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Price</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderBook.asks.slice(0, 20).reverse().map((ask, i) => {
                        const volumePercent = (ask.quantity / orderBook.metrics.totalAskVolume) * 100;
                        return (
                          <tr key={i} className="hover:bg-accent/50 transition-colors group">
                            <td className="relative py-1.5 px-3">
                              <div
                                className="absolute inset-0 bg-red-500/10 transition-all group-hover:bg-red-500/20"
                                style={{ width: `${Math.min(volumePercent * 2, 100)}%` }}
                              />
                              <span className="relative text-red-500 font-mono text-sm font-medium">
                                {formatPrice(ask.price)}
                              </span>
                            </td>
                            <td className="relative text-right py-1.5 px-3 font-mono text-sm">
                              {formatVolume(ask.quantity)}
                            </td>
                            <td className="relative text-right py-1.5 px-3 font-mono text-sm text-muted-foreground">
                              {formatVolume(ask.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Bids (Buy Orders) */}
              <Card>
                <div className="p-3 border-b border-border bg-green-500/5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-green-500">
                      <ArrowUp className="w-4 h-4" />
                      Bids (Buy)
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Volume: {formatVolume(orderBook.metrics.totalBidVolume)} {selectedSymbol}
                    </span>
                  </div>
                </div>
                <div className="h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Price</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderBook.bids.slice(0, 20).map((bid, i) => {
                        const volumePercent = (bid.quantity / orderBook.metrics.totalBidVolume) * 100;
                        return (
                          <tr key={i} className="hover:bg-accent/50 transition-colors group">
                            <td className="relative py-1.5 px-3">
                              <div
                                className="absolute inset-0 bg-green-500/10 transition-all group-hover:bg-green-500/20"
                                style={{ width: `${Math.min(volumePercent * 2, 100)}%` }}
                              />
                              <span className="relative text-green-500 font-mono text-sm font-medium">
                                {formatPrice(bid.price)}
                              </span>
                            </td>
                            <td className="relative text-right py-1.5 px-3 font-mono text-sm">
                              {formatVolume(bid.quantity)}
                            </td>
                            <td className="relative text-right py-1.5 px-3 font-mono text-sm text-muted-foreground">
                              {formatVolume(bid.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Depth Chart and Exchange Comparison */}
            <Tabs defaultValue="depth" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="depth" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Depth Chart
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Multi-Exchange
                </TabsTrigger>
              </TabsList>

              <TabsContent value="depth" className="mt-4">
                <DepthChart
                  bids={orderBook.bids}
                  asks={orderBook.asks}
                  midPrice={orderBook.metrics.midPrice}
                  symbol={selectedSymbol}
                  height={450}
                />
              </TabsContent>

              <TabsContent value="comparison" className="mt-4">
                <ExchangeComparison
                  symbol={selectedSymbol}
                  type="orderbook"
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Loading Skeleton */}
        {isConnecting && !orderBook && !hasError && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

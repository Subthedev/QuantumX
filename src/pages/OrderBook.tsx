/**
 * Order Book Page
 * Real-time order book visualization with depth chart
 * Coinglass-inspired UI with actionable insights
 */

import { useState, useMemo } from 'react';
import { useOrderBook } from '@/hooks/useOrderBook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { aggregateOrderBook, getOrderBookSentiment } from '@/services/orderBookService';

const POPULAR_PAIRS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

export default function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const { orderBook, isLoading, isConnecting, isConnected, hasError, error } = useOrderBook({
    symbol: selectedSymbol,
    refetchInterval: 3000
  });

  const sentiment = useMemo(() => {
    if (!orderBook?.metrics) return null;
    return getOrderBookSentiment(orderBook.metrics);
  }, [orderBook?.metrics]);

  const aggregatedBids = useMemo(() => {
    if (!orderBook?.bids) return [];
    return aggregateOrderBook(orderBook.bids, 1).slice(0, 15);
  }, [orderBook?.bids]);

  const aggregatedAsks = useMemo(() => {
    if (!orderBook?.asks) return [];
    return aggregateOrderBook(orderBook.asks, 1).slice(0, 15);
  }, [orderBook?.asks]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) return volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return volume.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-background py-6 pt-16 sm:pt-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Order Book
          </h1>
          <p className="text-muted-foreground">
            Real-time market depth analysis powered by IgniteX
          </p>
        </div>

        {/* Coin Selector */}
        <div className="flex flex-wrap gap-2">
          {POPULAR_PAIRS.map(symbol => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSymbol === symbol
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-foreground hover:bg-accent border border-border'
              }`}
            >
              {symbol}/USDT
            </button>
          ))}
        </div>

        {/* Connection Status & Error Handling */}
        {hasError && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-destructive">Unable to Load Order Book</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error?.message || orderBook?.message || 'Failed to fetch order book data. Please check your connection and try again.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isConnecting && !orderBook && (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Loading Order Book...</p>
              <p className="text-sm text-muted-foreground mt-2">Fetching real-time market depth data</p>
            </CardContent>
          </Card>
        )}

        {isConnected && orderBook && (
          <>
            {/* Market Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardDescription className="text-xs">Mid Price</CardDescription>
                  <CardTitle className="text-lg sm:text-xl">{formatPrice(orderBook.metrics.midPrice)}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardDescription className="text-xs">Spread</CardDescription>
                  <CardTitle className="text-lg sm:text-xl text-yellow-500">
                    {orderBook.metrics.spreadPercent.toFixed(3)}%
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardDescription className="text-xs">Bid Volume</CardDescription>
                  <CardTitle className="text-lg sm:text-xl text-green-500">
                    {formatVolume(orderBook.metrics.totalBidVolume)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardDescription className="text-xs">Ask Volume</CardDescription>
                  <CardTitle className="text-lg sm:text-xl text-red-500">
                    {formatVolume(orderBook.metrics.totalAskVolume)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardDescription className="text-xs">Buy Pressure</CardDescription>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    {orderBook.metrics.buyPressure.toFixed(1)}%
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardDescription className="text-xs">Sentiment</CardDescription>
                  <CardTitle className="text-lg sm:text-xl">
                    <Badge variant={sentiment?.sentiment === 'bullish' ? 'default' : sentiment?.sentiment === 'bearish' ? 'destructive' : 'secondary'}>
                      {sentiment?.sentiment.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Order Book Display */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Bids (Buy Orders) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <ArrowUp className="w-5 h-5" />
                    Bids (Buyers)
                  </CardTitle>
                  <CardDescription>Top 15 buy orders</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
                      <div>Price (USDT)</div>
                      <div className="text-right">Amount ({selectedSymbol})</div>
                      <div className="text-right">Total</div>
                    </div>

                    {/* Bids */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {aggregatedBids.map((bid, i) => {
                        const volumePercent = (bid.quantity / orderBook.metrics.totalBidVolume) * 100;
                        return (
                          <div
                            key={i}
                            className="relative grid grid-cols-3 gap-2 px-4 py-2 text-sm hover:bg-accent/50 border-b border-border/50"
                          >
                            <div
                              className="absolute inset-0 bg-green-500/10"
                              style={{ width: `${volumePercent}%` }}
                            />
                            <div className="relative text-green-500 font-mono">{formatPrice(bid.price)}</div>
                            <div className="relative text-right font-mono">{formatVolume(bid.quantity)}</div>
                            <div className="relative text-right font-mono text-muted-foreground">{formatVolume(bid.total)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asks (Sell Orders) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <ArrowDown className="w-5 h-5" />
                    Asks (Sellers)
                  </CardTitle>
                  <CardDescription>Top 15 sell orders</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
                      <div>Price (USDT)</div>
                      <div className="text-right">Amount ({selectedSymbol})</div>
                      <div className="text-right">Total</div>
                    </div>

                    {/* Asks */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {aggregatedAsks.map((ask, i) => {
                        const volumePercent = (ask.quantity / orderBook.metrics.totalAskVolume) * 100;
                        return (
                          <div
                            key={i}
                            className="relative grid grid-cols-3 gap-2 px-4 py-2 text-sm hover:bg-accent/50 border-b border-border/50"
                          >
                            <div
                              className="absolute inset-0 bg-red-500/10"
                              style={{ width: `${volumePercent}%` }}
                            />
                            <div className="relative text-red-500 font-mono">{formatPrice(ask.price)}</div>
                            <div className="relative text-right font-mono">{formatVolume(ask.quantity)}</div>
                            <div className="relative text-right font-mono text-muted-foreground">{formatVolume(ask.total)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actionable Insights */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                  {sentiment?.sentiment === 'bullish' ? (
                    <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : sentiment?.sentiment === 'bearish' ? (
                    <TrendingDown className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Activity className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {sentiment?.sentiment === 'bullish' && 'Strong Buying Pressure Detected'}
                      {sentiment?.sentiment === 'bearish' && 'Strong Selling Pressure Detected'}
                      {sentiment?.sentiment === 'neutral' && 'Balanced Market Conditions'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sentiment?.sentiment === 'bullish' && 
                        `Buy orders dominate with ${orderBook.metrics.buyPressure.toFixed(1)}% pressure. Market showing bullish momentum.`}
                      {sentiment?.sentiment === 'bearish' && 
                        `Sell orders dominate with ${orderBook.metrics.sellPressure.toFixed(1)}% pressure. Market showing bearish momentum.`}
                      {sentiment?.sentiment === 'neutral' && 
                        'Order book is balanced between buyers and sellers. Market in equilibrium.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                  <Activity className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Spread Analysis</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {orderBook.metrics.spreadPercent < 0.01 ? 
                        `Tight spread of ${orderBook.metrics.spreadPercent.toFixed(3)}% indicates high liquidity and efficient market.` :
                        `Wide spread of ${orderBook.metrics.spreadPercent.toFixed(3)}% suggests lower liquidity. Consider limit orders.`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                  <Activity className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Bid/Ask Ratio: {orderBook.metrics.bidAskRatio.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {orderBook.metrics.bidAskRatio > 1.2 ? 
                        'Higher bid volume suggests potential upward price movement.' :
                        orderBook.metrics.bidAskRatio < 0.8 ?
                        'Higher ask volume suggests potential downward price pressure.' :
                        'Balanced order book indicates stable price action.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading State */}
        {isLoading && !orderBook && !hasError && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
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

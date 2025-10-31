/**
 * Order Book Page - Production Optimized
 * Clean, minimal UI with time frame selection and stabilized data visualization
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { useOrderBookREST } from '@/hooks/useOrderBookREST';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowDown,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { EnhancedDepthChart } from '@/components/trading/EnhancedDepthChart';
import { OrderBookHeatmap } from '@/components/trading/OrderBookHeatmap';

const POPULAR_PAIRS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA'];
const TIME_FRAMES = [
  { value: '1000', label: '1s', description: 'Real-time' },
  { value: '5000', label: '5s', description: 'Fast' },
  { value: '10000', label: '10s', description: 'Balanced' },
  { value: '30000', label: '30s', description: 'Smooth' }
];

// Memoized Order Book Table - Stabilized with key-based rendering
const OrderBookTable = memo(({
  bids,
  asks,
  midPrice,
  formatPrice,
  formatVolume
}: {
  bids: any[];
  asks: any[];
  midPrice: number;
  formatPrice: (n: number) => string;
  formatVolume: (n: number) => string;
}) => {
  const maxBidVolume = useMemo(() =>
    Math.max(...bids.map(b => b.quantity), 1),
    [bids]
  );
  const maxAskVolume = useMemo(() =>
    Math.max(...asks.map(a => a.quantity), 1),
    [asks]
  );

  return (
    <div className="space-y-2">
      {/* Asks - Reversed to show lowest first */}
      <div className="space-y-px">
        {asks.slice(0, 10).reverse().map((ask, i) => {
          const volumePercent = (ask.quantity / maxAskVolume) * 100;
          return (
            <div key={`ask-${ask.price}`} className="relative flex items-center justify-between py-1 px-3 hover:bg-red-500/5 transition-colors group">
              <div
                className="absolute inset-0 bg-red-500/10 transition-all"
                style={{ width: `${volumePercent}%` }}
              />
              <span className="relative text-red-500 font-mono text-sm font-medium">
                {formatPrice(ask.price)}
              </span>
              <span className="relative font-mono text-sm text-muted-foreground">
                {formatVolume(ask.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-center gap-3 py-3 bg-muted/30 rounded-lg border border-border">
        <div className="text-center">
          <div className="text-lg font-bold font-mono">{formatPrice(midPrice)}</div>
          <div className="text-xs text-muted-foreground">Mid Price</div>
        </div>
        {bids[0] && asks[0] && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-sm font-mono text-muted-foreground">
                {formatPrice(asks[0].price - bids[0].price)}
              </div>
              <div className="text-xs text-muted-foreground">Spread</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-sm font-mono text-muted-foreground">
                {(((asks[0].price - bids[0].price) / midPrice) * 100).toFixed(3)}%
              </div>
              <div className="text-xs text-muted-foreground">%</div>
            </div>
          </>
        )}
      </div>

      {/* Bids */}
      <div className="space-y-px">
        {bids.slice(0, 10).map((bid, i) => {
          const volumePercent = (bid.quantity / maxBidVolume) * 100;
          return (
            <div key={`bid-${bid.price}`} className="relative flex items-center justify-between py-1 px-3 hover:bg-green-500/5 transition-colors group">
              <div
                className="absolute inset-0 bg-green-500/10 transition-all"
                style={{ width: `${volumePercent}%` }}
              />
              <span className="relative text-green-500 font-mono text-sm font-medium">
                {formatPrice(bid.price)}
              </span>
              <span className="relative font-mono text-sm text-muted-foreground">
                {formatVolume(bid.quantity)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
OrderBookTable.displayName = 'OrderBookTable';

// Metrics Card Component
const MetricCard = memo(({
  label,
  value,
  change,
  icon: Icon,
  trend
}: {
  label: string;
  value: string;
  change?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <Card className="border-muted/50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {trend && (
          <Badge variant="outline" className={`
            ${trend === 'up' ? 'text-green-500 border-green-500/30' : ''}
            ${trend === 'down' ? 'text-red-500 border-red-500/30' : ''}
            ${trend === 'neutral' ? 'text-yellow-500 border-yellow-500/30' : ''}
            text-xs px-2 py-0 h-5
          `}>
            {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
            {change}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold font-mono mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
));
MetricCard.displayName = 'MetricCard';

export default function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [timeFrame, setTimeFrame] = useState('5000');
  const [activeTab, setActiveTab] = useState('depth');

  // Fetch order book data with selected time frame
  const { data: orderBook, isLoading } = useOrderBookREST({
    symbol: selectedSymbol,
    limit: 20,
    pollInterval: parseInt(timeFrame)
  });

  // Format helpers - memoized to prevent unnecessary recalculations
  const formatPrice = useCallback((price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }, []);

  const formatVolume = useCallback((volume: number) => {
    if (volume >= 1000) return volume.toFixed(2);
    if (volume >= 1) return volume.toFixed(3);
    return volume.toFixed(4);
  }, []);

  // Derived metrics
  const metrics = useMemo(() => {
    if (!orderBook?.metrics) return null;

    const { metrics } = orderBook;
    return {
      spread: formatPrice(metrics.spread),
      spreadPercent: metrics.spreadPercent.toFixed(3),
      bidVolume: formatVolume(metrics.totalBidVolume),
      askVolume: formatVolume(metrics.totalAskVolume),
      buyPressure: metrics.buyPressure.toFixed(1),
      sellPressure: metrics.sellPressure.toFixed(1),
      trend: metrics.buyPressure > 55 ? 'up' : metrics.sellPressure > 55 ? 'down' : 'neutral'
    };
  }, [orderBook?.metrics, formatPrice, formatVolume]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Order Book</h1>
          <p className="text-sm text-muted-foreground">Real-time market depth analysis</p>
        </div>

        {/* Time Frame Selector */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border">
          <Clock className="w-4 h-4 text-muted-foreground ml-2" />
          <div className="flex gap-1">
            {TIME_FRAMES.map(tf => (
              <Button
                key={tf.value}
                variant={timeFrame === tf.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeFrame(tf.value)}
                className="h-8 px-3 text-xs"
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Symbol Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {POPULAR_PAIRS.map(symbol => (
          <Button
            key={symbol}
            variant={selectedSymbol === symbol ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSymbol(symbol)}
            className="flex-shrink-0"
          >
            {symbol}/USDT
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && !orderBook && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading order book...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {orderBook?.status === 'error' && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-500">Connection Error</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {orderBook.message || 'Failed to fetch order book data'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {orderBook && orderBook.status === 'connected' && metrics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Mid Price"
              value={formatPrice(orderBook.metrics.midPrice)}
              icon={Activity}
              trend={metrics.trend as any}
            />
            <MetricCard
              label="Spread"
              value={`${metrics.spreadPercent}%`}
              change={metrics.spread}
              icon={BarChart3}
            />
            <MetricCard
              label="Buy Pressure"
              value={`${metrics.buyPressure}%`}
              icon={TrendingUp}
              trend={parseFloat(metrics.buyPressure) > 55 ? 'up' : 'neutral'}
            />
            <MetricCard
              label="Sell Pressure"
              value={`${metrics.sellPressure}%`}
              icon={TrendingDown}
              trend={parseFloat(metrics.sellPressure) > 55 ? 'down' : 'neutral'}
            />
          </div>

          {/* Order Book Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Traditional Order Book */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Order Book
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <OrderBookTable
                  bids={orderBook.bids}
                  asks={orderBook.asks}
                  midPrice={orderBook.metrics.midPrice}
                  formatPrice={formatPrice}
                  formatVolume={formatVolume}
                />
              </CardContent>
            </Card>

            {/* Visualization Tabs */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="depth">Depth Chart</TabsTrigger>
                    <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} className="w-full">
                  <TabsContent value="depth" className="mt-0">
                    <div className="h-[400px]">
                      <EnhancedDepthChart
                        bids={orderBook.bids}
                        asks={orderBook.asks}
                        midPrice={orderBook.metrics.midPrice}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="heatmap" className="mt-0">
                    <div className="h-[400px]">
                      <OrderBookHeatmap
                        bids={orderBook.bids}
                        asks={orderBook.asks}
                        midPrice={orderBook.metrics.midPrice}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Volume Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Volume Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Bid Volume</span>
                    <span className="font-mono font-medium text-green-500">{metrics.bidVolume}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${orderBook.metrics.buyPressure}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Ask Volume</span>
                    <span className="font-mono font-medium text-red-500">{metrics.askVolume}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-500"
                      style={{ width: `${orderBook.metrics.sellPressure}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bid/Ask Ratio</span>
                    <span className="font-mono font-medium">{orderBook.metrics.bidAskRatio.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        orderBook.metrics.bidAskRatio > 1 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(orderBook.metrics.bidAskRatio * 50, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Info Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live data from Binance</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Update interval: {TIME_FRAMES.find(tf => tf.value === timeFrame)?.description}</span>
              <span>•</span>
              <span>Latency: {orderBook.latency_ms}ms</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

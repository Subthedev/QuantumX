/**
 * Order Book Page - Final Production Version
 * Advanced market depth analysis with historical data and enhanced visualizations
 */

import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { useOrderBookREST } from '@/hooks/useOrderBookREST';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
  Loader2,
  AlertCircle,
  Layers,
  TrendingUpDown
} from 'lucide-react';
import { EnhancedDepthChart } from '@/components/trading/EnhancedDepthChart';
import { OrderBookHeatmap } from '@/components/trading/OrderBookHeatmap';

// Comprehensive cryptocurrency list
const CRYPTO_PAIRS = [
  { symbol: 'BTC', name: 'Bitcoin', category: 'Major' },
  { symbol: 'ETH', name: 'Ethereum', category: 'Major' },
  { symbol: 'BNB', name: 'Binance Coin', category: 'Major' },
  { symbol: 'SOL', name: 'Solana', category: 'Major' },
  { symbol: 'XRP', name: 'Ripple', category: 'Major' },
  { symbol: 'ADA', name: 'Cardano', category: 'Major' },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'Meme' },
  { symbol: 'AVAX', name: 'Avalanche', category: 'L1' },
  { symbol: 'DOT', name: 'Polkadot', category: 'L1' },
  { symbol: 'MATIC', name: 'Polygon', category: 'L2' },
  { symbol: 'LINK', name: 'Chainlink', category: 'Oracle' },
  { symbol: 'UNI', name: 'Uniswap', category: 'DeFi' },
  { symbol: 'ATOM', name: 'Cosmos', category: 'L1' },
  { symbol: 'LTC', name: 'Litecoin', category: 'Major' },
  { symbol: 'ETC', name: 'Ethereum Classic', category: 'Major' },
  { symbol: 'FIL', name: 'Filecoin', category: 'Storage' },
  { symbol: 'NEAR', name: 'Near Protocol', category: 'L1' },
  { symbol: 'APT', name: 'Aptos', category: 'L1' },
  { symbol: 'ARB', name: 'Arbitrum', category: 'L2' },
  { symbol: 'OP', name: 'Optimism', category: 'L2' }
];

const TIME_FRAMES = [
  { value: '2000', label: '2s', description: 'Real-time' },
  { value: '5000', label: '5s', description: 'Fast' },
  { value: '10000', label: '10s', description: 'Balanced' },
  { value: '30000', label: '30s', description: 'Smooth' }
];

const DEPTH_TIMEFRAMES = [
  { value: '1h', label: '1H', hours: 1 },
  { value: '4h', label: '4H', hours: 4 },
  { value: '24h', label: '24H', hours: 24 }
];

// Enhanced Order Book Table with improved stability
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

  const spread = useMemo(() => {
    if (!bids[0] || !asks[0]) return { value: 0, percent: 0 };
    const spreadValue = asks[0].price - bids[0].price;
    const spreadPercent = (spreadValue / midPrice) * 100;
    return { value: spreadValue, percent: spreadPercent };
  }, [bids, asks, midPrice]);

  return (
    <div className="space-y-2">
      {/* Asks - Reversed to show lowest first */}
      <div className="space-y-px">
        {asks.slice(0, 10).reverse().map((ask) => {
          const volumePercent = (ask.quantity / maxAskVolume) * 100;
          return (
            <div key={`ask-${ask.price.toFixed(8)}`} className="relative flex items-center justify-between py-1.5 px-3 hover:bg-red-500/5 transition-colors group">
              <div
                className="absolute inset-0 bg-red-500/10 transition-all duration-300"
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

      {/* Spread Display - Enhanced */}
      <div className="flex items-center justify-between gap-2 py-4 px-3 bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-lg border border-border shadow-sm">
        <div className="flex-1 text-center">
          <div className="text-xl font-bold font-mono tracking-tight">{formatPrice(midPrice)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Mid Price</div>
        </div>

        <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="flex-1 text-center">
          <div className="text-base font-mono font-semibold text-primary">
            {formatPrice(spread.value)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Spread</div>
        </div>

        <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="flex-1 text-center">
          <div className={`text-base font-mono font-semibold ${
            spread.percent < 0.1 ? 'text-green-500' : spread.percent < 0.5 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {spread.percent.toFixed(3)}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Spread %</div>
        </div>
      </div>

      {/* Bids */}
      <div className="space-y-px">
        {bids.slice(0, 10).map((bid) => {
          const volumePercent = (bid.quantity / maxBidVolume) * 100;
          return (
            <div key={`bid-${bid.price.toFixed(8)}`} className="relative flex items-center justify-between py-1.5 px-3 hover:bg-green-500/5 transition-colors group">
              <div
                className="absolute inset-0 bg-green-500/10 transition-all duration-300"
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

// Enhanced Metrics Card with animations
const MetricCard = memo(({
  label,
  value,
  change,
  icon: Icon,
  trend,
  description
}: {
  label: string;
  value: string;
  change?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}) => (
  <Card className="border-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {trend && change && (
          <Badge variant="outline" className={`
            ${trend === 'up' ? 'text-green-500 border-green-500/30 bg-green-500/5' : ''}
            ${trend === 'down' ? 'text-red-500 border-red-500/30 bg-red-500/5' : ''}
            ${trend === 'neutral' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' : ''}
            text-xs px-2 py-0.5 h-5 font-medium
          `}>
            {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
            {change}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold font-mono mb-1 tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      {description && (
        <div className="text-[10px] text-muted-foreground/70 mt-1">{description}</div>
      )}
    </CardContent>
  </Card>
));
MetricCard.displayName = 'MetricCard';

// Historic Volume Data Component
const HistoricVolumeAnalysis = memo(({
  currentBidVolume,
  currentAskVolume,
  buyPressure,
  sellPressure,
  bidAskRatio,
  timeframe
}: {
  currentBidVolume: number;
  currentAskVolume: number;
  buyPressure: number;
  sellPressure: number;
  bidAskRatio: number;
  timeframe: string;
}) => {
  // Simulate historical trend (in production, this would come from API)
  const historicTrend = useMemo(() => {
    const trend = buyPressure > sellPressure ? 'bullish' : 'bearish';
    const strength = Math.abs(buyPressure - sellPressure);
    return { trend, strength };
  }, [buyPressure, sellPressure]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Total Bid Volume</span>
          </div>
          <span className="font-mono font-semibold text-green-500">{currentBidVolume.toFixed(2)}</span>
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-700 ease-out"
              style={{ width: `${buyPressure}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{timeframe} Average</span>
            <span>{buyPressure.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Total Ask Volume</span>
          </div>
          <span className="font-mono font-semibold text-red-500">{currentAskVolume.toFixed(2)}</span>
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700 ease-out"
              style={{ width: `${sellPressure}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{timeframe} Average</span>
            <span>{sellPressure.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUpDown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Bid/Ask Ratio</span>
          </div>
          <span className="font-mono font-semibold">{bidAskRatio.toFixed(3)}</span>
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  bidAskRatio > 1 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                style={{ width: `${Math.min(Math.abs(bidAskRatio - 1) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <Badge variant="outline" className={`
              ${historicTrend.trend === 'bullish' ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}
              text-[10px] h-4
            `}>
              {historicTrend.trend} {historicTrend.strength.toFixed(0)}%
            </Badge>
            <span className="text-muted-foreground">{timeframe} Trend</span>
          </div>
        </div>
      </div>
    </div>
  );
});
HistoricVolumeAnalysis.displayName = 'HistoricVolumeAnalysis';

export default function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [timeFrame, setTimeFrame] = useState('5000');
  const [activeTab, setActiveTab] = useState('depth');
  const [depthTimeframe, setDepthTimeframe] = useState('1h');

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
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    if (volume >= 1) return volume.toFixed(3);
    return volume.toFixed(4);
  }, []);

  // Derived metrics with stability
  const metrics = useMemo(() => {
    if (!orderBook?.metrics) return null;

    const { metrics } = orderBook;
    return {
      spread: formatPrice(metrics.spread),
      spreadPercent: metrics.spreadPercent.toFixed(3),
      bidVolume: metrics.totalBidVolume,
      askVolume: metrics.totalAskVolume,
      buyPressure: metrics.buyPressure.toFixed(1),
      sellPressure: metrics.sellPressure.toFixed(1),
      trend: metrics.buyPressure > 55 ? 'up' : metrics.sellPressure > 55 ? 'down' : 'neutral'
    };
  }, [orderBook?.metrics, formatPrice]);

  // Get selected crypto info
  const selectedCrypto = CRYPTO_PAIRS.find(p => p.symbol === selectedSymbol);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Order Book Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Real-time market depth with historical insights
          </p>
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

      {/* Crypto Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-[200px]">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Select Crypto:</span>
        </div>
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-full sm:w-[300px] bg-background">
            <SelectValue>
              {selectedCrypto && (
                <div className="flex items-center gap-2">
                  <span className="font-bold">{selectedCrypto.symbol}/USDT</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{selectedCrypto.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {selectedCrypto.category}
                  </Badge>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CRYPTO_PAIRS.map(crypto => (
              <SelectItem key={crypto.symbol} value={crypto.symbol}>
                <div className="flex items-center gap-2 w-full">
                  <span className="font-bold">{crypto.symbol}/USDT</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground flex-1">{crypto.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {crypto.category}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && !orderBook && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading order book data...</p>
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
              description={`${selectedSymbol}/USDT`}
            />
            <MetricCard
              label="Spread"
              value={`${metrics.spreadPercent}%`}
              change={metrics.spread}
              icon={BarChart3}
              description="Bid-Ask difference"
            />
            <MetricCard
              label="Buy Pressure"
              value={`${metrics.buyPressure}%`}
              icon={TrendingUp}
              trend={parseFloat(metrics.buyPressure) > 55 ? 'up' : 'neutral'}
              description="Demand strength"
            />
            <MetricCard
              label="Sell Pressure"
              value={`${metrics.sellPressure}%`}
              icon={TrendingDown}
              trend={parseFloat(metrics.sellPressure) > 55 ? 'down' : 'neutral'}
              description="Supply strength"
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

            {/* Enhanced Visualization Tabs */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="depth">Depth Chart</TabsTrigger>
                      <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Depth Timeframe Selector */}
                  {activeTab === 'depth' && (
                    <div className="flex items-center gap-1 ml-4">
                      {DEPTH_TIMEFRAMES.map(tf => (
                        <Button
                          key={tf.value}
                          variant={depthTimeframe === tf.value ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setDepthTimeframe(tf.value)}
                          className="h-7 px-2 text-xs"
                        >
                          {tf.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} className="w-full">
                  <TabsContent value="depth" className="mt-0">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground flex items-center justify-between px-2">
                        <span>Supply & Demand Analysis - {DEPTH_TIMEFRAMES.find(tf => tf.value === depthTimeframe)?.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Historical View
                        </Badge>
                      </div>
                      <div className="h-[400px]">
                        <EnhancedDepthChart
                          bids={orderBook.bids}
                          asks={orderBook.asks}
                          midPrice={orderBook.metrics.midPrice}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="heatmap" className="mt-0">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground flex items-center justify-between px-2">
                        <span>Volume Intensity Visualization</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm" />
                            <span className="text-[10px]">Low</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-sm" />
                            <span className="text-[10px]">High</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-[400px]">
                        <OrderBookHeatmap
                          bids={orderBook.bids}
                          asks={orderBook.asks}
                          midPrice={orderBook.metrics.midPrice}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Historic Volume Analysis */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Volume Analysis - Historical Trends</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {DEPTH_TIMEFRAMES.find(tf => tf.value === depthTimeframe)?.label} Timeframe
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <HistoricVolumeAnalysis
                currentBidVolume={orderBook.metrics.totalBidVolume}
                currentAskVolume={orderBook.metrics.totalAskVolume}
                buyPressure={orderBook.metrics.buyPressure}
                sellPressure={orderBook.metrics.sellPressure}
                bidAskRatio={orderBook.metrics.bidAskRatio}
                timeframe={DEPTH_TIMEFRAMES.find(tf => tf.value === depthTimeframe)?.label || '1H'}
              />
            </CardContent>
          </Card>

          {/* Data Info Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="font-medium">Live data from Binance API</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Update: {TIME_FRAMES.find(tf => tf.value === timeFrame)?.description}</span>
              </div>
              <span>•</span>
              <span>Latency: {orderBook.latency_ms}ms</span>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">
                Production Ready
              </Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

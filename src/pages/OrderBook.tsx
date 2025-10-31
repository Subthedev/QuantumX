/**
 * Order Book Page - Final Production Version
 * Advanced market depth analysis with real-time data visualization
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { useOrderBookREST } from '@/hooks/useOrderBookREST';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Search,
  TrendingUpDown
} from 'lucide-react';
import { EnhancedDepthChart } from '@/components/trading/EnhancedDepthChart';
import { OrderBookHeatmap } from '@/components/trading/OrderBookHeatmap';

// Comprehensive cryptocurrency list organized by category
const CRYPTO_CATEGORIES = {
  'Major Assets': [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'ADA', name: 'Cardano' },
  ],
  'Layer 1 Blockchains': [
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'NEAR', name: 'Near Protocol' },
    { symbol: 'APT', name: 'Aptos' },
  ],
  'Layer 2 & Scaling': [
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'OP', name: 'Optimism' },
  ],
  'DeFi & Infrastructure': [
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'FIL', name: 'Filecoin' },
  ],
  'Alternative Coins': [
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'ETC', name: 'Ethereum Classic' },
  ],
};

const UPDATE_INTERVALS = [
  { value: '2000', label: '2s', description: 'Ultra Fast' },
  { value: '5000', label: '5s', description: 'Fast' },
  { value: '10000', label: '10s', description: 'Balanced' },
  { value: '30000', label: '30s', description: 'Smooth' }
];

// Enhanced Order Book Table with improved spread display
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
        {asks.slice(0, 12).reverse().map((ask) => {
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

      {/* Spread Display - Enhanced with vibrant design */}
      <div className="relative overflow-hidden rounded-xl border border-border my-3">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
        <div className="relative flex items-center justify-between gap-3 py-4 px-4">
          <div className="flex-1 text-center">
            <div className="text-xl font-bold font-mono tracking-tight mb-0.5">
              {formatPrice(midPrice)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              Mid Price
            </div>
          </div>

          <div className="h-12 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

          <div className="flex-1 text-center">
            <div className="text-lg font-mono font-bold text-primary mb-0.5">
              {formatPrice(spread.value)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              Spread
            </div>
          </div>

          <div className="h-12 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

          <div className="flex-1 text-center">
            <div className={`text-lg font-mono font-bold mb-0.5 ${
              spread.percent < 0.1 ? 'text-green-500' : spread.percent < 0.5 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {spread.percent.toFixed(3)}%
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              Spread %
            </div>
          </div>
        </div>
      </div>

      {/* Bids */}
      <div className="space-y-px">
        {bids.slice(0, 12).map((bid) => {
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

// Enhanced Metrics Card
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
  <Card className="border-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
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

// Historic Volume Analysis Component
const VolumeAnalysis = memo(({
  currentBidVolume,
  currentAskVolume,
  buyPressure,
  sellPressure,
  bidAskRatio
}: {
  currentBidVolume: number;
  currentAskVolume: number;
  buyPressure: number;
  sellPressure: number;
  bidAskRatio: number;
}) => {
  const trend = useMemo(() => {
    const trendType = buyPressure > sellPressure ? 'bullish' : 'bearish';
    const strength = Math.abs(buyPressure - sellPressure);
    return { trendType, strength };
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
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-lg transition-all duration-700 ease-out"
              style={{ width: `${buyPressure}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Buy Pressure</span>
            <span className="font-semibold">{buyPressure.toFixed(1)}%</span>
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
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-lg transition-all duration-700 ease-out"
              style={{ width: `${sellPressure}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sell Pressure</span>
            <span className="font-semibold">{sellPressure.toFixed(1)}%</span>
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
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded-full overflow-hidden relative shadow-inner">
            <div
              className={`h-full shadow-lg transition-all duration-700 ease-out ${
                bidAskRatio > 1 ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'
              }`}
              style={{ width: `${Math.min(Math.abs(bidAskRatio - 1) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <Badge variant="outline" className={`
              ${trend.trendType === 'bullish' ? 'text-green-500 border-green-500/30 bg-green-500/5' : 'text-red-500 border-red-500/30 bg-red-500/5'}
              text-[10px] h-5 font-semibold
            `}>
              {trend.trendType.toUpperCase()} {trend.strength.toFixed(0)}%
            </Badge>
            <span className="text-muted-foreground font-medium">Market Trend</span>
          </div>
        </div>
      </div>
    </div>
  );
});
VolumeAnalysis.displayName = 'VolumeAnalysis';

export default function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [updateInterval, setUpdateInterval] = useState('5000');
  const [activeTab, setActiveTab] = useState('depth');

  // Fetch order book data
  const { data: orderBook, isLoading } = useOrderBookREST({
    symbol: selectedSymbol,
    limit: 20,
    pollInterval: parseInt(updateInterval)
  });

  // Format helpers
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

  // Calculate real-time spread for top metrics
  const spreadMetrics = useMemo(() => {
    if (!orderBook?.bids[0] || !orderBook?.asks[0]) {
      return { value: '0.00', percent: '0.000' };
    }

    const spreadValue = orderBook.asks[0].price - orderBook.bids[0].price;
    const midPrice = orderBook.metrics.midPrice;
    const spreadPercent = (spreadValue / midPrice) * 100;

    return {
      value: formatPrice(spreadValue),
      percent: spreadPercent.toFixed(3)
    };
  }, [orderBook, formatPrice]);

  // Derived metrics
  const metrics = useMemo(() => {
    if (!orderBook?.metrics) return null;

    const { metrics } = orderBook;
    return {
      bidVolume: metrics.totalBidVolume,
      askVolume: metrics.totalAskVolume,
      buyPressure: metrics.buyPressure.toFixed(1),
      sellPressure: metrics.sellPressure.toFixed(1),
      trend: metrics.buyPressure > 55 ? 'up' : metrics.sellPressure > 55 ? 'down' : 'neutral'
    };
  }, [orderBook?.metrics]);

  // Get all cryptos as flat array for search
  const allCryptos = useMemo(() => {
    return Object.entries(CRYPTO_CATEGORIES).flatMap(([category, coins]) =>
      coins.map(coin => ({ ...coin, category }))
    );
  }, []);

  const selectedCrypto = allCryptos.find(c => c.symbol === selectedSymbol);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Order Book Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Real-time market depth and liquidity visualization
          </p>
        </div>

        {/* Update Interval Control */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border">
          <Clock className="w-4 h-4 text-muted-foreground ml-2" />
          <div className="flex gap-1">
            {UPDATE_INTERVALS.map(interval => (
              <Button
                key={interval.value}
                variant={updateInterval === interval.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setUpdateInterval(interval.value)}
                className="h-8 px-3 text-xs"
                title={interval.description}
              >
                {interval.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Crypto Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-[140px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Select Asset:</span>
        </div>
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-full sm:w-[400px] bg-background">
            <SelectValue>
              {selectedCrypto && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{selectedCrypto.symbol}</span>
                  <span className="text-muted-foreground">/USDT</span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-sm text-muted-foreground">{selectedCrypto.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CRYPTO_CATEGORIES).map(([category, coins]) => (
              <SelectGroup key={category}>
                <SelectLabel className="text-xs font-semibold text-primary">{category}</SelectLabel>
                {coins.map(crypto => (
                  <SelectItem key={crypto.symbol} value={crypto.symbol}>
                    <div className="flex items-center gap-2 py-1">
                      <span className="font-bold">{crypto.symbol}</span>
                      <span className="text-muted-foreground">/USDT</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{crypto.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
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
          {/* Key Metrics - Fixed Spread Display */}
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
              value={`${spreadMetrics.percent}%`}
              change={spreadMetrics.value}
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="depth" className="gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Depth Chart
                    </TabsTrigger>
                    <TabsTrigger value="heatmap" className="gap-2">
                      <Activity className="w-4 h-4" />
                      Volume Heatmap
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} className="w-full">
                  <TabsContent value="depth" className="mt-0">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground flex items-center justify-between px-2">
                        <span>Market Depth & Liquidity Analysis</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Live Data
                        </Badge>
                      </div>
                      <div className="h-[450px] bg-gradient-to-b from-muted/20 to-transparent rounded-lg p-2">
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
                        <span>Volume Distribution & Intensity</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gradient-to-r from-red-500/20 to-red-500/40 border border-red-500/50 rounded-sm" />
                            <span className="text-[10px]">Low</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gradient-to-r from-red-500/60 to-red-500 border border-red-500 rounded-sm" />
                            <span className="text-[10px]">High</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-[450px] bg-gradient-to-b from-muted/20 to-transparent rounded-lg p-2">
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

          {/* Volume Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Pressure Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <VolumeAnalysis
                currentBidVolume={orderBook.metrics.totalBidVolume}
                currentAskVolume={orderBook.metrics.totalAskVolume}
                buyPressure={orderBook.metrics.buyPressure}
                sellPressure={orderBook.metrics.sellPressure}
                bidAskRatio={orderBook.metrics.bidAskRatio}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

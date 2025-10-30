/**
 * Order Book Page - Complete Redesign
 * World-class real-time order book with advanced analytics and visual insights
 * 100ms WebSocket updates with production-grade performance
 */

import { useState, useMemo, useEffect, memo } from 'react';
import { useOrderBookWebSocket } from '@/hooks/useOrderBookWebSocket';
import { useOrderFlowImbalance } from '@/hooks/useOrderFlowImbalance';
import { usePlatformMetrics } from '@/hooks/usePlatformMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Target,
  ShieldCheck,
  AlertTriangle,
  Info,
  Flame,
  Eye,
  LayoutGrid,
  LineChart
} from 'lucide-react';
import { EnhancedDepthChart } from '@/components/trading/EnhancedDepthChart';
import { OrderBookHeatmap } from '@/components/trading/OrderBookHeatmap';
import { AggregatedOrderBook } from '@/components/trading/AggregatedOrderBook';
import { dataHealthMonitor } from '@/services/dataHealthMonitor';

const POPULAR_PAIRS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

// Memoized compact order book table for performance
const CompactOrderBookTable = memo(({
  orders,
  side,
  formatPrice,
  formatVolume,
  totalVolume
}: {
  orders: any[];
  side: 'bid' | 'ask';
  formatPrice: (n: number) => string;
  formatVolume: (n: number) => string;
  totalVolume: number;
}) => {
  return (
    <div className="h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
      <table className="w-full">
        <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-[10px] font-medium text-muted-foreground">Price</th>
            <th className="text-right py-2 px-2 text-[10px] font-medium text-muted-foreground">Amount</th>
            <th className="text-right py-2 px-2 text-[10px] font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.slice(0, 20).map((order, i) => {
            const volumePercent = (order.quantity / totalVolume) * 100;
            return (
              <tr key={i} className="hover:bg-accent/50 transition-colors group">
                <td className="relative py-1 px-2">
                  <div
                    className={`absolute inset-0 ${side === 'bid' ? 'bg-green-500/10' : 'bg-red-500/10'} transition-all group-hover:${side === 'bid' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                    style={{ width: `${Math.min(volumePercent * 2, 100)}%` }}
                  />
                  <span className={`relative ${side === 'bid' ? 'text-green-500' : 'text-red-500'} font-mono text-xs font-medium`}>
                    {formatPrice(order.price)}
                  </span>
                </td>
                <td className="relative text-right py-1 px-2 font-mono text-xs">
                  {formatVolume(order.quantity)}
                </td>
                <td className="relative text-right py-1 px-2 font-mono text-xs text-muted-foreground">
                  {formatVolume(order.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
CompactOrderBookTable.displayName = 'CompactOrderBookTable';

// Memoized Order Flow Signal Card
const OrderFlowSignalCard = memo(({ signal }: { signal: any }) => {
  const getSignalIcon = () => {
    switch (signal.type) {
      case 'whale_buy':
      case 'whale_sell':
        return Flame;
      case 'absorption':
        return ShieldCheck;
      case 'breakout_imminent':
        return Zap;
      case 'reversal_signal':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getSeverityColor = () => {
    switch (signal.severity) {
      case 'critical':
        return 'border-l-red-600 bg-red-600/5';
      case 'high':
        return 'border-l-orange-500 bg-orange-500/5';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const Icon = getSignalIcon();

  return (
    <Card className={`border-l-4 ${getSeverityColor()} hover:shadow-md transition-shadow`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{signal.title}</h4>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                {signal.severity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-1">
              {signal.description}
            </p>
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <Target className="w-3 h-3" />
              <span>{signal.action}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
OrderFlowSignalCard.displayName = 'OrderFlowSignalCard';

export default function OrderBook() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [activeView, setActiveView] = useState<'heatmap' | 'depth' | 'aggregated' | 'traditional'>('depth');

  const { orderBook, isConnecting, isConnected, hasError, error } = useOrderBookWebSocket({
    symbol: selectedSymbol
  });

  const { metrics: platformMetrics } = usePlatformMetrics({ startTracking: true });

  // Order Flow Imbalance Analysis
  const {
    imbalance,
    metrics: ofiMetrics,
    signals,
    criticalSignals,
    levels,
    tradingAction
  } = useOrderFlowImbalance({
    bids: orderBook?.bids || [],
    asks: orderBook?.asks || [],
    midPrice: orderBook?.metrics.midPrice || 0,
    symbol: selectedSymbol,
    enabled: !!orderBook
  });

  // Health monitoring
  const [healthMetrics, setHealthMetrics] = useState(dataHealthMonitor.getHealth(selectedSymbol.toLowerCase()));

  useEffect(() => {
    if (!orderBook) return;

    const interval = setInterval(() => {
      setHealthMetrics(dataHealthMonitor.getHealth(selectedSymbol.toLowerCase()));
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSymbol, orderBook]);

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

  const getImbalanceColor = () => {
    if (!ofiMetrics.hasData) return 'text-muted-foreground';
    if (ofiMetrics.overallImbalance > 30) return 'text-green-500';
    if (ofiMetrics.overallImbalance < -30) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getHealthStatusColor = () => {
    switch (healthMetrics.websocketStatus) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background py-6 pt-16 sm:pt-20 px-3 sm:px-4 lg:px-6">
      <div className="max-w-[2000px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-7 h-7 text-primary animate-pulse" />
              Advanced Order Book Analytics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time 100ms updates • Order Flow Imbalance • Liquidity Zones • Multi-Exchange Aggregation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </span>
              <span className="text-xs font-medium">{isConnected ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}</span>
            </Badge>
            {healthMetrics && (
              <>
                <Badge variant="outline" className="text-xs">
                  {healthMetrics.averageLatency}ms latency
                </Badge>
                <Badge variant="outline" className={`text-xs ${getHealthStatusColor()}`}>
                  {healthMetrics.dataQuality.toUpperCase()}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Platform-Wide Metrics - Compact */}
        {platformMetrics && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Tracked
                  </div>
                  <div className="text-base font-bold">{platformMetrics.totalCoins}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Volume
                  </div>
                  <div className="text-base font-bold">{formatUSD(platformMetrics.totalVolume)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Bids</div>
                  <div className="text-base font-bold text-green-500">{formatUSD(platformMetrics.totalBidVolume)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Asks</div>
                  <div className="text-base font-bold text-red-500">{formatUSD(platformMetrics.totalAskVolume)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Spread</div>
                  <div className="text-base font-bold text-yellow-500">{platformMetrics.averageSpread.toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    Bullish
                  </div>
                  <div className="text-base font-bold text-green-500">{platformMetrics.bullishCoins}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    Bearish
                  </div>
                  <div className="text-base font-bold text-red-500">{platformMetrics.bearishCoins}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coin Selector - Compact Pills */}
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_PAIRS.map(symbol => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedSymbol === symbol
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : 'bg-card text-foreground hover:bg-accent border border-border hover:scale-105'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>

        {/* Error Handling */}
        {hasError && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-destructive">Connection Error</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {error?.message || 'Failed to connect. Retrying...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isConnecting && !orderBook && (
          <Card>
            <CardContent className="p-6 text-center">
              <Activity className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-base font-medium">Connecting to Real-Time Stream...</p>
              <p className="text-xs text-muted-foreground mt-1">Establishing WebSocket connection</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {isConnected && orderBook && (
          <>
            {/* Order Flow Imbalance Dashboard - HERO SECTION */}
            {ofiMetrics.hasData && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      Order Flow Imbalance Analysis
                      <Badge variant="outline" className="ml-2 text-xs">
                        {ofiMetrics.confidence}% Confidence
                      </Badge>
                    </CardTitle>
                    <Badge
                      variant={ofiMetrics.strength.includes('buy') ? 'default' : ofiMetrics.strength.includes('sell') ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {ofiMetrics.strength.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* OFI Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <Card className="bg-background/50">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Overall Imbalance</div>
                        <div className={`text-xl font-bold ${getImbalanceColor()}`}>
                          {ofiMetrics.overallImbalance > 0 ? '+' : ''}{ofiMetrics.overallImbalance.toFixed(1)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background/50">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Top of Book</div>
                        <div className={`text-xl font-bold ${ofiMetrics.topOfBookImbalance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {ofiMetrics.topOfBookImbalance > 0 ? '+' : ''}{ofiMetrics.topOfBookImbalance.toFixed(1)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background/50">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Deep Book</div>
                        <div className={`text-xl font-bold ${ofiMetrics.deepBookImbalance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {ofiMetrics.deepBookImbalance > 0 ? '+' : ''}{ofiMetrics.deepBookImbalance.toFixed(1)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background/50">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Trend</div>
                        <div className="text-base font-bold text-foreground">
                          {ofiMetrics.trend.toUpperCase()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background/50">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Velocity</div>
                        <div className={`text-base font-bold ${ofiMetrics.velocity > 0 ? 'text-green-500' : ofiMetrics.velocity < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {ofiMetrics.velocity > 0 ? '+' : ''}{ofiMetrics.velocity.toFixed(1)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-background/50">
                      <CardContent className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Signals</div>
                        <div className="text-xl font-bold text-primary">
                          {ofiMetrics.signalCount}
                          {ofiMetrics.criticalSignals > 0 && (
                            <span className="text-sm text-red-500 ml-1">({ofiMetrics.criticalSignals}!)</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Trading Recommendation */}
                  {tradingAction && (
                    <Card className="border-primary/40 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-base">Trading Recommendation</h3>
                              <Badge variant={
                                tradingAction.action.includes('buy') ? 'default' :
                                tradingAction.action.includes('sell') ? 'destructive' : 'secondary'
                              }>
                                {tradingAction.action.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {tradingAction.risk.toUpperCase()} Risk
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {tradingAction.timeframe.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{tradingAction.reasoning}</p>
                            {tradingAction.entry && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Entry:</span>
                                  <span className="ml-1 font-mono font-semibold">${formatPrice(tradingAction.entry)}</span>
                                </div>
                                {tradingAction.target && (
                                  <div>
                                    <span className="text-muted-foreground">Target:</span>
                                    <span className="ml-1 font-mono font-semibold text-green-500">${formatPrice(tradingAction.target)}</span>
                                  </div>
                                )}
                                {tradingAction.stopLoss && (
                                  <div>
                                    <span className="text-muted-foreground">Stop Loss:</span>
                                    <span className="ml-1 font-mono font-semibold text-red-500">${formatPrice(tradingAction.stopLoss)}</span>
                                  </div>
                                )}
                                {tradingAction.target && tradingAction.entry && (
                                  <div>
                                    <span className="text-muted-foreground">R/R:</span>
                                    <span className="ml-1 font-mono font-semibold">
                                      {((tradingAction.target - tradingAction.entry) / (tradingAction.entry - (tradingAction.stopLoss || tradingAction.entry * 0.95))).toFixed(2)}:1
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Critical Signals */}
                  {criticalSignals.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Critical Signals ({criticalSignals.length})
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {criticalSignals.slice(0, 4).map((signal, idx) => (
                          <OrderFlowSignalCard key={idx} signal={signal} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Signals */}
                  {signals.length > criticalSignals.length && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">All Signals ({signals.length})</h3>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {signals.slice(0, 6).map((signal, idx) => (
                          <OrderFlowSignalCard key={idx} signal={signal} />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Key Metrics - Compact Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Mid Price</div>
                  <div className={`text-lg font-bold transition-all duration-300 ${
                    priceFlash === 'up' ? 'text-green-500 scale-110' :
                    priceFlash === 'down' ? 'text-red-500 scale-110' :
                    'text-foreground'
                  }`}>
                    ${formatPrice(orderBook.metrics.midPrice)}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Spread</div>
                  <div className="text-lg font-bold text-yellow-500">
                    {orderBook.metrics.spreadPercent.toFixed(4)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Buy
                  </div>
                  <div className="text-lg font-bold text-green-500">
                    {orderBook.metrics.buyPressure.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Sell
                  </div>
                  <div className="text-lg font-bold text-red-500">
                    {orderBook.metrics.sellPressure.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-0.5">B/A Ratio</div>
                  <div className="text-lg font-bold">
                    {orderBook.metrics.bidAskRatio.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-0.5">24h Volume</div>
                  <div className="text-base font-bold text-primary">
                    {formatUSD((orderBook.metrics.totalBidVolume + orderBook.metrics.totalAskVolume) * orderBook.metrics.midPrice)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visualization Selector */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Button
                    variant={activeView === 'depth' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView('depth')}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    <LineChart className="w-3 h-3" />
                    Enhanced Depth
                  </Button>
                  <Button
                    variant={activeView === 'heatmap' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView('heatmap')}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    Heatmap
                  </Button>
                  <Button
                    variant={activeView === 'aggregated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView('aggregated')}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    <BarChart3 className="w-3 h-3" />
                    Multi-Exchange
                  </Button>
                  <Button
                    variant={activeView === 'traditional' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView('traditional')}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    <Activity className="w-3 h-3" />
                    Traditional
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                {activeView === 'depth' && (
                  <EnhancedDepthChart
                    bids={orderBook.bids}
                    asks={orderBook.asks}
                    midPrice={orderBook.metrics.midPrice}
                    symbol={selectedSymbol}
                    height={500}
                  />
                )}
                {activeView === 'heatmap' && (
                  <OrderBookHeatmap
                    bids={orderBook.bids}
                    asks={orderBook.asks}
                    midPrice={orderBook.metrics.midPrice}
                    symbol={selectedSymbol}
                    height={600}
                  />
                )}
                {activeView === 'aggregated' && (
                  <AggregatedOrderBook
                    symbol={selectedSymbol}
                  />
                )}
                {activeView === 'traditional' && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Asks */}
                    <Card>
                      <div className="p-3 border-b border-border bg-red-500/5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-red-500">
                            <ArrowDown className="w-4 h-4" />
                            Asks (Sell)
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {formatVolume(orderBook.metrics.totalAskVolume)} {selectedSymbol}
                          </span>
                        </div>
                      </div>
                      <CompactOrderBookTable
                        orders={[...orderBook.asks].slice(0, 20).reverse()}
                        side="ask"
                        formatPrice={formatPrice}
                        formatVolume={formatVolume}
                        totalVolume={orderBook.metrics.totalAskVolume}
                      />
                    </Card>

                    {/* Bids */}
                    <Card>
                      <div className="p-3 border-b border-border bg-green-500/5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-green-500">
                            <ArrowUp className="w-4 h-4" />
                            Bids (Buy)
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {formatVolume(orderBook.metrics.totalBidVolume)} {selectedSymbol}
                          </span>
                        </div>
                      </div>
                      <CompactOrderBookTable
                        orders={orderBook.bids}
                        side="bid"
                        formatPrice={formatPrice}
                        formatVolume={formatVolume}
                        totalVolume={orderBook.metrics.totalBidVolume}
                      />
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading Skeleton */}
        {isConnecting && !orderBook && !hasError && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        )}
      </div>
    </div>
  );
}

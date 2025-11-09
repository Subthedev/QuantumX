/**
 * Mock Trading Page
 * Real-time paper trading with live market data
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { TrendingUp, TrendingDown, DollarSign, Activity, History, RotateCcw, ArrowUpRight, ArrowDownRight, Search, BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cryptoDataService } from '@/services/cryptoDataService';
import type { CryptoData } from '@/services/cryptoDataService';

export default function MockTrading() {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [coins, setCoins] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  // Use the exact same service as dashboard
  const loadCryptoData = useCallback(async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(100);
      setCoins(data);
    } catch (error) {
      console.error('Failed to load coins:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCryptoData();
    // Refresh every 2 minutes like dashboard
    const interval = setInterval(loadCryptoData, 120000);
    return () => clearInterval(interval);
  }, [loadCryptoData]);

  // Get selected coin data
  const selectedCoin = useMemo(() => {
    const symbol = selectedSymbol.replace('USDT', '').toLowerCase();
    return coins.find(c => c.symbol.toLowerCase() === symbol);
  }, [selectedSymbol, coins]);
  const {
    account,
    openPositions,
    history,
    isLoading,
    placeOrder,
    closePosition,
    resetAccount,
    updatePrices,
    isPlacingOrder
  } = useMockTrading();

  const currentPrice = selectedCoin?.current_price ?? 0;
  const priceChange24h = selectedCoin?.price_change_percentage_24h ?? 0;

  // Filter coins based on search - show all 100 coins by default like dashboard
  const filteredCoins = useMemo(() => {
    if (!searchQuery) {
      return coins; // Show all 100 coins by default
    }
    return coins.filter(coin => 
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, coins]);

  // Update all open position prices in real-time
  useEffect(() => {
    if (!openPositions.length || !coins.length) return;
    
    const interval = setInterval(() => {
      openPositions.forEach(position => {
        const symbol = position.symbol.replace('USDT', '').toLowerCase();
        const coin = coins.find(c => c.symbol.toLowerCase() === symbol);
        if (coin?.current_price) {
          updatePrices(position.symbol, coin.current_price);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [openPositions, coins, updatePrices]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handlePlaceOrder = () => {
    if (!quantity || !currentPrice) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    placeOrder({
      symbol: selectedSymbol,
      side: orderSide,
      quantity: qty,
      price: currentPrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    });

    // Reset form
    setQuantity('');
    setStopLoss('');
    setTakeProfit('');
  };

  const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
  const accountValue = (account?.balance || 0) + totalUnrealizedPnL;
  const totalReturn = account ? ((accountValue - account.initial_balance) / account.initial_balance) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-foreground">Paper Trading</h1>
              <p className="text-xs text-muted-foreground">Real-time simulation with live market data</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => resetAccount()} className="gap-2">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="px-4 py-2 flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Balance:</span>
              <span className="text-sm font-semibold text-foreground">
                ${(account?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Equity:</span>
              <span className="text-sm font-semibold text-foreground">
                ${accountValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Unrealized P&L:</span>
              <span className={`text-sm font-semibold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${Math.abs(totalUnrealizedPnL).toFixed(2)}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Win Rate:</span>
              <span className="text-sm font-semibold text-foreground">
                {account?.total_trades ? ((account.winning_trades / account.total_trades) * 100).toFixed(1) : '0'}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({account?.winning_trades || 0}W/{account?.losing_trades || 0}L)
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Positions:</span>
              <Badge variant="secondary" className="text-xs">{openPositions.length}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-4 h-[calc(100vh-140px)]">
          {/* Left Sidebar - Symbol Selection & Order Entry */}
          <div className="lg:col-span-1 flex flex-col border-r border-border/40">
            {/* Symbol Search */}
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {/* Symbol List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-2 p-2">
                        <div className="w-8 h-8 bg-muted rounded-full" />
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-muted rounded w-20" />
                          <div className="h-3 bg-muted rounded w-12" />
                        </div>
                        <div className="space-y-1">
                          <div className="h-4 bg-muted rounded w-16" />
                          <div className="h-3 bg-muted rounded w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCoins.map((coin) => {
                    const symbol = `${coin.symbol.toUpperCase()}USDT`;
                    const isSelected = selectedSymbol === symbol;
                    return (
                      <button
                        key={coin.id}
                        onClick={() => setSelectedSymbol(symbol)}
                        className={`w-full p-2 rounded-lg text-left transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img 
                            src={coin.image} 
                            alt={coin.name}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{coin.name}</p>
                            <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                          </div>
                           <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold">
                              ${coin.current_price >= 1 
                                ? coin.current_price.toFixed(2) 
                                : coin.current_price.toFixed(6)}
                            </p>
                            <p className={`text-xs font-semibold ${
                              (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                              {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredCoins.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No coins found
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Order Entry Panel */}
            <div className="border-t border-border/40 p-3 space-y-3 bg-card/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Quick Order</Label>
                <Badge variant="secondary" className="text-xs">
                  {selectedSymbol.replace('USDT', '')}
                </Badge>
              </div>

              {/* Current Price Display */}
              <div className="p-2 bg-muted/50 rounded-lg border border-border/40">
                <div className="flex items-center gap-2 mb-1">
                  {selectedCoin && (
                    <img 
                      src={selectedCoin.image} 
                      alt={selectedCoin.name}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Last Price</p>
                </div>
                 <div className="flex items-baseline gap-2">
                  <p className="text-xl font-semibold">
                    ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                  </p>
                  <p className={`text-sm font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Order Side */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={orderSide === 'BUY' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('BUY')}
                  size="sm"
                  className="gap-1"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  BUY
                </Button>
                <Button
                  variant={orderSide === 'SELL' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('SELL')}
                  size="sm"
                  className="gap-1"
                >
                  <ArrowDownRight className="h-3 w-3" />
                  SELL
                </Button>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-sm"
                />
                 {quantity && currentPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ ${(parseFloat(quantity) * currentPrice).toFixed(2)} USDT
                  </p>
                )}
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5">
                <Label className="text-xs">Stop Loss (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <Label className="text-xs">Take Profit (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || currentPrice === 0 || isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing...' : `${orderSide} ${selectedSymbol.replace('USDT', '')}`}
              </Button>
            </div>
          </div>

          {/* Main Chart Area */}
          <div className="lg:col-span-2 flex flex-col border-r border-border/40">
            {/* Chart Header */}
            <div className="p-3 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {selectedCoin && (
                    <img 
                      src={selectedCoin.image} 
                      alt={selectedCoin.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <h2 className="text-lg font-bold">{selectedCoin?.name || selectedSymbol.replace('USDT', '')}</h2>
                </div>
                 <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                  </span>
                  <span className={`text-sm font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChart(!showChart)}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {showChart ? 'Hide' : 'Show'} Chart
              </Button>
            </div>

            {/* Chart */}
            {showChart && (
              <div className="flex-1 min-h-[400px] p-4">
                <TradingViewChart
                  coinId={selectedCoin?.id || 'bitcoin'}
                  symbol={selectedCoin?.symbol || 'BTC'}
                  currentPrice={currentPrice}
                  height={500}
                />
              </div>
            )}

            {/* Market Stats */}
            <div className="border-t border-border/40 p-3 grid grid-cols-4 gap-4 bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">24h High</p>
                <p className="text-sm font-semibold">${(currentPrice * 1.05).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">24h Low</p>
                <p className="text-sm font-semibold">${(currentPrice * 0.95).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">24h Volume</p>
                <p className="text-sm font-semibold">${(Math.random() * 100000000).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Market Cap</p>
                <p className="text-sm font-semibold">$--</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Positions & History */}
          <div className="lg:col-span-1 flex flex-col">
            <Tabs defaultValue="positions" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none border-b border-border/40 bg-transparent p-0">
                <TabsTrigger 
                  value="positions" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {openPositions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Activity className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No open positions</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {openPositions.map((position) => (
                        <div key={position.id} className="p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-card transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{position.symbol.replace('USDT', '')}</span>
                                <Badge 
                                  variant={position.side === 'BUY' ? 'default' : 'secondary'}
                                  className="text-xs px-1.5 py-0"
                                >
                                  {position.side}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Entry: ${position.entry_price.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {position.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-sm ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}${Math.abs(position.unrealized_pnl).toFixed(2)}
                              </p>
                              <p className={`text-xs font-semibold ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <span className="text-xs text-muted-foreground">
                              Current: ${position.current_price.toFixed(2)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => closePosition({ positionId: position.id, exitPrice: position.current_price })}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <History className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No trading history</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {history.slice(0, 50).map((trade) => (
                        <div key={trade.id} className="p-3 rounded-lg border border-border/40 bg-card/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{trade.symbol.replace('USDT', '')}</span>
                                <Badge 
                                  variant={trade.side === 'BUY' ? 'default' : 'secondary'}
                                  className="text-xs px-1.5 py-0"
                                >
                                  {trade.side}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                ${trade.entry_price.toFixed(2)} → ${trade.exit_price.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(trade.closed_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-sm ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}${Math.abs(trade.profit_loss).toFixed(2)}
                              </p>
                              <p className={`text-xs font-semibold ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

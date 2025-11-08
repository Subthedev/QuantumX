/**
 * Mock Trading Page
 * Real-time paper trading with live market data
 */

import { useState, useEffect, useMemo } from 'react';
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
import { useBinancePrices } from '@/hooks/useBinancePrices';
import { EnhancedTradingChart } from '@/components/charts/EnhancedTradingChart';
import { TrendingUp, TrendingDown, DollarSign, Activity, History, RotateCcw, ArrowUpRight, ArrowDownRight, Search, BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supportedCoinsService } from '@/services/supportedCoinsService';

const TOP_PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'TRXUSDT'];

export default function MockTrading() {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);

  // Get all tradeable symbols
  const allSymbols = useMemo(() => 
    supportedCoinsService.getSupportedCoins().map(coin => `${coin.symbol.toUpperCase()}USDT`)
  , []);
  
  // Get coin ID for chart
  const selectedCoinId = useMemo(() => {
    const coinSymbol = selectedSymbol.replace('USDT', '');
    return supportedCoinsService.getSupportedCoins().find(c => c.symbol === coinSymbol)?.id || 'bitcoin';
  }, [selectedSymbol]);

  const { prices } = useBinancePrices({ symbols: allSymbols });
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

  const currentPrice = prices[selectedSymbol]?.price || 0;
  const priceChange24h = prices[selectedSymbol]?.change_24h || 0;

  // Filter symbols based on search
  const filteredSymbols = useMemo(() => {
    if (!searchQuery) return TOP_PAIRS;
    return allSymbols.filter(symbol => 
      symbol.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 20);
  }, [searchQuery, allSymbols]);

  // Update all open position prices in real-time
  useEffect(() => {
    if (!openPositions.length) return;
    
    const interval = setInterval(() => {
      openPositions.forEach(position => {
        const price = prices[position.symbol]?.price;
        if (price) {
          updatePrices(position.symbol, price);
        }
      });
    }, 2000); // Update every 2 seconds for live feel

    return () => clearInterval(interval);
  }, [openPositions, prices, updatePrices]);

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
              <span className="text-sm font-mono font-semibold text-foreground">
                ${(account?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Equity:</span>
              <span className="text-sm font-mono font-semibold text-foreground">
                ${accountValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-medium ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Unrealized P&L:</span>
              <span className={`text-sm font-mono font-semibold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${Math.abs(totalUnrealizedPnL).toFixed(2)}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Win Rate:</span>
              <span className="text-sm font-mono font-semibold text-foreground">
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
              <div className="p-2 space-y-1">
                {filteredSymbols.map((symbol) => {
                  const price = prices[symbol]?.price || 0;
                  const change = prices[symbol]?.change_24h || 0;
                  const isSelected = selectedSymbol === symbol;
                  return (
                    <button
                      key={symbol}
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`w-full p-2 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold">{symbol.replace('USDT', '')}</p>
                          <p className="text-xs text-muted-foreground">USDT</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono">${price.toFixed(2)}</p>
                          <p className={`text-xs font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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
                <p className="text-xs text-muted-foreground mb-1">Last Price</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-mono font-bold">${currentPrice.toFixed(2)}</p>
                  <p className={`text-sm font-medium ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                  className="h-9 text-sm font-mono"
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
                  className="h-9 text-sm font-mono"
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
                  className="h-9 text-sm font-mono"
                />
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
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
                <h2 className="text-lg font-bold">{selectedSymbol.replace('USDT', '')}/USDT</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-bold">${currentPrice.toFixed(2)}</span>
                  <span className={`text-sm font-medium ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                <EnhancedTradingChart
                  coinId={selectedCoinId}
                  symbol={selectedSymbol.replace('USDT', '')}
                  currentPrice={currentPrice}
                />
              </div>
            )}

            {/* Market Stats */}
            <div className="border-t border-border/40 p-3 grid grid-cols-4 gap-4 bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">24h High</p>
                <p className="text-sm font-mono font-semibold">${(currentPrice * 1.05).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">24h Low</p>
                <p className="text-sm font-mono font-semibold">${(currentPrice * 0.95).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">24h Volume</p>
                <p className="text-sm font-mono font-semibold">${(Math.random() * 100000000).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Market Cap</p>
                <p className="text-sm font-mono font-semibold">$--</p>
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
                              <p className={`font-mono font-bold text-sm ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}${Math.abs(position.unrealized_pnl).toFixed(2)}
                              </p>
                              <p className={`text-xs font-medium ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                              <p className={`font-mono font-bold text-sm ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}${Math.abs(trade.profit_loss).toFixed(2)}
                              </p>
                              <p className={`text-xs font-medium ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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

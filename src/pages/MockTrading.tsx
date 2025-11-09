import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { TradingAnalytics } from '@/components/trading/TradingAnalytics';
import { CustomBalanceDialog } from '@/components/trading/CustomBalanceDialog';
import { SoundHapticSettings } from '@/components/trading/SoundHapticSettings';
import { TradeReplayDialog } from '@/components/trading/TradeReplayDialog';
import { Search, ChevronDown, BarChart3, Settings, Volume2, Play } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cryptoDataService } from '@/services/cryptoDataService';
import type { CryptoData } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';

export default function MockTrading() {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT' | 'TRAILING_STOP'>('MARKET');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [stopPrice, setStopPrice] = useState('');
  const [trailingPercent, setTrailingPercent] = useState('2');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [coins, setCoins] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  const [replayDialogOpen, setReplayDialogOpen] = useState(false);
  const [selectedReplayTrade, setSelectedReplayTrade] = useState<typeof history[0] | null>(null);

  const {
    account,
    openPositions,
    history,
    placeOrder,
    closePosition,
    resetAccount,
    updatePrices,
    isPlacingOrder,
    isLoading: tradingDataLoading
  } = useMockTrading();

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
    const interval = setInterval(loadCryptoData, 30000);
    return () => clearInterval(interval);
  }, [loadCryptoData]);

  const selectedCoin = useMemo(() => {
    const symbol = selectedSymbol.replace('USDT', '').toLowerCase();
    return coins.find(c => c.symbol.toLowerCase() === symbol);
  }, [selectedSymbol, coins]);

  const currentPrice = selectedCoin?.current_price ?? 0;
  const priceChange24h = selectedCoin?.price_change_percentage_24h ?? 0;

  const filteredCoins = useMemo(() => {
    if (!searchQuery) return coins;
    return coins.filter(coin => 
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, coins]);

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
    }, 1000); // Real-time updates every second
    return () => clearInterval(interval);
  }, [openPositions, coins, updatePrices]);

  if (!user) return <Navigate to="/auth" replace />;

  // Show loading state only on initial load
  const isInitialLoad = loading && coins.length === 0;
  
  if (isInitialLoad) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading trading platform...</p>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = () => {
    if (!quantity) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    const orderPrice = orderType === 'LIMIT' 
      ? (limitPrice ? parseFloat(limitPrice) : currentPrice)
      : currentPrice;

    if (!orderPrice) return;

    placeOrder({
      symbol: selectedSymbol,
      side: orderSide,
      quantity: qty * leverage,
      price: orderPrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    });

    setQuantity('');
    setLimitPrice('');
    setStopPrice('');
    setStopLoss('');
    setTakeProfit('');
  };

  const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
  const accountValue = (account?.balance || 0) + totalUnrealizedPnL;
  const totalReturn = account ? ((accountValue - account.initial_balance) / account.initial_balance) * 100 : 0;

  const handleSetCustomBalance = async (newBalance: number) => {
    if (!user) return;
    try {
      await supabase
        .from('mock_trading_accounts')
        .update({
          balance: newBalance,
          initial_balance: newBalance,
          total_profit_loss: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0
        })
        .eq('user_id', user.id);
      window.location.reload();
    } catch (error) {
      console.error('Failed to set custom balance:', error);
    }
  };

  const handleReplayTrade = (trade: typeof history[0]) => {
    setSelectedReplayTrade(trade);
    setReplayDialogOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Ultra-Compact Header - Hyperliquid Style */}
      <header className="h-11 border-b border-border/40 flex items-center px-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center flex-1 gap-3">
          {/* Market Selector */}
          <Sheet open={marketsOpen} onOpenChange={setMarketsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="h-7 gap-1.5 hover:bg-accent text-xs font-medium px-2">
                {selectedCoin && <img src={selectedCoin.image} alt="" className="w-3.5 h-3.5 rounded-full" />}
                <span className="font-semibold">
                  {selectedCoin?.symbol.toUpperCase() || 'BTC'}/USDT
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Markets</SheetTitle>
              </SheetHeader>
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-140px)]">
                {filteredCoins.map((coin) => {
                  const symbol = `${coin.symbol.toUpperCase()}USDT`;
                  const isSelected = selectedSymbol === symbol;
                  return (
                    <button
                      key={coin.id}
                      onClick={() => {
                        setSelectedSymbol(symbol);
                        setMarketsOpen(false);
                      }}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                    >
                      <img src={coin.image} alt="" className="w-8 h-8 rounded-full" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">{coin.symbol.toUpperCase()}</span>
                           <span className={`text-sm ${
                             (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                           }`}>
                             {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                             {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                           </span>
                         </div>
                         <div className="text-sm text-muted-foreground">
                           ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}
                         </div>
                      </div>
                    </button>
                  );
                })}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Market Stats */}
          <div className="flex items-center gap-3 text-xs border-l border-border/40 pl-3">
            <div className="flex gap-3">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase text-muted-foreground">24h Change</span>
                <span className={`text-sm font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col border-l border-border/40 pl-3">
                <span className="text-[9px] uppercase text-muted-foreground">24h High</span>
                <span className="text-sm font-semibold">${selectedCoin?.high_24h?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex flex-col border-l border-border/40 pl-3">
                <span className="text-[9px] uppercase text-muted-foreground">24h Low</span>
                <span className="text-sm font-semibold">${selectedCoin?.low_24h?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex flex-col border-l border-border/40 pl-3">
                <span className="text-[9px] uppercase text-muted-foreground">24h Volume</span>
                <span className="text-sm font-semibold">${((selectedCoin?.total_volume || 0) / 1e9).toFixed(2)}B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
          <div className="flex items-center gap-2.5 border-l border-border/40 pl-3">
            <div className="flex gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase text-muted-foreground">Equity</span>
                <span className="text-sm font-semibold">${accountValue.toFixed(2)}</span>
              </div>
              <div className="flex flex-col border-l border-border/40 pl-3">
                <span className="text-[9px] uppercase text-muted-foreground">Total PnL</span>
                <span className={`text-sm font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col border-l border-border/40 pl-3">
                <span className="text-[9px] uppercase text-muted-foreground">Unrealized</span>
                <span className={`text-sm font-semibold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
                </span>
              </div>
            </div>

          <div className="flex items-center gap-0.5 border-l border-border/40 pl-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Analytics">
                  <BarChart3 className="h-3 w-3" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[600px] sm:max-w-[600px]">
                <SheetHeader>
                  <SheetTitle>Trading Analytics</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-6">
                  <TradingAnalytics account={account} history={history} />
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Sound & Haptics">
                  <Volume2 className="h-3 w-3" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:max-w-[400px]">
                <SheetHeader>
                  <SheetTitle>Sound & Haptic Settings</SheetTitle>
                </SheetHeader>
                <SoundHapticSettings />
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={() => setBalanceDialogOpen(true)} className="h-6 w-6" title="Account Settings">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Trading Area - Fixed height layout */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Chart + Order Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Chart Area */}
          <div className="flex-1 bg-background border-r border-border/40 min-h-0">
            <TradingViewChart
              coinId={selectedCoin?.id || 'bitcoin'}
              symbol={selectedCoin?.symbol || 'BTC'}
              currentPrice={currentPrice}
              key={selectedSymbol}
            />
          </div>

          {/* Order Panel - Right Side */}
          <div className="w-72 border-l border-border/40 bg-background flex flex-col">
            <div className="p-3 space-y-3">
              {/* Order Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Order Type</label>
                <Select value={orderType} onValueChange={(val) => setOrderType(val as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="LIMIT">Limit</SelectItem>
                    <SelectItem value="STOP_LOSS">Stop Loss</SelectItem>
                    <SelectItem value="STOP_LIMIT">Stop Limit</SelectItem>
                    <SelectItem value="TRAILING_STOP">Trailing Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted rounded">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`py-1.5 text-xs font-semibold rounded transition-all ${
                    orderSide === 'BUY' 
                      ? 'bg-green-600 text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Buy / Long
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`py-1.5 text-xs font-semibold rounded transition-all ${
                    orderSide === 'SELL' 
                      ? 'bg-red-600 text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sell / Short
                </button>
              </div>

              {/* Limit Price (for LIMIT and STOP_LIMIT orders) */}
              {(orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">
                    {orderType === 'STOP_LIMIT' ? 'Limit Price' : 'Limit Price'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={currentPrice.toFixed(2)}
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Stop Price (for STOP orders) */}
              {(orderType === 'STOP_LOSS' || orderType === 'STOP_LIMIT') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Stop Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={currentPrice.toFixed(2)}
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              )}

              {/* Trailing Percent (for TRAILING_STOP) */}
              {orderType === 'TRAILING_STOP' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Trailing %</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="2.0"
                    value={trailingPercent}
                    onChange={(e) => setTrailingPercent(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">
                  Amount ({selectedSymbol.replace('USDT', '')})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                {quantity && currentPrice > 0 && (
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ≈ ${(parseFloat(quantity) * (orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : currentPrice) * leverage).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Leverage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Leverage</label>
                  <Badge variant="outline" className="h-5 px-2 text-xs font-mono font-semibold">
                    {leverage}x
                  </Badge>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(val) => setLeverage(val[0])}
                  min={1}
                  max={125}
                  step={1}
                  className="py-1"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>1x</span>
                  <span>50x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Quick % Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = account?.balance || 0;
                      const price = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : currentPrice;
                      const amt = (balance * (pct / 100)) / price / leverage;
                      setQuantity(amt.toFixed(6));
                    }}
                    className="py-1 text-[10px] font-semibold bg-muted hover:bg-accent rounded transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Stop Loss (Optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-muted-foreground font-medium tracking-wide">Take Profit (Optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={!quantity || (orderType === 'LIMIT' && !limitPrice) || isPlacingOrder}
                className={`w-full h-10 text-sm font-semibold shadow-lg transition-all ${
                  orderSide === 'BUY' 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20' 
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                }`}
              >
                {isPlacingOrder ? 'Placing...' : `${orderType === 'LIMIT' ? 'Place Limit' : 'Place Market'} ${orderSide === 'BUY' ? 'Buy' : 'Sell'}`}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Panel - Fixed height */}
        <div className="h-60 border-t border-border/40 bg-background flex-shrink-0">
          <Tabs defaultValue="positions" className="h-full flex flex-col">
            <div className="flex items-center px-3 py-1.5 border-b border-border/40 flex-shrink-0">
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger value="positions" className="text-xs h-7 data-[state=active]:bg-accent">
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs h-7 data-[state=active]:bg-accent">
                  Orders (0)
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs h-7 data-[state=active]:bg-accent">
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="positions" className="flex-1 m-0 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                {openPositions.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No open positions
                  </div>
                ) : (
                  <div className="px-3 py-2">
                    <div className="grid grid-cols-8 gap-2 text-xs text-muted-foreground mb-2 px-2">
                      <div>Symbol</div>
                      <div>Side</div>
                      <div className="text-right">Size</div>
                      <div className="text-right">Entry</div>
                      <div className="text-right">Mark</div>
                      <div className="text-right">Liq.</div>
                      <div className="text-right">PnL</div>
                      <div className="text-right">Action</div>
                    </div>
                    {openPositions.map((pos) => {
                      return (
                        <div key={pos.id} className="grid grid-cols-8 gap-2 text-xs py-2 px-2 hover:bg-accent/50 rounded items-center">
                          <div className="font-medium">{pos.symbol.replace('USDT', '')}</div>
                          <div>
                            <Badge variant={pos.side === 'BUY' ? 'default' : 'destructive'} className="text-xs px-1.5 py-0">
                              {pos.side}
                            </Badge>
                          </div>
                          <div className="text-right">{pos.quantity.toFixed(4)}</div>
                          <div className="text-right">${pos.entry_price.toFixed(2)}</div>
                          <div className="text-right">${pos.current_price.toFixed(2)}</div>
                          <div className="text-right text-muted-foreground">-</div>
                          <div className={`text-right font-medium ${pos.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${pos.unrealized_pnl.toFixed(2)} ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%)
                          </div>
                          <div className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="orders" className="flex-1 m-0 overflow-hidden">
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No open orders
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 m-0 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                {history.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No trade history
                  </div>
                ) : (
                  <div className="px-3 py-2">
                     <div className="grid grid-cols-8 gap-2 text-xs text-muted-foreground mb-2 px-2">
                      <div>Time</div>
                      <div>Symbol</div>
                      <div>Side</div>
                      <div className="text-right">Size</div>
                      <div className="text-right">Entry</div>
                      <div className="text-right">Exit</div>
                      <div className="text-right">PnL</div>
                      <div className="text-right">Replay</div>
                    </div>
                    {history.map((trade) => (
                      <div key={trade.id} className="grid grid-cols-8 gap-2 text-xs py-2 px-2 hover:bg-accent/50 rounded items-center">
                        <div className="text-muted-foreground text-[10px]">
                          {new Date(trade.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="font-medium">{trade.symbol.replace('USDT', '')}</div>
                        <div>
                          <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-xs px-1.5 py-0">
                            {trade.side}
                          </Badge>
                        </div>
                        <div className="text-right">{trade.quantity.toFixed(4)}</div>
                        <div className="text-right">${trade.entry_price.toFixed(2)}</div>
                        <div className="text-right">${trade.exit_price?.toFixed(2) || '-'}</div>
                        <div className={`text-right font-medium ${(trade.profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${trade.profit_loss?.toFixed(2) || '-'}
                        </div>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleReplayTrade(trade)}
                            title="Replay Trade"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
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

      <CustomBalanceDialog
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        currentBalance={account?.balance || 10000}
        onSetBalance={handleSetCustomBalance}
      />

      <TradeReplayDialog
        trade={selectedReplayTrade}
        open={replayDialogOpen}
        onOpenChange={setReplayDialogOpen}
        coinId={selectedReplayTrade ? selectedReplayTrade.symbol.replace('USDT', '').toLowerCase() : 'bitcoin'}
        symbol={selectedReplayTrade ? selectedReplayTrade.symbol.replace('USDT', '') : 'BTC'}
      />
    </div>
  );
}
